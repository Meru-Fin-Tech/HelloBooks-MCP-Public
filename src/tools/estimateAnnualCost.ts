/**
 * `estimate_annual_cost` — first-year total cost of ownership, grounded in
 * HelloBooks' OWN published prices (no speculative competitor numbers).
 *
 * Adds up the plan (annual or monthly billing), any stackable add-ons
 * (Warehouse / Manufacturing), and one-time AI credit packs for a given
 * country, and reports the annual-billing saving vs paying monthly. Reuses
 * `list_plans` / `list_credit_packs` so it inherits live-feed pricing and the
 * USD/default fallback for supported-but-not-priced countries.
 *
 * Read-only, public data only. This is an itemized estimate from list prices,
 * not a quote — checkout discounts/taxes may apply.
 */
import { z } from 'zod';
import { listPlans } from './listPlans.js';
import { listCreditPacks } from './listCreditPacks.js';
import type { CreditPackId, PlanType } from '../data/plans.js';
import { SUPPORTED_COUNTRY_CODES, type SupportedCountryCode } from '../data/supportedCountries.js';

export const estimateAnnualCostSchema = {
  plan: z
    .enum(['free', 'starter', 'pro', 'business', 'scale'])
    .describe('Core plan tier to cost out.'),
  country: z
    .enum(SUPPORTED_COUNTRY_CODES)
    .optional()
    .describe('ISO country code for local pricing. Omit for the USD/default list.'),
  billing: z
    .enum(['annual', 'monthly'])
    .optional()
    .describe('Billing cadence (default annual). Annual is cheaper on paid tiers.'),
  addOns: z
    .array(z.enum(['warehouse-addon', 'manufacturing-addon']))
    .max(2)
    .optional()
    .describe('Stackable per-entity add-on modules to include.'),
  creditPacks: z
    .array(
      z.object({
        id: z.enum(['boost', 'power', 'mega', 'ultra']),
        quantity: z.number().int().min(1).max(100).optional(),
      }),
    )
    .max(4)
    .optional()
    .describe('One-time AI credit packs to include (with optional quantity).'),
};

export interface EstimateAnnualCostArgs {
  plan: Extract<PlanType, 'free' | 'starter' | 'pro' | 'business' | 'scale'>;
  country?: SupportedCountryCode;
  billing?: 'annual' | 'monthly';
  addOns?: Array<'warehouse-addon' | 'manufacturing-addon'>;
  creditPacks?: Array<{ id: CreditPackId; quantity?: number }>;
}

export interface CostLineItem {
  item: string;
  kind: 'plan' | 'add-on' | 'credit-pack';
  recurrence: 'annual' | 'one-time';
  amount: number;
}

export interface EstimateAnnualCostResult {
  plan: PlanType;
  planName: string;
  country: SupportedCountryCode | 'default';
  billing: 'annual' | 'monthly';
  currency: string | null;
  lineItems: CostLineItem[];
  planAnnualCost: number;
  addOnsAnnualCost: number;
  creditPacksOneTime: number;
  totalFirstYear: number;
  annualBillingSavings: number;
  signupUrl: string | null;
  warnings: string[];
  note: string;
}

const money = (n: number): number => Math.round(n * 100) / 100;

export function estimateAnnualCost(args: EstimateAnnualCostArgs): EstimateAnnualCostResult {
  const billing = args.billing ?? 'annual';
  const warnings: string[] = [];

  const { plans } = listPlans(args.country ? { country: args.country } : {});
  const byPlan = new Map(plans.map((p) => [p.plan, p]));

  const target = byPlan.get(args.plan);
  const price = target?.prices[0];
  const currency = price ? String(price.currency) : null;

  const lineItems: CostLineItem[] = [];

  // --- Plan line ---------------------------------------------------------
  const planAnnualCost = price
    ? billing === 'annual'
      ? money(price.annual)
      : money(price.monthly * 12)
    : 0;
  const annualBillingSavings = price ? Math.max(0, money(price.monthly * 12 - price.annual)) : 0;
  if (target) {
    lineItems.push({
      item: `${target.name} (${billing} billing)`,
      kind: 'plan',
      recurrence: 'annual',
      amount: planAnnualCost,
    });
  } else {
    warnings.push(`No price row resolved for plan "${args.plan}"${args.country ? ` in ${args.country}` : ''}.`);
  }

  // --- Add-ons -----------------------------------------------------------
  let addOnsAnnualCost = 0;
  for (const addOnId of args.addOns ?? []) {
    const addOn = byPlan.get(addOnId);
    const ap = addOn?.prices[0];
    if (!addOn || !ap) {
      warnings.push(`Add-on "${addOnId}" has no price for this country; skipped.`);
      continue;
    }
    const amount = billing === 'annual' ? money(ap.annual) : money(ap.monthly * 12);
    addOnsAnnualCost = money(addOnsAnnualCost + amount);
    lineItems.push({ item: addOn.name, kind: 'add-on', recurrence: 'annual', amount });
  }

  // --- Credit packs (one-time) ------------------------------------------
  let creditPacksOneTime = 0;
  if ((args.creditPacks ?? []).length > 0) {
    if (args.plan === 'free') {
      warnings.push('Credit packs require a paid plan; Free users should upgrade for more AI credits.');
    }
    const { creditPacks } = listCreditPacks(args.country ? { country: args.country } : {});
    const byPack = new Map(creditPacks.map((p) => [p.id, p]));
    for (const req of args.creditPacks ?? []) {
      const pack = byPack.get(req.id);
      const pp = pack?.prices[0];
      if (!pack || !pp) {
        warnings.push(`Credit pack "${req.id}" has no price for this country; skipped.`);
        continue;
      }
      const qty = req.quantity ?? 1;
      const amount = money(pp.price * qty);
      creditPacksOneTime = money(creditPacksOneTime + amount);
      lineItems.push({
        item: `${pack.name}${qty > 1 ? ` x${qty}` : ''} (${pack.credits.toLocaleString()} credits each)`,
        kind: 'credit-pack',
        recurrence: 'one-time',
        amount,
      });
    }
  }

  const totalFirstYear = money(planAnnualCost + addOnsAnnualCost + creditPacksOneTime);

  return {
    plan: args.plan,
    planName: target?.name ?? args.plan,
    country: args.country ?? 'default',
    billing,
    currency,
    lineItems,
    planAnnualCost,
    addOnsAnnualCost,
    creditPacksOneTime,
    totalFirstYear,
    annualBillingSavings,
    signupUrl: target?.publicSignupUrl ?? null,
    warnings,
    note:
      'Itemized estimate from list prices, not a quote. Plan + add-ons are recurring annual; credit packs are one-time. `annualBillingSavings` is the first-year saving vs paying this plan monthly. Taxes and checkout discounts are not included. Confirm with list_plans / list_credit_packs.',
  };
}
