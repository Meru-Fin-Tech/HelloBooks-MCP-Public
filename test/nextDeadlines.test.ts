import { test } from 'node:test';
import assert from 'node:assert/strict';

import { nextDeadlines, computeNextDue } from '../src/tools/nextDeadlines.js';
import { COMPLIANCE_DEADLINES } from '../src/data/complianceDeadlines.js';

const ASOF = '2026-11-17';

test('monthly dueDay still ahead this month resolves to this month', () => {
  // GSTR-3B is monthly, due the 20th. On the 17th, the 20th is still ahead.
  const gstr3b = COMPLIANCE_DEADLINES.find((d) => d.id === 'gstr-3b');
  assert.ok(gstr3b, 'fixture expects gstr-3b');
  const due = computeNextDue(gstr3b!, new Date(`${ASOF}T00:00:00Z`));
  assert.equal(due, '2026-11-20');
});

test('monthly dueDay already passed rolls to next month', () => {
  // GSTR-1 is monthly, due the 11th. On the 17th, the 11th has passed.
  const gstr1 = COMPLIANCE_DEADLINES.find((d) => d.id === 'gstr-1');
  assert.ok(gstr1, 'fixture expects gstr-1');
  const due = computeNextDue(gstr1!, new Date(`${ASOF}T00:00:00Z`));
  assert.equal(due, '2026-12-11');
});

test('results are sorted soonest-first and never before asOf', () => {
  const r = nextDeadlines({ country: 'IN', asOf: ASOF });
  assert.equal(r.country, 'IN');
  assert.equal(r.asOf, ASOF);
  let prev = -Infinity;
  const dated = r.deadlines.filter((d) => d.daysUntil !== null);
  assert.ok(dated.length > 0, 'expected at least one dated IN filing');
  for (const d of dated) {
    assert.ok(d.nextDue! >= ASOF, `${d.form} nextDue ${d.nextDue} must be >= asOf`);
    assert.ok(d.daysUntil! >= 0, `${d.form} daysUntil must be >= 0`);
    assert.ok(d.daysUntil! >= prev, 'rows must be ascending by daysUntil');
    prev = d.daysUntil!;
  }
});

test('undated (scheduleVaries) rows sort after dated rows and carry null', () => {
  const r = nextDeadlines({ asOf: ASOF });
  const idxFirstUndated = r.deadlines.findIndex((d) => d.scheduleVaries);
  if (idxFirstUndated >= 0) {
    for (let i = idxFirstUndated; i < r.deadlines.length; i++) {
      assert.equal(r.deadlines[i].scheduleVaries, true, 'all trailing rows are undated');
      assert.equal(r.deadlines[i].nextDue, null);
      assert.equal(r.deadlines[i].daysUntil, null);
    }
  }
});

test('withinDays filters out anything beyond the window (dated only)', () => {
  const r = nextDeadlines({ country: 'IN', asOf: ASOF, withinDays: 15 });
  for (const d of r.deadlines) {
    assert.notEqual(d.daysUntil, null, 'withinDays must drop undated rows');
    assert.ok(d.daysUntil! <= 15);
  }
  assert.equal(r.withinDays, 15);
});

test('limit caps the row count', () => {
  const r = nextDeadlines({ asOf: ASOF, limit: 3 });
  assert.ok(r.deadlines.length <= 3);
  assert.equal(r.count, r.deadlines.length);
});

test('every response carries the annual-rotation disclaimer', () => {
  const r = nextDeadlines({ asOf: ASOF });
  assert.match(r.disclaimer, /rotate annually/i);
  assert.match(r.disclaimer, /source/i);
});

test('annual-dates entry picks an occurrence on/after asOf', () => {
  const withAnnual = COMPLIANCE_DEADLINES.find(
    (d) => d.annualDates && d.annualDates.length > 0,
  );
  if (withAnnual) {
    const due = computeNextDue(withAnnual!, new Date(`${ASOF}T00:00:00Z`));
    assert.ok(due !== null, 'an entry with annualDates must produce a date');
    assert.ok(due! >= ASOF, 'computed annual date must be on/after asOf');
  }
});
