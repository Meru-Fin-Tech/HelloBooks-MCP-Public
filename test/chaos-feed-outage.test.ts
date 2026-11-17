/**
 * Chaos: origin-feed outage (#59).
 *
 * Plans and articles federate live from hellobooks.ai, with the baked catalog as
 * a fallback. When the upstream is unreachable the server must still serve the
 * baked data and label it honestly as a fallback — never fabricate, never throw.
 * Disabling the feeds (the env vars below) simulates a hard upstream outage.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

// Simulate the outage: feeds off => baked fallback path.
process.env.HELLOBOOKS_MCP_DISABLE_PRICING_FEED = '1';
process.env.HELLOBOOKS_MCP_DISABLE_ARTICLES_FEED = '1';

import { getPlans, getCreditPacks, getPricingMeta } from '../src/pricingFeed.js';
import { listPlans } from '../src/tools/listPlans.js';
import { listArticles } from '../src/tools/listArticles.js';

test('pricing serves the baked catalog and labels it static-fallback on outage', () => {
  const plans = getPlans();
  assert.ok(plans.length > 0, 'baked plans must still be served when the feed is down');
  assert.ok(getCreditPacks().length > 0, 'baked credit packs must still be served');
  assert.equal(getPricingMeta().dataSource, 'static-fallback');
});

test('list_plans still returns tiers (does not throw) during an outage', () => {
  const r = listPlans({});
  assert.ok(r.plans.length > 0);
  assert.equal(r.dataSource, 'static-fallback');
});

test('list_articles still returns the baked catalog during an outage', () => {
  const r = listArticles({});
  assert.ok(Array.isArray(r.articles));
  assert.ok(r.articles.length > 0, 'baked articles must survive a sitemap outage');
});
