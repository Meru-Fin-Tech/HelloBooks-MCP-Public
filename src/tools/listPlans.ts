import { z } from 'zod';
import { getPlans, getPricingMeta } from '../pricingFeed.js';
import type { CountryCode, PlanType } from '../data/plans.js';

export const listPlansSchema = {
  country: z.enum(['IN', 'US', 'CA', 'GB', 'AU', 'AE', 'SG', 'NZ']).optional()
    .describe('ISO country code. Filters prices to one country. Omit to return all 8 markets.'),
  plan: z.enum(['free', 'starter', 'pro', 'business', 'scale', 'cpa']).optional()
    .describe('Restrict the response to a single plan tier (`cpa` = free Partner Program). Starter and Scale are sold in the US only, so they return an empty price list for other countries.'),
};

export interface ListPlansArgs {
  country?: CountryCode;
  plan?: PlanType;
}

export function listPlans(args: ListPlansArgs) {
  let results = getPlans();
  if (args.plan) results = results.filter((p) => p.plan === args.plan);

  if (args.country) {
    const c = args.country;
    results = results.map((p) => ({
      ...p,
      prices: p.prices.filter((pr) => pr.country === c),
    }));
  }

  return {
    plans: results,
    ...getPricingMeta(),
    source: 'https://hellobooks.ai/pricing',
    note: 'Prices are list prices in local currency. Discounts and promotions may apply at checkout. `dataSource` is "live-feed" when prices were fetched from hellobooks.ai/api/feed/pricing.json, or "static-fallback" when served from the baked catalog.',
  };
}
