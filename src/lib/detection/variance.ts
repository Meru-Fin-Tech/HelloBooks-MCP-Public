/**
 * VARIANCE detector — per-account delta between two periods.
 *
 * Aggregates `NormalizedJournal[]` into a per-account net total
 * (debit − credit) for each period, then flags accounts whose movement
 * deviates materially.
 *
 * Severity bands by relative change:
 *   ≥ 50% → high   ("travel jumped 400% — kickoff event")
 *   ≥ 20% → medium
 *   ≥  5% → low
 *   else  → no flag (treated as noise)
 *
 * Plus a minimum absolute-delta floor ($100) so a $5 → $10 line does
 * not surface as "100% jump".
 *
 * Pure function. No I/O.
 */

import type { DetectionFlag, NormalizedJournal, DetectionSeverity } from './types.js';

const MIN_ABS_DELTA = 100;
const HIGH_RATIO = 0.5;
const MEDIUM_RATIO = 0.2;
const LOW_RATIO = 0.05;

interface PeriodLabel {
  label: string;
  journals: NormalizedJournal[];
}

interface AccountAggregate {
  debit: number;
  credit: number;
  net: number;
}

function aggregateByAccount(journals: NormalizedJournal[]): Map<string, AccountAggregate> {
  const out = new Map<string, AccountAggregate>();
  for (const j of journals) {
    for (const l of j.lines) {
      const acc = l.accountIdentifier ?? '<unknown>';
      const entry = out.get(acc) ?? { debit: 0, credit: 0, net: 0 };
      entry.debit += l.debit ?? 0;
      entry.credit += l.credit ?? 0;
      entry.net += (l.debit ?? 0) - (l.credit ?? 0);
      out.set(acc, entry);
    }
  }
  return out;
}

function severityForRatio(ratio: number): DetectionSeverity | null {
  if (ratio >= HIGH_RATIO) return 'high';
  if (ratio >= MEDIUM_RATIO) return 'medium';
  if (ratio >= LOW_RATIO) return 'low';
  return null;
}

export function detectVariance(periodA: PeriodLabel, periodB: PeriodLabel): DetectionFlag[] {
  const aggA = aggregateByAccount(periodA.journals);
  const aggB = aggregateByAccount(periodB.journals);

  const accounts = new Set<string>([...aggA.keys(), ...aggB.keys()]);
  const flags: DetectionFlag[] = [];

  for (const account of accounts) {
    const a = aggA.get(account)?.net ?? 0;
    const b = aggB.get(account)?.net ?? 0;
    const delta = b - a;
    const absDelta = Math.abs(delta);
    if (absDelta < MIN_ABS_DELTA) continue;

    const larger = Math.max(Math.abs(a), Math.abs(b));
    const ratio = larger === 0 ? 1 : absDelta / larger;
    const severity = severityForRatio(ratio);
    if (severity === null) continue;

    const direction = delta > 0 ? 'increased' : 'decreased';
    flags.push({
      category: 'VARIANCE',
      code: 'variance.account',
      severity,
      message: `Account "${account}" ${direction} by ${absDelta.toFixed(2)} (${(ratio * 100).toFixed(1)}%) from ${periodA.label} to ${periodB.label}.`,
      affectedRowIndices: [],
      affectedJournalIds: [],
      data: {
        account,
        periodALabel: periodA.label,
        periodBLabel: periodB.label,
        periodANet: round2(a),
        periodBNet: round2(b),
        delta: round2(delta),
        ratio,
      },
      fixableInHellobooks: false,
    });
  }

  // Deterministic ordering: largest absolute delta first.
  flags.sort((x, y) => {
    const dx = Math.abs(Number(x.data?.delta ?? 0));
    const dy = Math.abs(Number(y.data?.delta ?? 0));
    return dy - dx;
  });
  return flags;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
