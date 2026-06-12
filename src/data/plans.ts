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
export type PlanType = 'free' | 'pro' | 'business' | 'cpa' | 'warehouse-addon' | 'manufacturing-addon';

export interface PlanPrice {
  country: CountryCode;
  currency: CurrencyCode;
  symbol: string;
  monthly: number;
  annual: number;
  anchorMonthly: number; // 0 = no strikethrough price
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
  monthlyAiCredits: number; // -1 = unlimited
  features: string[];
  prices: PlanPrice[];
  publicSignupUrl: string;
}

const FREE_FEATURES = [
  '5,000 AI credits/month',
  'All 154 features',
  'Up to 3 users',
  '1 bank account + 1 credit card',
  'Unlimited invoices, bills & quotes',
  'AP/AR aging reports',
  'P&L, Balance Sheet, Cash Flow',
  'Full mobile app (iOS & Android)',
  '"Powered by HelloBooks" badge',
];

const PRO_FEATURES = [
  '15,000 AI credits/month',
  'AI auto-categorization (95%+ accuracy)',
  'Unlimited bank connections',
  'Unlimited users + roles',
  'Multi-entity management',
  '3-way matching (PO / Bill / GRN)',
  'AI Analysis & Comparative View on every report',
  'API access',
  'Recurring invoices, bills & approvals',
  'Multi-currency with auto FX',
  'Remove "Powered by" badge',
  'Priority email support',
];

const BUSINESS_FEATURES = [
  'Everything in Pro, plus:',
  '50,000 AI credits/month',
  'Advanced inventory: lot/batch + multi-warehouse allocations',
  'Cohort, retention & CFO analytics',
  'Audit log + advanced role-based access',
  'Sandbox environment',
  'Higher API rate limits',
  'Priority phone support',
  'Dedicated success manager',
];

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
  pro: { monthly: number; annual: number; anchor: number };
  business: { monthly: number; annual: number; anchor: number };
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
const REGIONS: RegionConfig[] = [
  { country: 'US', currency: 'USD', symbol: '$',
    pro:      { monthly:  9.99, annual:  99,    anchor:  19.99 },
    business: { monthly: 39.99, annual: 399,    anchor:  79.99 },
    cpa:      { monthly:  0,    annual:   0,    perClient: 0 },
    packs: { boost: 4.99, power: 12.99, mega: 29.99, ultra: 69.99 } },
  { country: 'IN', currency: 'INR', symbol: '₹',
    pro:      { monthly:   499, annual:  4999,  anchor:   999 },
    business: { monthly:  1999, annual: 19999,  anchor:  3999 },
    cpa:      { monthly:     0, annual:     0,  perClient: 0 },
    packs: { boost: 249, power: 699, mega: 1999, ultra: 4999 } },
  { country: 'CA', currency: 'CAD', symbol: 'C$',
    pro:      { monthly: 12.99, annual: 129.99, anchor:  25.99 },
    business: { monthly: 51.99, annual: 519.99, anchor: 103.99 },
    cpa:      { monthly:  0,    annual:   0,    perClient: 0 },
    packs: { boost: 6.49, power: 16.99, mega: 38.99, ultra: 90.99 } },
  { country: 'GB', currency: 'GBP', symbol: '£',
    pro:      { monthly:  7.99, annual:  79.99, anchor:  15.99 },
    business: { monthly: 31.99, annual: 319.99, anchor:  63.99 },
    cpa:      { monthly:  0,    annual:   0,    perClient: 0 },
    packs: { boost: 3.99, power: 10.49, mega: 23.99, ultra: 55.99 } },
  { country: 'AU', currency: 'AUD', symbol: 'A$',
    pro:      { monthly: 14.99, annual: 149.99, anchor:  29.99 },
    business: { monthly: 59.99, annual: 599.99, anchor: 119.99 },
    cpa:      { monthly:  0,    annual:   0,    perClient: 0 },
    packs: { boost: 7.49, power: 19.49, mega: 44.99, ultra: 104.99 } },
  { country: 'AE', currency: 'AED', symbol: 'AED ',
    pro:      { monthly:  37,   annual:  367,   anchor:   73 },
    business: { monthly: 147,   annual: 1467,   anchor:  293 },
    cpa:      { monthly:  0,    annual:   0,    perClient: 0 },
    packs: { boost: 18, power: 48, mega: 110, ultra: 257 } },
  { country: 'SG', currency: 'SGD', symbol: 'S$',
    pro:      { monthly: 12.99, annual: 129.99, anchor:  25.99 },
    business: { monthly: 51.99, annual: 519.99, anchor: 103.99 },
    cpa:      { monthly:  0,    annual:   0,    perClient: 0 },
    packs: { boost: 6.49, power: 16.99, mega: 38.99, ultra: 90.99 } },
  { country: 'NZ', currency: 'NZD', symbol: 'NZ$',
    pro:      { monthly: 15.99, annual: 159.99, anchor:  31.99 },
    business: { monthly: 63.99, annual: 639.99, anchor: 127.99 },
    cpa:      { monthly:  0,    annual:   0,    perClient: 0 },
    packs: { boost: 7.99, power: 20.99, mega: 47.99, ultra: 111.99 } },
];

type RegionalPaidPlan = 'pro' | 'business' | 'cpa';

function pricesFor(plan: RegionalPaidPlan): PlanPrice[] {
  return REGIONS.map((r) => {
    const tier = r[plan];
    return {
      country: r.country,
      currency: r.currency,
      symbol: r.symbol,
      monthly: tier.monthly,
      annual: tier.annual,
      anchorMonthly: 'anchor' in tier ? tier.anchor : 0,
    };
  });
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
    monthlyAiCredits: 5000,
    features: FREE_FEATURES,
    prices: freePrices(),
    publicSignupUrl: 'https://hellobooks.ai/pricing',
  },
  {
    plan: 'pro',
    name: 'Pro',
    tagline: 'AI-powered automation for growing businesses',
    monthlyAiCredits: 15000,
    features: PRO_FEATURES,
    prices: pricesFor('pro'),
    publicSignupUrl: 'https://hellobooks.ai/pricing',
  },
  {
    plan: 'business',
    name: 'Business',
    tagline: 'Heavier ops + analytics for multi-entity & inventory-led businesses',
    monthlyAiCredits: 50000,
    features: BUSINESS_FEATURES,
    prices: pricesFor('business'),
    publicSignupUrl: 'https://hellobooks.ai/pricing',
  },
  {
    plan: 'cpa',
    name: 'Partner Program',
    tagline: 'Free to join — resell Pro/Business, earn a wholesale discount that grows with you',
    monthlyAiCredits: 0,
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
// Stack on any plan, including Free. Priced per region; mirrors PACKS_BY_REGION
// in pricingConfig.ts and the addOns array in hellobooks.ai/api/feed/pricing.json.
// ---------------------------------------------------------------------------

export type CreditPackId = 'boost' | 'power' | 'mega' | 'ultra';

export interface PackPrice {
  country: CountryCode;
  currency: CurrencyCode;
  symbol: string;
  price: number;
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
