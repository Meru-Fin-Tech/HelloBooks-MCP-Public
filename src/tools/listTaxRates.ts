/**
 * list_tax_rates — public statutory tax-rate lookup.
 *
 * Backs the agents.hellobooks.ai public surface so an MCP-aware AI can
 * answer "what's the GST rate on office supplies in India?" without
 * touching any customer data.
 */

import { z } from 'zod';
import { TAX_RATES, TAX_RATE_DISCLAIMER, type TaxRate } from '../data/taxRates.js';
import type { CountryCode } from '../data/plans.js';

export const listTaxRatesSchema = {
  country: z.enum(['IN', 'US', 'CA', 'GB', 'AU', 'AE', 'SG', 'NZ']).optional()
    .describe('Filter to one jurisdiction. Omit to return every supported country.'),
  taxType: z.enum(['GST', 'IGST', 'CGST-SGST', 'VAT', 'Sales-Tax', 'HST', 'TDS', 'TCS']).optional()
    .describe('Filter by statutory tax type (GST, VAT, Sales-Tax, HST, etc.).'),
  scheme: z.enum(['standard', 'reduced', 'zero', 'exempt', 'composition', 'cess', 'state-summary']).optional()
    .describe('Filter by slab category — standard, reduced, zero, exempt, composition, cess.'),
};

export interface ListTaxRatesArgs {
  country?: CountryCode;
  taxType?: TaxRate['taxType'];
  scheme?: TaxRate['scheme'];
}

export function listTaxRates(args: ListTaxRatesArgs) {
  let results = TAX_RATES.slice();
  if (args.country) results = results.filter((r) => r.country === args.country);
  if (args.taxType) results = results.filter((r) => r.taxType === args.taxType);
  if (args.scheme) results = results.filter((r) => r.scheme === args.scheme);

  return {
    rates: results,
    count: results.length,
    disclaimer: TAX_RATE_DISCLAIMER,
  };
}
