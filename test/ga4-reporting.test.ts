/**
 * Tests for the optional GA4 Data API reader (src/reporting/).
 *
 * Covered guarantees:
 *   1. Reporting is DISABLED unless all three credentials are present, and a
 *      bad property id is rejected.
 *   2. Private-key normalization unescapes `\n` and strips wrapping quotes.
 *   3. The signed JWT is real RS256 over the correct header.claims input.
 *   4. runReport rows parse into flat dimension/metric arrays (missing → 0).
 *   5. Date tokens validate; invalid ranges throw.
 *   6. The endpoint router is null when disabled, and the token guard is
 *      length-safe and constant-shape.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, createVerify } from 'node:crypto';

import {
  buildSignedJwt,
  normalizePrivateKey,
  parseRows,
  reportingConfig,
  reportingEnabled,
  resetTokenCache,
  type RunReportResponse,
} from '../src/reporting/ga4DataApi.js';
import {
  isValidDateToken,
  resolveDateRange,
  MCP_EVENT_NAMES,
} from '../src/reporting/mcpReports.js';
import {
  createReportingRouter,
  presentedToken,
  tokensMatch,
} from '../src/reporting/endpoint.js';

/** Snapshot + restore the reporting env vars around a test body. */
function withEnv(vars: Record<string, string | undefined>, fn: () => void): void {
  const keys = [
    'GA4_PROPERTY_ID',
    'GA4_SA_CLIENT_EMAIL',
    'GA4_SA_PRIVATE_KEY',
    'GA4_REPORTING_TOKEN',
  ];
  const saved = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  try {
    for (const k of keys) delete process.env[k];
    for (const [k, v] of Object.entries(vars)) {
      if (v !== undefined) process.env[k] = v;
    }
    resetTokenCache();
    fn();
  } finally {
    for (const k of keys) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
    resetTokenCache();
  }
}

const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const PEM = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();

test('reporting is disabled unless all three credentials are present', () => {
  withEnv({}, () => {
    assert.equal(reportingEnabled(), false);
    assert.equal(reportingConfig(), null);
  });
  withEnv({ GA4_PROPERTY_ID: '123', GA4_SA_CLIENT_EMAIL: 'a@b.iam' }, () => {
    assert.equal(reportingEnabled(), false); // missing key
  });
  withEnv(
    {
      GA4_PROPERTY_ID: '123456789',
      GA4_SA_CLIENT_EMAIL: 'a@b.iam.gserviceaccount.com',
      GA4_SA_PRIVATE_KEY: PEM,
    },
    () => {
      assert.equal(reportingEnabled(), true);
      assert.equal(reportingConfig()?.propertyId, '123456789');
    },
  );
});

test('a non-numeric property id is rejected', () => {
  withEnv(
    {
      GA4_PROPERTY_ID: 'G-ABC123',
      GA4_SA_CLIENT_EMAIL: 'a@b.iam',
      GA4_SA_PRIVATE_KEY: PEM,
    },
    () => {
      assert.equal(reportingConfig(), null);
    },
  );
});

test('normalizePrivateKey unescapes newlines and strips quotes', () => {
  assert.equal(normalizePrivateKey('a\\nb'), 'a\nb');
  assert.equal(normalizePrivateKey('"a\\nb"'), 'a\nb');
  assert.equal(normalizePrivateKey("'line1\\nline2'"), 'line1\nline2');
});

test('buildSignedJwt produces a verifiable RS256 assertion', () => {
  const jwt = buildSignedJwt({ clientEmail: 'svc@x.iam', privateKey: PEM }, 1000);
  const parts = jwt.split('.');
  assert.equal(parts.length, 3);

  const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
  const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
  assert.equal(header.alg, 'RS256');
  assert.equal(claims.iss, 'svc@x.iam');
  assert.equal(claims.iat, 1000);
  assert.equal(claims.exp, 4600);
  assert.match(claims.scope, /analytics\.readonly/);

  const verifier = createVerify('RSA-SHA256');
  verifier.update(`${parts[0]}.${parts[1]}`);
  verifier.end();
  const ok = verifier.verify(PEM, Buffer.from(parts[2], 'base64url'));
  assert.equal(ok, true);
});

test('parseRows flattens dimensions/metrics and coerces missing to 0', () => {
  const report: RunReportResponse = {
    rows: [
      { dimensionValues: [{ value: '20260606' }], metricValues: [{ value: '42' }] },
      { dimensionValues: [{ value: 'chatgpt' }], metricValues: [{ value: undefined }] },
      {},
    ],
  };
  assert.deepEqual(parseRows(report), [
    { dimensions: ['20260606'], metrics: [42] },
    { dimensions: ['chatgpt'], metrics: [0] },
    { dimensions: [], metrics: [] },
  ]);
  assert.deepEqual(parseRows({}), []);
});

test('date token validation and range resolution', () => {
  for (const ok of ['today', 'yesterday', '7daysAgo', '2026-06-06']) {
    assert.equal(isValidDateToken(ok), true, ok);
  }
  for (const bad of ['now', 'tomorrow', '2026/06/06', 'DROP TABLE', '']) {
    assert.equal(isValidDateToken(bad), false, bad);
  }
  assert.deepEqual(resolveDateRange(), { startDate: '27daysAgo', endDate: 'today' });
  assert.deepEqual(resolveDateRange('2026-06-01', 'today'), {
    startDate: '2026-06-01',
    endDate: 'today',
  });
  assert.throws(() => resolveDateRange('garbage', 'today'), /Invalid start date/);
  assert.throws(() => resolveDateRange('today', 'garbage'), /Invalid end date/);
});

test('the four MCP event names are exactly the documented set', () => {
  assert.deepEqual(
    [...MCP_EVENT_NAMES],
    ['mcp_request', 'mcp_tool_call', 'mcp_bot_visit', 'mcp_error'],
  );
});

test('reporting router is null unless reporting AND a token are configured', () => {
  withEnv({}, () => {
    assert.equal(createReportingRouter(), null);
  });
  // Credentials present but no token → still disabled.
  withEnv(
    {
      GA4_PROPERTY_ID: '123456789',
      GA4_SA_CLIENT_EMAIL: 'a@b.iam',
      GA4_SA_PRIVATE_KEY: PEM,
    },
    () => {
      assert.equal(createReportingRouter(), null);
    },
  );
  // Credentials + token → router exists.
  withEnv(
    {
      GA4_PROPERTY_ID: '123456789',
      GA4_SA_CLIENT_EMAIL: 'a@b.iam',
      GA4_SA_PRIVATE_KEY: PEM,
      GA4_REPORTING_TOKEN: 'secret-token',
    },
    () => {
      assert.notEqual(createReportingRouter(), null);
    },
  );
});

test('tokensMatch is length-safe and value-correct', () => {
  assert.equal(tokensMatch('abc', 'abc'), true);
  assert.equal(tokensMatch('abc', 'abd'), false);
  assert.equal(tokensMatch('abc', 'abcd'), false); // differing length
  assert.equal(tokensMatch('', 'x'), false);
});

test('presentedToken reads Bearer and x-reporting-token headers', () => {
  const reqWith = (headers: Record<string, string>) => ({
    header: (name: string) => headers[name.toLowerCase()],
  });
  assert.equal(
    presentedToken(reqWith({ authorization: 'Bearer tok123' }) as never),
    'tok123',
  );
  assert.equal(
    presentedToken(reqWith({ 'x-reporting-token': 'tok456' }) as never),
    'tok456',
  );
  assert.equal(presentedToken(reqWith({}) as never), '');
});
