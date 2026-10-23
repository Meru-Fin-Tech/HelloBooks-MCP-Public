/**
 * Public document index — the catalog flattened into citable documents.
 *
 * Every record the MCP already serves through a typed tool is also addressable
 * here as a single document with a stable id, a human-facing URL and a plain-
 * text rendering. This is what the OpenAI `search` / `fetch` tool contract
 * needs (see ../../tools/publicSearch.ts): `search` returns ids, `fetch`
 * resolves one id into the document body ChatGPT cites.
 *
 * Document id shape: `<source>:<rest>` — `source` never contains a colon, so a
 * split on the FIRST colon always recovers it even when `rest` carries colons
 * (e.g. `country-feature:IN:gst-filing`).
 *
 * The index is rebuilt per call on purpose: plan and credit-pack prices are
 * federated live from hellobooks.ai (see ../../pricingFeed.ts), so a cached
 * index would serve stale prices after a feed refresh. The catalog is a few
 * hundred records of static data — rebuilding is cheap.
 */

import { getPlans } from '../../pricingFeed.js';
import { INTEGRATIONS } from '../../data/integrations.js';
import { COUNTRY_SUPPORT } from '../../data/countries.js';
import { COMPETITORS } from '../../data/competitors.js';
import { COMPLIANCE_DEADLINES } from '../../data/complianceDeadlines.js';
import { PAYMENT_METHODS, HELLOBOOKS_USE_CASES } from '../../data/paymentMethods.js';
import { FEATURES } from '../../data/features.js';
import { ARTICLES } from '../../data/articles.js';
import { SUPPORTED_COUNTRIES } from '../../data/supportedCountries.js';

/** Fallback citation target for records with no dedicated public page. */
const SITE_URL = 'https://hellobooks.ai';

export interface PublicDocument {
  /** `<source>:<rest>` — stable across deploys, safe to cite. */
  id: string;
  title: string;
  /** Always a non-empty absolute URL — ChatGPT drops citations without one. */
  url: string;
  text: string;
  metadata: Record<string, string>;
}

const COUNTRY_NAME: Record<string, string> = Object.fromEntries(
  SUPPORTED_COUNTRIES.map((country) => [country.iso, country.name]),
);

function lines(...parts: (string | false | undefined | null)[]): string {
  return parts.filter((p): p is string => Boolean(p)).join('\n');
}

function planDocuments(): PublicDocument[] {
  return getPlans().map((plan) => {
    const priceLines = plan.prices.map(
      (p) =>
        `  - ${p.country}: ${p.symbol}${p.monthly}/month, ${p.symbol}${p.annual}/year (${p.currency})` +
        (p.pricingCountry && p.pricingCountry !== p.country
          ? ` [list price from ${p.pricingCountry}]`
          : '') +
        (p.billingNote ? ` — ${p.billingNote}` : ''),
    );
    const credits =
      plan.monthlyAiCredits === null
        ? (plan.aiCreditsNote ?? 'See plan page for AI credit details.')
        : `${plan.monthlyAiCredits} AI credits per month` +
          (plan.aiCreditsNote ? ` — ${plan.aiCreditsNote}` : '');
    return {
      id: `plan:${plan.plan}`,
      title: `${plan.name} plan — HelloBooks pricing`,
      url: plan.publicSignupUrl,
      text: lines(
        `${plan.name} plan (id: ${plan.plan})`,
        plan.tagline,
        '',
        `AI credits: ${credits}`,
        plan.annualTransactionLimit
          ? `Annual transaction limit: ${plan.annualTransactionLimit}`
          : undefined,
        '',
        'Features:',
        ...plan.features.map((f) => `  - ${f}`),
        '',
        'Prices by country:',
        ...priceLines,
      ),
      metadata: { source: 'plan', plan: plan.plan },
    };
  });
}

function integrationDocuments(): PublicDocument[] {
  return INTEGRATIONS.map((i) => ({
    id: `integration:${i.id}`,
    title: `${i.name} integration — HelloBooks`,
    url: i.publicUrl ?? SITE_URL,
    text: lines(
      `${i.name} (${i.category} integration, status: ${i.status})`,
      '',
      i.description,
      '',
      i.countries.length > 0
        ? `Available in: ${i.countries.join(', ')}`
        : 'Available in all supported countries.',
    ),
    metadata: { source: 'integration', category: i.category, status: i.status },
  }));
}

function featureDocuments(): PublicDocument[] {
  return FEATURES.map((f) => ({
    id: `feature:${f.key}`,
    title: `${f.label} — HelloBooks feature`,
    url: SITE_URL,
    text: lines(
      `${f.label} (${f.category} · ${f.tier} · ${f.status})`,
      '',
      f.shortDescription,
      '',
      f.competitorParity && f.competitorParity.length > 0
        ? `Competitor parity: ${f.competitorParity.join(', ')}`
        : undefined,
      `Marketed on hellobooks.ai: ${f.marketed ? 'yes' : 'no'}`,
    ),
    metadata: {
      source: 'feature',
      category: f.category,
      tier: f.tier,
      status: f.status,
    },
  }));
}

function countryDocuments(): PublicDocument[] {
  const docs: PublicDocument[] = [];
  for (const c of COUNTRY_SUPPORT) {
    for (const f of c.features) {
      docs.push({
        id: `country-feature:${c.country}:${f.key}`,
        title: `${f.label} in ${c.countryName} — HelloBooks`,
        url: c.marketingUrl,
        text: lines(
          `${f.label} — ${c.countryName} (${c.country}, currency ${c.defaultCurrency})`,
          '',
          f.description,
        ),
        metadata: { source: 'country-feature', country: c.country },
      });
    }
    for (const cf of c.compliance) {
      docs.push({
        id: `compliance:${c.country}:${cf.key}`,
        title: `${cf.label} compliance in ${c.countryName} — HelloBooks`,
        url: c.marketingUrl,
        text: lines(
          `${cf.label} — ${c.countryName} (${c.country})`,
          '',
          `Authority: ${cf.authority}`,
          cf.version ? `Version: ${cf.version}` : undefined,
          `Status in HelloBooks: ${cf.status}`,
          cf.certInfo ? `Certification: ${cf.certInfo}` : undefined,
        ),
        metadata: { source: 'compliance', country: c.country, status: cf.status },
      });
    }
  }
  return docs;
}

function competitorDocuments(): PublicDocument[] {
  return COMPETITORS.map((c) => ({
    id: `competitor:${c.id}`,
    title: `HelloBooks vs ${c.name}`,
    url: c.comparisonUrl ?? c.publicUrl ?? SITE_URL,
    text: lines(
      `HelloBooks vs ${c.name} (${c.segment}, ${c.tier} competitor)`,
      '',
      c.positioningSummary,
      '',
      'Where HelloBooks wins:',
      ...c.whereWeWin.map((w) => `  - ${w}`),
      '',
      `Where ${c.name} wins:`,
      ...c.whereTheyWin.map((w) => `  - ${w}`),
      '',
      c.pricingNote ? `Pricing note: ${c.pricingNote}` : undefined,
    ),
    metadata: { source: 'competitor', tier: c.tier, primaryCountry: c.primaryCountry },
  }));
}

function deadlineDocuments(): PublicDocument[] {
  return COMPLIANCE_DEADLINES.map((d) => {
    const when =
      d.annualDates && d.annualDates.length > 0
        ? `Due: ${d.annualDates.join(', ')}`
        : d.dueDay
          ? `Due day ${d.dueDay} of the period`
          : d.frequency === 'per-event'
            ? 'Per-event filing'
            : 'See applicability note';
    return {
      id: `deadline:${d.country}:${d.id}`,
      title: `${d.form} filing deadline (${d.country})`,
      url: d.source,
      text: lines(
        `${d.form} — ${COUNTRY_NAME[d.country] ?? d.country} (${d.country})`,
        '',
        `Authority: ${d.authority}`,
        `Frequency: ${d.frequency}`,
        when,
        d.applicabilityNote ? `Applies to: ${d.applicabilityNote}` : undefined,
        '',
        `Last reviewed: ${d.lastReviewed}. Statutory dates rotate annually — confirm against ${d.source} before relying on them.`,
      ),
      metadata: {
        source: 'deadline',
        country: d.country,
        frequency: d.frequency,
        lastReviewed: d.lastReviewed,
      },
    };
  });
}

function paymentMethodDocuments(): PublicDocument[] {
  return PAYMENT_METHODS.filter((m) =>
    m.useCases.some((u) => HELLOBOOKS_USE_CASES.includes(u)),
  ).map((m) => ({
    id: `payment-method:${m.id}`,
    title: `${m.name} payments (${m.country}) — HelloBooks`,
    url: SITE_URL,
    text: lines(
      `${m.name} — ${COUNTRY_NAME[m.country] ?? m.country} (${m.country})`,
      '',
      `Settlement rail: ${m.rail}`,
      `Use cases: ${m.useCases.join(', ')}`,
      `Issuing authority: ${m.authority}`,
      m.helloProductSupport
        ? `HelloBooks support: ${m.helloProductSupport}`
        : undefined,
      m.notes && m.notes.length > 0 ? '' : undefined,
      ...(m.notes ?? []).map((n) => `  - ${n}`),
    ),
    metadata: { source: 'payment-method', country: m.country, rail: m.rail },
  }));
}

function articleDocuments(): PublicDocument[] {
  return ARTICLES.map((a) => ({
    id: `article:${a.id}`,
    title: a.title,
    url: a.url,
    text: lines(
      a.title,
      `${a.kind} · published ${a.publishedAt} · ${a.countryRelevance ?? 'global'}`,
      '',
      a.excerpt,
      '',
      `Tags: ${a.tags.join(', ')}`,
      `Full article: ${a.url}`,
    ),
    metadata: {
      source: 'article',
      kind: a.kind,
      publishedAt: a.publishedAt,
      countryRelevance: a.countryRelevance ?? 'global',
    },
  }));
}

/**
 * Build the full document index, keyed by document id. Rebuilt per call — see
 * the module header for why.
 */
export function buildDocumentIndex(): Map<string, PublicDocument> {
  const docs = [
    ...planDocuments(),
    ...integrationDocuments(),
    ...featureDocuments(),
    ...countryDocuments(),
    ...competitorDocuments(),
    ...deadlineDocuments(),
    ...paymentMethodDocuments(),
    ...articleDocuments(),
  ];
  const index = new Map<string, PublicDocument>();
  for (const doc of docs) index.set(doc.id, doc);
  return index;
}

/** Resolve one document id, or undefined when nothing matches. */
export function getDocument(id: string): PublicDocument | undefined {
  return buildDocumentIndex().get(id.trim());
}

/**
 * Map a `feature_search` hit onto a document id.
 *
 * Plan hits are per-feature-bullet (`<planId>:<bullet text>`), which is the
 * right granularity for ranking but not for a citable document — the whole
 * plan is the document, so the bullet is dropped. Every other source already
 * indexes at document granularity.
 */
export function documentIdForHit(source: string, hitId: string): string {
  if (source === 'plan') {
    const planId = hitId.split(':')[0];
    return `plan:${planId}`;
  }
  return `${source}:${hitId}`;
}
