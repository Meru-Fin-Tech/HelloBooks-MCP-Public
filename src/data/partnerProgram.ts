/**
 * HelloBooks Partner Program — the free reseller channel for the standard
 * Pro/Business plans. Mirrors the canonical handbook at
 *   Growth-Strategy/partner-handbook.md (2026-06-09)
 * and the `cpa` plan in plans.ts.
 *
 * Model: earned wholesale discount. Free to join. A partner accumulates
 * Partner Points by keeping clients on paid plans (Pro = 1 pt/mo,
 * Business = 4 pts/mo). Total points map to one of four statuses
 * (Bronze → Silver → Gold → Platinum); each status unlocks a bigger
 * wholesale discount on the standard plan price.
 *
 * Discount-only, NOT commission/rev-share — decided 2026-06-09.
 *
 * Public-only: this file mirrors what the marketing site documents.
 * No customer data, no per-partner state.
 */

export type PartnerStatusId = 'unranked' | 'bronze' | 'silver' | 'gold' | 'platinum';

export interface PartnerStatus {
  id: PartnerStatusId;
  name: string;
  emoji: string;
  /** Minimum Partner Points to reach this status. Inclusive. */
  minPoints: number;
  /** Maximum points before promotion. null = unbounded (Platinum). */
  maxPoints: number | null;
  /** Wholesale discount applied to standard Pro/Business plan prices. */
  discountPercent: number;
  /** New perk unlocked at this status. */
  benefit: string;
}

/**
 * Status ladder, mirroring `Growth-Strategy/partner-handbook.md §2`.
 * Sorted by `minPoints` ascending so a points-to-status lookup is a
 * simple .find() in reverse.
 */
export const PARTNER_STATUSES: readonly PartnerStatus[] = [
  {
    id: 'unranked', name: 'Unranked', emoji: '🆕',
    minPoints: 0, maxPoints: 24, discountPercent: 0,
    benefit: 'Activated partner — no wholesale discount yet. Sign your first client to start earning points.',
  },
  {
    id: 'bronze', name: 'Bronze', emoji: '🥉',
    minPoints: 25, maxPoints: 74, discountPercent: 5,
    benefit: 'Partner portal access + marketing resources.',
  },
  {
    id: 'silver', name: 'Silver', emoji: '🥈',
    minPoints: 75, maxPoints: 299, discountPercent: 10,
    benefit: 'Early-access beta features + co-branded materials + priority support.',
  },
  {
    id: 'gold', name: 'Gold', emoji: '🥇',
    minPoints: 300, maxPoints: 999, discountPercent: 15,
    benefit: 'Dedicated account manager + featured placement in /find-an-accountant directory.',
  },
  {
    id: 'platinum', name: 'Platinum', emoji: '💎',
    minPoints: 1000, maxPoints: null, discountPercent: 20,
    benefit: 'Co-marketing opportunities + direct product-roadmap input.',
  },
];

/** Points earned per month per active paid client. */
export const POINTS_PER_PLAN = {
  pro: 1,
  business: 4,
} as const;

export const PARTNER_PROGRAM_META = {
  /** Plan id in `list_plans` that maps to this program. */
  planId: 'cpa' as const,
  signupUrl: 'https://hellobooks.ai/partner-program/apply',
  directoryUrl: 'https://hellobooks.ai/find-an-accountant',
  handbookSource: 'Growth-Strategy/partner-handbook.md (2026-06-09 founder decision)',
  model: 'earned-wholesale-discount',
  commission: 'none — discount-only model (no rev-share)',
  joiningFee: 0,
  notes:
    'The Partner Program replaces the retired "$59.99/mo + $4.99/client + 10% commission" CPA SKU. Partners resell standard Pro/Business plans to clients at the earned wholesale discount; the discount is applied directly to billing, not paid out as commission. HelloCPA Practice Management at practice.hellobooks.ai is a separate product ($9.99/user/mo, free up to 2 users) and is NOT the Partner Program.',
} as const;

/** Resolve a status from a points total. Always returns a status (Unranked at 0). */
export function statusForPoints(points: number): PartnerStatus {
  const safe = Math.max(0, Math.floor(points));
  // Walk ladder in reverse so the first match is the highest qualifying tier.
  for (let i = PARTNER_STATUSES.length - 1; i >= 0; i--) {
    const s = PARTNER_STATUSES[i]!;
    if (safe >= s.minPoints) return s;
  }
  return PARTNER_STATUSES[0]!;
}

/** Compute points from a client count split by plan type. */
export function pointsFromClients(proClients: number, businessClients: number): number {
  const pro = Math.max(0, Math.floor(proClients));
  const biz = Math.max(0, Math.floor(businessClients));
  return pro * POINTS_PER_PLAN.pro + biz * POINTS_PER_PLAN.business;
}
