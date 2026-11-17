# Roadmap

The roadmap is the strategy backlog, scored and tracked. The single source is
[`HelloBooks-MCP-Strategy.xlsx`](../HelloBooks-MCP-Strategy.xlsx) (115 strategies),
with live status in [`STRATEGY_STATUS.md`](../STRATEGY_STATUS.md).

## Status at a glance (2026-11-17)

- ✅ **Shipped (32)** — 1.6.0: 9 new tools, 4 prompts + completions, structured
  output on every tool, `/llms-full.txt`, `/.well-known/security.txt`,
  source-URL + response-size + golden-answer + contract + conformance guards,
  Dependabot, data-review ritual, version single-source check.
- 🟡 **Partial (21)** — core done, a piece remains (e.g. registry re-publish,
  live 4-client matrix, container CVE scan).
- 🔵 **To do, in-repo (28)** — implementable without external accounts.
- 🔴 **Blocked, external (25)** — need accounts/ops/marketing (directories,
  Search Console, GA4, CDN, Gemini/Copilot, deploy).
- ⚪ **Future bets (9)** — authenticated bridge, embeddings, A2A, UI resources.

## Near-term (next in-repo)

Pulled from the `To do` rows, highest-impact first:

1. Expand live federation to integrations/features (#46).
2. More agent-framework recipes — LlamaIndex / CrewAI / AutoGen / n8n / voice (#17, #18, #21).
3. Load + chaos (origin-outage) tests (#58, #59).
4. ETag/If-None-Match on all catalog GETs (#77).
5. UTM deep links in tool results (#98).

## Needs you (top blockers)

1. **Deploy 1.6.0** to `agents.hellobooks.ai` and **re-publish the MCP registry
   entry** (stale at 0.7.0) — fixes the "14 tools" shown across every directory.
2. Submit sitemaps to Search Console + Bing; wire GA4 dashboards.

See [`STRATEGY_STATUS.md`](../STRATEGY_STATUS.md) for the full per-strategy table.
