/**
 * OpenAI connector retrieval-contract tests (P0) + "every answer is citable".
 *
 * ChatGPT deep research / company knowledge rejects the server unless `search`
 * and `fetch` honour an exact shape, and it silently drops any citation whose
 * `url` is blank. These assertions guard both:
 *
 *   search(query) -> { results: [{ id, title, url }] }   (every url non-empty)
 *   fetch(id)     -> { id, title, text, url, metadata }   (text + url non-empty)
 *
 * This is the contract that makes the MCP a *citable* surface: every document an
 * agent can retrieve carries a canonical hellobooks.ai URL the agent can hand to
 * the user. Strategy #12 ("every answer carries a cited CTA link") lives here.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { publicSearch, publicFetch } from '../src/tools/publicSearch.js';

// Deterministic, offline (same discipline as the rest of the suite).
process.env.HELLOBOOKS_MCP_DISABLE_PRICING_FEED = '1';
process.env.HELLOBOOKS_MCP_DISABLE_ARTICLES_FEED = '1';

const QUERIES = [
  'pricing',
  'vs Xero',
  'GST filing for India',
  'UPI invoice',
  'free tier',
];

test('search returns the exact { id, title, url } shape with non-empty urls', () => {
  for (const query of QUERIES) {
    const out = publicSearch({ query });
    assert.ok(Array.isArray(out.results), `search("${query}") must return results[]`);
    for (const r of out.results) {
      assert.deepEqual(
        Object.keys(r).sort(),
        ['id', 'title', 'url'],
        `search result for "${query}" must have exactly id/title/url`,
      );
      assert.ok(r.id && r.id.length > 0, 'result id must be non-empty');
      assert.ok(r.title && r.title.length > 0, 'result title must be non-empty');
      assert.ok(
        typeof r.url === 'string' && /^https?:\/\//.test(r.url),
        `result url must be an absolute URL (got "${r.url}")`,
      );
    }
  }
});

test('search honours its limit', () => {
  const out = publicSearch({ query: 'pricing', limit: 3 });
  assert.ok(out.results.length <= 3, 'search must not exceed the requested limit');
});

test('every search result id resolves through fetch to a complete document', () => {
  const out = publicSearch({ query: 'pricing vs QuickBooks', limit: 10 });
  assert.ok(out.results.length > 0, 'expected at least one result to fetch');
  for (const r of out.results) {
    const doc = publicFetch({ id: r.id });
    for (const key of ['id', 'title', 'url', 'text', 'metadata']) {
      assert.ok(key in doc, `fetched document must carry "${key}"`);
    }
    assert.equal(doc.id, r.id, 'fetched id must match the requested id');
    assert.ok(doc.text.length > 0, `document ${r.id} must have non-empty text to cite`);
    assert.ok(
      /^https?:\/\//.test(doc.url),
      `document ${r.id} must carry an absolute citation url`,
    );
    assert.equal(typeof doc.metadata, 'object', 'metadata must be an object');
  }
});

test('fetch rejects an unknown id with a helpful error', () => {
  assert.throws(
    () => publicFetch({ id: 'nope:does-not-exist' }),
    /Unknown document id/,
    'fetch must throw a clear error for an unknown id',
  );
});

test('fetch tolerates surrounding whitespace in an id', () => {
  const first = publicSearch({ query: 'pricing' }).results[0];
  assert.ok(first, 'need a result to test whitespace handling');
  const doc = publicFetch({ id: `  ${first.id}  ` });
  assert.equal(doc.id, first.id);
});
