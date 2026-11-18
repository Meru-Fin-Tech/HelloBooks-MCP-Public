/**
 * Guard test for the no-code and voice recipe docs under examples/.
 *
 * These recipes hard-code the public endpoint and the voice knowledge-pack
 * route. If either ever moves, the docs would silently point agents at a dead
 * URL. This test fails the build instead, keeping the copy-paste recipes honest
 * against what src/ actually serves.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (rel: string): string => readFileSync(join(root, rel), 'utf8');

const MCP_ENDPOINT = 'https://agents.hellobooks.ai/mcp';
const VOICE_ENDPOINT = 'https://agents.hellobooks.ai/kb/voice.json';

const NOCODE_FILES = [
  'examples/no-code/README.md',
  'examples/no-code/n8n.md',
  'examples/no-code/make.md',
  'examples/no-code/zapier.md',
  'examples/no-code/n8n-workflow.json',
];

const VOICE_FILES = ['examples/voice/README.md', 'examples/voice/vapi-retell-starter.md'];

test('all recipe files exist', () => {
  for (const f of [...NOCODE_FILES, ...VOICE_FILES]) {
    assert.ok(existsSync(join(root, f)), `missing recipe file: ${f}`);
  }
});

test('every no-code recipe cites the canonical MCP endpoint', () => {
  for (const f of NOCODE_FILES) {
    assert.ok(read(f).includes(MCP_ENDPOINT), `${f} does not reference ${MCP_ENDPOINT}`);
  }
});

test('the n8n importable workflow is valid JSON with the MCP endpoint', () => {
  const wf = JSON.parse(read('examples/no-code/n8n-workflow.json'));
  assert.ok(Array.isArray(wf.nodes) && wf.nodes.length >= 2, 'workflow should have nodes');
  const json = JSON.stringify(wf);
  assert.ok(json.includes(MCP_ENDPOINT), 'workflow must point at the MCP endpoint');
  assert.ok(json.includes('recommend_plan'), 'workflow should call recommend_plan');
});

test('voice recipes cite the voice knowledge-pack endpoint and its country param', () => {
  const combined = VOICE_FILES.map(read).join('\n');
  assert.ok(combined.includes(VOICE_ENDPOINT), `voice recipes must reference ${VOICE_ENDPOINT}`);
  assert.ok(combined.includes('country='), 'voice recipes must document the country query param');
});

test('the voice route the recipes cite is actually served by src', () => {
  // The router mounts /voice.json; src/http.ts mounts that router under /kb.
  assert.ok(read('src/voiceKnowledgeRouter.ts').includes("'/voice.json'"), 'router must serve /voice.json');
  assert.ok(read('src/http.ts').includes("'/kb'"), 'http.ts must mount the voice router at /kb');
});
