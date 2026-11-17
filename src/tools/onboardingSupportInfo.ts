/**
 * `onboarding_support` — the paid 1:1 onboarding offer + included support.
 *
 * Surfaces the data that already powers the voice packs as a first-class tool:
 * the hourly hands-on onboarding offer (India ₹5,000 / US $300 for 10 hours),
 * what it covers, the always-included support, and the SEPARATE done-for-you
 * migration service.
 *
 * Guardrail (from the data module): only India and the US have a published
 * hourly offer. For any other country this tool returns `hasHourlyOffer: false`
 * and must NOT invent or currency-convert one — the response says so explicitly.
 * Read-only, public data.
 */
import { z } from 'zod';
import {
  ONBOARDING_SUPPORT_OFFERS,
  ONBOARDING_SUPPORT_REVIEWED,
  INCLUDED_SUPPORT,
  MIGRATION_SERVICE,
  onboardingSupportFor,
  type OnboardingSupportOffer,
} from '../data/onboardingSupport.js';
import { SUPPORTED_COUNTRY_CODES, type SupportedCountryCode } from '../data/supportedCountries.js';

export const onboardingSupportSchema = {
  country: z
    .enum(SUPPORTED_COUNTRY_CODES)
    .optional()
    .describe('ISO country code. Omit to return every published offer.'),
};

export interface OnboardingSupportArgs {
  country?: SupportedCountryCode;
}

export interface OnboardingSupportResult {
  country: SupportedCountryCode | 'all';
  includedSupport: string;
  hasHourlyOffer: boolean;
  offer: OnboardingSupportOffer | null;
  allOffers?: OnboardingSupportOffer[];
  migrationService: string | null;
  reviewed: string;
  note: string;
}

export function onboardingSupport(args: OnboardingSupportArgs): OnboardingSupportResult {
  if (args.country) {
    const offer = onboardingSupportFor(args.country);
    return {
      country: args.country,
      includedSupport: INCLUDED_SUPPORT,
      hasHourlyOffer: offer !== null,
      offer,
      migrationService: MIGRATION_SERVICE[args.country] ?? null,
      reviewed: ONBOARDING_SUPPORT_REVIEWED,
      note: offer
        ? `${args.country} has a published 1:1 onboarding offer (${offer.symbol}${offer.price} for ${offer.hours} hours). The migration service, if any, is separate.`
        : `${args.country} has NO published hourly onboarding offer — do not invent or convert one. Basic support is still included on every plan.`,
    };
  }

  return {
    country: 'all',
    includedSupport: INCLUDED_SUPPORT,
    hasHourlyOffer: true,
    offer: null,
    allOffers: Object.values(ONBOARDING_SUPPORT_OFFERS),
    migrationService: null,
    reviewed: ONBOARDING_SUPPORT_REVIEWED,
    note: 'Paid 1:1 onboarding is published for India and the US only. The done-for-you migration service is separate; pass a `country` to get that country’s migration note. Do not invent an offer for a country not listed.',
  };
}
