import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parseZohoJournalEntries, buildColumnMapping as buildZohoMapping } from '../src/lib/parsers/zohoJournal.js';
import { parseWaveJournalEntries, buildColumnMapping as buildWaveMapping } from '../src/lib/parsers/waveJournal.js';
import { detectSource, parseAndNormalize, sourceToMigrateSlug, sourceToHumanLabel } from '../src/lib/parsers/autoDetect.js';
import { parseCsv } from '../src/lib/parsers/csv.js';

/* ───────────────────────── Zoho ────────────────────────────────── */

test('Zoho: buildColumnMapping recognises canonical headers', () => {
  const m = buildZohoMapping(['Journal Date', 'Journal Number', 'Reference Number', 'Account', 'Debit', 'Credit', 'Notes']);
  assert.equal(m['Journal Date'], 'Date');
  assert.equal(m['Journal Number'], 'JournalNumber');
  assert.equal(m['Reference Number'], 'Reference');
  assert.equal(m.Account, 'AccountName');
});

test('Zoho: balanced 2-line journal parses cleanly', () => {
  const input = {
    columns: ['Journal Date', 'Journal Number', 'Account', 'Debit', 'Credit'],
    rows: [
      { 'Journal Date': '15/03/2024', 'Journal Number': 'ZB-001', Account: 'Office', Debit: '500', Credit: '' },
      { 'Journal Date': '15/03/2024', 'Journal Number': 'ZB-001', Account: 'Cash',   Debit: '',    Credit: '500' },
    ],
  };
  const r = parseZohoJournalEntries(input);
  assert.equal(r.source, 'ZOHO');
  assert.equal(r.totalJournals, 1);
  assert.equal(r.totalIssues, 0);
  assert.equal(r.journals[0].balanced, true);
});

test('Zoho: unbalanced journal sets balanced=false', () => {
  const input = {
    columns: ['Journal Date', 'Journal Number', 'Account', 'Debit', 'Credit'],
    rows: [
      { 'Journal Date': '15/03/2024', 'Journal Number': 'ZB-U', Account: 'A', Debit: '100', Credit: '' },
      { 'Journal Date': '15/03/2024', 'Journal Number': 'ZB-U', Account: 'B', Debit: '',    Credit: '90' },
    ],
  };
  const r = parseZohoJournalEntries(input);
  assert.equal(r.journals[0].balanced, false);
});

test('Zoho: carries Reference + Notes through to journal level', () => {
  const input = {
    columns: ['Journal Date', 'Journal Number', 'Reference Number', 'Notes', 'Account', 'Debit', 'Credit'],
    rows: [
      { 'Journal Date': '15/03/2024', 'Journal Number': 'ZB-R', 'Reference Number': 'INV-100', Notes: 'Vendor refund', Account: 'A', Debit: '100', Credit: '' },
      { 'Journal Date': '15/03/2024', 'Journal Number': 'ZB-R', 'Reference Number': 'INV-100', Notes: 'Vendor refund', Account: 'B', Debit: '',    Credit: '100' },
    ],
  };
  const r = parseZohoJournalEntries(input);
  assert.equal(r.journals[0].reference, 'INV-100');
  assert.equal(r.journals[0].notes, 'Vendor refund');
});

/* ───────────────────────── Wave ────────────────────────────────── */

test('Wave: buildColumnMapping recognises Transaction ID column', () => {
  const m = buildWaveMapping(['Date', 'Transaction ID', 'Account', 'Debit', 'Credit', 'Notes']);
  assert.equal(m['Transaction ID'], 'JournalNumber');
  assert.equal(m.Date, 'Date');
});

test('Wave: balanced 2-line journal parses cleanly', () => {
  const input = {
    columns: ['Date', 'Transaction ID', 'Account', 'Debit', 'Credit'],
    rows: [
      { Date: '03/15/2024', 'Transaction ID': 'WAV-001', Account: 'Office', Debit: '500', Credit: '' },
      { Date: '03/15/2024', 'Transaction ID': 'WAV-001', Account: 'Cash',   Debit: '',    Credit: '500' },
    ],
  };
  const r = parseWaveJournalEntries(input);
  assert.equal(r.source, 'WAVE');
  assert.equal(r.totalJournals, 1);
  assert.equal(r.totalIssues, 0);
});

test('Wave: multi-line journal groups by Transaction ID', () => {
  const input = {
    columns: ['Date', 'Transaction ID', 'Account', 'Debit', 'Credit'],
    rows: [
      { Date: '03/15/2024', 'Transaction ID': 'WAV-M', Account: 'A', Debit: '100', Credit: '' },
      { Date: '03/15/2024', 'Transaction ID': 'WAV-M', Account: 'B', Debit: '50',  Credit: '' },
      { Date: '03/15/2024', 'Transaction ID': 'WAV-M', Account: 'C', Debit: '',    Credit: '100' },
      { Date: '03/15/2024', 'Transaction ID': 'WAV-M', Account: 'D', Debit: '',    Credit: '50' },
    ],
  };
  const r = parseWaveJournalEntries(input);
  assert.equal(r.totalJournals, 1);
  assert.equal(r.journals[0].lines.length, 4);
  assert.equal(r.journals[0].balanced, true);
});

/* ─────────────────── autoDetect expanded ───────────────────────── */

test('detectSource: Zoho via "Journal Date" column', () => {
  assert.equal(detectSource(['Journal Date', 'Journal Number', 'Account', 'Debit', 'Credit']), 'ZOHO');
});

test('detectSource: Zoho via "Currency Code" column', () => {
  assert.equal(detectSource(['Date', 'Journal Number', 'Account', 'Debit', 'Credit', 'Currency Code']), 'ZOHO');
});

test('detectSource: Wave via "Transaction ID" column', () => {
  assert.equal(detectSource(['Date', 'Transaction ID', 'Account', 'Debit', 'Credit']), 'WAVE');
});

test('detectSource: QBO via "Num" with no Zoho/Wave signal', () => {
  assert.equal(detectSource(['Date', 'Num', 'Account', 'Debit', 'Credit']), 'QBO');
});

test('detectSource: Xero via "Reference"', () => {
  assert.equal(detectSource(['Narration', 'Date', 'Reference', 'AccountCode', 'Amount']), 'XERO');
});

test('parseAndNormalize: routes Zoho through the Zoho parser', () => {
  const csv = parseCsv('Journal Date,Journal Number,Account,Debit,Credit\n15/03/2024,ZB-1,A,100,\n15/03/2024,ZB-1,B,,100');
  const r = parseAndNormalize(csv.columns, csv.rows);
  assert.ok(r);
  assert.equal(r!.source, 'ZOHO');
  assert.equal(r!.totalJournals, 1);
});

test('parseAndNormalize: routes Wave through the Wave parser', () => {
  const csv = parseCsv('Date,Transaction ID,Account,Debit,Credit\n03/15/2024,WAV-1,A,100,\n03/15/2024,WAV-1,B,,100');
  const r = parseAndNormalize(csv.columns, csv.rows);
  assert.ok(r);
  assert.equal(r!.source, 'WAVE');
  assert.equal(r!.totalJournals, 1);
});

/* ─────────────────── source helper functions ────────────────────── */

test('sourceToMigrateSlug: returns canonical /migrate/from-* slugs', () => {
  // Web-Fire-hellobooks.ai uses the `from-` prefix convention on its
  // /migrate/ pages — a slug without the prefix would 404.
  assert.equal(sourceToMigrateSlug('QBO'), 'from-quickbooks');
  assert.equal(sourceToMigrateSlug('XERO'), 'from-xero');
  assert.equal(sourceToMigrateSlug('ZOHO'), 'from-zoho');
  assert.equal(sourceToMigrateSlug('WAVE'), 'from-wave');
});

test('sourceToHumanLabel: returns user-facing names', () => {
  assert.equal(sourceToHumanLabel('QBO'), 'QuickBooks Online');
  assert.equal(sourceToHumanLabel('XERO'), 'Xero');
  assert.equal(sourceToHumanLabel('ZOHO'), 'Zoho Books');
  assert.equal(sourceToHumanLabel('WAVE'), 'Wave');
});
