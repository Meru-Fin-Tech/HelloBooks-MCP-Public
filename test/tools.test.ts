import { test } from 'node:test';
import assert from 'node:assert/strict';

import { listPlans } from '../src/tools/listPlans.js';
import { listIntegrations } from '../src/tools/listIntegrations.js';
import { countrySupport } from '../src/tools/countrySupport.js';
import { complianceCapabilities } from '../src/tools/complianceCapabilities.js';
import { featureSearch } from '../src/tools/featureSearch.js';
import { listArticles } from '../src/tools/listArticles.js';
import { ARTICLES } from '../src/data/articles.js';

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

// ---------------------------------------------------------------------------
// list_articles
// ---------------------------------------------------------------------------

test('list_articles catalog is non-trivial and well-formed', () => {
  assert.ok(ARTICLES.length >= 30, 'expected at least 30 articles in catalog');
  for (const a of ARTICLES) {
    assert.ok(a.id.length > 0, `${a.title}: id must be non-empty`);
    assert.ok(a.title.length > 0, `${a.id}: title must be non-empty`);
    assert.ok(a.excerpt.length > 30, `${a.id}: excerpt must be at least 30 chars`);
    assert.ok(a.excerpt.length <= 320, `${a.id}: excerpt should stay under 320 chars`);
    assert.ok(a.url.startsWith('https://hellobooks.ai/'), `${a.id}: url must be hellobooks.ai`);
    assert.match(a.publishedAt, /^\d{4}-\d{2}-\d{2}$/, `${a.id}: publishedAt must be YYYY-MM-DD`);
    assert.ok(['blog', 'compare', 'guide'].includes(a.kind), `${a.id}: kind invalid`);
    assert.ok(Array.isArray(a.tags) && a.tags.length > 0, `${a.id}: must have at least one tag`);
  }
});

test('list_articles ids are unique', () => {
  const ids = ARTICLES.map((a) => a.id);
  assert.equal(new Set(ids).size, ids.length, 'duplicate ids in catalog');
});

test('list_articles unfiltered returns the full catalog (subject to default limit)', () => {
  const r = listArticles({ limit: 100 });
  assert.equal(r.totalMatches, ARTICLES.length);
  assert.equal(r.catalogSize, ARTICLES.length);
});

test('list_articles country=IN returns India-relevant + global articles', () => {
  const r = listArticles({ country: 'IN', limit: 100 });
  assert.ok(r.totalMatches > 0);
  for (const a of r.articles) {
    const c = a.countryRelevance ?? 'global';
    assert.ok(c === 'IN' || c === 'global', `${a.id}: country ${c} should not match IN filter`);
  }
  // Sanity — at least one IN-specific article exists.
  assert.ok(
    r.articles.some((a) => a.countryRelevance === 'IN'),
    'expected at least one IN article in IN filter results',
  );
});

test('list_articles country=US returns only US + global', () => {
  const r = listArticles({ country: 'US', limit: 100 });
  for (const a of r.articles) {
    const c = a.countryRelevance ?? 'global';
    assert.ok(c === 'US' || c === 'global');
  }
});

test('list_articles country=global returns only global articles', () => {
  const r = listArticles({ country: 'global', limit: 100 });
  for (const a of r.articles) {
    assert.equal(a.countryRelevance ?? 'global', 'global');
  }
});

test('list_articles tag filter matches case-insensitively', () => {
  const r = listArticles({ tag: 'Tally', limit: 100 });
  assert.ok(r.totalMatches > 0);
  for (const a of r.articles) {
    assert.ok(
      a.tags.some((t) => t.toLowerCase().includes('tally')),
      `${a.id}: should have a tally tag`,
    );
  }
});

test('list_articles query matches across title, excerpt, and tags', () => {
  const r = listArticles({ query: 'QuickBooks alternative', limit: 10 });
  assert.ok(r.totalMatches > 0);
});

test('list_articles query is multi-term AND', () => {
  // Both terms must appear; "tally india" should pick Indian Tally posts only.
  const r = listArticles({ query: 'tally india', limit: 100 });
  assert.ok(r.totalMatches > 0);
  for (const a of r.articles) {
    const blob = `${a.title} ${a.excerpt} ${a.tags.join(' ')}`.toLowerCase();
    assert.ok(blob.includes('tally'), `${a.id}: missing "tally"`);
    assert.ok(blob.includes('india') || blob.includes(' in ') || a.tags.includes('in'), `${a.id}: missing india/in`);
  }
});

test('list_articles respects limit', () => {
  const r = listArticles({ limit: 3 });
  assert.equal(r.articles.length, 3);
  assert.equal(r.count, 3);
});

test('list_articles sorts newest first', () => {
  const r = listArticles({ limit: 100 });
  for (let i = 1; i < r.articles.length; i++) {
    assert.ok(
      r.articles[i - 1]!.publishedAt >= r.articles[i]!.publishedAt,
      'articles should be sorted newest-first',
    );
  }
});

test('list_articles includes compare pages alongside blog posts', () => {
  const kinds = new Set(ARTICLES.map((a) => a.kind));
  assert.ok(kinds.has('compare'), 'catalog should include compare pages');
  assert.ok(kinds.has('blog'), 'catalog should include blog posts');
});

test('feature_search surfaces articles in results', () => {
  // A query that should match a compare page or flagship blog.
  const r = featureSearch({ query: 'quickbooks alternative' });
  assert.ok(r.totalMatches > 0, 'expected article hits for QuickBooks alternative query');
  assert.ok(r.results.some((h) => h.source === 'article'));
});
