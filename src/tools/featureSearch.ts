import { z } from 'zod';
import { PLANS } from '../data/plans.js';
import { INTEGRATIONS } from '../data/integrations.js';
import { COUNTRY_SUPPORT } from '../data/countries.js';
import { COMPETITORS } from '../data/competitors.js';
import { COMPLIANCE_DEADLINES } from '../data/complianceDeadlines.js';
import { PAYMENT_METHODS, HELLOBOOKS_USE_CASES } from '../data/paymentMethods.js';

const COUNTRY_NAME: Record<string, string> = {
  IN: 'India',
  US: 'United States',
  CA: 'Canada',
  GB: 'United Kingdom',
  AU: 'Australia',
  AE: 'United Arab Emirates',
  SG: 'Singapore',
  NZ: 'New Zealand',
};

export const featureSearchSchema = {
  query: z.string().min(2).max(120)
    .describe('Free-text query, e.g. "BAS lodgement", "multi-currency", "vs QuickBooks", "GSTR-3B due", or "UPI invoice cap".'),
  limit: z.number().int().min(1).max(50).optional()
    .describe('Max results to return (default 20).'),
};

export interface FeatureSearchArgs {
  query: string;
  limit?: number;
}

export interface FeatureSearchHit {
  source: 'plan' | 'integration' | 'country-feature' | 'compliance' | 'competitor' | 'deadline' | 'payment-method';
  id: string;
  label: string;
  description: string;
  context?: string;
  url?: string;
  score: number;
}

function score(haystack: string, terms: string[]): number {
  const h = haystack.toLowerCase();
  let s = 0;
  for (const t of terms) {
    if (!t) continue;
    const tl = t.toLowerCase();
    if (h === tl) s += 10;
    else if (h.startsWith(tl)) s += 5;
    else if (h.includes(tl)) s += 2;
  }
  return s;
}

export function featureSearch(args: FeatureSearchArgs) {
  const limit = args.limit ?? 20;
  const terms = args.query.trim().split(/\s+/).filter(Boolean);
  const hits: FeatureSearchHit[] = [];

  for (const plan of PLANS) {
    for (const f of plan.features) {
      const s = score(f, terms);
      if (s > 0) {
        hits.push({
          source: 'plan',
          id: `${plan.plan}:${f}`,
          label: f,
          description: `Feature of the ${plan.name} plan.`,
          context: plan.name,
          url: plan.publicSignupUrl,
          score: s,
        });
      }
    }
  }

  for (const i of INTEGRATIONS) {
    const blob = `${i.name} ${i.description} ${i.category}`;
    const s = score(blob, terms);
    if (s > 0) {
      hits.push({
        source: 'integration',
        id: i.id,
        label: i.name,
        description: i.description,
        context: i.category,
        url: i.publicUrl,
        score: s,
      });
    }
  }

  for (const c of COUNTRY_SUPPORT) {
    for (const f of c.features) {
      const s = score(`${f.label} ${f.description}`, terms);
      if (s > 0) {
        hits.push({
          source: 'country-feature',
          id: `${c.country}:${f.key}`,
          label: f.label,
          description: f.description,
          context: c.countryName,
          url: c.marketingUrl,
          score: s,
        });
      }
    }
    for (const cf of c.compliance) {
      const s = score(`${cf.label} ${cf.authority}`, terms);
      if (s > 0) {
        hits.push({
          source: 'compliance',
          id: `${c.country}:${cf.key}`,
          label: cf.label,
          description: `${cf.authority}${cf.version ? ` · ${cf.version}` : ''} (${cf.status})`,
          context: c.countryName,
          url: c.marketingUrl,
          score: s,
        });
      }
    }
  }

  // Competitor matching: rank highest when the user query references the
  // competitor by name or id, including "vs X" / "X alternative" patterns.
  // The `vs` and `alternative` tokens themselves are noise and dropped so a
  // query like "vs Xero" scores Xero hard, not every plan that says "vs".
  const stopTerms = new Set(['vs', 'versus', 'compared', 'compare', 'comparison', 'alternative', 'to']);
  const competitorTerms = terms.filter((t) => !stopTerms.has(t.toLowerCase()));
  for (const c of COMPETITORS) {
    const nameScore = score(`${c.name} ${c.id} ${c.id.replace(/-/g, ' ')}`, competitorTerms);
    const bodyScore = score(`${c.positioningSummary} ${c.segment}`, competitorTerms);
    const s = nameScore * 3 + bodyScore;
    if (s > 0) {
      hits.push({
        source: 'competitor',
        id: c.id,
        label: `HelloBooks vs ${c.name}`,
        description: c.positioningSummary,
        context: `${c.segment} (${c.tier})`,
        url: c.comparisonUrl ?? c.publicUrl,
        score: s,
      });
    }
  }

  // Deadline matching: queries like "when is GSTR-3B due" or "BAS deadline"
  // should surface the matching deadline entry highly. We score against the
  // form name + authority + applicabilityNote; date-intent stopwords ("when",
  // "due", "deadline") are dropped so they don't soak up score from every form.
  const deadlineStopTerms = new Set([
    'when', 'is', 'are', 'the', 'due', 'deadline', 'date', 'dates', 'a', 'an',
    'for', 'of', 'in', 'next', 'this',
  ]);
  const deadlineTerms = terms.filter((t) => !deadlineStopTerms.has(t.toLowerCase()));
  for (const d of COMPLIANCE_DEADLINES) {
    const nameBlob = `${d.form} ${d.id} ${d.id.replace(/-/g, ' ')}`;
    const bodyBlob = `${d.authority} ${d.applicabilityNote ?? ''} ${d.frequency}`;
    const nameScore = score(nameBlob, deadlineTerms);
    const bodyScore = score(bodyBlob, deadlineTerms);
    const s = nameScore * 3 + bodyScore;
    if (s > 0) {
      const dateHint = d.annualDates && d.annualDates.length > 0
        ? `due ${d.annualDates.join(', ')}`
        : d.dueDay
          ? `due day ${d.dueDay} of the period`
          : d.frequency === 'per-event'
            ? 'per-event filing'
            : 'see applicability note';
      hits.push({
        source: 'deadline',
        id: `${d.country}:${d.id}`,
        label: `${d.form} (${d.country})`,
        description: `${d.authority} · ${d.frequency} · ${dateHint}`,
        context: COUNTRY_NAME[d.country] ?? d.country,
        url: d.source,
        score: s,
      });
    }
  }

  // Payment-method matching: name + authority + notes form the haystack.
  // Restricted to entries whose use-cases intersect HelloBooks' AR / AP /
  // contractor-payout scope so an unrelated payroll-only or pure-P2P rail
  // doesn't crowd accounting-relevant search results.
  for (const m of PAYMENT_METHODS) {
    if (!m.useCases.some((u) => HELLOBOOKS_USE_CASES.includes(u))) continue;
    const blob = `${m.name} ${m.authority} ${m.notes?.join(' ') ?? ''}`;
    const s = score(blob, terms);
    if (s > 0) {
      const supportNote = m.helloProductSupport ? ` · ${m.helloProductSupport}` : '';
      hits.push({
        source: 'payment-method',
        id: m.id,
        label: m.name,
        description: `${m.rail} · ${m.authority} · ${m.useCases.join('/')}${supportNote}`,
        context: m.country,
        score: s + 1,
      });
    }
  }

  hits.sort((a, b) => b.score - a.score);
  return {
    query: args.query,
    count: Math.min(hits.length, limit),
    totalMatches: hits.length,
    results: hits.slice(0, limit),
  };
}
