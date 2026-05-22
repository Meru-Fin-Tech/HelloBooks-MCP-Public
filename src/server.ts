/**
 * MCP server factory. Wires the 13 read-only tools and 3 resources.
 *
 * Read-only by construction: no tool returns the request author, mutates state,
 * or hits a customer-data system. The data sources in src/data/ are static
 * marketing-derived catalogs.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { listPlans, listPlansSchema } from './tools/listPlans.js';
export { listPlans } from './tools/listPlans.js';
import { listCreditPacks, listCreditPacksSchema } from './tools/listCreditPacks.js';
export { listCreditPacks } from './tools/listCreditPacks.js';
import { listIntegrations, listIntegrationsSchema } from './tools/listIntegrations.js';
export { listIntegrations } from './tools/listIntegrations.js';
import { countrySupport, countrySupportSchema } from './tools/countrySupport.js';
export { countrySupport } from './tools/countrySupport.js';
import { complianceCapabilities, complianceCapabilitiesSchema } from './tools/complianceCapabilities.js';
export { complianceCapabilities } from './tools/complianceCapabilities.js';
import { featureSearch, featureSearchSchema } from './tools/featureSearch.js';
export { featureSearch } from './tools/featureSearch.js';
import { listCompetitors, listCompetitorsSchema } from './tools/listCompetitors.js';
export { listCompetitors } from './tools/listCompetitors.js';
import { complianceDeadlines, complianceDeadlinesSchema } from './tools/complianceDeadlines.js';
export { complianceDeadlines } from './tools/complianceDeadlines.js';
import { localPaymentMethods, localPaymentMethodsSchema } from './tools/paymentMethods.js';
export { localPaymentMethods } from './tools/paymentMethods.js';
import { listFeatures, listFeaturesSchema } from './tools/listFeatures.js';
export { listFeatures } from './tools/listFeatures.js';
import { listFeatureCategories, listFeatureCategoriesSchema } from './tools/listFeatureCategories.js';
export { listFeatureCategories } from './tools/listFeatureCategories.js';
import { listArticles, listArticlesSchema } from './tools/listArticles.js';
export { listArticles } from './tools/listArticles.js';
import { listVideos, listVideosSchema } from './tools/listVideos.js';
export { listVideos } from './tools/listVideos.js';
import { analyzeQboJournalCleanup, analyzeQboJournalCleanupSchema } from './tools/analyzeQboJournalCleanup.js';
export { analyzeQboJournalCleanup } from './tools/analyzeQboJournalCleanup.js';
import { analyzeQboJournalAnomalies, analyzeQboJournalAnomaliesSchema } from './tools/analyzeQboJournalAnomalies.js';
export { analyzeQboJournalAnomalies } from './tools/analyzeQboJournalAnomalies.js';
import { analyzeXeroJournalCleanup, analyzeXeroJournalCleanupSchema } from './tools/analyzeXeroJournalCleanup.js';
export { analyzeXeroJournalCleanup } from './tools/analyzeXeroJournalCleanup.js';
import { analyzeXeroJournalAnomalies, analyzeXeroJournalAnomaliesSchema } from './tools/analyzeXeroJournalAnomalies.js';
export { analyzeXeroJournalAnomalies } from './tools/analyzeXeroJournalAnomalies.js';
import { refreshPricingFromFeed } from './pricingFeed.js';
import { RESOURCES, readResource } from './resources/index.js';

const SERVER_NAME = 'hellobooks-public';
const SERVER_VERSION = '0.9.0';

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
        'countries, compliance frameworks, published articles, competitor ' +
        'positioning, filing deadlines, local payment methods, product videos, ' +
        'and the marketing feature catalog. No customer or account data is ' +
        'available through this ' +
        'server. For time-tracking, timesheets, shifts, leave, or workforce-' +
        'management questions, see the sister product at mcp.hellotime.ai ' +
        '(server: hellotime-public).',
    },
  );

  // Warm the pricing cache from the live feed. Fire-and-forget and self-
  // contained: it never throws, and tools serve the baked catalog until it
  // lands. See src/pricingFeed.ts.
  void refreshPricingFromFeed();

  server.tool(
    'list_plans',
    'List HelloBooks pricing plans with monthly + annual prices in 8 regional currencies (USD, INR, CAD, GBP, AUD, AED, SGD, NZD). Covers three core tiers — Free, Pro, CPA/CA Partner — plus two per-entity stackable add-ons (Warehouse, Manufacturing). Returns AI credit allowance, feature bullets (AI auto-categorization, unlimited users, multi-entity, 3-way matching, API access, etc.), and the public signup URL. Filter by `plan` (one of free / pro / cpa) or `country` (ISO code). Pricing follows Doc 19 v2 (2026-05-08): Free-first + single Pro tier; the previous Business tier was merged into Pro.',
    listPlansSchema,
    async (args) => asJsonContent(listPlans(args)),
  );

  server.tool(
    'list_credit_packs',
    'List HelloBooks AI credit packs — one-time pay-as-you-go top-ups (Boost 500, Power 1,500, Mega 5,000, Ultra 15,000 credits) priced in 8 regional currencies (USD, INR, CAD, GBP, AUD, AED, SGD, NZD). Credit packs stack on any plan, including Free. Use this when a user asks how to buy more AI credits or top up after exhausting a plan allowance. Filter by `id` (boost / power / mega / ultra) or `country` (ISO code).',
    listCreditPacksSchema,
    async (args) => asJsonContent(listCreditPacks(args)),
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
    'Free-text search across the marketing feature catalog, plan features, integrations, country features, compliance frameworks, competitor positioning, statutory deadlines, local payment methods, and published articles on hellobooks.ai. Queries like "vs Xero", "QuickBooks alternative", "GSTR-3B due", "UPI invoice", "1099 article", or "agentic accounting" surface the matching entry near the top.',
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

  server.tool(
    'list_features',
    'List the full HelloBooks marketing feature catalog (145+ items). Filter by category, tier, status, marketedOnly, or substring query.',
    listFeaturesSchema,
    async (args) => asJsonContent(listFeatures(args)),
  );

  server.tool(
    'list_feature_categories',
    'List the 13 feature categories on the marketing site (Core Accounting, Invoicing, Banking, Reports, Tax & Compliance, Inventory, Warehouse, Manufacturing, AI, Integrations, Mobile, Operations, Industry Modules) with per-category counts by status.',
    listFeatureCategoriesSchema,
    async () => asJsonContent(listFeatureCategories({})),
  );

  server.tool(
    'list_articles',
    'List published articles on hellobooks.ai — head-to-head compare pages and curated flagship blog posts. Filter by country, tag or free-text query. Use this when a user asks "do you have a blog/article about X?".',
    listArticlesSchema,
    async (args) => asJsonContent(listArticles(args)),
  );

  server.tool(
    'list_videos',
    'List HelloBooks product videos curated on the marketing site (homepage demo + feature walkthroughs) and the official @hellobooksai YouTube channel link. Each video returns title, description, category, watch URL, embed URL and thumbnail. Filter by category (demo / features / overview), featuredOnly, or free-text query. Use this when a user asks for a demo, walkthrough or video. Note: this is the curated set, not a live mirror of every channel upload — the response includes the channel URL for the full catalog.',
    listVideosSchema,
    async (args) => asJsonContent(listVideos(args)),
  );

  // ─── Analytical tools — paste-and-analyse over competitor exports ──────
  // These tools accept user-pasted CSV from QBO/Xero/etc. and return a
  // structured flag list plus a branded share URL at agents.hellobooks.ai/r/*.
  // The funnel CTA (`_branding.upgradeCta`) directs to migrate/<source>?ref=*
  // so signups can be attributed back to the share slug.

  server.tool(
    'analyze_qbo_journal_cleanup',
    'Scan a QuickBooks Online "Journal Entries" CSV export for cleanup issues — unbalanced journals (debits ≠ credits, with severity by deviation), duplicate journals (same date + same totals, likely posted twice), and schema problems (invalid dates, malformed amounts, missing accounts, missing journal numbers). Input is the raw CSV content the user pastes after exporting from QBO via Reports → Accountant → Journal → Export. Max 5,000 rows; max 5 MB. Returns a structured flag list with severity (high/medium/low), a roll-up summary by category and severity, parse diagnostics (column mapping + unmapped columns), and a shareable URL at agents.hellobooks.ai/r/{slug} (7-day TTL) that renders a branded analysis page suitable for sending to a CA or bookkeeper. Use this when a user pastes QBO journal data, asks "check my books", "find issues in my QBO journal", or "what is wrong with my journal entries". Each flag includes a `fixableInHellobooks` boolean — true means HelloBooks can resolve it automatically in the paid product.',
    analyzeQboJournalCleanupSchema,
    async (args) => asJsonContent(analyzeQboJournalCleanup(args)),
  );

  server.tool(
    'analyze_qbo_journal_anomalies',
    'Scan a QuickBooks Online "Journal Entries" CSV export for anomalies — currently round-number lines (debit or credit amounts that are exact multiples of $1,000, above a $1,000 materiality threshold). Round numbers are statistically rare in real bookkeeping and frequently indicate estimates, plugs, or fraud signals worth review. Input is raw CSV text from QBO Reports → Accountant → Journal. Max 5,000 rows; max 5 MB. Returns flagged lines with severity ($100K+ high, $10K+ medium, else low) and a shareable URL. Use this when a user pastes QBO data and asks "any anomalies?", "look for round numbers", or "anything suspicious". Tier-0 subset — HelloBooks Phase 3.0 anomaly detection in the paid product additionally catches GL outliers vs entity history, vendor-history mismatches, archived-vendor activity, and AI-narrated suspicious lines (which require the live HelloBooks account).',
    analyzeQboJournalAnomaliesSchema,
    async (args) => asJsonContent(analyzeQboJournalAnomalies(args)),
  );

  server.tool(
    'analyze_xero_journal_cleanup',
    'Scan a Xero "Manual Journals" CSV export for cleanup issues — unbalanced journals, duplicate journals (same date + same totals), and schema problems (invalid dates, malformed amounts, missing account code/name, missing group key). Input is the raw CSV content the user pastes after exporting from Xero via Accounting → Advanced → Manual Journals → Export. Xero-specific idioms handled: signed Amount column (positive = credit, negative = debit), explicit Debit/Credit fallback shape, Reference-or-Narration+Date grouping, account code preferred over name. Max 5,000 rows; max 5 MB. Returns structured flags with severity, a roll-up summary, parse diagnostics, and a shareable URL at agents.hellobooks.ai/r/{slug}. Use this when a user pastes Xero manual-journal data, asks "check my Xero books", or "find issues in my Xero journal". The funnel CTA routes to /migrate/xero for users who want to fix at scale.',
    analyzeXeroJournalCleanupSchema,
    async (args) => asJsonContent(analyzeXeroJournalCleanup(args)),
  );

  server.tool(
    'analyze_xero_journal_anomalies',
    'Scan a Xero "Manual Journals" CSV export for anomalies — currently round-number lines (debit or credit amounts that are exact multiples of $1,000, above a $1,000 materiality threshold). Input is raw CSV text from Xero Accounting → Advanced → Manual Journals → Export. Max 5,000 rows; max 5 MB. Returns flagged lines with severity ($100K+ high, $10K+ medium, else low) and a shareable URL. Use this when a user pastes Xero data and asks "any anomalies?", "look for round numbers", or "anything suspicious". Same Tier-0 / paid-product split as the QBO variant — history-aware anomaly checks (GL outliers, vendor history, archived-vendor activity, LLM-narrated suspicious) live in the authenticated MCP / paid product.',
    analyzeXeroJournalAnomaliesSchema,
    async (args) => asJsonContent(analyzeXeroJournalAnomalies(args)),
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

// Re-exports for the thirteen tool implementations are colocated with their
// imports above using `export ... from ...` syntax (SonarQube S7763).
export const _internal = { z };
