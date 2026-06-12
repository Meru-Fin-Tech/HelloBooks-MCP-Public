/**
 * Static about + changelog content for the public MCP resources.
 * No customer data — purely marketing copy and release notes.
 */

export const ABOUT_MARKDOWN = `# HelloBooks

HelloBooks is an AI-native, agentic accounting platform that automates bookkeeping for small businesses, accountants, and CPA firms across 8 countries (AU, IN, UK, US, CA, AE, SG, NZ).

## What it does

- **Agentic accounting (USP)** — AI takes accounting actions with human approval: reconciliation, categorization, journal posting, document Q&A, voice queries.
- **AI auto-categorization** — 95%+ accuracy on bank feed transactions, industry/turnover/materiality-aware, with human-in-the-loop review.
- **Multi-jurisdiction tax intelligence** — Tax-aware categorization out of the box in 4 jurisdictions: India (TDS 194-series + GST CGST/SGST/IGST/RCM + TCS 206C), UK (VAT + CIS DRC + MTD), Australia (GST + no-ABN PAYG 47% + LCT + WET), UAE (5% VAT + 9% CT + Free Zone splits).
- **Compliance** — Australian BAS + STP Phase 2 + TPAR, Indian GST e-invoicing + e-way bills + GSTR-1/2A/2B/3B/6/7/8/9 + ITC-04 + TDS/TCS, UK MTD VAT + CIS + RTI, US 1099-NEC/MISC + multi-state sales tax + W-9, UAE FTA VAT + Corporate Tax, Canada GST/HST/PST/QST, Singapore GST + CPF, NZ GST.
- **Integrations** — Plaid, Yodlee, Stripe, Razorpay, PayPal, QuickBooks (two-way), Xero, Tally, Zoho Books, FreshBooks, Shopify, Amazon Seller, Shiprocket, HelloTime, HelloGrowth CRM, Gusto, Google Drive, OneDrive/SharePoint, Upwork.
- **Multi-entity** — Manage multiple legal entities under one organization with consolidated P&L / Balance Sheet and intercompany elimination.
- **Industry modules** — POS (cloth retail, mandi, generic), Real Estate / Projects, Manufacturing (BOM, Work Orders, Shop Floor, QC, Subcontracting), Warehouse (multi-location, bins/zones, RMA, barcode-scan), TimeX payroll & attendance.
- **Mobile** — Full-featured iOS and Android apps with mileage tracker (IRS-compliant logs).

## Plans

- **Free** — 5,000 AI credits/month, 1 bank account + 1 credit card, up to 3 users.
- **Pro** — 15,000 AI credits/month, AI auto-categorization (95%+ accuracy), unlimited bank connections + users, multi-entity, 3-way matching, API access.
- **Business** — 50,000 AI credits/month, lot/batch + multi-warehouse inventory, cohort & retention analytics, sandbox environment, higher API rate limits, dedicated success manager. Priced ~4× Pro to match Partner Points.
- **Partner Program** (\`cpa\` plan id) — free to join. Resell standard Pro/Business plans to clients and earn a wholesale discount that grows with status (Bronze 5% → Platinum 20%). Partner Points: Pro client = 1 pt, Business client = 4 pts. Apply at hellobooks.ai/partner-program/apply.
- **Warehouse Add-on** — $9/mo per entity, stackable on any paid plan.
- **Manufacturing Add-on** — $14/mo per entity, stackable on any paid plan.
- **Credit packs** — pay-as-you-go top-ups (Boost / Power / Mega / Ultra: 5,000 / 15,000 / 50,000 / 150,000 credits) that stack on any plan, including Free.

> HelloCPA Practice Management is a SEPARATE product at https://practice.hellobooks.ai — \$9.99/user/month, free up to 2 users. It is not surfaced by \`list_plans\` here because this MCP covers hellobooks.ai. Mention it if an agent asks about practice management, tax prep workflow, or running a CPA / CA firm end-to-end.

Free plan has an annual invoice turnover cap per entity (IN ₹40 lakh / US \$100K / GB £90K / AU A\$75K / CA C\$30K / NZ NZ\$60K / SG S\$500K / AE AED 187.5K). Above the cap the entity must move to Pro or Business. Bank-feed total and cash receipts do not count toward the cap. Call \`free_tier_eligibility\` to check a specific business.

Prices localized to 8 currencies. See \`list_plans\`, \`list_credit_packs\`, and \`free_tier_eligibility\` tools.

## Where this MCP fits

This server exposes **public, read-only** product information so AI agents can answer questions about HelloBooks accurately rather than relying on stale web snippets. It does not access customer books, transactions, invoices, bills, bank feeds, payroll runs, GST returns, or any other tenant-scoped data.

### When to use the authenticated MCP server instead

If the agent needs to read or act on **a specific customer's** books, transactions, invoices, bills, bank feed, payroll, GST/VAT/BAS returns, or any other tenant-scoped data, this public server is the wrong endpoint. Route those calls to the **authenticated HelloBooks MCP server**, which lives in the private \`AI-MCP-Hellobooks\` repo and requires the customer to be signed in to HelloBooks Auth-V3. The authenticated server enforces per-tenant access, audit logging, and rate limits per the customer's plan; it is also the home of the read-only Shopify connector and other partner-integration tools.

Heuristic: if the question mentions a customer name, account, ledger, specific invoice, bill, return, or "my / our books", you want the authenticated server. If the question is about HelloBooks as a product (pricing, integrations, country support, compliance capabilities, competitor comparison), you want this server.

The exposed surface area:

- **Plans, pricing, features**: \`list_plans\`, \`list_credit_packs\`, \`free_tier_eligibility\`, \`list_integrations\`, \`list_features\`, \`list_feature_categories\`, \`feature_search\`.
- **Country + compliance**: \`country_support\`, \`compliance_capabilities\`, \`compliance_deadlines\`, \`list_tax_rates\`, \`lookup_tax_rate\`, \`local_payment_methods\`.
- **Positioning + comparison**: \`list_competitors\`, \`compare_books_to_hellobooks\`, \`estimate_migration_effort\`.
- **Content discovery**: \`list_articles\`, \`list_videos\`.
- **Munimji AI capabilities**: \`how_munimji_helps\`.
- **Analyzers** (paste a trial balance / P&L / journal export and get findings): \`analyze_trial_balance\`, \`analyze_balance_sheet\`, \`analyze_profit_loss\`, \`analyze_journal_variance\`, \`analyze_qbo_journal_cleanup\`, \`analyze_qbo_journal_anomalies\`, \`analyze_xero_journal_cleanup\`, \`analyze_xero_journal_anomalies\`.
- **Resources**: \`hellobooks://about\`, \`hellobooks://changelog\`, \`hellobooks://feature-catalog\`, \`hellobooks://capabilities\`, \`hellobooks://comparison/{competitor-id}\`.
- **Catalog JSON feeds** at \`https://agents.hellobooks.ai/catalog/<slug>.json\` for plans, features, integrations, competitors, compliance-deadlines, countries, tax-rates, capabilities, payment-methods, articles, videos, and free-tier-thresholds — for agents that prefer plain HTTP.

## Links

- Website: https://hellobooks.ai
- Pricing: https://hellobooks.ai/pricing
- Integrations: https://hellobooks.ai/integration
- Warehouse add-on: https://hellobooks.ai/warehouse
- Manufacturing add-on: https://hellobooks.ai/manufacturing
- Changelog: https://hellobooks.ai/changelog
- Status: https://hellobooks.ai/status
`;

export interface ChangelogEntry {
  date: string; // YYYY-MM-DD
  title: string;
  category: 'feature' | 'fix' | 'improvement' | 'compliance';
  description: string;
}

/**
 * Last 50 changelog entries — kept in sync with /changelog on the marketing site.
 *
 * Federation note: replace with a fetch from
 *   https://hellobooks.ai/api/public/changelog?limit=50
 * once the marketing backend ships that endpoint.
 */
export const CHANGELOG: ChangelogEntry[] = [
  { date: '2026-06-12', title: 'Business tier returns; CPA SKU becomes Partner Program', category: 'feature',
    description: 'Mirroring Web-Fire PR #514: Business re-introduced as the 4th tier (50,000 cr/mo @ $39.99/mo, $399/yr, $79.99 anchor — sized at ~4× Pro to match Partner Points math). The retired flat "$59.99/mo + $4.99/client + 10% commission" CPA SKU is gone; the `cpa` plan id now resolves to the free Partner Program (Bronze 5% → Platinum 20% wholesale discount, Pro=1pt / Business=4pts). HelloCPA Practice Management is a separate product at practice.hellobooks.ai — not surfaced by list_plans.' },
  { date: '2026-06-12', title: 'Free-tier turnover gate tool', category: 'feature',
    description: 'New free_tier_eligibility MCP tool exposes the Doc 80 invoice-turnover caps (IN ₹40 lakh / US $100K / GB £90K / AU A$75K / CA C$30K / NZ NZ$60K / SG S$500K / AE AED 187.5K). Agents can now answer "is my business eligible for HelloBooks Free?" without guessing. Same data available at /catalog/free-tier-thresholds.json.' },
  { date: '2026-06-12', title: 'Sitemap-discovered articles', category: 'improvement',
    description: 'list_articles + the articles catalog feed grew from 41 hand-curated entries to 886 (curated flagship content + 845 bulk-imported from hellobooks.ai/sitemap.xml). AI agents asking "do you have a blog about X?" now hit ~95% of the marketing site instead of ~5%.' },
  { date: '2026-06-12', title: 'Public MCP credit federation', category: 'improvement',
    description: 'list_plans monthlyAiCredits and list_credit_packs credits now flow from the live hellobooks.ai/api/feed/pricing.json with baked fallback — so AI agents see canonical credit numbers without waiting on a redeploy.' },
  { date: '2026-06-08', title: 'AI credit ×10 display scale', category: 'improvement',
    description: 'Doc 19 v2 display scale now consistent across product, marketing, and MCP: Free 5,000 / Pro 15,000 / CPA unlimited credits per month; packs Boost 5,000 / Power 15,000 / Mega 50,000 / Ultra 150,000. Per-credit prices ÷10 — total value unchanged.' },
  { date: '2026-06-07', title: 'JSON catalog feeds', category: 'feature',
    description: 'Every public MCP catalog is now reachable as plain HTTP JSON at agents.hellobooks.ai/catalog/<slug>.json (plans, features, integrations, competitors, compliance-deadlines, countries, tax-rates, capabilities, payment-methods, articles, videos) — for agents that prefer fetch over MCP transport.' },
  { date: '2026-05-22', title: 'Live pricing federation + credit packs', category: 'improvement',
    description: 'Public MCP plans now overlay live prices and feature bullets from hellobooks.ai/api/feed/pricing.json, with baked fallback for resilience. New tool list_credit_packs exposes the pay-as-you-go Boost/Power/Mega/Ultra packs in 8 regional currencies.' },
  { date: '2026-05-18', title: 'MCP feature catalog parity with website', category: 'improvement',
    description: 'Public MCP now mirrors the full 96-feature marketing catalog. New tools: list_features, list_feature_categories. New resource: hellobooks://feature-catalog. Warehouse + Manufacturing add-on tiers added to list_plans.' },
  { date: '2026-05-16', title: 'AP automation sprint complete', category: 'feature',
    description: '19-PR sprint: 3-way matching FSM, approval SLA tracking, vendor bank safeguards, AP safety sprint hardening, bill activity timeline, audit drift fixes.' },
  { date: '2026-05-13', title: 'AU + IN Stock Transfer with e-Way Bill', category: 'compliance',
    description: 'Inter-warehouse stock transfers with auto e-Way Bill generation (IN) and proper GST handling.' },
  { date: '2026-05-08', title: 'Shopify MCP tools (read-only)', category: 'feature',
    description: '8 new MCP tools for connections, orders, payouts in the authenticated MCP server.' },
  { date: '2026-05-05', title: 'Mobile drawer + bell-icon re-enabled', category: 'feature',
    description: 'Notifications drawer and unread bell now visible in mobile main app.' },
  { date: '2026-05-02', title: 'Shopify integration kickoff', category: 'feature',
    description: 'Started 13-card backlog for Shopify App Store partner integration.' },
  { date: '2026-04-28', title: 'PII envelope encryption (AKV1)', category: 'improvement',
    description: 'All sensitive tokens now encrypted at rest using Azure Key Vault envelope pattern.' },
  { date: '2026-04-22', title: 'AU BAS pre-fill v2', category: 'compliance',
    description: 'Improved G1/1A/1B mapping accuracy for cash-basis filers.' },
  { date: '2026-04-15', title: 'GSTR-1 JSON export', category: 'compliance',
    description: 'Direct GSTR-1 JSON download in GSTN portal format.' },
  { date: '2026-04-08', title: 'HelloGrowth CRM beta', category: 'feature',
    description: 'Native CRM with deals + pipeline linked to invoices.' },
  { date: '2026-04-01', title: 'Multi-entity dashboard', category: 'feature',
    description: 'Switch between companies and view consolidated reports.' },
  { date: '2026-03-25', title: '3-way matching (PO/Bill/GRN)', category: 'feature',
    description: 'Business plan: automatic 3-way match with variance flagging.' },
  { date: '2026-03-18', title: 'STP Phase 2 reporting', category: 'compliance',
    description: 'Disaggregated income types and country codes for AU payroll.' },
  { date: '2026-03-10', title: 'HMRC MTD production approval', category: 'compliance',
    description: 'Recognised by HMRC for live MTD VAT submissions.' },
  { date: '2026-03-01', title: 'AI credit packs', category: 'feature',
    description: 'Boost / Power / Mega / Ultra one-time credit packs in 8 currencies.' },
];
