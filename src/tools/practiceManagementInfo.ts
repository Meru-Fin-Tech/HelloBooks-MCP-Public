/**
 * `practice_management_info` MCP tool.
 *
 * Exposes HelloCPA Practice Management (the standalone product on
 * practice.hellobooks.ai) — NOT the Partner Program and NOT a tier in
 * list_plans. Has its own pricing model ($9.99/user/month in the US, free
 * up to 2 users + 10 clients) and is shipped only in the US so far;
 * the other 7 markets are roadmap.
 *
 * Two usage shapes:
 *   - No args → full region table + paid/free features + meta
 *   - { country } → that region's status, pricing (if shipped),
 *     audience, competitor frame
 */

import { z } from 'zod';
import {
  PRACTICE_MGMT_REGIONS,
  PRACTICE_MGMT_PAID_FEATURES,
  PRACTICE_MGMT_FREE_FEATURES,
  PRACTICE_MGMT_META,
} from '../data/practiceManagement.js';
import type { CountryCode } from '../data/plans.js';

export const practiceManagementInfoSchema = {
  country: z.enum(['IN', 'US', 'CA', 'GB', 'AU', 'AE', 'SG', 'NZ']).optional()
    .describe('ISO country code. Omit to get the full 8-region matrix. US is shipped; the other 7 are roadmap as of 2026-06-12.'),
};

export interface PracticeManagementInfoArgs {
  country?: CountryCode;
}

export function practiceManagementInfo(args: PracticeManagementInfoArgs) {
  const base = {
    paidFeatures: PRACTICE_MGMT_PAID_FEATURES,
    freeFeatures: PRACTICE_MGMT_FREE_FEATURES,
    meta: PRACTICE_MGMT_META,
  };

  if (!args.country) {
    const shipped = PRACTICE_MGMT_REGIONS.filter((r) => r.status === 'shipped').length;
    return {
      ...base,
      regions: PRACTICE_MGMT_REGIONS,
      count: PRACTICE_MGMT_REGIONS.length,
      shippedCount: shipped,
      roadmapCount: PRACTICE_MGMT_REGIONS.length - shipped,
    };
  }

  const region = PRACTICE_MGMT_REGIONS.find((r) => r.region === args.country);
  if (!region) {
    // Schema z.enum already restricts this, so it's a defensive belt.
    throw new Error(`No HelloCPA Practice Management region registered for country ${args.country}.`);
  }
  return { ...base, region };
}
