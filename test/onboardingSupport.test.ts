import { test } from 'node:test';
import assert from 'node:assert/strict';

import { onboardingSupport } from '../src/tools/onboardingSupportInfo.js';

test('India returns the published hourly offer', () => {
  const r = onboardingSupport({ country: 'IN' });
  assert.equal(r.hasHourlyOffer, true);
  assert.equal(r.offer?.price, 5000);
  assert.equal(r.offer?.currency, 'INR');
  assert.equal(r.offer?.hours, 10);
  assert.ok(r.migrationService, 'IN has a migration note');
});

test('US returns the published hourly offer', () => {
  const r = onboardingSupport({ country: 'US' });
  assert.equal(r.hasHourlyOffer, true);
  assert.equal(r.offer?.price, 300);
  assert.equal(r.offer?.currency, 'USD');
});

test('a country without an offer must NOT fabricate one', () => {
  const r = onboardingSupport({ country: 'SG' });
  assert.equal(r.hasHourlyOffer, false);
  assert.equal(r.offer, null);
  assert.match(r.note, /do not invent|NO published/i);
  // Included support is still reported.
  assert.ok(r.includedSupport.length > 0);
});

test('no-args lists only the published (IN, US) offers', () => {
  const r = onboardingSupport({});
  assert.equal(r.country, 'all');
  assert.ok(Array.isArray(r.allOffers));
  const countries = new Set(r.allOffers!.map((o) => o.country));
  assert.deepEqual([...countries].sort(), ['IN', 'US']);
});
