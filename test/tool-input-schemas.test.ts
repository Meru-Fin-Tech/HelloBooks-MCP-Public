/**
 * Input-validation audit (#73): every tool validates its arguments with a real
 * JSON-Schema object (derived from zod). A tool without a proper input schema
 * can't reject malformed calls, so a client/agent gets opaque failures instead
 * of a clean validation error. This connects a real MCP client and asserts the
 * contract across the whole surface.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

import { createServer } from '../src/server.js';

process.env.HELLOBOOKS_MCP_DISABLE_PRICING_FEED = '1';
process.env.HELLOBOOKS_MCP_DISABLE_ARTICLES_FEED = '1';

test('every tool exposes an object input schema', async () => {
  const server = createServer();
  const [ct, st] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'schema-audit', version: '1.0.0' }, { capabilities: {} });
  await Promise.all([server.connect(st), client.connect(ct)]);
  try {
    const { tools } = await client.listTools();
    assert.ok(tools.length > 0);
    for (const t of tools) {
      const schema = t.inputSchema as { type?: string; properties?: unknown; additionalProperties?: unknown };
      assert.ok(schema, `${t.name} must have an inputSchema`);
      assert.equal(schema.type, 'object', `${t.name} inputSchema must be an object`);
      // An object schema must declare properties (even {} for no-arg tools) so
      // clients know the exact arg shape rather than guessing.
      assert.ok(
        typeof schema.properties === 'object' && schema.properties !== null,
        `${t.name} inputSchema must declare properties`,
      );
    }
  } finally {
    await client.close();
    await server.close();
  }
});

test('an unknown tool name is rejected, not silently accepted', async () => {
  const server = createServer();
  const [ct, st] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'schema-audit-2', version: '1.0.0' }, { capabilities: {} });
  await Promise.all([server.connect(st), client.connect(ct)]);
  try {
    // The SDK may surface an unknown tool as a rejection OR as an error result
    // (isError: true) — either is a safe failure; silently succeeding is not.
    let failed = false;
    try {
      const r = (await client.callTool({ name: 'does_not_exist', arguments: {} })) as { isError?: boolean };
      failed = r.isError === true;
    } catch {
      failed = true;
    }
    assert.ok(failed, 'calling an unknown tool must fail (reject or isError), not succeed');
  } finally {
    await client.close();
    await server.close();
  }
});
