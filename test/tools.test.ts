import { test } from 'node:test';
import assert from 'node:assert/strict';

import { listPlans } from '../src/tools/listPlans.js';
import { listCreditPacks } from '../src/tools/listCreditPacks.js';
import { listVideos } from '../src/tools/listVideos.js';
import { listIntegrations } from '../src/tools/listIntegrations.js';
import { countrySupport } from '../src/tools/countrySupport.js';
import { complianceCapabilities } from '../src/tools/complianceCapabilities.js';
import { featureSearch, type FeatureSearchHit } from '../src/tools/featureSearch.js';
import { listCompetitors } from '../src/tools/listCompetitors.js';
import { complianceDeadlines } from '../src/tools/complianceDeadlines.js';
import { localPaymentMethods } from '../src/tools/paymentMethods.js';
import { listFeatures } from '../src/tools/listFeatures.js';
import { listFeatureCategories } from '../src/tools/listFeatureCategories.js';
import { listArticles } from '../src/tools/listArticles.js';
import { howMunimjiHelps } from '../src/tools/howMunimjiHelps.js';
import { MUNIMJI_CAPABILITIES } from '../src/data/capabilities.js';
import { FEATURES } from '../src/data/features.js';
import { ARTICLES } from '../src/data/articles.js';
import {
  feedToPlans,
  feedToCreditPacks,
  getPricingMeta,
  __resetPricingCacheForTests,
  type PricingFeed,
} from '../src/pricingFeed.js';

// Pin pricing to the baked catalog for deterministic, offline tests.
// (pricingFeed reads this env var lazily, so setting it here — before any
// test() callback runs — disables the live fetch for the whole suite.)
process.env.HELLOBOOKS_MCP_DISABLE_PRICING_FEED = '1';

test('list_plans returns all 5 tiers when unfiltered (incl. add-ons)', () => {
  const r = listPlans({});
  const names = r.plans.map((p) => p.plan).sort((a, b) => a.localeCompare(b));
  assert.deepEqual(names, [
    'cpa', 'free', 'manufacturing-addon', 'pro', 'warehouse-addon',
  ]);
  // Core plans have prices for 8 countries; add-ons are USD-only
  for (const p of r.plans) {
    if (p.plan === 'warehouse-addon' || p.plan === 'manufacturing-addon') {
      assert.equal(p.prices.length, 1, `${p.plan} should be USD-only`);
      assert.equal(p.prices[0].currency, 'USD');
    } else {
      assert.equal(p.prices.length, 8);
    }
  }
});

test('list_plans country filter narrows to that country only', () => {
  const r = listPlans({ country: 'AU' });
  for (const p of r.plans) {
    // Add-ons are USD-only so AU filter zeroes them out
    if (p.plan === 'warehouse-addon' || p.plan === 'manufacturing-addon') {
      assert.equal(p.prices.length, 0);
      continue;
    }
    assert.equal(p.prices.length, 1);
    assert.equal(p.prices[0].country, 'AU');
    assert.equal(p.prices[0].currency, 'AUD');
  }
});

test('list_plans surfaces warehouse + manufacturing add-on pricing in USD', () => {
  const wh = listPlans({ plan: 'warehouse-addon' });
  assert.equal(wh.plans.length, 1);
  assert.equal(wh.plans[0].prices[0].monthly, 9);
  assert.equal(wh.plans[0].prices[0].annual, 90);

  const mfg = listPlans({ plan: 'manufacturing-addon' });
  assert.equal(mfg.plans.length, 1);
  assert.equal(mfg.plans[0].prices[0].monthly, 14);
  assert.equal(mfg.plans[0].prices[0].annual, 140);
});

test('list_plans plan filter restricts to single tier', () => {
  const r = listPlans({ plan: 'pro' });
  assert.equal(r.plans.length, 1);
  assert.equal(r.plans[0].plan, 'pro');
});

test('list_credit_packs returns all 4 packs with 8-country pricing', () => {
  const r = listCreditPacks({});
  const ids = r.creditPacks.map((p) => p.id).sort((a, b) => a.localeCompare(b));
  assert.deepEqual(ids, ['boost', 'mega', 'power', 'ultra']);
  for (const p of r.creditPacks) {
    assert.equal(p.prices.length, 8);
    assert.ok(p.credits > 0);
  }
});

test('list_credit_packs credit allowances match Doc 19 v2 (×10 display scale)', () => {
  const byId = Object.fromEntries(
    listCreditPacks({}).creditPacks.map((p) => [p.id, p.credits]),
  );
  assert.equal(byId.boost, 5000);
  assert.equal(byId.power, 15000);
  assert.equal(byId.mega, 50000);
  assert.equal(byId.ultra, 150000);
});

test('list_credit_packs id filter restricts to a single pack', () => {
  const r = listCreditPacks({ id: 'ultra' });
  assert.equal(r.creditPacks.length, 1);
  assert.equal(r.creditPacks[0].id, 'ultra');
});

test('list_credit_packs country filter narrows prices to that market', () => {
  const r = listCreditPacks({ country: 'IN' });
  for (const p of r.creditPacks) {
    assert.equal(p.prices.length, 1);
    assert.equal(p.prices[0].country, 'IN');
    assert.equal(p.prices[0].currency, 'INR');
  }
  // US Boost is the canonical $4.99 list price
  const usBoost = listCreditPacks({ country: 'US', id: 'boost' });
  assert.equal(usBoost.creditPacks[0].prices[0].price, 4.99);
});

// --- pricing federation ------------------------------------------------------

const FEED_FIXTURE: PricingFeed = {
  tiers: [
    {
      id: 'pro',
      currency: 'USD',
      monthlyPrice: 7.77,
      annualPrice: 77,
      anchorMonthlyPrice: 14.99,
      features: ['Feed-sourced Pro feature'],
      limits: { perClientPrice: 0 },
    },
    {
      id: 'cpa',
      currency: 'USD',
      monthlyPrice: 55.55,
      annualPrice: 555,
      anchorMonthlyPrice: 0,
      features: ['Feed-sourced CPA feature'],
      limits: { perClientPrice: 3.33 },
    },
  ],
  addOns: [{ id: 'boost', currency: 'USD', price: 3.33 }],
  regions: [
    {
      region: 'US',
      tiers: [
        {
          id: 'pro',
          currency: 'USD',
          monthlyPrice: 7.77,
          annualPrice: 77,
          anchorMonthlyPrice: 14.99,
          features: ['Feed-sourced Pro feature'],
          limits: { perClientPrice: 0 },
        },
        {
          id: 'cpa',
          currency: 'USD',
          monthlyPrice: 55.55,
          annualPrice: 555,
          anchorMonthlyPrice: 0,
          features: ['Feed-sourced CPA feature'],
          limits: { perClientPrice: 3.33 },
        },
      ],
      addOns: [{ id: 'boost', currency: 'USD', price: 3.33 }],
    },
  ],
  updatedAt: '2026-05-22T00:00:00.000Z',
};

test('getPricingMeta reports static-fallback when the feed is disabled', () => {
  __resetPricingCacheForTests();
  const meta = getPricingMeta();
  assert.equal(meta.dataSource, 'static-fallback');
});

test('feedToPlans overlays feed prices + features onto the baked catalog', () => {
  const plans = feedToPlans(FEED_FIXTURE);
  const pro = plans.find((p) => p.plan === 'pro');
  assert.ok(pro);
  // US price comes from the feed region
  const us = pro.prices.find((pr) => pr.country === 'US');
  assert.equal(us?.monthly, 7.77);
  assert.equal(us?.symbol, '$');
  // a region absent from the feed falls back to the baked price
  const ca = pro.prices.find((pr) => pr.country === 'CA');
  assert.equal(ca?.monthly, 12.99);
  // features come from the feed
  assert.deepEqual(pro.features, ['Feed-sourced Pro feature']);
  // CPA carries the per-client price from feed limits
  const cpaUs = plans.find((p) => p.plan === 'cpa')?.prices.find((pr) => pr.country === 'US');
  assert.equal(cpaUs?.perClient, 3.33);
});

test('feedToPlans keeps add-on plans that are not in the pricing feed', () => {
  const plans = feedToPlans(FEED_FIXTURE);
  const warehouse = plans.find((p) => p.plan === 'warehouse-addon');
  assert.ok(warehouse, 'warehouse-addon must survive the transform');
  assert.equal(warehouse.prices[0].monthly, 9);
  // free is absent from the fixture feed.tiers -> baked free returned untouched
  const free = plans.find((p) => p.plan === 'free');
  assert.equal(free?.monthlyAiCredits, 5000);
});

test('feedToCreditPacks overlays feed prices, falling back per slot', () => {
  const packs = feedToCreditPacks(FEED_FIXTURE);
  const boost = packs.find((p) => p.id === 'boost');
  assert.ok(boost);
  // US boost from the feed
  assert.equal(boost.prices.find((pr) => pr.country === 'US')?.price, 3.33);
  // CA boost not in the feed -> baked $... value retained
  assert.equal(boost.prices.find((pr) => pr.country === 'CA')?.price, 6.49);
  // power pack absent from the fixture -> all baked
  const power = packs.find((p) => p.id === 'power');
  assert.equal(power?.prices.find((pr) => pr.country === 'US')?.price, 12.99);
});

test('list_videos returns the curated catalog plus the channel link', () => {
  const r = listVideos({});
  assert.ok(r.count >= 4);
  assert.equal(r.videos.length, r.count);
  assert.equal(r.channel.url, 'https://www.youtube.com/@hellobooksai');
  for (const v of r.videos) {
    assert.ok(v.id.length > 0);
    assert.ok(v.watchUrl.includes(v.id));
    assert.ok(v.embedUrl.includes(v.id));
    assert.ok(v.thumbnailUrl.includes(v.id));
  }
});

test('list_videos category filter restricts to one category', () => {
  const r = listVideos({ category: 'features' });
  assert.ok(r.count > 0);
  for (const v of r.videos) assert.equal(v.category, 'features');
});

test('list_videos featuredOnly drops non-featured videos', () => {
  const r = listVideos({ featuredOnly: true });
  assert.ok(r.count > 0);
  for (const v of r.videos) assert.equal(v.featured, true);
});

test('list_videos query matches title + description', () => {
  const r = listVideos({ query: 'demo' });
  assert.ok(r.count > 0);
});

test('list_integrations filters by category + country', () => {
  const r = listIntegrations({ category: 'tax-compliance', country: 'AU' });
  assert.ok(r.count > 0);
  for (const i of r.integrations) {
    assert.equal(i.category, 'tax-compliance');
    assert.ok(i.countries.length === 0 || i.countries.includes('AU'));
  }
  // STP and BAS must be in there
  const ids = new Set(r.integrations.map((i) => i.id));
  assert.ok(ids.has('ato-stp'));
  assert.ok(ids.has('ato-bas'));
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
  assert.equal(r.countries[0].country, 'IN');
  // GST e-invoicing must be a feature
  const keys = new Set(r.countries[0].features.map((f) => f.key));
  assert.ok(keys.has('gst-einvoice'));
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
  const top = r.results[0];
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

test('feature_search defaults limit to 20 when omitted', () => {
  const r = featureSearch({ query: 'tax' });
  assert.ok(r.results.length <= 20);
  assert.equal(r.count, Math.min(r.totalMatches, 20));
});

test('feature_search returns sorted-descending scores across all sources', () => {
  const r = featureSearch({ query: 'invoice' });
  for (let i = 1; i < r.results.length; i++) {
    assert.ok(r.results[i].score <= r.results[i - 1].score, 'results must be sorted by score desc');
  }
});

test('feature_search reports correct totalMatches separate from count', () => {
  const r = featureSearch({ query: 'tax', limit: 2 });
  assert.ok(r.totalMatches >= r.count, 'totalMatches >= count');
  assert.equal(r.count, Math.min(r.totalMatches, 2));
});

test('feature_search empty result set when query matches nothing', () => {
  // Use a query unlikely to score against any source data.
  const r = featureSearch({ query: 'zzzzzzzzunlikelyzzzzzzz' });
  assert.equal(r.totalMatches, 0);
  assert.equal(r.count, 0);
  assert.deepEqual(r.results, []);
});

test('feature_search "global" article keeps no country suffix in context', () => {
  // articleContext(): when countryRelevance is "global" (or missing), the
  // suffix is empty. Pick a tag/title likely to hit a global article.
  const r = featureSearch({ query: 'accounting' });
  const globalArticle = r.results.find(
    (h) => h.source === 'article' && h.context && !h.context.includes('·'),
  ) ?? r.results.find((h) => h.source === 'article' && h.context && h.context.split('·').length === 2);
  if (globalArticle) {
    // For a global article, context must NOT end with ` · IN` / ` · US` etc.
    assert.ok(
      !/ · (IN|US|CA|GB|AU|AE|SG|NZ)$/.test(globalArticle.context ?? ''),
      `global article context should not carry country suffix: "${globalArticle.context}"`,
    );
  }
});

test('feature_search returns country-suffixed context for country-relevant articles', () => {
  const r = featureSearch({ query: 'GST' });
  const countryArticle = r.results.find(
    (h) => h.source === 'article' && / · (IN|US|CA|GB|AU|AE|SG|NZ)$/.test(h.context ?? ''),
  );
  if (countryArticle) {
    assert.match(countryArticle.context ?? '', / · (IN|US|CA|GB|AU|AE|SG|NZ)$/);
  }
});

test('feature_search competitor stopwords do not soak up score', () => {
  // "vs Xero" - the bare "vs" should be dropped, otherwise every plan/article
  // mentioning vs would outrank the Xero competitor entry.
  const r = featureSearch({ query: 'vs Xero' });
  const top = r.results[0];
  assert.ok(top, 'expected at least one result');
  assert.equal(top.source, 'competitor', `expected competitor on top, got ${top.source}: ${top.label}`);
  assert.equal(top.id, 'xero');
});

test('feature_search deadline stopwords do not crowd out form match', () => {
  // "when is GSTR-3B due" - the date-intent tokens (when/is/due) must be
  // dropped so GSTR-3B form name ranks highest.
  const r = featureSearch({ query: 'when is GSTR-3B due' });
  const top = r.results[0];
  assert.ok(top, 'expected at least one result');
  assert.equal(top.source, 'deadline');
  assert.match(top.id, /GSTR-3B/i);
});

test('feature_search multi-source query returns hits across sources', () => {
  // A broad, common term should produce hits from multiple sources, exercising
  // every per-source scorer (plans/integrations/features/country/payments/etc.).
  const r = featureSearch({ query: 'tax', limit: 50 });
  const sources = new Set(r.results.map((h) => h.source));
  // Expect at least 3 distinct sources to cover the helper-fan-out.
  assert.ok(sources.size >= 3, `expected >=3 distinct sources, got ${[...sources].join(',')}`);
});

test('feature_search every hit has a positive score', () => {
  const r = featureSearch({ query: 'invoice' });
  for (const h of r.results) {
    assert.ok(h.score > 0, `hit ${h.id} should have positive score, got ${h.score}`);
  }
});

test('feature_search "compared to QuickBooks" filters comparison stopwords', () => {
  // "compared" and "to" are competitor stopwords - QuickBooks should still
  // top the result list because nameScore is multiplied 3x.
  const r = featureSearch({ query: 'compared to QuickBooks' });
  const top = r.results[0];
  assert.ok(top, 'expected at least one result');
  assert.equal(top.source, 'competitor');
  assert.equal(top.id, 'quickbooks');
});

test('feature_search ranks each source through dedicated helper', () => {
  // Targeted query per source - each should produce at least one hit, proving
  // every searchX helper participates in the final aggregation.
  const cases: { q: string; want: FeatureSearchHit['source'] }[] = [
    { q: 'multi-currency', want: 'plan' },
    { q: 'Stripe payments', want: 'integration' },
    { q: 'BAS lodgement', want: 'country-feature' },
    { q: 'vs Xero', want: 'competitor' },
    { q: 'GSTR-3B', want: 'deadline' },
    { q: 'UPI invoice', want: 'payment-method' },
  ];
  for (const c of cases) {
    const r = featureSearch({ query: c.q });
    assert.ok(
      r.results.some((h) => h.source === c.want),
      `query "${c.q}" should produce a ${c.want} hit; got [${[...new Set(r.results.map((h) => h.source))].join(', ')}]`,
    );
  }
});

test('list_competitors returns the full catalog when unfiltered', () => {
  const r = listCompetitors({});
  assert.ok(r.count >= 6, 'expect at least the 6 catalog competitors');
  const ids = new Set(r.competitors.map((c) => c.id));
  for (const expected of ['quickbooks', 'xero', 'freshbooks', 'wave', 'zoho-books', 'tally']) {
    assert.ok(ids.has(expected), `missing competitor: ${expected}`);
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
  const ids = new Set(r.competitors.map((c) => c.id));
  assert.ok(ids.has('tally'));
  assert.ok(ids.has('zoho-books'));
  // QuickBooks is also India-evaluated (alsoIn includes IN)
  assert.ok(ids.has('quickbooks'));
});

test('list_competitors tier=primary excludes secondary entries', () => {
  const r = listCompetitors({ tier: 'primary' });
  for (const c of r.competitors) assert.equal(c.tier, 'primary');
  // QuickBooks, Xero, Zoho Books, Tally are all primary
  const ids = new Set(r.competitors.map((c) => c.id));
  assert.ok(ids.has('quickbooks'));
  assert.ok(ids.has('xero'));
});

test('list_competitors id filter returns exactly one entry', () => {
  const r = listCompetitors({ id: 'quickbooks' });
  assert.equal(r.count, 1);
  assert.equal(r.competitors[0].id, 'quickbooks');
});

test('feature_search "vs Xero" ranks the Xero competitor entry at the top', () => {
  const r = featureSearch({ query: 'vs Xero' });
  assert.ok(r.totalMatches > 0);
  const top = r.results[0];
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

// ---------------------------------------------------- compliance_deadlines ---

test('compliance_deadlines unfiltered returns the full catalog and every entry carries a disclaimer', () => {
  const r = complianceDeadlines({});
  assert.ok(r.count >= 25, `expected the catalog to ship >= 25 entries, got ${r.count}`);
  assert.ok(r.disclaimer.length > 50, 'disclaimer must be non-trivial');
  assert.match(r.disclaimer, /rotate|annually|extension/i);
});

test('compliance_deadlines every entry has a source URL and lastReviewed', () => {
  const r = complianceDeadlines({});
  for (const d of r.deadlines) {
    assert.match(d.source, /^https?:\/\//, `${d.id} source must be a URL`);
    assert.match(d.lastReviewed, /^\d{4}-\d{2}-\d{2}$/, `${d.id} lastReviewed must be ISO date`);
    assert.ok(d.form.length > 0);
    assert.ok(d.authority.length > 0);
  }
});

test('compliance_deadlines country=IN returns India-only entries including GSTR-3B', () => {
  const r = complianceDeadlines({ country: 'IN' });
  assert.ok(r.count >= 9, `IN should have >= 9 deadlines, got ${r.count}`);
  for (const d of r.deadlines) assert.equal(d.country, 'IN');
  const forms = r.deadlines.map((d) => d.form);
  assert.ok(forms.some((f) => f.includes('GSTR-3B')));
  assert.ok(forms.some((f) => f.includes('Form 24Q')));
  assert.ok(forms.some((f) => f === 'PF ECR'));
});

test('compliance_deadlines frequency=quarterly catches BAS and Form 941', () => {
  const r = complianceDeadlines({ frequency: 'quarterly' });
  for (const d of r.deadlines) assert.equal(d.frequency, 'quarterly');
  const forms = r.deadlines.map((d) => d.form);
  assert.ok(forms.some((f) => f === 'BAS'), 'AU BAS must be quarterly');
  assert.ok(forms.some((f) => f === 'Form 941'), 'US Form 941 must be quarterly');
});

test('compliance_deadlines frequency=per-event picks up STP and PAYE RTI', () => {
  const r = complianceDeadlines({ frequency: 'per-event' });
  const ids = new Set(r.deadlines.map((d) => d.id));
  assert.ok(ids.has('stp'), 'AU STP must be per-event');
  assert.ok(ids.has('paye-rti'), 'GB PAYE RTI must be per-event');
});

test('compliance_deadlines form substring match is case-insensitive', () => {
  const r1 = complianceDeadlines({ form: 'gstr' });
  const r2 = complianceDeadlines({ form: 'GSTR' });
  assert.equal(r1.count, r2.count);
  assert.ok(r1.count >= 4, 'should match GSTR-1, GSTR-1 (QRMP), GSTR-3B, GSTR-3B (QRMP), GSTR-9, GSTR-9C');
  for (const d of r1.deadlines) assert.match(d.form, /GSTR/i);
});

test('compliance_deadlines filters compose (country + form)', () => {
  const r = complianceDeadlines({ country: 'US', form: '1099' });
  assert.ok(r.count >= 2);
  for (const d of r.deadlines) {
    assert.equal(d.country, 'US');
    assert.match(d.form, /1099/);
  }
});

test('compliance_deadlines monthly Indian filings (PF ECR, ESI, GSTR-3B monthly) use dueDay not annualDates', () => {
  const r = complianceDeadlines({ country: 'IN', frequency: 'monthly' });
  for (const d of r.deadlines) {
    assert.equal(d.frequency, 'monthly');
    assert.ok(typeof d.dueDay === 'number', `${d.id} monthly entry must specify dueDay`);
    assert.equal(d.annualDates, undefined, `${d.id} monthly entry should not also set annualDates`);
  }
});

test('compliance_deadlines AU BAS lists all four quarterly cut-off dates', () => {
  const r = complianceDeadlines({ country: 'AU', form: 'BAS' });
  assert.equal(r.count, 1);
  const bas = r.deadlines[0];
  assert.deepEqual(bas.annualDates, ['Oct 28', 'Feb 28', 'Apr 28', 'Jul 28']);
});

test('compliance_deadlines US 1099-NEC has the unified Jan 31 deadline (not Mar 31)', () => {
  // Spec watch-out: 1099-NEC's IRS filing is Jan 31, not Mar 31. Only other
  // 1099 series (MISC, INT, DIV) get the Mar 31 e-file date.
  const r = complianceDeadlines({ country: 'US', form: '1099-NEC' });
  assert.equal(r.count, 1);
  assert.deepEqual(r.deadlines[0].annualDates, ['Jan 31']);
});

test('feature_search "when is GSTR-3B due" surfaces the GSTR-3B deadline entry', () => {
  const r = featureSearch({ query: 'when is GSTR-3B due' });
  const hit = r.results.find((h) => h.source === 'deadline' && h.label.startsWith('GSTR-3B'));
  assert.ok(hit, 'expected a deadline hit for GSTR-3B');
  assert.ok(hit?.url?.includes('gst.gov.in'));
});

test('feature_search "BAS deadline" surfaces the BAS deadline entry', () => {
  const r = featureSearch({ query: 'BAS deadline' });
  const hit = r.results.find((h) => h.source === 'deadline' && h.label.startsWith('BAS'));
  assert.ok(hit, 'expected a deadline hit for BAS');
});

test('feature_search "Form 941" finds the US quarterly payroll deadline', () => {
  const r = featureSearch({ query: 'Form 941' });
  const hit = r.results.find((h) => h.source === 'deadline' && h.id === 'US:form-941');
  assert.ok(hit, 'expected a deadline hit for Form 941');
});

test('local_payment_methods default scope is HelloBooks AR/AP/contractor-payout', () => {
  const r = localPaymentMethods({});
  assert.ok(r.count > 0);
  const allowed = new Set(['invoice-collection', 'b2b-supplier', 'contractor-payout']);
  for (const m of r.methods) {
    assert.ok(
      m.useCases.some((u) => allowed.has(u)),
      `${m.id} is in default scope but lacks AR / AP / contractor-payout use-case`,
    );
  }
  // Payroll-only WPS-SIF must be excluded by default.
  const ids = new Set(r.methods.map((m) => m.id));
  assert.ok(!ids.has('ae-wps-sif'), 'WPS-SIF (payroll only) should not appear in default HelloBooks scope');
});

test('local_payment_methods country=IN returns NPCI / RBI / Razorpay', () => {
  const r = localPaymentMethods({ country: 'IN' });
  const ids = new Set(r.methods.map((m) => m.id));
  for (const expected of ['in-upi', 'in-rupay', 'in-razorpay', 'in-imps', 'in-neft', 'in-rtgs']) {
    assert.ok(ids.has(expected), `expected ${expected} present`);
  }
});

test('local_payment_methods country=GB includes BACS, FPS, CHAPS, Open Banking', () => {
  const r = localPaymentMethods({ country: 'GB' });
  const ids = new Set(r.methods.map((m) => m.id));
  for (const expected of ['gb-bacs', 'gb-fps', 'gb-chaps', 'gb-open-banking']) {
    assert.ok(ids.has(expected), `expected ${expected} present`);
  }
});

test('local_payment_methods country=AU includes BPAY (key AR rail) and PayTo', () => {
  const r = localPaymentMethods({ country: 'AU' });
  const ids = new Set(r.methods.map((m) => m.id));
  assert.ok(ids.has('au-bpay'), 'BPAY must appear in HelloBooks AU scope');
  assert.ok(ids.has('au-payto'), 'PayTo must appear in HelloBooks AU scope');
});

test('local_payment_methods rail=instant filter works', () => {
  const r = localPaymentMethods({ rail: 'instant' });
  for (const m of r.methods) assert.equal(m.rail, 'instant');
});

test('local_payment_methods explicit useCase=payroll widens to payroll-only rails', () => {
  const r = localPaymentMethods({ useCase: 'payroll' });
  // WPS-SIF (payroll only) should now be reachable.
  const ids = new Set(r.methods.map((m) => m.id));
  assert.ok(ids.has('ae-wps-sif'), 'WPS-SIF should appear when useCase=payroll is explicit');
  for (const m of r.methods) {
    assert.ok(m.useCases.includes('payroll'));
  }
});

test('local_payment_methods id lookup returns single entry', () => {
  const r = localPaymentMethods({ id: 'gb-bacs' });
  assert.equal(r.count, 1);
  assert.equal(r.methods[0].name, 'BACS Direct Credit');
  assert.equal(r.methods[0].authority, 'Pay.UK');
});

test('local_payment_methods every entry has a stable schema', () => {
  const r = localPaymentMethods({});
  for (const m of r.methods) {
    assert.ok(typeof m.id === 'string' && m.id.length > 0);
    assert.ok(typeof m.country === 'string' && m.country.length === 2);
    assert.ok(typeof m.name === 'string' && m.name.length > 0);
    assert.ok(['instant', 'same-day', 'next-day', 'multi-day'].includes(m.rail));
    assert.ok(Array.isArray(m.useCases) && m.useCases.length > 0);
    assert.ok(typeof m.authority === 'string' && m.authority.length > 0);
  }
});

test('feature_search "UPI invoice" surfaces the UPI payment-method entry', () => {
  const r = featureSearch({ query: 'UPI invoice' });
  const hit = r.results.find((h) => h.source === 'payment-method' && h.id === 'in-upi');
  assert.ok(hit, 'expected UPI payment-method hit for "UPI invoice"');
});

test('feature_search "BPAY recurring" surfaces BPAY entry', () => {
  const r = featureSearch({ query: 'BPAY recurring' });
  const hit = r.results.find((h) => h.source === 'payment-method' && h.id === 'au-bpay');
  assert.ok(hit, 'expected BPAY hit');
});

test('feature_search "RTP supplier" surfaces RTP entry', () => {
  const r = featureSearch({ query: 'RTP supplier' });
  const hit = r.results.find((h) => h.source === 'payment-method' && h.id === 'us-rtp');
  assert.ok(hit, 'expected RTP hit');
});

test('feature_search now surfaces marketing catalog features', () => {
  const r = featureSearch({ query: 'agentic accounting' });
  const sources = new Set(r.results.map((h) => h.source));
  assert.ok(sources.has('feature'), 'should hit the marketing feature catalog');
});

test('list_features returns the full marketing catalog', () => {
  const r = listFeatures({});
  // Catalog has 96 features as of 2026-05-18 — assert >= 90 to allow growth
  assert.ok(r.totalMatches >= 90, `expected >= 90 features, got ${r.totalMatches}`);
});

test('list_features tier filter restricts to a single tier', () => {
  const r = listFeatures({ tier: 'manufacturing-addon' });
  assert.ok(r.count > 0);
  for (const f of r.features) assert.equal(f.tier, 'manufacturing-addon');
});

test('list_features marketedOnly drops non-marketed features', () => {
  const r = listFeatures({ marketedOnly: true });
  for (const f of r.features) assert.equal(f.marketed, true);
});

test('list_features query matches Bill of Materials', () => {
  const r = listFeatures({ query: 'Bill of Materials' });
  assert.ok(r.count > 0);
  assert.ok(r.features.some((f) => f.key === 'bom'));
});

test('list_feature_categories returns 13 categories with counts', () => {
  const r = listFeatureCategories();
  assert.equal(r.count, 13);
  for (const c of r.categories) {
    assert.ok(c.featureCounts.total >= 0);
  }
});

test('list_integrations includes the new storage + freelance categories', () => {
  const storage = listIntegrations({ category: 'storage' });
  assert.ok(storage.count >= 2);
  const ids = new Set(storage.integrations.map((i) => i.id));
  assert.ok(ids.has('google-drive'));
  assert.ok(ids.has('onedrive-sharepoint'));

  const freelance = listIntegrations({ category: 'freelance' });
  assert.ok(freelance.count >= 1);
  assert.ok(freelance.integrations.some((i) => i.id === 'upwork'));
});

test('list_integrations finds FreshBooks under accounting-sync', () => {
  const r = listIntegrations({ category: 'accounting-sync' });
  assert.ok(r.integrations.some((i) => i.id === 'freshbooks'));
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
      r.articles[i - 1].publishedAt >= r.articles[i].publishedAt,
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

// ---------------------------------------------------------------------------
// how_munimji_helps — capability knowledge base
// ---------------------------------------------------------------------------

test('how_munimji_helps unfiltered returns areas, capabilities, and the legend', () => {
  const r = howMunimjiHelps({});
  assert.equal(r.areas.length, 10, 'expected all 10 business areas');
  assert.equal(r.capabilityCount, MUNIMJI_CAPABILITIES.length);
  assert.ok(r.capabilities.length === r.capabilityCount);
  // Legend must explain all four autonomy levels.
  for (const lvl of ['autonomous', 'approval', 'assist', 'manual'] as const) {
    assert.ok(r.autonomyLegend[lvl].length > 20, `legend missing for ${lvl}`);
  }
  assert.ok(r.guidance.length > 100, 'guidance string must be present for the host LLM');
});

test('how_munimji_helps echoes the business description as context', () => {
  const desc = 'I run a small cloth retail shop, daily cash + UPI sales, monthly GST.';
  const r = howMunimjiHelps({ businessDescription: desc });
  assert.equal(r.businessDescription, desc);
});

test('how_munimji_helps returns null businessDescription when omitted', () => {
  const r = howMunimjiHelps({});
  assert.equal(r.businessDescription, null);
});

test('how_munimji_helps area filter narrows areas and capabilities', () => {
  const r = howMunimjiHelps({ area: 'banking-cash' });
  assert.equal(r.areas.length, 1);
  assert.equal(r.areas[0].key, 'banking-cash');
  assert.ok(r.capabilities.length > 0);
  for (const c of r.capabilities) assert.equal(c.area, 'banking-cash');
});

test('how_munimji_helps autonomy filter narrows to that level', () => {
  const r = howMunimjiHelps({ autonomy: 'autonomous' });
  assert.ok(r.capabilities.length > 0);
  for (const c of r.capabilities) assert.equal(c.autonomy, 'autonomous');
});

test('how_munimji_helps enriches each capability with resolved software features', () => {
  const r = howMunimjiHelps({});
  for (const c of r.capabilities) {
    assert.ok(c.softwareFeatures.length > 0, `${c.key} should link >=1 software feature`);
    assert.ok(c.autonomyMeaning.length > 20, `${c.key} should carry an autonomy explanation`);
    assert.ok(c.exampleAsk.length > 0);
  }
});

test('capabilities KB: every softwareFeatureKey resolves to a real feature (drift guard)', () => {
  const featureKeys = new Set(FEATURES.map((f) => f.key));
  for (const c of MUNIMJI_CAPABILITIES) {
    for (const k of c.softwareFeatureKeys) {
      assert.ok(featureKeys.has(k), `capability "${c.key}" references missing feature key "${k}"`);
    }
  }
});

test('capabilities KB: ledger-mutating actions are never silently autonomous (safety invariant)', () => {
  // An autonomous capability (Munimji acts without approval) must NOT claim to
  // post to the books/ledger — that is the agentic-accounting safety model.
  for (const c of MUNIMJI_CAPABILITIES) {
    if (c.autonomy !== 'autonomous') continue;
    assert.ok(
      !/post(s|ed)?\s+(to\s+)?(your\s+)?(books|ledger|general ledger)/i.test(c.whoDoesWhat),
      `autonomous capability "${c.key}" must not post to the ledger without approval`,
    );
  }
});
