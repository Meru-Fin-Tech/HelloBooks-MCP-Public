import { test } from 'node:test';
import assert from 'node:assert/strict';

import { supportedCurrencies } from '../src/tools/supportedCurrencies.js';

test('no-args lists billing currencies and currency groups', () => {
  const r = supportedCurrencies({}) as Extract<ReturnType<typeof supportedCurrencies>, { currencies: unknown }>;
  assert.ok(Array.isArray(r.billingCurrencies));
  // The 8 priced regions use these 8 currencies.
  assert.deepEqual(
    [...r.billingCurrencies].sort(),
    ['AED', 'AUD', 'CAD', 'GBP', 'INR', 'NZD', 'SGD', 'USD'].sort(),
  );
  assert.ok(r.currencies.length > 0);
  // EUR appears (several supported hubs) but is NOT a billing currency.
  const eur = r.currencies.find((c) => c.currency === 'EUR');
  if (eur) assert.equal(eur.isBillingCurrency, false);
});

test('a priced country bills in its local currency', () => {
  const r = supportedCurrencies({ country: 'IN' }) as Extract<ReturnType<typeof supportedCurrencies>, { isPricedRegion: boolean }>;
  assert.equal(r.found, true);
  assert.equal(r.booksCurrency, 'INR');
  assert.equal(r.billingCurrency, 'INR');
  assert.equal(r.isPricedRegion, true);
});

test('a supported-but-not-priced country keeps local books, bills USD', () => {
  const r = supportedCurrencies({ country: 'HK' }) as Extract<ReturnType<typeof supportedCurrencies>, { isPricedRegion: boolean }>;
  assert.equal(r.found, true);
  assert.equal(r.booksCurrency, 'HKD');
  assert.equal(r.billingCurrency, 'USD');
  assert.equal(r.isPricedRegion, false);
});

test('every currency group tags each country local vs usd-default', () => {
  const r = supportedCurrencies({}) as Extract<ReturnType<typeof supportedCurrencies>, { currencies: unknown }>;
  for (const g of r.currencies) {
    for (const c of g.countries) {
      assert.ok(['local', 'usd-default'].includes(c.billing));
    }
  }
});
