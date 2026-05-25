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
  const rows: string[][] = [];
  let current: string[] = [];
  let cell = '';
  let inQuotes = false;
  let i = 0;
  const n = text.length;

  while (i < n) {
    if (inQuotes) {
      const next = readQuotedChar(text, i, cell);
      cell = next.cell;
      inQuotes = next.inQuotes;
      i = next.nextIndex;
      continue;
    }

    const next = readUnquotedChar(text, i, cell);
    if (next.action === 'startQuote') {
      inQuotes = true;
    } else if (next.action === 'endCell') {
      current.push(next.cell);
      cell = '';
    } else if (next.action === 'endRow') {
      current.push(cell);
      rows.push(current);
      current = [];
      cell = '';
    } else {
      cell = next.cell;
    }
    i = next.nextIndex;
  }

  // Flush final cell + row if the file does not end with a newline.
  if (cell !== '' || current.length > 0) {
    current.push(cell);
    rows.push(current);
  }
  return rows;
}

function readQuotedChar(
  text: string,
  index: number,
  cell: string,
): { cell: string; inQuotes: boolean; nextIndex: number } {
  const ch = text[index];
  if (ch !== QUOTE) {
    return { cell: cell + ch, inQuotes: true, nextIndex: index + 1 };
  }
  if (text[index + 1] === QUOTE) {
    return { cell: cell + QUOTE, inQuotes: true, nextIndex: index + 2 };
  }
  return { cell, inQuotes: false, nextIndex: index + 1 };
}

function readUnquotedChar(
  text: string,
  index: number,
  cell: string,
): { action: 'append' | 'startQuote' | 'endCell' | 'endRow' | 'skip'; cell: string; nextIndex: number } {
  const ch = text[index];
  if (ch === QUOTE) return { action: 'startQuote', cell, nextIndex: index + 1 };
  if (ch === COMMA) return { action: 'endCell', cell, nextIndex: index + 1 };
  if (ch === '\r') return { action: 'skip', cell, nextIndex: index + 1 };
  if (ch === '\n') return { action: 'endRow', cell, nextIndex: index + 1 };
  return { action: 'append', cell: cell + ch, nextIndex: index + 1 };
}
