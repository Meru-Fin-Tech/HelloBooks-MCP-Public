import { test } from 'node:test';
import assert from 'node:assert/strict';

import { listPlans } from '../src/tools/listPlans.js';
import { listIntegrations } from '../src/tools/listIntegrations.js';
import { countrySupport } from '../src/tools/countrySupport.js';
import { complianceCapabilities } from '../src/tools/complianceCapabilities.js';
import { featureSearch } from '../src/tools/featureSearch.js';
import { listCompetitors } from '../src/tools/listCompetitors.js';
import { complianceDeadlines } from '../src/tools/complianceDeadlines.js';
import { localPaymentMethods } from '../src/tools/paymentMethods.js';

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
  const ids = r.deadlines.map((d) => d.id);
  assert.ok(ids.includes('stp'), 'AU STP must be per-event');
  assert.ok(ids.includes('paye-rti'), 'GB PAYE RTI must be per-event');
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
  const bas = r.deadlines[0]!;
  assert.deepEqual(bas.annualDates, ['Oct 28', 'Feb 28', 'Apr 28', 'Jul 28']);
});

test('compliance_deadlines US 1099-NEC has the unified Jan 31 deadline (not Mar 31)', () => {
  // Spec watch-out: 1099-NEC's IRS filing is Jan 31, not Mar 31. Only other
  // 1099 series (MISC, INT, DIV) get the Mar 31 e-file date.
  const r = complianceDeadlines({ country: 'US', form: '1099-NEC' });
  assert.equal(r.count, 1);
  assert.deepEqual(r.deadlines[0]!.annualDates, ['Jan 31']);
});

test('feature_search "when is GSTR-3B due" surfaces the GSTR-3B deadline entry', () => {
  const r = featureSearch({ query: 'when is GSTR-3B due' });
  const hit = r.results.find((h) => h.source === 'deadline' && h.label.startsWith('GSTR-3B'));
  assert.ok(hit, 'expected a deadline hit for GSTR-3B');
  assert.ok(hit!.url && hit!.url.includes('gst.gov.in'));
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
  assert.equal(r.methods[0]!.name, 'BACS Direct Credit');
  assert.equal(r.methods[0]!.authority, 'Pay.UK');
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
