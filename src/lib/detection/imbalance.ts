/**
 * IMBALANCE detector — surfaces journals whose debits and credits do not match.
 *
 * The per-source parsers already compute a `balanced` boolean and an
 * UNBALANCED_JOURNAL parse-level issue. This detector wraps those into the
 * unified `DetectionFlag` shape so the MCP tool surface returns one flag
 * stream regardless of source.
 *
 * Severity bands by absolute difference vs the larger of the two totals:
 *   ≥ 5%   → high     ("material imbalance")
 *   ≥ 0.5% → medium   ("review-worthy imbalance")
 *   else   → low      ("rounding-band imbalance")
 *
 * Pure function. No I/O, no side-effects.
 */

import type { DetectionFlag, NormalizedJournal, DetectionSeverity } from './types.js';

const HIGH_THRESHOLD = 0.05;
const MEDIUM_THRESHOLD = 0.005;

function severityForImbalance(debits: number, credits: number): DetectionSeverity {
  const larger = Math.max(Math.abs(debits), Math.abs(credits));
  if (larger === 0) return 'low';
  const ratio = Math.abs(debits - credits) / larger;
  if (ratio >= HIGH_THRESHOLD) return 'high';
  if (ratio >= MEDIUM_THRESHOLD) return 'medium';
  return 'low';
}

export function detectImbalance(journals: NormalizedJournal[]): DetectionFlag[] {
  const flags: DetectionFlag[] = [];
  for (const j of journals) {
    if (j.balanced) continue;
    const diff = j.totalDebits - j.totalCredits;
    const severity = severityForImbalance(j.totalDebits, j.totalCredits);
    flags.push({
      category: 'IMBALANCE',
      code: 'imbalance.journal',
      severity,
      message: `Journal "${j.reference ?? j.id}" is unbalanced: debits ${j.totalDebits.toFixed(2)} vs credits ${j.totalCredits.toFixed(2)} (diff ${diff.toFixed(2)}).`,
      affectedRowIndices: j.lines.map((l) => l.rowIndex),
      affectedJournalIds: [j.id],
      data: {
        debits: j.totalDebits,
        credits: j.totalCredits,
        diff,
        date: j.date,
      },
      fixableInHellobooks: true,
    });
  }
  return flags;
}
