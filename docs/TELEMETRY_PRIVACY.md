# Telemetry & privacy

The HelloBooks Public MCP is a read-only, unauthenticated, public-data endpoint.
It has **no user identity and no access to any customer data**. This document
states exactly what the optional usage telemetry does and does not collect, so
operators and agents can trust it.

## Off by default

Telemetry is a no-op unless **both** `GA4_MEASUREMENT_ID` and `GA4_API_SECRET`
environment variables are set (see `.env.example`). With either unset — local
dev, tests, forks, or any deployment that does not opt in — the server runs with
telemetry fully disabled and sends nothing.

## What is collected (when enabled)

Anonymous, aggregate **usage counts** only, via the GA4 Measurement Protocol:

- The event name (e.g. `mcp_tool_called`, `mcp_tool_errored`).
- The **tool name** that was called (e.g. `list_plans`) and the **argument key
  names** (e.g. `country`), as a flat string — never the argument *values*.
- A `product` label and the detected client type bucket.
- `client_id`: the opaque MCP **session id** (or the literal `server`) — a
  per-connection token the server assigns, not a user identifier.

## What is NEVER collected

- **No argument values** — not the free-text of a `feature_search` query, not a
  `country` value, nothing a caller typed.
- **No IP addresses.**
- **No request bodies**, headers, or response contents.
- **No customer, account, or personal data** — the server cannot reach any.
- No cross-site identifiers, cookies, or fingerprints.

## Why

Operators need to know which tools agents actually use to prioritise the catalog
(see the strategy sheet). That question is answered by counts alone, so counts
are all that is sent. The collection boundary is enforced in code: see
`src/analytics.ts` (scalar, PII-free params only) and the `argKeys()` helper in
`src/server.ts`, which forwards argument **keys** and never values.

## Reporting a concern

Security or privacy concerns: see
[`/.well-known/security.txt`](https://agents.hellobooks.ai/.well-known/security.txt)
or email the contact listed there.
