/**
 * lookup_tax_rate — pick a single statutory rate by id or by best match.
 *
 * Two modes:
 *  - exact lookup by ``id`` (e.g. ``IN-standard-18``) — deterministic.
 *  - fuzzy lookup by ``country`` + free-text ``category`` keyword — picks
 *    the slab whose example categories most closely match the query.
 *
 * Read-only, statute-derived. No customer data.
 */

import { z } from 'zod';
import { TAX_RATES, TAX_RATE_DISCLAIMER, type TaxRate } from '../data/taxRates.js';
import type { CountryCode } from '../data/plans.js';

export const lookupTaxRateSchema = {
  id: z.string().min(3).optional()
    .describe('Exact rate id, e.g. ``IN-standard-18`` or ``GB-zero-0``. When set, country/category are ignored.'),
  country: z.enum(['IN', 'US', 'CA', 'GB', 'AU', 'AE', 'SG', 'NZ']).optional()
    .describe('Country to search within. Required when ``id`` is not provided.'),
  category: z.string().min(2).max(120).optional()
    .describe('Free-text query — "office supplies", "restaurant", "exports", "domestic fuel".'),
};

export interface LookupTaxRateArgs {
  id?: string;
  country?: CountryCode;
  category?: string;
}

function scoreCategory(rate: TaxRate, query: string): number {
  const q = query.toLowerCase();
  // Direct token hit on any example category.
  for (const cat of rate.exampleCategories) {
    if (cat.toLowerCase().includes(q) || q.includes(cat.toLowerCase())) return 100;
  }
  // Word-overlap fallback: count shared whitespace-separated tokens.
  const qTokens = new Set(q.split(/\s+/).filter((w) => w.length >= 3));
  let overlap = 0;
  for (const cat of rate.exampleCategories) {
    for (const t of cat.toLowerCase().split(/\s+/)) {
      if (qTokens.has(t)) overlap += 1;
    }
  }
  return overlap;
}

export function lookupTaxRate(args: LookupTaxRateArgs) {
  if (args.id) {
    const match = TAX_RATES.find((r) => r.id === args.id);
    if (!match) {
      return {
        match: null,
        message: `No tax rate found with id ${args.id}.`,
        hint: 'Call list_tax_rates with country filter to discover available ids.',
        disclaimer: TAX_RATE_DISCLAIMER,
      };
    }
    return { match, score: 100, disclaimer: TAX_RATE_DISCLAIMER };
  }

  if (!args.country) {
    return {
      match: null,
      message: 'Either ``id`` or ``country`` is required.',
      hint: 'Pass country=IN and category="office supplies", or call list_tax_rates first.',
      disclaimer: TAX_RATE_DISCLAIMER,
    };
  }

  const candidates = TAX_RATES.filter((r) => r.country === args.country);
  if (candidates.length === 0) {
    return {
      match: null,
      message: `No rates configured for country ${args.country}.`,
      disclaimer: TAX_RATE_DISCLAIMER,
    };
  }

  if (!args.category) {
    // Without a category we default to the country's standard slab.
    const standard = candidates.find((r) => r.scheme === 'standard') ?? candidates[0]!;
    return {
      match: standard,
      score: 0,
      note: 'No category provided — returned the standard slab for the country.',
      disclaimer: TAX_RATE_DISCLAIMER,
    };
  }

  let best: TaxRate | null = null;
  let bestScore = -1;
  for (const rate of candidates) {
    const score = scoreCategory(rate, args.category);
    if (score > bestScore) {
      best = rate;
      bestScore = score;
    }
  }
  return {
    match: best,
    score: bestScore,
    disclaimer: TAX_RATE_DISCLAIMER,
  };
}
