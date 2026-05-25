/**
 * Layer-2 server-side usage telemetry — GA4 Measurement Protocol v2.
 *
 * This is anonymous USAGE analytics, not lead tracking. The MCP server has no
 * authentication and no user identity (see http.ts) — every event here is
 * keyed only by an opaque MCP session id. We never send request bodies, tool
 * argument *values*, IP addresses, or any free text: only counts, tool names,
 * argument *keys*, latencies, and a country code.
 *
 * Strategy doc: marketing-strategy → strategy/73-MCP-Analytics-Attribution-Strategy.md
 *
 * Design rules (do not relax without revisiting the strategy doc):
 *   1. Fire-and-forget. A telemetry call must never delay, block, or fail a
 *      tool call. Every send is `void fetch(...).catch(noop)`.
 *   2. No-op when the GA4 env vars are unset — local dev, tests, and any
 *      deploy without analytics configured stay completely silent. No new
 *      config is *required* to run the server.
 *   3. Scalar params only — GA4 does not store nested objects or arrays.
 *      Lists (e.g. argument keys) are passed pre-joined as a CSV string.
 */

/** Product label attached to every event. Flip this in the HelloTime fork. */
const PRODUCT = 'hellobooks';

const GA4_ENDPOINT = 'https://www.google-analytics.com/mp/collect';

/** Flat, GA4-safe event parameters. No nested objects, no arrays. */
export type AnalyticsParams = Record<string, string | number | boolean>;

/**
 * Resolve GA4 credentials from the environment on every call.
 *
 * Read at call time (not module load) so that tests and runtime can toggle
 * configuration without re-importing this module.
 *
 * @returns the credential pair, or `null` when analytics is not configured.
 */
function ga4Config(): { measurementId: string; apiSecret: string } | null {
  const measurementId = process.env.GA4_MEASUREMENT_ID?.trim();
  const apiSecret = process.env.GA4_API_SECRET?.trim();
  if (!measurementId || !apiSecret) return null;
  return { measurementId, apiSecret };
}

/** True only when both GA4 Measurement Protocol credentials are present. */
export function analyticsEnabled(): boolean {
  return ga4Config() !== null;
}

/**
 * Send one event to GA4 via the Measurement Protocol.
 *
 * Fire-and-forget: returns immediately, never throws, never rejects. When
 * analytics is not configured this is a no-op and `fetch` is never called.
 *
 * @param eventName GA4 event name — snake_case, <= 40 chars (e.g. `mcp_tool_called`).
 * @param params    Flat scalar params. A `product` tag is added automatically.
 * @param clientId  Stable GA4 client id. Use the MCP session id for
 *                  session-scoped events, or the literal `'server'` for
 *                  process-level metrics (e.g. the concurrency snapshot).
 */
export function track(
  eventName: string,
  params: AnalyticsParams,
  clientId: string,
): void {
  const cfg = ga4Config();
  if (!cfg) return;

  const endpoint =
    `${GA4_ENDPOINT}?measurement_id=${encodeURIComponent(cfg.measurementId)}` +
    `&api_secret=${encodeURIComponent(cfg.apiSecret)}`;

  const body = JSON.stringify({
    client_id: clientId,
    timestamp_micros: Date.now() * 1000,
    events: [{ name: eventName, params: { ...params, product: PRODUCT } }],
  });

  // Deliberately not awaited. The `.catch` swallows network/DNS failures so a
  // telemetry outage can never surface to — or slow down — an MCP client.
  void fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
  }).catch(() => {
    /* telemetry is best-effort — never let it break a tool call */
  });
}
