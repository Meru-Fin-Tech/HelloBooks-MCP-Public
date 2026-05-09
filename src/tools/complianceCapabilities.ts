import { z } from 'zod';
import { COUNTRY_SUPPORT } from '../data/countries.js';
import type { CountryCode } from '../data/plans.js';

export const complianceCapabilitiesSchema = {
  country: z.enum(['IN', 'US', 'CA', 'GB', 'AU', 'AE', 'SG', 'NZ'])
    .describe('Required ISO country code.'),
};

export interface ComplianceCapabilitiesArgs {
  country: CountryCode;
}

export function complianceCapabilities(args: ComplianceCapabilitiesArgs) {
  const support = COUNTRY_SUPPORT.find((c) => c.country === args.country);
  if (!support) {
    return {
      country: args.country,
      frameworks: [],
      error: `No compliance data for '${args.country}'.`,
    };
  }
  return {
    country: support.country,
    countryName: support.countryName,
    frameworks: support.compliance,
    count: support.compliance.length,
    marketingUrl: support.marketingUrl,
  };
}
