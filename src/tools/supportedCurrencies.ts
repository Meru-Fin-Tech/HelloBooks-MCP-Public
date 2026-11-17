/**
 * `supported_currencies` — which currencies HelloBooks bills and keeps books in.
 *
 * Two distinct things buyers conflate:
 *   - Billing currency: the 8 priced regions check out in their local currency;
 *     every other supported country is billed in USD (the default list price).
 *   - Books/reporting currency: a supported country's books run in that
 *     country's own currency regardless of billing.
 *
 * This tool reports both, grouped by currency, from the supported-countries
 * catalog. Read-only, public data only.
 */
import { z } from 'zod';
import {
  SUPPORTED_COUNTRIES,
  PRICED_COUNTRY_CODES,
  SUPPORTED_COUNTRY_CODES,
  type SupportedCountryCode,
} from '../data/supportedCountries.js';

export const supportedCurrenciesSchema = {
  country: z
    .enum(SUPPORTED_COUNTRY_CODES)
    .optional()
    .describe('ISO country code to report a single country’s currency + billing behaviour.'),
};

export interface SupportedCurrenciesArgs {
  country?: SupportedCountryCode;
}

/** Symbols for the priced billing currencies (others bill in USD). */
const SYMBOLS: Record<string, string> = {
  INR: '₹', USD: '$', GBP: '£', AUD: 'A$',
  AED: 'AED', CAD: 'C$', SGD: 'S$', NZD: 'NZ$',
};

const PRICED = new Set<string>(PRICED_COUNTRY_CODES);

export interface CurrencyGroup {
  currency: string;
  symbol?: string;
  isBillingCurrency: boolean;
  countries: Array<{ iso: string; name: string; billing: 'local' | 'usd-default' }>;
}

export function supportedCurrencies(args: SupportedCurrenciesArgs) {
  const disclaimer =
    'The 8 priced regions check out in their local currency; every other supported country is billed in USD at the default list price, while its books and reports still run in the local currency.';

  if (args.country) {
    const c = SUPPORTED_COUNTRIES.find((x) => x.iso === args.country);
    if (!c) {
      return { country: args.country, found: false, note: 'Country not in the supported catalog.' };
    }
    const priced = PRICED.has(c.iso);
    return {
      country: c.iso,
      found: true,
      name: c.name,
      booksCurrency: c.currency,
      billingCurrency: priced ? c.currency : 'USD',
      isPricedRegion: priced,
      symbol: SYMBOLS[c.currency],
      note: priced
        ? `${c.name} checks out and keeps books in ${c.currency}.`
        : `${c.name} keeps books in ${c.currency} but is billed in USD (default list price).`,
      disclaimer,
    };
  }

  const groups = new Map<string, CurrencyGroup>();
  for (const c of SUPPORTED_COUNTRIES) {
    const priced = PRICED.has(c.iso);
    if (!groups.has(c.currency)) {
      groups.set(c.currency, {
        currency: c.currency,
        symbol: SYMBOLS[c.currency],
        isBillingCurrency: false,
        countries: [],
      });
    }
    const g = groups.get(c.currency)!;
    if (priced) g.isBillingCurrency = true;
    g.countries.push({ iso: c.iso, name: c.name, billing: priced ? 'local' : 'usd-default' });
  }

  const currencies = [...groups.values()].sort((a, b) => a.currency.localeCompare(b.currency));
  return {
    billingCurrencies: [...new Set(
      SUPPORTED_COUNTRIES.filter((c) => PRICED.has(c.iso)).map((c) => c.currency),
    )].sort(),
    booksCurrencyCount: currencies.length,
    supportedCountryCount: SUPPORTED_COUNTRIES.length,
    currencies,
    disclaimer,
    note: 'Multi-currency: each supported country’s books run in its own currency. Billing is local for the 8 priced regions, USD elsewhere. Confirm current pricing with list_plans.',
  };
}
