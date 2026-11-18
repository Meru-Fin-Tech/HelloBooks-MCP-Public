import { test } from 'node:test';
import assert from 'node:assert/strict';

import { listTaxRates } from '../src/tools/listTaxRates.js';
import { lookupTaxRate } from '../src/tools/lookupTaxRate.js';
import { TAX_RATES_LAST_REVIEWED } from '../src/data/taxRates.js';

test('TAX_RATES_LAST_REVIEWED is an ISO date', () => {
  assert.match(TAX_RATES_LAST_REVIEWED, /^\d{4}-\d{2}-\d{2}$/);
});

test('list_tax_rates surfaces the last-reviewed stamp', () => {
  const r = listTaxRates({}) as { lastReviewed?: string };
  assert.equal(r.lastReviewed, TAX_RATES_LAST_REVIEWED);
});

test('lookup_tax_rate surfaces the last-reviewed stamp on a match', () => {
  const byId = lookupTaxRate({ id: 'IN-standard-18' }) as { lastReviewed?: string; match?: unknown };
  assert.ok(byId.match);
  assert.equal(byId.lastReviewed, TAX_RATES_LAST_REVIEWED);

  const byCountry = lookupTaxRate({ country: 'IN', category: 'standard' }) as { lastReviewed?: string };
  assert.equal(byCountry.lastReviewed, TAX_RATES_LAST_REVIEWED);
});
