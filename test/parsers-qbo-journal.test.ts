import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parseQboJournalEntries,
  buildColumnMapping,
  QBO_JOURNAL_COLUMN_ALIASES,
  type ParseInput,
} from '../src/lib/parsers/qboJournal.js';
import { parseDecimal, parseFlexibleDate, trimOrNull, normalizeHeader } from '../src/lib/parsers/fieldUtils.js';

/* ────────────────────────── fieldUtils ─────────────────────────── */

test('parseDecimal handles US format with comma thousands', () => {
  assert.equal(parseDecimal('1,500.00'), 1500);
  assert.equal(parseDecimal('12,345.67'), 12345.67);
});

test('parseDecimal handles European format with dot thousands', () => {
  assert.equal(parseDecimal('1.500,00'), 1500);
  assert.equal(parseDecimal('12.345,67'), 12345.67);
});

test('parseDecimal handles accounting parentheses as negative', () => {
  assert.equal(parseDecimal('(1,234.56)'), -1234.56);
});

test('parseDecimal strips currency symbols', () => {
  assert.equal(parseDecimal('$1,500.00'), 1500);
  assert.equal(parseDecimal('₹1,500'), 1500);
  assert.equal(parseDecimal('£99.99'), 99.99);
});

test('parseDecimal returns null for empty / unparseable', () => {
  assert.equal(parseDecimal(''), null);
  assert.equal(parseDecimal(null), null);
  assert.equal(parseDecimal(undefined), null);
  assert.equal(parseDecimal('not a number'), null);
});

test('parseDecimal handles bare negative sign', () => {
  assert.equal(parseDecimal('-50'), -50);
  assert.equal(parseDecimal('-1,234.56'), -1234.56);
});

test('parseFlexibleDate parses ISO format', () => {
  assert.equal(parseFlexibleDate('2024-03-15'), '2024-03-15');
});

test('parseFlexibleDate parses US slash format with MDY preference', () => {
  assert.equal(parseFlexibleDate('03/15/2024', { prefer: 'mdy' }), '2024-03-15');
});

test('parseFlexibleDate parses UK/AU/IN slash format with DMY preference', () => {
  assert.equal(parseFlexibleDate('15/03/2024', { prefer: 'dmy' }), '2024-03-15');
});

test('parseFlexibleDate auto-detects when day > 12', () => {
  assert.equal(parseFlexibleDate('15/03/2024'), '2024-03-15');
});

test('parseFlexibleDate parses "Mar 15, 2024" Wave-style', () => {
  assert.equal(parseFlexibleDate('Mar 15, 2024'), '2024-03-15');
});

test('parseFlexibleDate parses "15-Mar-2024" Xero-style', () => {
  assert.equal(parseFlexibleDate('15-Mar-2024'), '2024-03-15');
});

test('parseFlexibleDate rejects out-of-range days (31-Feb)', () => {
  assert.equal(parseFlexibleDate('2024-02-31'), null);
  assert.equal(parseFlexibleDate('02/31/2024', { prefer: 'mdy' }), null);
});

test('parseFlexibleDate returns null for unparseable input', () => {
  assert.equal(parseFlexibleDate('not a date'), null);
  assert.equal(parseFlexibleDate(''), null);
  assert.equal(parseFlexibleDate(null), null);
});

test('trimOrNull collapses empty / whitespace / undefined to null', () => {
  assert.equal(trimOrNull(''), null);
  assert.equal(trimOrNull('   '), null);
  assert.equal(trimOrNull(undefined), null);
  assert.equal(trimOrNull(null), null);
  assert.equal(trimOrNull('  hello  '), 'hello');
});

test('normalizeHeader is case-insensitive and collapses whitespace', () => {
  assert.equal(normalizeHeader('  Journal  Date '), 'journal date');
  assert.equal(normalizeHeader('NUM'), 'num');
});

/* ─────────────────── Column mapping detection ──────────────────── */

test('buildColumnMapping recognises canonical QBO headers', () => {
  const mapping = buildColumnMapping(['Date', 'Num', 'Account', 'Debit', 'Credit']);
  assert.equal(mapping.Date, 'Date');
  assert.equal(mapping.Num, 'JournalNumber');
  assert.equal(mapping.Account, 'AccountName');
  assert.equal(mapping.Debit, 'Debit');
  assert.equal(mapping.Credit, 'Credit');
});

test('buildColumnMapping is case- and whitespace-insensitive', () => {
  const mapping = buildColumnMapping(['  JOURNAL  DATE  ', 'JE No', 'account name']);
  assert.equal(mapping['  JOURNAL  DATE  '], 'Date');
  assert.equal(mapping['JE No'], 'JournalNumber');
  assert.equal(mapping['account name'], 'AccountName');
});

test('buildColumnMapping leaves unknown headers null', () => {
  const mapping = buildColumnMapping(['Date', 'CustomColumn', 'WeirdField']);
  assert.equal(mapping.Date, 'Date');
  assert.equal(mapping.CustomColumn, null);
  assert.equal(mapping.WeirdField, null);
});

test('QBO_JOURNAL_COLUMN_ALIASES covers all 9 canonical fields', () => {
  const expected = [
    'Date', 'JournalNumber', 'AccountName', 'Debit', 'Credit',
    'Memo', 'Name', 'Class', 'Currency',
  ];
  for (const field of expected) {
    assert.ok(
      QBO_JOURNAL_COLUMN_ALIASES[field] !== undefined,
      `Missing alias list for canonical field "${field}"`,
    );
    assert.ok(
      QBO_JOURNAL_COLUMN_ALIASES[field].length > 0,
      `Alias list for "${field}" is empty`,
    );
  }
});

/* ───────────────────── End-to-end happy path ───────────────────── */

const HAPPY_PATH_INPUT: ParseInput = {
  columns: ['Date', 'Num', 'Account', 'Debit', 'Credit', 'Memo', 'Name', 'Class'],
  rows: [
    { Date: '03/15/2024', Num: 'JE-001', Account: 'Office Supplies', Debit: '500.00', Credit: '', Memo: 'Staples', Name: '', Class: '' },
    { Date: '03/15/2024', Num: 'JE-001', Account: 'Cash',            Debit: '',       Credit: '500.00', Memo: 'Staples', Name: '', Class: '' },
    { Date: '03/16/2024', Num: 'JE-002', Account: 'Travel',          Debit: '1,200.00', Credit: '',     Memo: 'Q1 kickoff', Name: '', Class: 'Sales' },
    { Date: '03/16/2024', Num: 'JE-002', Account: 'Cash',            Debit: '',       Credit: '1,200.00', Memo: 'Q1 kickoff', Name: '', Class: 'Sales' },
  ],
};

test('happy path: two balanced journals parsed, grouped, zero issues', () => {
  const result = parseQboJournalEntries(HAPPY_PATH_INPUT);
  assert.equal(result.source, 'QBO');
  assert.equal(result.entityType, 'JOURNAL_ENTRY');
  assert.equal(result.totalRows, 4);
  assert.equal(result.totalJournals, 2);
  assert.equal(result.totalIssues, 0);
  assert.equal(result.unmappedColumns.length, 0);

  const [je1, je2] = result.journals;
  assert.equal(je1.journalNumber, 'JE-001');
  assert.equal(je1.date, '2024-03-15');
  assert.equal(je1.balanced, true);
  assert.equal(je1.totalDebits, 500);
  assert.equal(je1.totalCredits, 500);
  assert.equal(je1.lines.length, 2);

  assert.equal(je2.journalNumber, 'JE-002');
  assert.equal(je2.totalDebits, 1200);
  assert.equal(je2.totalCredits, 1200);
});

test('multi-line journal: 4-line balanced JV groups correctly', () => {
  const input: ParseInput = {
    columns: ['Date', 'Num', 'Account', 'Debit', 'Credit'],
    rows: [
      { Date: '04/01/2024', Num: 'JE-100', Account: 'A', Debit: '100', Credit: '' },
      { Date: '04/01/2024', Num: 'JE-100', Account: 'B', Debit: '50',  Credit: '' },
      { Date: '04/01/2024', Num: 'JE-100', Account: 'C', Debit: '',    Credit: '100' },
      { Date: '04/01/2024', Num: 'JE-100', Account: 'D', Debit: '',    Credit: '50'  },
    ],
  };
  const result = parseQboJournalEntries(input);
  assert.equal(result.totalJournals, 1);
  assert.equal(result.journals[0].lines.length, 4);
  assert.equal(result.journals[0].balanced, true);
  assert.equal(result.journals[0].totalDebits, 150);
  assert.equal(result.journals[0].totalCredits, 150);
});

/* ────────────────── Detection / issue surfacing ────────────────── */

test('detects unbalanced journal', () => {
  const input: ParseInput = {
    columns: ['Date', 'Num', 'Account', 'Debit', 'Credit'],
    rows: [
      { Date: '04/01/2024', Num: 'JE-200', Account: 'X', Debit: '100', Credit: '' },
      { Date: '04/01/2024', Num: 'JE-200', Account: 'Y', Debit: '',    Credit: '90' },
    ],
  };
  const result = parseQboJournalEntries(input);
  assert.equal(result.totalIssues, 1);
  const je = result.journals[0];
  assert.equal(je.balanced, false);
  assert.equal(je.issues.length, 1);
  assert.equal(je.issues[0].code, 'UNBALANCED_JOURNAL');
  assert.match(je.issues[0].message, /unbalanced/i);
});

test('detects invalid date', () => {
  const input: ParseInput = {
    columns: ['Date', 'Num', 'Account', 'Debit', 'Credit'],
    rows: [
      { Date: 'not-a-date', Num: 'JE-300', Account: 'X', Debit: '100', Credit: '' },
      { Date: '04/01/2024', Num: 'JE-300', Account: 'Y', Debit: '',    Credit: '100' },
    ],
  };
  const result = parseQboJournalEntries(input);
  const lineIssues = result.journals[0].lines.flatMap((l) => l.issues);
  assert.equal(lineIssues.filter((i) => i.code === 'INVALID_DATE').length, 1);
});

test('detects invalid decimal', () => {
  const input: ParseInput = {
    columns: ['Date', 'Num', 'Account', 'Debit', 'Credit'],
    rows: [
      { Date: '04/01/2024', Num: 'JE-400', Account: 'X', Debit: 'oops', Credit: '' },
      { Date: '04/01/2024', Num: 'JE-400', Account: 'Y', Debit: '',     Credit: '100' },
    ],
  };
  const result = parseQboJournalEntries(input);
  const lineIssues = result.journals[0].lines.flatMap((l) => l.issues);
  assert.ok(lineIssues.some((i) => i.code === 'INVALID_DECIMAL'));
});

test('detects missing journal number', () => {
  const input: ParseInput = {
    columns: ['Date', 'Num', 'Account', 'Debit', 'Credit'],
    rows: [
      { Date: '04/01/2024', Num: '', Account: 'X', Debit: '100', Credit: '' },
    ],
  };
  const result = parseQboJournalEntries(input);
  // Row is captured as a line but with MISSING_JOURNAL_NUMBER issue and no
  // journal group (since we cannot group a nameless row).
  assert.equal(result.totalRows, 1);
  assert.equal(result.totalJournals, 0);
  const lineIssue = result.totalIssues > 0;
  assert.ok(lineIssue);
});

test('detects both debit and credit on same line', () => {
  const input: ParseInput = {
    columns: ['Date', 'Num', 'Account', 'Debit', 'Credit'],
    rows: [
      { Date: '04/01/2024', Num: 'JE-500', Account: 'X', Debit: '100', Credit: '50' },
      { Date: '04/01/2024', Num: 'JE-500', Account: 'Y', Debit: '',    Credit: '50' },
    ],
  };
  const result = parseQboJournalEntries(input);
  const lineIssues = result.journals[0].lines.flatMap((l) => l.issues);
  assert.ok(lineIssues.some((i) => i.code === 'BOTH_DEBIT_AND_CREDIT'));
});

test('detects neither debit nor credit on same line', () => {
  const input: ParseInput = {
    columns: ['Date', 'Num', 'Account', 'Debit', 'Credit'],
    rows: [
      { Date: '04/01/2024', Num: 'JE-600', Account: 'X', Debit: '', Credit: '' },
    ],
  };
  const result = parseQboJournalEntries(input);
  const lineIssues = result.journals[0].lines.flatMap((l) => l.issues);
  assert.ok(lineIssues.some((i) => i.code === 'NEITHER_DEBIT_NOR_CREDIT'));
});

test('detects inconsistent dates within the same journal', () => {
  const input: ParseInput = {
    columns: ['Date', 'Num', 'Account', 'Debit', 'Credit'],
    rows: [
      { Date: '04/01/2024', Num: 'JE-700', Account: 'X', Debit: '100', Credit: '' },
      { Date: '04/02/2024', Num: 'JE-700', Account: 'Y', Debit: '',    Credit: '100' },
    ],
  };
  const result = parseQboJournalEntries(input);
  assert.ok(result.journals[0].issues.some((i) => i.code === 'INCONSISTENT_DATE'));
});

/* ─────────────────── Robustness / edge cases ───────────────────── */

test('empty input returns zero-everything', () => {
  const result = parseQboJournalEntries({ columns: [], rows: [] });
  assert.equal(result.totalRows, 0);
  assert.equal(result.totalJournals, 0);
  assert.equal(result.totalIssues, 0);
});

test('skips wholly empty rows', () => {
  const input: ParseInput = {
    columns: ['Date', 'Num', 'Account', 'Debit', 'Credit'],
    rows: [
      { Date: '', Num: '', Account: '', Debit: '', Credit: '' },
      { Date: '04/01/2024', Num: 'JE-800', Account: 'X', Debit: '100', Credit: '' },
      { Date: '04/01/2024', Num: 'JE-800', Account: 'Y', Debit: '',    Credit: '100' },
    ],
  };
  const result = parseQboJournalEntries(input);
  assert.equal(result.totalRows, 2);
  assert.equal(result.totalJournals, 1);
});

test('alternate column header aliases work (e.g. JE No.)', () => {
  const input: ParseInput = {
    columns: ['Journal Date', 'JE No', 'Account Name', 'DR', 'CR'],
    rows: [
      { 'Journal Date': '04/01/2024', 'JE No': 'JE-900', 'Account Name': 'X', DR: '100', CR: '' },
      { 'Journal Date': '04/01/2024', 'JE No': 'JE-900', 'Account Name': 'Y', DR: '',    CR: '100' },
    ],
  };
  const result = parseQboJournalEntries(input);
  assert.equal(result.totalJournals, 1);
  assert.equal(result.totalIssues, 0);
});

test('unmapped columns surface in result', () => {
  const input: ParseInput = {
    columns: ['Date', 'Num', 'Account', 'Debit', 'Credit', 'CustomA', 'CustomB'],
    rows: [
      { Date: '04/01/2024', Num: 'JE-A', Account: 'X', Debit: '100', Credit: '', CustomA: 'x', CustomB: 'y' },
      { Date: '04/01/2024', Num: 'JE-A', Account: 'Y', Debit: '',    Credit: '100', CustomA: 'x', CustomB: 'y' },
    ],
  };
  const result = parseQboJournalEntries(input);
  assert.deepEqual(result.unmappedColumns.sort(), ['CustomA', 'CustomB']);
});

test('handles European decimal format in QBO multi-region exports', () => {
  const input: ParseInput = {
    columns: ['Date', 'Num', 'Account', 'Debit', 'Credit'],
    rows: [
      { Date: '04/01/2024', Num: 'JE-EU', Account: 'X', Debit: '1.500,00', Credit: '' },
      { Date: '04/01/2024', Num: 'JE-EU', Account: 'Y', Debit: '',         Credit: '1.500,00' },
    ],
  };
  const result = parseQboJournalEntries(input);
  assert.equal(result.totalIssues, 0);
  assert.equal(result.journals[0].totalDebits, 1500);
  assert.equal(result.journals[0].balanced, true);
});
