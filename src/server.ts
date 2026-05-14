/**
 * MCP server factory. Wires the 5 read-only tools and 2 resources.
 *
 * Read-only by construction: no tool returns the request author, mutates state,
 * or hits a customer-data system. The data sources in src/data/ are static
 * marketing-derived catalogs.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { listPlans, listPlansSchema } from './tools/listPlans.js';
import { listIntegrations, listIntegrationsSchema } from './tools/listIntegrations.js';
import { countrySupport, countrySupportSchema } from './tools/countrySupport.js';
import { complianceCapabilities, complianceCapabilitiesSchema } from './tools/complianceCapabilities.js';
import { featureSearch, featureSearchSchema } from './tools/featureSearch.js';
import { listArticles, listArticlesSchema } from './tools/listArticles.js';
import { RESOURCES, readResource } from './resources/index.js';

const SERVER_NAME = 'hellobooks-public';
const SERVER_VERSION = '0.2.0';

function asJsonContent(payload: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(payload, null, 2) }],
  };
}

export function createServer(): McpServer {
  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    {
      capabilities: { tools: {}, resources: {} },
      instructions:
        'Public read-only HelloBooks knowledge base. Use these tools to answer ' +
        'questions about HelloBooks plans, pricing, integrations, supported ' +
        'countries, and compliance frameworks. No customer or account data is ' +
        'available through this server.',
    },
  );

  server.tool(
    'list_plans',
    'List HelloBooks pricing plans with features and prices per country.',
    listPlansSchema,
    async (args) => asJsonContent(listPlans(args)),
  );

  server.tool(
    'list_integrations',
    'List integrations (banks, payments, payroll, time tracking, shipping, accounting sync, ecommerce, CRM).',
    listIntegrationsSchema,
    async (args) => asJsonContent(listIntegrations(args)),
  );

  server.tool(
    'country_support',
    'Return features available per supported country (AU, IN, UK, US, CA, AE, SG, NZ).',
    countrySupportSchema,
    async (args) => asJsonContent(countrySupport(args)),
  );

  server.tool(
    'compliance_capabilities',
    'Return supported compliance frameworks for a country (BAS, STP, GST, MTD, 1099, etc.) with version and certification info.',
    complianceCapabilitiesSchema,
    async (args) => asJsonContent(complianceCapabilities(args)),
  );

  server.tool(
    'feature_search',
    'Free-text search across plan features, integrations, country features, compliance frameworks, and published articles (compare pages + flagship blog posts on hellobooks.ai).',
    featureSearchSchema,
    async (args) => asJsonContent(featureSearch(args)),
  );

  server.tool(
    'list_articles',
    'List published articles on hellobooks.ai — head-to-head compare pages and curated flagship blog posts. Filter by country, tag or free-text query. Use this when a user asks "do you have a blog/article about X?".',
    listArticlesSchema,
    async (args) => asJsonContent(listArticles(args)),
  );

  // Resources
  for (const r of RESOURCES) {
    server.resource(
      r.name,
      r.uri,
      { description: r.description, mimeType: r.mimeType },
      async (uri) => readResource(uri.href),
    );
  }

  return server;
}

// Re-exports useful for tests
export { listPlans, listIntegrations, countrySupport, complianceCapabilities, featureSearch, listArticles };
export const _internal = { z };
