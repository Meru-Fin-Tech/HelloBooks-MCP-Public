/**
 * Every tool on this server must advertise itself as a read-only lookup.
 *
 * Without `readOnlyHint`, a host (ChatGPT, Claude) has to assume a tool may be
 * destructive and prompts the user for approval on every call — pure friction
 * on a public catalog server. These tests go through a real MCP client over an
 * in-memory transport, so they assert what a host actually receives from
 * `tools/list`, not what the registration source looks like.
 *
 * Deliberately count-agnostic: the invariant is "every tool is annotated", so
 * adding a tool does not require editing this file — it just has to be
 * annotated like the rest.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

import { createServer } from '../src/server.js';

async function listTools() {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'annotation-test', version: '1.0.0' });
  const server = createServer();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  try {
    return (await client.listTools()).tools;
  } finally {
    await client.close();
    await server.close();
  }
}

test('tools/list is non-empty and includes known tools', async () => {
  const tools = await listTools();
  // Guards against the annotation assertions passing vacuously on an empty list.
  assert.ok(tools.length >= 29, `expected at least 29 tools, got ${tools.length}`);
  const names = tools.map((t) => t.name);
  for (const expected of ['list_plans', 'list_credit_packs', 'how_munimji_helps']) {
    assert.ok(names.includes(expected), `missing tool ${expected}`);
  }
});

test('every tool declares readOnlyHint: true', async () => {
  const tools = await listTools();
  const missing = tools
    .filter((t) => t.annotations?.readOnlyHint !== true)
    .map((t) => t.name);
  assert.deepEqual(
    missing,
    [],
    `tools without readOnlyHint: true (hosts will prompt for approval): ${missing.join(', ')}`,
  );
});

test('no tool claims an open world', async () => {
  const tools = await listTools();
  // openWorldHint defaults to true when absent, so it must be explicitly false.
  // Every data source is a closed, enumerable catalog. list_plans and
  // list_credit_packs federate prices from hellobooks.ai, but the fetch is a
  // throttled background overlay a tool call never blocks on — see the
  // rationale in src/server.ts.
  const open = tools
    .filter((t) => t.annotations?.openWorldHint !== false)
    .map((t) => t.name);
  assert.deepEqual(open, [], `tools not declaring openWorldHint: false: ${open.join(', ')}`);
});
