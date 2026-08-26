/**
 * Layer-2 *read* support — GA4 Data API v1beta.
 *
 * This is the READ counterpart to src/analytics.ts. The Measurement Protocol
 * (src/analytics.ts) remains the only *writer*; nothing here emits events. This
 * module signs a service-account JWT, exchanges it for a short-lived OAuth2
 * access token, and runs read-only reports against the GA4 Data API so we can
 * answer "how many mcp_* events happened" without standing up a database.
 *
 * Design rules (mirror the writer's, do not relax):
 *   1. Fully OPTIONAL. No-op / disabled unless ALL three reporting env vars are
 *      present (GA4_PROPERTY_ID, GA4_SA_CLIENT_EMAIL, GA4_SA_PRIVATE_KEY). A
 *      deploy without them runs exactly as before — no new required config.
 *   2. Independent of the writer. Uses its OWN credentials (a read-scoped
 *      service account), never the Measurement Protocol api_secret.
 *   3. Never expose credentials. The private key and access token never appear
 *      in return values, thrown error messages, or logs.
 *   4. No local persistence of GA4 results. Reports are fetched live and
 *      returned to the caller; only the short-lived access token is cached in
 *      process memory (a credential, not a result).
 *   5. Zero new dependencies — JWT is signed with node:crypto, transport is
 *      fetch, exactly like the rest of this repo.
 */

import { createSign } from 'node:crypto';
import { readFileSync } from 'node:fs';

const TOKEN_URI = 'https://oauth2.googleapis.com/token';
const DATA_API_BASE = 'https://analyticsdata.googleapis.com/v1beta';
/** Read-only scope — the service account cannot mutate anything in GA4. */
const SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';
/** Refresh the cached token this many ms before its real expiry. */
const TOKEN_SKEW_MS = 60_000;

/** Resolved reporting credentials. Never logged or returned to callers. */
export interface ReportingConfig {
  propertyId: string;
  clientEmail: string;
  privateKey: string;
}

/**
 * Normalise a PEM private key supplied via an env var.
 *
 * Secrets pasted into `.env` files or CI secret stores routinely arrive with
 * the newlines escaped as the two characters `\n`; PEM parsing needs real
 * newlines. Surrounding quotes (also common from CI) are stripped.
 */
export function normalizePrivateKey(raw: string): string {
  let key = raw.trim();
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }
  return key.replaceAll('\\n', '\n');
}

/**
 * Resolve reporting credentials from the environment on every call (read at
 * call time, not module load, so tests and runtime can toggle config).
 *
 * @returns the config triple, or `null` when reporting is not configured.
 */
export function reportingConfig(): ReportingConfig | null {
  const propertyId = process.env.GA4_PROPERTY_ID?.trim();
  const clientEmail = process.env.GA4_SA_CLIENT_EMAIL?.trim();
  const rawKey = process.env.GA4_SA_PRIVATE_KEY;
  if (!propertyId || !clientEmail || !rawKey) return null;

  const privateKey = normalizePrivateKey(rawKey);
  if (!privateKey) return null;

  // GA4 property ids are numeric ("123456789"); reject anything else early so a
  // typo can't be interpolated into the request URL.
  if (!/^\d+$/.test(propertyId)) return null;

  return { propertyId, clientEmail, privateKey };
}

/** True only when all three Data API reporting credentials are present. */
export function reportingEnabled(): boolean {
  return reportingConfig() !== null;
}

/** Base64url without padding — JWT segment encoding. */
function base64url(input: string | Buffer): string {
  return Buffer.from(input).toString('base64url');
}

/**
 * Build and sign a service-account JWT assertion (RS256) for the OAuth2
 * token exchange. Pure crypto — no network.
 */
export function buildSignedJwt(
  cfg: Pick<ReportingConfig, 'clientEmail' | 'privateKey'>,
  nowSec: number = Math.floor(Date.now() / 1000),
): string {
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64url(
    JSON.stringify({
      iss: cfg.clientEmail,
      scope: SCOPE,
      aud: TOKEN_URI,
      iat: nowSec,
      exp: nowSec + 3600,
    }),
  );
  const signingInput = `${header}.${claims}`;
  const signer = createSign('RSA-SHA256');
  signer.update(signingInput);
  signer.end();
  const signature = signer.sign(cfg.privateKey).toString('base64url');
  return `${signingInput}.${signature}`;
}

// In-memory access-token cache. A credential, not a result — never persisted to
// disk. Keyed implicitly by the single configured service account.
let tokenCache: { token: string; expiresAtMs: number } | null = null;

/** Reset the cached access token. Exposed for tests. */
export function resetTokenCache(): void {
  tokenCache = null;
}

/**
 * Obtain a (cached) OAuth2 access token via the service-account JWT-bearer
 * grant. Throws a credential-free error on failure.
 */
async function getAccessToken(cfg: ReportingConfig): Promise<string> {
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAtMs - TOKEN_SKEW_MS > now) {
    return tokenCache.token;
  }

  const assertion = buildSignedJwt(cfg);
  const res = await fetch(TOKEN_URI, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  if (!res.ok) {
    // Deliberately do NOT include the response body — Google echoes parts of the
    // assertion on some errors, and we never want credentials in a log line.
    throw new Error(`GA4 token exchange failed (HTTP ${res.status}).`);
  }

  const data = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) {
    throw new Error('GA4 token exchange returned no access_token.');
  }

  const expiresInMs = (data.expires_in ?? 3600) * 1000;
  tokenCache = { token: data.access_token, expiresAtMs: now + expiresInMs };
  return data.access_token;
}

// --- Data API request/response shapes (only the fields we use) -------------

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface RunReportRequest {
  dateRanges: DateRange[];
  dimensions?: { name: string }[];
  metrics: { name: string }[];
  dimensionFilter?: unknown;
  orderBys?: unknown[];
  limit?: number;
}

export interface RunReportResponse {
  dimensionHeaders?: { name: string }[];
  metricHeaders?: { name: string; type?: string }[];
  rows?: {
    dimensionValues?: { value?: string }[];
    metricValues?: { value?: string }[];
  }[];
  rowCount?: number;
}

/** A flattened report row: parallel dimension + metric value arrays. */
export interface ReportRow {
  dimensions: string[];
  metrics: number[];
}

/**
 * Flatten a runReport response into simple rows. Pure — unit-testable without
 * any network. Missing/absent metric values coerce to 0.
 */
export function parseRows(report: RunReportResponse): ReportRow[] {
  return (report.rows ?? []).map((row) => ({
    dimensions: (row.dimensionValues ?? []).map((d) => d.value ?? ''),
    metrics: (row.metricValues ?? []).map((m) => {
      const n = Number(m.value);
      return Number.isFinite(n) ? n : 0;
    }),
  }));
}

/**
 * Run a read-only report against the configured GA4 property.
 *
 * @throws if reporting is not configured, or the Data API call fails. Errors
 *         never contain the private key or access token.
 */
export async function runReport(body: RunReportRequest): Promise<RunReportResponse> {
  const cfg = reportingConfig();
  if (!cfg) {
    throw new Error('GA4 reporting is not configured.');
  }

  const token = await getAccessToken(cfg);
  const url = `${DATA_API_BASE}/properties/${cfg.propertyId}:runReport`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let detail = '';
    try {
      // The Data API error body is safe (no credentials) and useful for
      // debugging property-id / permission mistakes.
      const errJson = (await res.json()) as { error?: { message?: string } };
      detail = errJson.error?.message ? `: ${errJson.error.message}` : '';
    } catch {
      /* ignore unparseable error body */
    }
    throw new Error(`GA4 runReport failed (HTTP ${res.status})${detail}`);
  }

  return (await res.json()) as RunReportResponse;
}
