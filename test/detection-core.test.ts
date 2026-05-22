import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  detectImbalance,
  detectDuplicates,
  detectRoundNumber,
  normalizeQboJournal,
  normalizeXeroJournal,
  type NormalizedJournal,
} from '../src/lib/detection/index.js';
import { parseQboJournalEntries } from '../src/lib/parsers/qboJournal.js';
import { parseXeroJournalEntries } from '../src/lib/parsers/xeroJournal.js';

/* ─────────────────────── Test helpers ──────────────────────────── */

function journal(opts: Partial<NormalizedJournal> & { id: string }): NormalizedJournal {
  // Use `in opts` for `date` so an explicit `date: null` is preserved
  // (the ?? operator would otherwise coalesce it to the default).
  const date = 'date' in opts ? (opts.date ?? null) : '2024-03-15';
  return {
    source: 'QBO',
    id: opts.id,
    reference: opts.reference ?? opts.id,
    narration: opts.narration ?? null,
    date,
    lines: opts.lines ?? [],
    totalDebits: opts.totalDebits ?? 0,
    totalCredits: opts.totalCredits ?? 0,
    balanced: opts.balanced ?? true,
  };
}

/* ───────────────────────── IMBALANCE ───────────────────────────── */

test('detectImbalance returns empty list for all balanced journals', () => {
  const flags = detectImbalance([
    journal({ id: 'A', totalDebits: 100, totalCredits: 100, balanced: true }),
    journal({ id: 'B', totalDebits: 50,  totalCredits: 50,  balanced: true }),
  ]);
  assert.equal(flags.length, 0);
});

test('detectImbalance flags unbalanced journal with high severity at ≥ 5%', () => {
  const flags = detectImbalance([
    journal({ id: 'X', totalDebits: 100, totalCredits: 90, balanced: false }),
  ]);
  assert.equal(flags.length, 1);
  assert.equal(flags[0].severity, 'high');
  assert.equal(flags[0].category, 'IMBALANCE');
  assert.equal(flags[0].code, 'imbalance.journal');
  assert.equal(flags[0].fixableInHellobooks, true);
});

test('detectImbalance assigns medium severity at 0.5% — 5%', () => {
  const flags = detectImbalance([
    journal({ id: 'Y', totalDebits: 1000, totalCredits: 990, balanced: false }), // 1% diff
  ]);
  assert.equal(flags[0].severity, 'medium');
});

test('detectImbalance assigns low severity for sub-0.5% rounding noise', () => {
  const flags = detectImbalance([
    journal({ id: 'Z', totalDebits: 10000, totalCredits: 9999.50, balanced: false }), // 0.005%
  ]);
  assert.equal(flags[0].severity, 'low');
});

test('detectImbalance includes diff and totals in flag data', () => {
  const flags = detectImbalance([
    journal({ id: 'W', totalDebits: 200, totalCredits: 150, balanced: false }),
  ]);
  assert.equal(flags[0].data?.debits, 200);
  assert.equal(flags[0].data?.credits, 150);
  assert.equal(flags[0].data?.diff, 50);
});

/* ───────────────────────── DUPLICATES ──────────────────────────── */

test('detectDuplicates returns empty for distinct journals', () => {
  const flags = detectDuplicates([
    journal({ id: 'A', date: '2024-03-15', totalDebits: 100, totalCredits: 100 }),
    journal({ id: 'B', date: '2024-03-15', totalDebits: 200, totalCredits: 200 }),
  ]);
  assert.equal(flags.length, 0);
});

test('detectDuplicates flags two journals with same date + totals', () => {
  const flags = detectDuplicates([
    journal({ id: 'JE-1', date: '2024-03-15', totalDebits: 500, totalCredits: 500 }),
    journal({ id: 'JE-2', date: '2024-03-15', totalDebits: 500, totalCredits: 500 }),
  ]);
  assert.equal(flags.length, 1);
  assert.equal(flags[0].category, 'DUPLICATE');
  assert.equal(flags[0].code, 'duplicate.exact_amount_date');
  assert.deepEqual(flags[0].affectedJournalIds.sort(), ['JE-1', 'JE-2']);
  assert.equal(flags[0].data?.count, 2);
});

test('detectDuplicates does NOT match different dates', () => {
  const flags = detectDuplicates([
    journal({ id: 'A', date: '2024-03-15', totalDebits: 500, totalCredits: 500 }),
    journal({ id: 'B', date: '2024-03-16', totalDebits: 500, totalCredits: 500 }),
  ]);
  assert.equal(flags.length, 0);
});

test('detectDuplicates does NOT match different amounts', () => {
  const flags = detectDuplicates([
    journal({ id: 'A', date: '2024-03-15', totalDebits: 500, totalCredits: 500 }),
    journal({ id: 'B', date: '2024-03-15', totalDebits: 500.01, totalCredits: 500.01 }),
  ]);
  assert.equal(flags.length, 0);
});

test('detectDuplicates ignores journals missing date', () => {
  const flags = detectDuplicates([
    journal({ id: 'A', date: null, totalDebits: 500, totalCredits: 500 }),
    journal({ id: 'B', date: null, totalDebits: 500, totalCredits: 500 }),
  ]);
  assert.equal(flags.length, 0);
});

test('detectDuplicates flags 3-way duplicate as a single flag with 3 ids', () => {
  const flags = detectDuplicates([
    journal({ id: 'JE-1', date: '2024-04-01', totalDebits: 100, totalCredits: 100 }),
    journal({ id: 'JE-2', date: '2024-04-01', totalDebits: 100, totalCredits: 100 }),
    journal({ id: 'JE-3', date: '2024-04-01', totalDebits: 100, totalCredits: 100 }),
  ]);
  assert.equal(flags.length, 1);
  assert.equal(flags[0].affectedJournalIds.length, 3);
  assert.equal(flags[0].data?.count, 3);
});

test('detectDuplicates output is deterministically ordered by date then total', () => {
  const flags = detectDuplicates([
    journal({ id: 'B-1', date: '2024-04-02', totalDebits: 200, totalCredits: 200 }),
    journal({ id: 'B-2', date: '2024-04-02', totalDebits: 200, totalCredits: 200 }),
    journal({ id: 'A-1', date: '2024-04-01', totalDebits: 100, totalCredits: 100 }),
    journal({ id: 'A-2', date: '2024-04-01', totalDebits: 100, totalCredits: 100 }),
  ]);
  assert.equal(flags.length, 2);
  assert.equal(flags[0].data?.date, '2024-04-01');
  assert.equal(flags[1].data?.date, '2024-04-02');
});

/* ──────────────────────── ROUND_NUMBER ─────────────────────────── */

test('detectRoundNumber returns empty for irregular amounts', () => {
  const flags = detectRoundNumber([
    journal({
      id: 'A',
      lines: [{ rowIndex: 1, accountIdentifier: 'X', debit: 1247.83, credit: null, memo: null }],
    }),
  ]);
  assert.equal(flags.length, 0);
});

test('detectRoundNumber flags lines that are exact multiples of 1000 ≥ $1000', () => {
  const flags = detectRoundNumber([
    journal({
      id: 'A',
      lines: [{ rowIndex: 1, accountIdentifier: 'X', debit: 5000, credit: null, memo: 'Round' }],
    }),
  ]);
  assert.equal(flags.length, 1);
  assert.equal(flags[0].category, 'ROUND_NUMBER');
  assert.equal(flags[0].severity, 'low'); // < 10K
  assert.equal(flags[0].fixableInHellobooks, false); // round-number is suggestive, not auto-fixable
});

test('detectRoundNumber escalates severity by absolute amount', () => {
  const flags = detectRoundNumber([
    journal({
      id: 'A',
      lines: [
        { rowIndex: 1, accountIdentifier: 'X', debit: 5000,    credit: null, memo: null },   // low
        { rowIndex: 2, accountIdentifier: 'Y', debit: 15000,   credit: null, memo: null },   // medium
        { rowIndex: 3, accountIdentifier: 'Z', debit: 150000,  credit: null, memo: null },   // high
      ],
    }),
  ]);
  assert.equal(flags.length, 3);
  assert.deepEqual(flags.map((f) => f.severity), ['low', 'medium', 'high']);
});

test('detectRoundNumber ignores amounts below $1000', () => {
  const flags = detectRoundNumber([
    journal({
      id: 'A',
      lines: [{ rowIndex: 1, accountIdentifier: 'X', debit: 500, credit: null, memo: null }],
    }),
  ]);
  assert.equal(flags.length, 0);
});

test('detectRoundNumber ignores non-multiples of 1000', () => {
  const flags = detectRoundNumber([
    journal({
      id: 'A',
      lines: [{ rowIndex: 1, accountIdentifier: 'X', debit: 5500, credit: null, memo: null }],
    }),
  ]);
  assert.equal(flags.length, 0);
});

test('detectRoundNumber works on credit-side lines too', () => {
  const flags = detectRoundNumber([
    journal({
      id: 'A',
      lines: [{ rowIndex: 1, accountIdentifier: 'X', debit: null, credit: 10000, memo: null }],
    }),
  ]);
  assert.equal(flags.length, 1);
  assert.equal(flags[0].severity, 'medium');
});

/* ─────────────────────── NORMALIZE round-trip ──────────────────── */

test('normalizeQboJournal carries journalNumber + accountName into normalised shape', () => {
  const qbo = parseQboJournalEntries({
    columns: ['Date', 'Num', 'Account', 'Debit', 'Credit'],
    rows: [
      { Date: '03/15/2024', Num: 'JE-001', Account: 'Office Expenses', Debit: '500', Credit: '' },
      { Date: '03/15/2024', Num: 'JE-001', Account: 'Cash',            Debit: '',    Credit: '500' },
    ],
  });
  const norm = normalizeQboJournal(qbo.journals[0]);
  assert.equal(norm.source, 'QBO');
  assert.equal(norm.id, 'JE-001');
  assert.equal(norm.reference, 'JE-001');
  assert.equal(norm.date, '2024-03-15');
  assert.equal(norm.lines.length, 2);
  assert.equal(norm.lines[0].accountIdentifier, 'Office Expenses');
});

test('normalizeXeroJournal prefers accountCode and reads narration', () => {
  const xero = parseXeroJournalEntries({
    columns: ['Narration', 'Date', 'Reference', 'AccountCode', 'Amount'],
    rows: [
      { Narration: 'Mar payroll', Date: '31/03/2024', Reference: 'MJ-7', AccountCode: '400', Amount: '-2500' },
      { Narration: 'Mar payroll', Date: '31/03/2024', Reference: 'MJ-7', AccountCode: '090', Amount: '2500'  },
    ],
  });
  const norm = normalizeXeroJournal(xero.journals[0]);
  assert.equal(norm.source, 'XERO');
  assert.equal(norm.reference, 'MJ-7');
  assert.equal(norm.narration, 'Mar payroll');
  assert.equal(norm.date, '2024-03-31');
  assert.equal(norm.lines[0].accountIdentifier, '400');
});

/* ──────────────── End-to-end: parse → normalise → detect ───────── */

test('end-to-end QBO: parser + imbalance detector catches off-by-10', () => {
  const qbo = parseQboJournalEntries({
    columns: ['Date', 'Num', 'Account', 'Debit', 'Credit'],
    rows: [
      { Date: '03/15/2024', Num: 'JE-X', Account: 'A', Debit: '100', Credit: '' },
      { Date: '03/15/2024', Num: 'JE-X', Account: 'B', Debit: '',    Credit: '90' },
    ],
  });
  const normalised = qbo.journals.map(normalizeQboJournal);
  const flags = detectImbalance(normalised);
  assert.equal(flags.length, 1);
  assert.equal(flags[0].severity, 'high');
});

test('end-to-end Xero: parser + duplicate detector catches same-date same-total pair', () => {
  const xero = parseXeroJournalEntries({
    columns: ['Narration', 'Date', 'Reference', 'AccountCode', 'Amount'],
    rows: [
      { Narration: 'Dup', Date: '01/04/2024', Reference: 'MJ-A', AccountCode: '400', Amount: '-500' },
      { Narration: 'Dup', Date: '01/04/2024', Reference: 'MJ-A', AccountCode: '090', Amount: '500'  },
      { Narration: 'Dup', Date: '01/04/2024', Reference: 'MJ-B', AccountCode: '400', Amount: '-500' },
      { Narration: 'Dup', Date: '01/04/2024', Reference: 'MJ-B', AccountCode: '090', Amount: '500'  },
    ],
  });
  const normalised = xero.journals.map(normalizeXeroJournal);
  const flags = detectDuplicates(normalised);
  assert.equal(flags.length, 1);
  assert.equal(flags[0].affectedJournalIds.length, 2);
});

test('end-to-end: round-number detector finds a $50,000 plug', () => {
  const qbo = parseQboJournalEntries({
    columns: ['Date', 'Num', 'Account', 'Debit', 'Credit'],
    rows: [
      { Date: '03/31/2024', Num: 'JE-Plug', Account: 'Misc Expense', Debit: '50000', Credit: '' },
      { Date: '03/31/2024', Num: 'JE-Plug', Account: 'Cash',         Debit: '',      Credit: '50000' },
    ],
  });
  const normalised = qbo.journals.map(normalizeQboJournal);
  const flags = detectRoundNumber(normalised);
  // Two round-number lines (debit 50k + credit 50k), both severity=medium.
  assert.equal(flags.length, 2);
  for (const f of flags) {
    assert.equal(f.severity, 'medium');
  }
});
