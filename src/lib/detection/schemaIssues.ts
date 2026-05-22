/**
 * Bridges per-source parser issues (e.g. `INVALID_DATE`, `MISSING_ACCOUNT`,
 * `BOTH_DEBIT_AND_CREDIT`) into the unified `DetectionFlag` shape under the
 * `SCHEMA` category, so MCP tools return one consistent flag stream.
 *
 * The parsers already surface these issues per-row and per-journal in their
 * `issues` arrays; this module just adapts them. `UNBALANCED_JOURNAL` is
 * intentionally excluded because `detectImbalance()` already covers it in
 * the dedicated IMBALANCE category — re-emitting it as SCHEMA would
 * double-flag.
 *
 * Pure function. No I/O.
 */

import type { DetectionFlag, DetectionSeverity } from './types.js';

interface SourceIssue {
  code: string;
  message: string;
  field?: string;
  rowIndex?: number;
}

/**
 * Minimal shape required by the schema-flag mapper. Both QBO and Xero
 * parser outputs satisfy this — they just differ in their journal-id
 * field name (`journalNumber` vs `groupKey`), which the caller bridges
 * via the `getId` callback.
 */
interface SourceJournal<L extends SourceLine> {
  lines: L[];
  issues: SourceIssue[];
}

interface SourceLine {
  rowIndex: number;
  issues: SourceIssue[];
}

const SEVERITY_BY_CODE: Record<string, DetectionSeverity> = {
  MISSING_JOURNAL_NUMBER: 'high',
  MISSING_GROUP_KEY:      'high',
  MISSING_DATE:           'high',
  MISSING_ACCOUNT:        'high',
  INVALID_DATE:           'high',
  INVALID_DECIMAL:        'high',
  BOTH_DEBIT_AND_CREDIT:  'high',
  NEITHER_DEBIT_NOR_CREDIT: 'high',
  ZERO_AMOUNT:            'medium',
  NO_AMOUNT:              'high',
  INCONSISTENT_DATE:      'medium',
};

const EXCLUDED_CODES = new Set([
  // Already covered by detectImbalance under the IMBALANCE category.
  'UNBALANCED_JOURNAL',
]);

function toFlag(
  issue: SourceIssue,
  journalId: string,
  journalReference: string | null,
): DetectionFlag {
  const severity = SEVERITY_BY_CODE[issue.code] ?? 'medium';
  return {
    category: 'SCHEMA',
    code: `schema.${issue.code.toLowerCase()}`,
    severity,
    message: issue.message,
    affectedRowIndices: issue.rowIndex !== undefined ? [issue.rowIndex] : [],
    affectedJournalIds: [journalId],
    data: {
      field: issue.field,
      reference: journalReference,
    },
    fixableInHellobooks: true,
  };
}

/**
 * Convert all per-row + per-journal parser issues into SCHEMA-category
 * flags. Excludes `UNBALANCED_JOURNAL` (already in IMBALANCE).
 *
 * `getId` derives the per-journal id from the source-specific shape —
 * QBO uses `journalNumber`, Xero uses `groupKey`, so the caller bridges.
 * `getReference` (optional) derives the user-facing label; falls back
 * to the id when not provided.
 */
export function schemaFlagsFromJournals<J extends SourceJournal<SourceLine>>(
  journals: J[],
  getId: (j: J) => string,
  getReference?: (j: J) => string | null,
): DetectionFlag[] {
  const flags: DetectionFlag[] = [];
  for (const journal of journals) {
    const id = getId(journal);
    const ref = getReference ? (getReference(journal) ?? id) : id;
    for (const ji of journal.issues) {
      if (EXCLUDED_CODES.has(ji.code)) continue;
      flags.push(toFlag(ji, id, ref));
    }
    for (const line of journal.lines) {
      for (const li of line.issues) {
        if (EXCLUDED_CODES.has(li.code)) continue;
        flags.push(toFlag(li, id, ref));
      }
    }
  }
  return flags;
}
