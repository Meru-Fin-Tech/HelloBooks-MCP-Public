/**
 * Free-tier turnover gate (Doc 80).
 *
 * The HelloBooks Free plan is unlimited *features* and *AI credits* (subject
 * to the monthly credit allowance in plans.ts), but caps **annual invoice
 * turnover** per entity, per country. An entity that exceeds the country
 * threshold must move to a paid plan.
 *
 * Basis: ANNUAL INVOICE TURNOVER ONLY.
 *   - Invoices issued in the fiscal year, in the entity's home currency.
 *   - Bank-feed total / cash receipts / gross transaction volume are NOT
 *     used (locked decision per Docs 86/87, 2026-04, after the original
 *     Doc 80 draft considered "any of" inflows; the final spec is
 *     invoices-only so it matches how HelloBooks measures revenue for
 *     reporting and so the metric is deterministic).
 *   - Backend gate shipped in HelloBooks-Backend-Accounting-V3 PR #1501.
 *
 * Public-only: this file mirrors the public marketing limits. No customer
 * data, no per-account fields, no env-driven config.
 */

import type { CountryCode, CurrencyCode } from './plans.js';

export interface FreeTierThreshold {
  country: CountryCode;
  currency: CurrencyCode;
  symbol: string;
  /** Hard cap on annual invoice turnover for the Free plan, in the country's currency. */
  annualInvoiceTurnoverLimit: number;
  /** Human-readable cap, formatted the way the marketing site shows it. */
  display: string;
  /**
   * What counts toward the cap. Locked to `invoices` for all 8 markets per
   * Doc 86/87 — exposed in the type for future-proofing only.
   */
  basis: 'invoices';
}

/**
 * Doc 80 thresholds (2026-04 lock), mirroring the gate that Acc-V3 PR #1501
 * enforces server-side. Numbers are the same value in each country's home
 * currency — they are NOT FX-equivalent — the marketing site picks the
 * threshold appropriate to where the entity is registered.
 */
export const FREE_TIER_THRESHOLDS: readonly FreeTierThreshold[] = [
  { country: 'IN', currency: 'INR', symbol: '₹',     annualInvoiceTurnoverLimit: 4_000_000, display: '₹40 lakh',  basis: 'invoices' },
  { country: 'US', currency: 'USD', symbol: '$',     annualInvoiceTurnoverLimit:   100_000, display: '$100K',     basis: 'invoices' },
  { country: 'GB', currency: 'GBP', symbol: '£',     annualInvoiceTurnoverLimit:    90_000, display: '£90K',      basis: 'invoices' },
  { country: 'AU', currency: 'AUD', symbol: 'A$',    annualInvoiceTurnoverLimit:    75_000, display: 'A$75K',     basis: 'invoices' },
  { country: 'CA', currency: 'CAD', symbol: 'C$',    annualInvoiceTurnoverLimit:    30_000, display: 'C$30K',     basis: 'invoices' },
  { country: 'NZ', currency: 'NZD', symbol: 'NZ$',   annualInvoiceTurnoverLimit:    60_000, display: 'NZ$60K',    basis: 'invoices' },
  { country: 'SG', currency: 'SGD', symbol: 'S$',    annualInvoiceTurnoverLimit:   500_000, display: 'S$500K',    basis: 'invoices' },
  { country: 'AE', currency: 'AED', symbol: 'AED ',  annualInvoiceTurnoverLimit:   187_500, display: 'AED 187.5K', basis: 'invoices' },
];

export const FREE_TIER_THRESHOLD_META = {
  basis: 'annual-invoice-turnover',
  scope: 'per-entity',
  source: 'HelloBooks pricing — Doc 80 (lock-in Docs 86/87, 2026-04)',
  backendEnforcement: 'HelloBooks-Backend-Accounting-V3 PR #1501 (merged)',
  notes:
    'Free plan limits ANNUAL INVOICE TURNOVER per entity in the country currency. Bank-feed total, cash receipts, and gross transaction volume are explicitly NOT used. An entity that crosses its threshold must upgrade to a paid plan (Pro or Business); features and AI credits are unaffected by this gate.',
} as const;
