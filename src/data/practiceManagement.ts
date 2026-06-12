/**
 * HelloCPA Practice Management — separate standalone product at
 * `practice.hellobooks.ai`. NOT the same as the Partner Program
 * (which is the discount-only reseller channel for the core
 * Pro/Business plans; see partnerProgram.ts).
 *
 * Source of truth:
 *   Web-Fire-hellobooks.ai/src/lib/practicePricingConfig.ts
 *   2026-06-09 founder decision (the flat "$59.99/mo + $4.99/client"
 *   model was dropped — per-user pricing now).
 *
 * Public-only: this file mirrors what's documented publicly. No per-firm
 * state, no customer data.
 */

import type { CountryCode } from './plans.js';

export type PracticeMgmtStatus = 'shipped' | 'roadmap';

export interface PracticeMgmtPricing {
  /** Price string formatted the way the marketing site shows it. */
  pricePerUserPerMonth: string;
  /** Numeric monthly per-user list price in the region currency. */
  pricePerUserPerMonthAmount: number;
  /** Free-tier user cap. */
  freeUsers: number;
  /** Free-tier client cap. */
  freeClientCap: number;
  /** Users above this threshold get bespoke enterprise pricing. */
  enterpriseThreshold: number;
  /** Trial length on paid tier. */
  trialDays: number;
}

export interface PracticeMgmtRegion {
  region: CountryCode;
  status: PracticeMgmtStatus;
  currency: string;
  symbol: string;
  countryName: string;
  audienceLabel: string;
  competitorFrame: string[];
  /** Present when `status === 'shipped'`; null on roadmap regions. */
  pricing: PracticeMgmtPricing | null;
}

export const PRACTICE_MGMT_REGIONS: readonly PracticeMgmtRegion[] = [
  {
    region: 'US', status: 'shipped',
    currency: 'USD', symbol: '$',
    countryName: 'United States',
    audienceLabel: 'US CPAs, EAs, bookkeepers and tax advisors',
    competitorFrame: ['TaxDome', 'Karbon', 'Canopy', 'Aero Workflow', 'Practice Ignition'],
    pricing: {
      pricePerUserPerMonth: '$9.99 / user / month',
      pricePerUserPerMonthAmount: 9.99,
      freeUsers: 2,
      freeClientCap: 10,
      enterpriseThreshold: 50,
      trialDays: 90,
    },
  },
  {
    region: 'IN', status: 'roadmap',
    currency: 'INR', symbol: '₹',
    countryName: 'India',
    audienceLabel: 'Indian CAs, CMAs, CSes and tax practitioners',
    competitorFrame: ['Suvit', 'Vyapar TaxOne', 'TaxDome', 'Karbon'],
    pricing: null,
  },
  {
    region: 'GB', status: 'roadmap',
    currency: 'GBP', symbol: '£',
    countryName: 'United Kingdom',
    audienceLabel: 'UK ACCA/ICAEW practices, MTD-ready bookkeepers',
    competitorFrame: ['TaxDome', 'Karbon', 'Senta'],
    pricing: null,
  },
  {
    region: 'AU', status: 'roadmap',
    currency: 'AUD', symbol: 'A$',
    countryName: 'Australia',
    audienceLabel: 'Australian CA/CPA/IPA practices',
    competitorFrame: ['Karbon', 'TaxDome', 'Practice Ignition'],
    pricing: null,
  },
  {
    region: 'CA', status: 'roadmap',
    currency: 'CAD', symbol: 'C$',
    countryName: 'Canada',
    audienceLabel: 'Canadian CPA practices',
    competitorFrame: ['TaxDome', 'Karbon', 'Canopy'],
    pricing: null,
  },
  {
    region: 'AE', status: 'roadmap',
    currency: 'AED', symbol: 'AED ',
    countryName: 'United Arab Emirates',
    audienceLabel: 'UAE Tax Agents and audit firms',
    competitorFrame: ['TaxDome', 'Karbon'],
    pricing: null,
  },
  {
    region: 'SG', status: 'roadmap',
    currency: 'SGD', symbol: 'S$',
    countryName: 'Singapore',
    audienceLabel: 'Singapore ACRA-licensed accountants',
    competitorFrame: ['TaxDome', 'Karbon'],
    pricing: null,
  },
  {
    region: 'NZ', status: 'roadmap',
    currency: 'NZD', symbol: 'NZ$',
    countryName: 'New Zealand',
    audienceLabel: 'New Zealand CA ANZ practices',
    competitorFrame: ['Karbon', 'TaxDome'],
    pricing: null,
  },
];

/** Paid-tier feature set. Same across regions; only pricing varies. */
export const PRACTICE_MGMT_PAID_FEATURES: readonly string[] = [
  'Unlimited clients',
  'Full CPQ — proposals + pricing matrix + engagement letters',
  '6-role RBAC (Owner / Admin / Manager / Senior / Staff / Read-Only)',
  'Automation rules + recurring tasks',
  'Team workload + scope-creep dashboards',
  'Time tracking + billing (Stripe Checkout built in)',
  'Gmail + Outlook + Calendar sync',
  'CSV migration from TaxDome / Karbon / Canopy',
];

/** Free-tier feature set, shipped regions. */
export const PRACTICE_MGMT_FREE_FEATURES: readonly string[] = [
  'Up to 2 users',
  'Up to 10 clients',
  'Basic task board',
  'Community support',
  'No credit card required',
];

export const PRACTICE_MGMT_META = {
  name: 'HelloCPA Practice Management',
  product: 'practice-management',
  domain: 'practice.hellobooks.ai',
  signupUrl: 'https://practice.hellobooks.ai/signup',
  pricingModel: 'per-user',
  notRelatedTo: {
    partnerProgram:
      'The Partner Program (cpa plan id in list_plans) is a free reseller channel for the standard Pro/Business plans. HelloCPA Practice Management is a separate paid product for running a CPA / CA firm itself. The two have different audiences, different pricing, and different sign-up flows.',
    helloBooksPlans:
      'list_plans here covers hellobooks.ai (Free / Pro / Business / Partner Program + Warehouse / Manufacturing add-ons). It does NOT include HelloCPA Practice Management — call this tool instead, or visit practice.hellobooks.ai.',
  },
  founderDecision: '2026-06-09 — dropped the flat "$59.99/mo + $4.99/client" model in favour of per-user pricing at $9.99/user/mo (free up to 2 users).',
} as const;
