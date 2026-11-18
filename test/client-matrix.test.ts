/**
 * Client-matrix smoke test (#55).
 *
 * Each AI client negotiates slightly differently. protocol.test.ts proves one
 * handshake; this proves the surface holds across the clients we care about —
 * Claude, ChatGPT, Cursor, Gemini — by driving the server with each one's
 * clientInfo and asserting the handshake, the full tool surface, the OpenAI
 * search/fetch contract, and a real tool call all succeed. A regression that
 * only breaks one client fails CI here.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

import { createServer } from '../src/server.js';

process.env.HELLOBOOKS_MCP_DISABLE_PRICING_FEED = '1';
process.env.HELLOBOOKS_MCP_DISABLE_ARTICLES_FEED = '1';

const CLIENTS = [
  { name: 'claude-ai', version: '1.0.0' },
  { name: 'openai-chatgpt', version: '1.0.0' },
  { name: 'cursor', version: '1.0.0' },
  { name: 'google-gemini', version: '1.0.0' },
];

for (const clientInfo of CLIENTS) {
  test(`client "${clientInfo.name}" completes the handshake and gets the full surface`, async () => {
    const server = createServer();
    const [ct, st] = InMemoryTransport.createLinkedPair();
    const client = new Client(clientInfo, { capabilities: {} });
    await Promise.all([server.connect(st), client.connect(ct)]);
    try {
      // Handshake succeeded (connect resolved) + identity is correct.
      assert.equal(client.getServerVersion()?.name, 'hellobooks-public');
      assert.ok(client.getServerCapabilities()?.tools, 'tools capability negotiated');

      // Full tool surface + the OpenAI retrieval contract.
      const { tools } = await client.listTools();
      assert.ok(tools.length >= 30, `expected >= 30 tools, got ${tools.length}`);
      const names = new Set(tools.map((t) => t.name));
      assert.ok(names.has('search') && names.has('fetch'), 'OpenAI contract tools present');

      // A real tool call round-trips with structuredContent.
      const r = (await client.callTool({ name: 'list_plans', arguments: {} })) as {
        content: unknown[];
        isError?: boolean;
        structuredContent?: unknown;
      };
      assert.notEqual(r.isError, true, 'list_plans must not error');
      assert.ok(Array.isArray(r.content) && r.content.length > 0);
      assert.ok(r.structuredContent, 'structuredContent present for the client');
    } finally {
      await client.close();
      await server.close();
    }
  });
}
