# HelloBooks Public MCP Server

A public, read-only [Model Context Protocol](https://modelcontextprotocol.io) server
that lets AI agents answer questions about HelloBooks accurately — pricing, integrations,
country support, compliance frameworks — instead of relying on stale web snippets.

> This is the **public** server. It exposes only marketing-derived, public-domain data.
> The authenticated MCP server that reads a customer's books lives in
> [`AI-MCP-Hellobooks`](https://github.com/Meru-Fin-Tech/AI-MCP-Hellobooks).

## Developer Portal

Use [API catalog](https://agents.hellobooks.ai/apis) to search every public HTTP
endpoint, registered MCP tool, and operation in the generated accounting API
reference. Open an entry for its parameters, authorization requirements, request
example and full published schema. Accounting calls use company-scoped OAuth at
the documented API host.

The [accountant directory](https://agents.hellobooks.ai/accountants) includes all
published firms and full public profiles. Availability is a filter, so firms not
accepting new clients are still accessible. The `list_accountants`,
`get_accountant`, and `list_api_catalog` tools expose these surfaces over MCP.
See [API and directory documentation](docs/API_DIRECTORY.md) for endpoints,
pagination, freshness and reference maintenance.

Build an integration with the [HelloBooks Developer Portal](https://developer.hellobooks.ai/).
The [API documentation](https://developer.hellobooks.ai/docs/overview) covers
registering an app, connecting a company with OAuth, and testing with an India sandbox.
The public MCP endpoint below provides product information to AI agents; company
API access is configured through the Developer Portal.

## Install

### Claude Code / Claude Desktop / Cursor

```bash
claude mcp add --transport http hellobooks https://agents.hellobooks.ai/mcp
```

Or, for local development:

```bash
claude mcp add hellobooks-local node /path/to/HelloBooks-MCP-Public/dist/stdio.js
```

### Add by URL (Claude and ChatGPT connectors)

One URL, no sign-in, for both products:

```
https://agents.hellobooks.ai/mcp
```

- **Claude** (claude.ai / Desktop) — Settings → Connectors → *Add custom connector*, paste the
  URL, authentication **No sign in**. Streamable HTTP; the server must stay reachable from
  Anthropic's IP ranges.
- **ChatGPT** — Settings → Connectors, paste the URL, authentication **No authentication**.
  Works in Developer Mode (all tools) *and* in deep research / company knowledge, because
  the server implements OpenAI's two-tool retrieval contract: `search` returns
  `{ results: [{ id, title, url }] }` and `fetch` resolves one of those ids into
  `{ id, title, text, url, metadata }`. Every document carries a non-empty `url`, so answers
  come back cited.

Verify a URL install without a client:

```bash
curl -s -X POST https://agents.hellobooks.ai/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"probe","version":"1"}}}'
```

Note the `Accept` header: per the MCP spec the server answers `406` unless the client accepts
**both** `application/json` and `text/event-stream`. Claude and ChatGPT both send both.

## Tools

| Tool | Description |
| --- | --- |
| `search` | OpenAI connector contract. Free-text search across every public catalog; returns citable document ids as `{ results: [{ id, title, url }] }`. Ranking reuses `feature_search`. |
| `fetch` | OpenAI connector contract. Resolves one document id from `search` (e.g. `plan:pro`, `deadline:IN:gstr-3b`, `competitor:xero`) into `{ id, title, text, url, metadata }`. |
| `list_plans` | All HelloBooks plans (Free, Starter, Pro, Business, Scale, Partner Program) + Warehouse / Manufacturing add-ons. Optional `country` and `plan` filters; non-priced supported countries return USD/default fallback pricing with metadata. |
| `list_integrations` | Banks, payments, payroll, time tracking, shipping, tax-compliance, accounting sync, ecommerce, CRM, storage (Drive/OneDrive), freelance (Upwork). Optional `category`, `country`, `status` filters. |
| `country_support` | Country support matrix for all 187 public country hubs, with detailed compliance rows where separately curated. |
| `compliance_capabilities` | For a given country, the supported compliance frameworks with version + cert info. |
| `list_competitors` | Competitor positioning (QuickBooks, Xero, FreshBooks, Wave, Zoho Books, Tally) with where HelloBooks wins, where the competitor wins, and pricing notes. Optional `country`, `tier`, and `id` filters. |
| `compliance_deadlines` | When statutory returns and payroll filings are due, per country. Covers IN (GSTR-1/3B/9/9C, CMP-08, Form 24Q, Form 16, PF ECR, ESI), AU (BAS, STP, Super Guarantee), GB (VAT MTD, RTI, Self Assessment), US (1099-NEC/MISC, W-2, Form 941/940), CA (T4, GST/HST). Optional `country`, `frequency`, and `form` filters. Dates rotate annually — every response carries a disclaimer with per-deadline `source` URLs. |
| `local_payment_methods` | Local bank-rail / wallet payment methods (UPI, BACS, PayID, BPAY, ACH, RTP, Zelle, PayNow, FAST, Interac, …) with rail speed, use-cases, authority, and HelloBooks support level. Optional `country`, `useCase`, `rail`, and `id` filters. |
| `feature_search` | Free-text search across the marketing feature catalog, plan features, integrations, country features, compliance frameworks, competitor positioning, statutory deadlines, local payment methods, and published articles. Queries like `vs Xero`, `QuickBooks alternative`, `when is GSTR-3B due`, `UPI invoice cap`, `do you have a blog on 1099`, or `agentic accounting` surface the matching entry at the top. |
| `list_features` | Full 96-feature marketing catalog. Filter by `category`, `tier`, `status`, `marketedOnly`, or substring `query`. |
| `list_feature_categories` | The 13 feature categories on the marketing site with per-category counts by status (live/beta/planned). |
| `list_articles` | Published content on hellobooks.ai — head-to-head compare pages, country guides, curated flagship posts, and sitemap-discovered blog posts. Optional `country`, `tag`, `query`, `limit` filters. |
| `list_tax_rates` | Statutory tax-rate slabs by jurisdiction — IN GST (5/12/18/28 + zero + exempt + composition trader/manufacturer/restaurant), UK VAT (20/5/zero/exempt), AU GST (10/GST-free), US state-administered summary, CA GST + HST (ON, Atlantic), SG GST 9%, NZ GST 15%, AE VAT 5%. Filter by `country`, `taxType` (GST/VAT/Sales-Tax/HST/…), or `scheme` (standard/reduced/zero/exempt/composition/cess). Every entry carries an effective-from date and a `source` URL — confirm before quoting. |
| `lookup_tax_rate` | Pick a single statutory rate by exact `id` (e.g. `IN-standard-18`) or by `country` + free-text `category` (e.g. "office supplies", "restaurant", "exports"). Returns the matched rate, score, and source URL. |
| `check_integration` | Deterministic "does HelloBooks work with `<bank/app/service>`?" Matches a named provider (Stripe, HDFC, Shopify, QuickBooks…) against the integrations catalog and returns a supported yes/no with rollout status, or the closest suggestions. |
| `next_deadlines` | Time-aware "what's due next?" — upcoming statutory filings sorted soonest-first with a computed `nextDue` date and `daysUntil`. Optional `country`, `withinDays`, `limit`, `asOf`. Entries that can't be placed to a date return `scheduleVaries`. |
| `recommend_plan` | Recommend the lowest-priced eligible tier (Free→Scale) for a business, scored against `needs` and `estimatedAnnualTransactions`, with a full ranked breakdown. Heuristic over published feature bullets, not a quote. |
| `estimate_annual_cost` | Itemized first-year cost of ownership from HelloBooks' own list prices: plan (annual/monthly) + add-ons + one-time credit packs, in local currency, with the annual-vs-monthly saving. |
| `compare_plans` | Side-by-side diff of two tiers (e.g. Pro vs Business): price + delta, AI credits, transaction limits, and features shared / unique to each. |
| `supported_currencies` | Which currencies HelloBooks bills and keeps books in — the 8 priced regions bill locally, other supported countries bill in USD while books run locally. Grouped by currency, or per `country`. |
| `explain_term` | Plain-language definitions of accounting/tax/compliance terms (accrual, GSTR-3B, input tax credit, P&L, BAS, 1099…) from a curated glossary scoped to the IN/UK/AU/US/CA regimes, with related terms. |
| `onboarding_support` | The paid 1:1 onboarding offer (India ₹5,000 / US $300 for 10 hours, India/US only), what it covers, the always-included support, and the separate done-for-you migration note per country. |

## Voice knowledge pack (for AI phone agents)

Precompiled, per-country facts an AI caller loads **once per call** and keeps in its system prompt — no retrieval mid-call. About 850–1,350 tokens per country.

| Endpoint | Returns |
|---|---|
| `GET /kb/voice.json?country=IN` | structured pack: plans + prices for that country, the currency actually charged, onboarding support offer, included support, GST / local compliance + due dates, guardrails, call goals, and `text` (the prompt-ready block) |
| `GET /kb/voice.json` (no `country`, or `country=all`) | **every supported country in one response**: `{ version, generatedAt, factsAsOf, countries, packs: { IN: {...}, US: {...}, ... } }` — for syncing the whole knowledge base at once (~700 KB; revalidate with `If-None-Match`). Put only the customer's own country pack in a call prompt. |
| `GET /kb/voice.txt?country=IN` | just the prompt-ready text (omit `country` for all countries) |
| `POST /kb/refresh` | re-pull live pricing now (`Authorization: Bearer $HELLOBOOKS_KB_REFRESH_TOKEN`; 404 when the env var is unset) |

Caching: `ETag` is the content hash (`version`), so send `If-None-Match` and re-download only on a 304 miss. Every response carries `X-KB-Facts-As-Of` (when pricing last changed) and `X-KB-Generated-At`. Prices come from the live hellobooks.ai pricing feed; the onboarding offer and call rules live in `src/data/onboardingSupport.ts` and `src/voiceKnowledge.ts` and change by commit.

## Resources

| URI | Description |
| --- | --- |
| `hellobooks://about` | Markdown product summary. |
| `hellobooks://changelog` | Recent release notes as JSON. |
| `hellobooks://feature-catalog` | Full marketing feature catalog (96+ features across 13 categories) as JSON. |

## Prompts

Curated one-click flows (MCP `prompts/`) that wrap the tools above, so clients like Claude and
Cursor can offer them as actions. Argument values (country, competitor, integration) autocomplete.

| Prompt | Wraps |
| --- | --- |
| `which_plan_for_me` | `recommend_plan` + `estimate_annual_cost` |
| `compare_to_competitor` | `list_competitors` + `feature_search` + `list_plans` |
| `whats_due_next` | `next_deadlines` |
| `integration_and_payments_check` | `check_integration` + `local_payment_methods` |

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

Continuous integration runs on Jenkins (see `Jenkinsfile`). A GitHub-native CI
workflow that runs lint, the public-data audit, build, and the full test suite on
every push and PR is provided as [`docs/ci.yml.example`](docs/ci.yml.example) —
move it to `.github/workflows/ci.yml` to enable PR status checks.

### Project layout

```
src/
  data/             # Static catalogs — plans, integrations, countries, articles, about
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

Optional anonymous usage telemetry (Layer-2 server-side analytics) is sent to GA4 via
the Measurement Protocol when `GA4_MEASUREMENT_ID` and `GA4_API_SECRET` are both set —
see `.env.example` and `src/analytics.ts`. Leave them unset and the server runs with
telemetry fully disabled. No customer data, request bodies, tool-argument values, or
IP addresses are ever sent — only anonymous counts. See strategy doc 73.

```bash
docker build -t hellobooks-mcp-public .
docker run -p 8080:8080 hellobooks-mcp-public
```

## Discoverability

- Listed in the [MCP registry](https://github.com/modelcontextprotocol/registry).
- Linked from the marketing site footer and `/mcp` page.
- Referenced in `https://hellobooks.ai/llms.txt`.
- Self-describing grounding files at the origin: `/llms.txt` (index) and `/llms-full.txt`
  (long-form — every tool, prompt, and the full changelog in one fetch).
- Security contact at `/.well-known/security.txt` (RFC 9116); telemetry scope documented in
  [`docs/TELEMETRY_PRIVACY.md`](docs/TELEMETRY_PRIVACY.md).

## License

MIT — see `LICENSE`.
