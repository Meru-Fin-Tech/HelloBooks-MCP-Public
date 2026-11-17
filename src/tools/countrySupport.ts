import { z } from 'zod';
import { COUNTRY_SUPPORT } from '../data/countries.js';
import { SUPPORTED_COUNTRY_CODES, type SupportedCountryCode } from '../data/supportedCountries.js';

export const countrySupportSchema = {
  country: z.enum(SUPPORTED_COUNTRY_CODES).optional()
    .describe('Single ISO country code. Omit for the full matrix.'),
  summary: z.boolean().optional()
    .describe('When true and no `country` is given, return a compact per-country index (feature/compliance counts instead of the full detail) to save context. Then call with a `country` for full detail.'),
};

export interface CountrySupportArgs {
  country?: SupportedCountryCode;
  summary?: boolean;
}

export function countrySupport(args: CountrySupportArgs) {
  if (!args.country) {
    if (args.summary) {
      return {
        countries: COUNTRY_SUPPORT.map((c) => ({
          country: c.country,
          countryName: c.countryName,
          defaultCurrency: c.defaultCurrency,
          supportTier: c.supportTier,
          featureCount: c.features.length,
          complianceCount: c.compliance.length,
          marketingUrl: c.marketingUrl,
        })),
        count: COUNTRY_SUPPORT.length,
        mode: 'summary' as const,
        note: 'Compact index — feature/compliance arrays are replaced by counts. Call with a `country` for the full detail.',
      };
    }
    return { countries: COUNTRY_SUPPORT, count: COUNTRY_SUPPORT.length };
  }
  const match = COUNTRY_SUPPORT.find((c) => c.country === args.country);
  if (!match) {
    return {
      countries: [],
      count: 0,
      error: `No support entry for country '${args.country}'. Supported: ${COUNTRY_SUPPORT.map((c) => c.country).join(', ')}.`,
    };
  }
  return { countries: [match], count: 1 };
}
