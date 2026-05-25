import { test } from 'node:test';
import assert from 'node:assert/strict';

import { listTaxRates } from '../src/tools/listTaxRates.js';
import { lookupTaxRate } from '../src/tools/lookupTaxRate.js';
import { TAX_RATES } from '../src/data/taxRates.js';

// Pin pricing to the baked catalog so the shared test setup stays
// deterministic when these tests are mixed into the suite.
process.env.HELLOBOOKS_MCP_DISABLE_PRICING_FEED = '1';

test('list_tax_rates returns every catalog entry when unfiltered', () => {
  const r = listTaxRates({});
  assert.equal(r.rates.length, TAX_RATES.length);
  assert.equal(r.count, TAX_RATES.length);
  assert.ok(r.disclaimer.includes('confirm'));
});

test('list_tax_rates country=IN returns Indian slabs only', () => {
  const r = listTaxRates({ country: 'IN' });
  assert.ok(r.rates.length >= 5);
  for (const rate of r.rates) assert.equal(rate.country, 'IN');
});

test('list_tax_rates scheme=composition returns Indian composition slabs', () => {
  const r = listTaxRates({ scheme: 'composition' });
  // Trader 1%, Manufacturer 1%, Restaurant 5%.
  assert.equal(r.count, 3);
  for (const rate of r.rates) assert.equal(rate.scheme, 'composition');
});

test('list_tax_rates taxType=VAT covers GB and AE', () => {
  const r = listTaxRates({ taxType: 'VAT' });
  const countries = new Set(r.rates.map((x) => x.country));
  assert.ok(countries.has('GB'));
  assert.ok(countries.has('AE'));
});

test('lookup_tax_rate by exact id returns deterministic match', () => {
  const r = lookupTaxRate({ id: 'IN-standard-18' });
  assert.ok(r.match);
  assert.equal(r.match!.id, 'IN-standard-18');
  assert.equal(r.match!.rate, 18);
});

test('lookup_tax_rate by unknown id returns null with hint', () => {
  const r = lookupTaxRate({ id: 'XX-never-existed' });
  assert.equal(r.match, null);
  assert.ok(r.hint);
});

test('lookup_tax_rate without id or country surfaces validation hint', () => {
  const r = lookupTaxRate({});
  assert.equal(r.match, null);
  assert.ok(r.message!.toLowerCase().includes('required'));
});

test('lookup_tax_rate by country + category picks a plausible slab', () => {
  const r = lookupTaxRate({ country: 'IN', category: 'office supplies' });
  assert.ok(r.match);
  // "office supplies" appears explicitly under IN-standard-18.
  assert.equal(r.match!.id, 'IN-standard-18');
});

test('lookup_tax_rate by country without category returns the country standard slab', () => {
  const r = lookupTaxRate({ country: 'AU' });
  assert.ok(r.match);
  assert.equal(r.match!.country, 'AU');
  assert.equal(r.match!.scheme, 'standard');
});

test('lookup_tax_rate GB exports query selects zero or reduced slab plausibly', () => {
  const r = lookupTaxRate({ country: 'GB', category: 'books' });
  // GB-zero-0 lists "books" — direct hit.
  assert.ok(r.match);
  assert.equal(r.match!.id, 'GB-zero-0');
});

test('every tax rate entry carries an authoritative source URL', () => {
  for (const rate of TAX_RATES) {
    assert.ok(rate.source.startsWith('https://'), `rate ${rate.id} must link an https source`);
    assert.ok(rate.effectiveFrom.match(/^\d{4}-\d{2}-\d{2}$/), `rate ${rate.id} needs ISO effectiveFrom`);
  }
});
