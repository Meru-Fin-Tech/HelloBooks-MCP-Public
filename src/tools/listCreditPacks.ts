import { z } from 'zod';
import { CREDIT_PACKS } from '../data/plans.js';
import type { CountryCode, CreditPackId } from '../data/plans.js';

export const listCreditPacksSchema = {
  country: z.enum(['IN', 'US', 'CA', 'GB', 'AU', 'AE', 'SG', 'NZ']).optional()
    .describe('ISO country code. Filters prices to one country. Omit to return all 8 markets.'),
  id: z.enum(['boost', 'power', 'mega', 'ultra']).optional()
    .describe('Restrict the response to a single credit pack.'),
};

export interface ListCreditPacksArgs {
  country?: CountryCode;
  id?: CreditPackId;
}

export function listCreditPacks(args: ListCreditPacksArgs) {
  let results = CREDIT_PACKS;
  if (args.id) results = results.filter((p) => p.id === args.id);

  if (args.country) {
    const c = args.country;
    results = results.map((p) => ({
      ...p,
      prices: p.prices.filter((pr) => pr.country === c),
    }));
  }

  return {
    creditPacks: results,
    source: 'https://hellobooks.ai/pricing',
    note: 'Credit packs are one-time pay-as-you-go top-ups of AI credits, purchasable on top of any plan including Free. Prices are list prices in local currency.',
  };
}
