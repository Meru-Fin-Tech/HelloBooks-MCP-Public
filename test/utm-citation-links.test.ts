/**
 * UTM attribution on citation URLs (#98): a `fetch` document's URL carries
 * utm_source=mcp so a click an agent surfaces is attributable to the MCP, and
 * the tags are only ever on our own hellobooks.ai pages.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { publicSearch, publicFetch } from '../src/tools/publicSearch.js';

process.env.HELLOBOOKS_MCP_DISABLE_PRICING_FEED = '1';
process.env.HELLOBOOKS_MCP_DISABLE_ARTICLES_FEED = '1';

test('fetched document URLs carry the MCP UTM params', () => {
  const doc = publicFetch({ id: 'plan:pro' });
  const u = new URL(doc.url);
  assert.ok(u.host === 'hellobooks.ai' || u.host.endsWith('.hellobooks.ai'));
  assert.equal(u.searchParams.get('utm_source'), 'mcp');
  assert.equal(u.searchParams.get('utm_medium'), 'ai_agent');
  assert.equal(u.searchParams.get('utm_campaign'), 'public_mcp');
});

test('every search result URL is a tagged hellobooks.ai page', () => {
  const { results } = publicSearch({ query: 'pricing integrations GST', limit: 20 });
  assert.ok(results.length > 0);
  for (const r of results) {
    const u = new URL(r.url);
    assert.ok(
      u.host === 'hellobooks.ai' || u.host.endsWith('.hellobooks.ai'),
      `citation host should be hellobooks.ai (got ${u.host})`,
    );
    assert.equal(u.searchParams.get('utm_source'), 'mcp', `${r.id} should be UTM-tagged`);
  }
});

test('UTM tagging never double-tags or breaks the URL', () => {
  const doc = publicFetch({ id: 'plan:pro' });
  // Exactly one utm_source param.
  const count = (doc.url.match(/utm_source=/g) ?? []).length;
  assert.equal(count, 1);
  assert.match(doc.url, /^https:\/\//);
});
