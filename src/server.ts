/**
 * MCP server factory. Wires the read-only tools and 3 resources.
 *
 * Read-only by construction: no tool returns the request author, mutates state,
 * or hits a customer-data system. The data sources in src/data/ are static
 * marketing-derived catalogs.
 *
 * Every registration carries the `READ_ONLY` annotations below so hosts
 * (ChatGPT, Claude) can skip the per-call "this tool may modify your data"
 * approval prompt. Without annotations a host must assume the worst, which on
 * a public catalog server is pure friction. If you add a tool here, annotate
 * it — and if it is ever NOT read-only, it does not belong on this server.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { listPlans, listPlansSchema } from './tools/listPlans.js';
export { listPlans } from './tools/listPlans.js';
import { recommendPlan, recommendPlanSchema } from './tools/recommendPlan.js';
export { recommendPlan } from './tools/recommendPlan.js';
import { comparePlans, comparePlansSchema } from './tools/comparePlans.js';
export { comparePlans } from './tools/comparePlans.js';
import { estimateAnnualCost, estimateAnnualCostSchema } from './tools/estimateAnnualCost.js';
export { estimateAnnualCost } from './tools/estimateAnnualCost.js';
import { supportedCurrencies, supportedCurrenciesSchema } from './tools/supportedCurrencies.js';
export { supportedCurrencies } from './tools/supportedCurrencies.js';
import { explainTerm, explainTermSchema } from './tools/explainTerm.js';
export { explainTerm } from './tools/explainTerm.js';
import { listCreditPacks, listCreditPacksSchema } from './tools/listCreditPacks.js';
export { listCreditPacks } from './tools/listCreditPacks.js';
import { freeTierEligibility, freeTierEligibilitySchema } from './tools/freeTierEligibility.js';
export { freeTierEligibility } from './tools/freeTierEligibility.js';
import { partnerProgramInfo, partnerProgramInfoSchema } from './tools/partnerProgramInfo.js';
export { partnerProgramInfo } from './tools/partnerProgramInfo.js';
import { practiceManagementInfo, practiceManagementInfoSchema } from './tools/practiceManagementInfo.js';
export { practiceManagementInfo } from './tools/practiceManagementInfo.js';
import { onboardingSupport, onboardingSupportSchema } from './tools/onboardingSupportInfo.js';
export { onboardingSupport } from './tools/onboardingSupportInfo.js';
import { getSandboxInfo, getSandboxInfoSchema } from './tools/getSandboxInfo.js';
export { getSandboxInfo } from './tools/getSandboxInfo.js';
import { listIntegrations, listIntegrationsSchema } from './tools/listIntegrations.js';
export { listIntegrations } from './tools/listIntegrations.js';
import { checkIntegration, checkIntegrationSchema } from './tools/checkIntegration.js';
export { checkIntegration } from './tools/checkIntegration.js';
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
import { nextDeadlines, nextDeadlinesSchema } from './tools/nextDeadlines.js';
export { nextDeadlines } from './tools/nextDeadlines.js';
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
import { analyzeJournalVariance, analyzeJournalVarianceSchema } from './tools/analyzeJournalVariance.js';
export { analyzeJournalVariance } from './tools/analyzeJournalVariance.js';
import { compareBooksToHellobooks, compareBooksToHellobooksSchema } from './tools/compareBooksToHellobooks.js';
export { compareBooksToHellobooks } from './tools/compareBooksToHellobooks.js';
import { estimateMigrationEffort, estimateMigrationEffortSchema } from './tools/estimateMigrationEffort.js';
import { migrationChecklist, migrationChecklistSchema } from './tools/migrationChecklist.js';
export { migrationChecklist } from './tools/migrationChecklist.js';
export { estimateMigrationEffort } from './tools/estimateMigrationEffort.js';
import { analyzeTrialBalance, analyzeTrialBalanceSchema } from './tools/analyzeTrialBalance.js';
export { analyzeTrialBalance } from './tools/analyzeTrialBalance.js';
import { analyzeProfitLoss, analyzeProfitLossSchema } from './tools/analyzeProfitLoss.js';
export { analyzeProfitLoss } from './tools/analyzeProfitLoss.js';
import { analyzeBalanceSheet, analyzeBalanceSheetSchema } from './tools/analyzeBalanceSheet.js';
export { analyzeBalanceSheet } from './tools/analyzeBalanceSheet.js';
import { listTaxRates, listTaxRatesSchema } from './tools/listTaxRates.js';
export { listTaxRates } from './tools/listTaxRates.js';
import { lookupTaxRate, lookupTaxRateSchema } from './tools/lookupTaxRate.js';
export { lookupTaxRate } from './tools/lookupTaxRate.js';
import { howMunimjiHelps, howMunimjiHelpsSchema } from './tools/howMunimjiHelps.js';
export { howMunimjiHelps } from './tools/howMunimjiHelps.js';
import {
  publicSearch,
  publicFetch,
  publicSearchSchema,
  publicFetchSchema,
} from './tools/publicSearch.js';
export { publicSearch, publicFetch } from './tools/publicSearch.js';
import { refreshPricingFromFeed } from './pricingFeed.js';
import { RESOURCES, readResource } from './resources/index.js';
import { registerPrompts } from './prompts/index.js';
import { track } from './analytics.js';
import { listAccountants, listAccountantsSchema, getAccountant } from './accountants.js';
import { listApiCatalog, apiCatalogSchema } from './apiCatalog.js';

const SERVER_NAME = 'hellobooks-public';
export const SERVER_VERSION = '1.6.0';

/** Every tool on this server is a read-only public-data lookup. */
const READ_ONLY = { readOnlyHint: true, openWorldHint: false } as const;

function asJsonContent(payload: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(payload, null, 2) }],
  };
}

/**
 * Argument *keys* as a CSV string — never values. Tool arguments can carry
 * free text (e.g. a `feature_search` query), so only key names reach GA4.
 */
function argKeys(args: unknown): string {
  return args && typeof args === 'object' && !Array.isArray(args)
    ? Object.keys(args).join(',')
    : '';
}

/** Pull the opaque MCP session id out of the SDK request `extra`, if present. */
function sessionIdOf(extra: unknown): string {
  const sid = (extra as { sessionId?: unknown } | undefined)?.sessionId;
  return typeof sid === 'string' ? sid : 'unknown';
}

/**
 * Run a tool, emit a Layer-2 telemetry event, and JSON-wrap the result.
 *
 * Emits `mcp_tool_called` on success and `mcp_tool_errored` on a thrown error
 * (which is always re-thrown — telemetry never alters tool behaviour).
 * Telemetry is fire-and-forget; see src/analytics.ts.
 */
async function runTool(
  toolName: string,
  args: unknown,
  extra: unknown,
  produce: () => unknown,
) {
  const payload = await withTelemetry(toolName, args, extra, produce);
  const base = asJsonContent(payload);
  // Also expose the payload as `structuredContent` so agents can consume the
  // typed result without re-parsing the JSON text block. These tools declare no
  // outputSchema, so the SDK passes it through unvalidated (search/fetch, which
  // DO declare one, go through runStructuredTool). Per the MCP spec only a JSON
  // object is valid structuredContent, so arrays/primitives stay text-only.
  // Derive it from the serialised text (not the raw object) so it is JSON-clean
  // — `undefined`-valued optional fields are dropped exactly as in the text,
  // keeping the two representations identical over any transport.
  if (payload !== null && typeof payload === 'object' && !Array.isArray(payload)) {
    return { ...base, structuredContent: JSON.parse(base.content[0].text) as Record<string, unknown> };
  }
  return base;
}

/**
 * Run `produce`, emit the Layer-2 telemetry event, and return its raw payload.
 * Shared by `runTool` (JSON text content) and `runStructuredTool` (text +
 * structured content). Telemetry is fire-and-forget and never alters tool
 * behaviour: a thrown error is always re-thrown. See src/analytics.ts.
 */
async function withTelemetry<T>(
  toolName: string,
  args: unknown,
  extra: unknown,
  produce: () => T,
): Promise<Awaited<T>> {
  const startedAt = Date.now();
  const clientId = sessionIdOf(extra);
  try {
    const payload = await produce();
    track(
      'mcp_tool_called',
      {
        tool_name: toolName,
        arg_keys: argKeys(args),
        latency_ms: Date.now() - startedAt,
        success: true,
      },
      clientId,
    );
    return payload;
  } catch (err) {
    track(
      'mcp_tool_errored',
      {
        tool_name: toolName,
        error_class: err instanceof Error ? err.name : 'UnknownError',
      },
      clientId,
    );
    throw err;
  }
}

/**
 * Output schemas for the OpenAI `search` / `fetch` contract. Declaring them
 * makes the SDK validate the `structuredContent` we return, so a drift in
 * ./lib/documents/ fails loudly here instead of silently breaking citations.
 */
const SEARCH_OUTPUT_SCHEMA = {
  results: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      url: z.string(),
    }),
  ),
};

const FETCH_OUTPUT_SCHEMA = {
  id: z.string(),
  title: z.string(),
  text: z.string(),
  url: z.string(),
  metadata: z.record(z.string(), z.string()),
};

/**
 * Like `runTool`, but also returns the payload as `structuredContent`. The
 * OpenAI connector contract requires both the JSON-encoded text block (for
 * clients without structured output) and the structured object.
 */
async function runStructuredTool<T extends object>(
  toolName: string,
  args: unknown,
  extra: unknown,
  produce: () => T,
) {
  const payload = await withTelemetry(toolName, args, extra, produce);
  return {
    ...asJsonContent(payload),
    // Validated against the declared outputSchema by the SDK; the cast only
    // satisfies the SDK's Record index signature.
    structuredContent: payload as unknown as Record<string, unknown>,
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

  // `list_plans` / `list_credit_packs` federate prices from hellobooks.ai, so
  // they are the only two tools where openWorldHint is a judgement call. They
  // keep `openWorldHint: false` with the rest:
  //
  //   - The spec's axis is the *domain of interaction* — unbounded (web search)
  //     vs closed (memory access) — not "does any egress happen". The domain
  //     here is a fixed, enumerable catalog: 6 plans + 2 add-ons + 4 credit
  //     packs over 8 priced countries. The feed is HelloBooks' own first-party
  //     publication of that same closed catalog, not an open world.
  //   - A tool call never performs, blocks on, or returns the fetch. It reads
  //     the current snapshot synchronously; refreshPricingFromFeed() is a
  //     throttled background overlay whose failures are swallowed. A cold call
  //     with the network unplugged still answers, from the baked catalog.
  //   - Freshness is disclosed in the payload, where a caller can act on it:
  //     every response carries top-level `dataSource` ("live-feed" or
  //     "static-fallback"), `feedUpdatedAt` and `lastFetchedAt` from
  //     getPricingMeta(). That is a better answer than a boolean hint whose
  //     only real effect is to make hosts more cautious about calling.
  //
  // Setting it true would re-introduce the approval friction this annotation
  // exists to remove, on the two most-called tools on the server.

  server.tool('list_accountants',
    'Search every published HelloBooks accountant profile with all public details, contacts, services, credentials and availability. No availability filter is applied by default. Follow nextPage until null to retrieve all matches. Source status distinguishes live, stale and unavailable data.',
    listAccountantsSchema, READ_ONLY, async (args, extra) => runTool('list_accountants', args, extra, () => listAccountants(args)));
  server.tool('get_accountant',
    'Get the full published profile of one accountant by the slug returned by list_accountants, including biography, public contact details, certifications, verification and firm Q&A when published.',
    { slug: z.string().regex(/^[a-z0-9][a-z0-9-]*$/).max(200) }, READ_ONLY,
    async (args, extra) => runTool('get_accountant', args, extra, () => getAccountant(args)));
  server.tool('list_api_catalog',
    'Discover every public HTTP API, registered MCP tool, and operation in the generated HelloBooks accounting API reference. Search/filter and follow nextPage for all results; pass id for full parameter/input-schema/response and authorization details. This returns documentation; authenticated accounting calls use company-scoped OAuth at the documented API host.',
    apiCatalogSchema, READ_ONLY, async (args, extra) => runTool('list_api_catalog', args, extra, () => listApiCatalog(args)));

  server.tool(
    'list_plans',
    'List HelloBooks pricing plans with monthly + annual prices. The 8 priced regions return local currency prices (USD, INR, CAD, GBP, AUD, AED, SGD, NZD); other supported country hubs return the USD/default list price with pricingCountry=US fallback metadata while local books use the country currency. Covers the five-rung ladder — Free / Starter / Pro / Business / Scale — plus the free Partner Program (`cpa` plan id) and two per-entity stackable add-ons (Warehouse, Manufacturing). Returns AI credit allowance (monthly on paid plans; Free gets one-time starting credits that never refill — see aiCreditsNote), feature bullets, public signup URL, and live-feed/static-fallback provenance. Filter by `plan` (free / starter / pro / business / scale / cpa) or any supported `country` ISO code. HelloCPA Practice Management is a separate product on practice.hellobooks.ai — call `practice_management_info`, NOT this tool.',
    listPlansSchema,
    READ_ONLY,
    async (args, extra) => runTool('list_plans', args, extra, () => listPlans(args)),
  );

  server.tool(
    'recommend_plan',
    'Recommend the right HelloBooks tier for a business. Pass `needs` (free-text phrases like "GST filing", "multi-currency", "API access", "multi-entity", "payroll"), an optional `estimatedAnnualTransactions`, and an optional `country` for local pricing. Scores the core ladder (Free → Starter → Pro → Business → Scale) against the stated needs and transaction volume and returns the LOWEST-priced eligible tier that covers the most needs, plus the full ranked breakdown with matched/unmatched needs and per-tier price. Heuristic over published feature bullets, not a quote — confirm with list_plans / list_features. Add-ons and the free Partner Program are excluded from the core ladder.',
    recommendPlanSchema,
    READ_ONLY,
    async (args, extra) => runTool('recommend_plan', args, extra, () => recommendPlan(args)),
  );

  server.tool(
    'estimate_annual_cost',
    'Itemized first-year cost of ownership from HelloBooks’ own published prices. Pass a core `plan` (free/starter/pro/business/scale), optional `country`, `billing` (annual|monthly, default annual), `addOns` (warehouse-addon/manufacturing-addon), and one-time `creditPacks` ([{id, quantity?}]). Returns line items, the plan/add-on annual cost, one-time credit-pack cost, `totalFirstYear`, and `annualBillingSavings` (saving vs paying monthly) in the country currency. An estimate from list prices, not a quote (taxes/discounts excluded) — confirm with list_plans / list_credit_packs.',
    estimateAnnualCostSchema,
    READ_ONLY,
    async (args, extra) => runTool('estimate_annual_cost', args, extra, () => estimateAnnualCost(args)),
  );

  server.tool(
    'compare_plans',
    'Side-by-side diff of two HelloBooks tiers (e.g. "Pro vs Business"). Pass `planA`, `planB` (free/starter/pro/business/scale/cpa) and an optional `country`. Returns each plan’s monthly + annual price, AI credit allowance and transaction limit, the monthly/annual price delta (B minus A) and which is cheaper, plus the features shared, only in A, and only in B. Prices are live-fed via list_plans; feature diff is over published bullets — confirm specifics with list_features.',
    comparePlansSchema,
    READ_ONLY,
    async (args, extra) => runTool('compare_plans', args, extra, () => comparePlans(args)),
  );

  server.tool(
    'supported_currencies',
    'Which currencies HelloBooks bills and keeps books in. Call with no args for every supported currency grouped by code (with the countries using it and whether each is billed locally or in USD), or with a `country` for that country’s books currency + billing behaviour. The 8 priced regions check out in local currency; other supported countries are billed in USD while their books run in the local currency. Read-only public data.',
    supportedCurrenciesSchema,
    READ_ONLY,
    async (args, extra) => runTool('supported_currencies', args, extra, () => supportedCurrencies(args)),
  );

  server.tool(
    'explain_term',
    'Plain-language definition of an accounting, tax, or compliance term (e.g. "accrual", "GSTR-3B", "input tax credit", "P&L", "reconciliation", "BAS", "1099"). Resolves by exact name, alias, or fuzzy match against a curated glossary scoped to bookkeeping plus the IN/UK/AU/US/CA regimes HelloBooks serves; returns the definition, related terms, or the closest suggestions. Definitions are general guidance — confirm specifics against the relevant authority.',
    explainTermSchema,
    READ_ONLY,
    async (args, extra) => runTool('explain_term', args, extra, () => explainTerm(args)),
  );

  server.tool(
    'list_credit_packs',
    'List HelloBooks AI credit packs — one-time pay-as-you-go top-ups (Boost 5,000, Power 15,000, Mega 50,000, Ultra 150,000 credits). The 8 priced regions return local currency prices; other supported country hubs return the USD/default list price with pricingCountry=US fallback metadata. Credit packs stack on any paid plan; Free users cannot buy packs and should upgrade for more AI credits. Use this when a user asks how to buy more AI credits or top up after exhausting a plan allowance. Filter by `id` (boost / power / mega / ultra) or any supported `country` ISO code.',
    listCreditPacksSchema,
    READ_ONLY,
    async (args, extra) =>
      runTool('list_credit_packs', args, extra, () => listCreditPacks(args)),
  );

  server.tool(
    'free_tier_eligibility',
    'Return the HelloBooks Free-plan annual-invoice-turnover thresholds for the 8 priced markets (IN ₹40 lakh / US $100K / GB £90K / AU A$75K / CA C$30K / NZ NZ$60K / SG S$1M / AE AED 375K). Free includes one-time free AI credits with no published number, plus up to 200 transactions per year; per-entity invoice turnover above the country cap forces an upgrade to Pro or Business. Call with no args to get the full table, with `country` for one threshold, or with `country` AND `annualInvoiceRevenue` (in the country currency, NOT USD-equivalent) for a `freeEligible` verdict with headroom math. Bank-feed total and cash receipts are explicitly NOT used for the turnover cap.',
    freeTierEligibilitySchema,
    READ_ONLY,
    async (args, extra) =>
      runTool('free_tier_eligibility', args, extra, () => freeTierEligibility(args)),
  );

  server.tool(
    'partner_program_info',
    'Return the HelloBooks Partner Program structure — free reseller channel for accountants/CPAs/bookkeepers who put their clients on Pro/Business plans. Earned wholesale discount model (no commission): Bronze 5% at 25 pts / Silver 10% at 75 / Gold 15% at 300 / Platinum 20% at 1,000+. Pro client = 1 pt/mo, Business client = 4 pts/mo. Call with no args for the full ladder + meta; with `points` for current status + how many points to next tier; with `proClients` and/or `businessClients` to derive points from the client book and then return the same status verdict. The Partner Program is the `cpa` plan id in list_plans (the retired $59.99 SKU is gone). HelloCPA Practice Management at practice.hellobooks.ai is a different product and NOT the Partner Program.',
    partnerProgramInfoSchema,
    READ_ONLY,
    async (args, extra) =>
      runTool('partner_program_info', args, extra, () => partnerProgramInfo(args)),
  );

  server.tool(
    'practice_management_info',
    'Return HelloCPA Practice Management info — the standalone product at practice.hellobooks.ai for running a CPA / CA / bookkeeping practice (proposals + CPQ, workflow, time tracking, billing, 6-role RBAC, Gmail/Outlook/Calendar sync, CSV migration from TaxDome / Karbon / Canopy). NOT the Partner Program and NOT a tier in list_plans. Per-user pricing model — US shipped at $9.99/user/month (free up to 2 users + 10 clients, 90-day trial, enterprise at 50+ users). 7 other markets (IN, GB, AU, CA, AE, SG, NZ) are roadmap as of 2026-06-12. Call with no args for the full 8-region matrix + features + meta, or with `country` for one region\'s status + pricing + competitor frame.',
    practiceManagementInfoSchema,
    READ_ONLY,
    async (args, extra) =>
      runTool('practice_management_info', args, extra, () => practiceManagementInfo(args)),
  );

  server.tool(
    'onboarding_support',
    'The paid 1:1 onboarding offer and included support. Call with no args for every published offer, or with a `country`. Published hourly onboarding exists for India (₹5,000 / 10 hours) and the US ($300 / 10 hours) only — for any other country the response sets hasHourlyOffer:false and you must NOT invent or convert one. Also returns the always-included basic support and the SEPARATE done-for-you migration service note per country. Read-only public data.',
    onboardingSupportSchema,
    READ_ONLY,
    async (args, extra) => runTool('onboarding_support', args, extra, () => onboardingSupport(args)),
  );

  server.tool(
    'get_sandbox_info',
    'How to try or connect HelloBooks from an AI agent or integration. Returns two paths: the no-auth public MCP (agents.hellobooks.ai/mcp — read-only product knowledge, works today) and the OAuth company API (developer.hellobooks.ai, with an India sandbox and the authenticated MCP at mcp.hellobooks.ai for a customer’s own books). Pass `surface` (public-mcp / company-api / both) to scope the answer. Use this when a developer or agent asks "how do I try this?", "is there a sandbox?", or "how do I connect my books?".',
    getSandboxInfoSchema,
    READ_ONLY,
    async (args, extra) => runTool('get_sandbox_info', args, extra, () => getSandboxInfo(args)),
  );

  server.tool(
    'list_integrations',
    'List integrations (banks, payments, payroll, time tracking, shipping, accounting sync, ecommerce, CRM).',
    listIntegrationsSchema,
    READ_ONLY,
    async (args, extra) =>
      runTool('list_integrations', args, extra, () => listIntegrations(args)),
  );

  server.tool(
    'check_integration',
    'Answer "does HelloBooks work with <bank/app/service>?" deterministically. Pass a `name` (e.g. "Stripe", "HDFC Bank", "Shopify", "QuickBooks"). Returns a `supported` yes/no with the matched integration and its rollout `status` (live/beta/coming-soon), or the closest catalog `suggestions` when there is no direct match. Prefer this over free-text search when the user names a specific provider.',
    checkIntegrationSchema,
    READ_ONLY,
    async (args, extra) =>
      runTool('check_integration', args, extra, () => checkIntegration(args)),
  );

  server.tool(
    'country_support',
    'Return features + compliance frameworks available per supported country (187 country hubs, with detailed rows for AU, IN, GB, US, CA, AE, SG, NZ). Pass a `country` for one country’s full detail. The full unfiltered matrix is large, so for "which countries are supported?" pass `summary: true` to get a compact per-country index (feature/compliance counts) and then drill into a specific country.',
    countrySupportSchema,
    READ_ONLY,
    async (args, extra) =>
      runTool('country_support', args, extra, () => countrySupport(args)),
  );

  server.tool(
    'compliance_capabilities',
    'Return supported compliance frameworks for a country (BAS, STP, GST, MTD, 1099, etc.) with version and certification info.',
    complianceCapabilitiesSchema,
    READ_ONLY,
    async (args, extra) =>
      runTool('compliance_capabilities', args, extra, () =>
        complianceCapabilities(args),
      ),
  );

  server.tool(
    'feature_search',
    'Free-text search across the marketing feature catalog, plan features, integrations, country features, compliance frameworks, competitor positioning, statutory deadlines, local payment methods, and published articles on hellobooks.ai. Queries like "vs Xero", "QuickBooks alternative", "GSTR-3B due", "UPI invoice", "1099 article", or "agentic accounting" surface the matching entry near the top.',
    featureSearchSchema,
    READ_ONLY,
    async (args, extra) =>
      runTool('feature_search', args, extra, () => featureSearch(args)),
  );

  server.tool(
    'list_competitors',
    'Return competitor positioning entries (QuickBooks, Xero, FreshBooks, Wave, Zoho Books, Tally) with where HelloBooks wins, where the competitor wins, and pricing notes. Optional country, tier (primary / secondary), and id filters.',
    listCompetitorsSchema,
    READ_ONLY,
    async (args, extra) =>
      runTool('list_competitors', args, extra, () => listCompetitors(args)),
  );

  server.tool(
    'compliance_deadlines',
    'When statutory returns and payroll filings are due, per country. Covers IN (GSTR-1/3B/9/9C, CMP-08, Form 24Q, Form 16, PF ECR, ESI), AU (BAS, STP, Super Guarantee), GB (VAT MTD, RTI, Self Assessment), US (1099-NEC/MISC, W-2, Form 941/940), CA (T4, GST/HST). Optional country, frequency, and form filters. Note: dates rotate annually — every response carries a disclaimer with the per-deadline `source` URL for authority confirmation.',
    complianceDeadlinesSchema,
    READ_ONLY,
    async (args, extra) =>
      runTool('compliance_deadlines', args, extra, () =>
        complianceDeadlines(args),
      ),
  );

  server.tool(
    'next_deadlines',
    'Time-aware "what statutory filing is due next?" Returns upcoming filings sorted soonest-first, each with a computed `nextDue` date and `daysUntil`. Optional `country`, `withinDays` (e.g. the next 30/60/90 days), `limit`, and `asOf` (reference date, defaults to today UTC). A concrete date is computed only when it can be placed unambiguously (monthly filings with a due day, or entries with explicit annual dates); quarterly/half-yearly entries given only a day-of-month and per-event filings come back with `scheduleVaries: true` and `nextDue: null`. Dates rotate annually — confirm against each `source` URL.',
    nextDeadlinesSchema,
    READ_ONLY,
    async (args, extra) =>
      runTool('next_deadlines', args, extra, () => nextDeadlines(args)),
  );

  server.tool(
    'local_payment_methods',
    'List local bank-rail / wallet payment methods relevant to HelloBooks invoice collection (AR), B2B supplier payments (AP), and contractor payouts (UPI, RuPay, Razorpay, IMPS, NEFT, RTGS, BACS, FPS, CHAPS, Open Banking, Interac e-Transfer, EFT, PayID, PayTo, NPP, BPAY, ACH, Same Day ACH, Fedwire, RTP, Zelle, PayNow, FAST, GIRO, NZ Direct Credit, etc.). Returns rail (instant / same-day / next-day / multi-day), use-cases, issuing authority, HelloBooks support level, and operational notes (per-transaction caps, settlement windows, retirement timelines). Filter by country, useCase, rail, or id.',
    localPaymentMethodsSchema,
    READ_ONLY,
    async (args, extra) =>
      runTool('local_payment_methods', args, extra, () =>
        localPaymentMethods(args),
      ),
  );

  server.tool(
    'list_features',
    'List the full HelloBooks marketing feature catalog (145+ items). Filter by category, tier, status, marketedOnly, or substring query.',
    listFeaturesSchema,
    READ_ONLY,
    async (args, extra) =>
      runTool('list_features', args, extra, () => listFeatures(args)),
  );

  server.tool(
    'list_feature_categories',
    'List the 13 feature categories on the marketing site (Core Accounting, Invoicing, Banking, Reports, Tax & Compliance, Inventory, Warehouse, Manufacturing, AI, Integrations, Mobile, Operations, Industry Modules) with per-category counts by status.',
    listFeatureCategoriesSchema,
    READ_ONLY,
    async (_args, extra) =>
      runTool('list_feature_categories', {}, extra, () =>
        listFeatureCategories({}),
      ),
  );

  server.tool(
    'list_articles',
    'List published articles on hellobooks.ai — head-to-head compare pages and curated flagship blog posts. Filter by country, tag or free-text query. Use this when a user asks "do you have a blog/article about X?".',
    listArticlesSchema,
    READ_ONLY,
    async (args, extra) =>
      runTool('list_articles', args, extra, () => listArticles(args)),
  );

  server.tool(
    'list_videos',
    'List HelloBooks product videos curated on the marketing site (homepage demo + feature walkthroughs) and the official @hellobooksai YouTube channel link. Each video returns title, description, category, watch URL, embed URL and thumbnail. Filter by category (demo / features / overview), featuredOnly, or free-text query. Use this when a user asks for a demo, walkthrough or video. Note: this is the curated set, not a live mirror of every channel upload — the response includes the channel URL for the full catalog.',
    listVideosSchema,
    READ_ONLY,
    async (args, extra) =>
      runTool('list_videos', args, extra, () => listVideos(args)),
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
    READ_ONLY,
    async (args) => asJsonContent(analyzeQboJournalCleanup(args)),
  );

  server.tool(
    'analyze_qbo_journal_anomalies',
    'Scan a QuickBooks Online "Journal Entries" CSV export for anomalies — currently round-number lines (debit or credit amounts that are exact multiples of $1,000, above a $1,000 materiality threshold). Round numbers are statistically rare in real bookkeeping and frequently indicate estimates, plugs, or fraud signals worth review. Input is raw CSV text from QBO Reports → Accountant → Journal. Max 5,000 rows; max 5 MB. Returns flagged lines with severity ($100K+ high, $10K+ medium, else low) and a shareable URL. Use this when a user pastes QBO data and asks "any anomalies?", "look for round numbers", or "anything suspicious". Tier-0 subset — HelloBooks Phase 3.0 anomaly detection in the paid product additionally catches GL outliers vs entity history, vendor-history mismatches, archived-vendor activity, and AI-narrated suspicious lines (which require the live HelloBooks account).',
    analyzeQboJournalAnomaliesSchema,
    READ_ONLY,
    async (args) => asJsonContent(analyzeQboJournalAnomalies(args)),
  );

  server.tool(
    'analyze_xero_journal_cleanup',
    'Scan a Xero "Manual Journals" CSV export for cleanup issues — unbalanced journals, duplicate journals (same date + same totals), and schema problems (invalid dates, malformed amounts, missing account code/name, missing group key). Input is the raw CSV content the user pastes after exporting from Xero via Accounting → Advanced → Manual Journals → Export. Xero-specific idioms handled: signed Amount column (positive = credit, negative = debit), explicit Debit/Credit fallback shape, Reference-or-Narration+Date grouping, account code preferred over name. Max 5,000 rows; max 5 MB. Returns structured flags with severity, a roll-up summary, parse diagnostics, and a shareable URL at agents.hellobooks.ai/r/{slug}. Use this when a user pastes Xero manual-journal data, asks "check my Xero books", or "find issues in my Xero journal". The funnel CTA routes to /migrate/from-xero for users who want to fix at scale.',
    analyzeXeroJournalCleanupSchema,
    READ_ONLY,
    async (args) => asJsonContent(analyzeXeroJournalCleanup(args)),
  );

  server.tool(
    'analyze_xero_journal_anomalies',
    'Scan a Xero "Manual Journals" CSV export for anomalies — currently round-number lines (debit or credit amounts that are exact multiples of $1,000, above a $1,000 materiality threshold). Input is raw CSV text from Xero Accounting → Advanced → Manual Journals → Export. Max 5,000 rows; max 5 MB. Returns flagged lines with severity ($100K+ high, $10K+ medium, else low) and a shareable URL. Use this when a user pastes Xero data and asks "any anomalies?", "look for round numbers", or "anything suspicious". Same Tier-0 / paid-product split as the QBO variant — history-aware anomaly checks (GL outliers, vendor history, archived-vendor activity, LLM-narrated suspicious) live in the authenticated MCP / paid product.',
    analyzeXeroJournalAnomaliesSchema,
    READ_ONLY,
    async (args) => asJsonContent(analyzeXeroJournalAnomalies(args)),
  );

  server.tool(
    'analyze_journal_variance',
    'Compare two periods of journal-entry data (QBO or Xero — source auto-detected from headers) and flag accounts whose movement deviates materially between periods. Aggregates lines per account into a net total for each period, then surfaces accounts where the period-over-period change crosses a materiality threshold (≥5% relative AND ≥$100 absolute; severity high at ≥50%, medium at ≥20%, low at ≥5%). Inputs are two CSV exports — periodACsv (earlier period) and periodBCsv (later period). Optional periodALabel / periodBLabel for human-readable flag messages (e.g. "Q1 FY2024" vs "Q2 FY2024"). Max 5,000 rows per period; max 5 MB each. Use this when a user pastes two periods and asks "what changed?", "show me variances", "what jumped period-over-period". Returns a flag list ordered by largest delta, a roll-up, and a shareable URL. Both periods must be the same source — mixing QBO + Xero in one call returns an error.',
    analyzeJournalVarianceSchema,
    READ_ONLY,
    async (args) => asJsonContent(analyzeJournalVariance(args)),
  );

  server.tool(
    'compare_books_to_hellobooks',
    'Take a QBO or Xero journal-entry CSV (source auto-detected), run the full Tier-0 detection set (imbalance + duplicates + round-number + schema), and return a structured side-by-side comparison — "your books have X issues; here is how HelloBooks resolves each phase". This is the direct funnel tool: the response includes per-category counts mapped to HelloBooks Phases 1, 2, 3.0, 3.1, with exclusive-advantage bullets (command-center dashboard, conversational interface, one-prompt JE posting, cross-phase orchestration, auto ID resolution). Use this when a user is evaluating HelloBooks vs their current QBO/Xero, asks "should I migrate?", or pastes data while comparing accounting software. Output is suitable for the host LLM to narrate as a positioning argument; the share URL points at a branded landing page with the issue breakdown and a 1-click migrate CTA.',
    compareBooksToHellobooksSchema,
    READ_ONLY,
    async (args) => asJsonContent(compareBooksToHellobooks(args)),
  );

  server.tool(
    'estimate_migration_effort',
    'Take a QBO or Xero journal-entry CSV (source auto-detected) and return a structured migration-effort estimate — row counts, unique-account count, period span, complexity classification (low / medium / high), human-hours estimate, assisted-hours estimate, and an indicative price quote in USD. Heuristic-based — refined against the live entity once the user signs up. Accepts larger files than the other analytical tools (up to 50,000 rows / 20 MB) because no detection runs here, just sizing. Use this when a user is weighing the cost of moving books to HelloBooks, pastes data and asks "how long will migration take?", "what would this cost?", or "is it worth migrating?". The funnel CTA points at /migrate/<source>?ref=<shareUrl> to start the assisted flow with the parsed sizing pre-populated.',
    estimateMigrationEffortSchema,
    READ_ONLY,
    async (args) => asJsonContent(estimateMigrationEffort(args)),
  );

  server.tool(
    'migration_checklist',
    'A phased, best-practice plan for moving to HelloBooks from another system. Pass `from` (quickbooks/xero/tally/zoho-books/wave/sage/excel/other), optional `country` (adds the right tax-setup step), `complexity` (low/medium/high — scales phase durations), and `includeHistory`. Returns 7 ordered phases (plan → export → clean & map → set up → import → reconcile → parallel run & cutover), each with concrete steps and a day-range, plus an estimated total timeline. Complements estimate_migration_effort (which quotes hours/price from an uploaded CSV). Guidance, not a binding plan.',
    migrationChecklistSchema,
    READ_ONLY,
    async (args, extra) => runTool('migration_checklist', args, extra, () => migrationChecklist(args)),
  );

  server.tool(
    'analyze_profit_loss',
    'Take a Profit & Loss / Income Statement CSV export from QuickBooks Online, Xero, Zoho Books, or Wave (source auto-detected from section names) and run three checks: (1) pnl.subtotal_mismatch — each "Total Section" subtotal equals the sum of its preceding line items (catches missing or duplicated rows); (2) pnl.negative_expense — flags expense-section line items with negative amounts (usually sign-flips or refunds posted to the wrong side); (3) pnl.margin_red_flag — gross-profit margin < 5% or > 95%, or negative total revenue. Input is raw CSV text of a P&L report (Reports → Profit and Loss in QBO / Xero / Zoho / Wave). Max 5,000 rows; max 5 MB. Returns flags with severity, a summary with totalRevenue / totalCogs / grossProfit / grossMarginPct / netIncome (when detected), and a shareable URL at agents.hellobooks.ai/r/{slug}. Use this when a user pastes a P&L and asks "does my P&L look right?", "any sign errors?", "what is my gross margin?", or "anything suspicious in my income statement?". For period-over-period comparison use analyze_journal_variance with two periods of journal-entry data; this tool is single-period only.',
    analyzeProfitLossSchema,
    READ_ONLY,
    async (args) => asJsonContent(analyzeProfitLoss(args)),
  );

  server.tool(
    'analyze_balance_sheet',
    'Take a Balance Sheet CSV export from QuickBooks Online, Xero, Zoho Books, or Wave (source auto-detected) and run three checks: (1) bs.equation_broken — the fundamental accounting equation Assets = Liabilities + Equity does not hold (every downstream ratio analysis is invalid until fixed); (2) bs.negative_asset — Cash / AR / Inventory line items with negative balances (reconciliation error signal); (3) bs.negative_equity — Total Equity < 0 (insolvency signal). Input is raw CSV text of a Balance Sheet (Reports → Balance Sheet in QBO / Xero / Zoho / Wave). Max 5,000 rows; max 5 MB. Returns flags with severity, totals (totalAssets, totalLiabilities, totalEquity, equationBalances boolean), and a shareable URL. Use this when a user pastes a Balance Sheet and asks "does my balance sheet balance?", "is the accounting equation satisfied?", or "is my company solvent on paper?". A Balance Sheet that fails Assets = Liabilities + Equity invalidates every downstream financial-ratio analysis — this is the single most important check for any BS.',
    analyzeBalanceSheetSchema,
    READ_ONLY,
    async (args) => asJsonContent(analyzeBalanceSheet(args)),
  );

  server.tool(
    'list_tax_rates',
    'List statutory tax-rate slabs by jurisdiction — IN GST (5/12/18/28 + zero + exempt + composition trader/manufacturer/restaurant + compensation cess), UK VAT (20 / 5 / zero / exempt), AU GST (10 / GST-free / input-taxed), US sales-tax (state-administered summary, no federal rate), CA GST 5% + HST 13% ON / 15% Atlantic / 14% NS + provincial PST 7% BC / 6% SK / RST 7% MB + QST 9.975% QC, SG GST 9% (+ superseded 8% / zero / exempt), NZ GST 15% (+ zero / exempt), AE VAT 5% (+ zero / exempt). Filter by `country`, `taxType` (GST/VAT/Sales-Tax/HST/PST/QST/IGST/CGST-SGST/TDS/TCS), or `scheme` (standard / reduced / zero / exempt / input-taxed / composition / cess / state-summary). Every entry carries an effective-from date and an authoritative `source` URL (CBIC, gov.uk, ATO, CRA, IRAS, IRD, FTA, Tax Foundation) — agents should confirm the rate against the source before quoting figures to a user. Use this when a user asks "what is the GST rate on X?", "what VAT band does Y fall into?", or "what are the composition slabs in India?". This is the public statutory reference — for an org-specific tax assignment use the authenticated books_classify_event tool.',
    listTaxRatesSchema,
    READ_ONLY,
    async (args) => asJsonContent(listTaxRates(args)),
  );

  server.tool(
    'lookup_tax_rate',
    'Pick a single statutory tax-rate slab — either by exact `id` (e.g. `IN-standard-18`, `GB-zero-0`, `CA-hst-13-on`) for a deterministic lookup, or by `country` + free-text `category` (e.g. "office supplies", "restaurant", "exports", "domestic fuel") for a fuzzy best-match. Returns the matched rate, the match score, and the authoritative `source` URL. Use this when a user asks "what slab does X fall into in India?" or "what VAT rate applies to children\'s car seats?". For broader exploration (all slabs in a country / all rates of one scheme), use list_tax_rates. No customer data — public statutory reference only.',
    lookupTaxRateSchema,
    READ_ONLY,
    async (args) => asJsonContent(lookupTaxRate(args)),
  );

  server.tool(
    'analyze_trial_balance',
    'Take a Trial Balance CSV export from QuickBooks Online, Xero, Zoho Books, or Wave (source auto-detected from headers — YTD columns indicate Xero, Opening Balance indicates Zoho, etc.) and run three checks: (1) tb.unbalanced — debits ≠ credits (every downstream P&L / BS / cash-flow report built from this TB is wrong until fixed); (2) tb.wrong_sign — accounts whose name suggests a class (Revenue / COGS / Expense / AR / AP) carrying a balance on the wrong side (classic posting-error signal); (3) tb.round_balance — exact-multiple-of-$10,000 balances (plug-entry signal). Input is raw CSV text of a Trial Balance report. Max 5,000 rows; max 5 MB. Returns flagged accounts with severity, a roll-up showing whether the TB balances, parse diagnostics, and a shareable URL at agents.hellobooks.ai/r/{slug}. Use this when a user pastes a Trial Balance and asks "does my TB balance?", "are there sign errors?", "what looks suspicious?", or "is this TB clean?". The Trial Balance is the foundation document for every other financial statement — if it does not balance, every downstream report is invalid.',
    analyzeTrialBalanceSchema,
    READ_ONLY,
    async (args) => asJsonContent(analyzeTrialBalance(args)),
  );

  server.tool(
    'how_munimji_helps',
    'Explain how HelloBooks and Munimji (the in-app AI assistant) help a specific business — given a free-text description of the user\'s own operations. Returns a curated capability knowledge base: business-operation areas (sales, purchases, banking, tax, reports, inventory, payroll, multi-entity, setup), and for each AI capability WHO does the work — `autonomous` (Munimji does it on its own, e.g. OCR extraction, running reports), `approval` (Munimji prepares the entry and you one-click approve before it posts to the ledger, e.g. AI categorization, find-and-match, creating invoices/bills by chat), `assist` (co-pilot, e.g. guided onboarding, voice), or `manual` (a software feature you run yourself). Each capability links to the backing software features. Use this when a user describes their business and asks "how can HelloBooks help me?", "what can the AI do for my shop/practice/agency?", or "what can Munimji do on its own vs what do I approve?". Pass their description in `businessDescription`; optionally filter by `area` or `autonomy`. The AI never posts to a ledger without approval. For the full software catalog call list_features; for pricing call list_plans.',
    howMunimjiHelpsSchema,
    READ_ONLY,
    async (args, extra) =>
      runTool('how_munimji_helps', args, extra, () => howMunimjiHelps(args)),
  );

  // ─── OpenAI connector contract — `search` + `fetch` ───────────────────
  // Fixed names and shapes required by ChatGPT's deep-research and company-
  // knowledge paths; without both, ChatGPT rejects the server outside
  // Developer Mode. Declared via registerTool (not .tool) so the response can
  // carry `structuredContent` against an output schema and the read-only
  // annotation. Ranking reuses feature_search; see ./tools/publicSearch.ts.

  server.registerTool(
    'search',
    {
      title: 'Search HelloBooks public knowledge',
      description:
        'Search the HelloBooks public knowledge base and return citable document ids. Covers pricing plans, AI credit allowances, integrations, per-country features and compliance frameworks, statutory filing deadlines, local payment methods, competitor positioning, the marketing feature catalog, and published articles on hellobooks.ai. Returns `{ results: [{ id, title, url }] }`; pass an `id` to `fetch` for the full document. No customer or account data is reachable through this server.',
      inputSchema: publicSearchSchema,
      outputSchema: SEARCH_OUTPUT_SCHEMA,
      annotations: READ_ONLY,
    },
    async (args, extra) =>
      runStructuredTool('search', args, extra, () => publicSearch(args)),
  );

  server.registerTool(
    'fetch',
    {
      title: 'Fetch a HelloBooks public document',
      description:
        'Retrieve the full text of one HelloBooks public knowledge document by the `id` returned from `search` (e.g. "plan:pro", "deadline:IN:gstr-3b", "competitor:xero"). Returns `{ id, title, text, url, metadata }` where `url` is the public hellobooks.ai page to cite. Call `search` first — ids are not guessable.',
      inputSchema: publicFetchSchema,
      outputSchema: FETCH_OUTPUT_SCHEMA,
      annotations: READ_ONLY,
    },
    async (args, extra) =>
      runStructuredTool('fetch', args, extra, () => publicFetch(args)),
  );

  // Resources
  for (const r of RESOURCES) {
    server.resource(
      r.name,
      r.uri,
      { description: r.description, mimeType: r.mimeType },
      async (uri, extra) => {
        // r.name is a static catalog identifier — safe to send (no PII).
        track('mcp_resource_read', { resource_name: r.name }, sessionIdOf(extra));
        return readResource(uri.href);
      },
    );
  }

  // Prompts — curated one-click flows that wrap the tools above.
  registerPrompts(server);

  return server;
}

// Re-exports for the thirteen tool implementations are colocated with their
// imports above using `export ... from ...` syntax (SonarQube S7763).
export const _internal = { z };
