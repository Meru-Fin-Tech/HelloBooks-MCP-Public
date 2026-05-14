import { z } from 'zod';
import { COMPLIANCE_DEADLINES } from '../data/complianceDeadlines.js';
import type { CountryCode } from '../data/plans.js';
import type { Deadline, DeadlineFrequency } from '../data/complianceDeadlines.js';

export const complianceDeadlinesSchema = {
  country: z.enum(['IN', 'US', 'CA', 'GB', 'AU', 'AE', 'SG', 'NZ']).optional()
    .describe('ISO country code. Filters to one country (IN, AU, GB, US, CA covered today).'),
  frequency: z.enum(['monthly', 'quarterly', 'half-yearly', 'annual', 'per-event']).optional()
    .describe('Filing cadence. Useful for "what are my monthly returns" style queries.'),
  form: z.string().min(2).max(60).optional()
    .describe('Substring match against form name, e.g. "GSTR-3B", "BAS", "1099", "T4". Case-insensitive.'),
};

export interface ComplianceDeadlinesArgs {
  country?: CountryCode;
  frequency?: DeadlineFrequency;
  form?: string;
}

const DISCLAIMER =
  'Statutory due dates rotate annually and authorities grant ad-hoc extensions ' +
  '(e.g. CBIC press releases, ATO bushfire concessions). This catalog is ' +
  'reviewed manually — check the `source` URL on each deadline against the ' +
  'authority site before acting on it, especially for the current filing cycle.';

export function complianceDeadlines(args: ComplianceDeadlinesArgs) {
  let results: Deadline[] = COMPLIANCE_DEADLINES;

  if (args.country) {
    const c = args.country;
    results = results.filter((d) => d.country === c);
  }
  if (args.frequency) {
    const f = args.frequency;
    results = results.filter((d) => d.frequency === f);
  }
  if (args.form) {
    const needle = args.form.toLowerCase();
    results = results.filter((d) => d.form.toLowerCase().includes(needle));
  }

  // Deterministic ordering: country, then frequency, then form name.
  results = [...results].sort((a, b) => {
    if (a.country !== b.country) return a.country.localeCompare(b.country);
    if (a.frequency !== b.frequency) return a.frequency.localeCompare(b.frequency);
    return a.form.localeCompare(b.form);
  });

  return {
    count: results.length,
    deadlines: results,
    disclaimer: DISCLAIMER,
  };
}
