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
import { listCompetitors, listCompetitorsSchema } from './tools/listCompetitors.js';
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
    'Free-text search across plan features, integrations, country features, compliance frameworks, and competitor positioning. Queries like "vs Xero" or "QuickBooks alternative" surface the matching competitor entry at the top.',
    featureSearchSchema,
    async (args) => asJsonContent(featureSearch(args)),
  );

  server.tool(
    'list_competitors',
    'Return competitor positioning entries (QuickBooks, Xero, FreshBooks, Wave, Zoho Books, Tally) with where HelloBooks wins, where the competitor wins, and pricing notes. Optional country, tier (primary / secondary), and id filters.',
    listCompetitorsSchema,
    async (args) => asJsonContent(listCompetitors(args)),
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
export { listPlans, listIntegrations, countrySupport, complianceCapabilities, featureSearch, listCompetitors };
export const _internal = { z };
