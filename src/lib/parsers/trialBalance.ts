/**
 * Trial Balance parser — source-agnostic.
 *
 * Unlike journal-entry exports, Trial Balance is account-level (one row
 * per chart-of-accounts entry, with debit OR credit balance). Most
 * sources ship the same columns, just with different header names — so
 * one parser with broad alias coverage handles QBO / Xero / Zoho / Wave.
 *
 * Canonical TB columns mapped:
 *   AccountName  — name of the account
 *   AccountCode  — code/number (optional, Xero / Zoho ship this)
 *   AccountType  — Asset / Liability / Equity / Income / Expense
 *                  (optional; some sources separate "Account Type"
 *                  column, others infer from order/grouping)
 *   Debit        — debit balance (mutually exclusive with Credit)
 *   Credit       — credit balance (mutually exclusive with Debit)
 *
 * Sources have additional columns we ignore:
 *   • QBO       — prior-period columns when comparative
 *   • Xero      — YTD Debit / YTD Credit (running totals)
 *   • Zoho      — Opening / Net Change / Closing balance breakdowns
 *
 * Detection inputs the parsed shape and looks for:
 *   • Trial Balance does NOT tie out (sum debits ≠ sum credits)
 *   • Negative balances on accounts that should be positive
 *   • Wrong-sign balances (revenue with debit balance, expense with
 *     credit balance — likely a sign-flip error)
 *
 * Pure functions. No I/O.
 */

import { trimOrNull, normalizeHeader, scalarToString } from './fieldUtils.js';
import {
  buildAliasColumnMapping,
  parseExplicitDebitCredit,
  parseMappedRows,
  round2,
  unmappedColumns,
} from './journalUtils.js';

export const TB_COLUMN_ALIASES: Record<string, string[]> = {
  AccountName: ['account', 'account name', 'account description'],
  AccountCode: ['code', 'account code', 'account number', 'account no', 'gl code'],
  AccountType: ['type', 'account type', 'category', 'classification'],
  Debit:       ['debit', 'dr', 'debit balance', 'debit amount'],
  Credit:      ['credit', 'cr', 'credit balance', 'credit amount'],
};

export type TbSource = 'QBO' | 'XERO' | 'ZOHO' | 'WAVE' | 'UNKNOWN';

export type IssueCode =
  | 'MISSING_ACCOUNT'
  | 'INVALID_DECIMAL'
  | 'BOTH_DEBIT_AND_CREDIT'
  | 'NEITHER_DEBIT_NOR_CREDIT'
  | 'TB_UNBALANCED';

export interface ParseIssue {
  code: IssueCode;
  message: string;
  field?: string;
  rowIndex?: number;
}

export interface ParsedTbLine {
  rowIndex: number;
  accountName: string;
  accountCode: string | null;
  accountType: string | null;
  debit: number | null;
  credit: number | null;
  issues: ParseIssue[];
}

export interface ParseInput {
  columns: string[];
  rows: Record<string, unknown>[];
}

export interface ParseResult {
  source: TbSource;
  entityType: 'TRIAL_BALANCE';
  lines: ParsedTbLine[];
  totalDebits: number;
  totalCredits: number;
  balanced: boolean;
  totalRows: number;
  totalIssues: number;
  columnMapping: Record<string, string | null>;
  unmappedColumns: string[];
  topLevelIssues: ParseIssue[];
}

/**
 * Detect TB source from headers — best-effort. TB exports vary less
 * than journal-entry exports, but Xero + Zoho still show distinguishing
 * columns (YTD Debit for Xero; Opening Balance / Net Change for Zoho).
 */
export function detectTbSource(columns: string[]): TbSource {
  const set = new Set(columns.map(normalizeHeader));
  if (set.has('ytd debit') || set.has('ytd credit')) return 'XERO';
  if (set.has('opening balance') || set.has('net change') || set.has('closing balance')) return 'ZOHO';
  if (set.has('account no') || set.has('gl code')) {
    // QBO Trial Balance reports use "Account No" in some exports; Wave's
    // shape is sparser. Tie-break is weak — default to QBO.
    return 'QBO';
  }
  // Default — column shape doesn't fingerprint a source. Treat as
  // unknown but still parsable.
  return 'UNKNOWN';
}

export function buildColumnMapping(sourceColumns: string[]): Record<string, string | null> {
  return buildAliasColumnMapping(sourceColumns, TB_COLUMN_ALIASES);
}

function validateAndShapeLine(rowIndex: number, mapped: Record<string, unknown>): ParsedTbLine {
  const issues: ParseIssue[] = [];

  const accountName = trimOrNull(mapped.AccountName) ?? '';
  if (!accountName) {
    issues.push({
      code: 'MISSING_ACCOUNT',
      message: 'Trial Balance row needs an Account name.',
      field: 'AccountName',
      rowIndex,
    });
  }

  const { debit, credit, issues: amountIssues } = parseExplicitDebitCredit(rowIndex, mapped, {
    invalidDebit: (debitRaw) => `Could not parse debit "${scalarToString(debitRaw)}"`,
    invalidCredit: (creditRaw) => `Could not parse credit "${scalarToString(creditRaw)}"`,
    both: (debit, credit) => `Account "${accountName}" has both debit (${debit}) and credit (${credit}) balances — should be only one.`,
  });

  return {
    rowIndex,
    accountName,
    accountCode: trimOrNull(mapped.AccountCode),
    accountType: trimOrNull(mapped.AccountType),
    debit,
    credit,
    issues: [...issues, ...(amountIssues as ParseIssue[])],
  };
}

const PENNY = 0.01;

export function parseTrialBalance(input: ParseInput): ParseResult {
  const mapping = buildColumnMapping(input.columns);
  const source = detectTbSource(input.columns);

  const lines = parseMappedRows(input, mapping, validateAndShapeLine);

  const totalDebits = lines.reduce((s, l) => s + (l.debit ?? 0), 0);
  const totalCredits = lines.reduce((s, l) => s + (l.credit ?? 0), 0);
  const balanced = Math.abs(totalDebits - totalCredits) < PENNY;

  const topLevelIssues: ParseIssue[] = [];
  if (!balanced && lines.length > 0) {
    topLevelIssues.push({
      code: 'TB_UNBALANCED',
      message: `Trial Balance does not tie: debits ${totalDebits.toFixed(2)} vs credits ${totalCredits.toFixed(2)} (diff ${(totalDebits - totalCredits).toFixed(2)}). A balanced TB is the foundation of every other financial statement.`,
      field: 'Debit',
    });
  }

  let totalIssues = topLevelIssues.length;
  for (const l of lines) totalIssues += l.issues.length;

  return {
    source,
    entityType: 'TRIAL_BALANCE',
    lines,
    totalDebits: round2(totalDebits),
    totalCredits: round2(totalCredits),
    balanced,
    totalRows: lines.length,
    totalIssues,
    columnMapping: mapping,
    unmappedColumns: unmappedColumns(mapping),
    topLevelIssues,
  };
}
