/**
 * Tests for src/lib/clientDetection.ts and the pure event builder in
 * src/middleware/mcpAnalytics.ts.
 *
 * These cover the analytics-relevant guarantees:
 *   1. Each named AI client and crawler resolves to its canonical label.
 *   2. `is_bot` is set whenever a crawler token is present (named or generic).
 *   3. The event builder always emits `mcp_request`, and the right extra events
 *      for tool calls, bot visits, and errors — never leaking arguments.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';

import {
  classifyUserAgent,
  detectAiClient,
  detectBot,
} from '../src/lib/clientDetection.js';
import {
  buildMcpAnalyticsEvents,
  mcpAnalytics,
  rpcMethodOf,
  toolNameOf,
  type McpAnalyticsContext,
} from '../src/middleware/mcpAnalytics.js';

// Representative real-world User-Agent strings.
const UA = {
  chatgptUser: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot',
  claudeUser: 'Claude-User/1.0 (+Claude-User@anthropic.com)',
  cursor: 'Cursor/0.42.3 (Macintosh; Apple Silicon)',
  perplexityUser: 'Mozilla/5.0 (compatible; Perplexity-User/1.0; +https://perplexity.ai/bot)',
  gemini: 'Mozilla/5.0 Gemini/1.0 (Google AI)',
  copilot: 'GitHub-Copilot/1.0',
  postman: 'PostmanRuntime/7.39.0',
  browser: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  empty: '',
  weird: 'curl/8.4.0',
  gptbot: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.1; +https://openai.com/gptbot',
  oaiSearch: 'Mozilla/5.0 (compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot)',
  claudebot: 'Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)',
  perplexitybot: 'Mozilla/5.0 (compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)',
  googleExtended: 'Mozilla/5.0 (compatible; Google-Extended/1.0)',
  googlebot: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  ccbot: 'CCBot/2.0 (https://commoncrawl.org/faq/)',
  bytespider: 'Mozilla/5.0 (compatible; Bytespider; spider-feedback@bytedance.com)',
  bingbot: 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
  applebot: 'Mozilla/5.0 (compatible; Applebot/0.1; +http://www.apple.com/go/applebot)',
  amazonbot: 'Mozilla/5.0 (compatible; Amazonbot/0.1; +https://developer.amazon.com/support/amazonbot)',
  ahrefsbot: 'Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)',
  semrushbot: 'Mozilla/5.0 (compatible; SemrushBot/7~bl; +http://www.semrush.com/bot.html)',
  genericBot: 'SomeRandomScraper-crawler/2.0',
} as const;

// --- AI client detection ---------------------------------------------------

test('detectAiClient resolves each known client', () => {
  assert.equal(detectAiClient(UA.chatgptUser), 'chatgpt');
  assert.equal(detectAiClient(UA.claudeUser), 'claude');
  assert.equal(detectAiClient(UA.cursor), 'cursor');
  assert.equal(detectAiClient(UA.perplexityUser), 'perplexity');
  assert.equal(detectAiClient(UA.gemini), 'gemini');
  assert.equal(detectAiClient(UA.copilot), 'copilot');
  assert.equal(detectAiClient(UA.postman), 'postman');
  assert.equal(detectAiClient(UA.browser), 'browser');
});

test('detectAiClient falls back to unknown for empty / unrecognised UAs', () => {
  assert.equal(detectAiClient(UA.empty), 'unknown');
  assert.equal(detectAiClient(UA.weird), 'unknown');
});

// --- Bot detection ---------------------------------------------------------

test('detectBot resolves each named crawler to its canonical label', () => {
  assert.equal(detectBot(UA.gptbot), 'GPTBot');
  assert.equal(detectBot(UA.oaiSearch), 'OAI-SearchBot');
  assert.equal(detectBot(UA.claudebot), 'ClaudeBot');
  assert.equal(detectBot(UA.perplexitybot), 'PerplexityBot');
  assert.equal(detectBot(UA.googleExtended), 'Google-Extended');
  assert.equal(detectBot(UA.googlebot), 'Googlebot');
  assert.equal(detectBot(UA.ccbot), 'CCBot');
  assert.equal(detectBot(UA.bytespider), 'Bytespider');
  assert.equal(detectBot(UA.bingbot), 'Bingbot');
  assert.equal(detectBot(UA.applebot), 'Applebot');
  assert.equal(detectBot(UA.amazonbot), 'Amazonbot');
  assert.equal(detectBot(UA.ahrefsbot), 'AhrefsBot');
  assert.equal(detectBot(UA.semrushbot), 'SemrushBot');
});

test('detectBot flags unnamed crawlers as other-bot and humans as none', () => {
  assert.equal(detectBot(UA.genericBot), 'other-bot');
  assert.equal(detectBot(UA.browser), 'none');
  assert.equal(detectBot(UA.empty), 'none');
});

test('classifyUserAgent sets isBot only for crawlers', () => {
  const human = classifyUserAgent(UA.chatgptUser);
  assert.equal(human.isBot, false);
  assert.equal(human.client, 'chatgpt');
  assert.equal(human.bot, 'none');

  const bot = classifyUserAgent(UA.gptbot);
  assert.equal(bot.isBot, true);
  assert.equal(bot.bot, 'GPTBot');

  assert.equal(classifyUserAgent(undefined).isBot, false);
  assert.equal(classifyUserAgent(null).client, 'unknown');
});

// --- JSON-RPC body extraction ----------------------------------------------

test('rpcMethodOf / toolNameOf read method and tool name, ignore arguments', () => {
  const body = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: { name: 'list_plans', arguments: { secret: 'do-not-leak' } },
  };
  assert.equal(rpcMethodOf(body), 'tools/call');
  assert.equal(toolNameOf(body), 'list_plans');

  // Robust against batches and junk.
  assert.equal(rpcMethodOf([body]), '');
  assert.equal(toolNameOf(undefined), '');
  assert.equal(toolNameOf({ method: 'tools/list' }), '');
});

// --- Event builder ---------------------------------------------------------

function ctx(overrides: Partial<McpAnalyticsContext> = {}): McpAnalyticsContext {
  return {
    path: '/mcp',
    httpMethod: 'POST',
    userAgent: UA.browser,
    rpcMethod: 'tools/list',
    toolName: '',
    statusCode: 200,
    responseTimeMs: 12,
    sessionId: 'sess-1',
    country: 'IN',
    ...overrides,
  };
}

test('buildMcpAnalyticsEvents always emits mcp_request with the core dimensions', () => {
  const [first, ...rest] = buildMcpAnalyticsEvents(ctx());
  assert.equal(first.name, 'mcp_request');
  assert.equal(first.clientId, 'sess-1');
  assert.equal(first.params.http_method, 'POST');
  assert.equal(first.params.rpc_method, 'tools/list');
  assert.equal(first.params.status, 200);
  assert.equal(first.params.success, true);
  assert.equal(first.params.client, 'browser');
  assert.equal(first.params.is_bot, false);
  assert.equal(first.params.response_time_ms, 12);
  // A plain successful non-tool, non-bot request emits only mcp_request.
  assert.equal(rest.length, 0);
});

test('tools/call adds mcp_tool_call carrying the tool name (not arguments)', () => {
  const events = buildMcpAnalyticsEvents(
    ctx({ rpcMethod: 'tools/call', toolName: 'feature_search', userAgent: UA.claudeUser }),
  );
  const names = events.map((e) => e.name);
  assert.deepEqual(names, ['mcp_request', 'mcp_tool_call']);
  assert.equal(events[1].params.tool_name, 'feature_search');
  assert.equal(events[1].params.client, 'claude');
  // No arguments / free text anywhere in the payload.
  assert.equal('arguments' in events[1].params, false);
});

test('bot UA adds mcp_bot_visit', () => {
  const events = buildMcpAnalyticsEvents(ctx({ userAgent: UA.gptbot, sessionId: '' }));
  const names = events.map((e) => e.name);
  assert.ok(names.includes('mcp_bot_visit'));
  assert.equal(events[0].params.bot, 'GPTBot');
  // Empty session falls back to the 'anon' client_id.
  assert.equal(events[0].clientId, 'anon');
});

test('status >= 400 adds mcp_error with error_status', () => {
  const events = buildMcpAnalyticsEvents(ctx({ statusCode: 400, rpcMethod: '' }));
  const error = events.find((e) => e.name === 'mcp_error');
  assert.ok(error, 'mcp_error should be present');
  assert.equal(error.params.success, false);
  assert.equal(error.params.error_status, 400);
  assert.equal(events[0].params.rpc_method, '(none)');
});

test('origin/referer are reduced to host only (no path/query leaks)', () => {
  const events = buildMcpAnalyticsEvents(
    ctx({ origin: 'https://chatgpt.com', referer: 'https://chat.example.com/secret/path?token=abc' }),
  );
  assert.equal(events[0].params.origin_host, 'chatgpt.com');
  assert.equal(events[0].params.referer_host, 'chat.example.com');
});

// --- Middleware terminal-event handling ------------------------------------
//
// These exercise the `mcpAnalytics` middleware end to end. `track()` only hits
// the network when the GA4 env vars are set, so we set them and stub `fetch` to
// count emitted events (one fetch per event). Always restored in `finally`.

interface FakeReqInit {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

function fakeReq(init: FakeReqInit = {}) {
  const headers = init.headers ?? {};
  return {
    path: '/mcp',
    method: init.method ?? 'POST',
    body: init.body,
    header(name: string): string | undefined {
      return headers[name.toLowerCase()];
    },
  };
}

class FakeRes extends EventEmitter {
  statusCode = 200;
  private headers: Record<string, string> = {};
  setHeader(key: string, value: string): void {
    this.headers[key.toLowerCase()] = value;
  }
  getHeader(key: string): string | undefined {
    return this.headers[key.toLowerCase()];
  }
}

const REAL_FETCH = globalThis.fetch;

function withFetchCounter(run: (counter: () => number) => void): void {
  process.env.GA4_MEASUREMENT_ID = 'G-MWTEST';
  process.env.GA4_API_SECRET = 'mw-secret';
  let calls = 0;
  globalThis.fetch = (() => {
    calls += 1;
    return Promise.resolve(new Response());
  }) as typeof fetch;
  try {
    run(() => calls);
  } finally {
    globalThis.fetch = REAL_FETCH;
    delete process.env.GA4_MEASUREMENT_ID;
    delete process.env.GA4_API_SECRET;
  }
}

test('middleware calls next() synchronously without blocking', () => {
  let nextCalled = false;
  // No GA4 env here — track is a no-op; we only assert the request is not held.
  mcpAnalytics(
    fakeReq() as never,
    new FakeRes() as never,
    () => {
      nextCalled = true;
    },
  );
  assert.equal(nextCalled, true);
});

test('middleware records each event exactly once when finish AND close both fire', () => {
  withFetchCounter((calls) => {
    const req = fakeReq({
      body: { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'list_plans' } },
      headers: { 'user-agent': 'Claude-User/1.0' },
    });
    const res = new FakeRes();
    mcpAnalytics(req as never, res as never, () => {});

    res.emit('finish');
    res.emit('close');

    // tools/call, success, non-bot → mcp_request + mcp_tool_call = 2 events,
    // emitted once despite both terminal events firing.
    assert.equal(calls(), 2);
  });
});

test('middleware records an aborted/SSE request that only emits close', () => {
  withFetchCounter((calls) => {
    const req = fakeReq({
      method: 'GET',
      headers: { 'user-agent': 'curl/8.4.0' },
    });
    const res = new FakeRes();
    mcpAnalytics(req as never, res as never, () => {});

    // No `finish` (client went away / stream ended) — only `close`.
    res.emit('close');

    // A plain non-tool, non-bot, success request still records mcp_request.
    assert.equal(calls(), 1);
  });
});

test('middleware never throws even if the response object misbehaves', () => {
  withFetchCounter(() => {
    const req = fakeReq();
    const res = new FakeRes();
    // getHeader throws — the try/catch in the handler must swallow it.
    res.getHeader = () => {
      throw new Error('boom');
    };
    mcpAnalytics(req as never, res as never, () => {});
    assert.doesNotThrow(() => res.emit('finish'));
  });
});
