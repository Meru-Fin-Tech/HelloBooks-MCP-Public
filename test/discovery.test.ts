/**
 * Tests for the self-describing discovery surface (src/discovery.ts).
 *
 * These tests exist to guarantee that:
 *   1. Every generator returns parseable, syntactically valid output.
 *   2. The published tool count in the discovery surface matches what
 *      src/server.ts actually registers — so the agent card never lies about
 *      what /mcp can do.
 *   3. The HELLOBOOKS_MCP_BASE_URL env override threads through every
 *      generator (so dev / staging / prod can self-identify correctly).
 *   4. Cross-bot must-haves are present (A2A skill list, JSON-LD,
 *      AI-bot allow-list in robots, RSS items, sitemap loc entries).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  TOOL_CATALOG,
  generateAgentCard,
  generateAiPluginManifest,
  generateCatalogJson,
  generateChangelogJson,
  generateLandingHtml,
  generateLlmsTxt,
  generateMcpDiscovery,
  generateOpenApi,
  generateRobotsTxt,
  generateRssFeed,
  generateSitemap,
  getBaseUrl,
} from '../src/discovery.js';

// Same pricing-feed disable used by tools.test.ts — discovery doesn't touch
// the feed, but importing src/server.js (which we don't here) would trigger it.
process.env.HELLOBOOKS_MCP_DISABLE_PRICING_FEED = '1';

test('getBaseUrl defaults to agents.hellobooks.ai', () => {
  delete process.env.HELLOBOOKS_MCP_BASE_URL;
  assert.equal(getBaseUrl(), 'https://agents.hellobooks.ai');
});

test('getBaseUrl honors HELLOBOOKS_MCP_BASE_URL env and strips trailing slash', () => {
  process.env.HELLOBOOKS_MCP_BASE_URL = 'https://staging.example.com/';
  assert.equal(getBaseUrl(), 'https://staging.example.com');
  delete process.env.HELLOBOOKS_MCP_BASE_URL;
});

test('TOOL_CATALOG covers all 13 MCP tools currently registered', () => {
  const expected = [
    'list_plans',
    'list_credit_packs',
    'list_integrations',
    'country_support',
    'compliance_capabilities',
    'feature_search',
    'list_competitors',
    'compliance_deadlines',
    'local_payment_methods',
    'list_features',
    'list_feature_categories',
    'list_articles',
    'list_videos',
  ];
  const actual = TOOL_CATALOG.map((t) => t.name);
  assert.deepEqual(actual.slice().sort(), expected.slice().sort());
});

test('generateAgentCard returns a valid A2A-shaped card with one skill per tool', () => {
  const card = generateAgentCard();
  assert.equal(card.name, 'HelloBooks Public MCP');
  assert.match(String(card.url), /\/mcp$/);
  assert.equal(card.protocolVersion, '1.0');
  const skills = card.skills as { id: string; tags: string[] }[];
  assert.equal(skills.length, TOOL_CATALOG.length);
  for (const skill of skills) {
    assert.ok(skill.id, 'skill.id required');
    assert.ok(skill.tags.includes('hellobooks'));
  }
  const provider = card.provider as { organization: string; email: string };
  assert.equal(provider.organization, 'HelloBooks');
  assert.equal(provider.email, 'hello@hellobooks.ai');
});

test('generateAiPluginManifest returns a v1 OpenAI plugin manifest pointing at /openapi.json', () => {
  const manifest = generateAiPluginManifest();
  assert.equal(manifest.schema_version, 'v1');
  assert.equal(manifest.name_for_model, 'hellobooks_mcp');
  const auth = manifest.auth as { type: string };
  assert.equal(auth.type, 'none');
  const api = manifest.api as { type: string; url: string };
  assert.equal(api.type, 'openapi');
  assert.match(api.url, /\/openapi\.json$/);
});

test('generateMcpDiscovery lists every tool and resource', () => {
  const d = generateMcpDiscovery();
  const tools = d.tools as string[];
  const resources = d.resources as string[];
  assert.equal(tools.length, TOOL_CATALOG.length);
  assert.ok(resources.length >= 3, 'at least about/changelog/feature-catalog');
  assert.ok(resources.every((u) => u.startsWith('hellobooks://')));
  assert.equal(d.transport, 'streamable-http');
});

test('generateOpenApi returns a valid 3.1 spec with /mcp documented', () => {
  const spec = generateOpenApi();
  assert.equal(spec.openapi, '3.1.0');
  const paths = spec.paths as Record<string, { post?: unknown; get?: unknown }>;
  assert.ok(paths['/mcp']?.post, '/mcp POST documented');
  assert.ok(paths['/catalog.json']?.get, '/catalog.json GET documented');
  assert.ok(paths['/health']?.get, '/health GET documented');
});

test('generateCatalogJson exposes tools, resources, and a dateModified ISO timestamp', () => {
  const cat = generateCatalogJson();
  const tools = cat.tools as { name: string }[];
  assert.equal(tools.length, TOOL_CATALOG.length);
  // dateModified must be parseable.
  const dt = new Date(cat.dateModified as string);
  assert.ok(!isNaN(dt.getTime()), 'dateModified must be a valid date');
  assert.equal(cat.transport, 'streamable-http');
});

test('generateChangelogJson exposes server name + entry count', () => {
  const cl = generateChangelogJson();
  assert.equal(cl.server, 'hellobooks-public');
  assert.ok((cl.count as number) > 0);
  const entries = cl.entries as unknown[];
  assert.equal(entries.length, cl.count);
});

test('generateLandingHtml is a well-formed HTML doc with two JSON-LD blocks', () => {
  const html = generateLandingHtml();
  assert.ok(html.startsWith('<!DOCTYPE html>'));
  assert.match(html, /<title>HelloBooks Public MCP/);
  assert.match(html, /application\/ld\+json/);
  // JSON-LD payload should parse.
  const m = /<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/.exec(html);
  assert.ok(m, 'expected an ld+json block');
  const parsed = JSON.parse(m[1]);
  assert.equal(parsed['@context'], 'https://schema.org');
  const graph = parsed['@graph'] as { '@type': string }[];
  assert.equal(graph.length, 2);
  assert.equal(graph[0]['@type'], 'SoftwareApplication');
  assert.equal(graph[1]['@type'], 'ItemList');
});

test('generateLlmsTxt lists every tool by name and points at /mcp', () => {
  const txt = generateLlmsTxt();
  assert.match(txt, /^# HelloBooks Public MCP/);
  for (const tool of TOOL_CATALOG) {
    assert.match(txt, new RegExp(`\`${tool.name}\``), `llms.txt must mention ${tool.name}`);
  }
  assert.match(txt, /\/mcp/);
});

test('generateSitemap is valid XML, contains <lastmod>, and the host root URL', () => {
  const xml = generateSitemap();
  assert.match(xml, /^<\?xml/);
  assert.match(xml, /<urlset/);
  assert.match(xml, /<lastmod>/);
  assert.match(xml, /agents\.hellobooks\.ai/);
  // Each <url> element should have <loc>, <lastmod>, <changefreq>, <priority>.
  const urlCount = (xml.match(/<url>/g) ?? []).length;
  const locCount = (xml.match(/<loc>/g) ?? []).length;
  assert.equal(urlCount, locCount);
  assert.ok(urlCount >= 9, `expected at least 9 entries, got ${urlCount}`);
});

test('generateRobotsTxt allows every major AI crawler and points to sitemap', () => {
  const txt = generateRobotsTxt();
  for (const bot of ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended', 'CCBot', 'Applebot-Extended', 'Bytespider']) {
    assert.match(txt, new RegExp(`User-agent: ${bot}`), `robots.txt must allow ${bot}`);
  }
  assert.match(txt, /Sitemap: https:\/\/agents\.hellobooks\.ai\/sitemap\.xml/);
});

test('generateRssFeed is valid RSS 2.0 with at least one <item>', () => {
  const xml = generateRssFeed();
  assert.match(xml, /^<\?xml/);
  assert.match(xml, /<rss version="2\.0"/);
  assert.match(xml, /<channel>/);
  assert.match(xml, /<item>/);
  assert.match(xml, /agents\.hellobooks\.ai\/feed\.xml/);
});

test('every generator honors HELLOBOOKS_MCP_BASE_URL env override', () => {
  process.env.HELLOBOOKS_MCP_BASE_URL = 'https://staging.example.com';
  try {
    assert.match(generateLandingHtml(), /staging\.example\.com/);
    assert.match(generateLlmsTxt(), /staging\.example\.com/);
    assert.match(generateRobotsTxt(), /staging\.example\.com/);
    assert.match(generateSitemap(), /staging\.example\.com/);
    assert.match(generateRssFeed(), /staging\.example\.com/);
    assert.match(String((generateCatalogJson() as { endpoint: string }).endpoint), /staging\.example\.com\/mcp/);
    assert.match(String((generateAgentCard() as { url: string }).url), /staging\.example\.com\/mcp/);
    assert.match(String(((generateAiPluginManifest() as { api: { url: string } }).api).url), /staging\.example\.com/);
    assert.match(String((generateMcpDiscovery() as { endpoint: string }).endpoint), /staging\.example\.com\/mcp/);
    assert.match(String(((generateOpenApi() as { servers: { url: string }[] }).servers)[0].url), /staging\.example\.com/);
  } finally {
    delete process.env.HELLOBOOKS_MCP_BASE_URL;
  }
});
