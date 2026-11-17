/**
 * Single source-of-truth version check (P0).
 *
 * Version drift has bitten this server before — the discovery surface once
 * advertised 0.7.0 while the MCP handshake answered 1.5.0. Three files must
 * always agree on the server version:
 *
 *   - package.json        (npm identity, registry install)
 *   - server.json         (MCP registry entry — "keep the registry entry fresh")
 *   - SERVER_VERSION      (the value the initialize handshake returns)
 *
 * If a release bumps one and forgets another, agents and the registry disagree
 * about what they are talking to. This test fails the build on any mismatch.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { SERVER_VERSION } from '../src/server.js';

function readJson(rel: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(process.cwd(), rel), 'utf8'));
}

test('package.json, server.json, and SERVER_VERSION all agree', () => {
  const pkg = readJson('package.json');
  const server = readJson('server.json');

  assert.equal(
    pkg.version,
    SERVER_VERSION,
    `package.json version (${pkg.version}) must equal SERVER_VERSION (${SERVER_VERSION})`,
  );
  assert.equal(
    server.version,
    SERVER_VERSION,
    `server.json version (${server.version}) must equal SERVER_VERSION (${SERVER_VERSION})`,
  );
});

test('SERVER_VERSION is a valid semver string', () => {
  assert.match(
    SERVER_VERSION,
    /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/,
    `SERVER_VERSION "${SERVER_VERSION}" must be semver`,
  );
});

test('server.json remote still points at the canonical MCP endpoint', () => {
  const server = readJson('server.json') as {
    remotes?: Array<{ type?: string; url?: string }>;
  };
  const remotes = server.remotes ?? [];
  assert.ok(remotes.length > 0, 'server.json must declare at least one remote');
  const streamable = remotes.find((r) => r.type === 'streamable-http');
  assert.ok(streamable, 'server.json must declare a streamable-http remote');
  assert.equal(
    streamable?.url,
    'https://agents.hellobooks.ai/mcp',
    'the registry remote must match the documented /mcp endpoint',
  );
});
