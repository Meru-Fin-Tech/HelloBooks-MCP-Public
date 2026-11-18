# Strategy implementation status

Audit of all 115 strategies in `HelloBooks-MCP-Strategy.xlsx`, refreshed 2026-11-18 (after merging the 1.6.0 wave, SDK 1.32.2, and the quality/To-do batches to `main`).

> **"Shipped" = merged to `main` and tested, not yet deployed.** The live server at agents.hellobooks.ai is still 1.5.0 until the 1.6.0 Jenkins deploy runs.

| Status | Count | Meaning |
|---|---|---|
| ✅ Shipped | 54 | Merged to main + tested (awaiting deploy) |
| 🟡 Partial | 19 | Core done; a piece remains |
| 🔵 To do (in-repo) | 8 | Implementable here; lower value / data / integration |
| 🔴 Blocked (external) | 25 | Needs your accounts / ops / marketing site |
| ⚪ Future bet | 9 | Larger, deferred |

## Per-strategy status

| ID | Pri | Pillar | Strategy | Status | Note |
|---|---|---|---|---|---|
| 1 | P0 | MCP Protocol & Spec | Adopt latest MCP protocol revision | ✅ Shipped | SDK bumped 1.18.1->1.32.2, conformance-verified (PR #104, merged) |
| 2 | P1 | MCP Protocol & Spec | Ship MCP Prompts primitive | ✅ Shipped | 4 curated prompts |
| 3 | P1 | MCP Protocol & Spec | Expose tool output schemas (structuredContent) | ✅ Shipped | structuredContent on every tool |
| 4 | P2 | MCP Protocol & Spec | Implement resource subscriptions | 🔵 To do | Resource subscriptions — low value for static resources |
| 5 | P1 | MCP Protocol & Spec | Add tool-level annotations everywhere | ✅ Shipped | READ_ONLY annotations on all tools |
| 6 | P2 | MCP Protocol & Spec | Add completions capability for arguments | ✅ Shipped | Prompt argument completions |
| 7 | P1 | MCP Protocol & Spec | Publish a prompts/resources conformance test | ✅ Shipped | protocol.test.ts + prompts.test.ts |
| 8 | P3 | MCP Protocol & Spec | Support MCP elicitation for ambiguous queries | ⚪ Future | Elicitation — awaits SDK support |
| 9 | P1 | Connect With More AI | Verify + document Gemini / Vertex connector | 🔴 Blocked | Needs testing against Gemini/Vertex (your account) |
| 10 | P1 | Connect With More AI | Microsoft Copilot Studio connector | 🔴 Blocked | Needs Microsoft Copilot Studio registration (your account) |
| 11 | P1 | Connect With More AI | Perplexity / PerplexityBot citation path | 🟡 Partial | PerplexityBot allowed; indexing confirmed. Citation needs live-answer wins |
| 12 | P2 | Connect With More AI | GitHub Copilot (agent mode) MCP install | ✅ Shipped | examples/mcp-client-configs.md — VS Code mcp.json + more |
| 13 | P2 | Connect With More AI | Cursor directory listing | 🔴 Blocked | Cursor directory submission needs sign-in |
| 14 | P2 | Connect With More AI | Windsurf / Cline / Continue configs | ✅ Shipped | Ready config files (Windsurf/Cline/Zed) in examples/mcp-client-configs.md |
| 15 | P2 | Connect With More AI | Amazon Bedrock AgentCore / Q adapter | 🔵 To do | Bedrock AgentCore gateway doc |
| 16 | P1 | Connect With More AI | LangChain / LangGraph MCP adapter recipe | ✅ Shipped | LangChain recipe in README + cookbook |
| 17 | P2 | Connect With More AI | LlamaIndex + CrewAI + AutoGen recipes | ✅ Shipped | LlamaIndex/CrewAI/AutoGen recipes in README + docs/COOKBOOK.md |
| 18 | P2 | Connect With More AI | n8n / Make / Zapier MCP node | ✅ Shipped | n8n/Make/Zapier recipe in README |
| 19 | P1 | Connect With More AI | OpenAI Agents SDK + Responses API hosted MCP | ✅ Shipped | OpenAI Responses API recipe in README + cookbook |
| 20 | P0 | Connect With More AI | Anthropic Claude Agent SDK recipe | ✅ Shipped | Claude Agent SDK recipe in README + cookbook |
| 21 | P1 | Connect With More AI | ElevenLabs / Vapi / Retell voice-agent wiring | ✅ Shipped | docs/VOICE_AGENT_TEMPLATE.md + voice recipe in README |
| 22 | P2 | Connect With More AI | Submit to ChatGPT connector gallery / apps | 🔴 Blocked | ChatGPT connector gallery submission (OpenAI, when open) |
| 23 | P3 | Connect With More AI | Slack / Teams AI assistant connector | 🔴 Blocked | Slack/Teams assistant — larger build |
| 24 | P0 | Discoverability & GEO/AEO | Keep MCP registry entry fresh | 🟡 Partial | Registry entry STALE at 0.7.0 — re-publish needs your GitHub auth (mcp-publisher) |
| 25 | P1 | Discoverability & GEO/AEO | List on third-party MCP directories | 🟡 Partial | Listed on PulseMCP/Glama/mcp.so/mcpservers.org etc; all stale until re-publish + deploy |
| 26 | P1 | Discoverability & GEO/AEO | Enrich llms.txt + add llms-full.txt | ✅ Shipped | /llms-full.txt + enriched llms.txt |
| 27 | P1 | Discoverability & GEO/AEO | Structured data (JSON-LD) coverage audit | 🔴 Blocked | Marketing-site JSON-LD audit (Web-Fire); /mcp page schema exists |
| 28 | P1 | Discoverability & GEO/AEO | Per-country / per-topic deep-link pages | 🔴 Blocked | Per-country deep-link pages (marketing site) |
| 29 | P1 | Discoverability & GEO/AEO | Brand-radar monitoring (AI answer tracking) | 🔴 Blocked | Brand-radar/AI-answer tracking needs Ahrefs/monitoring tool |
| 30 | P1 | Discoverability & GEO/AEO | AI-bot access + crawl-budget tuning | 🟡 Partial | AI-bot allow-list in robots; Bing shows good coverage |
| 31 | P2 | Discoverability & GEO/AEO | Submit sitemap to Search Console + Bing | 🔴 Blocked | Search Console + Bing submission needs your Google/Bing accounts |
| 32 | P2 | Discoverability & GEO/AEO | Answer-engine FAQ content from real queries | 🔴 Blocked | Answer-engine FAQ content (marketing site) |
| 33 | P3 | Discoverability & GEO/AEO | Backlinks from MCP/AI ecosystem content | 🔴 Blocked | Backlink outreach |
| 34 | P1 | Tool Surface Expansion | ROI / savings calculator tool | ✅ Shipped | estimate_annual_cost |
| 35 | P1 | Tool Surface Expansion | Guided plan-recommender tool | ✅ Shipped | recommend_plan |
| 36 | P2 | Tool Surface Expansion | Migration checklist / timeline tool | ✅ Shipped | migration_checklist |
| 37 | P1 | Tool Surface Expansion | Integration compatibility checker | ✅ Shipped | check_integration |
| 38 | P1 | Tool Surface Expansion | Compliance-deadline 'what's due next' tool | ✅ Shipped | next_deadlines |
| 39 | P2 | Tool Surface Expansion | Currency / multi-currency support tool | ✅ Shipped | supported_currencies |
| 40 | P2 | Tool Surface Expansion | Glossary / accounting-term explainer tool | ✅ Shipped | explain_term + glossary |
| 41 | P2 | Tool Surface Expansion | Sample-data / sandbox pointer tool | ✅ Shipped | get_sandbox_info tool (merged #103) |
| 42 | P3 | Tool Surface Expansion | Testimonials / case-study retrieval tool | 🔴 Blocked | Needs curated case-study data |
| 43 | P3 | Tool Surface Expansion | Status / uptime tool | 🔴 Blocked | Needs a public status page to proxy |
| 44 | P1 | Tool Surface Expansion | Pricing-in-local-currency tool hardening | 🟡 Partial | list_plans states charged currency; supported_currencies adds clarity |
| 45 | P2 | Tool Surface Expansion | Partner / accountant match tool | ✅ Shipped | Accountant matching = list_accountants specialty/country/city filters (already present) |
| 46 | P1 | Data Freshness & Federation | Expand live federation beyond pricing/articles | 🔵 To do | Expand live federation to integrations/features |
| 47 | P0 | Data Freshness & Federation | Deadline-drift auto-check in CI | ✅ Shipped | Deadline-drift CI workflow example + npm script |
| 48 | P1 | Data Freshness & Federation | Source-URL freshness validator | ✅ Shipped | Source-URL validator (offline test + scheduled script) |
| 49 | P2 | Data Freshness & Federation | dataSource transparency in every response | 🔵 To do | dataSource transparency on more tools (low value for static data) |
| 50 | P2 | Data Freshness & Federation | Scheduled baked-snapshot refresh PRs | ✅ Shipped | sync-discovered-articles workflow example |
| 51 | P1 | Data Freshness & Federation | Pricing-feed failure alerting | 🔴 Blocked | Pricing-feed failure alerting needs alerting infra |
| 52 | P2 | Data Freshness & Federation | Add last-verified timestamps to compliance data | ✅ Shipped | TAX_RATES_LAST_REVIEWED stamp on tax tools |
| 53 | P2 | Data Freshness & Federation | Multi-year deadline coverage (rolling) | 🔵 To do | Multi-year rolling deadline coverage (data) |
| 54 | P1 | Quality & Reliability | Golden-answer eval harness | ✅ Shipped | golden-answers.test.ts |
| 55 | P1 | Quality & Reliability | Client-matrix smoke tests | 🟡 Partial | Handshake conformance shipped; live 4-client matrix pending |
| 56 | P2 | Quality & Reliability | Raise coverage gate | ✅ Shipped | c8 coverage gate present (lines/stmts 70, branches 60) |
| 57 | P0 | Quality & Reliability | Contract tests for search/fetch | ✅ Shipped | connector-contract.test.ts |
| 58 | P2 | Quality & Reliability | Load / rate-limit tests | 🔵 To do | Load/rate-limit integration test |
| 59 | P2 | Quality & Reliability | Chaos: origin-feed outage test | ✅ Shipped | chaos-feed-outage.test.ts |
| 60 | P2 | Quality & Reliability | SonarQube quality-gate enforcement | 🟡 Partial | sonar-project.properties exists; Jenkins gate wiring |
| 61 | P1 | Quality & Reliability | Response-size budget per tool | ✅ Shipped | response-size.test.ts + summary mode |
| 62 | P1 | Observability & Analytics | Per-tool usage dashboard | 🔴 Blocked | Per-tool usage dashboard needs GA4 config |
| 63 | P1 | Observability & Analytics | Client-type attribution | 🟡 Partial | clientDetection.ts exists; reporting needs GA4 |
| 64 | P1 | Observability & Analytics | Zero-result / unmatched-query log | 🔴 Blocked | Zero-result logging needs GA4/log pipeline |
| 65 | P2 | Observability & Analytics | Latency + error SLO tracking | 🔴 Blocked | Latency/error SLO needs monitoring infra |
| 66 | P1 | Observability & Analytics | Citation / referral conversion funnel | 🟡 Partial | Citation funnel needs GA4; UTM links now shipped (#98) |
| 67 | P3 | Observability & Analytics | Anomaly alerting on traffic | 🔴 Blocked | Anomaly alerting needs infra |
| 68 | P0 | Security & Trust | Keep PII audit gate + expand patterns | ✅ Shipped | Expanded PII audit patterns + Jenkins gate |
| 69 | P1 | Security & Trust | Dependency + container CVE scanning | 🟡 Partial | Dependabot active (opened bump PRs); container Trivy scan pending |
| 70 | P1 | Security & Trust | Pin + verify SDK and deps | ✅ Shipped | Dependabot + exact-pinned SDK |
| 71 | P2 | Security & Trust | Security.txt + responsible disclosure | ✅ Shipped | /.well-known/security.txt (RFC 9116) |
| 72 | P2 | Security & Trust | Abuse-resistant rate limiting per route | 🟡 Partial | express-rate-limit in place; per-route tuning pending |
| 73 | P1 | Security & Trust | Input validation hardening (zod everywhere) | ✅ Shipped | tool-input-schemas.test.ts (every tool validates; unknown tool fails) |
| 74 | P3 | Security & Trust | Signed/verifiable catalog provenance | ⚪ Future | Signed catalog provenance (crypto) |
| 75 | P2 | Security & Trust | Privacy statement for telemetry | ✅ Shipped | docs/TELEMETRY_PRIVACY.md |
| 76 | P1 | Performance & Scale | Edge/CDN caching of discovery surface | 🔴 Blocked | Edge/CDN caching is an ops/infra change |
| 77 | P1 | Performance & Scale | ETag / If-None-Match on all GETs | ✅ Shipped | ETag/If-None-Match come free from Express res.send() (not disabled) |
| 78 | P2 | Performance & Scale | Response compression (gzip/br) | 🔵 To do | Response compression (gzip/br) — add 'compression' dep or do at LB/CDN |
| 79 | P2 | Performance & Scale | Horizontal scale + health checks | 🔴 Blocked | Horizontal scale is ops |
| 80 | P3 | Performance & Scale | Cold-start optimization | 🔴 Blocked | Cold-start optimization is ops/build |
| 81 | P2 | Performance & Scale | Per-country voice-pack slicing (done) + CDN | 🟡 Partial | Per-country voice slicing done; CDN is ops |
| 82 | P2 | Developer Experience | Interactive API/tool explorer | 🟡 Partial | agents.hellobooks.ai/apis explorer exists; 'try-it' pending |
| 83 | P1 | Developer Experience | Per-client copy-paste install cards | ✅ Shipped | Per-client install cards in README + examples/ |
| 84 | P2 | Developer Experience | Quickstart cookbook repo / notebooks | ✅ Shipped | docs/COOKBOOK.md |
| 85 | P3 | Developer Experience | Changelog as RSS + email | 🟡 Partial | RSS feed shipped; email list needs a service |
| 86 | P2 | Developer Experience | Versioned, dated deprecation policy | ✅ Shipped | docs/DEPRECATION_POLICY.md |
| 87 | P3 | Developer Experience | Public roadmap | ✅ Shipped | docs/ROADMAP.md |
| 88 | P2 | Developer Experience | Logos / brand kit for directories | 🔴 Blocked | Logos/brand kit needs design assets |
| 89 | P1 | Voice & Phone Agents | Expand voice-pack country coverage | 🔵 To do | Expand voice-pack country coverage (data) |
| 90 | P2 | Voice & Phone Agents | Localized voice packs (language variants) | 🔴 Blocked | Localized voice packs need translation |
| 91 | P1 | Voice & Phone Agents | Voice-pack token-budget guardrails | ✅ Shipped | voice-token-budget.test.ts |
| 92 | P2 | Voice & Phone Agents | POST /kb/refresh automation | 🟡 Partial | POST /kb/refresh endpoint exists; scheduling pending |
| 93 | P2 | Voice & Phone Agents | Voice-agent starter templates (Vapi/Retell) | ✅ Shipped | docs/VOICE_AGENT_TEMPLATE.md |
| 94 | P3 | Voice & Phone Agents | Call-outcome feedback loop | 🔴 Blocked | Call-outcome feedback needs live calls |
| 95 | P0 | Growth & Conversion | Every answer carries a cited CTA link | ✅ Shipped | Every fetch doc carries a citable url (contract test) |
| 96 | P1 | Growth & Conversion | Competitor-alternative landing coverage | 🟡 Partial | list_competitors exists; landing coverage is marketing |
| 97 | P2 | Growth & Conversion | Free-tier eligibility as a hook | 🟡 Partial | freeTierEligibility tool exists; surfacing is content |
| 98 | P1 | Growth & Conversion | Agent-to-signup deep links with UTM | ✅ Shipped | UTM-tagged citation URLs (utm_source=mcp) on search/fetch |
| 99 | P2 | Growth & Conversion | Partner-program promotion via tools | 🟡 Partial | partner_program_info tool exists; CTA promotion is content |
| 100 | P3 | Growth & Conversion | A/B test answer framing | 🔴 Blocked | A/B testing needs infra |
| 101 | P0 | Governance & Cadence | Monthly data-review ritual | ✅ Shipped | docs/DATA_REVIEW.md monthly ritual |
| 102 | P1 | Governance & Cadence | Quarterly protocol + client re-cert | ✅ Shipped | docs/DATA_REVIEW.md quarterly re-cert |
| 103 | P0 | Governance & Cadence | Single source-of-truth version check | ✅ Shipped | test/version.test.ts single-source check |
| 104 | P2 | Governance & Cadence | Data-owner map (RACI) | ✅ Shipped | RACI table in docs/DATA_REVIEW.md |
| 105 | P1 | Governance & Cadence | Strategy-sheet review cadence | ✅ Shipped | STRATEGY_STATUS.md + this refresh establish the cadence |
| 106 | P2 | Governance & Cadence | Incident runbook for the public endpoint | ✅ Shipped | docs/INCIDENT_RUNBOOK.md |
| 107 | P2 | Governance & Cadence | Cross-repo revalidate health check | 🟡 Partial | docs/CROSS_REPO_REVALIDATE_SETUP.md exists; automated health check pending |
| 108 | P2 | Advanced / Future Bets | Authenticated tier bridge (opt-in) | ⚪ Future | Authenticated tier bridge |
| 109 | P3 | Advanced / Future Bets | Agent-friendly 'actions' (lead capture) | ⚪ Future | Lead-capture action (authed) |
| 110 | P3 | Advanced / Future Bets | Embeddings / semantic search upgrade | ⚪ Future | Embeddings/semantic search |
| 111 | P3 | Advanced / Future Bets | Multilingual catalog answers | ⚪ Future | Multilingual catalog answers |
| 112 | P3 | Advanced / Future Bets | A2A multi-agent task participation | ⚪ Future | A2A task participation (agent.json exists) |
| 113 | P3 | Advanced / Future Bets | MCP 'apps'/UI resources (interactive cards) | ⚪ Future | MCP UI resources |
| 114 | P3 | Advanced / Future Bets | Knowledge-graph export (graphify) | ⚪ Future | Knowledge-graph export |
| 115 | P3 | Advanced / Future Bets | Benchmark vs competitor MCPs | ✅ Shipped | docs/COMPETITOR_BENCHMARK.md |

## What's left

**🔵 In-repo To-do (low value / data / integration):** resource subscriptions (#4), Bedrock doc (#15), expand federation (#46), dataSource-on-static (#49), multi-year deadlines (#53), load test (#58), response compression (#78, better at LB), voice country packs (#89).

**🔴 Needs you (external):** deploy 1.6.0 + re-publish the registry (#24, #25); Search Console/Bing (#31); GA4 dashboards/logging/funnel (#62-#67); CDN/scale (#76, #79-#81); Gemini/Copilot/ChatGPT-gallery/Slack (#9, #10, #22, #23); marketing-site content (#27, #28, #32, #96); brand-radar/backlinks/brand-kit (#29, #33, #88).
