import { test } from 'node:test';
import assert from 'node:assert/strict';

import { analyzeQboJournalCleanup } from '../src/tools/analyzeQboJournalCleanup.js';
import { analyzeQboJournalAnomalies } from '../src/tools/analyzeQboJournalAnomalies.js';

/* ───────────── analyze_qbo_journal_cleanup happy path ──────────── */

const CSV_TWO_BALANCED_JOURNALS = [
  'Date,Num,Account,Debit,Credit,Memo',
  '03/15/2024,JE-001,Office Expenses,500.00,,Staples',
  '03/15/2024,JE-001,Cash,,500.00,Staples',
  '03/16/2024,JE-002,Travel,1200.00,,Q1 trip',
  '03/16/2024,JE-002,Cash,,1200.00,Q1 trip',
].join('\n');

test('analyze_qbo_journal_cleanup: two balanced journals → zero flags + share URL', () => {
  const r = analyzeQboJournalCleanup({ csvText: CSV_TWO_BALANCED_JOURNALS, fileName: 'clean.csv' });
  assert.equal(r.status, 'ok');
  if (r.status !== 'ok') return;
  assert.equal(r.summary.totalRows, 4);
  assert.equal(r.summary.totalJournals, 2);
  assert.equal(r.summary.totalFlags, 0);
  assert.match(r.shareUrl, /\/r\/[A-HJ-NP-Za-km-z2-9]{12}$/);
  assert.equal(r._branding.poweredBy, 'HelloBooks AI Agent');
  assert.match(r._branding.upgradeCta, /migrate\/quickbooks/);
});

test('analyze_qbo_journal_cleanup: unbalanced journal surfaces IMBALANCE flag', () => {
  const csv = [
    'Date,Num,Account,Debit,Credit',
    '03/15/2024,JE-X,Office,100,',
    '03/15/2024,JE-X,Cash,,90',
  ].join('\n');
  const r = analyzeQboJournalCleanup({ csvText: csv });
  assert.equal(r.status, 'ok');
  if (r.status !== 'ok') return;
  assert.ok(r.summary.totalFlags >= 1);
  assert.ok(r.flags.some((f) => f.category === 'IMBALANCE'));
});

test('analyze_qbo_journal_cleanup: same-date same-totals → DUPLICATE flag', () => {
  const csv = [
    'Date,Num,Account,Debit,Credit',
    '04/01/2024,JE-A,Office,100,',
    '04/01/2024,JE-A,Cash,,100',
    '04/01/2024,JE-B,Office,100,',
    '04/01/2024,JE-B,Cash,,100',
  ].join('\n');
  const r = analyzeQboJournalCleanup({ csvText: csv });
  assert.equal(r.status, 'ok');
  if (r.status !== 'ok') return;
  assert.ok(r.flags.some((f) => f.category === 'DUPLICATE'));
});

test('analyze_qbo_journal_cleanup: invalid date surfaces SCHEMA flag', () => {
  const csv = [
    'Date,Num,Account,Debit,Credit',
    'not-a-date,JE-Z,Office,100,',
    '04/01/2024,JE-Z,Cash,,100',
  ].join('\n');
  const r = analyzeQboJournalCleanup({ csvText: csv });
  assert.equal(r.status, 'ok');
  if (r.status !== 'ok') return;
  assert.ok(r.flags.some((f) => f.category === 'SCHEMA' && f.code === 'schema.invalid_date'));
});

test('analyze_qbo_journal_cleanup: empty input returns error', () => {
  const r = analyzeQboJournalCleanup({ csvText: '   ' });
  assert.equal(r.status, 'error');
  if (r.status !== 'error') return;
  assert.equal(r.error, 'empty_or_invalid_csv');
});

test('analyze_qbo_journal_cleanup: parseDiagnostics includes column mapping', () => {
  const r = analyzeQboJournalCleanup({ csvText: CSV_TWO_BALANCED_JOURNALS });
  assert.equal(r.status, 'ok');
  if (r.status !== 'ok') return;
  assert.equal(r.parseDiagnostics.columnMapping.Date, 'Date');
  assert.equal(r.parseDiagnostics.columnMapping.Num, 'JournalNumber');
  assert.equal(r.parseDiagnostics.columnMapping.Account, 'AccountName');
  assert.equal(r.parseDiagnostics.columnMapping.Debit, 'Debit');
});

test('analyze_qbo_journal_cleanup: bySeverity rollup counts correctly', () => {
  const csv = [
    'Date,Num,Account,Debit,Credit',
    '03/15/2024,JE-1,A,100,',
    '03/15/2024,JE-1,B,,90',
    '03/16/2024,JE-2,C,1000,',
    '03/16/2024,JE-2,D,,995',
  ].join('\n');
  const r = analyzeQboJournalCleanup({ csvText: csv });
  assert.equal(r.status, 'ok');
  if (r.status !== 'ok') return;
  // 1 high (JE-1 ≥5% off), 1 medium (JE-2 0.5%-5% off)
  assert.equal(r.summary.bySeverity.high, 1);
  assert.equal(r.summary.bySeverity.medium, 1);
});

/* ───────────── analyze_qbo_journal_anomalies happy path ─────────── */

test('analyze_qbo_journal_anomalies: no round-numbers → zero flags', () => {
  const r = analyzeQboJournalAnomalies({ csvText: CSV_TWO_BALANCED_JOURNALS });
  assert.equal(r.status, 'ok');
  if (r.status !== 'ok') return;
  assert.equal(r.summary.totalFlags, 0);
});

test('analyze_qbo_journal_anomalies: $50K round-number plug surfaces ROUND_NUMBER flags', () => {
  const csv = [
    'Date,Num,Account,Debit,Credit',
    '03/31/2024,JE-Plug,Misc Expense,50000,',
    '03/31/2024,JE-Plug,Cash,,50000',
  ].join('\n');
  const r = analyzeQboJournalAnomalies({ csvText: csv });
  assert.equal(r.status, 'ok');
  if (r.status !== 'ok') return;
  // Two round-number lines (50K debit + 50K credit), both medium severity.
  assert.equal(r.summary.totalFlags, 2);
  for (const f of r.flags) {
    assert.equal(f.category, 'ROUND_NUMBER');
    assert.equal(f.severity, 'medium');
  }
});

test('analyze_qbo_journal_anomalies: notice mentions paid-product gap', () => {
  const r = analyzeQboJournalAnomalies({ csvText: CSV_TWO_BALANCED_JOURNALS });
  assert.equal(r.status, 'ok');
  if (r.status !== 'ok') return;
  assert.match(r.notice, /Tier-0 subset/);
  assert.match(r.notice, /paid product/);
});

test('analyze_qbo_journal_anomalies: empty CSV returns error', () => {
  const r = analyzeQboJournalAnomalies({ csvText: '' });
  assert.equal(r.status, 'error');
});

test('analyze_qbo_journal_anomalies: share URL routes to QBO migrate', () => {
  const r = analyzeQboJournalAnomalies({ csvText: CSV_TWO_BALANCED_JOURNALS });
  assert.equal(r.status, 'ok');
  if (r.status !== 'ok') return;
  assert.match(r._branding.upgradeCta, /migrate\/quickbooks/);
});

/* ───────────── End-to-end via server.tool wiring ───────────────── */

test('server registers analyze_qbo_journal_cleanup tool', async () => {
  const { createServer } = await import('../src/server.js');
  const server = createServer();
  // FastMCP server does not expose tool list directly; smoke-test via
  // export. The createServer() call would throw on a missing import or
  // schema-error during registration, so reaching this line is the test.
  assert.ok(server);
});
