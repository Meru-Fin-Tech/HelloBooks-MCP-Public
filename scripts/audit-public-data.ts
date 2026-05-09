/**
 * Standalone public-data audit. Run as part of CI before any deploy.
 * Mirrors test/public-data.test.ts but exits non-zero on any finding so it can
 * gate a release pipeline.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const FORBIDDEN_TOKENS = [
  'orgId', 'OrgId', 'org_id',
  'entityId', 'EntityId', 'entity_id',
  'customerId', 'CustomerId',
  'userId', 'UserId',
  'jwt', 'JWT', 'bearer', 'Bearer',
  'accessToken', 'refreshToken',
  'apiKey', 'API_KEY', 'API-KEY',
  'secret_key', 'SECRET_KEY',
  'mongodb://', 'postgres://', 'postgresql://',
  'AKIA',
  'AccountNumber',
  'SSN', 'TaxId', 'TaxID',
  'meru-fin-tech.internal', 'azure-pg-prod',
];

const DATA_DIR = join(process.cwd(), 'src', 'data');
const findings: string[] = [];

const files = readdirSync(DATA_DIR).filter((f) => f.endsWith('.ts'));
for (const f of files) {
  const content = readFileSync(join(DATA_DIR, f), 'utf8');
  for (const token of FORBIDDEN_TOKENS) {
    if (content.includes(token)) {
      findings.push(`src/data/${f}: contains "${token}"`);
    }
  }
  if (content.includes('process.env')) {
    findings.push(`src/data/${f}: reads process.env (data must be static)`);
  }
}

if (findings.length > 0) {
  console.error('public-data audit FAILED:');
  for (const f of findings) console.error(`  - ${f}`);
  process.exit(1);
}

console.log(`public-data audit OK (${files.length} files scanned).`);
