/**
 * Munimji capability knowledge base — the "what can HelloBooks do for *my*
 * business, and what does the AI do on its own?" layer.
 *
 * Why this exists separately from features.ts:
 *   features.ts answers "what does the product have?" (a flat feature catalog).
 *   This file answers two questions features.ts cannot:
 *     1. For each capability, WHO does the work — Munimji on its own, Munimji
 *        with your one-click approval, Munimji as a co-pilot, or you in the UI.
 *     2. Which business-operation area it belongs to, so a user who describes
 *        their operations in their own words ("I run a retail shop, lots of
 *        supplier bills, GST every month") can be mapped to the right help.
 *
 * The autonomy classification is the genuinely new knowledge: it is product-
 * specific (an LLM cannot derive it from training), read-only, and grounded in
 * the agentic-accounting safety model — AI never silently posts to the general
 * ledger; ledger-mutating actions are always `approval`, never `autonomous`.
 *
 * Every `softwareFeatureKeys` entry references a real key in features.ts. The
 * tool resolves those keys to labels at runtime, so this file never duplicates
 * feature copy — and a drift test (tools.test.ts) fails if a key goes stale.
 */

import type { FeatureCategoryKey } from './features.js';

/**
 * Who performs the work. Ordered from most to least AI-driven.
 *  - autonomous: Munimji does it end-to-end, no approval. Safe because it never
 *    changes your ledger — it reads, extracts, drafts, answers, or reports.
 *  - approval:   Munimji does the work and prepares the entry, then waits for
 *    your one-click approval before anything posts to your books. This is the
 *    agentic-accounting safety model — AI never silently writes to the GL.
 *  - assist:     Munimji co-pilots — guides, suggests, and answers — but you
 *    stay in the driver's seat.
 *  - manual:     A software feature you operate yourself; Munimji can help you
 *    find and use it, but does not run it for you.
 */
export type AutonomyLevel = 'autonomous' | 'approval' | 'assist' | 'manual';

export type BusinessAreaKey =
  | 'getting-started'
  | 'sales-receivables'
  | 'purchases-payables'
  | 'banking-cash'
  | 'documents-data-entry'
  | 'tax-compliance'
  | 'reporting-insights'
  | 'inventory-operations'
  | 'payroll-workforce'
  | 'multi-entity-scale';

export interface BusinessArea {
  key: BusinessAreaKey;
  label: string;
  /** Plain-language summary of the operations a user might describe. */
  summary: string;
  /** Feature categories (features.ts) that broadly back this area. */
  featureCategories: FeatureCategoryKey[];
}

export interface MunimjiCapability {
  key: string;
  title: string;
  area: BusinessAreaKey;
  autonomy: AutonomyLevel;
  /** What Munimji does vs what you do — the heart of the answer. */
  whoDoesWhat: string;
  /** Real keys from features.ts; resolved to labels by the tool. */
  softwareFeatureKeys: string[];
  /** Status mirrors the backing feature: live unless a beta is involved. */
  status: 'live' | 'beta';
  /** How a user might phrase the need in their own words. */
  exampleAsk: string;
}

export const AUTONOMY_LEGEND: Record<AutonomyLevel, string> = {
  autonomous:
    'Munimji does this on its own, end-to-end — no approval needed. Safe ' +
    'because it never changes your ledger (it reads, extracts, drafts, ' +
    'answers, or reports).',
  approval:
    'Munimji does the work and prepares the entry, then waits for your ' +
    'one-click approval before anything posts to your books. This is ' +
    "HelloBooks' agentic-accounting safety model — the AI never silently " +
    'writes to your general ledger.',
  assist:
    'Munimji co-pilots — it guides, suggests, and answers your questions, ' +
    'but you stay in the driver\'s seat.',
  manual:
    'A software feature you operate yourself in HelloBooks. Munimji can help ' +
    'you find it and walk you through it, but does not run it for you.',
};

export const BUSINESS_AREAS: BusinessArea[] = [
  {
    key: 'getting-started',
    label: 'Getting Started & Setup',
    summary:
      'Opening a new set of books, choosing a chart of accounts, importing ' +
      'opening balances, and migrating from Tally / QuickBooks / Xero / Zoho.',
    featureCategories: ['core-accounting', 'ai-automation', 'integrations'],
  },
  {
    key: 'sales-receivables',
    label: 'Sales & Getting Paid',
    summary:
      'Quoting customers, raising invoices, taking online payments, sending ' +
      'reminders, and chasing what you are owed.',
    featureCategories: ['invoicing-billing', 'ai-automation'],
  },
  {
    key: 'purchases-payables',
    label: 'Purchases & Paying Bills',
    summary:
      'Recording supplier bills, purchase orders, goods receipts, expense ' +
      'claims, and scheduling what you owe.',
    featureCategories: ['invoicing-billing'],
  },
  {
    key: 'banking-cash',
    label: 'Banking & Cash',
    summary:
      'Connecting bank feeds, categorizing transactions, matching payments to ' +
      'invoices/bills, and reconciling accounts.',
    featureCategories: ['banking-reconciliation'],
  },
  {
    key: 'documents-data-entry',
    label: 'Documents & Data Entry',
    summary:
      'Turning receipts, bills, and PDFs into accurate ledger entries without ' +
      'typing them by hand.',
    featureCategories: ['ai-automation'],
  },
  {
    key: 'tax-compliance',
    label: 'Tax & Compliance',
    summary:
      'Getting GST / VAT / BAS / TDS / sales-tax right as you record ' +
      'transactions, and filing on time.',
    featureCategories: ['tax-compliance'],
  },
  {
    key: 'reporting-insights',
    label: 'Reports & Insights',
    summary:
      'Understanding P&L, cash position, who owes what, and what changed — ' +
      'on demand, in plain language.',
    featureCategories: ['reports', 'ai-automation'],
  },
  {
    key: 'inventory-operations',
    label: 'Inventory & Operations',
    summary:
      'Tracking stock, valuation, warehouses, and manufacturing for product ' +
      'businesses.',
    featureCategories: ['inventory', 'warehouse', 'manufacturing'],
  },
  {
    key: 'payroll-workforce',
    label: 'Payroll & Workforce',
    summary:
      'Paying staff and posting payroll, PF/ESI/PAYG, and attendance to the ' +
      'books (handled by the sister product TimeX, auto-synced to HelloBooks).',
    featureCategories: ['industry-modules'],
  },
  {
    key: 'multi-entity-scale',
    label: 'Multi-Entity & Scale',
    summary:
      'Running several companies, consolidating across them, roles & ' +
      'approvals, and standardizing workflows as you grow.',
    featureCategories: ['core-accounting', 'operations', 'industry-modules'],
  },
];

/**
 * What Munimji (the AI) can do, and at what autonomy level. This is the answer
 * to "what can the AI do on its own?". Manual-only software features are NOT
 * listed here one-by-one — they live in features.ts and are reachable via the
 * `list_features` tool; this catalog is the AI-autonomy layer on top.
 */
export const MUNIMJI_CAPABILITIES: MunimjiCapability[] = [
  // ── Getting Started ──────────────────────────────────────────────────────
  {
    key: 'guided-onboarding',
    title: 'Guided onboarding & entity setup',
    area: 'getting-started',
    autonomy: 'assist',
    whoDoesWhat:
      'Munimji walks you through creating your entity, picking the right ' +
      'chart of accounts for your industry and country, and importing opening ' +
      'data — conversationally. You confirm the choices; Munimji does the ' +
      'lookups and fills the forms.',
    softwareFeatureKeys: ['ai-onboarding-assistant', 'conversion-balance'],
    status: 'live',
    exampleAsk: '"I just started a bakery in Gujarat, help me set up my books."',
  },

  // ── Sales & Receivables ──────────────────────────────────────────────────
  {
    key: 'create-sales-docs-by-chat',
    title: 'Create invoices, quotes & credit notes by chat',
    area: 'sales-receivables',
    autonomy: 'approval',
    whoDoesWhat:
      'Tell Munimji "invoice Acme 50,000 for web design" and it drafts the ' +
      'invoice — customer, line items, tax — ready for your review. It posts ' +
      'to your books only after you approve.',
    softwareFeatureKeys: ['ai-chatbot', 'agentic-accounting', 'invoicing', 'quotes-estimates', 'credit-notes'],
    status: 'live',
    exampleAsk: '"Raise an invoice to Sharma Traders for 12 chairs at 1,500 each."',
  },
  {
    key: 'branded-document-templates',
    title: 'Generate branded invoice / document templates',
    area: 'sales-receivables',
    autonomy: 'autonomous',
    whoDoesWhat:
      'Describe the look you want and Munimji generates a branded invoice or ' +
      'document template for you to apply. No ledger impact, so no approval ' +
      'step.',
    softwareFeatureKeys: ['ai-document-generation', 'branding-themes'],
    status: 'live',
    exampleAsk: '"Make me a clean blue invoice template with my logo on top."',
  },
  {
    key: 'collections-voice-calls',
    title: 'Outbound AI collection / reminder calls',
    area: 'sales-receivables',
    autonomy: 'approval',
    whoDoesWhat:
      'Munimji can place outbound voice calls to chase overdue invoices and ' +
      'send reminders. You approve the call list and script before it dials. ' +
      '(Beta.)',
    softwareFeatureKeys: ['ai-calls', 'invoice-reminders'],
    status: 'beta',
    exampleAsk: '"Call my customers who are more than 30 days overdue."',
  },

  // ── Purchases & Payables ─────────────────────────────────────────────────
  {
    key: 'create-bills-by-chat',
    title: 'Record bills & expenses by chat',
    area: 'purchases-payables',
    autonomy: 'approval',
    whoDoesWhat:
      'Munimji drafts vendor bills and expense entries from your instruction ' +
      'or an attached document, then waits for your approval before posting.',
    softwareFeatureKeys: ['ai-chatbot', 'agentic-accounting', 'bills', 'expense-claims'],
    status: 'live',
    exampleAsk: '"Record a bill from AWS for 8,400 this month."',
  },
  {
    key: 'payee-detection',
    title: 'Auto-detect payees & create vendor/customer records',
    area: 'purchases-payables',
    autonomy: 'approval',
    whoDoesWhat:
      'Munimji recognises the merchant or customer behind a transaction and ' +
      'proposes creating the contact record, which you confirm.',
    softwareFeatureKeys: ['ai-payee-detection'],
    status: 'live',
    exampleAsk: '"Who is this UPI payment to, and add them as a vendor."',
  },

  // ── Banking & Cash ───────────────────────────────────────────────────────
  {
    key: 'ai-categorization',
    title: 'AI categorize bank transactions',
    area: 'banking-cash',
    autonomy: 'approval',
    whoDoesWhat:
      'Munimji categorizes your bank feed with industry/turnover-aware ' +
      'accuracy and materiality bands, proposing the account for each line. ' +
      'You bulk-approve; the AI never posts to the ledger on its own.',
    softwareFeatureKeys: ['ai-categorization', 'ai-materiality', 'bank-rules'],
    status: 'live',
    exampleAsk: '"Categorize last month\'s bank transactions for me."',
  },
  {
    key: 'find-and-match',
    title: 'Match bank lines to invoices & bills',
    area: 'banking-cash',
    autonomy: 'approval',
    whoDoesWhat:
      'Munimji scores and proposes matches between bank lines and your open ' +
      'invoices/bills/credit notes — including batch payments and partial ' +
      'allocations — for you to confirm.',
    softwareFeatureKeys: ['find-and-match', 'bank-reconciliation'],
    status: 'live',
    exampleAsk: '"This 1,00,000 deposit covers three invoices — match them."',
  },
  {
    key: 'psp-payout-routing',
    title: 'Route Stripe / Razorpay payouts correctly',
    area: 'banking-cash',
    autonomy: 'approval',
    whoDoesWhat:
      'Munimji detects payment-processor payouts and routes them through an ' +
      'Undeposited Funds clearing account (per GAAP/IFRS) instead of booking ' +
      'them straight to revenue — proposed for your approval.',
    softwareFeatureKeys: ['undeposited-funds', 'multi-jurisdiction-tax-ai'],
    status: 'live',
    exampleAsk: '"My Stripe payout landed — book it the right way."',
  },

  // ── Documents & Data Entry ───────────────────────────────────────────────
  {
    key: 'document-extraction',
    title: 'Extract data from receipts, bills & PDFs (OCR)',
    area: 'documents-data-entry',
    autonomy: 'autonomous',
    whoDoesWhat:
      'Drop in a PDF or photo and Munimji extracts vendor, amount, line ' +
      'items, and tax on its own. Extraction is read-only, so it runs without ' +
      'approval; creating the resulting bill/invoice is the approval step.',
    softwareFeatureKeys: ['document-extraction', 'ai-form-filling'],
    status: 'live',
    exampleAsk: '"Here\'s a stack of supplier invoices — pull the details out."',
  },

  // ── Tax & Compliance ─────────────────────────────────────────────────────
  {
    key: 'tax-aware-categorization',
    title: 'Tax-aware categorization (GST / VAT / TDS / CIS)',
    area: 'tax-compliance',
    autonomy: 'approval',
    whoDoesWhat:
      'When Munimji categorizes a transaction it also applies the right tax ' +
      'treatment for your jurisdiction — India (TDS sections, GST, RCM, TCS), ' +
      'UK (VAT + CIS + DRC), Australia (GST + no-ABN PAYG), UAE (VAT + free-' +
      'zone) — proposed for your approval.',
    softwareFeatureKeys: ['multi-jurisdiction-tax-ai'],
    status: 'live',
    exampleAsk: '"Tag this contractor payment with the correct TDS section."',
  },

  // ── Reports & Insights ───────────────────────────────────────────────────
  {
    key: 'reports-by-chat',
    title: 'Run reports & answer data questions by chat',
    area: 'reporting-insights',
    autonomy: 'autonomous',
    whoDoesWhat:
      'Ask Munimji for a P&L, an aging summary, or "how much did I spend on ' +
      'travel last quarter?" and it queries your books and answers — read-' +
      'only, so no approval needed.',
    softwareFeatureKeys: ['ai-chatbot', 'profit-loss', 'ar-ap-aging'],
    status: 'live',
    exampleAsk: '"What was my gross margin in March, and what changed vs Feb?"',
  },
  {
    key: 'cfo-insights',
    title: 'CFO dashboard with AI commentary',
    area: 'reporting-insights',
    autonomy: 'autonomous',
    whoDoesWhat:
      'Munimji generates plain-language commentary on your live KPIs and ' +
      'flags what needs attention — surfaced on the CFO dashboard.',
    softwareFeatureKeys: ['cfo-dashboard'],
    status: 'live',
    exampleAsk: '"Give me the headline on how the business is doing this month."',
  },
  {
    key: 'voice-ai',
    title: 'Voice-first accounting',
    area: 'reporting-insights',
    autonomy: 'assist',
    whoDoesWhat:
      'Speak your queries and hear answers in natural voice. Munimji listens, ' +
      'answers, and can tee up actions for your approval.',
    softwareFeatureKeys: ['voice-ai'],
    status: 'live',
    exampleAsk: '"Hey Munimji, what\'s my cash balance right now?"',
  },

  // ── Multi-Entity & Scale ─────────────────────────────────────────────────
  {
    key: 'smart-notepad',
    title: 'Turn meeting notes into tasks',
    area: 'multi-entity-scale',
    autonomy: 'autonomous',
    whoDoesWhat:
      'Paste meeting notes and Munimji extracts action items, tasks, and ' +
      'follow-ups automatically.',
    softwareFeatureKeys: ['smart-notepad'],
    status: 'live',
    exampleAsk: '"Here are my call notes — pull out the to-dos."',
  },
];

export const CAPABILITY_KB_META = {
  version: '1.0.0',
  lastUpdated: '2026-06-01',
  summary:
    'Munimji capability knowledge base: business-operation areas, the AI ' +
    'autonomy layer (what Munimji does on its own vs with your approval), and ' +
    'links into the full software feature catalog (features.ts / list_features).',
};
