import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parseTrialBalance, detectTbSource, buildColumnMapping } from '../src/lib/parsers/trialBalance.js';
import { detectTbImbalance, detectTbWrongSign, detectTbRoundBalance } from '../src/lib/detection/index.js';
import { analyzeTrialBalance } from '../src/tools/analyzeTrialBalance.js';

/* ───────────────────────── Parser ──────────────────────────────── */

test('parseTrialBalance: balanced two-account TB parses cleanly', () => {
  const input = {
    columns: ['Account', 'Debit', 'Credit'],
    rows: [
      { Account: 'Cash',    Debit: '5000', Credit: '' },
      { Account: 'Revenue', Debit: '',     Credit: '5000' },
    ],
  };
  const r = parseTrialBalance(input);
  assert.equal(r.totalRows, 2);
  assert.equal(r.totalDebits, 5000);
  assert.equal(r.totalCredits, 5000);
  assert.equal(r.balanced, true);
  assert.equal(r.topLevelIssues.length, 0);
});

test('parseTrialBalance: unbalanced TB emits TB_UNBALANCED top-level issue', () => {
  const input = {
    columns: ['Account', 'Debit', 'Credit'],
    rows: [
      { Account: 'Cash',    Debit: '5000', Credit: '' },
      { Account: 'Revenue', Debit: '',     Credit: '4900' },
    ],
  };
  const r = parseTrialBalance(input);
  assert.equal(r.balanced, false);
  assert.equal(r.topLevelIssues.length, 1);
  assert.equal(r.topLevelIssues[0].code, 'TB_UNBALANCED');
});

test('parseTrialBalance: account-code + account-type columns flow through', () => {
  const input = {
    columns: ['Account Code', 'Account', 'Account Type', 'Debit', 'Credit'],
    rows: [
      { 'Account Code': '1000', Account: 'Cash',    'Account Type': 'Asset', Debit: '5000', Credit: '' },
      { 'Account Code': '4000', Account: 'Revenue', 'Account Type': 'Income', Debit: '',  Credit: '5000' },
    ],
  };
  const r = parseTrialBalance(input);
  assert.equal(r.lines[0].accountCode, '1000');
  assert.equal(r.lines[0].accountType, 'Asset');
  assert.equal(r.lines[1].accountCode, '4000');
});

test('parseTrialBalance: tolerates zero-balance accounts (closed accounts included for completeness)', () => {
  const input = {
    columns: ['Account', 'Debit', 'Credit'],
    rows: [
      { Account: 'Cash',           Debit: '5000', Credit: '' },
      { Account: 'Revenue',        Debit: '',     Credit: '5000' },
      { Account: 'Closed Account', Debit: '0',    Credit: '0' },
    ],
  };
  const r = parseTrialBalance(input);
  // Closed account row is captured but does not flag NEITHER_DEBIT_NOR_CREDIT.
  assert.equal(r.totalRows, 3);
  assert.equal(r.balanced, true);
  const issuesAcrossLines = r.lines.flatMap((l) => l.issues);
  assert.equal(issuesAcrossLines.filter((i) => i.code === 'NEITHER_DEBIT_NOR_CREDIT').length, 0);
});

test('parseTrialBalance: detectTbSource recognises Xero YTD columns', () => {
  assert.equal(detectTbSource(['Account', 'Debit', 'Credit', 'YTD Debit', 'YTD Credit']), 'XERO');
});

test('parseTrialBalance: detectTbSource recognises Zoho opening-balance columns', () => {
  assert.equal(detectTbSource(['Account', 'Opening Balance', 'Net Change', 'Closing Balance', 'Debit', 'Credit']), 'ZOHO');
});

test('parseTrialBalance: detectTbSource returns UNKNOWN for generic columns', () => {
  assert.equal(detectTbSource(['Account', 'Debit', 'Credit']), 'UNKNOWN');
});

test('parseTrialBalance: buildColumnMapping recognises account-name aliases', () => {
  const m = buildColumnMapping(['Account Name', 'Account Code', 'Debit', 'Credit']);
  assert.equal(m['Account Name'], 'AccountName');
  assert.equal(m['Account Code'], 'AccountCode');
});

/* ─────────────────────── Detection ─────────────────────────────── */

test('detectTbImbalance: balanced TB → zero flags', () => {
  const r = parseTrialBalance({
    columns: ['Account', 'Debit', 'Credit'],
    rows: [{ Account: 'A', Debit: '100', Credit: '' }, { Account: 'B', Debit: '', Credit: '100' }],
  });
  assert.equal(detectTbImbalance(r).length, 0);
});

test('detectTbImbalance: ≥5% diff → high severity', () => {
  const r = parseTrialBalance({
    columns: ['Account', 'Debit', 'Credit'],
    rows: [{ Account: 'A', Debit: '100', Credit: '' }, { Account: 'B', Debit: '', Credit: '90' }],
  });
  const flags = detectTbImbalance(r);
  assert.equal(flags.length, 1);
  assert.equal(flags[0].severity, 'high');
  assert.equal(flags[0].code, 'tb.unbalanced');
});

test('detectTbWrongSign: revenue with debit balance flags wrong-sign', () => {
  const r = parseTrialBalance({
    columns: ['Account', 'Debit', 'Credit'],
    rows: [
      { Account: 'Service Revenue', Debit: '5000', Credit: '' }, // wrong-sign
      { Account: 'Cash',            Debit: '',     Credit: '5000' },
    ],
  });
  const flags = detectTbWrongSign(r);
  assert.ok(flags.some((f) => f.code === 'tb.wrong_sign' && String(f.data?.account).includes('Service Revenue')));
});

test('detectTbWrongSign: COGS with credit balance flags wrong-sign', () => {
  const r = parseTrialBalance({
    columns: ['Account', 'Debit', 'Credit'],
    rows: [
      { Account: 'Cash',                Debit: '5000', Credit: '' },
      { Account: 'Cost of Goods Sold',  Debit: '',     Credit: '5000' }, // wrong-sign
    ],
  });
  const flags = detectTbWrongSign(r);
  assert.ok(flags.some((f) => f.code === 'tb.wrong_sign'));
});

test('detectTbWrongSign: AR with debit balance is normal — no flag', () => {
  const r = parseTrialBalance({
    columns: ['Account', 'Debit', 'Credit'],
    rows: [
      { Account: 'Accounts Receivable', Debit: '5000', Credit: '' }, // correct
      { Account: 'Revenue',             Debit: '',     Credit: '5000' },
    ],
  });
  const flags = detectTbWrongSign(r);
  assert.equal(flags.length, 0);
});

test('detectTbWrongSign: AP with debit balance flags wrong-sign', () => {
  const r = parseTrialBalance({
    columns: ['Account', 'Debit', 'Credit'],
    rows: [
      { Account: 'Accounts Payable', Debit: '3000', Credit: '' }, // wrong-sign
      { Account: 'Revenue',          Debit: '',     Credit: '3000' },
    ],
  });
  const flags = detectTbWrongSign(r);
  assert.ok(flags.some((f) => f.code === 'tb.wrong_sign' && String(f.data?.account).includes('Accounts Payable')));
});

test('detectTbRoundBalance: $50K exact balance flags round-number', () => {
  const r = parseTrialBalance({
    columns: ['Account', 'Debit', 'Credit'],
    rows: [
      { Account: 'Misc Asset', Debit: '50000', Credit: '' },
      { Account: 'Other',      Debit: '',      Credit: '50000' },
    ],
  });
  const flags = detectTbRoundBalance(r);
  // Both lines have $50K exact, both flag.
  assert.equal(flags.length, 2);
  assert.ok(flags.every((f) => f.code === 'tb.round_balance'));
});

test('detectTbRoundBalance: $50,247.83 does not flag', () => {
  const r = parseTrialBalance({
    columns: ['Account', 'Debit', 'Credit'],
    rows: [
      { Account: 'Cash',    Debit: '50247.83', Credit: '' },
      { Account: 'Revenue', Debit: '',         Credit: '50247.83' },
    ],
  });
  const flags = detectTbRoundBalance(r);
  assert.equal(flags.length, 0);
});

/* ────────────────────────── Tool ───────────────────────────────── */

test('analyze_trial_balance: happy-path balanced TB returns ok status', () => {
  const csv = [
    'Account,Debit,Credit',
    'Cash,5000,',
    'Accounts Receivable,3000,',
    'Inventory,2000,',
    'Accounts Payable,,1000',
    'Revenue,,9000',
  ].join('\n');
  const r = analyzeTrialBalance({ csvText: csv });
  assert.equal(r.status, 'ok');
  if (r.status !== 'ok') return;
  assert.equal(r.summary.balanced, true);
  assert.equal(r.summary.totalAccounts, 5);
});

test('analyze_trial_balance: missing Debit/Credit columns returns not_a_trial_balance', () => {
  const csv = 'Foo,Bar\n1,2\n3,4';
  const r = analyzeTrialBalance({ csvText: csv });
  assert.equal(r.status, 'error');
  if (r.status !== 'error') return;
  assert.equal(r.error, 'not_a_trial_balance');
});

test('analyze_trial_balance: unbalanced TB surfaces tb.unbalanced flag', () => {
  const csv = 'Account,Debit,Credit\nCash,5000,\nRevenue,,4900';
  const r = analyzeTrialBalance({ csvText: csv });
  assert.equal(r.status, 'ok');
  if (r.status !== 'ok') return;
  assert.equal(r.summary.balanced, false);
  assert.ok(r.flags.some((f) => f.code === 'tb.unbalanced'));
});

test('analyze_trial_balance: wrong-sign + round-balance flags fire together', () => {
  const csv = 'Account,Debit,Credit\nRevenue,50000,\nCash,,50000';
  // Revenue with debit balance → wrong-sign
  // Both lines $50K exact → round-balance × 2
  const r = analyzeTrialBalance({ csvText: csv });
  assert.equal(r.status, 'ok');
  if (r.status !== 'ok') return;
  assert.ok(r.flags.some((f) => f.code === 'tb.wrong_sign'));
  assert.ok(r.flags.filter((f) => f.code === 'tb.round_balance').length === 2);
});

test('analyze_trial_balance: auto-detects Xero TB via YTD columns', () => {
  const csv = 'Account,Debit,Credit,YTD Debit,YTD Credit\nCash,5000,,5000,\nRevenue,,5000,,5000';
  const r = analyzeTrialBalance({ csvText: csv });
  assert.equal(r.status, 'ok');
  if (r.status !== 'ok') return;
  assert.equal(r.source, 'XERO');
  assert.match(r._branding.upgradeCta, /migrate\/from-xero/);
});

test('analyze_trial_balance: empty CSV returns error', () => {
  const r = analyzeTrialBalance({ csvText: '' });
  assert.equal(r.status, 'error');
});

test('analyze_trial_balance: balanced TB note vs unbalanced note differ', () => {
  const balanced = analyzeTrialBalance({ csvText: 'Account,Debit,Credit\nCash,100,\nRevenue,,100' });
  const unbalanced = analyzeTrialBalance({ csvText: 'Account,Debit,Credit\nCash,100,\nRevenue,,90' });
  assert.equal(balanced.status, 'ok');
  assert.equal(unbalanced.status, 'ok');
  if (balanced.status !== 'ok' || unbalanced.status !== 'ok') return;
  assert.match(balanced._branding.note, /ties/);
  assert.match(unbalanced._branding.note, /does NOT tie/);
});
