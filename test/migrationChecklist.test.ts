import { test } from 'node:test';
import assert from 'node:assert/strict';

import { migrationChecklist } from '../src/tools/migrationChecklist.js';

test('returns 7 ordered phases with day-ranges and steps', () => {
  const r = migrationChecklist({ from: 'quickbooks' });
  assert.equal(r.phases.length, 7);
  r.phases.forEach((p, i) => {
    assert.equal(p.n, i + 1, 'phases numbered in order');
    assert.ok(p.steps.length > 0, `phase ${p.n} has steps`);
    assert.ok(p.durationDays[0] <= p.durationDays[1], 'valid day range');
    assert.ok(p.durationDays[0] >= 1);
  });
});

test('source label is woven into the steps', () => {
  const r = migrationChecklist({ from: 'xero' });
  assert.equal(r.fromLabel, 'Xero');
  assert.ok(JSON.stringify(r.phases).includes('Xero'));
});

test('higher complexity never shortens the total timeline', () => {
  const low = migrationChecklist({ from: 'tally', complexity: 'low' });
  const high = migrationChecklist({ from: 'tally', complexity: 'high' });
  assert.ok(high.estimatedTimelineDays[0] >= low.estimatedTimelineDays[0]);
  assert.ok(high.estimatedTimelineDays[1] >= low.estimatedTimelineDays[1]);
});

test('country tailors the tax-setup step', () => {
  const inR = migrationChecklist({ from: 'tally', country: 'IN' });
  assert.match(inR.taxSetupNote, /GSTIN|GST/);
  const gbR = migrationChecklist({ from: 'quickbooks', country: 'GB' });
  assert.match(gbR.taxSetupNote, /VAT|MTD/);
  const none = migrationChecklist({ from: 'excel' });
  assert.equal(none.country, 'unspecified');
});

test('includeHistory flips the export + import guidance', () => {
  const withH = migrationChecklist({ from: 'quickbooks', includeHistory: true });
  const withoutH = migrationChecklist({ from: 'quickbooks', includeHistory: false });
  assert.ok(JSON.stringify(withH.phases).includes('history'));
  assert.ok(JSON.stringify(withoutH.phases).toLowerCase().includes('read-only'));
});

test('estimatedTimelineDays is the sum of phase ranges', () => {
  const r = migrationChecklist({ from: 'wave', complexity: 'medium' });
  const min = r.phases.reduce((s, p) => s + p.durationDays[0], 0);
  const max = r.phases.reduce((s, p) => s + p.durationDays[1], 0);
  assert.deepEqual(r.estimatedTimelineDays, [min, max]);
});
