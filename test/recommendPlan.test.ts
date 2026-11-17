import { test } from 'node:test';
import assert from 'node:assert/strict';

import { recommendPlan } from '../src/tools/recommendPlan.js';
import { FREE_TRANSACTION_LIMIT } from '../src/data/plans.js';

// Deterministic, offline — pin the baked pricing/articles catalogs.
process.env.HELLOBOOKS_MCP_DISABLE_PRICING_FEED = '1';
process.env.HELLOBOOKS_MCP_DISABLE_ARTICLES_FEED = '1';

const CORE = ['free', 'starter', 'pro', 'business', 'scale'];

test('ranks exactly the core ladder, cheapest-first', () => {
  const r = recommendPlan({});
  assert.deepEqual(r.ranked.map((x) => x.plan), CORE);
  // Add-ons and cpa never appear in the core recommendation ladder.
  assert.ok(!r.ranked.some((x) => ['cpa', 'warehouse-addon', 'manufacturing-addon'].includes(x.plan)));
});

test('high transaction volume rules out Free', () => {
  const r = recommendPlan({ estimatedAnnualTransactions: FREE_TRANSACTION_LIMIT + 1 });
  const free = r.ranked.find((x) => x.plan === 'free');
  assert.equal(free?.eligible, false);
  assert.match(free?.ineligibleReason ?? '', /Free is capped/);
  assert.notEqual(r.recommendation, 'free');
});

test('low volume keeps Free eligible and recommends it when no needs', () => {
  const r = recommendPlan({ estimatedAnnualTransactions: 50 });
  const free = r.ranked.find((x) => x.plan === 'free');
  assert.equal(free?.eligible, true);
  assert.equal(r.recommendation, 'free');
});

test('recommends the lowest tier that covers the most needs', () => {
  const r = recommendPlan({ needs: ['invoicing', 'reports'] });
  assert.ok(r.recommendation, 'should recommend a tier');
  const rec = r.ranked.find((x) => x.plan === r.recommendation);
  const best = Math.max(...r.ranked.filter((x) => x.eligible).map((x) => x.score));
  assert.equal(rec?.score, best, 'recommended tier must have the best eligible coverage');
  // No cheaper eligible tier may tie the best score.
  const cheaperTie = r.ranked
    .slice(0, r.ranked.findIndex((x) => x.plan === r.recommendation))
    .find((x) => x.eligible && x.score === best);
  assert.equal(cheaperTie, undefined, 'a cheaper eligible tie should have been chosen');
});

test('unmatched needs are reported, not silently dropped', () => {
  const r = recommendPlan({ needs: ['teleportation', 'invoicing'] });
  const allNeeds = new Set(
    r.ranked.flatMap((x) => [...x.matchedNeeds, ...x.unmatchedNeeds]),
  );
  assert.ok(allNeeds.has('teleportation'));
  assert.ok(allNeeds.has('invoicing'));
});

test('country flag resolves local pricing rows', () => {
  const r = recommendPlan({ country: 'IN', needs: ['gst'] });
  assert.equal(r.country, 'IN');
  const paid = r.ranked.find((x) => x.plan === 'pro');
  // India is a priced region, so a currency should resolve.
  assert.ok(paid?.currency, 'expected a resolved currency for a priced country');
});

test('result shape is stable', () => {
  const r = recommendPlan({ needs: ['payroll'] });
  assert.deepEqual(
    Object.keys(r).sort(),
    ['country', 'note', 'ranked', 'reason', 'recommendation'],
  );
  for (const row of r.ranked) {
    assert.deepEqual(
      Object.keys(row).sort(),
      ['currency', 'eligible', 'ineligibleReason', 'matchedNeeds', 'monthly', 'name', 'plan', 'score', 'signupUrl', 'unmatchedNeeds'].sort(),
    );
  }
});
