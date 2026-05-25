/**
 * Profit & Loss / Income Statement parser — source-agnostic.
 *
 * Statement-level shape (vs TB's account-level): rows are a mix of
 * section headers, line items, subtotals ("Total X" rows), and key
 * subtotals (Gross Profit, Net Income). The parser classifies each
 * row, attempts to bucket line items under their section, and
 * preserves the original-row sequence for downstream detection.
 *
 * QBO export pattern:
 *   Income,
 *     Sales,5000.00
 *     Service Revenue,2000.00
 *   Total Income,7000.00
 *   Cost of Goods Sold,
 *     Materials,1500.00
 *   Total Cost of Goods Sold,1500.00
 *   Gross Profit,5500.00
 *   ...
 *   Net Income,4100.00
 *
 * Xero export pattern is similar — different section names ("Trading
 * Income", "Direct Costs") but same shape. Heuristics handle both.
 *
 * Detection inputs the parsed shape and looks for:
 *   • Math doesn't tie — Total Section ≠ sum of its line items
 *   • Negative line items in expense sections (likely sign error)
 *   • Margin red flags (when Revenue + Gross Profit both present)
 *
 * Pure functions. No I/O.
 */

import { parseDecimal, normalizeHeader } from './fieldUtils.js';

export type PnlRowKind =
  | 'SECTION_HEADER'
  | 'LINE_ITEM'
  | 'SUBTOTAL'
  | 'KEY_SUBTOTAL';

export type PnlSource = 'QBO' | 'XERO' | 'ZOHO' | 'WAVE' | 'UNKNOWN';
type PnlColumnRole = 'Label' | 'Amount';

export type IssueCode =
  | 'INVALID_DECIMAL'
  | 'NO_DATA_ROWS'
  | 'PNL_NET_INCOME_MISSING'
  | 'PNL_REVENUE_MISSING';

export interface ParseIssue {
  code: IssueCode;
  message: string;
  field?: string;
  rowIndex?: number;
}

export interface PnlRow {
  rowIndex: number;
  label: string;
  amount: number | null;
  kind: PnlRowKind;
  /** Section name this row belongs to (best-effort, null for headers themselves and orphan items). */
  section: string | null;
  /** Indent depth — leading-whitespace count or sub-row position, used as a grouping hint. */
  indent: number;
  /** Raw amount string for diagnostic purposes. */
  raw: string | null;
}

export interface ParseInput {
  columns: string[];
  rows: Record<string, unknown>[];
}

export interface ParseResult {
  source: PnlSource;
  entityType: 'PROFIT_LOSS';
  rows: PnlRow[];
  /** Detected key totals — null when not present in the export. */
  totals: {
    totalRevenue: number | null;
    totalCogs: number | null;
    grossProfit: number | null;
    totalExpenses: number | null;
    operatingIncome: number | null;
    netIncome: number | null;
  };
  totalRowCount: number;
  totalIssues: number;
  columnMapping: Record<string, PnlColumnRole | null>;
  topLevelIssues: ParseIssue[];
}

interface PnlParseState {
  rows: PnlRow[];
  currentSection: string | null;
  sectionIssueCount: number;
}

/* ──────────────────────── Column detection ─────────────────────── */

const LABEL_ALIASES = new Set([
  'account', 'item', 'description', 'name', '',
]);

const AMOUNT_ALIASES = [
  'amount', 'total', 'balance', 'current period', 'this period', 'ytd', 'period',
];

function classifyColumn(header: string): PnlColumnRole | null {
  const n = normalizeHeader(header);
  if (LABEL_ALIASES.has(n)) return 'Label';
  if (AMOUNT_ALIASES.some((a) => n === a || n.startsWith(a))) return 'Amount';
  // Date-suffixed amount columns ("Jan 2024", "Q1 2024") — heuristically treat
  // the rightmost number-bearing column as Amount.
  if (/\d{4}/.test(n)) return 'Amount';
  return null;
}

function buildColumnMapping(columns: string[]): Record<string, PnlColumnRole | null> {
  const mapping: Record<string, PnlColumnRole | null> = {};
  for (const c of columns) {
    mapping[c] = classifyColumn(c);
  }
  // If no column matched Label, fall back to the first column.
  const hasLabel = Object.values(mapping).includes('Label');
  if (!hasLabel && columns.length > 0) {
    mapping[columns[0]] = 'Label';
  }
  // If no column matched Amount, fall back to the last column.
  const hasAmount = Object.values(mapping).includes('Amount');
  if (!hasAmount && columns.length > 1) {
    mapping[columns.at(-1)!] = 'Amount';
  }
  return mapping;
}

/* ──────────────────────── Row classification ───────────────────── */

const KEY_SUBTOTAL_LABELS = new Set([
  'gross profit',
  'gross margin',
  'operating income',
  'operating profit',
  'net operating income',
  'net income',
  'net profit',
  'net loss',
  'income before tax',
  'income before income tax',
  'earnings before tax',
  'ebitda',
]);

const TOTAL_PREFIX_RE = /^total\s+/i;
const TOTAL_SUFFIX_RE = /\s+total$/i;

function classifyRow(label: string, amount: number | null, indent: number): PnlRowKind {
  const n = label.trim().toLowerCase();
  if (KEY_SUBTOTAL_LABELS.has(n)) return 'KEY_SUBTOTAL';
  if (TOTAL_PREFIX_RE.test(label) || TOTAL_SUFFIX_RE.test(label)) return 'SUBTOTAL';
  // Section header — has no amount and no obvious math role.
  if (amount === null) return 'SECTION_HEADER';
  // Indented row with amount → line item under the most recent section.
  if (indent > 0) return 'LINE_ITEM';
  // Top-level row with amount — could be a single-row category (e.g.
  // small businesses with no nesting). Treat as a line item.
  return 'LINE_ITEM';
}

function deriveSectionName(label: string): string {
  return label
    .replace(TOTAL_PREFIX_RE, '')
    .replace(TOTAL_SUFFIX_RE, '')
    .trim();
}

function deriveIndent(raw: string): number {
  // Count leading whitespace characters as a proxy for nesting depth.
  // Real exports use spaces, sometimes tabs.
  let i = 0;
  for (; i < raw.length; i++) {
    const c = raw[i];
    if (c !== ' ' && c !== '\t') break;
  }
  return i;
}

/* ──────────────────────── Source detection ─────────────────────── */

export function detectPnlSource(rows: PnlRow[]): PnlSource {
  // Best-effort — P&L exports vary less than journal entries. Look for
  // section-name signatures.
  const labels = rows.map((r) => r.label.toLowerCase());
  if (labels.some((l) => l.includes('trading income'))) return 'XERO';
  if (labels.some((l) => l.includes('direct costs'))) return 'XERO';
  if (labels.some((l) => l.includes('operating expenses'))) {
    // Both QBO and Xero use this; ambiguous on its own.
  }
  if (labels.some((l) => l.includes('cost of goods sold'))) return 'QBO';
  return 'UNKNOWN';
}

/* ─────────────────────────── Main parse ────────────────────────── */

export function parseProfitLoss(input: ParseInput): ParseResult {
  const columnMapping = buildColumnMapping(input.columns);
  const labelCol = Object.entries(columnMapping).find(([, v]) => v === 'Label')?.[0];
  const amountCol = Object.entries(columnMapping).find(([, v]) => v === 'Amount')?.[0];

  const topLevelIssues: ParseIssue[] = [];

  if (!labelCol || !amountCol || input.rows.length === 0) {
    if (input.rows.length === 0) {
      topLevelIssues.push({
        code: 'NO_DATA_ROWS',
        message: 'P&L CSV has no data rows after the header.',
      });
    }
    return {
      source: 'UNKNOWN',
      entityType: 'PROFIT_LOSS',
      rows: [],
      totals: nullTotals(),
      totalRowCount: 0,
      totalIssues: topLevelIssues.length,
      columnMapping,
      topLevelIssues,
    };
  }

  const state: PnlParseState = {
    rows: [],
    currentSection: null,
    sectionIssueCount: 0,
  };

  input.rows.forEach((raw, idx) => {
    processPnlRow(state, raw, idx + 1, labelCol, amountCol);
  });

  const totals = detectKeyTotals(state.rows);

  // Plausibility — every P&L should have at least Revenue and Net Income.
  if (totals.totalRevenue === null) {
    topLevelIssues.push({
      code: 'PNL_REVENUE_MISSING',
      message: 'Could not find a Revenue / Income total in the P&L. The export may be malformed or sliced before the Revenue section.',
    });
  }
  if (totals.netIncome === null) {
    topLevelIssues.push({
      code: 'PNL_NET_INCOME_MISSING',
      message: 'Could not find a Net Income / Net Profit row in the P&L. The export may be sliced before the bottom of the statement.',
    });
  }

  return {
    source: detectPnlSource(state.rows),
    entityType: 'PROFIT_LOSS',
    rows: state.rows,
    totals,
    totalRowCount: state.rows.length,
    totalIssues: topLevelIssues.length + state.sectionIssueCount,
    columnMapping,
    topLevelIssues,
  };
}

function processPnlRow(
  state: PnlParseState,
  raw: Record<string, unknown>,
  rowIndex: number,
  labelCol: string,
  amountCol: string,
): void {
  const rawLabel = String(raw[labelCol] ?? '');
  const labelStripped = rawLabel.trim();
  if (labelStripped === '') return;

  const rawAmount = raw[amountCol];
  const amount = parsePnlAmount(rawAmount);
  if (rawAmount !== undefined && rawAmount !== null && String(rawAmount).trim() !== '' && amount === null) {
    state.sectionIssueCount++;
  }

  const indent = deriveIndent(rawLabel);
  const kind = classifyRow(labelStripped, amount, indent);
  if (kind === 'SECTION_HEADER') {
    state.currentSection = labelStripped;
  }

  state.rows.push({
    rowIndex,
    label: labelStripped,
    amount,
    kind,
    section: kind === 'SECTION_HEADER' ? null : state.currentSection,
    indent,
    raw: rawAmount !== undefined ? String(rawAmount) : null,
  });

  const closesCurrentSection =
    kind === 'SUBTOTAL' &&
    deriveSectionName(labelStripped).toLowerCase() === (state.currentSection ?? '').toLowerCase();
  if (closesCurrentSection) {
    state.currentSection = null;
  }
}

function parsePnlAmount(rawAmount: unknown): number | null {
  if (rawAmount === undefined || rawAmount === null || String(rawAmount).trim() === '') return null;
  return parseDecimal(rawAmount);
}

function nullTotals(): ParseResult['totals'] {
  return {
    totalRevenue: null,
    totalCogs: null,
    grossProfit: null,
    totalExpenses: null,
    operatingIncome: null,
    netIncome: null,
  };
}

const REVENUE_RE = /^total\s+(trading\s+income|income|revenue|sales)$/i;
const COGS_RE = /^total\s+(cost\s+of\s+goods\s+sold|cost\s+of\s+sales|direct\s+costs|cogs)$/i;
const GROSS_PROFIT_RE = /^gross\s+(profit|margin)$/i;
const EXPENSES_RE = /^total\s+(operating\s+)?expenses$/i;
const OPERATING_RE = /^(net\s+)?operating\s+(income|profit)$/i;
const NET_INCOME_RE = /^net\s+(income|profit|loss)$/i;

function detectKeyTotals(rows: PnlRow[]): ParseResult['totals'] {
  const out = nullTotals();
  for (const row of rows) {
    if (row.amount === null) continue;
    const label = row.label;
    if (out.totalRevenue === null && REVENUE_RE.test(label)) out.totalRevenue = row.amount;
    if (out.totalCogs === null && COGS_RE.test(label)) out.totalCogs = row.amount;
    if (out.grossProfit === null && GROSS_PROFIT_RE.test(label)) out.grossProfit = row.amount;
    if (out.totalExpenses === null && EXPENSES_RE.test(label)) out.totalExpenses = row.amount;
    if (out.operatingIncome === null && OPERATING_RE.test(label)) out.operatingIncome = row.amount;
    if (out.netIncome === null && NET_INCOME_RE.test(label)) out.netIncome = row.amount;
  }
  return out;
}
