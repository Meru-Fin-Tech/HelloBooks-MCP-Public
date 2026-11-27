/**
 * Plan catalog — mirrored from the marketing-site source-of-truth at
 *   Web-Fire-hellobooks.ai/src/lib/pricingConfig.ts
 *
 * Public-only data: tier names, prices, currencies, feature bullets shown on
 * the public /pricing page. Never includes customer usage, billing, account ID.
 *
 * Federation note: once the marketing site exposes /api/public/pricing,
 * switch this module to fetch + cache from that endpoint and drop the static copy.
 */

export type CountryCode = 'IN' | 'US' | 'CA' | 'GB' | 'AU' | 'AE' | 'SG' | 'NZ';
export type CurrencyCode = 'INR' | 'USD' | 'CAD' | 'GBP' | 'AUD' | 'AED' | 'SGD' | 'NZD';
export type PlanType =
  | 'free' | 'starter' | 'pro' | 'business' | 'scale' | 'cpa'
  | 'warehouse-addon' | 'manufacturing-addon';

export interface PlanPrice {
  /**
   * ISO country code for the quoted request. Normally one of the 8 priced
   * regions. For supported countries without local pricing, tools may clone the
   * USD/default price under the requested country and set `pricingCountry`.
   */
  country: string;
  currency: CurrencyCode | string;
  symbol: string;
  monthly: number;
  annual: number;
  anchorMonthly: number; // 0 = no strikethrough price
  pricingCountry?: CountryCode;
  billingNote?: string;
  /**
   * Vestigial. Previously carried the per-client price for the retired
   * "$59.99/mo + $4.99/client" CPA SKU. Web-Fire #514 (2026-06-12)
   * converted the `cpa` id to the free Partner Program with no per-client
   * fee; the field is kept optional so older callers stay valid but is
   * no longer populated.
   */
  perClient?: number;
}

export interface Plan {
  plan: PlanType;
  name: string;
  tagline: string;
  // Monthly allowance for PAID plans (-1 = unlimited). Free's credits are a
  // one-time starting allowance that never refills (decision 2026-09-30), so
  // Free is null, which publishes no number (HelloBooks
  // decision 2026-09-28: "free AI credits included"; upgrade for more — 2026-09-29: packs are paid-plan only).
  monthlyAiCredits: number | null;
  /** Human wording for plans whose AI allowance has no published number. */
  aiCreditsNote?: string;
  /** Annual ledger transaction cap; absent means this catalog does not publish a cap. */
  /** Lifetime ledger transaction cap (Free plan: 200 in total, never resets). */
  lifetimeTransactionLimit?: number;
  /** Annual ledger transaction cap. No current plan publishes one (Starter is unlimited since 2026-11-27); kept optional for older feeds. */
  annualTransactionLimit?: number;
  features: string[];
  /**
   * Region-specific feature bullets from the live feed, keyed by priced
   * country. India's Free card leads with GST filing and its Pro card carries
   * GSTR-9 / e-invoicing / Tally; `features` is the region-neutral list.
   * Absent on the baked catalog.
   */
  featuresByCountry?: Partial<Record<CountryCode, string[]>>;
  prices: PlanPrice[];
  publicSignupUrl: string;
}

export const FREE_AI_CREDITS_NOTE =
  "Free AI credits included to get started; Free is capped at up to 200 transactions in total (the count doesn't reset each year). Upgrade to Pro or Business for more transaction volume and more AI.";

export const FREE_TRANSACTION_LIMIT = 200;
/** @deprecated Kept for back-compat; Free is a lifetime total, not annual. Use FREE_TRANSACTION_LIMIT. */
export const FREE_ANNUAL_TRANSACTION_LIMIT = FREE_TRANSACTION_LIMIT;

const FREE_FEATURES = [
  '2 users · 1 live bank feed',
  'Up to 200 transactions',
  'Free AI credits to get started',
  'Invoices, bills & quotes included',
  'Unlimited email payment reminders',
  '10 WhatsApp sends (one-time allowance)',
  'AP/AR aging · P&L · Balance Sheet · Cash Flow',
  'Full mobile app (iOS & Android)',
  '"Powered by HelloBooks" badge on invoices',
];

// Starter — the rung between Free and Pro (Web-Fire five-rung ladder, founder
// decision 2026-09-02). Limits are the live ledger's (Users 5, BankConnections
// 3, Entities 1); it does NOT carry multi-currency, multi-entity or API access,
// all of which stay Pro/Business.
// Updated 2026-11-27 from Web-Fire pricingConfig.ts: Starter transactions are
// UNLIMITED (Auth-V3 STARTER TransactionsLifetime: null). The old "200 per
// year" line understated the plan. Only what Starter ADDS to Free is listed.
const STARTER_FEATURES = [
  'Everything in Free, plus:',
  'Unlimited transactions',
  'Up to 5 users',
  '3 bank connections',
  'AI auto-categorization (95%+ accuracy)',
  'Recurring invoices',
  'Export to Excel',
];

// Scale — the top rung, for groups running manufacturing / warehouse depth.
const SCALE_FEATURES = [
  'Everything in Business, plus:',
  'Manufacturing: BOM, work orders, MRP & job work',
  'Warehouse depth: bins, waves, cross-dock & cycle counts',
  'Lot, batch & serial traceability with FEFO picking',
  'Multi-country statutory filing & consolidation across subscribed entities',
  'Higher API rate limits',
  'Custom development — see below',
  'Named implementation lead',
];

// Pro now builds on Starter. API access and multi-entity moved to Business, and
// GST filing / Tally are India-only bullets (see INDIA_* below) — a US card must
// not advertise GST. Mirrors Web-Fire pricingConfig.ts (2026-11-27).
const PRO_FEATURES = [
  'Everything in Starter, plus:',
  'Unlimited bank connections',
  'Unlimited users + roles',
  'AI Analysis & Comparative View on every report',
  'Recurring invoices, bills & approvals',
  'Multi-currency with auto FX',
  'Remove "Powered by" badge',
  'Priority email support',
];

const BUSINESS_FEATURES = [
  'Everything in Pro, plus:',
  'Advanced inventory: lot/batch + multi-warehouse allocations',
  'Cohort, retention & CFO analytics',
  'Audit log + advanced role-based access',
  'Sandbox environment',
  'Multi-entity management across subscribed entities',
  'API access',
  'Dedicated success manager',
];

// Regions without a live bank-feed provider (Auth-V3 bankFeedProvider: only
// US, GB, CA + the Plaid EU set have feeds). They run on bank statement import.
const FREE_USERS_FEED_LINE = '2 users · 1 live bank feed';
const BANK_FEED_LINE = /bank (feed|connection)/i;
const FEED_REGIONS: ReadonlySet<string> = new Set(['US', 'CA', 'GB']);
function withoutFeedClaims(country: string, features: string[]): string[] {
  if (FEED_REGIONS.has(country)) return features;
  return features
    .map((f) => (f === FREE_USERS_FEED_LINE ? '2 users · bank statement import with AI matching' : f))
    .filter((f) => !BANK_FEED_LINE.test(f));
}

// India's Free card leads with GST filing; Tally is included on Free.
const INDIA_FREE_FEATURES = [
  'Unlimited GST filing — GSTR-1 & GSTR-3B',
  'GSTR-2B reconciliation with ITC tracking',
  '2 users · 1 GSTIN',
  'Up to 200 transactions',
  'Free AI credits to get started',
  'Invoices, bills & quotes included',
  'Tally sync',
  'AP/AR aging · P&L · Balance Sheet · Cash Flow',
  'Full mobile app (iOS & Android)',
  'Robust email support',
  '"Powered by HelloBooks" badge on invoices',
];
// India doesn't sell Starter, so Pro points at Free and carries over Starter's adds.
const INDIA_PRO_FEATURES = [
  'Everything in Free, plus:',
  'Unlimited transactions',
  'AI auto-categorization (95%+ accuracy)',
  'Export to Excel',
  'Unlimited users + roles',
  'AI Analysis & Comparative View on every report',
  'Recurring invoices, bills & approvals',
  'GSTR-9 generated ready to file + IRN e-invoicing',
  'Every GSTIN of one legal entity',
  'Multi-currency with auto FX',
  'Remove "Powered by" badge',
  'Priority email support',
];

// Each market's own tax job, listed on Free (every paid rung inherits it).
const LOCAL_TAX_LINES: Partial<Record<CountryCode, string[]>> = {
  US: ['Multi-state sales tax with nexus alerts', '1099 contractor tracking + 1099-NEC/MISC prep'],
  GB: ['MTD-ready VAT return preparation (HMRC filing coming soon)', 'CIS deductions + CIS300 return filed to HMRC'],
  CA: ['GST/HST, PST & QST tracked per line', 'GST/HST and T4 return preparation'],
  AU: ['BAS GST return preparation with Simpler BAS codes'],
  AE: ['5% VAT with FTA-compliant tax invoices', '9% Corporate Tax computation'],
};

// US-only free services (decision 2026-10-09): free customization on every
// subscription; free onboarding support from Pro up.
const FREE_ONBOARDING_BULLET = 'Free onboarding support';
const FREE_CUSTOMIZATION_BULLET = 'Free customization — email us your requirements';

function freeFor(country: CountryCode): string[] {
  if (country === 'IN') return withoutFeedClaims('IN', INDIA_FREE_FEATURES);
  const base = withoutFeedClaims(country, FREE_FEATURES);
  return [base[0], ...(LOCAL_TAX_LINES[country] ?? []), ...base.slice(1)];
}

/** Region-specific bullets, keyed by priced country, for one plan. */
function featuresByCountryFor(
  plan: 'free' | 'starter' | 'pro' | 'business' | 'scale',
  base: string[],
): Partial<Record<CountryCode, string[]>> {
  const out: Partial<Record<CountryCode, string[]>> = {};
  for (const r of REGIONS) {
    let f: string[];
    if (plan === 'free') f = freeFor(r.country);
    else if (plan === 'pro' && r.country === 'IN') f = withoutFeedClaims('IN', INDIA_PRO_FEATURES);
    else f = withoutFeedClaims(r.country, base);
    if (r.country === 'US') {
      const onboarding = plan === 'pro' || plan === 'business' || plan === 'scale';
      f = [...f, ...(onboarding ? [FREE_ONBOARDING_BULLET] : []), FREE_CUSTOMIZATION_BULLET];
    }
    out[r.country] = f;
  }
  return out;
}

// Partner Program — `cpa` plan id (kept for federation contract; see Web-Fire
// pricingConfig.ts v3 / PR #514, 2026-06-12). Free to join. Partners resell
// standard Pro/Business plans to their clients and earn a wholesale discount
// that grows with status (Bronze 5% → Platinum 20%). Partner Points: Pro
// client = 1 pt / Business client = 4 pts per month active. The retired
// "$59.99/mo + $4.99/client + 10% commission" SKU is gone everywhere.
const CPA_FEATURES = [
  'Free to join · no upfront fee',
  'Resell standard Pro & Business plans to your clients',
  'Earn wholesale discount as you grow: Bronze 5% → Platinum 20%',
  'Partner Points: Pro client = 1 pt · Business client = 4 pts',
  'Unlimited clients, one practice dashboard',
  'HelloBooks Certified Advisor badge',
  'Free directory listing at hellobooks.ai/find-an-accountant',
  'Bulk AI operations across clients',
  'Direct line to the founder',
];

const WAREHOUSE_ADDON_FEATURES = [
  'Multi-warehouse with bins & zones',
  'Goods receipt notes + put-away rules',
  'Cross-docking',
  'Mobile warehouse + barcode scan (iOS/Android)',
  'RMA & returns management',
  'Allocation & reservation against open orders',
  '3PL integration (beta)',
];

const MANUFACTURING_ADDON_FEATURES = [
  'Multi-level Bill of Materials with versioning',
  'Work orders with WAC valuation of finished goods',
  'Shop floor tracking (operator clock-in, stations)',
  'Quality control checkpoints (receive + completion)',
  'Subcontracting with component send / FG receive',
  'By-product & co-product output tracking',
  'Production planning (beta) / MRP (planned)',
];

interface RegionConfig {
  country: CountryCode;
  currency: CurrencyCode;
  symbol: string;
  /**
   * Starter is sold in every USD-ladder market (US, CA, GB, AU, AE, SG, NZ) but not India. Scale is sold in all eight priced regions. `undefined`
   * means "not sold in this region" — Web-Fire's buildPlans() expresses the
   * same thing as `available: Boolean(cfg.starter)`. Do NOT invent a local
   * price to fill the gap; that is a pricing decision, not a data fix.
   */
  starter?: { monthly: number; annual: number };
  pro: { monthly: number; annual: number; anchor: number };
  business: { monthly: number; annual: number; anchor: number };
  /** Sold in all 8 priced regions today — see `starter` above. */
  scale?: { monthly: number; annual: number };
  /**
   * Partner Program is free to join globally; the cpa fields are zeroed but
   * retained so the federation contract (feed publishes a `cpa` tier) stays
   * intact. perClient was the retired flat-SKU per-client fee — now 0.
   */
  cpa: { monthly: number; annual: number; perClient: number };
  // One-time pay-as-you-go AI credit top-up packs (Doc 19 v3, 2026-06-12).
  packs: { boost: number; power: number; mega: number; ultra: number };
}

// Mirrored from Web-Fire-hellobooks.ai/src/lib/pricingConfig.ts.
// v3 (Web-Fire #514, 2026-06-12): Business re-introduced as 4th tier;
// CPA SKU converted to free Partner Program (the retired $59.99/mo +
// $4.99/client + 10% commission flat SKU is gone). Business sits at ~4× Pro
// to mirror Partner Points math (Pro client = 1 pt / Business client = 4 pts).
//
// v4 (Web-Fire #672, 2026-07-30): every region EXCEPT India repriced to 2× —
// the old strikethrough anchor becomes the real price — and the permanent
// anchor is removed (anchor: 0 = don't show a "was" price). Annual is now
// 10× monthly (2 months free), replacing the old ~17%-off pattern.
// US Pro $9.99 → $20, US Business $39.99 → $80.
//
// INDIA IS DELIBERATELY UNCHANGED (₹499 Pro / ₹1,999 Business, anchors intact)
// per founder decision 2026-07-29. Do not "tidy" the IN row into line with the
// others — an India reprice must be its own change.
//
// Credit packs are NOT part of the v4 reprice and are unchanged.
// v12 (Web-Fire 2026-11-23, #1370): CA, GB, AU, AE, SG and NZ moved onto the US
// five-tier ladder IN USD. Auth-V3 has no PricingByCountry override for them, so
// checkout always debited the US USD list; the old C$22.99 / £14.99 / A$30 /
// AED 65 / S$26 / NZ$32 figures were never charged. They now show (and are
// charged) exactly the US list. A local-currency list for ~236 countries exists
// on the site (#1395, localPriceLists.ts) but every `billingLive` switch is OFF,
// so it is NOT published here.
//
// v11 (2026-10-28): India's strikethrough anchors (₹999 / ₹3,999) removed — never
// charged. India prices themselves are unchanged and exclude GST. India does not
// sell Starter (a ₹199 Starter exists only in the switched-off local lists).
const US_LADDER = {
  starter:  { monthly: 14.99, annual:   149 },
  pro:      { monthly: 39.99, annual:   399,  anchor: 0 },
  business: { monthly: 79.99, annual:   799,  anchor: 0 },
  scale:    { monthly:   199, annual:  1990 },
  cpa:      { monthly:     0, annual:     0,  perClient: 0 },
  packs: { boost: 4.99, power: 12.99, mega: 29.99, ultra: 69.99 },
};

const REGIONS: RegionConfig[] = [
  { country: 'US', currency: 'USD', symbol: '$', ...US_LADDER },
  { country: 'IN', currency: 'INR', symbol: '₹',
    pro:      { monthly:   499, annual:  4999,  anchor: 0 },
    business: { monthly:  1999, annual: 19999,  anchor: 0 },
    scale:    { monthly:  4999, annual: 49999 },
    cpa:      { monthly:     0, annual:     0,  perClient: 0 },
    packs: { boost: 249, power: 699, mega: 1999, ultra: 4999 } },
  { country: 'CA', currency: 'USD', symbol: '$', ...US_LADDER },
  { country: 'GB', currency: 'USD', symbol: '$', ...US_LADDER },
  { country: 'AU', currency: 'USD', symbol: '$', ...US_LADDER },
  { country: 'AE', currency: 'USD', symbol: '$', ...US_LADDER },
  { country: 'SG', currency: 'USD', symbol: '$', ...US_LADDER },
  { country: 'NZ', currency: 'USD', symbol: '$', ...US_LADDER },
];

type RegionalPaidPlan = 'starter' | 'pro' | 'business' | 'scale' | 'cpa';

/**
 * Prices for one regional tier, across the regions that actually sell it.
 *
 * Regions with no block for `plan` (Starter and Scale outside the US) are
 * OMITTED rather than priced, so an agent asking for Starter in India gets an
 * empty price list — the honest answer — instead of a US dollar figure
 * labelled 'IN'.
 */
function pricesFor(plan: RegionalPaidPlan): PlanPrice[] {
  const out: PlanPrice[] = [];
  for (const r of REGIONS) {
    const tier = r[plan];
    if (!tier) continue; // tier not sold in this region
    out.push({
      country: r.country,
      currency: r.currency,
      symbol: r.symbol,
      monthly: tier.monthly,
      annual: tier.annual,
      anchorMonthly: 'anchor' in tier ? tier.anchor : 0,
    });
  }
  return out;
}

function freePrices(): PlanPrice[] {
  return REGIONS.map((r) => ({
    country: r.country,
    currency: r.currency,
    symbol: r.symbol,
    monthly: 0,
    annual: 0,
    anchorMonthly: 0,
  }));
}

/**
 * Add-ons are stackable per-entity SKUs priced in USD on the marketing site.
 * They are NOT replicated across the 8 regional currencies — checkout converts
 * at FX. We expose USD only to keep parity with hellobooks.ai/pricing/add-ons.
 */
function usdAddonPrice(monthly: number, annual: number): PlanPrice[] {
  return [{
    country: 'US', currency: 'USD', symbol: '$',
    monthly, annual, anchorMonthly: 0,
  }];
}

export const PLANS: Plan[] = [
  {
    plan: 'free',
    name: 'Free',
    tagline: 'Everything you need to start',
    monthlyAiCredits: null,
    aiCreditsNote: FREE_AI_CREDITS_NOTE,
    lifetimeTransactionLimit: FREE_TRANSACTION_LIMIT,
    features: FREE_FEATURES,
    featuresByCountry: featuresByCountryFor('free', FREE_FEATURES),
    prices: freePrices(),
    publicSignupUrl: 'https://hellobooks.ai/pricing',
  },
  {
    plan: 'starter',
    name: 'Starter',
    tagline: 'A first paid step — more users and bank feeds',
    monthlyAiCredits: 7500,
    features: STARTER_FEATURES,
    featuresByCountry: featuresByCountryFor('starter', STARTER_FEATURES),
    // Every USD-ladder market; omitted in India. See RegionConfig.
    prices: pricesFor('starter'),
    publicSignupUrl: 'https://hellobooks.ai/pricing',
  },
  {
    plan: 'pro',
    name: 'Pro',
    tagline: 'AI-powered automation for growing businesses',
    monthlyAiCredits: 15000,
    features: PRO_FEATURES,
    featuresByCountry: featuresByCountryFor('pro', PRO_FEATURES),
    prices: pricesFor('pro'),
    publicSignupUrl: 'https://hellobooks.ai/pricing',
  },
  {
    plan: 'business',
    name: 'Business',
    tagline: 'Heavier ops + analytics for multi-entity & inventory-led businesses',
    monthlyAiCredits: 50000,
    features: BUSINESS_FEATURES,
    featuresByCountry: featuresByCountryFor('business', BUSINESS_FEATURES),
    prices: pricesFor('business'),
    publicSignupUrl: 'https://hellobooks.ai/pricing',
  },
  {
    plan: 'scale',
    name: 'Scale',
    tagline: 'For groups that outgrow standard accounting software',
    monthlyAiCredits: 150000,
    features: SCALE_FEATURES,
    featuresByCountry: featuresByCountryFor('scale', SCALE_FEATURES),
    // All 8 priced regions. See RegionConfig.
    prices: pricesFor('scale'),
    publicSignupUrl: 'https://hellobooks.ai/pricing',
  },
  {
    plan: 'cpa',
    name: 'Partner Program',
    tagline: 'Free to join — resell Pro/Business, earn a wholesale discount that grows with you',
    monthlyAiCredits: -1,
    features: CPA_FEATURES,
    prices: pricesFor('cpa'),
    publicSignupUrl: 'https://hellobooks.ai/partner-program/apply',
  },
  {
    plan: 'warehouse-addon',
    name: 'Warehouse Add-on',
    tagline: 'Per-entity warehouse module — stacks on any paid plan',
    monthlyAiCredits: 0,
    features: WAREHOUSE_ADDON_FEATURES,
    prices: usdAddonPrice(9, 90),
    publicSignupUrl: 'https://hellobooks.ai/warehouse',
  },
  {
    plan: 'manufacturing-addon',
    name: 'Manufacturing Add-on',
    tagline: 'Per-entity manufacturing module — stacks on any paid plan',
    monthlyAiCredits: 0,
    features: MANUFACTURING_ADDON_FEATURES,
    prices: usdAddonPrice(14, 140),
    publicSignupUrl: 'https://hellobooks.ai/manufacturing',
  },
];

// ---------------------------------------------------------------------------
// Credit packs — one-time pay-as-you-go AI credit top-ups (Doc 19 v2).
// Stack on any paid plan (not Free — Free users upgrade for more, 2026-09-29). Priced per region; mirrors PACKS_BY_REGION
// in pricingConfig.ts and the addOns array in hellobooks.ai/api/feed/pricing.json.
// ---------------------------------------------------------------------------

export type CreditPackId = 'boost' | 'power' | 'mega' | 'ultra';

export interface PackPrice {
  country: string;
  currency: CurrencyCode | string;
  symbol: string;
  price: number;
  pricingCountry?: CountryCode;
  billingNote?: string;
}

export interface CreditPack {
  id: CreditPackId;
  name: string;
  credits: number;
  prices: PackPrice[];
  publicUrl: string;
}

const PACK_META: { id: CreditPackId; name: string; credits: number }[] = [
  { id: 'boost', name: 'Boost credit pack', credits: 5000 },
  { id: 'power', name: 'Power credit pack', credits: 15000 },
  { id: 'mega', name: 'Mega credit pack', credits: 50000 },
  { id: 'ultra', name: 'Ultra credit pack', credits: 150000 },
];

export const CREDIT_PACKS: CreditPack[] = PACK_META.map((meta) => ({
  id: meta.id,
  name: meta.name,
  credits: meta.credits,
  prices: REGIONS.map((r) => ({
    country: r.country,
    currency: r.currency,
    symbol: r.symbol,
    price: r.packs[meta.id],
  })),
  publicUrl: 'https://hellobooks.ai/pricing',
}));
