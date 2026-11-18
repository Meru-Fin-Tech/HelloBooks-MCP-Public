// Guard the ready-to-drop-in client config files in examples/clients/.
// Each must be valid JSON and point at the canonical public MCP endpoint, so a
// user who copies one gets a working connection and the files never drift from
// the server's real URL.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const CANONICAL_URL = 'https://agents.hellobooks.ai/mcp';
const here = dirname(fileURLToPath(import.meta.url));
const clientsDir = join(here, '..', 'examples', 'clients');

const jsonFiles = readdirSync(clientsDir).filter((f) => f.endsWith('.json'));

test('examples/clients ships at least the core client configs', () => {
  assert.ok(jsonFiles.length >= 6, `expected >=6 client config files, found ${jsonFiles.length}`);
});

for (const file of jsonFiles) {
  test(`${file} is valid JSON and references the canonical MCP URL`, () => {
    const raw = readFileSync(join(clientsDir, file), 'utf8');
    let parsed: unknown;
    assert.doesNotThrow(() => {
      parsed = JSON.parse(raw);
    }, `${file} is not valid JSON`);
    assert.equal(typeof parsed, 'object');
    // The canonical URL must appear verbatim somewhere in the file (as a URL
    // field, or inside mcp-remote args for stdio bridges like Claude Desktop).
    assert.ok(
      raw.includes(CANONICAL_URL),
      `${file} does not contain the canonical endpoint ${CANONICAL_URL}`,
    );
  });
}
