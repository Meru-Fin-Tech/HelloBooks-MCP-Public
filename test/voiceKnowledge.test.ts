/**
 * Voice knowledge pack (src/voiceKnowledge.ts + src/voiceKnowledgeRouter.ts).
 *
 * The pack is what an AI phone agent says to a customer, so these tests pin
 * the facts that would hurt if they drifted: the onboarding-support price per
 * country, the currency actually charged, India GST coverage and the India
 * no-bank-feed rule — plus the caching contract (stable version, ETag/304).
 */

// Pin pricing to baked data so nothing touches the network.
process.env.HELLOBOOKS_MCP_DISABLE_PRICING_FEED = '1';

import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import type { AddressInfo } from 'node:net';

import { buildAllVoicePacks, buildVoicePack, resolveVoiceCountry } from '../src/voiceKnowledge.js';
import { createVoiceKnowledgeRouter } from '../src/voiceKnowledgeRouter.js';
import { feedToPlans, type PricingFeed } from '../src/pricingFeed.js';
import { SUPPORTED_COUNTRY_CODES } from '../src/data/supportedCountries.js';
import { BILLED_IN_USD_DESPITE_LOCAL_PRICE } from '../src/data/billingParity.js';

test('India pack: ₹5,000 for 10 hours on Google Meet or Zoom, GSTR-1/3B free', () => {
  const p = buildVoicePack('IN');
  assert.equal(p.onboardingSupport?.price, 5000);
  assert.equal(p.onboardingSupport?.currency, 'INR');
  assert.equal(p.onboardingSupport?.hours, 10);
  assert.match(p.text, /₹5,000 for 10 hours/);
  assert.match(p.text, /Google Meet or Zoom/);
  assert.match(p.text, /GSTR-1 and GSTR-3B filing is included free, on the Free plan too/);
  assert.match(p.text, /GSTR-3B: due the 20th/);
  assert.match(p.text, /GSTR-1: due the 11th/);
});

test('US pack: $300 for 10 hours', () => {
  const p = buildVoicePack('US');
  assert.equal(p.onboardingSupport?.price, 300);
  assert.equal(p.onboardingSupport?.currency, 'USD');
  assert.match(p.text, /\$300 for 10 hours/);
  assert.equal(p.compliance?.headline.includes('GST'), false);
});

test('no hourly onboarding price is invented outside India and the US', () => {
  for (const c of SUPPORTED_COUNTRY_CODES) {
    if (c === 'IN' || c === 'US') continue;
    const p = buildVoicePack(c);
    assert.equal(p.onboardingSupport, null, `${c} must not carry an onboarding offer`);
    assert.doesNotMatch(p.text, /Paid 1:1 onboarding support/, c);
  }
});

test('India never promises bank feeds, and the rule says so', () => {
  const p = buildVoicePack('IN');
  const planText = p.plans.flatMap((pl) => pl.highlights).join(' ');
  assert.doesNotMatch(planText, /bank feed/i);
  assert.ok(p.guardrails.some((g) => /India has no live bank feeds/.test(g)));
});

test('the GST provider is never named', () => {
  for (const c of SUPPORTED_COUNTRY_CODES) {
    assert.doesNotMatch(buildVoicePack(c).text, /fynamics|quicko|sandbox\.co/i, c);
  }
});

// Pinned literally, not read from billingParity: a region leaves this list only
// when Auth-V3 starts charging its local price, and that should fail here first.
const CHARGED_USD_TODAY = ['CA', 'GB', 'AU', 'AE', 'SG', 'NZ'];

test('regions charged in USD say so on every paid plan', () => {
  assert.deepEqual([...BILLED_IN_USD_DESPITE_LOCAL_PRICE], CHARGED_USD_TODAY);
  for (const c of CHARGED_USD_TODAY) {
    const p = buildVoicePack(c);
    for (const plan of p.plans.filter((pl) => pl.monthly > 0)) {
      assert.match(plan.chargedAs ?? '', /US\$/, `${c} ${plan.plan} must disclose the USD charge`);
    }
    assert.ok(p.guardrails.some((g) => /US-dollar amount/.test(g)), c);
  }
  // Billing-backed regions carry no disclosure.
  for (const c of ['IN', 'US']) {
    assert.ok(buildVoicePack(c).plans.every((pl) => pl.chargedAs === undefined), c);
  }
});

test('Starter is not offered where it is not sold', () => {
  assert.ok(buildVoicePack('US').plans.some((p) => p.plan === 'starter'));
  assert.ok(!buildVoicePack('IN').plans.some((p) => p.plan === 'starter'));
});

test('every pack fits comfortably in a system prompt', () => {
  for (const c of SUPPORTED_COUNTRY_CODES) {
    const p = buildVoicePack(c);
    assert.ok(p.approxTokens < 1800, `${c} pack is ~${p.approxTokens} tokens`);
  }
});

test('version is a content hash: stable across builds, independent of build time', () => {
  const a = buildVoicePack('IN', new Date('2026-10-05T00:00:00Z'));
  const b = buildVoicePack('IN', new Date('2026-10-06T00:00:00Z'));
  assert.notEqual(a.generatedAt, b.generatedAt);
  assert.equal(a.version, b.version);
  assert.match(a.version, /^[0-9a-f]{16}$/);
  assert.notEqual(a.version, buildVoicePack('US').version);
  assert.match(a.text, /Facts as of \d{4}-\d{2}-\d{2}T/);
  assert.equal(a.pricingSource, 'static-fallback');
  assert.match(a.text, /team will confirm by email/);
});

test('resolveVoiceCountry normalises case and UK, rejects the unknown', () => {
  assert.equal(resolveVoiceCountry('in'), 'IN');
  assert.equal(resolveVoiceCountry(' uk '), 'GB');
  assert.equal(resolveVoiceCountry('ZZ'), null);
  assert.equal(resolveVoiceCountry(undefined), null);
});

test('feedToPlans keeps region-specific bullets (India Free leads with GST)', () => {
  const tier = (features: string[]) => ({
    id: 'free', currency: 'USD', monthlyPrice: 0, annualPrice: 0, anchorMonthlyPrice: 0,
    features, limits: { perClientPrice: 0, monthlyAiCredits: null },
  });
  const feed: PricingFeed = {
    tiers: [tier(['Global free bullet'])],
    addOns: [],
    regions: [
      { region: 'US', tiers: [tier(['Global free bullet'])], addOns: [] },
      { region: 'IN', tiers: [{ ...tier(['Unlimited GST filing — GSTR-1 & GSTR-3B']), currency: 'INR' }], addOns: [] },
    ],
  };
  const free = feedToPlans(feed).find((p) => p.plan === 'free');
  assert.deepEqual(free?.features, ['Global free bullet']);
  assert.deepEqual(free?.featuresByCountry?.IN, ['Unlimited GST filing — GSTR-1 & GSTR-3B']);
});

async function withServer(fn: (base: string) => Promise<void>): Promise<void> {
  const app = express();
  app.use(express.json());
  app.use('/kb', createVoiceKnowledgeRouter());
  const server = app.listen(0);
  const { port } = server.address() as AddressInfo;
  try {
    await fn(`http://127.0.0.1:${port}/kb`);
  } finally {
    server.close();
  }
}

test('buildAllVoicePacks: one bundle with every supported country', () => {
  const all = buildAllVoicePacks(new Date('2026-10-05T00:00:00Z'));
  assert.deepEqual(all.countries, [...SUPPORTED_COUNTRY_CODES]);
  assert.equal(all.packs.IN.onboardingSupport?.price, 5000);
  assert.equal(all.packs.US.onboardingSupport?.price, 300);
  assert.equal(all.packs.IN.version, buildVoicePack('IN').version);
  assert.match(all.version, /^[0-9a-f]{16}$/);
  assert.equal(all.version, buildAllVoicePacks(new Date('2026-10-06T00:00:00Z')).version);
  for (const c of all.countries) assert.match(all.text, new RegExp(`HELLOBOOKS KNOWLEDGE — .* \\(${c}\\)`));
});

test('GET /kb/voice.json with no country (or country=all) returns every country', async () => {
  await withServer(async (base) => {
    for (const url of [`${base}/voice.json`, `${base}/voice.json?country=all`]) {
      const res = await fetch(url);
      assert.equal(res.status, 200, url);
      const body = await res.json() as { countries: string[]; packs: Record<string, { country: string }>; version: string };
      assert.deepEqual(body.countries, [...SUPPORTED_COUNTRY_CODES]);
      assert.equal(body.packs.IN.country, 'IN');
      assert.equal(res.headers.get('etag'), `"${body.version}"`);
      const again = await fetch(url, { headers: { 'if-none-match': res.headers.get('etag')! } });
      assert.equal(again.status, 304);
    }
    const txt = await fetch(`${base}/voice.txt`);
    assert.equal(txt.status, 200);
    const body = await txt.text();
    assert.match(body, /India \(IN\)/);
    assert.match(body, /United States \(US\)/);
  });
});

test('GET /kb/voice.json: 400 for an unknown country, 200 with ETag + timestamps, 304 on revalidate', async () => {
  await withServer(async (base) => {
    const bad = await fetch(`${base}/voice.json?country=ZZ`);
    assert.equal(bad.status, 400);

    const ok = await fetch(`${base}/voice.json?country=in`);
    assert.equal(ok.status, 200);
    const etag = ok.headers.get('etag');
    const body = await ok.json() as { version: string; country: string };
    assert.equal(body.country, 'IN');
    assert.equal(etag, `"${body.version}"`);
    assert.ok(ok.headers.get('x-kb-facts-as-of'));
    assert.ok(ok.headers.get('x-kb-generated-at'));
    assert.match(ok.headers.get('cache-control') ?? '', /max-age=/);

    const again = await fetch(`${base}/voice.json?country=IN`, { headers: { 'if-none-match': etag! } });
    assert.equal(again.status, 304);

    const txt = await fetch(`${base}/voice.txt?country=IN`);
    assert.equal(txt.status, 200);
    assert.match(txt.headers.get('content-type') ?? '', /text\/plain/);
    assert.match(await txt.text(), /^HELLOBOOKS KNOWLEDGE — India \(IN\)/);
  });
});

test('POST /kb/refresh: off without a token, 401 on a wrong token', async () => {
  const saved = process.env.HELLOBOOKS_KB_REFRESH_TOKEN;
  try {
    delete process.env.HELLOBOOKS_KB_REFRESH_TOKEN;
    await withServer(async (base) => {
      assert.equal((await fetch(`${base}/refresh`, { method: 'POST' })).status, 404);
    });
    process.env.HELLOBOOKS_KB_REFRESH_TOKEN = 'right-token';
    await withServer(async (base) => {
      const wrong = await fetch(`${base}/refresh`, { method: 'POST', headers: { authorization: 'Bearer wrong-token' } });
      assert.equal(wrong.status, 401);
      const none = await fetch(`${base}/refresh`, { method: 'POST' });
      assert.equal(none.status, 401);
      // Right token with the feed disabled: authorised, but nothing to fetch → 502, last good copy kept.
      const right = await fetch(`${base}/refresh`, { method: 'POST', headers: { authorization: 'Bearer right-token' } });
      assert.equal(right.status, 502);
      assert.equal((await right.json() as { refreshed: boolean }).refreshed, false);
    });
  } finally {
    if (saved === undefined) delete process.env.HELLOBOOKS_KB_REFRESH_TOKEN;
    else process.env.HELLOBOOKS_KB_REFRESH_TOKEN = saved;
  }
});
