/**
 * Static about + changelog content for the public MCP resources.
 * No customer data — purely marketing copy and release notes.
 */

export const ABOUT_MARKDOWN = `# HelloBooks

HelloBooks is an AI-native accounting platform that automates bookkeeping for small businesses, accountants, and CPA firms across 8 countries (AU, IN, UK, US, CA, AE, SG, NZ).

## What it does

- **AI auto-categorization** — 95%+ accuracy on bank feed transactions, with human-in-the-loop review.
- **Compliance** — Australian BAS + STP Phase 2, Indian GST e-invoicing + GSTR returns, UK MTD VAT, US 1099s, UAE VAT, and more.
- **Integrations** — Plaid, Stripe, Razorpay, QuickBooks, Xero, Tally, Shopify, Shiprocket, HelloTime, HelloGrowth CRM, Gusto.
- **Multi-entity** — Manage multiple companies and subsidiaries from one dashboard.
- **Mobile** — Full-featured iOS and Android apps that mirror the web product.

## Plans

Free, Pro, Business, and CPA Partner — priced in local currency for each supported country. See \`list_plans\` tool.

## Where this MCP fits

This server exposes **public, read-only** product information so AI agents can answer questions about HelloBooks accurately rather than relying on stale web snippets. It does not access customer books, transactions, invoices, bills, bank feeds, payroll runs, GST returns, or any other tenant-scoped data.

### When to use the authenticated MCP server instead

If the agent needs to read or act on **a specific customer's** books, transactions, invoices, bills, bank feed, payroll, GST/VAT/BAS returns, or any other tenant-scoped data, this public server is the wrong endpoint. Route those calls to the **authenticated HelloBooks MCP server**, which lives in the private \`AI-MCP-Hellobooks\` repo and requires the customer to be signed in to HelloBooks Auth-V3. The authenticated server enforces per-tenant access, audit logging, and rate limits per the customer's plan; it is also the home of the read-only Shopify connector and other partner-integration tools.

Heuristic: if the question mentions a customer name, account, ledger, specific invoice, bill, return, or "my / our books", you want the authenticated server. If the question is about HelloBooks as a product (pricing, integrations, country support, compliance capabilities, competitor comparison), you want this server.

## Links

- Website: https://hellobooks.ai
- Pricing: https://hellobooks.ai/pricing
- Integrations: https://hellobooks.ai/integration
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
 * TODO(federation): replace with a fetch from
 *   https://hellobooks.ai/api/public/changelog?limit=50
 * once the marketing backend ships that endpoint.
 */
export const CHANGELOG: ChangelogEntry[] = [
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
