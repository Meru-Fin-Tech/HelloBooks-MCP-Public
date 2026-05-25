/**
 * Tests for src/analytics.ts — Layer-2 GA4 Measurement Protocol telemetry.
 *
 * These tests guarantee:
 *   1. With no GA4 env vars, analytics is disabled and `track()` is a silent
 *      no-op — it never calls `fetch` and never throws. This is the safety
 *      property that lets the server run telemetry-free by default.
 *   2. With both GA4 env vars set, `track()` POSTs a well-formed Measurement
 *      Protocol payload to the GA4 collect endpoint.
 *
 * `fetch` is stubbed on `globalThis` and always restored in a `finally`.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { analyticsEnabled, track } from '../src/analytics.js';

const REAL_FETCH = globalThis.fetch;

function clearGa4Env(): void {
  delete process.env.GA4_MEASUREMENT_ID;
  delete process.env.GA4_API_SECRET;
}

test('disabled by default: track() never calls fetch and never throws', () => {
  clearGa4Env();
  assert.equal(analyticsEnabled(), false);

  let fetchCalls = 0;
  globalThis.fetch = (() => {
    fetchCalls += 1;
    return Promise.resolve(new Response());
  }) as typeof fetch;

  try {
    assert.doesNotThrow(() =>
      track(
        'mcp_tool_called',
        { tool_name: 'list_plans', success: true },
        'sess-1',
      ),
    );
  } finally {
    globalThis.fetch = REAL_FETCH;
  }
  assert.equal(fetchCalls, 0, 'fetch must not be called when analytics is disabled');
});

test('partial config (only one var) keeps analytics disabled', () => {
  clearGa4Env();
  process.env.GA4_MEASUREMENT_ID = 'G-ONLYID';
  try {
    assert.equal(analyticsEnabled(), false);
  } finally {
    clearGa4Env();
  }
});

test('enabled: track() POSTs a valid Measurement Protocol payload', () => {
  process.env.GA4_MEASUREMENT_ID = 'G-TEST0001';
  process.env.GA4_API_SECRET = 'test-secret';
  assert.equal(analyticsEnabled(), true);

  let captured: { url: string; init: { method?: string; body?: unknown } } | undefined;
  globalThis.fetch = ((url: string | URL, init: { method?: string; body?: unknown }) => {
    captured = { url: String(url), init };
    return Promise.resolve(new Response());
  }) as typeof fetch;

  try {
    track('mcp_sessions_snapshot', { active_sessions: 4 }, 'server');
  } finally {
    globalThis.fetch = REAL_FETCH;
    clearGa4Env();
  }

  assert.ok(captured, 'fetch should have been called when analytics is enabled');
  assert.match(captured.url, /\/mp\/collect\?/);
  assert.match(captured.url, /measurement_id=G-TEST0001/);
  assert.match(captured.url, /api_secret=test-secret/);
  assert.equal(captured.init.method, 'POST');

  const payload = JSON.parse(String(captured.init.body));
  assert.equal(payload.client_id, 'server');
  assert.equal(typeof payload.timestamp_micros, 'number');
  assert.equal(payload.events.length, 1);
  assert.equal(payload.events[0].name, 'mcp_sessions_snapshot');
  assert.equal(payload.events[0].params.active_sessions, 4);
  // Every event is auto-tagged with the product label.
  assert.equal(payload.events[0].params.product, 'hellobooks');
});
