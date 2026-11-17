/**
 * `check_integration` — does HelloBooks work with <bank / app / service>?
 *
 * Agents get asked "do you integrate with Stripe / HDFC / Shopify / QuickBooks?"
 * constantly, and a fuzzy free-text search (`feature_search`) can bury the
 * answer. This tool gives a deterministic yes/no over the public integrations
 * catalog: an exact or near match with its rollout status, or the closest
 * candidates when there is no direct hit. Read-only, public data only.
 */
import { z } from 'zod';
import { INTEGRATIONS, type Integration } from '../data/integrations.js';

export const checkIntegrationSchema = {
  name: z
    .string()
    .min(1)
    .max(100)
    .describe(
      'The bank, payment provider, app, or service to check, e.g. "Stripe", "HDFC Bank", "Shopify", "QuickBooks".',
    ),
};

export interface CheckIntegrationArgs {
  name: string;
}

export interface CheckIntegrationResult {
  query: string;
  supported: boolean;
  /** 'live' | 'beta' | 'coming-soon' when matched, else null. */
  status: Integration['status'] | null;
  match: Integration | null;
  /** Nearby catalog entries when there is no exact match (max 5). */
  suggestions: Integration[];
  note: string;
}

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/** Tokens of 3+ chars, so "hdfc" matches "HDFC Bank" but "of"/"a" do not. */
function tokens(s: string): string[] {
  return norm(s).split(' ').filter((t) => t.length >= 3);
}

export function checkIntegration(args: CheckIntegrationArgs): CheckIntegrationResult {
  const raw = args.name.trim();
  const q = norm(raw);
  const qTokens = tokens(raw);

  // 1. Exact match on id or name.
  const exact = INTEGRATIONS.find(
    (i) => norm(i.id) === q || norm(i.name) === q,
  );
  if (exact) {
    return {
      query: raw,
      supported: true,
      status: exact.status,
      match: exact,
      suggestions: [],
      note:
        exact.status === 'live'
          ? `Yes — ${exact.name} is a live integration (${exact.category}).`
          : `${exact.name} is ${exact.status} (${exact.category}).`,
    };
  }

  // 2. Substring either way on id/name (e.g. "hdfc" ⊂ "HDFC Bank", or
  //    "stripe payments" ⊃ "Stripe").
  const partial = INTEGRATIONS.find((i) => {
    const n = norm(i.name);
    const id = norm(i.id);
    return n.includes(q) || q.includes(n) || id.includes(q) || q.includes(id);
  });
  if (partial) {
    return {
      query: raw,
      supported: partial.status === 'live' || partial.status === 'beta',
      status: partial.status,
      match: partial,
      suggestions: [],
      note:
        partial.status === 'coming-soon'
          ? `${partial.name} is coming soon (${partial.category}).`
          : `Yes — ${partial.name} (${partial.category}, ${partial.status}).`,
    };
  }

  // 3. Token overlap on name/description/category → suggestions only.
  const scored = INTEGRATIONS.map((i) => {
    const hay = new Set(tokens(`${i.name} ${i.description} ${i.category}`));
    const overlap = qTokens.filter((t) => hay.has(t)).length;
    return { i, overlap };
  })
    .filter((s) => s.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, 5)
    .map((s) => s.i);

  return {
    query: raw,
    supported: false,
    status: null,
    match: null,
    suggestions: scored,
    note:
      scored.length > 0
        ? `No direct "${raw}" integration found. Closest catalog entries are listed in suggestions — confirm on hellobooks.ai/integration.`
        : `No "${raw}" integration found in the public catalog. Check hellobooks.ai/integration or ask about the integration category instead.`,
  };
}
