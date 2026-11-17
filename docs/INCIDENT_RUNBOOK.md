# Incident runbook — agents.hellobooks.ai (public MCP)

This endpoint is a public, read-only, stateless service. There is no customer
data to leak and no state to corrupt, so incidents are about **availability** and
**correctness of the data agents receive**.

## Quick triage

```bash
# Is the MCP handshake alive?
curl -s -X POST https://agents.hellobooks.ai/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"probe","version":"1"}}}'

# Is the discovery surface up and what version is live?
curl -s https://agents.hellobooks.ai/catalog.json | head
curl -sI https://agents.hellobooks.ai/llms.txt
```

## Symptom → cause → action

| Symptom | Likely cause | Action |
|---|---|---|
| Clients get **406** on `/mcp` | Client not sending both `application/json` + `text/event-stream` accepts | Expected per spec; confirm the client. Not a server incident. |
| `/mcp` returns 5xx / times out | Process down or LB misrouted | Check container health (`/health`), restart, confirm the TLS LB routes to the app. |
| Prices look **stale/wrong** | Live pricing feed (`hellobooks.ai/api/feed/pricing.json`) is down → served from baked fallback | Check `_meta.dataSource` on `list_plans`. Fix the marketing feed; the MCP self-heals on the next refresh (1h TTL). |
| A **statutory date** is wrong | Authority moved the date; drift check missed it | Run `npm run check:deadline-drift`, reconcile `src/data/complianceDeadlines.ts`, redeploy. |
| A **source URL 404s** in an answer | Authority moved the page | Run `npm run check:source-urls`, fix `src/data`, redeploy. |
| Directories show an **old tool count** | Registry entry stale / old deploy | Redeploy latest; re-publish the MCP registry entry (`mcp-publisher`). See STRATEGY_STATUS.md #24. |
| Sudden **429s** for a legit client | Rate limit (120/min IP, 60/min session) too tight for a burst | Confirm it's not abuse; tune `express-rate-limit` if a real client needs more. |
| **406/handshake** breaks after a deploy | SDK bump changed negotiation | Roll back; run `test/protocol.test.ts` against the new SDK before re-deploying. |

## Escalation

- Data correctness (pricing/compliance): the catalog owner in `docs/DATA_REVIEW.md`.
- Availability: platform/ops on call.
- Contact: `hello@hellobooks.ai` (also in `/.well-known/security.txt`).

## After any incident

- Add/adjust a test so the same break fails CI next time (golden-answer, contract,
  drift, or conformance suite).
- Note it in the changelog if agents were served wrong data.
