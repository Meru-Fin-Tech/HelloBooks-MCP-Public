import { test } from 'node:test';
import assert from 'node:assert/strict';

import { compareBooksToHellobooks } from '../src/tools/compareBooksToHellobooks.js';
import { estimateMigrationEffort } from '../src/tools/estimateMigrationEffort.js';
import { analyzeJournalVariance } from '../src/tools/analyzeJournalVariance.js';

/* compareBooksToHellobooks now handles Zoho + Wave via auto-detect. */

test('compare_books_to_hellobooks: Zoho input → migrate CTA routes to /migrate/zoho', () => {
  const csv = [
    'Journal Date,Journal Number,Account,Debit,Credit',
    '15/03/2024,ZB-1,Office,100,',
    '15/03/2024,ZB-1,Cash,,90', // unbalanced — guaranteed flag
  ].join('\n');
  const r = compareBooksToHellobooks({ csvText: csv });
  assert.equal(r.status, 'ok');
  if (r.status !== 'ok') return;
  assert.equal(r.source, 'ZOHO');
  assert.equal(r.comparison.yourBooks.source, 'Zoho Books');
  assert.match(r._branding.upgradeCta, /migrate\/zoho/);
});

test('compare_books_to_hellobooks: Wave input → migrate CTA routes to /migrate/wave', () => {
  const csv = [
    'Date,Transaction ID,Account,Debit,Credit',
    '03/15/2024,WAV-1,Office,100,',
    '03/15/2024,WAV-1,Cash,,90',
  ].join('\n');
  const r = compareBooksToHellobooks({ csvText: csv });
  assert.equal(r.status, 'ok');
  if (r.status !== 'ok') return;
  assert.equal(r.source, 'WAVE');
  assert.equal(r.comparison.yourBooks.source, 'Wave');
  assert.match(r._branding.upgradeCta, /migrate\/wave/);
});

test('estimate_migration_effort: Zoho input sized + migrate CTA routes correctly', () => {
  const csv = [
    'Journal Date,Journal Number,Account,Debit,Credit',
    '15/03/2024,ZB-1,Office,100,',
    '15/03/2024,ZB-1,Cash,,100',
  ].join('\n');
  const r = estimateMigrationEffort({ csvText: csv });
  assert.equal(r.status, 'ok');
  if (r.status !== 'ok') return;
  assert.equal(r.source, 'ZOHO');
  assert.match(r._branding.upgradeCta, /migrate\/zoho/);
});

test('estimate_migration_effort: Wave input sized + migrate CTA routes correctly', () => {
  const csv = [
    'Date,Transaction ID,Account,Debit,Credit',
    '03/15/2024,WAV-1,Office,100,',
    '03/15/2024,WAV-1,Cash,,100',
  ].join('\n');
  const r = estimateMigrationEffort({ csvText: csv });
  assert.equal(r.status, 'ok');
  if (r.status !== 'ok') return;
  assert.equal(r.source, 'WAVE');
  assert.match(r._branding.upgradeCta, /migrate\/wave/);
});

test('analyze_journal_variance: Zoho two-period comparison works', () => {
  const a = 'Journal Date,Journal Number,Account,Debit,Credit\n15/03/2024,ZB-A,Travel,1000,\n15/03/2024,ZB-A,Cash,,1000';
  const b = 'Journal Date,Journal Number,Account,Debit,Credit\n15/06/2024,ZB-B,Travel,5000,\n15/06/2024,ZB-B,Cash,,5000';
  const r = analyzeJournalVariance({ periodACsv: a, periodBCsv: b });
  assert.equal(r.status, 'ok');
  if (r.status !== 'ok') return;
  assert.equal(r.source, 'ZOHO');
  const travel = r.flags.find((f) => f.data?.account === 'Travel');
  assert.ok(travel);
  assert.equal(travel!.severity, 'high');
  assert.match(r._branding.upgradeCta, /migrate\/zoho/);
});

test('analyze_journal_variance: rejects QBO + Zoho mixed sources', () => {
  const qbo = 'Date,Num,Account,Debit,Credit\n03/15/2024,JE-1,A,100,\n03/15/2024,JE-1,B,,100';
  const zoho = 'Journal Date,Journal Number,Account,Debit,Credit\n15/03/2024,ZB-1,A,100,\n15/03/2024,ZB-1,B,,100';
  const r = analyzeJournalVariance({ periodACsv: qbo, periodBCsv: zoho });
  assert.equal(r.status, 'error');
  if (r.status !== 'error') return;
  assert.equal(r.error, 'source_mismatch');
});
