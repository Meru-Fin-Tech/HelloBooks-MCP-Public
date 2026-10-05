/**
 * Voice knowledge pack — everything an AI phone agent needs to talk about
 * HelloBooks with one customer, precompiled per country.
 *
 * Why a pack and not retrieval: a phone call cannot afford a lookup per
 * question (latency the caller hears, plus tokens on every turn). The pack is
 * small enough (~1.5k tokens) to sit in the agent's system prompt for the
 * whole call, where provider-side prompt caching makes it nearly free after
 * the first turn. Callers (HelloCRM) fetch it once per call — or keep it and
 * revalidate with If-None-Match — and never query anything mid-call.
 *
 * Sources, all already maintained in this repo:
 *   prices + plan bullets   pricingFeed (live hellobooks.ai feed, baked fallback)
 *   billing currency        data/billingParity
 *   GST / filing deadlines  data/complianceDeadlines, data/countries
 *   onboarding support      data/onboardingSupport
 *
 * `version` is a content hash: it changes exactly when something the agent
 * would say changes, so it doubles as the HTTP ETag. `generatedAt` is when this
 * copy was built; `factsAsOf` is when the underlying pricing was last updated.
 */

import { createHash } from 'node:crypto';
import { getPricingMeta } from './pricingFeed.js';
import { listPlans } from './tools/listPlans.js';
import type { Plan, PlanPrice, PlanType } from './data/plans.js';
import { getSupportedCountry, isSupportedCountryCode } from './data/supportedCountries.js';
import { COMPLIANCE_DEADLINES } from './data/complianceDeadlines.js';
import { COUNTRY_SUPPORT } from './data/countries.js';
import { isBilledInUsd } from './data/billingParity.js';
import {
  INCLUDED_SUPPORT,
  MIGRATION_SERVICE,
  ONBOARDING_SUPPORT_REVIEWED,
  onboardingSupportFor,
  type OnboardingSupportOffer,
} from './data/onboardingSupport.js';

export const VOICE_PACK_SCHEMA = 'hellobooks.voice-pack/v1';

const VOICE_PLANS: readonly PlanType[] = ['free', 'starter', 'pro', 'business', 'scale'];
const MAX_BULLETS = 6;

export interface VoicePlan {
  plan: PlanType;
  name: string;
  currency: string;
  monthly: number;
  annual: number;
  /** Spoken form, e.g. "₹499 a month or ₹4,999 a year". */
  priceSpoken: string;
  /** Set when checkout charges something other than the advertised figure. */
  chargedAs?: string;
  highlights: string[];
}

export interface VoicePack {
  schema: typeof VOICE_PACK_SCHEMA;
  version: string;
  country: string;
  countryName: string;
  generatedAt: string;
  factsAsOf: string;
  pricingSource: 'live-feed' | 'static-fallback';
  plans: VoicePlan[];
  onboardingSupport: (Omit<OnboardingSupportOffer, 'covers'> & { covers: string[]; spoken: string }) | null;
  includedSupport: string;
  migrationService: string | null;
  compliance: { headline: string; points: string[]; deadlines: string[] } | null;
  guardrails: string[];
  conversation: { objectives: string[]; discoveryQuestions: string[]; closing: string[] };
  /** The whole pack as one prompt-ready block. Put this in the system prompt. */
  text: string;
  approxTokens: number;
}

function money(symbol: string, currency: string, n: number): string {
  const locale = currency === 'INR' ? 'en-IN' : 'en-US';
  const digits = Number.isInteger(n) ? 0 : 2;
  return `${symbol}${n.toLocaleString(locale, { minimumFractionDigits: digits, maximumFractionDigits: 2 })}`;
}

// India has no bank feeds — strip any feed/connection bullet even when the
// global (baked) list is all we have. Mirrors Web-Fire withoutFeedClaims().
const NO_BANK_FEED_COUNTRIES = new Set(['IN']);
const BANK_FEED_CLAIM = /bank (feed|connection)/i;

function highlightsFor(plan: Plan, pricingCountry: string, country: string): string[] {
  const bullets = plan.featuresByCountry?.[pricingCountry as keyof NonNullable<Plan['featuresByCountry']>] ?? plan.features;
  return bullets
    .filter((b) => !b.trim().endsWith(':') && !/see below/i.test(b))
    .filter((b) => !(NO_BANK_FEED_COUNTRIES.has(country) && BANK_FEED_CLAIM.test(b)))
    .slice(0, MAX_BULLETS);
}

function usdListFor(plan: PlanType): PlanPrice | undefined {
  return listPlans({ country: 'US', plan }).plans[0]?.prices[0];
}

function buildPlans(country: string): VoicePlan[] {
  const { plans } = listPlans({ country: country as Parameters<typeof listPlans>[0]['country'] });
  const out: VoicePlan[] = [];
  for (const plan of plans) {
    if (!VOICE_PLANS.includes(plan.plan)) continue;
    const price = plan.prices[0];
    if (!price) continue; // tier not sold in this country (e.g. Starter outside the US)
    const pricingCountry = price.pricingCountry ?? price.country;
    const priceSpoken = price.monthly === 0
      ? 'free'
      : `${money(price.symbol, price.currency, price.monthly)} a month or ${money(price.symbol, price.currency, price.annual)} a year`;

    let chargedAs: string | undefined;
    if (price.monthly > 0 && isBilledInUsd(country)) {
      const usd = usdListFor(plan.plan);
      if (usd) chargedAs = `checkout charges US dollars today: US$${usd.monthly} a month or US$${usd.annual} a year`;
    } else if (price.monthly > 0 && price.pricingCountry && price.pricingCountry !== country) {
      chargedAs = `no local price list yet; this is the US-dollar price checkout charges`;
    }

    out.push({
      plan: plan.plan,
      name: plan.name,
      currency: price.currency,
      monthly: price.monthly,
      annual: price.annual,
      priceSpoken,
      ...(chargedAs ? { chargedAs } : {}),
      highlights: highlightsFor(plan, pricingCountry, country),
    });
  }
  return out;
}

function dueLine(d: (typeof COMPLIANCE_DEADLINES)[number]): string | null {
  if (d.dueDay) return `${d.form}: due the ${ordinal(d.dueDay)} of the following month${d.frequency === 'quarterly' ? ' after the quarter' : ''}`;
  if (d.annualDates?.length) return `${d.form}: due ${d.annualDates.join(', ')}`;
  return null; // rule-based due dates are too long to read out; the agent offers to email them
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

function buildCompliance(country: string): VoicePack['compliance'] {
  if (country === 'IN') {
    const ids = ['gstr-1', 'gstr-1-qrmp', 'gstr-3b', 'gstr-3b-qrmp', 'gstr-9'];
    const deadlines = COMPLIANCE_DEADLINES
      .filter((d) => ids.includes(d.id))
      .map((d) => (d.id === 'gstr-3b-qrmp'
        ? 'GSTR-3B (quarterly, QRMP): due the 22nd or 24th after the quarter, depending on the state'
        : dueLine(d)))
      .filter((l): l is string => l !== null);
    return {
      headline: 'GST returns are filed directly from inside HelloBooks to the GST portal — no export and re-upload.',
      points: [
        'GSTR-1 and GSTR-3B filing is included free, on the Free plan too.',
        'GSTR-3B is computed from their books; they can review each table and see the net tax payable and cash outflow before filing.',
        'GSTR-2B is fetched and reconciled against purchases, with input tax credit tracking.',
        'GSTR-9 is generated ready to file on Pro and above.',
        'Late fee and interest shown are the figures the GST portal reports, not an estimate.',
        'GST filing never uses AI credits.',
        'E-invoicing and e-way bills are on paid plans.',
        'Free covers one GSTIN. Pro covers every GSTIN under one PAN (multi-state). Business covers several legal entities.',
      ],
      deadlines,
    };
  }
  const support = COUNTRY_SUPPORT.find((c) => c.country === country);
  if (!support || support.compliance.length === 0) return null;
  const live = support.compliance.filter((c) => c.status === 'live').map((c) => c.label);
  const soon = support.compliance.filter((c) => c.status !== 'live').map((c) => c.label);
  if (live.length === 0 && soon.length === 0) return null;
  return {
    headline: `Local compliance for ${support.countryName}.`,
    points: [
      ...(live.length ? [`Live today: ${live.join(', ')}.`] : []),
      ...(soon.length ? [`Not live yet (do not promise a date): ${soon.join(', ')}.`] : []),
    ],
    deadlines: COMPLIANCE_DEADLINES.filter((d) => d.country === country)
      .map(dueLine).filter((l): l is string => l !== null).slice(0, 4),
  };
}

function buildGuardrails(country: string): string[] {
  const g = [
    'If asked whether you are a person, say plainly that you are HelloBooks’ AI assistant. Never claim to be human.',
    'Only state facts from this pack. If unsure, say you will have the team confirm by email — never guess a price, date or feature.',
    'Never ask for or accept passwords, OTPs, card or bank details on the call. Payments happen in the app or by an invoice link.',
    'Product help only — no tax, legal or investment advice. For a tax position, suggest their accountant or the paid onboarding support.',
    'Do not name any software vendor, GST provider or technology partner behind HelloBooks.',
    'Never say a plan, price or feature is "new" or "limited time". Do not offer discounts.',
    'If they ask not to be called again, agree, apologise for the interruption, and end the call.',
  ];
  if (country === 'IN') {
    g.push('India has no live bank feeds. Say "bank statement import" — never promise automatic bank feeds in India. Razorpay, Cashfree and UPI payment reconciliation are available.');
    g.push('India prices are before GST.');
  }
  if (isBilledInUsd(country)) {
    g.push('When asked what they will pay, give the US-dollar amount checkout charges today, not the local-currency website figure.');
  }
  return g;
}

function buildConversation(country: string, offer: OnboardingSupportOffer | null): VoicePack['conversation'] {
  return {
    objectives: [
      'Welcome them — they just finished setting up their company on HelloBooks.',
      'Learn what they want HelloBooks to do for them, and answer their questions.',
      ...(country === 'IN' ? ['Check whether they file GST and how (monthly or quarterly); explain GSTR-1 and GSTR-3B filing from HelloBooks.'] : []),
      offer
        ? 'Mention the included support, then offer the paid 1:1 onboarding support if they want hands-on help.'
        : 'Mention the included support; for hands-on help, say the team will email options.',
      'Agree next steps and tell them a written summary of the call is coming by email.',
    ],
    discoveryQuestions: [
      'What made you sign up — what are you hoping HelloBooks will take off your plate?',
      'What are you using for your books today?',
      'Who else on your team will use it — you, an accountant, staff?',
      ...(country === 'IN' ? ['Are you GST registered, and do you file monthly or quarterly?'] : []),
      'Is there anything you got stuck on while setting up?',
    ],
    closing: [
      'Summarise in one or two sentences what they said they are looking for and what happens next.',
      'Confirm the email address the summary should go to.',
      ...(offer ? [`If they want onboarding support, ask whether Google Meet or Zoom suits them better and a good day and time.`] : []),
      'Thank them and end warmly. Keep the call under ten minutes unless they want to keep going.',
    ],
  };
}

function renderText(p: Omit<VoicePack, 'text' | 'approxTokens' | 'version'>, version: string): string {
  const lines: string[] = [];
  lines.push(`HELLOBOOKS KNOWLEDGE — ${p.countryName} (${p.country})`);
  lines.push(`Pack ${version}. Facts as of ${p.factsAsOf}; built ${p.generatedAt}. Pricing source: ${p.pricingSource}.`);
  if (p.pricingSource === 'static-fallback') {
    lines.push('Prices are from the built-in fallback, not the live price list: if asked, quote them but say the team will confirm by email.');
  }
  lines.push('', 'You are HelloBooks’ onboarding assistant on a phone call. Speak naturally and briefly, one idea at a time, like a helpful colleague. Ask one question, then listen.');
  lines.push('', 'PLANS');
  for (const plan of p.plans) {
    const charged = plan.chargedAs ? ` (${plan.chargedAs})` : '';
    lines.push(`- ${plan.name}: ${plan.priceSpoken}${charged}. ${plan.highlights.join('; ')}.`);
  }
  lines.push('- Accountants and bookkeepers: free Partner Program to manage and resell to their clients.');
  lines.push('Full price list: hellobooks.ai/pricing');

  lines.push('', 'SUPPORT');
  lines.push(`- ${p.includedSupport}`);
  if (p.onboardingSupport) lines.push(`- ${p.onboardingSupport.spoken}`);
  if (p.migrationService) lines.push(`- ${p.migrationService} Only if they ask about moving existing data.`);

  if (p.compliance) {
    lines.push('', p.country === 'IN' ? 'GST' : 'COMPLIANCE');
    lines.push(`- ${p.compliance.headline}`);
    for (const pt of p.compliance.points) lines.push(`- ${pt}`);
    if (p.compliance.deadlines.length) lines.push(`- Due dates: ${p.compliance.deadlines.join('; ')}.`);
  }

  lines.push('', 'RULES');
  for (const g of p.guardrails) lines.push(`- ${g}`);

  lines.push('', 'CALL');
  lines.push(`Goals: ${p.conversation.objectives.join(' ')}`);
  lines.push(`Good questions: ${p.conversation.discoveryQuestions.join(' ')}`);
  lines.push(`Closing: ${p.conversation.closing.join(' ')}`);
  return lines.join('\n');
}

export function resolveVoiceCountry(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const code = input.trim().toUpperCase();
  const normalised = code === 'UK' ? 'GB' : code;
  return isSupportedCountryCode(normalised) ? normalised : null;
}

/** Build the pack for one supported country. `now` is injectable for tests. */
export function buildVoicePack(country: string, now: Date = new Date()): VoicePack {
  const supported = getSupportedCountry(country);
  if (!supported) throw new Error(`unsupported country: ${country}`);

  const meta = getPricingMeta();
  const offer = onboardingSupportFor(country);
  const factsAsOf = [meta.feedUpdatedAt, `${ONBOARDING_SUPPORT_REVIEWED}T00:00:00.000Z`]
    .filter((d): d is string => Boolean(d))
    .sort()
    .at(-1)!;

  const onboardingSupport = offer
    ? {
        ...offer,
        covers: [...offer.covers],
        spoken:
          `Paid 1:1 onboarding support: ${money(offer.symbol, offer.currency, offer.price)} for ${offer.hours} hours with a HelloBooks specialist, ` +
          `on ${offer.meetingTools.join(' or ')} — whichever they prefer. Covers ${offer.covers.join('; ')}.`,
      }
    : null;

  const body = {
    schema: VOICE_PACK_SCHEMA,
    country,
    countryName: supported.name,
    generatedAt: now.toISOString(),
    factsAsOf,
    pricingSource: meta.dataSource,
    plans: buildPlans(country),
    onboardingSupport,
    includedSupport: INCLUDED_SUPPORT,
    migrationService: MIGRATION_SERVICE[country] ?? null,
    compliance: buildCompliance(country),
    guardrails: buildGuardrails(country),
    conversation: buildConversation(country, offer),
  } as const;

  // Hash everything except the build time, so the version moves only when
  // something the agent would say moves.
  const { generatedAt: _built, ...stable } = body;
  const version = createHash('sha256').update(JSON.stringify(stable)).digest('hex').slice(0, 16);
  const text = renderText(body, version);
  return { ...body, version, text, approxTokens: Math.ceil(text.length / 4) };
}
