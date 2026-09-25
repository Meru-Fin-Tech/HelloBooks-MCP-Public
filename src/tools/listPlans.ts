import { z } from 'zod';
import { getPlans, getPricingMeta } from '../pricingFeed.js';
import type { PlanPrice, PlanType } from '../data/plans.js';
import {
  PRICED_COUNTRY_CODES,
  SUPPORTED_COUNTRY_CODES,
  getSupportedCountry,
  type PricedCountryCode,
  type SupportedCountryCode,
} from '../data/supportedCountries.js';

export const listPlansSchema = {
  country: z.enum(SUPPORTED_COUNTRY_CODES).optional()
    .describe('ISO country code. Filters prices to one country. Countries without local pricing return the USD/default list price with fallback metadata. Omit to return priced markets.'),
  plan: z.enum(['free', 'starter', 'pro', 'business', 'scale', 'cpa']).optional()
    .describe('Restrict the response to a single plan tier (`cpa` = free Partner Program). Countries without local pricing use the USD/default list price.'),
};

export interface ListPlansArgs {
  country?: SupportedCountryCode;
  plan?: PlanType;
}

const PRICED_COUNTRY_SET = new Set<string>(PRICED_COUNTRY_CODES);
const DEFAULT_PRICING_COUNTRY: PricedCountryCode = 'US';

function fallbackPrice(price: PlanPrice, country: SupportedCountryCode, localCurrency: string): PlanPrice {
  return {
    ...price,
    country,
    pricingCountry: DEFAULT_PRICING_COUNTRY,
    billingNote: `USD/default list price. Books and reports for ${country} use ${localCurrency}; subscription checkout bills this tier in ${price.currency}.`,
  };
}

function pricesForCountry(prices: PlanPrice[], country: SupportedCountryCode): PlanPrice[] {
  const exact = prices.filter((price) => price.country === country);
  if (exact.length > 0) return exact;

  if (PRICED_COUNTRY_SET.has(country)) return [];

  const supportedCountry = getSupportedCountry(country);
  const defaultPrice = prices.find((price) => price.country === DEFAULT_PRICING_COUNTRY);
  if (!supportedCountry || !defaultPrice) return [];

  return [fallbackPrice(defaultPrice, country, supportedCountry.currency)];
}

export function listPlans(args: ListPlansArgs) {
  let results = getPlans();
  if (args.plan) results = results.filter((p) => p.plan === args.plan);

  const requestedCountry = args.country ? getSupportedCountry(args.country) ?? null : null;
  const pricingFallback = requestedCountry && !PRICED_COUNTRY_SET.has(requestedCountry.iso)
    ? {
        requestedCountry: requestedCountry.iso,
        localCurrency: requestedCountry.currency,
        pricingCountry: DEFAULT_PRICING_COUNTRY,
        billingCurrency: 'USD',
        message:
          `${requestedCountry.name} is supported, but it does not have a separate local price table yet. ` +
          'The MCP returns the USD/default list price and labels each fallback row with pricingCountry=US.',
      }
    : null;

  if (args.country) {
    const c = args.country;
    results = results.map((p) => ({
      ...p,
      prices: pricesForCountry(p.prices, c),
    }));
  }

  return {
    plans: results,
    requestedCountry,
    pricingFallback,
    ...getPricingMeta(),
    source: 'https://hellobooks.ai/pricing',
    note: 'Prices are list prices. The 8 priced regions return local currency rows. Supported countries without a separate price table return the USD/default list price with `pricingCountry=US`; local books still use that country currency. Discounts and promotions may apply at checkout. `dataSource` is "live-feed" when prices were fetched from hellobooks.ai/api/feed/pricing.json, or "static-fallback" when served from the baked catalog.',
  };
}
