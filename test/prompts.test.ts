/**
 * MCP Prompts: the curated flows must list and render through a real client.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

import { createServer } from '../src/server.js';
import { PROMPTS } from '../src/prompts/index.js';

process.env.HELLOBOOKS_MCP_DISABLE_PRICING_FEED = '1';
process.env.HELLOBOOKS_MCP_DISABLE_ARTICLES_FEED = '1';

async function connect() {
  const server = createServer();
  const [ct, st] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'prompt-probe', version: '1.0.0' }, { capabilities: {} });
  await Promise.all([server.connect(st), client.connect(ct)]);
  return { client, close: async () => { await client.close(); await server.close(); } };
}

test('server advertises the prompts capability and lists every curated prompt', async () => {
  const { client, close } = await connect();
  try {
    assert.ok(client.getServerCapabilities()?.prompts, 'prompts capability must be negotiated');
    const { prompts } = await client.listPrompts();
    const names = new Set(prompts.map((p) => p.name));
    for (const p of PROMPTS) {
      assert.ok(names.has(p.name), `prompts/list must include ${p.name}`);
    }
    for (const p of prompts) {
      assert.ok(p.description && p.description.length > 0, `${p.name} needs a description`);
    }
  } finally {
    await close();
  }
});

test('getPrompt renders a non-empty user message that names the right tools', async () => {
  const { client, close } = await connect();
  try {
    const plan = await client.getPrompt({
      name: 'which_plan_for_me',
      arguments: { country: 'IN', needs: 'GST filing, multi-currency' },
    });
    assert.ok(plan.messages.length > 0);
    const msg = plan.messages[0];
    assert.equal(msg.role, 'user');
    const text = (msg.content as { type: string; text: string }).text;
    assert.match(text, /recommend_plan/);
    assert.match(text, /estimate_annual_cost/);
    assert.match(text, /IN/);

    const cmp = await client.getPrompt({
      name: 'compare_to_competitor',
      arguments: { competitor: 'Xero', country: 'GB' },
    });
    const cmpText = (cmp.messages[0].content as { type: string; text: string }).text;
    assert.match(cmpText, /list_competitors/);
    assert.match(cmpText, /Xero/);
  } finally {
    await close();
  }
});

test('prompt arguments offer completions from the real catalogs', async () => {
  const { client, close } = await connect();
  try {
    // Country codes: "I" → IN, ID, IE, IT, …
    const country = await client.complete({
      ref: { type: 'ref/prompt', name: 'whats_due_next' },
      argument: { name: 'country', value: 'I' },
    });
    assert.ok(country.completion.values.includes('IN'), 'country completion should offer IN');
    assert.ok(country.completion.values.every((v) => v.toUpperCase().startsWith('I')));

    // Competitor names/ids: "X" → Xero.
    const competitor = await client.complete({
      ref: { type: 'ref/prompt', name: 'compare_to_competitor' },
      argument: { name: 'competitor', value: 'X' },
    });
    assert.ok(
      competitor.completion.values.some((v) => /xero/i.test(v)),
      'competitor completion should offer Xero',
    );

    // Integration names: "Str" → Stripe.
    const integration = await client.complete({
      ref: { type: 'ref/prompt', name: 'integration_and_payments_check' },
      argument: { name: 'name', value: 'Str' },
    });
    assert.ok(
      integration.completion.values.some((v) => /stripe/i.test(v)),
      'integration completion should offer Stripe',
    );
  } finally {
    await close();
  }
});

test('every prompt builds a message for its documented args', () => {
  for (const p of PROMPTS) {
    const text = p.build({ country: 'US', competitor: 'QuickBooks', name: 'Stripe', withinDays: '30', needs: 'api' });
    assert.ok(typeof text === 'string' && text.length > 20, `${p.name} must build a message`);
  }
});
