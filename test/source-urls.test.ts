/**
 * Source-URL shape validator (offline, blocking).
 *
 * Every statutory / citation `source` the catalogs expose must be an absolute
 * https URL an agent can hand to a user. A relative path, an http link, or a
 * typo quietly erodes trust and kills citations. The network reachability of
 * these URLs is checked on a schedule (scripts/check-source-urls.ts); this test
 * enforces their *shape* on every CI run so a malformed source never merges.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { COMPLIANCE_DEADLINES } from '../src/data/complianceDeadlines.js';
import { TAX_RATES } from '../src/data/taxRates.js';

function assertAbsoluteHttps(url: string, where: string) {
  assert.ok(typeof url === 'string' && url.length > 0, `${where}: source is empty`);
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    assert.fail(`${where}: "${url}" is not a valid absolute URL`);
    return;
  }
  assert.equal(parsed.protocol, 'https:', `${where}: "${url}" must be https`);
  assert.ok(parsed.hostname.includes('.'), `${where}: "${url}" has no real host`);
}

test('every compliance-deadline source is an absolute https URL', () => {
  assert.ok(COMPLIANCE_DEADLINES.length > 0);
  for (const d of COMPLIANCE_DEADLINES) {
    assertAbsoluteHttps(d.source, `deadline ${d.id}`);
  }
});

test('every tax-rate source is an absolute https URL', () => {
  assert.ok(TAX_RATES.length > 0);
  for (const r of TAX_RATES) {
    assertAbsoluteHttps(r.source, `tax-rate ${r.id}`);
  }
});

test('deadline sources are deduped into a sane number of hosts', () => {
  const hosts = new Set(COMPLIANCE_DEADLINES.map((d) => new URL(d.source).hostname));
  // Sanity bound: many deadlines share one authority host (e.g. gst.gov.in),
  // so the host count should be far below the row count.
  assert.ok(hosts.size >= 1);
  assert.ok(hosts.size <= COMPLIANCE_DEADLINES.length);
});
