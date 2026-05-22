/**
 * Shared types for pure-function detection over a normalised journal shape.
 *
 * The detectors live in this folder consume `NormalizedJournal[]` regardless
 * of source (QBO, Xero, Zoho, Wave) so per-source parsers stay decoupled
 * from per-check logic. Normalisation lives in `./normalize.ts`.
 */

export type DetectionCategory =
  | 'IMBALANCE'
  | 'DUPLICATE'
  | 'ROUND_NUMBER'
  | 'SCHEMA'
  | 'VARIANCE';

export type DetectionSeverity =
  | 'critical'
  | 'high'
  | 'medium'
  | 'low'
  | 'info';

export interface DetectionFlag {
  category: DetectionCategory;
  /** Short stable identifier — e.g. "imbalance.journal" / "duplicate.exact" / "round_number.line". */
  code: string;
  severity: DetectionSeverity;
  /** Human-readable summary safe to surface to the host LLM. */
  message: string;
  /** 1-indexed source-row indices implicated. May be empty for journal-level flags. */
  affectedRowIndices: number[];
  /** Normalised journal identifiers implicated. */
  affectedJournalIds: string[];
  /** Per-flag-type structured detail. Defined freely per detector; consumers should treat as opaque. */
  data?: Record<string, unknown>;
  /**
   * Whether HelloBooks's paid product can resolve this flag automatically.
   * Used by the funnel CTA — flags marked `true` get a "Fix in HelloBooks"
   * call-to-action; flags marked `false` need manual action.
   */
  fixableInHellobooks: boolean;
}

export interface NormalizedLine {
  /** 1-indexed row in the original source file. */
  rowIndex: number;
  /** Single string usable for grouping — accountCode if available, else accountName. */
  accountIdentifier: string | null;
  debit: number | null;
  credit: number | null;
  /** Memo / description / narration of the line — first non-null wins. */
  memo: string | null;
}

export interface NormalizedJournal {
  source: 'QBO' | 'XERO';
  /** Stable per-journal identifier — journalNumber (QBO) or groupKey (Xero). */
  id: string;
  /** Human-readable reference, if available. */
  reference: string | null;
  /** Free-text narration / journal-header memo, if available. */
  narration: string | null;
  date: string | null;
  lines: NormalizedLine[];
  totalDebits: number;
  totalCredits: number;
  balanced: boolean;
}
