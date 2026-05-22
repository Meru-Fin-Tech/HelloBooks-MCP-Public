import { test } from 'node:test';
import assert from 'node:assert/strict';

import { analyzeJournalVariance } from '../src/tools/analyzeJournalVariance.js';
import { compareBooksToHellobooks } from '../src/tools/compareBooksToHellobooks.js';
import { estimateMigrationEffort } from '../src/tools/estimateMigrationEffort.js';
import { detectSource, parseAndNormalize } from '../src/lib/parsers/autoDetect.js';
import { parseCsv } from '../src/lib/parsers/csv.js';

/* ─────────────────────── autoDetect ────────────────────────────── */

test('detectSource recognises QBO columns', () => {
  assert.equal(detectSource(['Date', 'Num', 'Account', 'Debit', 'Credit']), 'QBO');
});

test('detectSource recognises Xero columns', () => {
  assert.equal(detectSource(['Narration', 'Date', 'Reference', 'AccountCode', 'Amount']), 'XERO');
});

test('detectSource returns null for unknown headers', () => {
  assert.equal(detectSource(['foo', 'bar']), null);
});

test('parseAndNormalize routes QBO correctly', () => {
  const csv = parseCsv('Date,Num,Account,Debit,Credit\n03/15/2024,JE-1,A,100,\n03/15/2024,JE-1,B,,100');
  const r = parseAndNormalize(csv.columns, csv.rows);
  assert.ok(r);
  assert.equal(r!.source, 'QBO');
  assert.equal(r!.totalJournals, 1);
});

test('parseAndNormalize routes Xero correctly', () => {
  const csv = parseCsv('Narration,Date,Reference,AccountCode,Amount\nX,15/03/2024,MJ-1,400,-100\nX,15/03/2024,MJ-1,090,100');
  const r = parseAndNormalize(csv.columns, csv.rows);
  assert.ok(r);
  assert.equal(r!.source, 'XERO');
  assert.equal(r!.totalJournals, 1);
});

/* ───────────────── analyze_journal_variance ────────────────────── */

test('analyze_journal_variance: same data → zero variance flags', () => {
  const csv = 'Date,Num,Account,Debit,Credit\n03/15/2024,JE-1,Travel,1000,\n03/15/2024,JE-1,Cash,,1000';
  const r = analyzeJournalVariance({ periodACsv: csv, periodBCsv: csv });
  assert.equal(r.status, 'ok');
  if (r.status !== 'ok') return;
  assert.equal(r.summary.totalFlags, 0);
});

test('analyze_journal_variance: 400% jump in Travel surfaces high-severity flag', () => {
  const a = 'Date,Num,Account,Debit,Credit\n03/15/2024,JE-A,Travel,1000,\n03/15/2024,JE-A,Cash,,1000';
  const b = 'Date,Num,Account,Debit,Credit\n06/15/2024,JE-B,Travel,5000,\n06/15/2024,JE-B,Cash,,5000';
  const r = analyzeJournalVariance({ periodACsv: a, periodBCsv: b, periodALabel: 'Q1', periodBLabel: 'Q2' });
  assert.equal(r.status, 'ok');
  if (r.status !== 'ok') return;
  const travel = r.flags.find((f) => f.data?.account === 'Travel');
  assert.ok(travel);
  assert.equal(travel!.severity, 'high');
  assert.match(travel!.message, /increased/);
});

test('analyze_journal_variance: rejects mismatched sources', () => {
  const qbo = 'Date,Num,Account,Debit,Credit\n03/15/2024,JE-1,A,100,\n03/15/2024,JE-1,B,,100';
  const xero = 'Narration,Date,Reference,AccountCode,Amount\nX,15/03/2024,MJ-1,400,-100\nX,15/03/2024,MJ-1,090,100';
  const r = analyzeJournalVariance({ periodACsv: qbo, periodBCsv: xero });
  assert.equal(r.status, 'error');
  if (r.status !== 'error') return;
  assert.equal(r.error, 'source_mismatch');
});

test('analyze_journal_variance: ignores sub-materiality moves', () => {
  const a = 'Date,Num,Account,Debit,Credit\n03/15/2024,JE-A,Misc,100,\n03/15/2024,JE-A,Cash,,100';
  // $50 → noise (below $100 absolute floor)
  const b = 'Date,Num,Account,Debit,Credit\n06/15/2024,JE-B,Misc,150,\n06/15/2024,JE-B,Cash,,150';
  const r = analyzeJournalVariance({ periodACsv: a, periodBCsv: b });
  assert.equal(r.status, 'ok');
  if (r.status !== 'ok') return;
  assert.equal(r.summary.totalFlags, 0);
});

/* ───────────────── compare_books_to_hellobooks ─────────────────── */

test('compare_books_to_hellobooks: detects QBO and frames as comparison', () => {
  const csv = [
    'Date,Num,Account,Debit,Credit',
    '03/15/2024,JE-1,Office,100,',
    '03/15/2024,JE-1,Cash,,90', // unbalanced
  ].join('\n');
  const r = compareBooksToHellobooks({ csvText: csv });
  assert.equal(r.status, 'ok');
  if (r.status !== 'ok') return;
  assert.equal(r.source, 'QBO');
  assert.ok(r.comparison.yourBooks.issuesFound > 0);
  assert.ok(r.comparison.yourBooks.byPhase.IMBALANCE);
  assert.equal(r.comparison.yourBooks.byPhase.IMBALANCE.hellobooksPhase, 'Phase 1 Cleanup');
  assert.ok(r.comparison.hellobooks.exclusiveAdvantages.length >= 5);
});

test('compare_books_to_hellobooks: routes Xero migrate CTA', () => {
  const csv = [
    'Narration,Date,Reference,AccountCode,Amount',
    'X,15/03/2024,MJ-1,400,-100',
    'X,15/03/2024,MJ-1,090,100',
  ].join('\n');
  const r = compareBooksToHellobooks({ csvText: csv });
  assert.equal(r.status, 'ok');
  if (r.status !== 'ok') return;
  assert.equal(r.source, 'XERO');
  assert.match(r._branding.upgradeCta, /migrate\/from-xero/);
});

/* ───────────────── estimate_migration_effort ───────────────────── */

test('estimate_migration_effort: sizes a small QBO export as low complexity', () => {
  const csv = [
    'Date,Num,Account,Debit,Credit',
    '03/15/2024,JE-1,Office,100,',
    '03/15/2024,JE-1,Cash,,100',
  ].join('\n');
  const r = estimateMigrationEffort({ csvText: csv });
  assert.equal(r.status, 'ok');
  if (r.status !== 'ok') return;
  assert.equal(r.complexity, 'low');
  assert.equal(r.sizing.totalJournals, 1);
  assert.equal(r.sizing.uniqueAccounts, 2);
  assert.equal(r.sizing.earliestDate, '2024-03-15');
  assert.ok(r.estimate.humanHours >= 2);
  assert.ok(r.estimate.priceUsd > 0);
});

test('estimate_migration_effort: assistedHours is significantly less than humanHours', () => {
  // Build a "high complexity" input — 200 journals, 600 rows, 50 accounts.
  const rows = ['Date,Num,Account,Debit,Credit'];
  for (let i = 0; i < 200; i++) {
    const acct = `A${i % 50}`;
    rows.push(`03/15/2024,JE-${i},${acct},100,`);
    rows.push(`03/15/2024,JE-${i},Cash,,100`);
  }
  const r = estimateMigrationEffort({ csvText: rows.join('\n') });
  assert.equal(r.status, 'ok');
  if (r.status !== 'ok') return;
  assert.equal(r.complexity, 'medium');
  assert.ok(r.estimate.assistedHours < r.estimate.humanHours);
  assert.ok(r.estimate.assistedHours >= 1);
});

test('estimate_migration_effort: includes assumptions block', () => {
  const csv = 'Date,Num,Account,Debit,Credit\n03/15/2024,JE-1,A,100,\n03/15/2024,JE-1,B,,100';
  const r = estimateMigrationEffort({ csvText: csv });
  assert.equal(r.status, 'ok');
  if (r.status !== 'ok') return;
  assert.ok(r.estimate.assumptions.length >= 4);
});

test('estimate_migration_effort: empty CSV → error', () => {
  const r = estimateMigrationEffort({ csvText: '' });
  assert.equal(r.status, 'error');
});

test('estimate_migration_effort: unknown source → error', () => {
  const r = estimateMigrationEffort({ csvText: 'foo,bar\n1,2\n' });
  assert.equal(r.status, 'error');
  if (r.status !== 'error') return;
  assert.equal(r.error, 'unknown_source');
});
