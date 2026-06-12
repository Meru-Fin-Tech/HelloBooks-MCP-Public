/**
 * Tests for the per-catalog HTTP JSON feeds (src/catalogFeeds.ts).
 *
 * Guarantees that:
 *   1. Every registered feed builds, is JSON-serializable, and carries a
 *      consistent envelope (catalog, source, count, data, dataSource).
 *   2. The index lists exactly the registered feeds with correct URLs.
 *   3. Unknown slugs return null (→ 404 at the HTTP layer).
 *   4. The HELLOBOOKS_MCP_BASE_URL override threads through every feed URL.
 *   5. Pricing advertises federation provenance; the rest are `static`.
 *   6. Every expected catalog is present, so adding an MCP data module without
 *      exposing its feed fails the build.
 */

// Pin pricing to baked data so the test never hits the network (mirrors the
// convention in tools.test.ts / discovery.test.ts). Must run before imports
// that transitively pull in pricingFeed.
process.env.HELLOBOOKS_MCP_DISABLE_PRICING_FEED = '1';

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  CATALOG_FEEDS,
  CATALOG_FEED_SLUGS,
  generateCatalogFeed,
  generateCatalogFeedIndex,
} from '../src/catalogFeeds.js';

const EXPECTED_SLUGS = [
  'plans',
  'features',
  'integrations',
  'competitors',
  'compliance-deadlines',
  'countries',
  'tax-rates',
  'capabilities',
  'payment-methods',
  'articles',
  'videos',
  'free-tier-thresholds',
];

test('every expected catalog is exposed as a feed', () => {
  for (const slug of EXPECTED_SLUGS) {
    assert.ok(CATALOG_FEED_SLUGS.includes(slug), `missing feed: ${slug}`);
  }
  // No accidental extras without updating this test.
  assert.deepEqual([...CATALOG_FEED_SLUGS].sort(), [...EXPECTED_SLUGS].sort());
});

test('each feed builds with a consistent, serializable envelope', () => {
  for (const slug of CATALOG_FEED_SLUGS) {
    const body = generateCatalogFeed(slug);
    assert.ok(body, `feed ${slug} returned null`);
    const feed = body as Record<string, unknown>;
    assert.equal(feed.catalog, slug);
    assert.equal(feed.name, 'hellobooks-public');
    assert.equal(typeof feed.version, 'string');
    assert.equal(typeof feed.title, 'string');
    assert.equal(typeof feed.description, 'string');
    assert.equal(typeof feed.count, 'number');
    assert.ok((feed.count as number) > 0, `feed ${slug} has no records`);
    assert.equal(typeof feed.data, 'object');
    assert.ok(feed.data !== null);
    assert.equal(typeof feed.dateModified, 'string');
    assert.match(String(feed.source), new RegExp(`/catalog/${slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.json$`));
    // Must round-trip through JSON without throwing.
    assert.doesNotThrow(() => JSON.stringify(feed));
  }
});

test('non-pricing feeds are static; plans advertises federation provenance', () => {
  for (const slug of CATALOG_FEED_SLUGS) {
    const feed = generateCatalogFeed(slug) as Record<string, unknown>;
    if (slug === 'plans') {
      assert.ok(
        feed.dataSource === 'static-fallback' || feed.dataSource === 'live-feed',
        `plans dataSource was ${String(feed.dataSource)}`,
      );
      const data = feed.data as Record<string, unknown>;
      assert.ok(Array.isArray(data.plans));
      assert.ok(Array.isArray(data.creditPacks));
      assert.equal(typeof data.pricing, 'object');
    } else {
      assert.equal(feed.dataSource, 'static');
    }
  }
});

test('unknown slug returns null', () => {
  assert.equal(generateCatalogFeed('does-not-exist'), null);
  assert.equal(generateCatalogFeed(''), null);
});

test('index lists exactly the registered feeds with valid URLs', () => {
  const index = generateCatalogFeedIndex();
  assert.equal(index.count, CATALOG_FEEDS.length);
  const feeds = index.feeds as { catalog: string; url: string; title: string }[];
  assert.equal(feeds.length, CATALOG_FEEDS.length);
  for (const entry of feeds) {
    assert.ok(CATALOG_FEED_SLUGS.includes(entry.catalog));
    assert.match(entry.url, /^https?:\/\/.+\/catalog\/.+\.json$/);
    assert.equal(typeof entry.title, 'string');
  }
});

test('HELLOBOOKS_MCP_BASE_URL override threads through feed + index URLs', () => {
  const prev = process.env.HELLOBOOKS_MCP_BASE_URL;
  process.env.HELLOBOOKS_MCP_BASE_URL = 'https://staging.example.test';
  try {
    const feed = generateCatalogFeed('features') as Record<string, unknown>;
    assert.equal(feed.source, 'https://staging.example.test/catalog/features.json');
    const index = generateCatalogFeedIndex();
    const feeds = index.feeds as { url: string }[];
    assert.ok(feeds.every((f) => f.url.startsWith('https://staging.example.test/')));
  } finally {
    if (prev === undefined) delete process.env.HELLOBOOKS_MCP_BASE_URL;
    else process.env.HELLOBOOKS_MCP_BASE_URL = prev;
  }
});
