import { test } from 'node:test';
import assert from 'node:assert/strict';

import { analyzeXeroJournalCleanup } from '../src/tools/analyzeXeroJournalCleanup.js';
import { analyzeXeroJournalAnomalies } from '../src/tools/analyzeXeroJournalAnomalies.js';

const CSV_TWO_BALANCED = [
  'Narration,Date,Reference,AccountCode,Description,Amount',
  'Office supplies,15/03/2024,MJ-001,400,Staples,-500.00',
  'Office supplies,15/03/2024,MJ-001,090,Staples,500.00',
  'Travel reimb,16/03/2024,MJ-002,420,Q1 trip,-1200.00',
  'Travel reimb,16/03/2024,MJ-002,090,Q1 trip,1200.00',
].join('\n');

test('analyze_xero_journal_cleanup: two balanced journals → zero flags + share URL', () => {
  const r = analyzeXeroJournalCleanup({ csvText: CSV_TWO_BALANCED, fileName: 'clean.csv' });
  assert.equal(r.status, 'ok');
  if (r.status !== 'ok') return;
  assert.equal(r.summary.totalRows, 4);
  assert.equal(r.summary.totalJournals, 2);
  assert.equal(r.summary.totalFlags, 0);
  assert.match(r.shareUrl, /\/r\/[A-HJ-NP-Za-km-z2-9]{12}$/);
  assert.match(r._branding.upgradeCta, /migrate\/xero/);
});

test('analyze_xero_journal_cleanup: unbalanced journal surfaces IMBALANCE', () => {
  const csv = [
    'Narration,Date,Reference,AccountCode,Amount',
    'X,15/03/2024,MJ-U,400,-100',
    'X,15/03/2024,MJ-U,090,90',
  ].join('\n');
  const r = analyzeXeroJournalCleanup({ csvText: csv });
  assert.equal(r.status, 'ok');
  if (r.status !== 'ok') return;
  assert.ok(r.flags.some((f) => f.category === 'IMBALANCE'));
});

test('analyze_xero_journal_cleanup: same-date same-totals → DUPLICATE', () => {
  const csv = [
    'Narration,Date,Reference,AccountCode,Amount',
    'X,01/04/2024,MJ-A,400,-500',
    'X,01/04/2024,MJ-A,090,500',
    'X,01/04/2024,MJ-B,400,-500',
    'X,01/04/2024,MJ-B,090,500',
  ].join('\n');
  const r = analyzeXeroJournalCleanup({ csvText: csv });
  assert.equal(r.status, 'ok');
  if (r.status !== 'ok') return;
  assert.ok(r.flags.some((f) => f.category === 'DUPLICATE'));
});

test('analyze_xero_journal_cleanup: zero amount surfaces SCHEMA flag', () => {
  const csv = [
    'Narration,Date,Reference,AccountCode,Amount',
    'X,15/03/2024,MJ-Z,400,0',
  ].join('\n');
  const r = analyzeXeroJournalCleanup({ csvText: csv });
  assert.equal(r.status, 'ok');
  if (r.status !== 'ok') return;
  assert.ok(r.flags.some((f) => f.category === 'SCHEMA' && f.code === 'schema.zero_amount'));
});

test('analyze_xero_journal_cleanup: empty CSV returns error', () => {
  const r = analyzeXeroJournalCleanup({ csvText: '   ' });
  assert.equal(r.status, 'error');
});

test('analyze_xero_journal_cleanup: parseDiagnostics map Xero headers correctly', () => {
  const r = analyzeXeroJournalCleanup({ csvText: CSV_TWO_BALANCED });
  assert.equal(r.status, 'ok');
  if (r.status !== 'ok') return;
  assert.equal(r.parseDiagnostics.columnMapping.Narration, 'Narration');
  assert.equal(r.parseDiagnostics.columnMapping.Reference, 'Reference');
  assert.equal(r.parseDiagnostics.columnMapping.AccountCode, 'AccountCode');
  assert.equal(r.parseDiagnostics.columnMapping.Amount, 'Amount');
});

test('analyze_xero_journal_anomalies: no round-numbers → zero flags', () => {
  const r = analyzeXeroJournalAnomalies({ csvText: CSV_TWO_BALANCED });
  assert.equal(r.status, 'ok');
  if (r.status !== 'ok') return;
  assert.equal(r.summary.totalFlags, 0);
});

test('analyze_xero_journal_anomalies: $50K plug surfaces ROUND_NUMBER flags', () => {
  const csv = [
    'Narration,Date,Reference,AccountCode,Amount',
    'Plug,31/03/2024,MJ-Plug,400,-50000',
    'Plug,31/03/2024,MJ-Plug,090,50000',
  ].join('\n');
  const r = analyzeXeroJournalAnomalies({ csvText: csv });
  assert.equal(r.status, 'ok');
  if (r.status !== 'ok') return;
  assert.equal(r.summary.totalFlags, 2);
  for (const f of r.flags) {
    assert.equal(f.category, 'ROUND_NUMBER');
    assert.equal(f.severity, 'medium');
  }
});

test('analyze_xero_journal_anomalies: share URL routes to Xero migrate', () => {
  const r = analyzeXeroJournalAnomalies({ csvText: CSV_TWO_BALANCED });
  assert.equal(r.status, 'ok');
  if (r.status !== 'ok') return;
  assert.match(r._branding.upgradeCta, /migrate\/xero/);
});

test('analyze_xero_journal_anomalies: notice mentions paid-product gap', () => {
  const r = analyzeXeroJournalAnomalies({ csvText: CSV_TWO_BALANCED });
  assert.equal(r.status, 'ok');
  if (r.status !== 'ok') return;
  assert.match(r.notice, /Tier-0 subset/);
});

test('analyze_xero_journal_cleanup: accepts explicit Debit/Credit shape', () => {
  const csv = [
    'Narration,Date,Reference,AccountCode,Debit,Credit',
    'Cash sale,15/03/2024,MJ-D,090,500,',
    'Cash sale,15/03/2024,MJ-D,200,,500',
  ].join('\n');
  const r = analyzeXeroJournalCleanup({ csvText: csv });
  assert.equal(r.status, 'ok');
  if (r.status !== 'ok') return;
  assert.equal(r.summary.totalFlags, 0);
});
