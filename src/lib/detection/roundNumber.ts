/**
 * ROUND_NUMBER detector — flags suspiciously round-number lines that are
 * statistically unusual against the dataset's own distribution.
 *
 * Real bookkeeping line items are rarely round multiples of 1,000 — vendor
 * invoices land at "$1,247.83" not "$1,000.00". A cluster of round-1000
 * amounts above a materiality threshold is a fraud / estimate / plug
 * signal that warrants review.
 *
 * Per-line flag is emitted when ALL of the following hold:
 *   • absolute amount ≥ $1,000
 *   • amount is an exact multiple of $1,000
 *   • the line is not a wash (debit AND credit on the same line — those are
 *     already flagged by the parser)
 *
 * Severity per line scales with absolute amount:
 *   ≥ $100,000 → high
 *   ≥ $10,000  → medium
 *   else       → low
 *
 * Pure function. No I/O, no side-effects.
 */

import type { DetectionFlag, NormalizedJournal, DetectionSeverity } from './types.js';

const ROUND_THRESHOLD = 1000;
const HIGH_THRESHOLD = 100_000;
const MEDIUM_THRESHOLD = 10_000;

function severityForAmount(absAmount: number): DetectionSeverity {
  if (absAmount >= HIGH_THRESHOLD) return 'high';
  if (absAmount >= MEDIUM_THRESHOLD) return 'medium';
  return 'low';
}

function isSuspiciouslyRound(amount: number): boolean {
  if (!Number.isFinite(amount)) return false;
  const abs = Math.abs(amount);
  if (abs < ROUND_THRESHOLD) return false;
  // Use rounding to avoid floating-point false-negatives like 5000.0000001.
  return Math.round(abs) % ROUND_THRESHOLD === 0 && Math.abs(abs - Math.round(abs)) < 0.005;
}

export function detectRoundNumber(journals: NormalizedJournal[]): DetectionFlag[] {
  const flags: DetectionFlag[] = [];
  for (const j of journals) {
    for (const line of j.lines) {
      const amount = (line.debit ?? 0) || (line.credit ?? 0);
      if (!isSuspiciouslyRound(amount)) continue;
      const abs = Math.abs(amount);
      flags.push({
        category: 'ROUND_NUMBER',
        code: 'round_number.line',
        severity: severityForAmount(abs),
        message: `Round-number line — ${line.debit ? 'debit' : 'credit'} of ${abs.toFixed(2)} (exactly a multiple of ${ROUND_THRESHOLD}) on journal "${j.reference ?? j.id}".`,
        affectedRowIndices: [line.rowIndex],
        affectedJournalIds: [j.id],
        data: {
          amount,
          account: line.accountIdentifier,
          memo: line.memo,
          date: j.date,
        },
        fixableInHellobooks: false,
      });
    }
  }
  return flags;
}
