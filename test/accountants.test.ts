import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDirectoryLoader, queryAccountants, accountantSchema, queryAccountant } from '../src/accountants.js';
import { renderAccountant, renderAccountants } from '../src/directoryPages.js';

const firm = (n: number) => ({ slug: `firm-${n}`, firm_name: `Firm ${String(n).padStart(3, '0')}`,
  country: n % 2 ? 'india' : 'united-states', city: 'Austin', accepting_clients: n % 3 !== 0,
  specialties: ['bookkeeping'], email_public: 'public@example.com', bio_long: 'Complete biography',
  firm_qa: [{ question: 'What services?', answer: 'Monthly bookkeeping.' }], internal_notes: 'private' });

test('all full profiles remain reachable across pagination, with availability optional', async () => {
  const source = Array.from({ length: 257 }, (_, n) => firm(n));
  const load = createDirectoryLoader({ fetcher: (async () => Response.json({ firms: source, _meta: { complete: true, dataSource: 'live', firmCount: source.length } })) as typeof fetch });
  const snapshot = await load();
  const found = [];
  let page: number | null = 1;
  while (page !== null) {
    const result = queryAccountants(snapshot, { page, pageSize: 25 });
    found.push(...result.firms);
    page = result.nextPage;
  }
  assert.equal(found.length, 257);
  assert.equal(new Set(found.map(f => f.slug)).size, 257);
  assert.ok(found.some(f => f.accepting_clients === false));
  assert.equal(found[0].bio_long, 'Complete biography');
  assert.equal(found[0].firm_qa?.[0].answer, 'Monthly bookkeeping.');
  assert.ok(!('internal_notes' in found[0]));
  assert.ok(queryAccountants(snapshot, { acceptingClients: true }).firms.every(f => f.accepting_clients));
  assert.equal(queryAccountants(snapshot, { country: 'INDIA', query: 'bookkeeping Austin' }).total, 128);
});
test('a successful empty result replaces previous data; outages retain marked stale data', async () => {
  let time = 0, outcome: unknown = { firms: [firm(1)], _meta: { complete: true, dataSource: 'live', firmCount: 1 } }, calls = 0;
  const load = createDirectoryLoader({ now: () => time, ttlMs: 5, fetcher: (async () => {
    calls++; if (outcome instanceof Error) throw outcome; return Response.json(outcome);
  }) as typeof fetch });
  const simultaneous = await Promise.all([load(), load(), load()]);
  assert.equal(calls, 1);
  assert.equal(simultaneous[0].status, 'live');
  time = 10; outcome = new Error('network');
  const stale = await load(); assert.equal(stale.status, 'stale'); assert.equal(stale.firms.length, 1);
  assert.equal(queryAccountant(stale, 'new-firm').found, null);
  assert.equal(queryAccountant(stale, 'firm-1').found, true);
  time = 40000; outcome = { firms: [], _meta: { complete: true, dataSource: 'live', firmCount: 0 } };
  const empty = await load(); assert.equal(empty.status, 'live'); assert.equal(empty.firms.length, 0);
  assert.equal(queryAccountant(empty, 'new-firm').found, false);
});
test('unavailable, incomplete, malformed and duplicate data never look like a live empty directory', async () => {
  const cases = [{ firms: [firm(1)], _meta: { complete: false } }, { firms: [firm(1)], _meta: { firmCount: 2 } },
    { firms: [firm(1), firm(1)], _meta: { complete: true, dataSource: 'live', firmCount: 2 } }, { firms: [{}] }, { firms: [] }, { firms: [], _meta: { complete: true, dataSource: 'snapshot', firmCount: 0 } }];
  for (const payload of cases) {
    const load = createDirectoryLoader({ fetcher: (async () => Response.json(payload)) as typeof fetch });
    assert.equal((await load()).status, 'unavailable');
  }
});
test('profile and list rendering escape HTML, reject executable URLs and preserve full details', async () => {
  const f = accountantSchema.parse({ ...firm(1), firm_name: '<script>alert(1)</script>',
    bio_long: '<img src=x onerror=alert(1)>', website: 'javascript:alert(1)', photo_url_absolute: 'javascript:alert(1)' });
  const html = renderAccountant(f);
  assert.ok(!html.includes('<script>alert'));
  assert.ok(!html.includes('href="javascript:'));
  assert.ok(!html.includes('src="javascript:'));
  assert.ok(html.includes('&lt;img'));
  assert.ok(html.includes('Monthly bookkeeping.'));
  const load = createDirectoryLoader({ fetcher: (async () => Response.json({ firms: [f], _meta: { complete: true, dataSource: 'live', firmCount: 1 } })) as typeof fetch });
  const listing = renderAccountants(queryAccountants(await load()), new URLSearchParams({ query: '"><script>alert(1)</script>' }));
  assert.ok(!listing.includes('<script>alert'));
});

test('public provenance never exposes the configured upstream URL', async () => {
  const load = createDirectoryLoader({ url: 'https://internal.example.test/feed?token=private', fetcher: (async () => Response.json({ firms: [], _meta: { complete: true, dataSource: 'live', firmCount: 0 } })) as typeof fetch });
  const result = await load(); assert.equal(result.status, 'live');
  assert.equal(result.source, 'https://hellobooks.ai/api/feed/accountants.json');
});
