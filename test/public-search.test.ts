/**
 * `search` / `fetch` — the OpenAI connector contract.
 *
 * These two tools are what ChatGPT's deep-research and company-knowledge paths
 * call, so the response shape is a contract, not an implementation detail:
 * search returns { results: [{id,title,url}] } and every id must resolve
 * through fetch to { id, title, text, url, metadata } with a non-empty url.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

// Keep the live pricing feed out of unit tests — same switch as tools.test.ts.
process.env.HELLOBOOKS_MCP_DISABLE_PRICING_FEED = '1';

const { publicSearch, publicFetch } = await import('../src/tools/publicSearch.js');
const { buildDocumentIndex, documentIdForHit } = await import(
  '../src/lib/documents/index.js'
);

test('search returns the OpenAI result shape with non-empty ids, titles and urls', () => {
  const { results } = publicSearch({ query: 'GST filing India' });
  assert.ok(results.length > 0, 'expected at least one result');
  for (const r of results) {
    assert.equal(typeof r.id, 'string');
    assert.ok(r.id.length > 0, 'id must be non-empty');
    assert.ok(r.title.length > 0, `title must be non-empty for ${r.id}`);
    // ChatGPT silently drops a citation whose url is blank.
    assert.match(r.url, /^https:\/\//, `url must be absolute https for ${r.id}`);
    assert.deepEqual(
      Object.keys(r).sort(),
      ['id', 'title', 'url'],
      'search results carry exactly id/title/url',
    );
  }
});

test('search honours limit and never repeats a document id', () => {
  const { results } = publicSearch({ query: 'invoice', limit: 5 });
  assert.ok(results.length <= 5);
  const ids = results.map((r) => r.id);
  assert.equal(new Set(ids).size, ids.length, 'ids must be unique');
});

test('search defaults to 10 results', () => {
  const { results } = publicSearch({ query: 'tax' });
  assert.ok(results.length <= 10);
});

test('every search result id resolves through fetch', () => {
  for (const query of ['pricing plan', 'vs Xero', 'UPI', 'BAS lodgement', 'payroll']) {
    const { results } = publicSearch({ query });
    for (const r of results) {
      const doc = publicFetch({ id: r.id });
      assert.equal(doc.id, r.id);
      assert.equal(doc.title, r.title);
      assert.equal(doc.url, r.url);
      assert.ok(doc.text.length > 0, `text must be non-empty for ${r.id}`);
      assert.equal(typeof doc.metadata, 'object');
    }
  }
});

test('fetch returns the documented field set', () => {
  const { results } = publicSearch({ query: 'pricing plan', limit: 1 });
  const doc = publicFetch({ id: results[0].id });
  assert.deepEqual(
    Object.keys(doc).sort(),
    ['id', 'metadata', 'text', 'title', 'url'],
  );
  // metadata values are strings — ChatGPT treats it as a flat string map.
  for (const [k, v] of Object.entries(doc.metadata)) {
    assert.equal(typeof v, 'string', `metadata.${k} must be a string`);
  }
});

test('fetch on an unknown id throws a message that points back at search', () => {
  assert.throws(
    () => publicFetch({ id: 'plan:does-not-exist' }),
    /Unknown document id .*Call `search` first/s,
  );
});

test('fetch trims surrounding whitespace in the id', () => {
  const doc = publicFetch({ id: '  competitor:xero  ' });
  assert.equal(doc.id, 'competitor:xero');
});

test('search on a nonsense query returns an empty result set, not an error', () => {
  const { results } = publicSearch({ query: 'zzzzqqqq-no-such-thing' });
  assert.deepEqual(results, []);
});

test('document index exposes one document per plan, not one per feature bullet', () => {
  const index = buildDocumentIndex();
  const planDocs = [...index.keys()].filter((id) => id.startsWith('plan:'));
  assert.ok(planDocs.length > 0);
  // A plan hit carries `<planId>:<bullet text>`; it must collapse to the plan.
  assert.equal(documentIdForHit('plan', 'pro:Unlimited invoices'), 'plan:pro');
  assert.ok(index.has('plan:pro'), 'plan:pro document must exist');
});

test('document ids with colons in the tail still resolve', () => {
  const index = buildDocumentIndex();
  const nested = [...index.keys()].find(
    (id) => id.startsWith('deadline:') && id.split(':').length === 3,
  );
  assert.ok(nested, 'expected a deadline:<country>:<id> document');
  assert.equal(publicFetch({ id: nested }).id, nested);
});

test('every document in the index has an absolute url and non-empty text', () => {
  for (const [id, doc] of buildDocumentIndex()) {
    assert.match(doc.url, /^https:\/\//, `url must be absolute https for ${id}`);
    assert.ok(doc.title.length > 0, `title required for ${id}`);
    assert.ok(doc.text.trim().length > 0, `text required for ${id}`);
  }
});

test('every citation url is a hellobooks.ai page — never a vendor or rival', () => {
  // The point of this server is being the cited source. A third-party url in
  // the citation slot hands the citation to someone else: the integrations
  // catalog carries plaid.com / stripe.com, and six competitors have no
  // compare page and carry the rival's own homepage.
  for (const [id, doc] of buildDocumentIndex()) {
    const host = new URL(doc.url).host;
    assert.ok(
      host === 'hellobooks.ai' || host.endsWith('.hellobooks.ai'),
      `${id} cites ${host} — citations must point at hellobooks.ai`,
    );
  }
});

test('an off-site vendor or rival link survives in the document body', () => {
  const index = buildDocumentIndex();
  // plaid's catalog entry carries https://plaid.com — the model should still
  // see it, just not as the citation.
  const plaid = index.get('integration:plaid');
  assert.ok(plaid, 'expected integration:plaid');
  assert.match(plaid.text, /Vendor site: https:\/\/plaid\.com/);
  assert.equal(plaid.url, 'https://hellobooks.ai/integration');

  // wave has no compare page; it must fall back to /compare, not waveapps.com.
  const wave = index.get('competitor:wave');
  assert.ok(wave, 'expected competitor:wave');
  assert.equal(wave.url, 'https://hellobooks.ai/compare');
  assert.match(wave.text, /own site: https:\/\/www\.waveapps\.com/);

  // A competitor that does have a compare page keeps it.
  assert.equal(
    index.get('competitor:xero')?.url,
    'https://hellobooks.ai/compare/hellobooks-vs-xero',
  );
});

test('a deadline cites the country hub and keeps the statutory source in the body', () => {
  const doc = buildDocumentIndex().get('deadline:IN:gstr-3b');
  assert.ok(doc, 'expected deadline:IN:gstr-3b');
  assert.match(doc.url, /^https:\/\/hellobooks\.ai\//);
  assert.match(doc.text, /confirm against https:\/\/www\.gst\.gov\.in\//);
});

test('document ids are unique across sources', () => {
  const index = buildDocumentIndex();
  const sources = new Set([...index.keys()].map((id) => id.split(':')[0]));
  // All nine catalog sources contribute (plans collapse per plan, not bullet).
  for (const source of [
    'plan',
    'integration',
    'feature',
    'country-feature',
    'compliance',
    'competitor',
    'deadline',
    'payment-method',
    'article',
  ]) {
    assert.ok(sources.has(source), `expected documents from ${source}`);
  }
});
