# HelloBooks Public MCP Server

A public, read-only [Model Context Protocol](https://modelcontextprotocol.io) server
that lets AI agents answer questions about HelloBooks accurately — pricing, integrations,
country support, compliance frameworks — instead of relying on stale web snippets.

> This is the **public** server. It exposes only marketing-derived, public-domain data.
> The authenticated MCP server that reads a customer's books lives in
> [`AI-MCP-Hellobooks`](https://github.com/Meru-Fin-Tech/AI-MCP-Hellobooks).

## Install

### Claude Code / Claude Desktop / Cursor

```bash
claude mcp add --transport http hellobooks https://agents.hellobooks.ai/mcp
```

Or, for local development:

```bash
claude mcp add hellobooks-local node /path/to/HelloBooks-MCP-Public/dist/stdio.js
```

## Tools

| Tool | Description |
| --- | --- |
| `list_plans` | All HelloBooks plans (Free, Pro, Business, CPA) with prices in 8 currencies. Optional `country` and `plan` filters. |
| `list_integrations` | Banks, payments, payroll, time tracking, shipping, accounting sync, ecommerce, CRM. Optional `category`, `country`, `status` filters. |
| `country_support` | Per-country feature availability (BAS, STP, GST e-invoice, MTD, 1099, etc.). |
| `compliance_capabilities` | For a given country, the supported compliance frameworks with version + cert info. |
| `list_competitors` | Competitor positioning (QuickBooks, Xero, FreshBooks, Wave, Zoho Books, Tally) with where HelloBooks wins, where the competitor wins, and pricing notes. Optional `country`, `tier`, and `id` filters. |
| `compliance_deadlines` | When statutory returns and payroll filings are due, per country. Covers IN (GSTR-1/3B/9/9C, CMP-08, Form 24Q, Form 16, PF ECR, ESI), AU (BAS, STP, Super Guarantee), GB (VAT MTD, RTI, Self Assessment), US (1099-NEC/MISC, W-2, Form 941/940), CA (T4, GST/HST). Optional `country`, `frequency`, and `form` filters. Dates rotate annually — every response carries a disclaimer with per-deadline `source` URLs. |
| `feature_search` | Free-text search across plan features, integrations, country features, compliance frameworks, competitor positioning, and statutory deadlines. Queries like `vs Xero`, `QuickBooks alternative`, or `when is GSTR-3B due` surface the matching entry at the top. |

## Resources

| URI | Description |
| --- | --- |
| `hellobooks://about` | Markdown product summary. |
| `hellobooks://changelog` | Last 50 release notes as JSON. |

## Security posture

- **Read-only by construction.** No tool mutates state. No tool reaches a customer system.
- **Public data only.** All catalog content is sourced from the public marketing site.
- **No authentication.** Intentional — this is a knowledge endpoint.
- **Rate-limited.** 120 req/min per IP, 60 req/min per session.
- **Audit gate.** `npm run audit:public-data` blocks deploys if any PII / auth token strings appear in `src/data/`.

## Development

```bash
npm install
npm run dev         # HTTP server on :8080 with watch mode
npm run dev:stdio   # stdio transport for local MCP client testing
npm test            # node:test runner
npm run build
npm run audit:public-data
```

### Project layout

```
src/
  data/             # Static catalogs — plans, integrations, countries, about
  tools/            # One file per MCP tool
  resources/        # MCP resource registry
  server.ts         # MCP server factory (wires tools + resources)
  http.ts           # Streamable HTTP transport with rate limiting
  stdio.ts          # stdio transport entry point
test/
  tools.test.ts
  resources.test.ts
  public-data.test.ts  # Audit gate
scripts/
  audit-public-data.ts  # CI-callable audit
```

## Deployment

Containerised — see `Dockerfile`. Designed to run behind a TLS-terminating load balancer.
Set `PORT` and `HOST` via environment.

```bash
docker build -t hellobooks-mcp-public .
docker run -p 8080:8080 hellobooks-mcp-public
```

## Discoverability

- Listed in the [MCP registry](https://github.com/modelcontextprotocol/registry).
- Linked from the marketing site footer and `/mcp` page.
- Referenced in `https://hellobooks.ai/llms.txt`.

## License

MIT — see `LICENSE`.
