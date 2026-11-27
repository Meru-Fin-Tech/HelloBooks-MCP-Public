/**
 * Response-size budget guard.
 *
 * A tool that returns a huge JSON blob silently eats an agent's context window.
 * This test bounds the default (unfiltered) payload of every list-style tool so
 * a regression that balloons a response fails CI. `country_support` unfiltered
 * spans 187 country hubs and is the one known-large surface — it gets an
 * explicit higher ceiling AND a check that its `country` filter keeps a scoped
 * query small, which is how agents should call it.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { listPlans } from '../src/tools/listPlans.js';
import { listCreditPacks } from '../src/tools/listCreditPacks.js';
import { listFeatures } from '../src/tools/listFeatures.js';
import { listFeatureCategories } from '../src/tools/listFeatureCategories.js';
import { listIntegrations } from '../src/tools/listIntegrations.js';
import { countrySupport } from '../src/tools/countrySupport.js';
import { complianceDeadlines } from '../src/tools/complianceDeadlines.js';
import { listArticles } from '../src/tools/listArticles.js';
import { listTaxRates } from '../src/tools/listTaxRates.js';
import { localPaymentMethods } from '../src/tools/paymentMethods.js';
import { listCompetitors } from '../src/tools/listCompetitors.js';
import { listVideos } from '../src/tools/listVideos.js';
import { listServices } from '../src/tools/listServices.js';

process.env.HELLOBOOKS_MCP_DISABLE_PRICING_FEED = '1';
process.env.HELLOBOOKS_MCP_DISABLE_ARTICLES_FEED = '1';

/** General per-tool ceiling in characters (~15k tokens). */
const GENERAL_BUDGET = 60_000;
/** country_support spans 187 hubs; bounded higher but not unbounded (~50k tokens). */
const COUNTRY_SUPPORT_BUDGET = 200_000;

const size = (v: unknown) => JSON.stringify(v).length;

const GENERAL_TOOLS: Array<[string, () => unknown]> = [
  ['list_plans', () => listPlans({})],
  ['list_credit_packs', () => listCreditPacks({})],
  ['list_features', () => listFeatures({})],
  ['list_feature_categories', () => listFeatureCategories({})],
  ['list_integrations', () => listIntegrations({})],
  ['compliance_deadlines', () => complianceDeadlines({})],
  ['list_articles', () => listArticles({})],
  ['list_tax_rates', () => listTaxRates({})],
  ['local_payment_methods', () => localPaymentMethods({})],
  ['list_competitors', () => listCompetitors({})],
  ['list_videos', () => listVideos({})],
  ['list_services', () => listServices({})],
];

for (const [name, run] of GENERAL_TOOLS) {
  test(`response-size: ${name} default payload is under budget`, () => {
    const n = size(run());
    assert.ok(n <= GENERAL_BUDGET, `${name} default payload is ${n} chars (> ${GENERAL_BUDGET})`);
  });
}

test('response-size: country_support unfiltered stays under its documented ceiling', () => {
  const n = size(countrySupport({}));
  assert.ok(
    n <= COUNTRY_SUPPORT_BUDGET,
    `country_support unfiltered is ${n} chars (> ${COUNTRY_SUPPORT_BUDGET}) — add filtering/pagination`,
  );
});

test('response-size: a scoped country_support query is small', () => {
  const n = size(countrySupport({ country: 'IN' }));
  assert.ok(n <= GENERAL_BUDGET, `country_support({country:'IN'}) is ${n} chars — filter should keep it small`);
});

test('response-size: country_support summary mode is far smaller than the full matrix', () => {
  const full = size(countrySupport({}));
  const summary = size(countrySupport({ summary: true }));
  assert.ok(summary <= GENERAL_BUDGET, `summary mode is ${summary} chars (> ${GENERAL_BUDGET})`);
  assert.ok(summary < full / 2, 'summary must be well under half the full matrix size');
});
