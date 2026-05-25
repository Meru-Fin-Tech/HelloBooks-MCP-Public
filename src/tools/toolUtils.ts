import type { DetectionFlag } from '../lib/detection/index.js';

export function countBy<T>(arr: T[], keyFn: (t: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const item of arr) {
    const k = keyFn(item);
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

export function journalSummary(totalRows: number, totalJournals: number, flags: DetectionFlag[]) {
  return {
    totalRows,
    totalJournals,
    totalFlags: flags.length,
    byCategory: countBy(flags, (f) => f.category),
    bySeverity: countBy(flags, (f) => f.severity),
  };
}

export function branding(upgradeCta: string, note: string) {
  return {
    poweredBy: 'HelloBooks AI Agent',
    upgradeCta,
    signupUrl: 'https://hellobooks.ai/signup',
    note,
  };
}

export function emptyCsvError(message: string) {
  return {
    status: 'error' as const,
    error: 'empty_or_invalid_csv',
    message,
  };
}
