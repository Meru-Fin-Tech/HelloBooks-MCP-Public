/**
 * `compare_plans` — side-by-side diff of two HelloBooks tiers.
 *
 * Answers "Pro vs Business?" with the concrete differences: price (monthly +
 * annual), AI credit allowance, transaction limits, and the features each tier
 * has that the other does not (plus what they share). Reuses `list_plans` for
 * country-correct, live-fed pricing and feature bullets. Read-only.
 */
import { z } from 'zod';
import type { PlanType } from '../data/plans.js';
import { listPlans } from './listPlans.js';
import {
  PRICED_COUNTRY_CODES,
  SUPPORTED_COUNTRY_CODES,
  type SupportedCountryCode,
} from '../data/supportedCountries.js';
import type { CountryCode } from '../data/plans.js';

const PRICED_SET = new Set<string>(PRICED_COUNTRY_CODES);

const PLAN_ENUM = ['free', 'starter', 'pro', 'business', 'scale', 'cpa'] as const;

export const comparePlansSchema = {
  planA: z.enum(PLAN_ENUM).describe('First plan tier to compare.'),
  planB: z.enum(PLAN_ENUM).describe('Second plan tier to compare.'),
  country: z
    .enum(SUPPORTED_COUNTRY_CODES)
    .optional()
    .describe('ISO country code for local pricing + region features. Omit for USD/default.'),
};

export interface ComparePlansArgs {
  planA: Extract<PlanType, (typeof PLAN_ENUM)[number]>;
  planB: Extract<PlanType, (typeof PLAN_ENUM)[number]>;
  country?: SupportedCountryCode;
}

interface PlanSide {
  plan: PlanType;
  name: string;
  monthly: number | null;
  annual: number | null;
  currency: string | null;
  monthlyAiCredits: number | null;
  aiCreditsNote?: string;
  transactionLimit: number | null;
  transactionLimitBasis: 'lifetime' | 'annual' | null;
  signupUrl: string;
}

export interface ComparePlansResult {
  country: SupportedCountryCode | 'default';
  a: PlanSide | null;
  b: PlanSide | null;
  priceDeltaMonthly: number | null;
  priceDeltaAnnual: number | null;
  cheaperMonthly: PlanType | 'equal' | null;
  sharedFeatures: string[];
  onlyInA: string[];
  onlyInB: string[];
  note: string;
}

function featuresFor(
  plan: { features: string[]; featuresByCountry?: Partial<Record<CountryCode, string[]>> },
  country?: SupportedCountryCode,
): string[] {
  const region =
    country && PRICED_SET.has(country) ? plan.featuresByCountry?.[country as CountryCode] ?? [] : [];
  // Dedupe while preserving order.
  return [...new Set([...plan.features, ...region])];
}

function toSide(
  plan: ReturnType<typeof listPlans>['plans'][number] | undefined,
): PlanSide | null {
  if (!plan) return null;
  const price = plan.prices[0];
  return {
    plan: plan.plan,
    name: plan.name,
    monthly: price ? price.monthly : null,
    annual: price ? price.annual : null,
    currency: price ? String(price.currency) : null,
    monthlyAiCredits: plan.monthlyAiCredits,
    aiCreditsNote: plan.aiCreditsNote,
    transactionLimit: plan.lifetimeTransactionLimit ?? plan.annualTransactionLimit ?? null,
    transactionLimitBasis:
      plan.lifetimeTransactionLimit != null
        ? 'lifetime'
        : plan.annualTransactionLimit != null
          ? 'annual'
          : null,
    signupUrl: plan.publicSignupUrl,
  };
}

export function comparePlans(args: ComparePlansArgs): ComparePlansResult {
  const { plans } = listPlans(args.country ? { country: args.country } : {});
  const byPlan = new Map(plans.map((p) => [p.plan, p]));
  const planA = byPlan.get(args.planA);
  const planB = byPlan.get(args.planB);

  const a = toSide(planA);
  const b = toSide(planB);

  const featsA = planA ? featuresFor(planA, args.country) : [];
  const featsB = planB ? featuresFor(planB, args.country) : [];
  const setBNorm = new Set(featsB.map((f) => f.toLowerCase().trim()));
  const setANorm = new Set(featsA.map((f) => f.toLowerCase().trim()));
  const sharedFeatures = featsA.filter((f) => setBNorm.has(f.toLowerCase().trim()));
  const onlyInA = featsA.filter((f) => !setBNorm.has(f.toLowerCase().trim()));
  const onlyInB = featsB.filter((f) => !setANorm.has(f.toLowerCase().trim()));

  const priceDeltaMonthly =
    a?.monthly != null && b?.monthly != null ? Math.round((b.monthly - a.monthly) * 100) / 100 : null;
  const priceDeltaAnnual =
    a?.annual != null && b?.annual != null ? Math.round((b.annual - a.annual) * 100) / 100 : null;
  const cheaperMonthly =
    a?.monthly != null && b?.monthly != null
      ? a.monthly < b.monthly
        ? args.planA
        : b.monthly < a.monthly
          ? args.planB
          : 'equal'
      : null;

  return {
    country: args.country ?? 'default',
    a,
    b,
    priceDeltaMonthly,
    priceDeltaAnnual,
    cheaperMonthly,
    sharedFeatures,
    onlyInA,
    onlyInB,
    note:
      !a || !b
        ? 'One or both plans had no price row for this country; feature lists may still differ. Confirm with list_plans.'
        : `${a.name} vs ${b.name}: priceDeltaMonthly is ${b.name} minus ${a.name} in the local currency. Features are from published bullets; confirm specifics with list_features.`,
  };
}
