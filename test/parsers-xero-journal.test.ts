import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parseXeroJournalEntries,
  buildColumnMapping,
  XERO_JOURNAL_COLUMN_ALIASES,
  type ParseInput,
} from '../src/lib/parsers/xeroJournal.js';

/* ─────────────────── Column mapping detection ──────────────────── */

test('Xero buildColumnMapping recognises canonical headers', () => {
  const mapping = buildColumnMapping(['Narration', 'Date', 'Reference', 'AccountCode', 'Amount']);
  assert.equal(mapping.Narration, 'Narration');
  assert.equal(mapping.Date, 'Date');
  assert.equal(mapping.Reference, 'Reference');
  assert.equal(mapping.AccountCode, 'AccountCode');
  assert.equal(mapping.Amount, 'Amount');
});

test('Xero buildColumnMapping prefers Narration over Description for "memo"', () => {
  const mapping = buildColumnMapping(['Narration', 'Description']);
  assert.equal(mapping.Narration, 'Narration');
  // Description must own the line-level slot, not steal from Narration.
  assert.equal(mapping.Description, 'LineDesc');
});

test('Xero buildColumnMapping accepts Debit/Credit fallback shape', () => {
  const mapping = buildColumnMapping(['Date', 'Reference', 'Account', 'Debit', 'Credit']);
  assert.equal(mapping.Debit, 'Debit');
  assert.equal(mapping.Credit, 'Credit');
  assert.equal(mapping.Account, 'AccountCode'); // 'account' alias falls to AccountCode
});

test('Xero buildColumnMapping is case- and whitespace-insensitive', () => {
  const mapping = buildColumnMapping(['  ACCOUNT  CODE  ', 'tax type']);
  assert.equal(mapping['  ACCOUNT  CODE  '], 'AccountCode');
  assert.equal(mapping['tax type'], 'TaxType');
});

test('XERO_JOURNAL_COLUMN_ALIASES covers all 11 canonical fields', () => {
  const expected = [
    'Narration', 'Date', 'Reference', 'AccountCode', 'AccountName',
    'LineDesc', 'TaxType', 'Amount', 'Debit', 'Credit', 'Currency',
  ];
  for (const field of expected) {
    assert.ok(
      XERO_JOURNAL_COLUMN_ALIASES[field] !== undefined,
      `Missing alias list for canonical field "${field}"`,
    );
    assert.ok(
      XERO_JOURNAL_COLUMN_ALIASES[field].length > 0,
      `Alias list for "${field}" is empty`,
    );
  }
});

/* ───────────── End-to-end happy path — signed Amount ───────────── */

const HAPPY_SIGNED_AMOUNT: ParseInput = {
  columns: ['Narration', 'Date', 'Reference', 'AccountCode', 'Description', 'Amount'],
  rows: [
    { Narration: 'Office supplies purchase', Date: '15/03/2024', Reference: 'MJ-001', AccountCode: '400', Description: 'Staples', Amount: '-500.00' },
    { Narration: 'Office supplies purchase', Date: '15/03/2024', Reference: 'MJ-001', AccountCode: '090', Description: 'Staples', Amount: '500.00' },
    { Narration: 'Travel reimbursement',    Date: '16/03/2024', Reference: 'MJ-002', AccountCode: '420', Description: 'Q1 trip', Amount: '-1,200.00' },
    { Narration: 'Travel reimbursement',    Date: '16/03/2024', Reference: 'MJ-002', AccountCode: '090', Description: 'Q1 trip', Amount: '1,200.00' },
  ],
};

test('Xero happy path: signed-Amount parsing, two balanced journals, zero issues', () => {
  const result = parseXeroJournalEntries(HAPPY_SIGNED_AMOUNT);
  assert.equal(result.source, 'XERO');
  assert.equal(result.entityType, 'JOURNAL_ENTRY');
  assert.equal(result.totalRows, 4);
  assert.equal(result.totalJournals, 2);
  assert.equal(result.totalIssues, 0);

  const [mj1, mj2] = result.journals;
  assert.equal(mj1.reference, 'MJ-001');
  assert.equal(mj1.date, '2024-03-15');
  assert.equal(mj1.balanced, true);
  assert.equal(mj1.totalDebits, 500);
  assert.equal(mj1.totalCredits, 500);
  assert.equal(mj1.lines.length, 2);

  assert.equal(mj2.reference, 'MJ-002');
  assert.equal(mj2.totalDebits, 1200);
  assert.equal(mj2.totalCredits, 1200);
});

/* ─────────── End-to-end happy path — explicit Debit/Credit ─────── */

test('Xero happy path: explicit Debit/Credit columns produce same shape', () => {
  const input: ParseInput = {
    columns: ['Narration', 'Date', 'Reference', 'AccountCode', 'Debit', 'Credit'],
    rows: [
      { Narration: 'Cash sale', Date: '15/03/2024', Reference: 'MJ-100', AccountCode: '090', Debit: '500.00', Credit: '' },
      { Narration: 'Cash sale', Date: '15/03/2024', Reference: 'MJ-100', AccountCode: '200', Debit: '',       Credit: '500.00' },
    ],
  };
  const result = parseXeroJournalEntries(input);
  assert.equal(result.totalIssues, 0);
  assert.equal(result.totalJournals, 1);
  assert.equal(result.journals[0].balanced, true);
});

/* ────────────── Grouping by Narration+Date (no Reference) ───────── */

test('Xero groups by Narration+Date when Reference is blank', () => {
  const input: ParseInput = {
    columns: ['Narration', 'Date', 'AccountCode', 'Amount'],
    rows: [
      { Narration: 'Year-end accrual', Date: '31/03/2024', AccountCode: '400', Amount: '-1000' },
      { Narration: 'Year-end accrual', Date: '31/03/2024', AccountCode: '090', Amount: '1000' },
      { Narration: 'Prepayment',       Date: '31/03/2024', AccountCode: '410', Amount: '-200' },
      { Narration: 'Prepayment',       Date: '31/03/2024', AccountCode: '090', Amount: '200' },
    ],
  };
  const result = parseXeroJournalEntries(input);
  assert.equal(result.totalJournals, 2);
  assert.equal(result.journals[0].balanced, true);
  assert.equal(result.journals[1].balanced, true);
});

/* ────────────────── Issue surfacing — Xero-specific ─────────────── */

test('Xero detects zero-amount line', () => {
  const input: ParseInput = {
    columns: ['Narration', 'Date', 'Reference', 'AccountCode', 'Amount'],
    rows: [
      { Narration: 'X', Date: '15/03/2024', Reference: 'MJ-Z', AccountCode: '400', Amount: '0' },
    ],
  };
  const result = parseXeroJournalEntries(input);
  const issues = result.journals[0].lines.flatMap((l) => l.issues);
  assert.ok(issues.some((i) => i.code === 'ZERO_AMOUNT'));
});

test('Xero detects line missing both Amount and Debit/Credit', () => {
  const input: ParseInput = {
    columns: ['Narration', 'Date', 'Reference', 'AccountCode'],
    rows: [
      { Narration: 'X', Date: '15/03/2024', Reference: 'MJ-N', AccountCode: '400' },
    ],
  };
  const result = parseXeroJournalEntries(input);
  const issues = result.journals[0].lines.flatMap((l) => l.issues);
  assert.ok(issues.some((i) => i.code === 'NO_AMOUNT'));
});

test('Xero detects missing group key (no Reference, no Narration, no Date)', () => {
  const input: ParseInput = {
    columns: ['AccountCode', 'Amount'],
    rows: [
      { AccountCode: '400', Amount: '-100' },
    ],
  };
  const result = parseXeroJournalEntries(input);
  assert.equal(result.totalRows, 1);
  assert.equal(result.totalJournals, 0);
  assert.ok(result.totalIssues > 0);
});

test('Xero detects invalid amount', () => {
  const input: ParseInput = {
    columns: ['Narration', 'Date', 'Reference', 'AccountCode', 'Amount'],
    rows: [
      { Narration: 'X', Date: '15/03/2024', Reference: 'MJ-I', AccountCode: '400', Amount: 'oops' },
    ],
  };
  const result = parseXeroJournalEntries(input);
  const issues = result.journals[0].lines.flatMap((l) => l.issues);
  assert.ok(issues.some((i) => i.code === 'INVALID_DECIMAL'));
});

test('Xero detects unbalanced journal', () => {
  const input: ParseInput = {
    columns: ['Narration', 'Date', 'Reference', 'AccountCode', 'Amount'],
    rows: [
      { Narration: 'X', Date: '15/03/2024', Reference: 'MJ-U', AccountCode: '400', Amount: '-100' },
      { Narration: 'X', Date: '15/03/2024', Reference: 'MJ-U', AccountCode: '090', Amount: '90' },
    ],
  };
  const result = parseXeroJournalEntries(input);
  assert.equal(result.journals[0].balanced, false);
  assert.ok(result.journals[0].issues.some((i) => i.code === 'UNBALANCED_JOURNAL'));
});

test('Xero detects both debit and credit on same line', () => {
  const input: ParseInput = {
    columns: ['Narration', 'Date', 'Reference', 'AccountCode', 'Debit', 'Credit'],
    rows: [
      { Narration: 'X', Date: '15/03/2024', Reference: 'MJ-B', AccountCode: '400', Debit: '100', Credit: '50' },
      { Narration: 'X', Date: '15/03/2024', Reference: 'MJ-B', AccountCode: '090', Debit: '',    Credit: '50' },
    ],
  };
  const result = parseXeroJournalEntries(input);
  const issues = result.journals[0].lines.flatMap((l) => l.issues);
  assert.ok(issues.some((i) => i.code === 'BOTH_DEBIT_AND_CREDIT'));
});

test('Xero detects inconsistent dates within same journal', () => {
  const input: ParseInput = {
    columns: ['Narration', 'Date', 'Reference', 'AccountCode', 'Amount'],
    rows: [
      { Narration: 'X', Date: '15/03/2024', Reference: 'MJ-D', AccountCode: '400', Amount: '-100' },
      { Narration: 'X', Date: '16/03/2024', Reference: 'MJ-D', AccountCode: '090', Amount: '100' },
    ],
  };
  const result = parseXeroJournalEntries(input);
  assert.ok(result.journals[0].issues.some((i) => i.code === 'INCONSISTENT_DATE'));
});

/* ──────────────────── DMY-default behaviour ────────────────────── */

test('Xero defaults to DMY date parsing (UK/AU/NZ idiom)', () => {
  const input: ParseInput = {
    columns: ['Narration', 'Date', 'Reference', 'AccountCode', 'Amount'],
    rows: [
      // 04/03/2024 — DMY = 2024-03-04, MDY = 2024-04-03. Xero parser defaults DMY.
      { Narration: 'X', Date: '04/03/2024', Reference: 'MJ-DT', AccountCode: '400', Amount: '-100' },
      { Narration: 'X', Date: '04/03/2024', Reference: 'MJ-DT', AccountCode: '090', Amount: '100' },
    ],
  };
  const result = parseXeroJournalEntries(input);
  assert.equal(result.journals[0].date, '2024-03-04');
});

/* ─────────────────── Robustness / edge cases ───────────────────── */

test('Xero empty input returns zero-everything', () => {
  const result = parseXeroJournalEntries({ columns: [], rows: [] });
  assert.equal(result.totalRows, 0);
  assert.equal(result.totalJournals, 0);
  assert.equal(result.totalIssues, 0);
});

test('Xero skips wholly empty rows', () => {
  const input: ParseInput = {
    columns: ['Narration', 'Date', 'Reference', 'AccountCode', 'Amount'],
    rows: [
      { Narration: '', Date: '', Reference: '', AccountCode: '', Amount: '' },
      { Narration: 'X', Date: '15/03/2024', Reference: 'MJ-S', AccountCode: '400', Amount: '-100' },
      { Narration: 'X', Date: '15/03/2024', Reference: 'MJ-S', AccountCode: '090', Amount: '100' },
    ],
  };
  const result = parseXeroJournalEntries(input);
  assert.equal(result.totalRows, 2);
  assert.equal(result.totalJournals, 1);
});

test('Xero unmapped columns surface in result', () => {
  const input: ParseInput = {
    columns: ['Narration', 'Date', 'Reference', 'AccountCode', 'Amount', 'TrackingName1', 'TrackingOption1'],
    rows: [
      { Narration: 'X', Date: '15/03/2024', Reference: 'MJ-U', AccountCode: '400', Amount: '-100', TrackingName1: 'Dept', TrackingOption1: 'Sales' },
      { Narration: 'X', Date: '15/03/2024', Reference: 'MJ-U', AccountCode: '090', Amount: '100',  TrackingName1: 'Dept', TrackingOption1: 'Sales' },
    ],
  };
  const result = parseXeroJournalEntries(input);
  // Tracking columns are intentionally not in COLUMN_ALIASES (paid-path territory).
  assert.deepEqual(result.unmappedColumns.sort(), ['TrackingName1', 'TrackingOption1']);
});

test('Xero accepts AccountName fallback when AccountCode is absent', () => {
  const input: ParseInput = {
    columns: ['Narration', 'Date', 'Reference', 'Account Name', 'Amount'],
    rows: [
      { Narration: 'X', Date: '15/03/2024', Reference: 'MJ-AN', 'Account Name': 'Office Expenses', Amount: '-100' },
      { Narration: 'X', Date: '15/03/2024', Reference: 'MJ-AN', 'Account Name': 'Bank',            Amount: '100' },
    ],
  };
  const result = parseXeroJournalEntries(input);
  assert.equal(result.totalIssues, 0);
  assert.equal(result.journals[0].lines[0].accountName, 'Office Expenses');
});

test('Xero multi-line journal: 4-line balanced groups correctly', () => {
  const input: ParseInput = {
    columns: ['Narration', 'Date', 'Reference', 'AccountCode', 'Amount'],
    rows: [
      { Narration: 'Multi', Date: '01/04/2024', Reference: 'MJ-M', AccountCode: 'A', Amount: '-100' },
      { Narration: 'Multi', Date: '01/04/2024', Reference: 'MJ-M', AccountCode: 'B', Amount: '-50'  },
      { Narration: 'Multi', Date: '01/04/2024', Reference: 'MJ-M', AccountCode: 'C', Amount: '100'  },
      { Narration: 'Multi', Date: '01/04/2024', Reference: 'MJ-M', AccountCode: 'D', Amount: '50'   },
    ],
  };
  const result = parseXeroJournalEntries(input);
  assert.equal(result.totalJournals, 1);
  assert.equal(result.journals[0].lines.length, 4);
  assert.equal(result.journals[0].balanced, true);
  assert.equal(result.journals[0].totalDebits, 150);
  assert.equal(result.journals[0].totalCredits, 150);
});
