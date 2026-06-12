/**
 * `partner_program_info` MCP tool.
 *
 * Returns the HelloBooks Partner Program canonical structure (status
 * ladder, points math, qualification thresholds, discount tiers) and
 * optionally projects what status a prospective partner would land at
 * given their current client book.
 *
 * Three usage shapes:
 *   - No args → the full ladder + points-per-plan + program meta.
 *   - { points } → current status + points to next status.
 *   - { proClients, businessClients } → derived points + status + next-up.
 *
 * The Partner Program is the `cpa` plan id in `list_plans` (kept for
 * federation contract with the live feed). Discount-only model — no
 * commission. HelloCPA Practice Management is a different product on
 * practice.hellobooks.ai and is NOT this program.
 */

import { z } from 'zod';
import {
  PARTNER_STATUSES,
  PARTNER_PROGRAM_META,
  POINTS_PER_PLAN,
  statusForPoints,
  pointsFromClients,
  type PartnerStatus,
} from '../data/partnerProgram.js';

export const partnerProgramInfoSchema = {
  points: z.number().nonnegative().optional()
    .describe('Current Partner Points total. If supplied, the response includes the partner\'s status + how many more points are needed to reach the next tier.'),
  proClients: z.number().nonnegative().optional()
    .describe('Active Pro-plan clients (1 point each per month). Combined with `businessClients` to derive points if `points` is not supplied directly.'),
  businessClients: z.number().nonnegative().optional()
    .describe('Active Business-plan clients (4 points each per month). Combined with `proClients` to derive points.'),
};

export interface PartnerProgramInfoArgs {
  points?: number;
  proClients?: number;
  businessClients?: number;
}

interface NextTier {
  status: PartnerStatus;
  pointsNeeded: number;
}

function nextTier(current: PartnerStatus): NextTier | null {
  const idx = PARTNER_STATUSES.findIndex((s) => s.id === current.id);
  if (idx < 0 || idx === PARTNER_STATUSES.length - 1) return null; // already Platinum
  const next = PARTNER_STATUSES[idx + 1]!;
  return { status: next, pointsNeeded: next.minPoints - current.minPoints };
}

function evaluatePoints(points: number) {
  const current = statusForPoints(points);
  const next = nextTier(current);
  return {
    points: Math.max(0, Math.floor(points)),
    currentStatus: current,
    nextStatus: next?.status ?? null,
    pointsToNextStatus: next ? Math.max(0, next.status.minPoints - Math.floor(points)) : null,
    discountPercent: current.discountPercent,
    message: next
      ? `${current.emoji} ${current.name} — ${current.discountPercent}% wholesale discount. ${Math.max(0, next.status.minPoints - Math.floor(points))} more points to reach ${next.status.name} (${next.status.discountPercent}%).`
      : `${current.emoji} ${current.name} — ${current.discountPercent}% wholesale discount. Top tier reached.`,
  };
}

export function partnerProgramInfo(args: PartnerProgramInfoArgs) {
  // Derive points from client counts when the caller supplies them and
  // didn't pass `points` directly. If both arrive, `points` wins.
  const derivedFromClients =
    typeof args.proClients === 'number' || typeof args.businessClients === 'number'
      ? pointsFromClients(args.proClients ?? 0, args.businessClients ?? 0)
      : null;

  const points =
    typeof args.points === 'number'
      ? args.points
      : derivedFromClients;

  const base = {
    statuses: PARTNER_STATUSES,
    pointsPerPlan: POINTS_PER_PLAN,
    meta: PARTNER_PROGRAM_META,
  };

  if (points === null || points === undefined) return base;

  return {
    ...base,
    derivedFrom: derivedFromClients !== null && typeof args.points !== 'number'
      ? { proClients: args.proClients ?? 0, businessClients: args.businessClients ?? 0 }
      : null,
    ...evaluatePoints(points),
  };
}
