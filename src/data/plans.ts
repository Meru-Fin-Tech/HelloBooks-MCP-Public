/**
 * Plan catalog — mirrored from the marketing-site source-of-truth at
 *   Web-Fire-hellobooks.ai/src/lib/pricingConfig.ts
 *
 * Public-only data: tier names, prices, currencies, feature bullets shown on
 * the public /pricing page. Never includes customer usage, billing, account ID.
 *
 * TODO(federation): once the marketing site exposes /api/public/pricing,
 * switch this module to fetch + cache from that endpoint and drop the static copy.
 */

export type CountryCode = 'IN' | 'US' | 'CA' | 'GB' | 'AU' | 'AE' | 'SG' | 'NZ';
export type CurrencyCode = 'INR' | 'USD' | 'CAD' | 'GBP' | 'AUD' | 'AED' | 'SGD' | 'NZD';
export type PlanType = 'free' | 'pro' | 'business' | 'cpa';

export interface PlanPrice {
  country: CountryCode;
  currency: CurrencyCode;
  symbol: string;
  monthly: number;
  annual: number;
  anchorMonthly: number; // 0 = no strikethrough price
  perClient?: number; // CPA only
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
  '500 AI credits/month',
  '1 bank connection via Plaid',
  'Unlimited invoices, bills & quotes',
  'AP/AR aging reports',
  'P&L, Balance Sheet, Cash Flow',
  'Full mobile app (iOS & Android)',
  'Up to 2 users',
];

const PRO_FEATURES = [
  '1,500 AI credits/month',
  'AI auto-categorization (95%+ accuracy)',
  'Unlimited bank connections',
  'Unlimited users + roles',
  'Recurring invoices & bills',
  'Expense claims + approval workflows',
  'Multi-currency with auto FX',
  'Remove "Powered by" badge',
];

const BUSINESS_FEATURES = [
  '5,000 AI credits/month',
  '3-way matching (PO / Bill / GRN)',
  'Multi-entity management',
  'Custom report builder',
  'Inventory (FIFO, LIFO, Weighted Avg)',
  'Projects & job costing',
  'API access',
  'Dedicated account manager',
];

const CPA_FEATURES = [
  'Unlimited AI credits',
  'Multi-client dashboard',
  'White-label option',
  'Bulk AI operations',
  'Partner commission (10%)',
  'Co-branded landing page',
  'Priority phone support',
  'Quarterly business review',
];

interface RegionConfig {
  country: CountryCode;
  currency: CurrencyCode;
  symbol: string;
  pro: { monthly: number; annual: number; anchor: number };
  business: { monthly: number; annual: number; anchor: number };
  cpa: { monthly: number; annual: number; perClient: number };
}

const REGIONS: RegionConfig[] = [
  { country: 'US', currency: 'USD', symbol: '$',
    pro: { monthly: 19.99, annual: 199.99, anchor: 49.99 },
    business: { monthly: 39.99, annual: 399.99, anchor: 99.99 },
    cpa: { monthly: 59.99, annual: 599.99, perClient: 4.99 } },
  { country: 'IN', currency: 'INR', symbol: '₹',
    pro: { monthly: 1499, annual: 14999, anchor: 3999 },
    business: { monthly: 2999, annual: 29999, anchor: 7999 },
    cpa: { monthly: 4999, annual: 49999, perClient: 349 } },
  { country: 'CA', currency: 'CAD', symbol: 'C$',
    pro: { monthly: 25.99, annual: 259.99, anchor: 64.99 },
    business: { monthly: 51.99, annual: 519.99, anchor: 129.99 },
    cpa: { monthly: 77.99, annual: 779.99, perClient: 6.49 } },
  { country: 'GB', currency: 'GBP', symbol: '£',
    pro: { monthly: 15.99, annual: 159.99, anchor: 39.99 },
    business: { monthly: 31.99, annual: 319.99, anchor: 79.99 },
    cpa: { monthly: 47.99, annual: 479.99, perClient: 3.99 } },
  { country: 'AU', currency: 'AUD', symbol: 'A$',
    pro: { monthly: 29.99, annual: 299.99, anchor: 74.99 },
    business: { monthly: 59.99, annual: 599.99, anchor: 149.99 },
    cpa: { monthly: 89.99, annual: 899.99, perClient: 7.49 } },
  { country: 'AE', currency: 'AED', symbol: 'AED ',
    pro: { monthly: 73, annual: 733, anchor: 184 },
    business: { monthly: 147, annual: 1467, anchor: 367 },
    cpa: { monthly: 220, annual: 2200, perClient: 18 } },
  { country: 'SG', currency: 'SGD', symbol: 'S$',
    pro: { monthly: 25.99, annual: 259.99, anchor: 64.99 },
    business: { monthly: 51.99, annual: 519.99, anchor: 129.99 },
    cpa: { monthly: 77.99, annual: 779.99, perClient: 6.49 } },
  { country: 'NZ', currency: 'NZD', symbol: 'NZ$',
    pro: { monthly: 31.99, annual: 319.99, anchor: 79.99 },
    business: { monthly: 63.99, annual: 639.99, anchor: 159.99 },
    cpa: { monthly: 95.99, annual: 959.99, perClient: 7.99 } },
];

function pricesFor(plan: Exclude<PlanType, 'free'>): PlanPrice[] {
  return REGIONS.map((r) => {
    const tier = r[plan];
    return {
      country: r.country,
      currency: r.currency,
      symbol: r.symbol,
      monthly: tier.monthly,
      annual: tier.annual,
      anchorMonthly: 'anchor' in tier ? tier.anchor : 0,
      ...('perClient' in tier ? { perClient: tier.perClient } : {}),
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

export const PLANS: Plan[] = [
  {
    plan: 'free',
    name: 'Free',
    tagline: 'Everything you need to start',
    monthlyAiCredits: 500,
    features: FREE_FEATURES,
    prices: freePrices(),
    publicSignupUrl: 'https://hellobooks.ai/pricing',
  },
  {
    plan: 'pro',
    name: 'Pro',
    tagline: 'AI-powered automation for growing businesses',
    monthlyAiCredits: 1500,
    features: PRO_FEATURES,
    prices: pricesFor('pro'),
    publicSignupUrl: 'https://hellobooks.ai/pricing',
  },
  {
    plan: 'business',
    name: 'Business',
    tagline: 'Advanced features for scaling companies',
    monthlyAiCredits: 5000,
    features: BUSINESS_FEATURES,
    prices: pricesFor('business'),
    publicSignupUrl: 'https://hellobooks.ai/pricing',
  },
  {
    plan: 'cpa',
    name: 'CPA / CA Partner',
    tagline: 'Manage all your clients with AI',
    monthlyAiCredits: -1,
    features: CPA_FEATURES,
    prices: pricesFor('cpa'),
    publicSignupUrl: 'https://hellobooks.ai/contact',
  },
];
