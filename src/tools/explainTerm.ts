/**
 * `explain_term` — plain-language definition of an accounting / tax term.
 *
 * Resolves a term by id, exact name, alias, or fuzzy token match against the
 * curated glossary (bookkeeping + the IN/UK/AU/US/CA compliance regimes
 * HelloBooks serves). Returns the definition plus related terms to explore, or
 * the closest suggestions when there is no confident match. Read-only.
 */
import { z } from 'zod';
import { GLOSSARY, type GlossaryTerm } from '../data/glossary.js';

export const explainTermSchema = {
  term: z
    .string()
    .min(1)
    .max(80)
    .describe('The accounting/tax term to define, e.g. "accrual", "GSTR-3B", "input tax credit", "P&L".'),
};

export interface ExplainTermArgs {
  term: string;
}

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/** Alphanumeric-only form so "gstr3b", "GSTR-3B" and "gstr 3b" all collapse equal. */
function squish(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function tokens(s: string): string[] {
  return norm(s).split(' ').filter((t) => t.length >= 2);
}

export interface ExplainTermResult {
  query: string;
  found: boolean;
  term: Pick<GlossaryTerm, 'id' | 'term' | 'category' | 'definition'> | null;
  related: Array<{ id: string; term: string }>;
  suggestions: Array<{ id: string; term: string }>;
  note: string;
}

function relatedOf(t: GlossaryTerm): Array<{ id: string; term: string }> {
  return t.related
    .map((id) => GLOSSARY.find((g) => g.id === id))
    .filter((g): g is GlossaryTerm => Boolean(g))
    .map((g) => ({ id: g.id, term: g.term }));
}

export function explainTerm(args: ExplainTermArgs): ExplainTermResult {
  const raw = args.term.trim();
  const q = norm(raw);
  const qs = squish(raw);

  // 1. Exact id / name / alias match (separator-insensitive).
  const exact = GLOSSARY.find(
    (g) =>
      squish(g.id) === qs ||
      squish(g.term) === qs ||
      g.aliases.some((a) => squish(a) === qs),
  );
  if (exact) {
    return {
      query: raw,
      found: true,
      term: { id: exact.id, term: exact.term, category: exact.category, definition: exact.definition },
      related: relatedOf(exact),
      suggestions: [],
      note: `Plain-language definition; confirm specifics against the relevant authority.`,
    };
  }

  // 2. Substring match on term/alias (e.g. "gstr" ⊂ "GSTR-3B").
  const partial = GLOSSARY.find(
    (g) =>
      norm(g.term).includes(q) ||
      q.includes(norm(g.term)) ||
      g.aliases.some((a) => norm(a).includes(q) || q.includes(norm(a))),
  );
  if (partial) {
    return {
      query: raw,
      found: true,
      term: { id: partial.id, term: partial.term, category: partial.category, definition: partial.definition },
      related: relatedOf(partial),
      suggestions: [],
      note: 'Closest glossary match; confirm specifics against the relevant authority.',
    };
  }

  // 3. Token overlap → suggestions only.
  const qTokens = tokens(raw);
  const scored = GLOSSARY.map((g) => {
    const hay = new Set(tokens(`${g.term} ${g.aliases.join(' ')} ${g.definition}`));
    const overlap = qTokens.filter((t) => hay.has(t)).length;
    return { g, overlap };
  })
    .filter((s) => s.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, 5)
    .map((s) => ({ id: s.g.id, term: s.g.term }));

  return {
    query: raw,
    found: false,
    term: null,
    related: [],
    suggestions: scored,
    note:
      scored.length > 0
        ? `No exact glossary entry for "${raw}". Closest terms are in suggestions.`
        : `No glossary entry for "${raw}". The glossary covers core bookkeeping and IN/UK/AU/US/CA tax & compliance terms.`,
  };
}
