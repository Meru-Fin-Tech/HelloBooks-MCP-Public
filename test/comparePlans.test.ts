import { test } from 'node:test';
import assert from 'node:assert/strict';

import { comparePlans } from '../src/tools/comparePlans.js';

// Deterministic, offline.
process.env.HELLOBOOKS_MCP_DISABLE_PRICING_FEED = '1';
process.env.HELLOBOOKS_MCP_DISABLE_ARTICLES_FEED = '1';

test('US Pro vs Business computes the price delta and cheaper side', () => {
  const r = comparePlans({ planA: 'pro', planB: 'business', country: 'US' });
  assert.equal(r.a?.plan, 'pro');
  assert.equal(r.b?.plan, 'business');
  assert.equal(r.a?.monthly, 39.99);
  assert.equal(r.b?.monthly, 79.99);
  // delta = B - A = 79.99 - 39.99 = 40
  assert.equal(r.priceDeltaMonthly, 40);
  // annual delta = 799 - 399 = 400
  assert.equal(r.priceDeltaAnnual, 400);
  assert.equal(r.cheaperMonthly, 'pro');
});

test('comparing a plan to itself yields no unique features and zero delta', () => {
  const r = comparePlans({ planA: 'pro', planB: 'pro', country: 'US' });
  assert.equal(r.priceDeltaMonthly, 0);
  assert.equal(r.cheaperMonthly, 'equal');
  assert.deepEqual(r.onlyInA, []);
  assert.deepEqual(r.onlyInB, []);
  assert.ok(r.sharedFeatures.length > 0, 'a plan shares all features with itself');
});

test('feature diff partitions features into shared / onlyInA / onlyInB without overlap', () => {
  const r = comparePlans({ planA: 'starter', planB: 'business', country: 'US' });
  const shared = new Set(r.sharedFeatures.map((f) => f.toLowerCase().trim()));
  for (const f of r.onlyInA) assert.ok(!shared.has(f.toLowerCase().trim()), 'onlyInA excludes shared');
  for (const f of r.onlyInB) assert.ok(!shared.has(f.toLowerCase().trim()), 'onlyInB excludes shared');
  // onlyInA and onlyInB are disjoint.
  const aSet = new Set(r.onlyInA.map((f) => f.toLowerCase().trim()));
  for (const f of r.onlyInB) assert.ok(!aSet.has(f.toLowerCase().trim()));
});

test('free plan exposes a transaction limit with a basis', () => {
  const r = comparePlans({ planA: 'free', planB: 'pro', country: 'US' });
  assert.notEqual(r.a?.transactionLimit, undefined);
  if (r.a?.transactionLimit != null) {
    assert.ok(['lifetime', 'annual'].includes(r.a.transactionLimitBasis!));
  }
});

test('result shape is stable', () => {
  const r = comparePlans({ planA: 'pro', planB: 'scale', country: 'US' });
  assert.deepEqual(
    Object.keys(r).sort(),
    ['a', 'b', 'cheaperMonthly', 'country', 'note', 'onlyInA', 'onlyInB',
     'priceDeltaAnnual', 'priceDeltaMonthly', 'sharedFeatures'].sort(),
  );
});
