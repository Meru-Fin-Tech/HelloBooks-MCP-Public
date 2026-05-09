/**
 * Public-data audit — fail the test run if any forbidden token shows up in the
 * data layer. This is the single most important safety check for this server.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const FORBIDDEN_TOKENS = [
  // Customer / org identifiers
  'orgId', 'OrgId', 'org_id',
  'entityId', 'EntityId', 'entity_id',
  'customerId', 'CustomerId',
  'userId', 'UserId',
  // Auth
  'jwt', 'JWT', 'bearer', 'Bearer',
  'accessToken', 'refreshToken',
  'apiKey', 'API_KEY', 'API-KEY',
  'secret_key', 'SECRET_KEY',
  // Real customer data leakers
  'mongodb://', 'postgres://', 'postgresql://',
  'AKIA', // AWS access key prefix
  'AccountNumber',
  'SSN', 'TaxId', 'TaxID',
  // Internal infra
  'meru-fin-tech.internal', 'azure-pg-prod',
];

const DATA_DIR = join(process.cwd(), 'src', 'data');

test('public data files contain no PII or auth tokens', () => {
  const files = readdirSync(DATA_DIR).filter((f) => f.endsWith('.ts'));
  assert.ok(files.length > 0, 'expected at least one data file');
  for (const f of files) {
    const content = readFileSync(join(DATA_DIR, f), 'utf8');
    for (const token of FORBIDDEN_TOKENS) {
      assert.equal(
        content.includes(token),
        false,
        `Forbidden token "${token}" found in src/data/${f}. ` +
          'This MCP server is public — it must never reference customer or auth fields.',
      );
    }
  }
});

test('no environment variables read in data layer', () => {
  const files = readdirSync(DATA_DIR).filter((f) => f.endsWith('.ts'));
  for (const f of files) {
    const content = readFileSync(join(DATA_DIR, f), 'utf8');
    assert.equal(
      content.includes('process.env'),
      false,
      `src/data/${f} reads process.env. Public data must be static — no secrets, no env-driven config.`,
    );
  }
});
