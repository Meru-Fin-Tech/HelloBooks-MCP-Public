import { z } from 'zod';
import { INTEGRATIONS } from '../data/integrations.js';
import type { Integration, IntegrationCategory } from '../data/integrations.js';
import type { CountryCode } from '../data/plans.js';

const CATEGORIES: IntegrationCategory[] = [
  'banking', 'payment', 'payroll', 'time-tracking', 'shipping',
  'tax-compliance', 'accounting-sync', 'ecommerce', 'crm',
];

export const listIntegrationsSchema = {
  category: z.enum(CATEGORIES as [IntegrationCategory, ...IntegrationCategory[]])
    .optional()
    .describe('Filter to one integration category.'),
  country: z.enum(['IN', 'US', 'CA', 'GB', 'AU', 'AE', 'SG', 'NZ']).optional()
    .describe('Only return integrations available in this country (or global).'),
  status: z.enum(['live', 'beta', 'coming-soon']).optional()
    .describe('Filter by rollout status.'),
};

export interface ListIntegrationsArgs {
  category?: IntegrationCategory;
  country?: CountryCode;
  status?: 'live' | 'beta' | 'coming-soon';
}

export function listIntegrations(args: ListIntegrationsArgs) {
  let results: Integration[] = INTEGRATIONS;
  if (args.category) results = results.filter((i) => i.category === args.category);
  if (args.status) results = results.filter((i) => i.status === args.status);
  if (args.country) {
    const c = args.country;
    results = results.filter((i) => i.countries.length === 0 || i.countries.includes(c));
  }
  return {
    integrations: results,
    count: results.length,
    source: 'https://hellobooks.ai/integration',
  };
}
