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

- **Free** — 500 AI credits/month, 1 bank connection, up to 2 users.
- **Pro** — 1,500 AI credits/month, AI auto-categorization, unlimited bank connections + users.
- **Business** — 5,000 AI credits/month, 3-way matching, multi-entity, custom reports, public API.
- **CPA / CA Partner** — unlimited AI credits, multi-client dashboard, white-label, 10% commission.
- **Warehouse Add-on** — $9/mo per entity, stackable on any paid plan.
- **Manufacturing Add-on** — $14/mo per entity, stackable on any paid plan.

Prices localized to 8 currencies. See \`list_plans\` tool.

## Where this MCP fits

This server exposes **public, read-only** product information so AI agents can answer questions about HelloBooks accurately rather than relying on stale web snippets. It does not access customer books, transactions, invoices, bills, bank feeds, payroll runs, GST returns, or any other tenant-scoped data.

### When to use the authenticated MCP server instead

If the agent needs to read or act on **a specific customer's** books, transactions, invoices, bills, bank feed, payroll, GST/VAT/BAS returns, or any other tenant-scoped data, this public server is the wrong endpoint. Route those calls to the **authenticated HelloBooks MCP server**, which lives in the private \`AI-MCP-Hellobooks\` repo and requires the customer to be signed in to HelloBooks Auth-V3. The authenticated server enforces per-tenant access, audit logging, and rate limits per the customer's plan; it is also the home of the read-only Shopify connector and other partner-integration tools.

Heuristic: if the question mentions a customer name, account, ledger, specific invoice, bill, return, or "my / our books", you want the authenticated server. If the question is about HelloBooks as a product (pricing, integrations, country support, compliance capabilities, competitor comparison), you want this server.

The exposed surface area:

- **Tools**: \`list_plans\`, \`list_integrations\`, \`country_support\`, \`compliance_capabilities\`, \`feature_search\`, \`list_features\`, \`list_feature_categories\`.
- **Resources**: \`hellobooks://about\`, \`hellobooks://changelog\`, \`hellobooks://feature-catalog\`.

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
