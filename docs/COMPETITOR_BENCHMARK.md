# Competitor MCP benchmark

How HelloBooks' public MCP compares to other accounting MCP servers, and where
we win/lose the "accounting MCP server" discovery surface. Based on a SERP +
page teardown (2026-11-17, Bing — Google bot-gated, Perplexity login-gated).

## The field

| Server | Type | Auth | Surface |
|---|---|---|---|
| **HelloBooks** (this) | Public *knowledge* MCP | None (read-only) | Product/pricing/compliance answers; 43 tools (1.6.0) |
| Puzzle (`app.puzzle.io/mcp`) | Authenticated *ledger* MCP | OAuth | A company's real books; read-write beta |
| Softledger (`/mcp`) | Authenticated ledger MCP | OAuth | GL, trial balances, reports |
| Maesn | ERP/accounting bridge | OAuth | 30+ ERP/accounting systems |
| Cube / Softledger / OpenAccountants / Accounting Seed / DeepLedger / FieldHub | Authenticated | OAuth | Ledger access |

**Key distinction:** most competitors are *authenticated ledger* MCPs (connect
your books). HelloBooks ships a *public knowledge* MCP (answer questions about
the product) — a different, complementary niche. The authenticated equivalent is
`mcp.hellobooks.ai`.

## Where HelloBooks leads

- **Breadth of tools** — 43 typed tools (plans, recommender, cost estimator,
  compare, integration checker, deadlines, glossary, migration, currency…) vs
  competitors' handful of ledger-read tools.
- **No-auth, zero-friction** — works in any client with one URL, no OAuth.
- **Self-describing discovery** — `/llms.txt`, `/llms-full.txt`, A2A card,
  `catalog.json`, sitemap, RSS, `security.txt`. Most rivals ship only a setup page.
- **Directory distribution** — listed on PulseMCP, Glama, mcp.so, mcpservers.org,
  mcp.pub, mcpmarket.com, apis.io, and the official registry.
- **Prompts + completions + structured output** — richer protocol surface.

## Where competitors win (gaps to close)

- **Category SERP** — for "accounting software with an MCP server", Puzzle,
  Softledger, Maesn, Cube, OpenAccountants rank page one; HelloBooks does not.
  Their `/mcp` pages target the *category* keyword; ours targets the brand.
- **"What is an MCP in accounting?"** definitional section (Softledger) — strong
  answer-engine optimization; ours is generic.
- **Example natural-language prompts** on the page (Puzzle, Softledger) — we lack.
- **Social proof / case studies** (Puzzle: Brex, Ramp, Deel) — we lack on /mcp.
- **FAQ + schema** — competitors have it; we don't.

## Actions (tracked in the strategy sheet)

1. Deploy 1.6.0 + re-publish the registry entry — stop showing "14 tools"
   everywhere (#24, #25).
2. Retarget the `hellobooks.ai/mcp` page at the category keyword + add a "what is
   an accounting MCP server" section, example prompts, FAQ + schema, and a
   "listed on" social-proof row (Web-Fire repo; branch `feat/mcp-page-dynamic-catalog`
   already makes the tool list live).

Re-run this benchmark quarterly (strategy #115).
