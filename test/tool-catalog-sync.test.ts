/**
 * Tool ↔ discovery-catalog sync guard.
 *
 * The set of tools actually registered on the MCP server (what /mcp serves) and
 * TOOL_CATALOG (what the discovery surface — catalog.json, llms.txt, the A2A
 * card, the sitemap — advertises) must be identical. If they drift, an agent
 * that reads the discovery files sees a tool that isn't there, or misses one
 * that is. This test connects a real client, lists the live tools, and asserts
 * the two sets match exactly — so adding a tool without cataloguing it (or the
 * reverse) fails CI instead of shipping a lie in the discovery surface.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

import { createServer } from '../src/server.js';
import { TOOL_CATALOG } from '../src/discovery.js';

process.env.HELLOBOOKS_MCP_DISABLE_PRICING_FEED = '1';
process.env.HELLOBOOKS_MCP_DISABLE_ARTICLES_FEED = '1';

test('every registered MCP tool is in TOOL_CATALOG and vice versa', async () => {
  const server = createServer();
  const [ct, st] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'catalog-sync-probe', version: '1.0.0' }, { capabilities: {} });
  await Promise.all([server.connect(st), client.connect(ct)]);
  try {
    const { tools } = await client.listTools();
    const registered = new Set(tools.map((t) => t.name));
    const cataloged = new Set(TOOL_CATALOG.map((t) => t.name));

    const registeredNotCataloged = [...registered].filter((n) => !cataloged.has(n)).sort();
    const catalogedNotRegistered = [...cataloged].filter((n) => !registered.has(n)).sort();

    assert.deepEqual(
      registeredNotCataloged,
      [],
      `tools registered on the server but missing from TOOL_CATALOG (add them to src/discovery.ts): ${registeredNotCataloged.join(', ')}`,
    );
    assert.deepEqual(
      catalogedNotRegistered,
      [],
      `tools in TOOL_CATALOG but not registered on the server (stale catalog entry): ${catalogedNotRegistered.join(', ')}`,
    );
    assert.equal(registered.size, cataloged.size, 'tool counts must match exactly');
  } finally {
    await client.close();
    await server.close();
  }
});

test('TOOL_CATALOG has no duplicate tool names', () => {
  const names = TOOL_CATALOG.map((t) => t.name);
  assert.equal(new Set(names).size, names.length, 'duplicate tool name in TOOL_CATALOG');
});
