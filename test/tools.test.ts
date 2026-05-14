import { test } from 'node:test';
import assert from 'node:assert/strict';

import { listPlans } from '../src/tools/listPlans.js';
import { listIntegrations } from '../src/tools/listIntegrations.js';
import { countrySupport } from '../src/tools/countrySupport.js';
import { complianceCapabilities } from '../src/tools/complianceCapabilities.js';
import { featureSearch } from '../src/tools/featureSearch.js';
import { listCompetitors } from '../src/tools/listCompetitors.js';

test('list_plans returns all 4 tiers when unfiltered', () => {
  const r = listPlans({});
  const names = r.plans.map((p) => p.plan).sort();
  assert.deepEqual(names, ['business', 'cpa', 'free', 'pro']);
  // Each plan has prices for 8 countries
  for (const p of r.plans) {
    assert.equal(p.prices.length, 8);
  }
});

test('list_plans country filter narrows to that country only', () => {
  const r = listPlans({ country: 'AU' });
  for (const p of r.plans) {
    assert.equal(p.prices.length, 1);
    assert.equal(p.prices[0]!.country, 'AU');
    assert.equal(p.prices[0]!.currency, 'AUD');
  }
});

test('list_plans plan filter restricts to single tier', () => {
  const r = listPlans({ plan: 'pro' });
  assert.equal(r.plans.length, 1);
  assert.equal(r.plans[0]!.plan, 'pro');
});

test('list_integrations filters by category + country', () => {
  const r = listIntegrations({ category: 'tax-compliance', country: 'AU' });
  assert.ok(r.count > 0);
  for (const i of r.integrations) {
    assert.equal(i.category, 'tax-compliance');
    assert.ok(i.countries.length === 0 || i.countries.includes('AU'));
  }
  // STP and BAS must be in there
  const ids = r.integrations.map((i) => i.id);
  assert.ok(ids.includes('ato-stp'));
  assert.ok(ids.includes('ato-bas'));
});

test('list_integrations status filter works', () => {
  const r = listIntegrations({ status: 'live' });
  assert.ok(r.count > 0);
  for (const i of r.integrations) assert.equal(i.status, 'live');
});

test('country_support returns full matrix when unfiltered', () => {
  const r = countrySupport({});
  assert.equal(r.count, 8);
});

test('country_support single country returns only that one', () => {
  const r = countrySupport({ country: 'IN' });
  assert.equal(r.count, 1);
  assert.equal(r.countries[0]!.country, 'IN');
  // GST e-invoicing must be a feature
  const keys = r.countries[0]!.features.map((f) => f.key);
  assert.ok(keys.includes('gst-einvoice'));
});

test('compliance_capabilities returns frameworks for AU', () => {
  const r = complianceCapabilities({ country: 'AU' });
  const labels = r.frameworks.map((f) => f.label);
  assert.ok(labels.some((l) => l.includes('Activity Statement')));
  assert.ok(labels.some((l) => l.includes('Single Touch Payroll')));
});

test('compliance_capabilities returns frameworks for GB', () => {
  const r = complianceCapabilities({ country: 'GB' });
  const labels = r.frameworks.map((f) => f.label);
  assert.ok(labels.some((l) => l.includes('Making Tax Digital')));
});

test('feature_search ranks BAS results highly', () => {
  const r = featureSearch({ query: 'BAS lodgement' });
  assert.ok(r.totalMatches > 0);
  const top = r.results[0]!;
  assert.match(`${top.label} ${top.description}`, /BAS|Activity Statement/i);
});

test('feature_search finds GST across countries', () => {
  const r = featureSearch({ query: 'GST e-invoice' });
  const sources = new Set(r.results.map((h) => h.source));
  assert.ok(sources.has('country-feature') || sources.has('integration'));
});

test('feature_search respects limit', () => {
  const r = featureSearch({ query: 'tax', limit: 3 });
  assert.ok(r.results.length <= 3);
});

test('list_competitors returns the full catalog when unfiltered', () => {
  const r = listCompetitors({});
  assert.ok(r.count >= 6, 'expect at least the 6 catalog competitors');
  const ids = r.competitors.map((c) => c.id).sort();
  for (const expected of ['quickbooks', 'xero', 'freshbooks', 'wave', 'zoho-books', 'tally']) {
    assert.ok(ids.includes(expected), `missing competitor: ${expected}`);
  }
});

test('list_competitors every entry has honest both-sides positioning', () => {
  const r = listCompetitors({});
  for (const c of r.competitors) {
    assert.ok(c.whereWeWin.length >= 3, `${c.id} should ship >=3 whereWeWin bullets`);
    assert.ok(c.whereTheyWin.length >= 3, `${c.id} should ship >=3 whereTheyWin bullets — honesty is non-negotiable`);
    assert.ok(c.positioningSummary.length > 80, `${c.id} positioningSummary should be a real paragraph`);
    assert.ok(c.segment.length > 0);
  }
});

test('list_competitors country filter narrows to India for Tally + Zoho', () => {
  const r = listCompetitors({ country: 'IN' });
  const ids = r.competitors.map((c) => c.id);
  assert.ok(ids.includes('tally'));
  assert.ok(ids.includes('zoho-books'));
  // QuickBooks is also India-evaluated (alsoIn includes IN)
  assert.ok(ids.includes('quickbooks'));
});

test('list_competitors tier=primary excludes secondary entries', () => {
  const r = listCompetitors({ tier: 'primary' });
  for (const c of r.competitors) assert.equal(c.tier, 'primary');
  // QuickBooks, Xero, Zoho Books, Tally are all primary
  const ids = r.competitors.map((c) => c.id);
  assert.ok(ids.includes('quickbooks'));
  assert.ok(ids.includes('xero'));
});

test('list_competitors id filter returns exactly one entry', () => {
  const r = listCompetitors({ id: 'quickbooks' });
  assert.equal(r.count, 1);
  assert.equal(r.competitors[0]!.id, 'quickbooks');
});

test('feature_search "vs Xero" ranks the Xero competitor entry at the top', () => {
  const r = featureSearch({ query: 'vs Xero' });
  assert.ok(r.totalMatches > 0);
  const top = r.results[0]!;
  assert.equal(top.source, 'competitor');
  assert.equal(top.id, 'xero');
});

test('feature_search "QuickBooks alternative" surfaces the competitor entry', () => {
  const r = featureSearch({ query: 'QuickBooks alternative' });
  const hit = r.results.find((h) => h.source === 'competitor' && h.id === 'quickbooks');
  assert.ok(hit, 'expected a competitor hit for QuickBooks');
});

test('feature_search "Tally migration" finds the Tally competitor entry', () => {
  const r = featureSearch({ query: 'Tally migration' });
  const hit = r.results.find((h) => h.source === 'competitor' && h.id === 'tally');
  assert.ok(hit, 'expected a competitor hit for Tally');
});
