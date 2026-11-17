/**
 * `recommend_plan` — turn "which plan should I use?" into one concrete answer.
 *
 * Scores the core HelloBooks tiers (Free → Starter → Pro → Business → Scale)
 * against the caller's stated needs and transaction volume, then recommends the
 * LOWEST-priced tier that covers the most needs (you should never be upsold past
 * what you asked for). Prices are resolved per country by reusing `list_plans`,
 * so this tool inherits the same live-feed pricing and fallback behaviour.
 *
 * Read-only, public data only. Add-ons (warehouse/manufacturing) and the free
 * Partner Program (`cpa`) are intentionally excluded from the core ladder and
 * surfaced only as a note.
 */
import { z } from 'zod';
import { listPlans } from './listPlans.js';
import { FREE_TRANSACTION_LIMIT, type CountryCode, type PlanType } from '../data/plans.js';
import {
  PRICED_COUNTRY_CODES,
  SUPPORTED_COUNTRY_CODES,
  type SupportedCountryCode,
} from '../data/supportedCountries.js';

const PRICED_SET = new Set<string>(PRICED_COUNTRY_CODES);

/** Core consumer ladder, cheapest → most capable. */
const TIER_ORDER: PlanType[] = ['free', 'starter', 'pro', 'business', 'scale'];

export const recommendPlanSchema = {
  country: z
    .enum(SUPPORTED_COUNTRY_CODES)
    .optional()
    .describe('ISO country code, for local pricing. Omit for the USD/default list.'),
  needs: z
    .array(z.string().min(1).max(80))
    .max(25)
    .optional()
    .describe('What the business needs, as free-text phrases, e.g. ["GST filing","multi-currency","API access","multi-entity","payroll"].'),
  estimatedAnnualTransactions: z
    .number()
    .int()
    .min(0)
    .max(10_000_000)
    .optional()
    .describe(`Expected ledger transactions per year. Above the Free cap (${FREE_TRANSACTION_LIMIT}) rules out Free.`),
};

export interface RecommendPlanArgs {
  country?: SupportedCountryCode;
  needs?: string[];
  estimatedAnnualTransactions?: number;
}

export interface PlanScore {
  plan: PlanType;
  name: string;
  score: number;
  matchedNeeds: string[];
  unmatchedNeeds: string[];
  monthly: number | null;
  currency: string | null;
  eligible: boolean;
  ineligibleReason?: string;
  signupUrl: string;
}

export interface RecommendPlanResult {
  recommendation: PlanType | null;
  reason: string;
  country: SupportedCountryCode | 'default';
  ranked: PlanScore[];
  note: string;
}

function tokens(s: string): string[] {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(' ').filter((t) => t.length >= 3);
}

export function recommendPlan(args: RecommendPlanArgs): RecommendPlanResult {
  const needs = (args.needs ?? []).map((n) => n.trim()).filter(Boolean);
  const txns = args.estimatedAnnualTransactions;

  // Reuse list_plans for country-correct, live-fed prices + feature bullets.
  const { plans } = listPlans(args.country ? { country: args.country } : {});
  const byTier = new Map(plans.map((p) => [p.plan, p]));

  const ranked: PlanScore[] = [];
  for (const tier of TIER_ORDER) {
    const plan = byTier.get(tier);
    if (!plan) continue;

    // Combined feature haystack: region-neutral + the requested country's
    // bullets. featuresByCountry is keyed only by the 8 priced CountryCodes, so
    // a supported-but-not-priced country (e.g. HK) contributes no region rows.
    const regionBullets =
      args.country && PRICED_SET.has(args.country)
        ? plan.featuresByCountry?.[args.country as CountryCode] ?? []
        : [];
    const hayTokens = new Set(
      [...plan.features, ...regionBullets, plan.tagline, plan.name].flatMap(tokens),
    );

    const matchedNeeds: string[] = [];
    const unmatchedNeeds: string[] = [];
    for (const need of needs) {
      const nt = tokens(need);
      const hit = nt.length > 0 && nt.some((t) => hayTokens.has(t));
      (hit ? matchedNeeds : unmatchedNeeds).push(need);
    }

    // Transaction-cap eligibility (Free only publishes a cap).
    let eligible = true;
    let ineligibleReason: string | undefined;
    if (tier === 'free' && typeof txns === 'number' && txns > FREE_TRANSACTION_LIMIT) {
      eligible = false;
      ineligibleReason = `Free is capped at ${FREE_TRANSACTION_LIMIT} transactions total; ${txns} exceeds it.`;
    }

    const price = plan.prices[0];
    ranked.push({
      plan: tier,
      name: plan.name,
      score: matchedNeeds.length,
      matchedNeeds,
      unmatchedNeeds,
      monthly: price ? price.monthly : null,
      currency: price ? String(price.currency) : null,
      eligible,
      ineligibleReason,
      signupUrl: plan.publicSignupUrl,
    });
  }

  // Pick the recommendation: among eligible tiers, the maximum need-coverage,
  // and among those the cheapest (lowest in TIER_ORDER).
  const eligible = ranked.filter((r) => r.eligible);
  let recommendation: PlanType | null = null;
  let reason = '';
  if (eligible.length === 0) {
    reason = 'No tier is eligible for the given constraints — see ranked[].ineligibleReason.';
  } else if (needs.length === 0) {
    // No stated needs: recommend the entry tier that fits the volume.
    const pick = eligible[0]; // TIER_ORDER is cheapest-first; eligible preserves order
    recommendation = pick.plan;
    reason =
      typeof txns === 'number'
        ? `No specific needs given; ${pick.name} is the lowest tier that fits ${txns} transactions/yr. Pass \`needs\` for a feature-matched recommendation.`
        : `No specific needs given; ${pick.name} is the entry tier. Pass \`needs\` (and \`estimatedAnnualTransactions\`) for a tailored match.`;
  } else {
    const best = Math.max(...eligible.map((r) => r.score));
    const pick = eligible.find((r) => r.score === best)!; // cheapest with best coverage
    recommendation = pick.plan;
    reason =
      best === 0
        ? `None of the stated needs matched a published feature bullet; defaulting to the lowest eligible tier (${pick.name}). Check list_features or rephrase the needs.`
        : `${pick.name} is the lowest-priced eligible tier covering ${best} of ${needs.length} stated need(s): ${pick.matchedNeeds.join(', ')}.`;
  }

  return {
    recommendation,
    reason,
    country: args.country ?? 'default',
    ranked,
    note:
      'Heuristic match over published feature bullets — not a quote. Add-ons (warehouse/manufacturing) and the free Partner Program (cpa) are excluded from the core ladder. Confirm prices with list_plans and features with list_features; checkout discounts may apply.',
  };
}
