import { test } from 'node:test';
import assert from 'node:assert/strict';

import { checkIntegration } from '../src/tools/checkIntegration.js';
import { INTEGRATIONS } from '../src/data/integrations.js';

test('exact name match returns supported with status', () => {
  const r = checkIntegration({ name: 'Stripe' });
  assert.equal(r.supported, true);
  assert.equal(r.match?.id, 'stripe');
  assert.equal(r.status, r.match?.status);
  assert.match(r.note, /Stripe/);
});

test('exact id match is case-insensitive', () => {
  const r = checkIntegration({ name: 'RAZORPAY' });
  assert.equal(r.match?.id, 'razorpay');
  assert.equal(r.supported, true);
});

test('substring query resolves to the right integration (QuickBooks)', () => {
  const r = checkIntegration({ name: 'quickbooks online' });
  assert.equal(r.match?.id, 'quickbooks');
});

test('unknown provider returns not-supported with suggestions and no match', () => {
  const r = checkIntegration({ name: 'Monzo Bank' });
  assert.equal(r.supported, false);
  assert.equal(r.match, null);
  assert.equal(r.status, null);
  assert.ok(Array.isArray(r.suggestions));
  // "bank" should surface banking-ish suggestions; never throw.
  assert.ok(r.suggestions.length <= 5);
});

test('a coming-soon integration is reported as such, not a flat yes', () => {
  const comingSoon = INTEGRATIONS.find((i) => i.status === 'coming-soon');
  assert.ok(comingSoon, 'fixture expects at least one coming-soon integration');
  const r = checkIntegration({ name: comingSoon!.name });
  assert.equal(r.status, 'coming-soon');
  assert.match(r.note, /coming soon|coming-soon/i);
});

test('every catalog entry is findable by its own name', () => {
  for (const i of INTEGRATIONS) {
    const r = checkIntegration({ name: i.name });
    assert.ok(r.match, `"${i.name}" should match itself`);
    assert.equal(r.match?.id, i.id, `"${i.name}" should resolve to ${i.id}`);
  }
});

test('result shape is stable', () => {
  const r = checkIntegration({ name: 'Plaid' });
  assert.deepEqual(
    Object.keys(r).sort(),
    ['match', 'note', 'query', 'status', 'suggestions', 'supported'],
  );
});
