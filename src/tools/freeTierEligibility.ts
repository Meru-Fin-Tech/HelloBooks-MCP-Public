/**
 * `free_tier_eligibility` MCP tool.
 *
 * Tells an AI agent whether a business qualifies for the HelloBooks Free
 * plan given its country and (optionally) annual invoice revenue. Three
 * usage shapes:
 *
 *   - No arguments → full 8-country threshold table (reference call).
 *   - { country } → one country's threshold + display string.
 *   - { country, annualInvoiceRevenue } → threshold + a `freeEligible`
 *     verdict and the headroom (positive = under cap, negative = over).
 *
 * Drift register item #6 (pricing-canon-drift-register memory) — the
 * turnover gate was missing from every public-facing surface; this is the
 * MCP side of that fix. Backend enforcement is Acc-V3 PR #1501.
 */

import { z } from 'zod';
import {
  FREE_TIER_THRESHOLDS,
  FREE_TIER_THRESHOLD_META,
  type FreeTierThreshold,
} from '../data/freeTierThresholds.js';
import type { CountryCode } from '../data/plans.js';

export const freeTierEligibilitySchema = {
  country: z.enum(['IN', 'US', 'CA', 'GB', 'AU', 'AE', 'SG', 'NZ']).optional()
    .describe('ISO country code of the entity. Omit to return the full 8-country threshold table.'),
  annualInvoiceRevenue: z.number().nonnegative().optional()
    .describe('Annual invoice turnover for the entity, in its home currency (NOT USD-equivalent). Only used when `country` is also provided — the tool then returns a `freeEligible` verdict. Bank-feed total and cash receipts are explicitly NOT used by the gate.'),
};

export interface FreeTierEligibilityArgs {
  country?: CountryCode;
  annualInvoiceRevenue?: number;
}

interface CountryEligibility extends FreeTierThreshold {
  freeEligible: boolean;
  headroom: number;
  message: string;
}

function evaluate(t: FreeTierThreshold, revenue: number): CountryEligibility {
  const headroom = t.annualInvoiceTurnoverLimit - revenue;
  const freeEligible = revenue <= t.annualInvoiceTurnoverLimit;
  const formatted = `${t.symbol}${Math.abs(headroom).toLocaleString('en-US')}`;
  const message = freeEligible
    ? `Eligible for Free — ${formatted} of headroom before the ${t.display} annual invoice turnover cap.`
    : `Not eligible for Free — exceeds the ${t.display} annual invoice turnover cap by ${formatted}. Move to Pro or Business.`;
  return { ...t, freeEligible, headroom, message };
}

export function freeTierEligibility(args: FreeTierEligibilityArgs) {
  if (!args.country) {
    return {
      thresholds: FREE_TIER_THRESHOLDS,
      count: FREE_TIER_THRESHOLDS.length,
      meta: FREE_TIER_THRESHOLD_META,
    };
  }

  const country = args.country;
  const threshold = FREE_TIER_THRESHOLDS.find((t) => t.country === country);
  if (!threshold) {
    // Schema z.enum already restricts this, so this is a defensive belt.
    throw new Error(`No Free-tier threshold registered for country ${country}.`);
  }

  if (typeof args.annualInvoiceRevenue === 'number') {
    return {
      ...evaluate(threshold, args.annualInvoiceRevenue),
      meta: FREE_TIER_THRESHOLD_META,
    };
  }

  return { ...threshold, meta: FREE_TIER_THRESHOLD_META };
}
