import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parseProfitLoss } from '../src/lib/parsers/profitLoss.js';
import { analyzeProfitLoss } from '../src/tools/analyzeProfitLoss.js';
import {
  detectPnlSubtotalMismatch,
  detectPnlNegativeExpense,
  detectPnlMarginRedFlag,
} from '../src/lib/detection/index.js';

/* ───────────────────────── Parser ──────────────────────────────── */

test('parseProfitLoss: classic QBO-style P&L parses with totals', () => {
  const input = {
    columns: ['Account', 'Amount'],
    rows: [
      { Account: 'Income', Amount: '' },
      { Account: '  Sales', Amount: '5000.00' },
      { Account: '  Service Revenue', Amount: '2000.00' },
      { Account: 'Total Income', Amount: '7000.00' },
      { Account: 'Cost of Goods Sold', Amount: '' },
      { Account: '  Materials', Amount: '1500.00' },
      { Account: 'Total Cost of Goods Sold', Amount: '1500.00' },
      { Account: 'Gross Profit', Amount: '5500.00' },
      { Account: 'Expenses', Amount: '' },
      { Account: '  Office Expense', Amount: '500.00' },
      { Account: '  Rent', Amount: '1000.00' },
      { Account: 'Total Expenses', Amount: '1500.00' },
      { Account: 'Net Operating Income', Amount: '4000.00' },
      { Account: 'Net Income', Amount: '4000.00' },
    ],
  };
  const r = parseProfitLoss(input);
  assert.equal(r.totals.totalRevenue, 7000);
  assert.equal(r.totals.totalCogs, 1500);
  assert.equal(r.totals.grossProfit, 5500);
  assert.equal(r.totals.totalExpenses, 1500);
  assert.equal(r.totals.operatingIncome, 4000);
  assert.equal(r.totals.netIncome, 4000);
});

test('parseProfitLoss: Xero-style "Trading Income" / "Direct Costs" detected', () => {
  const input = {
    columns: ['Account', 'Amount'],
    rows: [
      { Account: 'Trading Income', Amount: '' },
      { Account: '  Sales', Amount: '5000' },
      { Account: 'Total Trading Income', Amount: '5000' },
      { Account: 'Direct Costs', Amount: '' },
      { Account: '  Cost of Sales', Amount: '1500' },
      { Account: 'Total Direct Costs', Amount: '1500' },
      { Account: 'Gross Profit', Amount: '3500' },
      { Account: 'Net Profit', Amount: '3500' },
    ],
  };
  const r = parseProfitLoss(input);
  assert.equal(r.source, 'XERO');
  assert.equal(r.totals.totalRevenue, 5000);
  assert.equal(r.totals.totalCogs, 1500);
  assert.equal(r.totals.grossProfit, 3500);
  assert.equal(r.totals.netIncome, 3500);
});

test('parseProfitLoss: missing Net Income surfaces top-level issue', () => {
  const input = {
    columns: ['Account', 'Amount'],
    rows: [
      { Account: 'Income', Amount: '' },
      { Account: '  Sales', Amount: '5000' },
      { Account: 'Total Income', Amount: '5000' },
      // intentionally cut off before Net Income
    ],
  };
  const r = parseProfitLoss(input);
  assert.ok(r.topLevelIssues.some((i) => i.code === 'PNL_NET_INCOME_MISSING'));
});

test('parseProfitLoss: skips blank label rows', () => {
  const input = {
    columns: ['Account', 'Amount'],
    rows: [
      { Account: '', Amount: '' },
      { Account: '  Sales', Amount: '100' },
      { Account: 'Total Income', Amount: '100' },
      { Account: 'Net Income', Amount: '100' },
    ],
  };
  const r = parseProfitLoss(input);
  // Blank row dropped; remaining 3 rows captured.
  assert.equal(r.totalRowCount, 3);
});

/* ─────────────────────── Detection ─────────────────────────────── */

test('detectPnlSubtotalMismatch: line items do not sum to subtotal → flag', () => {
  const r = parseProfitLoss({
    columns: ['Account', 'Amount'],
    rows: [
      { Account: 'Income', Amount: '' },
      { Account: '  Sales', Amount: '5000' },
      { Account: '  Service Revenue', Amount: '2000' },
      { Account: 'Total Income', Amount: '6800' }, // should be 7000
      { Account: 'Net Income', Amount: '6800' },
    ],
  });
  const flags = detectPnlSubtotalMismatch(r);
  assert.ok(flags.some((f) => f.code === 'pnl.subtotal_mismatch'));
});

test('detectPnlSubtotalMismatch: clean P&L returns zero flags', () => {
  const r = parseProfitLoss({
    columns: ['Account', 'Amount'],
    rows: [
      { Account: 'Income', Amount: '' },
      { Account: '  Sales', Amount: '5000' },
      { Account: '  Service Revenue', Amount: '2000' },
      { Account: 'Total Income', Amount: '7000' },
      { Account: 'Net Income', Amount: '7000' },
    ],
  });
  const flags = detectPnlSubtotalMismatch(r);
  assert.equal(flags.length, 0);
});

test('detectPnlNegativeExpense: negative expense line flags', () => {
  const r = parseProfitLoss({
    columns: ['Account', 'Amount'],
    rows: [
      { Account: 'Operating Expenses', Amount: '' },
      { Account: '  Office Expense', Amount: '-500' },
      { Account: '  Rent', Amount: '1000' },
      { Account: 'Total Operating Expenses', Amount: '500' },
      { Account: 'Net Income', Amount: '500' },
    ],
  });
  const flags = detectPnlNegativeExpense(r);
  assert.ok(flags.some((f) => f.code === 'pnl.negative_expense' && /Office Expense/.test(f.message)));
});

test('detectPnlMarginRedFlag: gross margin >95% flags as high', () => {
  const r = parseProfitLoss({
    columns: ['Account', 'Amount'],
    rows: [
      { Account: 'Total Income', Amount: '10000' },
      { Account: 'Total Cost of Goods Sold', Amount: '0' },
      { Account: 'Gross Profit', Amount: '10000' }, // 100% margin — suspicious
      { Account: 'Net Income', Amount: '8000' },
    ],
  });
  const flags = detectPnlMarginRedFlag(r);
  assert.ok(flags.some((f) => f.code === 'pnl.margin_high'));
});

test('detectPnlMarginRedFlag: gross margin <5% flags', () => {
  const r = parseProfitLoss({
    columns: ['Account', 'Amount'],
    rows: [
      { Account: 'Total Income', Amount: '10000' },
      { Account: 'Total Cost of Goods Sold', Amount: '9800' },
      { Account: 'Gross Profit', Amount: '200' }, // 2% margin — very low
      { Account: 'Net Income', Amount: '-100' },
    ],
  });
  const flags = detectPnlMarginRedFlag(r);
  assert.ok(flags.some((f) => f.code === 'pnl.margin_low'));
});

test('detectPnlMarginRedFlag: healthy margin returns no flags', () => {
  const r = parseProfitLoss({
    columns: ['Account', 'Amount'],
    rows: [
      { Account: 'Total Income', Amount: '10000' },
      { Account: 'Total Cost of Goods Sold', Amount: '6000' },
      { Account: 'Gross Profit', Amount: '4000' },
      { Account: 'Net Income', Amount: '2000' },
    ],
  });
  const flags = detectPnlMarginRedFlag(r);
  assert.equal(flags.filter((f) => f.code === 'pnl.margin_high' || f.code === 'pnl.margin_low').length, 0);
});

test('detectPnlMarginRedFlag: negative revenue flags as high severity', () => {
  const r = parseProfitLoss({
    columns: ['Account', 'Amount'],
    rows: [
      { Account: 'Total Income', Amount: '-500' },
      { Account: 'Net Income', Amount: '-500' },
    ],
  });
  const flags = detectPnlMarginRedFlag(r);
  assert.ok(flags.some((f) => f.code === 'pnl.negative_revenue' && f.severity === 'high'));
});

/* ────────────────────────── Tool ───────────────────────────────── */

test('analyze_profit_loss: clean QBO P&L returns ok + computed gross margin', () => {
  const csv = [
    'Account,Amount',
    'Income,',
    '  Sales,5000',
    '  Service Revenue,2000',
    'Total Income,7000',
    'Cost of Goods Sold,',
    '  Materials,1500',
    'Total Cost of Goods Sold,1500',
    'Gross Profit,5500',
    'Expenses,',
    '  Office Expense,500',
    '  Rent,1000',
    'Total Expenses,1500',
    'Net Income,4000',
  ].join('\n');
  const r = analyzeProfitLoss({ csvText: csv });
  assert.equal(r.status, 'ok');
  if (r.status !== 'ok') return;
  assert.equal(r.summary.totalRevenue, 7000);
  assert.equal(r.summary.grossProfit, 5500);
  assert.equal(r.summary.grossMarginPct, 78.57); // 5500 / 7000
  assert.equal(r.summary.netIncome, 4000);
});

test('analyze_profit_loss: subtotal mismatch surfaces flag', () => {
  const csv = [
    'Account,Amount',
    'Income,',
    '  Sales,5000',
    '  Service Revenue,2000',
    'Total Income,6800', // should be 7000
    'Net Income,6800',
  ].join('\n');
  const r = analyzeProfitLoss({ csvText: csv });
  assert.equal(r.status, 'ok');
  if (r.status !== 'ok') return;
  assert.ok(r.flags.some((f) => f.code === 'pnl.subtotal_mismatch'));
});

test('analyze_profit_loss: empty CSV returns error', () => {
  const r = analyzeProfitLoss({ csvText: '' });
  assert.equal(r.status, 'error');
});

test('analyze_profit_loss: Xero source detected from "Trading Income"', () => {
  const csv = [
    'Account,Amount',
    'Trading Income,',
    '  Sales,5000',
    'Total Trading Income,5000',
    'Net Profit,4000',
  ].join('\n');
  const r = analyzeProfitLoss({ csvText: csv });
  assert.equal(r.status, 'ok');
  if (r.status !== 'ok') return;
  assert.equal(r.source, 'XERO');
  assert.match(r._branding.upgradeCta, /migrate\/from-xero/);
});

test('analyze_profit_loss: note differs for clean vs flagged P&L', () => {
  const clean = analyzeProfitLoss({
    csvText: 'Account,Amount\nTotal Income,7000\nTotal Cost of Goods Sold,3000\nGross Profit,4000\nNet Income,2000',
  });
  const flagged = analyzeProfitLoss({
    csvText: 'Account,Amount\n  Sales,5000\nTotal Income,4900\nNet Income,4900', // mismatch
  });
  assert.equal(clean.status, 'ok');
  assert.equal(flagged.status, 'ok');
  if (clean.status !== 'ok' || flagged.status !== 'ok') return;
  assert.match(clean._branding.note, /parsed cleanly/);
  assert.match(flagged._branding.note, /issues? in this P&L/);
});
