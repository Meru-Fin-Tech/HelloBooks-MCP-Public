/**
 * Structured tool output: tools return both a JSON text block (backward compat)
 * and a parsed `structuredContent` object agents can consume directly.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

import { createServer } from '../src/server.js';

process.env.HELLOBOOKS_MCP_DISABLE_PRICING_FEED = '1';
process.env.HELLOBOOKS_MCP_DISABLE_ARTICLES_FEED = '1';

async function connect() {
  const server = createServer();
  const [ct, st] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'structured-probe', version: '1.0.0' }, { capabilities: {} });
  await Promise.all([server.connect(st), client.connect(ct)]);
  return { client, close: async () => { await client.close(); await server.close(); } };
}

function textOf(result: { content: Array<{ type: string; text?: string }> }): string {
  const t = result.content.find((c) => c.type === 'text');
  assert.ok(t?.text, 'result must carry a text content block');
  return t!.text!;
}

test('a .tool() tool returns structuredContent matching its text JSON', async () => {
  const { client, close } = await connect();
  try {
    const r = (await client.callTool({ name: 'recommend_plan', arguments: { country: 'IN', needs: ['gst'] } })) as any;
    assert.ok(r.structuredContent, 'recommend_plan must carry structuredContent');
    assert.equal(typeof r.structuredContent, 'object');
    // structuredContent must equal the parsed text block (same payload, two shapes).
    assert.deepEqual(r.structuredContent, JSON.parse(textOf(r)));
    assert.ok('recommendation' in r.structuredContent, 'typed field is directly accessible');
  } finally {
    await close();
  }
});

test('multiple tools expose structuredContent', async () => {
  const { client, close } = await connect();
  try {
    for (const [name, args] of [
      ['check_integration', { name: 'Stripe' }],
      ['estimate_annual_cost', { plan: 'pro', country: 'US' }],
      ['supported_currencies', {}],
    ] as const) {
      const r = (await client.callTool({ name, arguments: args })) as any;
      assert.ok(r.structuredContent, `${name} must carry structuredContent`);
      assert.deepEqual(r.structuredContent, JSON.parse(textOf(r)), `${name} structured == text`);
    }
  } finally {
    await close();
  }
});

test('search and fetch still honour the OpenAI contract with structuredContent', async () => {
  const { client, close } = await connect();
  try {
    const s = (await client.callTool({ name: 'search', arguments: { query: 'pricing' } })) as any;
    assert.ok(s.structuredContent?.results, 'search structuredContent.results required');
    assert.ok(Array.isArray(s.structuredContent.results));
    const first = s.structuredContent.results[0];
    assert.ok(first?.id && first?.title && /^https?:\/\//.test(first.url));

    const f = (await client.callTool({ name: 'fetch', arguments: { id: first.id } })) as any;
    for (const k of ['id', 'title', 'text', 'url', 'metadata']) {
      assert.ok(k in f.structuredContent, `fetch structuredContent must carry ${k}`);
    }
  } finally {
    await close();
  }
});
