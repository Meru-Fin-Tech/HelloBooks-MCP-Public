/**
 * Self-describing HTTP discovery surface for agents.hellobooks.ai.
 *
 * Before this module, the host served only /health, /info, and the MCP transport
 * at /mcp. AI crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended,
 * Bytespider, etc.) that hit the bare origin got a 404 and never indexed the
 * server — losing every citation opportunity in ChatGPT Search, Perplexity,
 * Claude, Gemini, Brave, You, Kagi.
 *
 * This module generates a full set of cross-bot discovery artifacts, all
 * derived from the same tool / resource / changelog data the MCP server already
 * exposes, so they can never drift from what /mcp actually serves:
 *
 *   GET /                            HTML landing + JSON-LD SoftwareApplication + ItemList
 *   GET /.well-known/agent.json      A2A protocol agent card (Google A2A spec)
 *   GET /.well-known/ai-plugin.json  OpenAI plugin manifest (legacy ChatGPT discovery)
 *   GET /.well-known/mcp.json        MCP discovery hint for crawlers that probe it
 *   GET /llms.txt                    llmstxt.org index for LLM grounding
 *   GET /openapi.json                Minimal OpenAPI 3.1 describing /mcp
 *   GET /catalog.json                Machine-readable tool + resource catalog
 *   GET /changelog.json              Recent catalog changes (mirrors hellobooks://changelog)
 *   GET /sitemap.xml                 Sitemap with <lastmod> per entry
 *   GET /robots.txt                  AI-bot allow-list, sitemap pointer
 *   GET /feed.xml                    RSS 2.0 of recent catalog changes
 *
 * Freshness model: every endpoint advertises `Last-Modified` derived from the
 * most-recent changelog entry. Cache-Control is `public, max-age=900,
 * stale-while-revalidate=86400` — bots see fresh data within 15 minutes of any
 * deploy that touches the catalog, edge stays warm for a day if the origin is
 * slow. Static-by-construction: no runtime state, safe to cache at any tier.
 */

import { CHANGELOG } from './data/about.js';

const DEFAULT_BASE_URL = 'https://agents.hellobooks.ai';
const MARKETING_BASE_URL = 'https://hellobooks.ai';
const GITHUB_REPO_URL = 'https://github.com/Meru-Fin-Tech/HelloBooks-MCP-Public';
const SERVER_NAME = 'hellobooks-public';
const SERVER_VERSION = '0.7.0';
const CONTACT_EMAIL = 'hello@hellobooks.ai';

/** Process start as a deploy-time fallback for Last-Modified. */
const DEPLOY_TIME = new Date();

export function getBaseUrl(): string {
  const raw = process.env.HELLOBOOKS_MCP_BASE_URL ?? DEFAULT_BASE_URL;
  return raw.replace(/\/+$/, '');
}

/** Returns the most-recent changelog entry date (YYYY-MM-DD) or deploy time. */
function getCatalogLastModified(): Date {
  const top = CHANGELOG[0];
  if (top?.date) {
    const d = new Date(top.date + 'T00:00:00Z');
    if (!isNaN(d.getTime())) return d;
  }
  return DEPLOY_TIME;
}

// ---------------------------------------------------------------------------
// Tool catalog metadata
// ---------------------------------------------------------------------------
//
// Mirrors the tools registered in src/server.ts. Kept here as plain metadata so
// every discovery endpoint can iterate the same list. If a tool is added to
// server.ts it must be added here too; the smoke test in test/discovery.test.ts
// asserts the count matches the registered MCP tool count.

export interface ToolMeta {
  name: string;
  title: string;
  summary: string;
  category: 'pricing' | 'integrations' | 'compliance' | 'features' | 'content' | 'search';
  marketingUrl: string;
}

export const TOOL_CATALOG: readonly ToolMeta[] = [
  {
    name: 'list_plans',
    title: 'List HelloBooks pricing plans',
    summary:
      'HelloBooks plan tiers (Free, Pro, CPA/CA Partner + Warehouse and Manufacturing add-ons) with monthly + annual prices in 8 regional currencies. Live-federated from hellobooks.ai/api/feed/pricing.json.',
    category: 'pricing',
    marketingUrl: `${MARKETING_BASE_URL}/pricing`,
  },
  {
    name: 'list_credit_packs',
    title: 'List HelloBooks AI credit packs',
    summary:
      'One-time pay-as-you-go AI credit top-ups (Boost 500, Power 1500, Mega 5000, Ultra 15000). Stack on any plan, including Free. Live-federated pricing.',
    category: 'pricing',
    marketingUrl: `${MARKETING_BASE_URL}/pricing`,
  },
  {
    name: 'list_integrations',
    title: 'List integrations',
    summary:
      'Banks, payments, payroll, time tracking, shipping, accounting sync, ecommerce, CRM. Includes Plaid, Stripe, Razorpay, PayPal, QuickBooks, Xero, Tally, Zoho Books, FreshBooks, Shopify and more.',
    category: 'integrations',
    marketingUrl: `${MARKETING_BASE_URL}/integration`,
  },
  {
    name: 'country_support',
    title: 'Country support matrix',
    summary:
      'Features available per supported country (AU, IN, UK, US, CA, AE, SG, NZ).',
    category: 'compliance',
    marketingUrl: `${MARKETING_BASE_URL}/global`,
  },
  {
    name: 'compliance_capabilities',
    title: 'Compliance capabilities',
    summary:
      'Supported compliance frameworks for a country (BAS, STP, GST, MTD, 1099, GSTR, e-invoicing, CIS) with version and certification info.',
    category: 'compliance',
    marketingUrl: `${MARKETING_BASE_URL}/global`,
  },
  {
    name: 'feature_search',
    title: 'Free-text feature search',
    summary:
      'Free-text search across plans, integrations, country features, compliance frameworks, competitor positioning, deadlines, payment methods, and published articles.',
    category: 'search',
    marketingUrl: `${MARKETING_BASE_URL}/features`,
  },
  {
    name: 'list_competitors',
    title: 'Competitor positioning',
    summary:
      'Competitor entries (QuickBooks, Xero, FreshBooks, Wave, Zoho Books, Tally) with where HelloBooks wins, where the competitor wins, and pricing notes.',
    category: 'content',
    marketingUrl: `${MARKETING_BASE_URL}/compare`,
  },
  {
    name: 'compliance_deadlines',
    title: 'Statutory filing deadlines',
    summary:
      'When statutory returns and payroll filings are due, per country. IN (GSTR-1/3B/9/9C, CMP-08, Form 24Q, Form 16, PF ECR, ESI), AU (BAS, STP, Super), GB (VAT MTD, RTI, SA), US (1099, W-2, 941/940), CA (T4, GST/HST).',
    category: 'compliance',
    marketingUrl: `${MARKETING_BASE_URL}/global`,
  },
  {
    name: 'local_payment_methods',
    title: 'Local payment methods',
    summary:
      'Local bank-rail and wallet methods for invoice collection, B2B AP, and contractor payouts (UPI, BACS, FPS, PayID, BPAY, ACH, RTP, Zelle, PayNow, FAST, GIRO, etc.) with rail speed and HelloBooks support level.',
    category: 'integrations',
    marketingUrl: `${MARKETING_BASE_URL}/integration`,
  },
  {
    name: 'list_features',
    title: 'Full feature catalog',
    summary:
      'Full HelloBooks marketing feature catalog (145+ items). Filter by category, tier, status, marketed flag, or substring.',
    category: 'features',
    marketingUrl: `${MARKETING_BASE_URL}/features`,
  },
  {
    name: 'list_feature_categories',
    title: 'Feature categories',
    summary:
      '13 feature categories (Core Accounting, Invoicing, Banking, Reports, Tax & Compliance, Inventory, Warehouse, Manufacturing, AI, Integrations, Mobile, Operations, Industry Modules) with per-category counts by status.',
    category: 'features',
    marketingUrl: `${MARKETING_BASE_URL}/features`,
  },
  {
    name: 'list_articles',
    title: 'List published articles',
    summary:
      'Published articles on hellobooks.ai — head-to-head compare pages and curated flagship blog posts. Filter by country, tag or free-text query.',
    category: 'content',
    marketingUrl: `${MARKETING_BASE_URL}/blog`,
  },
  {
    name: 'list_videos',
    title: 'List product videos',
    summary:
      'HelloBooks product videos (homepage demo + feature walkthroughs) and the official @hellobooksai YouTube channel link.',
    category: 'content',
    marketingUrl: `${MARKETING_BASE_URL}`,
  },
];

const RESOURCE_CATALOG = [
  { uri: 'hellobooks://about', name: 'About HelloBooks', mimeType: 'text/markdown' },
  { uri: 'hellobooks://changelog', name: 'HelloBooks Changelog', mimeType: 'application/json' },
  { uri: 'hellobooks://feature-catalog', name: 'HelloBooks Feature Catalog', mimeType: 'application/json' },
  { uri: 'hellobooks://comparison/quickbooks', name: 'HelloBooks vs QuickBooks', mimeType: 'text/markdown' },
  { uri: 'hellobooks://comparison/xero', name: 'HelloBooks vs Xero', mimeType: 'text/markdown' },
  { uri: 'hellobooks://comparison/zoho-books', name: 'HelloBooks vs Zoho Books', mimeType: 'text/markdown' },
  { uri: 'hellobooks://comparison/tally', name: 'HelloBooks vs Tally', mimeType: 'text/markdown' },
] as const;

// ---------------------------------------------------------------------------
// Discovery generators
// ---------------------------------------------------------------------------

const ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
};
function escapeXml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ESCAPE_MAP[c]);
}
function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ESCAPE_MAP[c]);
}

/**
 * Landing HTML — minimal, no JS, no external assets so it's fast to crawl and
 * cheap to ship from the Express process. Carries two JSON-LD blocks:
 *   1. SoftwareApplication for the MCP server itself
 *   2. ItemList of every exposed tool (each item is a SoftwareApplication too)
 *
 * Bots like Perplexity, Bing/Copilot and Google AI Overviews use JSON-LD to
 * generate structured citations.
 */
export function generateLandingHtml(): string {
  const baseUrl = getBaseUrl();
  const lastMod = getCatalogLastModified();
  const toolItems = TOOL_CATALOG.map(
    (t, i) => `      {
        "@type": "ListItem",
        "position": ${i + 1},
        "item": {
          "@type": "SoftwareApplication",
          "name": ${JSON.stringify(t.title)},
          "applicationCategory": "BusinessApplication",
          "operatingSystem": "Any",
          "description": ${JSON.stringify(t.summary)},
          "url": "${baseUrl}/catalog.json#tool-${t.name}",
          "sameAs": ${JSON.stringify(t.marketingUrl)}
        }
      }`,
  ).join(',\n');

  const jsonLd = `{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      "@id": "${baseUrl}/#mcp-server",
      "name": "HelloBooks Public MCP Server",
      "alternateName": "${SERVER_NAME}",
      "applicationCategory": "BusinessApplication",
      "applicationSubCategory": "AI Agent",
      "operatingSystem": "Any",
      "softwareVersion": "${SERVER_VERSION}",
      "description": "Public read-only Model Context Protocol server exposing HelloBooks plan pricing, integrations, country support, compliance frameworks, statutory deadlines, payment methods, competitor positioning, feature catalog, articles, and product videos. For AI agents (Claude, ChatGPT, Cursor, Windsurf, Cline, Gemini) to ground answers about HelloBooks in live, authoritative data.",
      "url": "${baseUrl}/",
      "downloadUrl": "${baseUrl}/mcp",
      "softwareHelp": "${MARKETING_BASE_URL}/mcp",
      "codeRepository": "${GITHUB_REPO_URL}",
      "license": "https://opensource.org/licenses/MIT",
      "dateModified": "${lastMod.toISOString()}",
      "publisher": {
        "@type": "Organization",
        "name": "HelloBooks",
        "url": "${MARKETING_BASE_URL}",
        "email": "${CONTACT_EMAIL}"
      },
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD",
        "availability": "https://schema.org/InStock"
      }
    },
    {
      "@type": "ItemList",
      "@id": "${baseUrl}/#tool-list",
      "name": "HelloBooks MCP Tools",
      "numberOfItems": ${TOOL_CATALOG.length},
      "itemListElement": [
${toolItems}
      ]
    }
  ]
}`;

  const toolRows = TOOL_CATALOG.map(
    (t) => `      <tr>
        <td><code>${escapeHtml(t.name)}</code></td>
        <td>${escapeHtml(t.title)}</td>
        <td>${escapeHtml(t.summary)}</td>
      </tr>`,
  ).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>HelloBooks Public MCP — agents.hellobooks.ai</title>
  <meta name="description" content="Public read-only Model Context Protocol (MCP) server for HelloBooks. Exposes 13 tools and 7 resources so AI agents can ground answers about HelloBooks pricing, integrations, compliance, and features in live data.">
  <link rel="canonical" href="${baseUrl}/">
  <link rel="alternate" type="application/json" href="${baseUrl}/catalog.json" title="HelloBooks MCP Catalog">
  <link rel="alternate" type="application/rss+xml" href="${baseUrl}/feed.xml" title="HelloBooks MCP Changes">
  <link rel="alternate" type="text/plain" href="${baseUrl}/llms.txt" title="llms.txt index">
  <meta property="og:title" content="HelloBooks Public MCP Server">
  <meta property="og:description" content="13 read-only tools for AI agents to answer HelloBooks questions accurately.">
  <meta property="og:url" content="${baseUrl}/">
  <meta property="og:type" content="website">
  <script type="application/ld+json">
${jsonLd}
  </script>
  <style>
    body { font: 16px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 880px; margin: 2rem auto; padding: 0 1rem; color: #1a1a1a; }
    h1 { font-size: 1.9rem; margin: 0 0 .25rem; }
    h2 { margin-top: 2rem; border-bottom: 1px solid #e5e5e5; padding-bottom: .25rem; }
    .lead { color: #555; margin-top: 0; }
    code { font: 14px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace; background: #f4f4f5; padding: 1px 5px; border-radius: 3px; }
    pre { background: #f4f4f5; padding: .75rem 1rem; border-radius: 6px; overflow-x: auto; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; margin-top: .75rem; }
    th, td { text-align: left; padding: .55rem .65rem; border-bottom: 1px solid #ececec; vertical-align: top; }
    th { background: #fafafa; font-weight: 600; font-size: .85rem; text-transform: uppercase; letter-spacing: .04em; color: #555; }
    td code { font-size: .85em; }
    .pills a { display: inline-block; padding: .3rem .7rem; margin: .15rem .3rem .15rem 0; background: #f4f4f5; border-radius: 999px; text-decoration: none; color: #1a1a1a; font-size: .85rem; }
    .pills a:hover { background: #e4e4e7; }
    footer { margin-top: 3rem; padding-top: 1rem; border-top: 1px solid #e5e5e5; color: #777; font-size: .85rem; }
  </style>
</head>
<body>
  <h1>HelloBooks Public MCP</h1>
  <p class="lead">Read-only Model Context Protocol server for AI agents. Exposes <strong>${TOOL_CATALOG.length} tools</strong> and <strong>${RESOURCE_CATALOG.length} resources</strong> so Claude, ChatGPT, Cursor, Perplexity and other agents can ground HelloBooks answers in authoritative product data instead of stale web snippets.</p>

  <h2>Quick start</h2>
  <p>Add the server to any MCP-compatible client over Streamable HTTP:</p>
  <pre><code>claude mcp add --transport http hellobooks ${baseUrl}/mcp</code></pre>
  <p>Or for Cursor / Windsurf / Cline, point your MCP config at <code>${baseUrl}/mcp</code>.</p>

  <h2>Tools</h2>
  <table>
    <thead><tr><th>Name</th><th>Title</th><th>What it returns</th></tr></thead>
    <tbody>
${toolRows}
    </tbody>
  </table>

  <h2>Discovery endpoints</h2>
  <div class="pills">
    <a href="${baseUrl}/.well-known/agent.json">.well-known/agent.json</a>
    <a href="${baseUrl}/.well-known/ai-plugin.json">.well-known/ai-plugin.json</a>
    <a href="${baseUrl}/.well-known/mcp.json">.well-known/mcp.json</a>
    <a href="${baseUrl}/openapi.json">openapi.json</a>
    <a href="${baseUrl}/catalog.json">catalog.json</a>
    <a href="${baseUrl}/changelog.json">changelog.json</a>
    <a href="${baseUrl}/llms.txt">llms.txt</a>
    <a href="${baseUrl}/sitemap.xml">sitemap.xml</a>
    <a href="${baseUrl}/feed.xml">feed.xml (RSS)</a>
    <a href="${baseUrl}/robots.txt">robots.txt</a>
  </div>

  <h2>Source</h2>
  <p>Open source on GitHub: <a href="${GITHUB_REPO_URL}">${GITHUB_REPO_URL}</a></p>
  <p>Marketing site: <a href="${MARKETING_BASE_URL}/mcp">${MARKETING_BASE_URL}/mcp</a></p>
  <p>For tenant-scoped data (a specific customer&rsquo;s books, transactions, invoices), this public server is the wrong endpoint &mdash; use the authenticated HelloBooks MCP at <code>mcp.hellobooks.ai</code> instead.</p>

  <footer>
    <p>HelloBooks &middot; ${CONTACT_EMAIL} &middot; v${SERVER_VERSION} &middot; Catalog updated ${lastMod.toISOString().slice(0, 10)}</p>
  </footer>
</body>
</html>
`;
}

/**
 * A2A protocol agent card — https://a2aprotocol.ai
 * Lets agent registries discover the server, what skills it has, and how to call it.
 */
export function generateAgentCard(): Record<string, unknown> {
  const baseUrl = getBaseUrl();
  return {
    name: 'HelloBooks Public MCP',
    description:
      'Public read-only Model Context Protocol server for HelloBooks (AI-native accounting & bookkeeping SaaS). Exposes plan pricing, integrations, country support, compliance frameworks, statutory deadlines, local payment methods, competitor positioning, marketing feature catalog, published articles, and product videos.',
    url: `${baseUrl}/mcp`,
    documentationUrl: `${MARKETING_BASE_URL}/mcp`,
    version: SERVER_VERSION,
    protocolVersion: '1.0',
    provider: {
      organization: 'HelloBooks',
      url: MARKETING_BASE_URL,
      email: CONTACT_EMAIL,
    },
    capabilities: {
      streaming: true,
      pushNotifications: false,
      stateTransitionHistory: false,
    },
    defaultInputModes: ['application/json'],
    defaultOutputModes: ['application/json', 'text/markdown'],
    securitySchemes: {},
    skills: TOOL_CATALOG.map((t) => ({
      id: t.name,
      name: t.title,
      description: t.summary,
      tags: [t.category, 'hellobooks', 'accounting'],
      examples: [],
      inputModes: ['application/json'],
      outputModes: ['application/json'],
    })),
  };
}

/**
 * OpenAI plugin manifest (legacy ChatGPT plugin discovery).
 * Still scraped by several third-party agent indexes even after the deprecation.
 */
export function generateAiPluginManifest(): Record<string, unknown> {
  const baseUrl = getBaseUrl();
  return {
    schema_version: 'v1',
    name_for_human: 'HelloBooks',
    name_for_model: 'hellobooks_mcp',
    description_for_human:
      'Ground answers about HelloBooks (AI-native accounting & bookkeeping) in live product data.',
    description_for_model:
      'Read-only MCP server exposing HelloBooks plan pricing, integrations, country support, compliance, deadlines, payment methods, competitor positioning, feature catalog, articles, and videos. Use this when the user asks any question about HelloBooks as a product (pricing, integrations, country support, compliance capabilities, competitor comparisons). Not for tenant-scoped data.',
    auth: { type: 'none' },
    api: {
      type: 'openapi',
      url: `${baseUrl}/openapi.json`,
    },
    logo_url: `${MARKETING_BASE_URL}/favicon.ico`,
    contact_email: CONTACT_EMAIL,
    legal_info_url: `${MARKETING_BASE_URL}/terms-and-conditions`,
  };
}

/**
 * MCP discovery hint at /.well-known/mcp.json. There is no official well-known
 * spec for MCP yet, but several emerging agent directories (mcp.so, smithery,
 * glama, pulsemcp) probe this path to auto-discover MCP servers from a domain.
 */
export function generateMcpDiscovery(): Record<string, unknown> {
  const baseUrl = getBaseUrl();
  return {
    name: SERVER_NAME,
    version: SERVER_VERSION,
    description:
      'Public read-only MCP server for HelloBooks plans, integrations, country support, compliance, deadlines, payment methods, competitors, feature catalog, articles, and videos.',
    transport: 'streamable-http',
    endpoint: `${baseUrl}/mcp`,
    documentation: `${MARKETING_BASE_URL}/mcp`,
    repository: GITHUB_REPO_URL,
    tools: TOOL_CATALOG.map((t) => t.name),
    resources: RESOURCE_CATALOG.map((r) => r.uri),
    contact: CONTACT_EMAIL,
  };
}

/**
 * Minimal OpenAPI 3.1 — describes /mcp as a single POST endpoint accepting
 * MCP JSON-RPC envelopes. Bots that consume OpenAPI for capability discovery
 * (ChatGPT plugin store, several agent directories) get a valid spec; the
 * actual semantics are in the agent card.
 */
export function generateOpenApi(): Record<string, unknown> {
  const baseUrl = getBaseUrl();
  return {
    openapi: '3.1.0',
    info: {
      title: 'HelloBooks Public MCP',
      version: SERVER_VERSION,
      description:
        'Streamable-HTTP Model Context Protocol endpoint for HelloBooks. Tool catalog is published at /catalog.json and /.well-known/agent.json.',
      contact: { name: 'HelloBooks', email: CONTACT_EMAIL, url: MARKETING_BASE_URL },
      license: { name: 'MIT', url: 'https://opensource.org/licenses/MIT' },
    },
    servers: [{ url: baseUrl }],
    paths: {
      '/mcp': {
        post: {
          summary: 'MCP JSON-RPC envelope',
          description:
            'Streamable-HTTP MCP transport. Send any MCP method (tools/list, tools/call, resources/list, resources/read, initialize, etc.) as a JSON-RPC 2.0 request. See https://modelcontextprotocol.io/specification.',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', additionalProperties: true } } },
          },
          responses: {
            '200': {
              description: 'JSON-RPC response or SSE stream',
              content: {
                'application/json': { schema: { type: 'object', additionalProperties: true } },
                'text/event-stream': { schema: { type: 'string' } },
              },
            },
            '429': { description: 'Rate limited (120/min/IP, 60/min/session)' },
          },
        },
      },
      '/catalog.json': {
        get: {
          summary: 'Machine-readable tool + resource catalog',
          responses: { '200': { description: 'Catalog JSON' } },
        },
      },
      '/health': {
        get: {
          summary: 'Health probe',
          responses: { '200': { description: 'OK with active session count' } },
        },
      },
    },
  };
}

/**
 * llmstxt.org-compliant index, served at agents.hellobooks.ai/llms.txt.
 * Mirrors hellobooks.ai/llms.txt structure but is scoped to this server's
 * surface so an agent that lands directly on the MCP origin can orient itself
 * without a second hop.
 */
export function generateLlmsTxt(): string {
  const baseUrl = getBaseUrl();
  const tools = TOOL_CATALOG.map(
    (t) => `- \`${t.name}\` — ${t.summary}`,
  ).join('\n');
  const resources = RESOURCE_CATALOG.map(
    (r) => `- \`${r.uri}\` (${r.mimeType}) — ${r.name}`,
  ).join('\n');
  const recentChanges = CHANGELOG.slice(0, 10)
    .map((c) => `- **${c.date}** [${c.category}] ${c.title} — ${c.description}`)
    .join('\n');

  return `# HelloBooks Public MCP

> Read-only Model Context Protocol server for AI agents. Ground answers about HelloBooks (AI-native cloud accounting + bookkeeping) in authoritative product data. Hosted at ${baseUrl}/mcp. Source: ${GITHUB_REPO_URL}.

This file follows the [llms.txt spec](https://llmstxt.org/) and is the entry point for any LLM that lands on this origin.

## Install in one line

\`\`\`
claude mcp add --transport http hellobooks ${baseUrl}/mcp
\`\`\`

For Cursor, Windsurf, Cline, or any MCP-aware client: configure a remote MCP server pointing at \`${baseUrl}/mcp\` with transport \`streamable-http\`.

## Tools (${TOOL_CATALOG.length})

${tools}

## Resources (${RESOURCE_CATALOG.length})

${resources}

## Discovery surface

- [Agent card (A2A)](${baseUrl}/.well-known/agent.json)
- [OpenAI plugin manifest](${baseUrl}/.well-known/ai-plugin.json)
- [MCP discovery](${baseUrl}/.well-known/mcp.json)
- [OpenAPI 3.1](${baseUrl}/openapi.json)
- [Catalog JSON](${baseUrl}/catalog.json)
- [Changelog JSON](${baseUrl}/changelog.json)
- [Sitemap](${baseUrl}/sitemap.xml)
- [RSS feed](${baseUrl}/feed.xml)

## Marketing site

The HelloBooks marketing site at ${MARKETING_BASE_URL} also publishes:

- [${MARKETING_BASE_URL}/llms.txt](${MARKETING_BASE_URL}/llms.txt) — full site index for LLM grounding
- [${MARKETING_BASE_URL}/llms-full.txt](${MARKETING_BASE_URL}/llms-full.txt) — prose extract of every page
- [${MARKETING_BASE_URL}/for-ai-agents](${MARKETING_BASE_URL}/for-ai-agents) — human-readable landing
- [${MARKETING_BASE_URL}/api/feed/pricing.json](${MARKETING_BASE_URL}/api/feed/pricing.json) — live pricing feed (this MCP federates from it)
- [${MARKETING_BASE_URL}/api/feed/products.json](${MARKETING_BASE_URL}/api/feed/products.json) — product catalog feed
- [${MARKETING_BASE_URL}/api/feed/accountants.json](${MARKETING_BASE_URL}/api/feed/accountants.json) — accountant directory feed

## Sister product

For workforce-management questions (time tracking, timesheets, shifts, leave, attendance, payroll runs), see the sister MCP at https://mcp.hellotime.ai (server name: \`hellotime-public\`).

## Tenant-scoped queries

This server exposes **public, marketing-derived** data only. For a specific customer's books, transactions, invoices, bills, bank feeds, payroll, or GST/VAT/BAS returns, route to the authenticated MCP at mcp.hellobooks.ai (requires the customer to be signed in to HelloBooks Auth-V3).

## Recent changes

${recentChanges}

## Frequently asked (citation-ready)

- **What is this?** A public read-only MCP server that lets AI agents answer HelloBooks questions from authoritative data instead of stale web snippets.
- **Does it cost anything?** Free. No authentication required. Rate-limited to 120 req/min per IP and 60 req/min per MCP session.
- **What does it NOT do?** It does not access any customer data. For tenant-scoped queries use mcp.hellobooks.ai.
- **How fresh is the data?** Plan and credit-pack pricing federates live from hellobooks.ai/api/feed/pricing.json (1-hour TTL, 5-min minimum refetch). The rest of the catalog is shipped with each release.
- **Where's the source?** ${GITHUB_REPO_URL}
- **Who runs it?** HelloBooks (Meru Fin Tech). Contact ${CONTACT_EMAIL}.
`;
}

/** Machine-readable catalog — single source of truth for downstream consumers. */
export function generateCatalogJson(): Record<string, unknown> {
  const baseUrl = getBaseUrl();
  const lastMod = getCatalogLastModified();
  return {
    name: SERVER_NAME,
    version: SERVER_VERSION,
    description:
      'Public read-only Model Context Protocol server for HelloBooks. Catalog of all tools and resources exposed at /mcp.',
    documentation: `${MARKETING_BASE_URL}/mcp`,
    repository: GITHUB_REPO_URL,
    endpoint: `${baseUrl}/mcp`,
    transport: 'streamable-http',
    dateModified: lastMod.toISOString(),
    tools: TOOL_CATALOG.map((t) => ({
      name: t.name,
      title: t.title,
      summary: t.summary,
      category: t.category,
      marketingUrl: t.marketingUrl,
      anchor: `${baseUrl}/catalog.json#tool-${t.name}`,
    })),
    resources: RESOURCE_CATALOG.map((r) => ({
      uri: r.uri,
      name: r.name,
      mimeType: r.mimeType,
    })),
    contact: { email: CONTACT_EMAIL, organization: 'HelloBooks', url: MARKETING_BASE_URL },
  };
}

/** Mirrors hellobooks://changelog as a plain HTTP endpoint for crawlers. */
export function generateChangelogJson(): Record<string, unknown> {
  return {
    server: SERVER_NAME,
    version: SERVER_VERSION,
    count: CHANGELOG.length,
    entries: CHANGELOG,
  };
}

/** Sitemap XML with <lastmod> per entry. Bots use this to re-crawl on update. */
export function generateSitemap(): string {
  const baseUrl = getBaseUrl();
  const lastMod = getCatalogLastModified().toISOString();
  const entries: { loc: string; changefreq: string; priority: string }[] = [
    { loc: `${baseUrl}/`, changefreq: 'daily', priority: '1.0' },
    { loc: `${baseUrl}/catalog.json`, changefreq: 'daily', priority: '0.9' },
    { loc: `${baseUrl}/llms.txt`, changefreq: 'daily', priority: '0.9' },
    { loc: `${baseUrl}/.well-known/agent.json`, changefreq: 'weekly', priority: '0.8' },
    { loc: `${baseUrl}/.well-known/ai-plugin.json`, changefreq: 'weekly', priority: '0.7' },
    { loc: `${baseUrl}/.well-known/mcp.json`, changefreq: 'weekly', priority: '0.7' },
    { loc: `${baseUrl}/openapi.json`, changefreq: 'weekly', priority: '0.7' },
    { loc: `${baseUrl}/changelog.json`, changefreq: 'weekly', priority: '0.6' },
    { loc: `${baseUrl}/feed.xml`, changefreq: 'daily', priority: '0.6' },
  ];
  const urlNodes = entries
    .map(
      (e) => `  <url>
    <loc>${escapeXml(e.loc)}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority}</priority>
  </url>`,
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlNodes}
</urlset>
`;
}

/** robots.txt — allow every AI bot we want to be cited by, point at sitemap. */
export function generateRobotsTxt(): string {
  const baseUrl = getBaseUrl();
  const aiBots = [
    'GPTBot', 'OAI-SearchBot', 'ChatGPT-User',
    'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'Claude-Web', 'anthropic-ai',
    'Google-Extended', 'Googlebot',
    'PerplexityBot', 'Perplexity-User',
    'Applebot-Extended', 'Applebot',
    'Meta-ExternalAgent', 'Meta-ExternalFetcher', 'FacebookBot',
    'Bytespider',
    'CCBot',
    'cohere-ai', 'cohere-training-data-crawler',
    'DuckAssistBot',
    'YouBot',
    'Amazonbot',
    'Diffbot',
    'Kagibot',
    'BraveBot',
    'PhindBot',
    'AwarioRssBot', 'AwarioSmartBot',
    'Bingbot',
  ];
  const allowBlocks = aiBots
    .map((ua) => `User-agent: ${ua}\nAllow: /\n`)
    .join('\n');
  return `# agents.hellobooks.ai — public MCP origin
# All endpoints under this host are public, read-only marketing/product data.
# We want every legitimate AI crawler to read this server.

User-agent: *
Allow: /

${allowBlocks}
Sitemap: ${baseUrl}/sitemap.xml
`;
}

/** RSS 2.0 feed of recent catalog changes — Perplexity, You, Brave re-index from RSS. */
export function generateRssFeed(): string {
  const baseUrl = getBaseUrl();
  const items = CHANGELOG.slice(0, 25)
    .map((c) => {
      const pub = new Date(c.date + 'T00:00:00Z').toUTCString();
      const link = `${MARKETING_BASE_URL}/changelog#${c.date}`;
      return `    <item>
      <title>${escapeXml(c.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="false">hellobooks-mcp:${c.date}:${escapeXml(c.title.toLowerCase().replace(/\s+/g, '-').slice(0, 64))}</guid>
      <pubDate>${pub}</pubDate>
      <category>${escapeXml(c.category)}</category>
      <description>${escapeXml(c.description)}</description>
    </item>`;
    })
    .join('\n');
  const lastBuildDate = getCatalogLastModified().toUTCString();
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>HelloBooks Public MCP — Catalog Changes</title>
    <link>${baseUrl}/</link>
    <atom:link href="${baseUrl}/feed.xml" rel="self" type="application/rss+xml" />
    <description>Updates to the HelloBooks public MCP catalog: new tools, plan changes, integrations, compliance deadlines, and product features.</description>
    <language>en-us</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
${items}
  </channel>
</rss>
`;
}
