import { z } from 'zod';
import { COUNTRY_SUPPORT } from '../data/countries.js';
import type { CountryCode } from '../data/plans.js';

export const countrySupportSchema = {
  country: z.enum(['IN', 'US', 'CA', 'GB', 'AU', 'AE', 'SG', 'NZ']).optional()
    .describe('Single ISO country code. Omit for the full matrix.'),
};

export interface CountrySupportArgs {
  country?: CountryCode;
}

export function countrySupport(args: CountrySupportArgs) {
  if (!args.country) {
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
