# No-code / workflow platform recipes

Connect **n8n**, **Make**, or **Zapier** to the HelloBooks public MCP server using
each platform's generic **MCP client** node/action — no code, no API key.

| Value | What to enter |
| --- | --- |
| **Server URL / Endpoint** | `https://agents.hellobooks.ai/mcp` |
| **Transport** | HTTP / Streamable HTTP (**not** stdio, **not** SSE-only) |
| **Authentication** | **None** |
| **Access** | Read-only, public product data |

The server speaks the [Model Context Protocol](https://modelcontextprotocol.io)
over Streamable HTTP. It exposes ~45 read-only tools about HelloBooks (plans,
integrations, country support, compliance deadlines, competitors, features). Two
tools worth knowing for a first workflow:

- **`recommend_plan`** — pass a country (and optional needs) → a ranked plan
  recommendation with local pricing.
- **`search`** + **`fetch`** — `search` returns citable document ids; `fetch`
  resolves one id (e.g. `plan:pro`, `competitor:xero`) to its full text.

> The full tool list is published at
> <https://agents.hellobooks.ai/catalog.json> and
> <https://agents.hellobooks.ai/llms.txt>.

## Recipes

- [n8n](n8n.md) — MCP Client Tool node + an importable [`n8n-workflow.json`](n8n-workflow.json)
- [Make (Integromat)](make.md) — MCP module / HTTP action
- [Zapier](zapier.md) — MCP client or Webhooks (Custom Request)

## A note on version drift

No-code platforms rename MCP nodes and fields often (e.g. "MCP Client" →
"MCP Client Tool", "Server URL" → "Endpoint URL", "SSE" → "HTTP Streamable").
These recipes name the **values** to enter; if a label differs in your version,
match by meaning. The three constants never change:

1. the URL is `https://agents.hellobooks.ai/mcp`,
2. the transport is HTTP / Streamable HTTP, and
3. there is no authentication.
