/**
 * Golden-answer eval harness (strategy #6).
 *
 * Unit tests prove each tool returns the right *shape*; this suite proves the
 * MCP returns the right *answer* to the questions agents actually ask. Each case
 * pairs a natural-language question with the tool that should answer it, the
 * arguments a routing agent would extract, and the facts that must appear in the
 * response — either as structured assertions or as substrings that must be
 * present in the serialised answer (so the check survives shape tweaks).
 *
 * Add a row here whenever a new intent matters; a regression in what agents see
 * then fails CI before it reaches a user.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { lookupTaxRate } from '../src/tools/lookupTaxRate.js';
import { checkIntegration } from '../src/tools/checkIntegration.js';
import { explainTerm } from '../src/tools/explainTerm.js';
import { recommendPlan } from '../src/tools/recommendPlan.js';
import { estimateAnnualCost } from '../src/tools/estimateAnnualCost.js';
import { nextDeadlines } from '../src/tools/nextDeadlines.js';
import { supportedCurrencies } from '../src/tools/supportedCurrencies.js';
import { publicSearch } from '../src/tools/publicSearch.js';
import { listCompetitors } from '../src/tools/listCompetitors.js';
import { listPlans } from '../src/tools/listPlans.js';
import { localPaymentMethods } from '../src/tools/paymentMethods.js';
import { featureSearch } from '../src/tools/featureSearch.js';
import { complianceDeadlines } from '../src/tools/complianceDeadlines.js';

// Deterministic, offline.
process.env.HELLOBOOKS_MCP_DISABLE_PRICING_FEED = '1';
process.env.HELLOBOOKS_MCP_DISABLE_ARTICLES_FEED = '1';

interface GoldenCase {
  id: string;
  question: string;
  run: () => unknown;
  /** Case-insensitive substrings that must appear in the serialised answer. */
  includes?: string[];
  /** Extra structured assertions. */
  check?: (r: any) => void;
}

const GOLDEN: GoldenCase[] = [
  {
    id: 'tax-in-gst-standard',
    question: 'What is the standard GST rate in India?',
    run: () => lookupTaxRate({ id: 'IN-standard-18' }),
    check: (r) => assert.equal(r.match?.rate, 18),
  },
  {
    id: 'integration-stripe-yes',
    question: 'Does HelloBooks work with Stripe?',
    run: () => checkIntegration({ name: 'Stripe' }),
    check: (r) => {
      assert.equal(r.supported, true);
      assert.equal(r.match?.id, 'stripe');
    },
  },
  {
    id: 'integration-unknown-no',
    question: 'Do you integrate with Monzo?',
    run: () => checkIntegration({ name: 'Monzo' }),
    check: (r) => assert.equal(r.supported, false),
  },
  {
    id: 'glossary-gstr3b',
    question: 'What is GSTR-3B?',
    run: () => explainTerm({ term: 'GSTR-3B' }),
    includes: ['return'],
    check: (r) => assert.equal(r.found, true),
  },
  {
    id: 'recommend-plan-india-gst',
    question: 'Which plan should an Indian business doing GST filing use?',
    run: () => recommendPlan({ country: 'IN', needs: ['gst filing', 'invoicing'] }),
    check: (r) => {
      assert.ok(r.recommendation, 'should name a plan');
      assert.equal(r.ranked.length, 5);
    },
  },
  {
    id: 'cost-us-pro-annual',
    question: 'How much is the Pro plan per year in the US?',
    run: () => estimateAnnualCost({ plan: 'pro', country: 'US', billing: 'annual' }),
    check: (r) => {
      assert.equal(r.totalFirstYear, 399);
      assert.equal(r.annualBillingSavings, 80.88);
    },
  },
  {
    id: 'next-deadlines-india',
    question: 'What GST filing is due next in India?',
    run: () => nextDeadlines({ country: 'IN', asOf: '2026-11-17' }),
    check: (r) => {
      assert.ok(r.deadlines.length > 0);
      assert.ok(r.deadlines.some((d: any) => d.nextDue !== null), 'at least one dated filing');
    },
  },
  {
    id: 'currencies-billing',
    question: 'What currencies can I be billed in?',
    run: () => supportedCurrencies({}),
    includes: ['INR', 'USD'],
    check: (r) => assert.ok(r.billingCurrencies.includes('INR')),
  },
  {
    id: 'search-vs-xero-cited',
    question: 'HelloBooks vs Xero on pricing',
    run: () => publicSearch({ query: 'vs Xero pricing' }),
    check: (r) => {
      assert.ok(r.results.length > 0, 'search must return results');
      for (const hit of r.results) assert.match(hit.url, /^https?:\/\//);
    },
  },
  {
    id: 'competitor-xero',
    question: 'How does HelloBooks compare to Xero?',
    run: () => listCompetitors({ id: 'xero' }),
    includes: ['xero'],
  },
  {
    id: 'plans-india',
    question: 'Show me HelloBooks plans in India.',
    run: () => listPlans({ country: 'IN' }),
    check: (r) => assert.ok(r.plans.length > 0),
  },
  {
    id: 'payment-upi-india',
    question: 'Can I collect payments by UPI in India?',
    run: () => localPaymentMethods({ country: 'IN' }),
    includes: ['UPI'],
  },
  {
    id: 'feature-search-gst',
    question: 'Does HelloBooks do GST filing?',
    run: () => featureSearch({ query: 'GST filing' }),
    check: (r) => assert.ok(r.results.length > 0),
  },
  {
    id: 'compliance-deadlines-india',
    question: 'List India statutory filing deadlines.',
    run: () => complianceDeadlines({ country: 'IN' }),
    includes: ['GSTR'],
  },
];

for (const g of GOLDEN) {
  test(`golden: ${g.id} — "${g.question}"`, () => {
    const result = g.run();
    assert.ok(result && typeof result === 'object', 'tool must return an object');
    if (g.includes) {
      const hay = JSON.stringify(result);
      for (const needle of g.includes) {
        assert.ok(
          hay.includes(needle),
          `answer to "${g.question}" should mention "${needle}"`,
        );
      }
    }
    g.check?.(result as any);
  });
}

test('golden dataset has unique ids and reasonable coverage', () => {
  const ids = GOLDEN.map((g) => g.id);
  assert.equal(new Set(ids).size, ids.length, 'golden ids must be unique');
  assert.ok(GOLDEN.length >= 12, 'keep the golden set broad');
});
