/**
 * DUPLICATE detector — surfaces journal entries that appear to be duplicates
 * of one another based on date, total amount, and memo similarity.
 *
 * Strategy — two-pass:
 *   1. Group journals by `(date, totalDebits, totalCredits)`.
 *   2. Within each group of size > 1, emit one flag pointing at all members.
 *
 * Memo similarity is intentionally NOT used as a join key — duplicates with
 * subtly-different memos are still suspicious (e.g. "Office supplies" vs
 * "Office supplies — June"). Memo content is included in the flag's `data`
 * for the host LLM to narrate.
 *
 * Journals missing a date or with zero totals are skipped — those cases are
 * already surfaced by parser-level issue codes.
 *
 * Pure function. No I/O, no side-effects. Deterministic output ordering
 * by (date asc, totalDebits asc, first id) so consumers can rely on it for
 * snapshot tests.
 */

import type { DetectionFlag, NormalizedJournal } from './types.js';

function bucketKey(j: NormalizedJournal): string | null {
  if (!j.date) return null;
  if (j.totalDebits === 0 && j.totalCredits === 0) return null;
  // Round to whole cents to absorb floating-point dust without changing match semantics.
  const d = Math.round(j.totalDebits * 100);
  const c = Math.round(j.totalCredits * 100);
  return `${j.date}|${d}|${c}`;
}

export function detectDuplicates(journals: NormalizedJournal[]): DetectionFlag[] {
  const buckets = new Map<string, NormalizedJournal[]>();
  for (const j of journals) {
    const k = bucketKey(j);
    if (k === null) continue;
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k)!.push(j);
  }

  const flags: DetectionFlag[] = [];
  for (const [, members] of buckets) {
    if (members.length < 2) continue;
    const ids = members.map((m) => m.id);
    const rowIndices = members.flatMap((m) => m.lines.map((l) => l.rowIndex));
    const memos = members.map((m) => m.narration ?? m.lines.find((l) => l.memo)?.memo ?? null);
    flags.push({
      category: 'DUPLICATE',
      code: 'duplicate.exact_amount_date',
      severity: 'medium',
      message: `${members.length} journals on ${members[0].date} with identical totals (${members[0].totalDebits.toFixed(2)}) — likely duplicates: ${ids.join(', ')}.`,
      affectedRowIndices: rowIndices,
      affectedJournalIds: ids,
      data: {
        date: members[0].date,
        totalDebits: members[0].totalDebits,
        totalCredits: members[0].totalCredits,
        count: members.length,
        memos,
      },
      fixableInHellobooks: true,
    });
  }

  // Deterministic ordering — date asc, then by total, then by first id.
  flags.sort((a, b) => {
    const da = String(a.data?.date ?? '');
    const db = String(b.data?.date ?? '');
    if (da !== db) return da.localeCompare(db);
    const ta = Number(a.data?.totalDebits ?? 0);
    const tb = Number(b.data?.totalDebits ?? 0);
    if (ta !== tb) return ta - tb;
    return (a.affectedJournalIds[0] ?? '').localeCompare(b.affectedJournalIds[0] ?? '');
  });
  return flags;
}
