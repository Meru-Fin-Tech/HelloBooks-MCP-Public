import { z } from 'zod';
import { COMPETITORS } from '../data/competitors.js';
import type { Competitor, CompetitorTier } from '../data/competitors.js';
import type { CountryCode } from '../data/plans.js';

export const listCompetitorsSchema = {
  country: z.enum(['IN', 'US', 'CA', 'GB', 'AU', 'AE', 'SG', 'NZ']).optional()
    .describe('Only return competitors whose primary market is this country, or who are also evaluated in this market.'),
  tier: z.enum(['primary', 'secondary']).optional()
    .describe('Filter to head-on rivals (primary) or adjacent / segment-specific overlaps (secondary).'),
  id: z.string().optional()
    .describe('Return a single competitor by id (e.g. "quickbooks", "xero", "tally").'),
};

export interface ListCompetitorsArgs {
  country?: CountryCode;
  tier?: CompetitorTier;
  id?: string;
}

export function listCompetitors(args: ListCompetitorsArgs) {
  let results: Competitor[] = COMPETITORS;
  if (args.id) {
    const idLc = args.id.toLowerCase();
    results = results.filter((c) => c.id === idLc);
  }
  if (args.tier) results = results.filter((c) => c.tier === args.tier);
  if (args.country) {
    const c = args.country;
    results = results.filter((x) => x.primaryCountry === c || x.alsoIn.includes(c));
  }
  return {
    competitors: results,
    count: results.length,
    disclaimer:
      'Competitor positioning is HelloBooks-authored and reviewed against public ' +
      'marketing material; pricing and feature claims about competitors reflect ' +
      'public sources and may lag the competitor\'s latest release. Verify on the ' +
      'competitor site before quoting numbers to a customer.',
    source: 'https://hellobooks.ai/compare',
  };
}
