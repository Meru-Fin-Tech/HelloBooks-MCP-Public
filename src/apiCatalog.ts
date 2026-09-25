import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { z } from 'zod';
import reference from './data/developerApi.json' with { type: 'json' };
import referenceMeta from './data/developerApiMeta.json' with { type: 'json' };
import { CATALOG_FEEDS } from './catalogFeeds.js';
import { createServer } from './server.js';
import { getBaseUrl } from './discovery.js';
import { escapeHtml, renderPage } from './directoryPages.js';

type Json = Record<string, unknown>;
export interface ApiEntry {
  id: string; kind: 'public' | 'mcp' | 'accounting'; name: string; description: string;
  method: string; path: string; documentation: string; authentication: string;
  details: Json;
}
export const PUBLIC_API_PATHS = [
  ['/api/catalog.json', 'API catalog', 'Every public endpoint, MCP tool and documented accounting operation. Search, filter and paginate; supply id for complete details.'],
  ['/api/accountants.json', 'Accountant directory', 'Every published accountant profile, with filters, full public details and pagination.'],
  ['/api/accountants/{slug}.json', 'Accountant profile', 'Complete public profile for one directory slug.'],
  ['/api/developer-reference.json', 'Accounting OpenAPI reference', 'The complete generated accounting API specification, including parameters, schemas and authorization requirements.'],
  ['/catalog/index.json', 'Catalog feed index', 'Every public product-data feed.'],
  ['/catalog.json', 'MCP catalog', 'Tool and resource discovery metadata.'],
  ['/openapi.json', 'Agents OpenAPI', 'Public HTTP API specification.'],
  ['/info', 'Server information', 'Version, installation and discovery links.'],
  ['/health', 'Server health', 'Service health and active sessions.'],
  ['/changelog.json', 'Changelog', 'Recent catalog updates.'],
  ['/.well-known/agent.json', 'Agent card', 'MCP capabilities and skills.'],
  ['/.well-known/mcp.json', 'MCP discovery', 'Transport and resource discovery.'],
  ['/.well-known/ai-plugin.json', 'Plugin manifest', 'Public discovery manifest.'],
  ['/llms.txt', 'Agent guide', 'Text index for agents.'],
  ['/sitemap.xml', 'Sitemap', 'Indexable discovery pages and feeds.'],
  ['/robots.txt', 'Crawler guidance', 'Crawler access and sitemap location.'],
  ['/feed.xml', 'RSS updates', 'Catalog changes in RSS format.'],
] as const;

export const apiCatalogSchema = {
  query: z.string().max(200).optional().describe('Search name, operation, path, description or scope.'),
  kind: z.enum(['public', 'mcp', 'accounting']).optional(),
  id: z.string().max(300).optional().describe('Return one entry with its complete input/schema/response details.'),
  page: z.number().int().min(1).max(1_000_000).optional(),
  pageSize: z.number().int().min(1).max(100).optional().describe('Default 50. Follow nextPage to enumerate every entry.'),
};
export type ApiQuery = z.infer<z.ZodObject<typeof apiCatalogSchema>>;
export const developerReference = reference;

let toolsPromise: Promise<ApiEntry[]> | undefined;
/** Use the SDK's real tools/list response, so schemas and tool counts cannot drift. */
async function mcpEntries(): Promise<ApiEntry[]> {
  if (!toolsPromise) {
    toolsPromise = (async () => {
      const server = createServer();
      const client = new Client({ name: 'hellobooks-catalog', version: '1.0.0' });
      const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
      try {
        await server.connect(serverTransport);
        await client.connect(clientTransport);
        const tools = [];
        let cursor: string | undefined;
        do {
          const response = await client.listTools(cursor ? { cursor } : {});
          tools.push(...response.tools);
          cursor = response.nextCursor;
        } while (cursor);
        return tools.map(tool => ({
          id: `mcp-${tool.name}`, kind: 'mcp' as const, name: tool.name,
          description: tool.description ?? '', method: 'MCP', path: '/mcp',
          authentication: 'No account required', documentation: `${getBaseUrl()}/#quick-start`,
          details: { inputSchema: tool.inputSchema, call: { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: tool.name, arguments: {} } } },
        }));
      } finally { await client.close(); await server.close(); }
    })().catch(error => { toolsPromise = undefined; throw error; });
  }
  return toolsPromise;
}

export function mergeParameters(pathParameters: unknown[] = [], operationParameters: unknown[] = []): unknown[] {
  const parameters = new Map<string, unknown>();
  for (const value of [...pathParameters, ...operationParameters]) {
    const parameter = value as Record<string, unknown>;
    parameters.set(String(parameter.$ref ?? `${parameter.in}:${parameter.name}`), value);
  }
  return [...parameters.values()];
}

function accountingEntries(): ApiEntry[] {
  const spec = reference as unknown as { paths: Record<string, Record<string, unknown>>; security?: unknown };
  const entries: ApiEntry[] = [];
  const domainNames: Record<string, string> = { service: 'company-ids', bookkeeping: 'overview', webhooks: 'webhooks', documents: 'request-format', contacts: 'reference-contacts' };
  for (const [path, item] of Object.entries(spec.paths)) {
    for (const [method, value] of Object.entries(item)) {
      if (!['get', 'post', 'put', 'patch', 'delete', 'head', 'options'].includes(method)) continue;
      const op = value as Json;
      const tags = op.tags as string[] | undefined;
      const domain = tags?.[0] ?? 'service';
      const docs = referenceMeta.docs as Record<string, string>;
      const documentation = docs[`${method.toUpperCase()} ${path}`] ?? `https://developer.hellobooks.ai/docs/${domainNames[domain] ?? 'overview'}`;
      const id = `accounting-${String(op.operationId ?? `${method}-${path}`)}`;
      entries.push({
        id, kind: 'accounting', name: String(op.summary ?? op.operationId ?? path),
        description: String(op.description ?? op.summary ?? ''), method: method.toUpperCase(),
        path: `/public/v1${path}`, documentation, authentication: 'OAuth 2.0; company authorization and operation scopes required',
        details: { ...op, parameters: mergeParameters(item.parameters as unknown[], op.parameters as unknown[]),
          security: op.security ?? spec.security, referenceUrl: `${getBaseUrl()}/api/developer-reference.json`,
          scopeRule: 'OpenAPI security array entries are alternatives (OR); scopes inside one security requirement are cumulative (AND).',
          environment: 'Use the developer portal for sandbox setup and production access. API metadata does not prove a deployed operation is available.' },
      });
    }
  }
  return entries;
}

function referencedComponents(details: Json): Json {
  const components: Record<string, Record<string, unknown>> = {};
  const seen = new Set<string>();
  const visit = (value: unknown): void => {
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      if (key === '$ref' && typeof child === 'string' && child.startsWith('#/components/') && !seen.has(child)) {
        seen.add(child);
        const [, , category, name] = child.split('/').map(part => part.replaceAll('~1', '/').replaceAll('~0', '~'));
        const target = ((reference.components ?? {}) as unknown as Record<string, Record<string, unknown>>)[category]?.[name];
        if (target) { (components[category] ??= {})[name] = target; visit(target); }
      } else visit(child);
    }
  };
  visit(details);
  if (reference.components?.securitySchemes) components.securitySchemes = reference.components.securitySchemes;
  return components;
}

export async function getApiEntries(): Promise<ApiEntry[]> {
  const base = getBaseUrl();
  const publicEntries: ApiEntry[] = [...PUBLIC_API_PATHS,
    ...CATALOG_FEEDS.map(feed => [`/catalog/${feed.slug}.json`, feed.title, feed.description] as const),
  ].map(([path, name, description]) => ({
    id: `public-${path}`, kind: 'public', name, description, method: 'GET', path,
    documentation: `${base}/openapi.json`, authentication: 'No account required',
    details: { url: `${base}${path}`, response: path.endsWith('.json') ? 'application/json' : 'text',
      ...(path === '/api/accountants.json' ? { parameters: ['query', 'country', 'city', 'specialty', 'acceptingClients', 'page', 'pageSize'] } : {}),
      ...(path === '/api/catalog.json' ? { parameters: ['query', 'kind', 'id', 'page', 'pageSize'] } : {}),
    },
  }));
  return [...publicEntries, ...await mcpEntries(), ...accountingEntries()];
}

export async function listApiCatalog(args: ApiQuery = {}) {
  const all = await getApiEntries();
  const terms = (args.query ?? '').toLowerCase().trim().split(/\s+/).filter(Boolean);
  const entries = all.filter(entry => args.id ? args.id === entry.id : (!args.kind || args.kind === entry.kind) && (!args.id || args.id === entry.id) &&
    terms.every(term => `${entry.name} ${entry.path} ${entry.description} ${JSON.stringify(entry.details.security ?? '')}`.toLowerCase().includes(term)));
  const page = args.id ? 1 : args.page ?? 1, pageSize = args.id ? 1 : args.pageSize ?? 50;
  const totalPages = Math.ceil(entries.length / pageSize);
  return {
    entries: entries.slice((page - 1) * pageSize, page * pageSize).map(entry => args.id
      ? { ...entry, details: entry.kind === 'accounting' ? { ...entry.details, components: referencedComponents(entry.details) } : entry.details }
      : { ...entry, details: undefined }),
    total: entries.length, catalogTotal: all.length, page, pageSize, totalPages, nextPage: page < totalPages ? page + 1 : null,
    counts: { public: all.filter(e => e.kind === 'public').length, mcp: all.filter(e => e.kind === 'mcp').length, accounting: all.filter(e => e.kind === 'accounting').length },
    source: `${getBaseUrl()}/api/catalog.json`, reference: `${getBaseUrl()}/api/developer-reference.json`,
    referenceProvenance: { source: referenceMeta.source, sourceCommit: referenceMeta.sourceCommit, importedAt: referenceMeta.importedAt },
    note: 'Public APIs and MCP tools are hosted here. Accounting entries document the authenticated API; use company-scoped credentials at the documented API host.',
  };
}

export function renderApiCatalog(result: Awaited<ReturnType<typeof listApiCatalog>>, params: URLSearchParams): string {
  const pageUrl = (page: number) => { const copy = new URLSearchParams(params); copy.set('page', String(page)); return `/apis?${copy}`; };
  return renderPage('API catalog', `<p class="eyebrow">Build and connect</p><h1>All HelloBooks APIs, in one place.</h1>
  <p class="muted">Find an endpoint, inspect its parameters, and open its documentation. Browse public data here or connect a company through the authenticated accounting API.</p>
  <p><span class="badge">${result.counts.public} public endpoints</span><span class="badge">${result.counts.mcp} MCP tools</span><span class="badge">${result.counts.accounting} accounting operations</span></p>
  <div class="actions"><a class="button" href="/accountants">Find an accountant</a><a class="button" href="/api/catalog.json">Catalog JSON</a><a class="button" href="/api/developer-reference.json">Accounting OpenAPI</a><a class="button" href="https://developer.hellobooks.ai/docs/quickstart">Developer quickstart</a></div>
  <form action="/apis" method="get"><div class="filters"><label>Search APIs<input name="query" placeholder="Invoices, accountants, pricing…" value="${escapeHtml(params.get('query') ?? '')}"></label><label>API type<select name="kind"><option value="">All APIs</option><option value="public" ${params.get('kind') === 'public' ? 'selected' : ''}>Public HTTP</option><option value="mcp" ${params.get('kind') === 'mcp' ? 'selected' : ''}>MCP tools</option><option value="accounting" ${params.get('kind') === 'accounting' ? 'selected' : ''}>Authenticated accounting</option></select></label><button type="submit">Search APIs</button><a href="/apis">Clear filters</a></div></form>
  <p role="status">${result.total} matching APIs</p>${result.entries.map(entry => `<article class="card"><span class="badge">${entry.kind === 'accounting' ? 'Authenticated accounting' : entry.kind === 'mcp' ? 'MCP tool' : 'Public HTTP'}</span><h2>${escapeHtml(entry.name)}</h2><p><strong>${escapeHtml(entry.method)}</strong> <code>${escapeHtml(entry.path)}</code></p><p>${escapeHtml(entry.description)}</p><p class="muted">${escapeHtml(entry.authentication)}</p><div class="actions"><a class="button" href="/apis?id=${encodeURIComponent(entry.id)}">Parameters &amp; examples</a><a class="button" href="${escapeHtml(entry.documentation)}">Documentation</a>${entry.kind === 'public' && !entry.path.includes('{') ? `<a class="button" href="${escapeHtml(entry.path)}">Open endpoint</a>` : ''}</div>
  ${entry.details ? `<h3>Request example</h3><pre>${escapeHtml(entry.kind === 'mcp'
    ? `Connect your client to ${getBaseUrl()}/mcp, then call:\n${JSON.stringify(entry.details.call, null, 2)}\n\nFill arguments using the input schema below.`
    : entry.kind === 'public' ? `curl '${getBaseUrl()}${entry.path}'`
    : `curl --request ${entry.method} 'https://sandboxapi.hellobooks.ai${entry.path}' \\\n  --header 'Authorization: Bearer YOUR_ACCESS_TOKEN'${['POST','PUT','PATCH'].includes(entry.method) ? " \\\n  --header 'Content-Type: application/json' --data @request.json" : ''}\n\nReplace tenant/path placeholders and prepare request.json from the published request schema when needed.`)}</pre><details open><summary>Complete published contract</summary><pre>${escapeHtml(JSON.stringify(entry.details, null, 2))}</pre></details><p><a href="/api/catalog.json?id=${encodeURIComponent(entry.id)}">This API as JSON</a> · <a href="/api/developer-reference.json">Full reference and referenced schemas</a></p>` : ''}</article>`).join('')}
  ${!result.total ? '<p>No APIs match this search. Try a resource name or clear the filters.</p>' : ''}
  <nav class="pagination" aria-label="API pages">${result.page > 1 ? `<a class="button" href="${escapeHtml(pageUrl(result.page - 1))}">Previous</a>` : ''}${result.totalPages ? `<span>Page ${result.page} of ${result.totalPages}</span>` : ''}${result.nextPage ? `<a class="button" href="${escapeHtml(pageUrl(result.nextPage))}">Next</a>` : ''}</nav>`);
}
