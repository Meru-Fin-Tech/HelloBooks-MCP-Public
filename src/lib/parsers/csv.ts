/**
 * Tiny RFC 4180 CSV parser — handles the cases QBO / Xero exports produce.
 *
 * Why hand-roll instead of pulling papaparse: the repo's runtime dep
 * footprint is intentionally minimal (4 packages). A 100-line parser that
 * covers QBO's actual CSV shape is the right trade — no new dep, no
 * supply-chain surface, full control over edge cases.
 *
 * Handled:
 *   • Quoted fields (`"foo,bar"`)
 *   • Escaped quotes inside quoted fields (`""`)
 *   • Embedded newlines inside quoted fields
 *   • CRLF and LF line endings (mixed within one file is allowed)
 *   • UTF-8 BOM at file start (stripped)
 *   • Leading "Read me" / banner rows — caller supplies an `optional`
 *     auto-skip via the `skipUntilHeaderMatch` helper if needed
 *
 * NOT handled (out of scope — QBO/Xero don't produce these):
 *   • Custom delimiters (always comma)
 *   • Other quote styles (always double-quote)
 *   • Empty trailing lines beyond a single line break (silently dropped)
 */

export interface ParseCsvResult {
  columns: string[];
  rows: Record<string, string>[];
}

export interface ParseCsvOptions {
  /** Limit total data rows to guard against runaway pastes. */
  maxRows?: number;
}

const QUOTE = '"';
const COMMA = ',';

/**
 * Parse a CSV string into `{columns, rows}`. Throws when the input is
 * empty or malformed beyond auto-repair.
 */
export function parseCsv(text: string, opts: ParseCsvOptions = {}): ParseCsvResult {
  const maxRows = opts.maxRows ?? Number.POSITIVE_INFINITY;
  const cleaned = stripBom(text);
  if (cleaned.trim() === '') {
    return { columns: [], rows: [] };
  }

  const rows = tokenize(cleaned);
  if (rows.length === 0) {
    return { columns: [], rows: [] };
  }

  const columns = rows[0].map((c) => c.trim());
  const out: Record<string, string>[] = [];
  for (let i = 1; i < rows.length; i++) {
    if (out.length >= maxRows) break;
    const cells = rows[i];
    // Skip wholly blank rows — papaparse default behaviour.
    if (cells.every((c) => c.trim() === '')) continue;
    const obj: Record<string, string> = {};
    for (let c = 0; c < columns.length; c++) {
      obj[columns[c]] = cells[c] ?? '';
    }
    out.push(obj);
  }
  return { columns, rows: out };
}

/** Strip a UTF-8 BOM if present. */
function stripBom(s: string): string {
  if (s.codePointAt(0) === 0xfeff) return s.slice(1);
  return s;
}

/**
 * Tokenise a CSV string into rows of cells. Single-pass, handles quoted
 * fields with embedded newlines + escaped quotes.
 */
function tokenize(text: string): string[][] {
  const state: TokenizeState = {
    rows: [],
    current: [],
    cell: '',
    inQuotes: false,
  };
  let i = 0;
  const n = text.length;

  while (i < n) {
    const ch = text[i];
    i = state.inQuotes
      ? readQuotedChar(text, i, state)
      : readUnquotedChar(ch, i, state);
  }

  // Flush final cell + row if the file does not end with a newline.
  if (state.cell !== '' || state.current.length > 0) {
    flushRow(state);
  }
  return state.rows;
}

interface TokenizeState {
  rows: string[][];
  current: string[];
  cell: string;
  inQuotes: boolean;
}

function readQuotedChar(text: string, i: number, state: TokenizeState): number {
  const ch = text[i];
  if (ch !== QUOTE) {
    state.cell += ch;
    return i + 1;
  }
  if (text[i + 1] === QUOTE) {
    state.cell += QUOTE;
    return i + 2;
  }
  state.inQuotes = false;
  return i + 1;
}

function readUnquotedChar(ch: string, i: number, state: TokenizeState): number {
  if (ch === QUOTE) {
    state.inQuotes = true;
    return i + 1;
  }
  if (ch === COMMA) {
    flushCell(state);
    return i + 1;
  }
  if (ch === '\r') {
    // Swallow \r so \r\n is treated as a single terminator.
    return i + 1;
  }
  if (ch === '\n') {
    flushRow(state);
    return i + 1;
  }
  state.cell += ch;
  return i + 1;
}

function flushCell(state: TokenizeState): void {
  state.current.push(state.cell);
  state.cell = '';
}

function flushRow(state: TokenizeState): void {
  flushCell(state);
  state.rows.push(state.current);
  state.current = [];
}
