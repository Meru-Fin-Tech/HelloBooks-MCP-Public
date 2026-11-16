import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getApiEntries, listApiCatalog, developerReference, mergeParameters } from '../src/apiCatalog.js';
import { TOOL_CATALOG, generateOpenApi } from '../src/discovery.js';
import { CATALOG_FEEDS } from '../src/catalogFeeds.js';
process.env.HELLOBOOKS_MCP_DISABLE_PRICING_FEED = '1';

test('catalog covers every actual registered MCP tool and every feed', async () => {
  const entries = await getApiEntries();
  assert.deepEqual(entries.filter(e => e.kind === 'mcp').map(e => e.name).sort(), TOOL_CATALOG.map(t => t.name).sort());
  for (const feed of CATALOG_FEEDS) assert.ok(entries.some(e => e.path === `/catalog/${feed.slug}.json`));
  for (const name of ['list_accountants', 'get_accountant', 'list_api_catalog']) {
    assert.ok(entries.some(e => e.name === name && e.details.inputSchema));
  }
});
test('every generated accounting operation can be enumerated without loss', async () => {
  const expected = Object.entries(developerReference.paths).flatMap(([path, item]) =>
    Object.keys(item).filter(k => ['get','post','put','patch','delete','head','options'].includes(k)).map(k => `${k.toUpperCase()} /public/v1${path}`));
  const actual = [];
  let page: number | null = 1;
  while (page !== null) {
    const result = await listApiCatalog({ kind: 'accounting', pageSize: 100, page });
    actual.push(...result.entries.map(e => `${e.method} ${e.path}`)); page = result.nextPage;
  }
  assert.equal(expected.length, 491);
  assert.deepEqual(actual.sort(), expected.sort());
});
test('operation detail has exact portal deep link, authorization alternatives and referenced schemas', async () => {
  const entry = (await getApiEntries()).find(e => e.method === 'POST' && e.path.endsWith('/invoice'))!;
  const result = await listApiCatalog({ id: entry.id });
  const detail = result.entries[0];
  assert.equal(detail.documentation, 'https://developer.hellobooks.ai/docs/reference-sales?resource=invoice&op=2');
  const contract = detail.details as Record<string, unknown>;
  assert.ok(contract.requestBody); assert.ok(contract.responses); assert.ok(contract.components);
  assert.match(String(contract.scopeRule), /alternatives \(OR\)/);
  assert.ok(JSON.stringify(contract.security).includes('sales:write'));
  assert.ok(JSON.stringify(contract.security).includes('book:write'));
});
test('OpenAPI contains new directory and API catalog routes plus every existing data feed', () => {
  const paths = generateOpenApi(CATALOG_FEEDS).paths as Record<string, unknown>;
  for (const path of ['/api/accountants.json', '/api/accountants/{slug}.json', '/api/catalog.json', '/api/developer-reference.json', '/catalog/index.json']) assert.ok(paths[path]);
  for (const feed of CATALOG_FEEDS) assert.ok(paths[`/catalog/${feed.slug}.json`]);
});

test('direct ID lookup returns its contract regardless of list filters or page', async () => {
  const entry = (await getApiEntries())[0];
  const result = await listApiCatalog({ id: entry.id, page: 2, kind: 'accounting', query: 'unrelated' });
  assert.equal(result.entries[0].id, entry.id); assert.equal(result.page, 1); assert.equal(result.total, 1);
});
test('operation parameters override matching path parameters', () => {
  const inherited = { in: 'query', name: 'pageSize', schema: { type: 'integer', maximum: 100 } };
  const override = { in: 'query', name: 'pageSize', schema: { type: 'integer', maximum: 50 } };
  const path = { in: 'path', name: 'pageSize', required: true };
  assert.deepEqual(mergeParameters([inherited,path], [override]), [override,path]);
});
