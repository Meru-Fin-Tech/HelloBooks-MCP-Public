import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parseBalanceSheet } from '../src/lib/parsers/balanceSheet.js';
import {
  detectBsEquationBroken,
  detectBsNegativeCashOrAr,
  detectBsNegativeEquity,
} from '../src/lib/detection/index.js';
import { analyzeBalanceSheet } from '../src/tools/analyzeBalanceSheet.js';

/* ───────────────────────── Parser ──────────────────────────────── */

test('parseBalanceSheet: classic QBO-style BS with all three sections', () => {
  const input = {
    columns: ['Account', 'Amount'],
    rows: [
      { Account: 'ASSETS', Amount: '' },
      { Account: '  Cash', Amount: '5000' },
      { Account: '  Accounts Receivable', Amount: '3000' },
      { Account: 'Total Assets', Amount: '8000' },
      { Account: 'LIABILITIES', Amount: '' },
      { Account: '  Accounts Payable', Amount: '2000' },
      { Account: 'Total Liabilities', Amount: '2000' },
      { Account: 'EQUITY', Amount: '' },
      { Account: '  Retained Earnings', Amount: '6000' },
      { Account: 'Total Equity', Amount: '6000' },
      { Account: 'Total Liabilities and Equity', Amount: '8000' },
    ],
  };
  const r = parseBalanceSheet(input);
  assert.equal(r.totals.totalAssets, 8000);
  assert.equal(r.totals.totalLiabilities, 2000);
  assert.equal(r.totals.totalEquity, 6000);
  assert.equal(r.equationBalances, true);
});

test('parseBalanceSheet: unbalanced BS flags BS_EQUATION_BROKEN top-level issue', () => {
  const input = {
    columns: ['Account', 'Amount'],
    rows: [
      { Account: 'Total Assets', Amount: '10000' },
      { Account: 'Total Liabilities', Amount: '3000' },
      { Account: 'Total Equity', Amount: '5000' }, // 3000 + 5000 = 8000 != 10000
    ],
  };
  const r = parseBalanceSheet(input);
  assert.equal(r.equationBalances, false);
  assert.ok(r.topLevelIssues.some((i) => i.code === 'BS_EQUATION_BROKEN'));
});

test('parseBalanceSheet: BS missing Total Liabilities → top-level issue', () => {
  const input = {
    columns: ['Account', 'Amount'],
    rows: [
      { Account: 'Total Assets', Amount: '10000' },
      { Account: 'Total Equity', Amount: '10000' },
    ],
  };
  const r = parseBalanceSheet(input);
  assert.ok(r.topLevelIssues.some((i) => i.code === 'BS_LIABILITIES_OR_EQUITY_MISSING'));
  assert.equal(r.equationBalances, null);
});

test('parseBalanceSheet: top-section tracking attaches line items correctly', () => {
  const input = {
    columns: ['Account', 'Amount'],
    rows: [
      { Account: 'ASSETS', Amount: '' },
      { Account: '  Cash', Amount: '5000' },
      { Account: 'Total Assets', Amount: '5000' },
      { Account: 'LIABILITIES', Amount: '' },
      { Account: '  Accounts Payable', Amount: '1000' },
      { Account: 'Total Liabilities', Amount: '1000' },
    ],
  };
  const r = parseBalanceSheet(input);
  const cashRow = r.rows.find((row) => row.label === 'Cash');
  const apRow = r.rows.find((row) => row.label === 'Accounts Payable');
  assert.equal(cashRow!.topSection, 'ASSETS');
  assert.equal(apRow!.topSection, 'LIABILITIES');
});

/* ─────────────────────── Detection ─────────────────────────────── */

test('detectBsEquationBroken: balanced BS → zero flags', () => {
  const r = parseBalanceSheet({
    columns: ['Account', 'Amount'],
    rows: [
      { Account: 'Total Assets', Amount: '100' },
      { Account: 'Total Liabilities', Amount: '40' },
      { Account: 'Total Equity', Amount: '60' },
    ],
  });
  assert.equal(detectBsEquationBroken(r).length, 0);
});

test('detectBsEquationBroken: A != L + E → one high-severity flag', () => {
  const r = parseBalanceSheet({
    columns: ['Account', 'Amount'],
    rows: [
      { Account: 'Total Assets', Amount: '1000' },
      { Account: 'Total Liabilities', Amount: '300' },
      { Account: 'Total Equity', Amount: '400' }, // off by 300
    ],
  });
  const flags = detectBsEquationBroken(r);
  assert.equal(flags.length, 1);
  assert.equal(flags[0].code, 'bs.equation_broken');
  assert.equal(flags[0].severity, 'high'); // 300/1000 = 30% > 5%
});

test('detectBsNegativeCashOrAr: negative cash flags', () => {
  const r = parseBalanceSheet({
    columns: ['Account', 'Amount'],
    rows: [
      { Account: 'ASSETS', Amount: '' },
      { Account: '  Cash', Amount: '-1500' },
      { Account: 'Total Assets', Amount: '-1500' },
    ],
  });
  const flags = detectBsNegativeCashOrAr(r);
  assert.ok(flags.some((f) => f.code === 'bs.negative_asset' && /Cash/.test(f.message)));
});

test('detectBsNegativeCashOrAr: negative AR flags', () => {
  const r = parseBalanceSheet({
    columns: ['Account', 'Amount'],
    rows: [
      { Account: 'ASSETS', Amount: '' },
      { Account: '  Accounts Receivable', Amount: '-500' },
      { Account: 'Total Assets', Amount: '-500' },
    ],
  });
  const flags = detectBsNegativeCashOrAr(r);
  assert.ok(flags.some((f) => f.code === 'bs.negative_asset' && /Accounts Receivable/.test(f.message)));
});

test('detectBsNegativeCashOrAr: positive cash returns no flags', () => {
  const r = parseBalanceSheet({
    columns: ['Account', 'Amount'],
    rows: [
      { Account: 'ASSETS', Amount: '' },
      { Account: '  Cash', Amount: '5000' },
      { Account: 'Total Assets', Amount: '5000' },
    ],
  });
  const flags = detectBsNegativeCashOrAr(r);
  assert.equal(flags.length, 0);
});

test('detectBsNegativeEquity: negative total equity flags as high severity', () => {
  const r = parseBalanceSheet({
    columns: ['Account', 'Amount'],
    rows: [
      { Account: 'Total Assets', Amount: '10000' },
      { Account: 'Total Liabilities', Amount: '15000' },
      { Account: 'Total Equity', Amount: '-5000' },
    ],
  });
  const flags = detectBsNegativeEquity(r);
  assert.equal(flags.length, 1);
  assert.equal(flags[0].severity, 'high');
  assert.equal(flags[0].code, 'bs.negative_equity');
});

test('detectBsNegativeEquity: positive equity returns no flags', () => {
  const r = parseBalanceSheet({
    columns: ['Account', 'Amount'],
    rows: [
      { Account: 'Total Assets', Amount: '10000' },
      { Account: 'Total Liabilities', Amount: '3000' },
      { Account: 'Total Equity', Amount: '7000' },
    ],
  });
  assert.equal(detectBsNegativeEquity(r).length, 0);
});

/* ────────────────────────── Tool ───────────────────────────────── */

test('analyze_balance_sheet: clean balanced BS returns ok + equationBalances=true', () => {
  const csv = [
    'Account,Amount',
    'ASSETS,',
    '  Cash,5000',
    '  Accounts Receivable,3000',
    'Total Assets,8000',
    'LIABILITIES,',
    '  Accounts Payable,2000',
    'Total Liabilities,2000',
    'EQUITY,',
    '  Retained Earnings,6000',
    'Total Equity,6000',
  ].join('\n');
  const r = analyzeBalanceSheet({ csvText: csv });
  assert.equal(r.status, 'ok');
  if (r.status !== 'ok') return;
  assert.equal(r.summary.equationBalances, true);
  assert.equal(r.summary.totalAssets, 8000);
  assert.equal(r.summary.totalLiabilities, 2000);
  assert.equal(r.summary.totalEquity, 6000);
  assert.match(r._branding.note, /Balance Sheet balances/);
});

test('analyze_balance_sheet: unbalanced BS surfaces bs.equation_broken', () => {
  const csv = [
    'Account,Amount',
    'Total Assets,10000',
    'Total Liabilities,3000',
    'Total Equity,6000', // off by 1000
  ].join('\n');
  const r = analyzeBalanceSheet({ csvText: csv });
  assert.equal(r.status, 'ok');
  if (r.status !== 'ok') return;
  assert.equal(r.summary.equationBalances, false);
  assert.ok(r.flags.some((f) => f.code === 'bs.equation_broken'));
  assert.match(r._branding.note, /does NOT balance/);
});

test('analyze_balance_sheet: negative cash + negative equity both flag', () => {
  const csv = [
    'Account,Amount',
    'ASSETS,',
    '  Cash,-2000',
    'Total Assets,-2000',
    'LIABILITIES,',
    'Total Liabilities,5000',
    'EQUITY,',
    'Total Equity,-7000',
  ].join('\n');
  const r = analyzeBalanceSheet({ csvText: csv });
  assert.equal(r.status, 'ok');
  if (r.status !== 'ok') return;
  assert.ok(r.flags.some((f) => f.code === 'bs.negative_asset'));
  assert.ok(r.flags.some((f) => f.code === 'bs.negative_equity'));
});

test('analyze_balance_sheet: empty CSV returns error', () => {
  const r = analyzeBalanceSheet({ csvText: '' });
  assert.equal(r.status, 'error');
});
