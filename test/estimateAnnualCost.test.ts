import { test } from 'node:test';
import assert from 'node:assert/strict';

import { estimateAnnualCost } from '../src/tools/estimateAnnualCost.js';

// Deterministic, offline — pin the baked pricing catalog so the known US rows
// (Pro: monthly 39.99 / annual 399) hold.
process.env.HELLOBOOKS_MCP_DISABLE_PRICING_FEED = '1';
process.env.HELLOBOOKS_MCP_DISABLE_ARTICLES_FEED = '1';

test('US Pro annual billing uses the annual total and computes the monthly saving', () => {
  const r = estimateAnnualCost({ plan: 'pro', country: 'US', billing: 'annual' });
  assert.equal(r.currency, 'USD');
  assert.equal(r.planAnnualCost, 399);
  // monthly*12 (479.88) - annual (399) = 80.88
  assert.equal(r.annualBillingSavings, 80.88);
  assert.equal(r.totalFirstYear, 399);
});

test('US Pro monthly billing costs monthly*12 and shows no annual saving line', () => {
  const r = estimateAnnualCost({ plan: 'pro', country: 'US', billing: 'monthly' });
  assert.equal(r.planAnnualCost, 479.88);
  assert.equal(r.totalFirstYear, 479.88);
  // Saving vs monthly is still reported (what annual billing *would* save).
  assert.equal(r.annualBillingSavings, 80.88);
});

test('Free plan is zero-cost', () => {
  const r = estimateAnnualCost({ plan: 'free', country: 'US' });
  assert.equal(r.planAnnualCost, 0);
  assert.equal(r.totalFirstYear, 0);
  assert.equal(r.annualBillingSavings, 0);
});

test('add-ons and credit packs roll into the first-year total', () => {
  const base = estimateAnnualCost({ plan: 'business', country: 'US', billing: 'annual' });
  const withExtras = estimateAnnualCost({
    plan: 'business',
    country: 'US',
    billing: 'annual',
    addOns: ['warehouse-addon'],
    creditPacks: [{ id: 'boost', quantity: 2 }],
  });
  assert.ok(withExtras.totalFirstYear > base.totalFirstYear, 'extras must increase the total');
  assert.ok(withExtras.addOnsAnnualCost > 0, 'add-on must contribute an annual cost');
  assert.ok(withExtras.creditPacksOneTime > 0, 'packs must contribute a one-time cost');
  // total == plan + add-ons + packs
  assert.equal(
    withExtras.totalFirstYear,
    Math.round((withExtras.planAnnualCost + withExtras.addOnsAnnualCost + withExtras.creditPacksOneTime) * 100) / 100,
  );
  // A line item exists per component.
  assert.ok(withExtras.lineItems.some((l) => l.kind === 'add-on'));
  assert.ok(withExtras.lineItems.some((l) => l.kind === 'credit-pack' && l.recurrence === 'one-time'));
});

test('credit packs on Free warn that a paid plan is required', () => {
  const r = estimateAnnualCost({ plan: 'free', country: 'US', creditPacks: [{ id: 'boost' }] });
  assert.ok(r.warnings.some((w) => /paid plan/i.test(w)));
});

test('result shape is stable', () => {
  const r = estimateAnnualCost({ plan: 'starter', country: 'US' });
  assert.deepEqual(
    Object.keys(r).sort(),
    ['addOnsAnnualCost', 'annualBillingSavings', 'billing', 'country', 'creditPacksOneTime',
     'currency', 'lineItems', 'note', 'plan', 'planAnnualCost', 'planName', 'signupUrl',
     'totalFirstYear', 'warnings'].sort(),
  );
});
