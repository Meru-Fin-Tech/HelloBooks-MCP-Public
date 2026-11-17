# Data review ritual & catalog ownership (RACI)

The MCP's credibility is the freshness of the facts it hands to an AI agent. A
wrong price or a last-year filing date in an answer is a brand problem, not a
bug report. Two layers keep the catalogs honest:

1. **Automated** — runtime federation (pricing, articles), the PII audit gate,
   the quarterly deadline-drift check, and the test suite. These catch *drift*
   and *leaks* without a human.
2. **Human** — the monthly review below. A named owner signs off that each
   catalog still matches the source of truth. Automation flags; humans decide.

---

## Monthly review checklist

Run on the **first business day of each month**. Tick every box; record the
sign-off (date + reviewer) in the PR that bumps `lastReviewed` fields or in the
monthly review issue.

- [ ] `npm ci && npm test` is green on `main`.
- [ ] `npm run audit:public-data` passes (no PII / secret strings in `src/data/`).
- [ ] `npm run check:deadline-drift` reviewed; any finding reconciled against the
      authority `source` page (dates rotate annually — confirm the current FY).
- [ ] **Pricing**: spot-check `list_plans` for 3 countries against
      `hellobooks.ai/pricing`. Confirm `_meta.dataSource` reads `live-feed`
      (not a stale `static-fallback`).
- [ ] **Plans/credit packs**: tiers, add-ons, and credit-pack prices match the
      live pricing feed.
- [ ] **Tax rates**: no rate changed effective this month (`src/data/taxRates.ts`
      `effectiveFrom` + `source`).
- [ ] **Compliance deadlines**: next-due dates per country are correct for the
      current fiscal year.
- [ ] **Integrations**: new banks/payments/apps shipped this month are listed;
      removed ones are marked.
- [ ] **Competitors**: positioning + pricing notes still accurate (rivals change
      prices quietly).
- [ ] **Country support**: any newly launched / deprecated country hub reflected.
- [ ] **Versions**: if anything shipped, `package.json`, `server.json`, and
      `SERVER_VERSION` are aligned (enforced by `test/version.test.ts`) and the
      MCP registry entry is re-published.
- [ ] **Source URLs**: no broken `source` links (see the source-URL validator,
      strategy #43 — once installed).
- [ ] **Discovery surface**: `/llms.txt`, `/catalog.json`, `/.well-known/agent.json`
      load and reflect the current catalog.

Sign-off: `Reviewed <YYYY-MM-DD> by <name> — all catalogs current.`

---

## Quarterly (in addition to monthly)

- [ ] Re-run the client-matrix smoke (Claude / ChatGPT / Cursor / Gemini
      handshake + one call) — `test/protocol.test.ts` covers the SDK handshake;
      re-verify live clients.
- [ ] Bump `@modelcontextprotocol/sdk` to the latest patch/minor and run the
      full suite (strategy #1). Pin the exact version.
- [ ] Review this document and `plan.md`; move shipped strategies to `Shipped`
      in `HelloBooks-MCP-Strategy.xlsx`.

---

## Catalog ownership (RACI)

Every `src/data/*` catalog has one accountable owner. Drift alerts and review
findings route to that owner. Roles are placeholders — replace with real names.

| Catalog | Source of truth | Freshness | Owner (A) | Reviewer (C) |
|---|---|---|---|---|
| `plans.ts` / `freeTierThresholds.ts` / `billingParity.ts` | `hellobooks.ai/api/feed/pricing.json` | live (1h) + monthly | Pricing/Growth | Finance |
| `taxRates.ts` | Statutory authorities | monthly + on change | Compliance lead | Tax advisor |
| `complianceDeadlines.ts` | Statutory authorities | quarterly drift + monthly | Compliance lead | Tax advisor |
| `integrations.ts` / `paymentMethods.ts` | Product + partnerships | monthly | Product | Partnerships |
| `competitors.ts` | Market research | monthly | Product Marketing | Sales |
| `countries.ts` / `supportedCountries.ts` | Go-to-market | on launch/deprecation | GTM | Product |
| `features.ts` / `capabilities.ts` | Marketing site feature catalog | live mirror + monthly | Product Marketing | Product |
| `articles.ts` / `articlesDiscovered.ts` | `hellobooks.ai/sitemap.xml` | live (1h) | Content | Marketing |
| `competitors` comparison resources | Market research | monthly | Product Marketing | Sales |
| `onboardingSupport.ts` / voice packs | Support + sales play | on change | Support Ops | Sales |
| `partnerProgram.ts` / `practiceManagement.ts` | Partner team | on change | Partnerships | Product |
| `videos.ts` | Marketing | on publish | Content | Marketing |
| `developerApi.json` (generated) | Developer portal sync | on API change | Platform/API | Dev Rel |
| `about.ts` (+ CHANGELOG) | This repo | per release | Maintainer | — |

**R** (does the work) is whoever opens the PR; **A** is accountable for sign-off;
**C** is consulted on correctness; **I** (informed) is the maintainer via the
monthly review issue.
