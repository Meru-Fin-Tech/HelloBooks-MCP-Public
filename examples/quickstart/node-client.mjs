// Quickstart: minimal Node client for the HelloBooks public MCP server.
//
//   node examples/quickstart/node-client.mjs
//
// No auth, no config. The @modelcontextprotocol/sdk dependency is already in
// this repo (so this runs as-is here); in your own project:
//   npm install @modelcontextprotocol/sdk
//
// The SDK's StreamableHTTPClientTransport handles the session handshake, the
// required `Accept: application/json, text/event-stream` header, and SSE
// parsing for you — the things curl.md has to do by hand.

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const MCP_URL = 'https://agents.hellobooks.ai/mcp';

const client = new Client({ name: 'hellobooks-quickstart', version: '1.0.0' });

try {
  await client.connect(new StreamableHTTPClientTransport(new URL(MCP_URL)));
  console.log(`Connected to ${MCP_URL}\n`);

  // 1. Discover the tools.
  const { tools } = await client.listTools();
  console.log(`${tools.length} tools available:`);
  for (const tool of tools) console.log(`  - ${tool.name}`);

  // 2. Call one. Tool output is a content array; the JSON payload is the text
  //    of the first content block.
  const res = await client.callTool({
    name: 'list_plans',
    arguments: { country: 'IN' },
  });
  const plans = JSON.parse(res.content[0].text);

  console.log(`\nlist_plans (${plans.country ?? 'default'}):`);
  for (const plan of plans.plans ?? []) {
    console.log(`  ${plan.name}: ${plan.monthly ?? plan.price ?? '—'}`);
  }
} finally {
  await client.close();
}
