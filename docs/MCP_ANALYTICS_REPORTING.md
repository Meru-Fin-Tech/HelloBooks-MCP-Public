# MCP Traffic Analytics — Reporting (GA4 Data API read)

This is the **read** side of the MCP analytics described in
[`MCP_ANALYTICS.md`](./MCP_ANALYTICS.md). That document covers how events are
*written* to GA4 via the Measurement Protocol. This one covers an **optional**
helper for reading the `mcp_*` event counts back out, so you can answer:

- total MCP events today,
- events by date,
- events by client label (ChatGPT, Claude, …),
- events by tool name,
- bot event count.

It is **off by default** and adds **no database, no local storage of results,
and no new npm dependencies**. Reports are fetched live from GA4 each time.

- Reader: [`src/reporting/ga4DataApi.ts`](../src/reporting/ga4DataApi.ts) — service-account auth + `runReport`.
- Queries: [`src/reporting/mcpReports.ts`](../src/reporting/mcpReports.ts) — the five reports.
- Endpoint: [`src/reporting/endpoint.ts`](../src/reporting/endpoint.ts) — token-protected router.
- CLI: [`scripts/ga4-report.ts`](../scripts/ga4-report.ts) — `npm run report:ga4`.

## What was added

| File | Purpose |
| ---- | ------- |
| `src/reporting/ga4DataApi.ts` | Service-account auth (RS256 JWT via `node:crypto`, OAuth2 token cached in memory) and `runReport` over `fetch`. No new dependencies. |
| `src/reporting/mcpReports.ts` | The five reports, scoped to the four MCP event names, plus date-range validation. |
| `src/reporting/endpoint.ts` | Express router for `/internal/analytics`, guarded by a timing-safe bearer-token check. Returns `null` (no route) when disabled. |
| `scripts/ga4-report.ts` | CLI for the same reports — `npm run report:ga4`. |
| `src/http.ts` | Mounts the reporting router only when it is enabled (otherwise no change). |
| `.env.example` | The four new optional reporting env vars, documented. |
| `package.json` | `report:ga4` script. |
| `test/ga4-reporting.test.ts` | 10 unit tests (auth/JWT, row parsing, date validation, disabled-by-default gating, token guard). |

### Requirements mapping

| Requirement | How it is met |
| ----------- | ------------- |
| Don't change existing telemetry emission | The writer (`src/analytics.ts`) and middleware are untouched; the reader is a separate `src/reporting/*` module tree. |
| Keep GA4 Measurement Protocol as event writer | Unchanged — it remains the only writer. |
| Separate read/reporting helper via GA4 Data API | `src/reporting/ga4DataApi.ts` + `mcpReports.ts`. |
| Service-account credentials from env vars | `GA4_PROPERTY_ID`, `GA4_SA_CLIENT_EMAIL`, `GA4_SA_PRIVATE_KEY`. |
| Don't expose credentials | Key, OAuth token, and endpoint token never appear in responses, errors, or logs; endpoint is token-protected. |
| Protected endpoint **or** CLI for the 5 reports | Both: `/internal/analytics` and `npm run report:ga4`, covering total today, by date, by client label, by tool name, bot count. |
| Documentation for setup | This file + `.env.example` + cross-link from `MCP_ANALYTICS.md`. |
| Optional, disabled unless env vars present | `reportingEnabled()` no-ops the CLI; `createReportingRouter()` returns `null` so the route does not exist. |
| No database / no local storage of results | Reports are fetched live and returned; only the short-lived access token is cached in process memory. |

### Verification

- `tsc --noEmit` on the new modules — clean.
- `test/ga4-reporting.test.ts` — 10/10 passing.

Run `npm run lint && npm test` locally to confirm the whole project still passes
in context.

## Write path vs read path

| | Writes events | Reads events |
| --- | --- | --- |
| API | GA4 Measurement Protocol | GA4 Data API v1beta |
| File | `src/analytics.ts` (`track()`) | `src/reporting/*` |
| Credential | `GA4_API_SECRET` (write-only) | service account (read-only) |
| Required to run server | No | No |

The write path is **unchanged** by this feature. The reader uses a completely
separate, read-scoped credential and never emits anything.

## Setup

### 1. Create a read-only service account

1. In Google Cloud Console, create (or reuse) a project and a **service
   account**. Create a **JSON key** for it.
2. Enable the **Google Analytics Data API** for that project.
3. In **GA4 Admin → Property Access Management**, add the service-account email
   with the **Viewer** role on the property you want to report on.

### 2. Register custom dimensions (only for the client / tool breakdowns)

The "events by client" and "events by tool" reports read GA4 **event-scoped
custom dimensions**. Register them once in **GA4 Admin → Custom definitions →
Create custom dimensions** (scope: *Event*):

| Dimension name | Event parameter |
| -------------- | --------------- |
| `client`       | `client`        |
| `tool_name`    | `tool_name`     |

These collect data only **going forward** from when they are registered. The
total / by-date / bot reports need no custom dimensions and work immediately.

### 3. Set environment variables

All three are required to enable reporting (see [`.env.example`](../.env.example)):

```bash
GA4_PROPERTY_ID=123456789            # numeric property id (NOT G-XXXXXXXXXX)
GA4_SA_CLIENT_EMAIL=reporter@my-project.iam.gserviceaccount.com
GA4_SA_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
```

`GA4_SA_PRIVATE_KEY` accepts the literal `\n` escapes that JSON keys and CI
secret stores normally contain — they are converted to real newlines. The key,
the minted access token, and the endpoint token are never logged or returned.

To additionally expose the **HTTP endpoint**, set a bearer token:

```bash
GA4_REPORTING_TOKEN="$(openssl rand -hex 32)"
```

With the three credentials set but `GA4_REPORTING_TOKEN` blank, only the CLI is
available; the endpoint route does not exist.

## CLI usage

```bash
# Default range: last 28 days, human-readable.
npm run report:ga4

# Explicit calendar range.
npm run report:ga4 -- --start 2026-06-01 --end 2026-06-06

# Last 7 days as JSON (relative GA4 tokens like `today`/`NdaysAgo` also work).
npm run report:ga4 -- --days 7 --json
```

Sample output:

```
MCP GA4 usage report  (27daysAgo → today)

Total events today:   1280
Bot events in range:  4210

Events by date:
  20260604  980
  20260605  1120
  20260606  1280

Events by client:
  chatgpt   5400
  claude    2100
  unknown   620

Events by tool:
  list_plans         900
  country_support    640
```

## HTTP endpoint usage

Enabled only when the three credentials **and** `GA4_REPORTING_TOKEN` are set.
Mounted at `/internal/analytics` (behind the per-IP rate limiter).

```bash
curl -s https://agents.hellobooks.ai/internal/analytics \
  -H "Authorization: Bearer $GA4_REPORTING_TOKEN" \
  --get --data-urlencode 'start=7daysAgo' --data-urlencode 'end=today'
```

Response:

```json
{
  "range": { "startDate": "7daysAgo", "endDate": "today" },
  "totalToday": 1280,
  "byDate":   [{ "label": "20260606", "count": 1280 }],
  "byClient": [{ "label": "chatgpt",  "count": 5400 }],
  "byTool":   [{ "label": "list_plans", "count": 900 }],
  "botEvents": 4210
}
```

Status codes:

| Code | Meaning |
| ---- | ------- |
| `200` | Report returned. |
| `400` | Invalid `start`/`end` query value. |
| `401` | Missing or wrong bearer token. |
| `502` | Upstream GA4 call failed (e.g. custom dimensions not yet registered, or property/permission issue). |

Accepted date values are calendar dates (`YYYY-MM-DD`) or GA4 relative tokens
(`today`, `yesterday`, `NdaysAgo`). Anything else is rejected before the GA4
call.

## Security notes

- The endpoint is **disabled unless explicitly configured** — no route exists on
  a default deploy.
- Requests require a timing-safe-compared bearer token.
- The service-account private key, the OAuth2 access token, and the endpoint
  token never appear in responses, errors, or logs.
- The reader is **read-only** (scope `analytics.readonly`) and the GA4 data it
  exposes is the same anonymous usage telemetry described in
  [`MCP_ANALYTICS.md`](./MCP_ANALYTICS.md) — no customer data, no IPs.
- Nothing is persisted locally; there is still **no database** in this repo.
