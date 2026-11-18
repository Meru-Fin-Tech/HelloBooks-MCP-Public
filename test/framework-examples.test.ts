/**
 * Framework-example guard (offline, blocking).
 *
 * The runnable scripts under examples/frameworks/ are copy-paste onboarding
 * for LlamaIndex / CrewAI / AutoGen / LangChain users. If one drifts to a
 * stale host, loses its "no auth needed" promise, or stops calling a real
 * tool, we've shipped a broken first impression. This test pins their shape
 * on every CI run without touching the network.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DIR = join(process.cwd(), 'examples', 'frameworks');
const CANONICAL_URL = 'https://agents.hellobooks.ai/mcp';

const EXPECTED_SCRIPTS = [
  'autogen_example.py',
  'crewai_example.py',
  'langchain_example.py',
  'llamaindex_example.py',
];

function read(rel: string): string {
  return readFileSync(join(DIR, rel), 'utf8');
}

test('all four framework example scripts exist', () => {
  const present = readdirSync(DIR).filter((f) => f.endsWith('.py')).sort();
  assert.deepEqual(present, EXPECTED_SCRIPTS);
});

for (const script of EXPECTED_SCRIPTS) {
  test(`${script} references the canonical MCP URL`, () => {
    assert.ok(read(script).includes(CANONICAL_URL), `${script} must point at ${CANONICAL_URL}`);
  });

  test(`${script} calls a real tool (list_plans or recommend_plan)`, () => {
    const body = read(script);
    assert.ok(
      body.includes('list_plans') || body.includes('recommend_plan'),
      `${script} must call list_plans or recommend_plan`,
    );
  });

  test(`${script} flags the live network call`, () => {
    assert.ok(/live/i.test(read(script)), `${script} must note it hits a live endpoint`);
  });
}

test('README indexes every script with install + run commands', () => {
  const readme = read('README.md');
  assert.ok(readme.includes(CANONICAL_URL));
  assert.ok(/no api key/i.test(readme), 'README must state no API key is needed');
  for (const script of EXPECTED_SCRIPTS) {
    assert.ok(readme.includes(`python ${script}`), `README must show "python ${script}"`);
  }
});
