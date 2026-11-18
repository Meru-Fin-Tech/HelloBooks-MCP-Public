import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

/**
 * Guards for examples/quickstart/. These assert ONLY that the copy-paste
 * quickstart files exist and point callers at the canonical public endpoint —
 * they never hit the live server, so the suite stays hermetic and fast.
 */

const QUICKSTART_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'examples', 'quickstart');
const CANONICAL_URL = 'https://agents.hellobooks.ai/mcp';

const read = (name: string): string => readFileSync(join(QUICKSTART_DIR, name), 'utf8');

const FILES = ['README.md', 'curl.md', 'node-client.mjs', 'python-client.py'] as const;

for (const name of FILES) {
  test(`${name} exists and references the canonical MCP URL`, () => {
    const body = read(name);
    assert.ok(body.length > 0, `${name} is empty`);
    assert.ok(body.includes(CANONICAL_URL), `${name} does not reference ${CANONICAL_URL}`);
  });
}

test('curl.md documents the required Accept header and the 406 it avoids', () => {
  const body = read('curl.md');
  assert.ok(body.includes('application/json, text/event-stream'), 'missing Accept header value');
  assert.match(body, /406/);
});

test('node-client.mjs imports the SDK client via the subpaths this repo ships', () => {
  const body = read('node-client.mjs');
  assert.ok(body.includes("@modelcontextprotocol/sdk/client/index.js"));
  assert.ok(body.includes("@modelcontextprotocol/sdk/client/streamableHttp.js"));
});

test('python-client.py tells the reader to install the mcp package', () => {
  const body = read('python-client.py');
  assert.ok(body.includes('pip install mcp'), 'missing pip install mcp line');
});
