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
  'secret_key', 'SECRET_KEY', 'client_secret', 'clientSecret',
  'mongodb://', 'postgres://', 'postgresql://', 'redis://', 'mysql://', 'amqp://',
  'AKIA',
  'AccountNumber',
  'SSN', 'TaxId', 'TaxID',
  'meru-fin-tech.internal', 'azure-pg-prod',
  // Provider secret-key prefixes that must never appear in static catalogs.
  'sk_live_', 'sk_test_', 'rk_live_', 'pk_live_', 'whsec_',
  'ghp_', 'gho_', 'github_pat_',
  'xoxb-', 'xoxp-', 'xapp-',
  'AIza', 'ya29.',
  // Private-key / credential block markers.
  'BEGIN RSA PRIVATE KEY', 'BEGIN PRIVATE KEY', 'BEGIN OPENSSH PRIVATE KEY',
  'PRIVATE_KEY', 'privateKey',
];

/**
 * Regex probes for shapes that no public marketing catalog should contain.
 * Kept deliberately narrow so legitimate public data (hello@hellobooks.ai,
 * hellobooks.ai URLs, public phone/support lines) is never flagged.
 */
const FORBIDDEN_PATTERNS: Array<{ label: string; re: RegExp }> = [
  // A JWT: three base64url segments separated by dots, starting with the
  // standard `eyJ` header. Long enough to avoid matching ordinary prose.
  { label: 'JWT-shaped token', re: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/ },
  // AWS secret access key (40-char base64) adjacent to an AWS hint.
  { label: 'AWS secret access key', re: /aws(.{0,20})?[A-Za-z0-9/+]{40}/i },
  // A full private/loopback IPv4 address (dotted quad) — a price like "10.49"
  // or a tax rate "10.25" must not trip this, so all four octets are required.
  { label: 'private network host', re: /\b(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|127\.0\.0\.1|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})\b/ },
  // A non-public email address (anything not @hellobooks.ai / @merufintech.*).
  { label: 'non-public email', re: /[A-Za-z0-9._%+-]+@(?!hellobooks\.ai|merufintech\.)[A-Za-z0-9.-]+\.[A-Za-z]{2,}/ },
];

const DATA_DIR = join(process.cwd(), 'src', 'data');
const findings: string[] = [];

// Scan the hand-authored TypeScript catalogs. The generated *.json API
// reference (developerApi.json) is the *published* API schema and legitimately
// contains parameter NAMES like `orgId` / `bearer`; auditing it here would flag
// public field names as secrets, so it is covered by its own sync validation.
const files = readdirSync(DATA_DIR).filter((f) => f.endsWith('.ts'));
for (const f of files) {
  const content = readFileSync(join(DATA_DIR, f), 'utf8');
  for (const token of FORBIDDEN_TOKENS) {
    if (content.includes(token)) {
      findings.push(`src/data/${f}: contains "${token}"`);
    }
  }
  for (const { label, re } of FORBIDDEN_PATTERNS) {
    const m = content.match(re);
    if (m) {
      findings.push(`src/data/${f}: matches ${label} ("${m[0].slice(0, 40)}…")`);
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
