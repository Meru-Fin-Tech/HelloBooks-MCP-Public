# HelloBooks MCP — Foolproof Growth & Modernization Plan

**Server:** `https://agents.hellobooks.ai/mcp` · **Repo:** `HelloBooks-MCP-Public` · **Version:** 1.5.0
**Companion:** [`HelloBooks-MCP-Strategy.xlsx`](HelloBooks-MCP-Strategy.xlsx) — 115 strategies, scored and sequenced.
**Written:** 2026-11-17

---

## 1. What this plan is

A single, foolproof playbook for three questions:

1. **How do we improve the MCP?**
2. **How do we keep it updated (without manual drift)?**
3. **How do we connect it with more and more AI?**

Every item here is grounded in what the repo *already is* — a public, read-only MCP with
33 tools, a self-describing discovery surface (`/llms.txt`, `/.well-known/agent.json`,
`/catalog.json`, `sitemap.xml`, RSS, OpenAPI), a per-country voice knowledge pack, live
pricing/article federation from `hellobooks.ai`, GA4 telemetry, and a PII audit gate.

The Excel sheet is the working backlog. This file is the *why* and the *sequence*.

---

## 2. Where we are today (honest baseline)

| Dimension | Current state | Gap this plan closes |
|---|---|---|
| **Protocol** | MCP SDK 1.18.1, tools + 3 resources, read-only annotations on 29/33 tools | No prompts, no structured output schemas, no subscriptions/completions |
| **AI reach** | Claude, ChatGPT (search/fetch contract), Cursor, MCP registry | Gemini, Copilot, LangChain, OpenAI Responses, voice platforms undocumented |
| **Freshness** | Pricing + articles federate live; rest is baked | Integrations/features/deadlines drift between deploys |
| **Discoverability** | llms.txt, agent.json, sitemap, robots allow-list | Not on Glama/Smithery/PulseMCP; thin llms.txt; no AI-citation tracking |
| **Quality** | node:test suite, c8 coverage, Sonar, PII audit | No golden-answer evals, no client-matrix smoke, no search/fetch contract test |
| **Growth** | Every `fetch` result is citable with a URL | No UTM attribution, no ROI/recommender tools, no MCP→signup funnel |
| **Voice** | Per-country `/kb/voice.json` packs (~850–1,350 tokens) | Limited country + language coverage, no refresh automation |

We are **well ahead of most SaaS MCP servers**. The risk is not building — it's *drift and
invisibility*. This plan is weighted accordingly.

---

## 3. Guiding principles (the "foolproof" guardrails)

1. **Never quote a stale fact.** Freshness and provenance beat new features. Pricing,
   deadlines, and tax rates are the brand's credibility in an agent's answer.
2. **Static-by-construction stays static.** Every new surface must be cacheable, read-only,
   and auditable — no customer data, ever (the audit gate is sacred).
3. **One source of truth per catalog.** Version drift (0.7.0 vs 1.5.0 handshake) already bit
   us once. CI enforces alignment forever.
4. **Every answer is a doorway.** Each tool result carries a canonical, UTM-tagged URL so an
   agent can hand the user to signup/pricing/demo.
5. **Instrument before you optimize.** If GA4 can't see it, we don't claim it.
6. **Ship the install card, not just the server.** Reach is a docs problem as much as a code
   problem — one copy-paste block per AI client.

---

## 4. The five strategic pillars

The 115 strategies in the sheet roll up to five bets. Work them in this order.

### Pillar A — Lock down freshness & trust *(foundation; do first)*
Expand live federation beyond pricing/articles, wire `check-deadline-drift` into CI, add a
source-URL validator, surface `dataSource` (live vs fallback) on every tool, and alert when a
feed falls back. **Outcome:** an agent can never quote a dead link or a last-year deadline.

### Pillar B — Modernize the protocol surface
Adopt the latest MCP revision on every SDK bump, add **Prompts** (one-click flows wrapping
`compareBooksToHellobooks` / `estimateMigrationEffort`), emit **structured output schemas**,
finish tool annotations, and add argument **completions** for country/plan/form enums.
**Outcome:** richer, auto-approvable, machine-parseable tools across every client.

### Pillar C — Connect with more and more AI *(the headline goal)*
Documented, tested paths for **Gemini/Vertex, Microsoft Copilot Studio, GitHub Copilot,
LangChain/LangGraph, LlamaIndex/CrewAI/AutoGen, OpenAI Responses + Agents SDK, Anthropic
Agent SDK, n8n/Make, and voice platforms (Vapi/Retell/ElevenLabs)**. Plus listings on
**Glama, Smithery, PulseMCP, mcp.so, Cursor directory** and a richer `llms.txt` +
`llms-full.txt`. **Outcome:** callable and citable from every major agent and answer engine.

### Pillar D — Turn answers into signups
New high-intent tools (**ROI/savings calculator, plan recommender, integration checker,
"what's due next"**), UTM deep links, and a GA4 **MCP → site → signup** funnel.
**Outcome:** the MCP is a measurable acquisition channel, not just a knowledge endpoint.

### Pillar E — Scale, secure, and speak
CDN + ETag + brotli across the discovery surface, CVE/dependency scanning, abuse-resistant
rate limiting, and voice-pack expansion (more countries, locales, token guardrails,
auto-refresh). **Outcome:** fast, safe, and ready for phone agents worldwide.

---

## 5. The 90-day sequence

Full detail (exit criteria per phase) lives on the **90-Day Roadmap** tab. Summary:

| Phase | Window | Theme | Must be true at the end |
|---|---|---|---|
| **0 — Foundation** | Weeks 1–2 | Stop drift, see the truth | Version + deadline drift blocked in CI; tool/client usage dashboard live; zero-result gap list produced |
| **1 — Trust & Freshness** | Weeks 3–5 | Never quote a stale fact | 4+ live-federated catalogs; 0 broken source URLs; golden-answer + search/fetch contract tests green |
| **2 — Reach More AI** | Weeks 4–7 | Callable from every agent | 6 install cards; 5+ directory listings; 4-client handshake matrix green |
| **3 — Convert** | Weeks 6–9 | Answers → signups | Attributed MCP→signup funnel live; ROI + recommender + integration-checker tools shipped |
| **4 — Scale & Voice** | Weeks 8–12 | Harden, cache, speak | High cache hit-rate; voice packs for all priced countries; 0 high CVEs shipped |
| **Ongoing — Governance** | Monthly / Quarterly | Keep the plan alive | Monthly data sign-off; quarterly protocol + client re-cert |

Phases overlap intentionally — freshness (A) and reach (C) can run in parallel once the
foundation (phase 0) is in place.

---

## 6. How we keep it *updated* (the anti-drift machine)

This is the part most teams get wrong. Four layers, ordered by how automatic they are:

1. **Runtime federation (always on).** Pricing + articles already self-refresh from the
   marketing origin with baked fallback. **Extend this to integrations and features** so new
   content reaches agents within the hour, no deploy.
2. **CI guards.** On every PR: PII audit, deadline-drift check, source-URL HEAD checks,
   search/fetch contract test, and a single-source version assertion
   (`package.json == server.json == SERVER_VERSION`).
3. **Scheduled snapshots.** Weekly auto-PR refreshes the baked cold-start fallback
   (`sync-discovered-articles`), so even a cold start is current.
4. **Human cadence.** A monthly data-review ritual (owner signs off on pricing, deadlines,
   tax rates) and a quarterly protocol/client re-certification. A RACI map gives every
   `src/data/*` catalog a named owner; drift alerts route to them.

**Rule:** no catalog ships without an owner and a freshness signal (`verifiedAt` + `source`).

---

## 7. How we connect with *more and more AI* (reach checklist)

A strategy is "done" for a client only when there's a **tested install card** and a **green
handshake probe** in CI. Target surfaces:

- **Chat assistants:** Claude (claude.ai/Desktop/Code), ChatGPT (connector + deep research),
  Gemini/Vertex, Microsoft Copilot (Studio + 365), Perplexity (citations).
- **IDE / dev agents:** Cursor, GitHub Copilot agent mode, Windsurf, Cline, Continue, Zed.
- **Frameworks:** Anthropic Agent SDK, OpenAI Agents SDK + Responses API, LangChain/LangGraph,
  LlamaIndex, CrewAI, AutoGen.
- **No-code / automation:** n8n, Make, Zapier.
- **Voice:** Vapi, Retell, ElevenLabs (load the per-country `/kb/voice.json` pack).
- **Registries / directories:** MCP registry (canonical), Glama, Smithery, PulseMCP, mcp.so,
  Cursor directory, Awesome-MCP.
- **Enterprise:** Amazon Bedrock AgentCore Gateway, Slack/Teams assistants.

Reach is also an *indexing* problem: keep AI bots allow-listed, submit sitemaps to Search
Console + Bing, enrich `llms.txt`/`llms-full.txt`, and **measure actual citations** with
AI-answer / brand-radar tracking so we optimize what's real.

---

## 8. Scorecard — how we'll know it worked

| Metric | Baseline (today) | 90-day target |
|---|---|---|
| AI clients with a tested install card | ~3 | 10+ |
| Third-party directory listings | 1 (MCP registry) | 6+ |
| Live-federated catalogs | 2 | 4+ |
| Broken source URLs in `src/data/` | unknown | 0 (CI-enforced) |
| Golden-answer eval suite | none | green in CI |
| MCP → signup attribution | none | live GA4 funnel |
| Voice-pack country coverage | curated subset | all priced countries |
| Stale-deadline / version drift escapes | possible | 0 (blocked in CI) |

---

## 9. Risks & how the plan defuses them

- **Data rot** → runtime federation + CI drift checks + monthly review.
- **Spec/client breakage** → quarterly re-cert + client-matrix smoke + contract tests.
- **Invisibility** → directory listings + enriched grounding files + citation tracking.
- **Over-building** → scored backlog; work P0→P1 and ship install cards, not vanity tools.
- **Trust/PII leak** → the audit gate stays a hard CI blocker; telemetry carries no PII.
- **Shelfware** → this plan and the sheet are reviewed monthly; Status column is kept live.

---

## 10. Next three actions (start Monday)

1. **Phase 0, P0:** add the single-source version-assertion test and wire
   `check-deadline-drift.ts` into CI. *(Effort: S)*
2. **Phase 0, P0:** stand up the per-tool + per-client GA4 usage dashboard and the
   zero-result query log. *(Effort: S)*
3. **Phase 2, P1:** write the six per-client install cards (Claude, ChatGPT, Cursor, Copilot,
   Gemini, LangChain) and submit the server to Glama + Smithery + PulseMCP. *(Effort: S)*

Then open [`HelloBooks-MCP-Strategy.xlsx`](HelloBooks-MCP-Strategy.xlsx), filter the
**Strategies** tab by `Priority = P0`, and burn them down.

---

*This is a living document. Review monthly alongside the strategy sheet; move shipped items to
`Shipped` and fold new ideas back into the backlog.*
