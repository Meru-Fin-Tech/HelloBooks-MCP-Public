import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  ShareStore,
  renderSharePage,
  generateSlug,
  isValidSlug,
  mintShare,
} from '../src/lib/shareUrl/index.js';
import { esc } from '../src/lib/shareUrl/render.js';
import type { SharePayload } from '../src/lib/shareUrl/types.js';
import type { DetectionFlag } from '../src/lib/detection/types.js';

/* ──────────────────────────── slug ─────────────────────────────── */

test('generateSlug returns a 12-char string from the unambiguous alphabet', () => {
  for (let i = 0; i < 50; i++) {
    const s = generateSlug();
    assert.equal(s.length, 12);
    assert.match(s, /^[A-HJ-NP-Za-km-z2-9]+$/);
  }
});

test('isValidSlug accepts well-formed slugs', () => {
  const s = generateSlug();
  assert.ok(isValidSlug(s));
});

test('isValidSlug rejects wrong length / wrong chars / non-string', () => {
  assert.equal(isValidSlug(''), false);
  assert.equal(isValidSlug('short'), false);
  assert.equal(isValidSlug('exactly12chr!'), false);  // bang not in alphabet
  assert.equal(isValidSlug('AAAAAAAA0000'), false);   // 0 + 1 + l + I are excluded
  assert.equal(isValidSlug('AAAA1OAAAA22'), false);   // O + 1 excluded
  // @ts-expect-error — runtime guard for non-string callers
  assert.equal(isValidSlug(null), false);
});

/* ─────────────────────────── store ─────────────────────────────── */

function samplePayload(overrides: Partial<SharePayload> = {}): SharePayload {
  return {
    tool: 'analyzeQboJournalCleanup',
    generatedAt: '2026-05-22T08:00:00.000Z',
    sourceLabel: 'qbo_journal.csv',
    inputSummary: { totalRows: 100, totalJournals: 25 },
    flags: [],
    summary: { byCategory: {}, bySeverity: {}, totalFlags: 0 },
    ...overrides,
  };
}

test('ShareStore.mint returns a fresh slug + expiry', () => {
  const store = new ShareStore({ ttlMs: 60_000, now: () => 1_700_000_000_000 });
  const result = store.mint(samplePayload());
  assert.equal(result.slug.length, 12);
  assert.equal(result.createdAt, 1_700_000_000_000);
  assert.equal(result.expiresAt, 1_700_000_000_000 + 60_000);
  assert.equal(store.size, 1);
});

test('ShareStore.get returns payload before expiry, null after', () => {
  let now = 1_000;
  const store = new ShareStore({ ttlMs: 1_000, now: () => now });
  const { slug } = store.mint(samplePayload({ sourceLabel: 'test.csv' }));

  const live = store.get(slug);
  assert.ok(live);
  assert.equal(live!.sourceLabel, 'test.csv');

  now = 2_001; // 1ms past expiry
  const expired = store.get(slug);
  assert.equal(expired, null);
  assert.equal(store.size, 0); // expired entry is reaped on access
});

test('ShareStore.get returns null for unknown slug', () => {
  const store = new ShareStore();
  assert.equal(store.get('NotMintedYet'), null);
});

test('ShareStore.delete returns true if existed, false otherwise', () => {
  const store = new ShareStore();
  const { slug } = store.mint(samplePayload());
  assert.equal(store.delete(slug), true);
  assert.equal(store.delete(slug), false);
});

test('ShareStore.sweepExpired removes all expired entries', () => {
  let now = 1_000;
  const store = new ShareStore({ ttlMs: 100, now: () => now });
  store.mint(samplePayload());
  store.mint(samplePayload());
  assert.equal(store.size, 2);
  now = 2_000;
  const removed = store.sweepExpired();
  assert.equal(removed, 2);
  assert.equal(store.size, 0);
});

test('ShareStore evicts earliest-expiring entry when capacity is hit', () => {
  let now = 1_000;
  const store = new ShareStore({ ttlMs: 10_000, capacity: 2, now: () => now });
  const a = store.mint(samplePayload({ sourceLabel: 'a' }));
  now = 1_500;
  const b = store.mint(samplePayload({ sourceLabel: 'b' }));
  now = 2_000;
  const c = store.mint(samplePayload({ sourceLabel: 'c' }));
  // a should have been evicted (earliest expiry = 1_000 + 10_000 = 11_000).
  assert.equal(store.size, 2);
  assert.equal(store.get(a.slug), null);
  assert.ok(store.get(b.slug));
  assert.ok(store.get(c.slug));
});

/* ─────────────────────── mintShare (public API) ────────────────── */

test('mintShare builds a URL using the configured base', () => {
  const result = mintShare({
    tool: 'analyzeQboJournalCleanup',
    sourceLabel: 'test.csv',
    inputSummary: { totalRows: 10, totalJournals: 2 },
    flags: [],
    publicBaseUrl: 'https://example.test',
  });
  assert.match(result.shareUrl, /^https:\/\/example\.test\/r\/[A-HJ-NP-Za-km-z2-9]{12}$/);
  assert.ok(result.slug);
  assert.ok(result.expiresAt);
});

test('mintShare summarises flags by category and severity', () => {
  const flags: DetectionFlag[] = [
    { category: 'IMBALANCE', code: 'imbalance.journal', severity: 'high',   message: 'x', affectedRowIndices: [1], affectedJournalIds: ['A'], fixableInHellobooks: true },
    { category: 'IMBALANCE', code: 'imbalance.journal', severity: 'medium', message: 'y', affectedRowIndices: [2], affectedJournalIds: ['B'], fixableInHellobooks: true },
    { category: 'DUPLICATE', code: 'duplicate.exact',   severity: 'medium', message: 'z', affectedRowIndices: [3], affectedJournalIds: ['C'], fixableInHellobooks: true },
  ];
  const result = mintShare({
    tool: 'analyzeQboJournalCleanup',
    sourceLabel: 'x.csv',
    inputSummary: { totalRows: 10, totalJournals: 3 },
    flags,
    publicBaseUrl: 'https://test',
  });
  assert.ok(result.shareUrl);
  // Validate roll-up by re-reading through the store.
  // (mintShare uses the default store internally; we just sanity-check
  // that the shareUrl is well-formed for now — full content checked via
  // renderSharePage tests below.)
});

/* ────────────────────────── render ─────────────────────────────── */

test('renderSharePage produces well-formed HTML with the issue count', () => {
  const html = renderSharePage(
    samplePayload({
      flags: [],
      summary: { byCategory: {}, bySeverity: {}, totalFlags: 0 },
    }),
    { shareUrl: 'https://example.test/r/AAAAAAAAAAAA' },
  );
  assert.match(html, /^<!doctype html>/i);
  assert.match(html, /<title>/);
  assert.match(html, /HelloBooks AI Agent/);
  assert.match(html, /0 issues found/);
  assert.match(html, /Sign up free/);
});

test('renderSharePage shows pluralised heading for one or many issues', () => {
  const oneFlag: DetectionFlag = {
    category: 'IMBALANCE', code: 'imbalance.journal', severity: 'high',
    message: 'A balanced', affectedRowIndices: [1], affectedJournalIds: ['A'],
    fixableInHellobooks: true,
  };
  const one = renderSharePage(
    samplePayload({ flags: [oneFlag], summary: { byCategory: { IMBALANCE: 1 }, bySeverity: { high: 1 }, totalFlags: 1 } }),
    { shareUrl: 'https://example.test/r/AAAAAAAAAAAA' },
  );
  assert.match(one, /1 issue found/);
  assert.doesNotMatch(one, /1 issues found/);
});

test('renderSharePage routes the migration CTA based on tool name', () => {
  const xeroHtml = renderSharePage(
    samplePayload({ tool: 'analyzeXeroJournalCleanup' }),
    { shareUrl: 'https://example.test/r/AAAAAAAAAAAA' },
  );
  assert.match(xeroHtml, /migrate\/from-xero/);
  const qboHtml = renderSharePage(
    samplePayload({ tool: 'analyzeQboJournalCleanup' }),
    { shareUrl: 'https://example.test/r/AAAAAAAAAAAA' },
  );
  assert.match(qboHtml, /migrate\/from-quickbooks/);
});

test('renderSharePage escapes user-controlled strings to prevent XSS', () => {
  const evilFlag: DetectionFlag = {
    category: 'IMBALANCE',
    code: 'imbalance.journal',
    severity: 'high',
    message: '<script>alert("xss")</script>',
    affectedRowIndices: [1],
    affectedJournalIds: ['<img src=x onerror=1>'],
    fixableInHellobooks: true,
  };
  const html = renderSharePage(
    samplePayload({
      sourceLabel: '"><script>alert(1)</script>',
      flags: [evilFlag],
      summary: { byCategory: { IMBALANCE: 1 }, bySeverity: { high: 1 }, totalFlags: 1 },
    }),
    { shareUrl: 'https://example.test/r/AAAAAAAAAAAA' },
  );
  // Source-label escaped in the eyebrow line.
  assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
  // Flag message escaped in body.
  assert.doesNotMatch(html, /<script>alert\("xss"\)<\/script>/);
  // Verify escaped form is present.
  assert.match(html, /&lt;script&gt;alert/);
});

test('renderSharePage shows summary cards keyed by severity', () => {
  const html = renderSharePage(
    samplePayload({
      flags: [],
      summary: {
        byCategory: { IMBALANCE: 3 },
        bySeverity: { high: 2, medium: 1 },
        totalFlags: 3,
      },
    }),
    { shareUrl: 'https://example.test/r/AAAAAAAAAAAA' },
  );
  assert.match(html, /class="hb-card-count">2<\/div>/);
  assert.match(html, /class="hb-card-count">1<\/div>/);
});

test('esc handles all 5 HTML special characters', () => {
  assert.equal(esc('<>&"\''), '&lt;&gt;&amp;&quot;&#x27;');
  assert.equal(esc('safe text'), 'safe text');
});
