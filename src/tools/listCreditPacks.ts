import { z } from 'zod';
import { getCreditPacks, getPricingMeta } from '../pricingFeed.js';
import type { CreditPackId, PackPrice } from '../data/plans.js';
import {
  PRICED_COUNTRY_CODES,
  SUPPORTED_COUNTRY_CODES,
  getSupportedCountry,
  type PricedCountryCode,
  type SupportedCountryCode,
} from '../data/supportedCountries.js';

export const listCreditPacksSchema = {
  country: z.enum(SUPPORTED_COUNTRY_CODES).optional()
    .describe('ISO country code. Filters prices to one country. Countries without local pricing return the USD/default list price with fallback metadata. Omit to return priced markets.'),
  id: z.enum(['boost', 'power', 'mega', 'ultra']).optional()
    .describe('Restrict the response to a single credit pack.'),
};

export interface ListCreditPacksArgs {
  country?: SupportedCountryCode;
  id?: CreditPackId;
}

const PRICED_COUNTRY_SET = new Set<string>(PRICED_COUNTRY_CODES);
const DEFAULT_PRICING_COUNTRY: PricedCountryCode = 'US';

function fallbackPackPrice(price: PackPrice, country: SupportedCountryCode, localCurrency: string): PackPrice {
  return {
    ...price,
    country,
    pricingCountry: DEFAULT_PRICING_COUNTRY,
    billingNote: `USD/default credit-pack price. Books and reports for ${country} use ${localCurrency}; checkout bills this pack in ${price.currency}.`,
  };
}

function packPricesForCountry(prices: PackPrice[], country: SupportedCountryCode): PackPrice[] {
  const exact = prices.filter((price) => price.country === country);
  if (exact.length > 0) return exact;

  if (PRICED_COUNTRY_SET.has(country)) return [];

  const supportedCountry = getSupportedCountry(country);
  const defaultPrice = prices.find((price) => price.country === DEFAULT_PRICING_COUNTRY);
  if (!supportedCountry || !defaultPrice) return [];

  return [fallbackPackPrice(defaultPrice, country, supportedCountry.currency)];
}

export function listCreditPacks(args: ListCreditPacksArgs) {
  let results = getCreditPacks();
  if (args.id) results = results.filter((p) => p.id === args.id);

  const requestedCountry = args.country ? getSupportedCountry(args.country) ?? null : null;
  const pricingFallback = requestedCountry && !PRICED_COUNTRY_SET.has(requestedCountry.iso)
    ? {
        requestedCountry: requestedCountry.iso,
        localCurrency: requestedCountry.currency,
        pricingCountry: DEFAULT_PRICING_COUNTRY,
        billingCurrency: 'USD',
        message:
          `${requestedCountry.name} is supported, but it does not have a separate local credit-pack price table yet. ` +
          'The MCP returns the USD/default list price and labels each fallback row with pricingCountry=US.',
      }
    : null;

  if (args.country) {
    const c = args.country;
    results = results.map((p) => ({
      ...p,
      prices: packPricesForCountry(p.prices, c),
    }));
  }

  return {
    creditPacks: results,
    requestedCountry,
    pricingFallback,
    ...getPricingMeta(),
    source: 'https://hellobooks.ai/pricing',
    note: 'Credit packs are one-time pay-as-you-go top-ups of AI credits, purchasable on top of any plan including Free. The 8 priced regions return local currency rows. Supported countries without a separate price table return the USD/default list price with `pricingCountry=US`. `dataSource` is "live-feed" when fetched from hellobooks.ai/api/feed/pricing.json, or "static-fallback" when served from the baked catalog.',
  };
}
