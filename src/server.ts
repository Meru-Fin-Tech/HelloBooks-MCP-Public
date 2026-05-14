/**
 * MCP server factory. Wires the 8 read-only tools and 2 resources.
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
import { complianceDeadlines, complianceDeadlinesSchema } from './tools/complianceDeadlines.js';
import { localPaymentMethods, localPaymentMethodsSchema } from './tools/paymentMethods.js';
import { RESOURCES, readResource } from './resources/index.js';

const SERVER_NAME = 'hellobooks-public';
const SERVER_VERSION = '0.4.0';

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
    'Free-text search across plan features, integrations, country features, compliance frameworks, competitor positioning, statutory deadlines, and local payment methods. Queries like "vs Xero", "QuickBooks alternative", "GSTR-3B due", "UPI invoice", "BPAY recurring", or "RTP supplier" surface the matching entry near the top.',
    featureSearchSchema,
    async (args) => asJsonContent(featureSearch(args)),
  );

  server.tool(
    'list_competitors',
    'Return competitor positioning entries (QuickBooks, Xero, FreshBooks, Wave, Zoho Books, Tally) with where HelloBooks wins, where the competitor wins, and pricing notes. Optional country, tier (primary / secondary), and id filters.',
    listCompetitorsSchema,
    async (args) => asJsonContent(listCompetitors(args)),
  );

  server.tool(
    'compliance_deadlines',
    'When statutory returns and payroll filings are due, per country. Covers IN (GSTR-1/3B/9/9C, CMP-08, Form 24Q, Form 16, PF ECR, ESI), AU (BAS, STP, Super Guarantee), GB (VAT MTD, RTI, Self Assessment), US (1099-NEC/MISC, W-2, Form 941/940), CA (T4, GST/HST). Optional country, frequency, and form filters. Note: dates rotate annually — every response carries a disclaimer with the per-deadline `source` URL for authority confirmation.',
    complianceDeadlinesSchema,
    async (args) => asJsonContent(complianceDeadlines(args)),
  );

  server.tool(
    'local_payment_methods',
    'List local bank-rail / wallet payment methods relevant to HelloBooks invoice collection (AR), B2B supplier payments (AP), and contractor payouts (UPI, RuPay, Razorpay, IMPS, NEFT, RTGS, BACS, FPS, CHAPS, Open Banking, Interac e-Transfer, EFT, PayID, PayTo, NPP, BPAY, ACH, Same Day ACH, Fedwire, RTP, Zelle, PayNow, FAST, GIRO, NZ Direct Credit, etc.). Returns rail (instant / same-day / next-day / multi-day), use-cases, issuing authority, HelloBooks support level, and operational notes (per-transaction caps, settlement windows, retirement timelines). Filter by country, useCase, rail, or id.',
    localPaymentMethodsSchema,
    async (args) => asJsonContent(localPaymentMethods(args)),
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
export {
  listPlans,
  listIntegrations,
  countrySupport,
  complianceCapabilities,
  featureSearch,
  listCompetitors,
  complianceDeadlines,
  localPaymentMethods,
};
export const _internal = { z };
