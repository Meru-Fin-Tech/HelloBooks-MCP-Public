/**
 * Protocol handshake + conformance suite.
 *
 * Strategy #1 — "Adopt latest MCP protocol revision": the SDK is pinned exactly
 * (see package.json). To make every future `@modelcontextprotocol/sdk` bump
 * safe, CI must prove that a real MCP client can still complete the initialize
 * handshake and enumerate the full tool/resource surface through the SDK — not
 * just that the tool functions return data in isolation (that is tools.test.ts).
 *
 * This suite drives the server the way Claude, ChatGPT, Cursor, and Gemini do:
 * an actual `Client` connected over the in-memory transport. If an SDK upgrade
 * breaks capability negotiation, the tool contract, or the OpenAI search/fetch
 * retrieval contract, one of these assertions fails before it reaches a client.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

import { createServer, SERVER_VERSION } from '../src/server.js';

// Pin the live feeds off so the handshake + listing are deterministic and
// offline (same discipline as tools.test.ts). Set before createServer() runs.
process.env.HELLOBOOKS_MCP_DISABLE_PRICING_FEED = '1';
process.env.HELLOBOOKS_MCP_DISABLE_ARTICLES_FEED = '1';

/**
 * Stand up a fresh server and a connected client over a linked in-memory
 * transport pair. A resolved `client.connect()` is itself proof that the
 * initialize handshake (protocol-version negotiation + capability exchange)
 * succeeded — the SDK throws on a failed handshake.
 */
async function connectClient(): Promise<{ client: Client; close: () => Promise<void> }> {
  const server = createServer();
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client(
    { name: 'conformance-probe', version: '1.0.0' },
    { capabilities: {} },
  );
  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);
  return {
    client,
    close: async () => {
      await client.close();
      await server.close();
    },
  };
}

test('initialize handshake succeeds and server identity matches SERVER_VERSION', async () => {
  const { client, close } = await connectClient();
  try {
    const info = client.getServerVersion();
    assert.ok(info, 'server implementation info should be present after initialize');
    assert.equal(info?.name, 'hellobooks-public');
    assert.equal(info?.version, SERVER_VERSION);
  } finally {
    await close();
  }
});

test('server advertises tools + resources capabilities', async () => {
  const { client, close } = await connectClient();
  try {
    const caps = client.getServerCapabilities();
    assert.ok(caps, 'capabilities should be negotiated during initialize');
    assert.ok(caps?.tools, 'server must advertise the tools capability');
    assert.ok(caps?.resources, 'server must advertise the resources capability');
  } finally {
    await close();
  }
});

test('tools/list returns the full, non-empty surface over the SDK', async () => {
  const { client, close } = await connectClient();
  try {
    const { tools } = await client.listTools();
    assert.ok(Array.isArray(tools), 'tools must be an array');
    // The README documents 30+ tools; guard against an accidental drop of the
    // registry (e.g. a bad SDK upgrade or a wiring regression in server.ts).
    assert.ok(
      tools.length >= 30,
      `expected >= 30 tools, got ${tools.length}`,
    );
    // Every tool must carry a name and a non-empty description — a client shows
    // these to the model for tool selection.
    for (const t of tools) {
      assert.ok(t.name && t.name.length > 0, 'every tool needs a name');
      assert.ok(
        typeof t.description === 'string' && t.description.length > 0,
        `tool ${t.name} needs a description`,
      );
      assert.ok(t.inputSchema, `tool ${t.name} needs an inputSchema`);
    }
  } finally {
    await close();
  }
});

test('OpenAI connector retrieval contract (search + fetch) is present', async () => {
  const { client, close } = await connectClient();
  try {
    const { tools } = await client.listTools();
    const names = new Set(tools.map((t) => t.name));
    // ChatGPT deep research / connectors require exactly these two tool names.
    assert.ok(names.has('search'), 'search tool required by the OpenAI contract');
    assert.ok(names.has('fetch'), 'fetch tool required by the OpenAI contract');
  } finally {
    await close();
  }
});

test('core product tools are registered and callable by name', async () => {
  const { client, close } = await connectClient();
  try {
    const { tools } = await client.listTools();
    const names = new Set(tools.map((t) => t.name));
    for (const expected of [
      'list_plans',
      'list_integrations',
      'country_support',
      'compliance_capabilities',
      'list_competitors',
      'compliance_deadlines',
      'feature_search',
    ]) {
      assert.ok(names.has(expected), `expected tool "${expected}" to be registered`);
    }
  } finally {
    await close();
  }
});

test('read-only by construction: no registered tool claims to be a writer', async () => {
  const { client, close } = await connectClient();
  try {
    const { tools } = await client.listTools();
    // This server is read-only by design. A tool may omit annotations, but none
    // may advertise readOnlyHint === false — that would be a design violation
    // and would make hosts prompt for mutation approval on every call.
    for (const t of tools) {
      const hint = t.annotations?.readOnlyHint;
      assert.notEqual(
        hint,
        false,
        `tool ${t.name} must not advertise readOnlyHint:false on a read-only server`,
      );
    }
  } finally {
    await close();
  }
});

test('resources/list exposes the core knowledge resources', async () => {
  const { client, close } = await connectClient();
  try {
    const { resources } = await client.listResources();
    const uris = new Set(resources.map((r) => r.uri));
    for (const expected of [
      'hellobooks://about',
      'hellobooks://changelog',
      'hellobooks://feature-catalog',
    ]) {
      assert.ok(uris.has(expected), `expected resource "${expected}" to be exposed`);
    }
  } finally {
    await close();
  }
});

test('a tool call round-trips through the SDK (list_plans)', async () => {
  const { client, close } = await connectClient();
  try {
    const result = await client.callTool({ name: 'list_plans', arguments: {} });
    assert.ok(result, 'callTool must return a result');
    assert.ok(Array.isArray(result.content), 'result must carry a content array');
    assert.ok(result.content.length > 0, 'list_plans must return content');
    assert.notEqual(result.isError, true, 'list_plans must not error');
  } finally {
    await close();
  }
});
