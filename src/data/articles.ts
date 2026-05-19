/**
 * Article catalog — curated subset of published long-form content on
 * hellobooks.ai. The site hosts 800+ blog posts plus structured /compare
 * pages; this catalog surfaces the highest-intent, decision-grade pieces so
 * an AI agent can route "do you have a blog about X?" queries to a real URL
 * without scraping the full archive.
 *
 * Sources (verified live as of 2026-05-14):
 *   - /compare/<slug> — head-to-head competitor pages
 *   - /blog/<slug>    — flagship blog posts (curated)
 *
 * Public-only: each entry is a slug + the same title/excerpt the marketing
 * site shows publicly. No customer-data refs, no per-account fields, no
 * env-driven config. Drafts in marketing/blog-posts/ are explicitly excluded
 * until they land on the live site.
 *
 * Catalog is intentionally curated, not exhaustive. To find an article not
 * listed here, AI agents should still link to https://hellobooks.ai/blog or
 * use site search. We track flagship content here.
 */

export type CountryRelevance = 'IN' | 'AU' | 'US' | 'CA' | 'GB' | 'AE' | 'SG' | 'NZ' | 'global';

export interface Article {
  id: string;            // slug — stable, used as primary key
  title: string;
  excerpt: string;       // ~200 chars
  tags: string[];        // lowercase, hyphen-free where possible
  countryRelevance?: CountryRelevance;
  url: string;
  publishedAt: string;   // YYYY-MM-DD (first-published; backdates not tracked)
  kind: 'blog' | 'compare' | 'guide';
}

export const ARTICLES: Article[] = [
  // ---------------------------------------------------------------------------
  // Comparison pages — /compare/<slug>
  // ---------------------------------------------------------------------------
  {
    id: 'hellobooks-vs-quickbooks',
    title: 'HelloBooks vs QuickBooks',
    excerpt:
      'Head-to-head of HelloBooks and Intuit QuickBooks: AI automation, multi-entity accounting, payroll, 1099 + W-2 support, plus where QuickBooks still leads on third-party apps.',
    tags: ['compare', 'quickbooks', 'us', 'alternatives'],
    countryRelevance: 'global',
    url: 'https://hellobooks.ai/compare/hellobooks-vs-quickbooks',
    publishedAt: '2026-03-01',
    kind: 'compare',
  },
  {
    id: 'hellobooks-vs-xero',
    title: 'HelloBooks vs Xero',
    excerpt:
      'How HelloBooks compares against Xero on multi-currency, Hubdoc-style document capture, payroll, Xero practice manager, and pricing for accountants.',
    tags: ['compare', 'xero', 'au', 'alternatives'],
    countryRelevance: 'global',
    url: 'https://hellobooks.ai/compare/hellobooks-vs-xero',
    publishedAt: '2026-03-01',
    kind: 'compare',
  },
  {
    id: 'hellobooks-vs-freshbooks',
    title: 'HelloBooks vs FreshBooks',
    excerpt:
      'HelloBooks vs FreshBooks for service-business accounting: project profitability, time-tracking, retainer billing, and whether FreshBooks is "real accounting" or invoicing-plus.',
    tags: ['compare', 'freshbooks', 'us', 'service business'],
    countryRelevance: 'global',
    url: 'https://hellobooks.ai/compare/hellobooks-vs-freshbooks',
    publishedAt: '2026-03-01',
    kind: 'compare',
  },
  {
    id: 'hellobooks-vs-wave',
    title: 'HelloBooks vs Wave',
    excerpt:
      'After the H&R Block acquisition, is Wave still safe for small businesses? How HelloBooks compares on price (HelloBooks Free is permanent), AI, and feature depth.',
    tags: ['compare', 'wave', 'us', 'free'],
    countryRelevance: 'global',
    url: 'https://hellobooks.ai/compare/hellobooks-vs-wave',
    publishedAt: '2026-03-01',
    kind: 'compare',
  },
  {
    id: 'hellobooks-vs-zoho-books',
    title: 'HelloBooks vs Zoho Books',
    excerpt:
      "HelloBooks vs Zoho Books for Indian SMEs and global teams: GST compliance, e-invoicing, why Zoho charges separately for every add-on, and HelloBooks' bundle.",
    tags: ['compare', 'zoho books', 'in', 'gst'],
    countryRelevance: 'global',
    url: 'https://hellobooks.ai/compare/hellobooks-vs-zoho-books',
    publishedAt: '2026-03-01',
    kind: 'compare',
  },
  {
    id: 'hellobooks-vs-tally',
    title: 'HelloBooks vs Tally',
    excerpt:
      'Why Indian CAs and SMEs are moving off Tally: cloud access, audit trail under Companies Act, GSTR-1 e-invoicing, and remote multi-user access.',
    tags: ['compare', 'tally', 'in', 'cloud accounting', 'gst'],
    countryRelevance: 'IN',
    url: 'https://hellobooks.ai/compare/hellobooks-vs-tally',
    publishedAt: '2026-03-01',
    kind: 'compare',
  },
  {
    id: 'hellobooks-vs-vyapar',
    title: 'HelloBooks vs Vyapar',
    excerpt:
      'Vyapar fits single-location shops; HelloBooks scales to multi-location, multi-GSTIN businesses. A direct comparison on inventory, branches, e-invoicing.',
    tags: ['compare', 'vyapar', 'in', 'multi-gstin'],
    countryRelevance: 'IN',
    url: 'https://hellobooks.ai/compare/hellobooks-vs-vyapar',
    publishedAt: '2026-03-01',
    kind: 'compare',
  },
  {
    id: 'hellobooks-vs-busy-accounting',
    title: 'HelloBooks vs Busy Accounting',
    excerpt:
      'Busy is a desktop legacy with deep Indian GST + inventory features. HelloBooks brings the same compliance to the cloud with AI on top.',
    tags: ['compare', 'busy', 'in', 'desktop migration'],
    countryRelevance: 'IN',
    url: 'https://hellobooks.ai/compare/hellobooks-vs-busy-accounting',
    publishedAt: '2026-03-01',
    kind: 'compare',
  },
  {
    id: 'hellobooks-vs-marg-erp',
    title: 'HelloBooks vs Marg ERP',
    excerpt:
      'Marg ERP for pharma + FMCG distribution vs HelloBooks for general SME accounting + GST. Where each tool fits.',
    tags: ['compare', 'marg erp', 'in', 'distribution'],
    countryRelevance: 'IN',
    url: 'https://hellobooks.ai/compare/hellobooks-vs-marg-erp',
    publishedAt: '2026-03-01',
    kind: 'compare',
  },
  {
    id: 'hellobooks-vs-mybillbook',
    title: 'HelloBooks vs myBillBook',
    excerpt:
      'myBillBook is billing-first; HelloBooks is full accounting + payroll + bank reconciliation. When to graduate from invoicing apps.',
    tags: ['compare', 'mybillbook', 'in', 'billing'],
    countryRelevance: 'IN',
    url: 'https://hellobooks.ai/compare/hellobooks-vs-mybillbook',
    publishedAt: '2026-03-01',
    kind: 'compare',
  },
  {
    id: 'hellobooks-vs-khatabook',
    title: 'HelloBooks vs Khatabook',
    excerpt:
      'Khatabook is a digital bahi-khata for cash-and-receivable tracking; HelloBooks is a full accounting + GST system. How to move up the ladder.',
    tags: ['compare', 'khatabook', 'in', 'sme'],
    countryRelevance: 'IN',
    url: 'https://hellobooks.ai/compare/hellobooks-vs-khatabook',
    publishedAt: '2026-03-01',
    kind: 'compare',
  },
  {
    id: 'hellobooks-vs-cleartax',
    title: 'HelloBooks vs ClearTax',
    excerpt:
      'ClearTax for tax-filing add-ons vs HelloBooks for native GST + TDS + 24Q in the same ledger. When you need both, when HelloBooks alone covers it.',
    tags: ['compare', 'cleartax', 'in', 'tax', 'gst'],
    countryRelevance: 'IN',
    url: 'https://hellobooks.ai/compare/hellobooks-vs-cleartax',
    publishedAt: '2026-03-01',
    kind: 'compare',
  },
  {
    id: 'hellobooks-vs-profitbooks',
    title: 'HelloBooks vs ProfitBooks',
    excerpt:
      'ProfitBooks vs HelloBooks for Indian SMEs: a feature-by-feature look at inventory, multi-currency, payroll and AI capabilities.',
    tags: ['compare', 'profitbooks', 'in'],
    countryRelevance: 'IN',
    url: 'https://hellobooks.ai/compare/hellobooks-vs-profitbooks',
    publishedAt: '2026-03-01',
    kind: 'compare',
  },
  {
    id: 'hellobooks-vs-saral-accounts',
    title: 'HelloBooks vs Saral Accounts',
    excerpt:
      'Saral is a CA-first desktop suite; HelloBooks is cloud-first with native client portals and GSTIN bulk filing. Comparison for CA practices.',
    tags: ['compare', 'saral', 'in', 'ca practice'],
    countryRelevance: 'IN',
    url: 'https://hellobooks.ai/compare/hellobooks-vs-saral-accounts',
    publishedAt: '2026-03-01',
    kind: 'compare',
  },
  {
    id: 'hellobooks-vs-netsuite',
    title: 'HelloBooks vs NetSuite',
    excerpt:
      'NetSuite for enterprise multi-entity vs HelloBooks for growing SMEs that want ERP-grade controls without 6-figure implementation fees.',
    tags: ['compare', 'netsuite', 'enterprise', 'multi-entity'],
    countryRelevance: 'global',
    url: 'https://hellobooks.ai/compare/hellobooks-vs-netsuite',
    publishedAt: '2026-03-01',
    kind: 'compare',
  },
  {
    id: 'hellobooks-vs-sage',
    title: 'HelloBooks vs Sage',
    excerpt:
      'Sage 50 / Sage Intacct vs HelloBooks for UK + US SMEs: VAT MTD, project accounting, and total cost of ownership.',
    tags: ['compare', 'sage', 'uk', 'us', 'vat mtd'],
    countryRelevance: 'global',
    url: 'https://hellobooks.ai/compare/hellobooks-vs-sage',
    publishedAt: '2026-03-01',
    kind: 'compare',
  },
  {
    id: 'hellobooks-vs-freeagent',
    title: 'HelloBooks vs FreeAgent',
    excerpt:
      'FreeAgent for UK contractors vs HelloBooks for SMEs that have grown past sole-trader: MTD-VAT, Self Assessment, and multi-user collaboration.',
    tags: ['compare', 'freeagent', 'uk', 'contractor'],
    countryRelevance: 'GB',
    url: 'https://hellobooks.ai/compare/hellobooks-vs-freeagent',
    publishedAt: '2026-03-01',
    kind: 'compare',
  },
  {
    id: 'hellobooks-vs-kashoo',
    title: 'HelloBooks vs Kashoo',
    excerpt:
      'Kashoo for solo Canadian and US small businesses vs HelloBooks: feature parity, pricing, and where HelloBooks pulls ahead on payroll + AI.',
    tags: ['compare', 'kashoo', 'us', 'ca', 'small business'],
    countryRelevance: 'global',
    url: 'https://hellobooks.ai/compare/hellobooks-vs-kashoo',
    publishedAt: '2026-03-01',
    kind: 'compare',
  },
  {
    id: 'hellobooks-vs-zipbooks',
    title: 'HelloBooks vs ZipBooks',
    excerpt:
      'ZipBooks vs HelloBooks for US service businesses: free tier comparison, invoicing UX, and accounting depth as you grow.',
    tags: ['compare', 'zipbooks', 'us', 'free'],
    countryRelevance: 'US',
    url: 'https://hellobooks.ai/compare/hellobooks-vs-zipbooks',
    publishedAt: '2026-03-01',
    kind: 'compare',
  },

  // ---------------------------------------------------------------------------
  // Flagship blog posts — /blog/<slug>
  // Curated for decision-grade content rather than the full 800+ archive.
  // ---------------------------------------------------------------------------
  {
    id: 'best-quickbooks-alternative-for-small-business-in-2026',
    title: 'Best QuickBooks alternative for small business in 2026',
    excerpt:
      'A category map of QuickBooks alternatives ranked by price, feature parity, migration effort and customer-segment fit. Includes a "free QuickBooks alternative" tier.',
    tags: ['quickbooks', 'alternatives', 'comparison', 'small business'],
    countryRelevance: 'global',
    url: 'https://hellobooks.ai/blog/best-quickbooks-alternative-for-small-business-in-2026',
    publishedAt: '2026-01-15',
    kind: 'blog',
  },
  {
    id: 'best-tally-alternatives-for-growing-indian-businesses',
    title: 'Best Tally alternatives for growing Indian businesses',
    excerpt:
      'Why Indian SMEs hit a ceiling with Tally on desktop, and the cloud-native options that hold up on GST compliance, audit trail, and multi-user access.',
    tags: ['tally', 'alternatives', 'in', 'cloud accounting'],
    countryRelevance: 'IN',
    url: 'https://hellobooks.ai/blog/best-tally-alternatives-for-growing-indian-businesses',
    publishedAt: '2026-01-20',
    kind: 'blog',
  },
  {
    id: 'best-accounting-software-for-smes-in-india-2025',
    title: 'Best accounting software for SMEs in India 2025',
    excerpt:
      'A buyer guide to accounting software for Indian SMEs: GST e-invoicing, TDS, multi-GSTIN, audit trail under Companies Act and integration with banking + payroll.',
    tags: ['accounting software', 'sme', 'in', 'gst', 'buyer guide'],
    countryRelevance: 'IN',
    url: 'https://hellobooks.ai/blog/best-accounting-software-for-smes-in-india-2025',
    publishedAt: '2025-12-10',
    kind: 'blog',
  },
  {
    id: 'best-gst-filing-software-for-ca-firms-in-india-2025',
    title: 'Best GST filing software for CA firms in India 2025',
    excerpt:
      'How CA firms evaluate GST filing software when they manage 50-500 GSTINs: bulk filing, e-invoice IRN, GSTR-2B reconciliation, and reverse-charge handling.',
    tags: ['gst', 'ca firm', 'in', 'gstr-1', 'gstr-2b', 'buyer guide'],
    countryRelevance: 'IN',
    url: 'https://hellobooks.ai/blog/best-gst-filing-software-for-ca-firms-in-india-2025',
    publishedAt: '2025-12-15',
    kind: 'blog',
  },
  {
    id: 'cheapest-quickbooks-alternative-that-doesn-t-sacrifice-features',
    title: "Cheapest QuickBooks alternative that doesn't sacrifice features",
    excerpt:
      'A price-feature analysis of the cheapest credible QuickBooks alternatives — what you give up below $15/mo, and where to draw the line.',
    tags: ['quickbooks', 'cheapest', 'pricing', 'alternatives'],
    countryRelevance: 'US',
    url: 'https://hellobooks.ai/blog/cheapest-quickbooks-alternative-that-doesn-t-sacrifice-features',
    publishedAt: '2026-01-25',
    kind: 'blog',
  },
  {
    id: 'cloud-based-quickbooks-alternative-for-remote-teams',
    title: 'Cloud-based QuickBooks alternative for remote teams',
    excerpt:
      'What multi-user, multi-location remote finance teams need from cloud accounting — and how to pick a tool that handles concurrency well.',
    tags: ['quickbooks', 'cloud', 'remote teams', 'multi-user'],
    countryRelevance: 'global',
    url: 'https://hellobooks.ai/blog/cloud-based-quickbooks-alternative-for-remote-teams',
    publishedAt: '2026-01-22',
    kind: 'blog',
  },
  {
    id: 'ai-in-quickbooks-vs-hellobooks-which-platform-actually-automates-more',
    title: 'AI in QuickBooks vs HelloBooks: which platform actually automates more',
    excerpt:
      'A side-by-side test of what AI features in QuickBooks Online and HelloBooks actually automate — bank-feed categorization, document extraction, anomaly detection.',
    tags: ['ai', 'quickbooks', 'hellobooks', 'automation'],
    countryRelevance: 'global',
    url: 'https://hellobooks.ai/blog/ai-in-quickbooks-vs-hellobooks-which-platform-actually-automates-more',
    publishedAt: '2026-02-05',
    kind: 'blog',
  },
  {
    id: 'ai-in-tally-how-automation-is-changing-the-way-cas-use-tally-in-india',
    title: 'AI in Tally: how automation is changing the way CAs use Tally in India',
    excerpt:
      'Where Tally desktop ends and AI-driven workflows begin. How Indian CAs are stitching AI on top of legacy Tally or migrating to AI-native cloud platforms.',
    tags: ['ai', 'tally', 'ca', 'in', 'automation'],
    countryRelevance: 'IN',
    url: 'https://hellobooks.ai/blog/ai-in-tally-how-automation-is-changing-the-way-cas-use-tally-in-india',
    publishedAt: '2026-02-08',
    kind: 'blog',
  },
  {
    id: 'best-invoicing-software-for-small-business',
    title: 'Best invoicing software for small business',
    excerpt:
      'A category guide to invoicing software — from one-shot generators to full accounting. When to graduate from a free invoice template to real software.',
    tags: ['invoicing', 'small business', 'buyer guide'],
    countryRelevance: 'global',
    url: 'https://hellobooks.ai/blog/best-invoicing-software-for-small-business',
    publishedAt: '2025-11-20',
    kind: 'blog',
  },
  {
    id: 'best-mobile-accounting-app-for-small-business',
    title: 'Best mobile accounting app for small business',
    excerpt:
      'What works on mobile vs what genuinely needs a laptop. A short list of mobile-first accounting apps that handle invoicing, receipts, and bank reconciliation.',
    tags: ['mobile', 'accounting app', 'small business'],
    countryRelevance: 'global',
    url: 'https://hellobooks.ai/blog/best-mobile-accounting-app-for-small-business',
    publishedAt: '2025-11-25',
    kind: 'blog',
  },
  {
    id: 'ai-bookkeeping-automation-for-small-businesses',
    title: 'AI bookkeeping automation for small businesses',
    excerpt:
      'Concrete AI bookkeeping workflows small businesses can switch on this quarter — categorization, reconciliation, document extraction, anomaly review.',
    tags: ['ai', 'bookkeeping', 'automation', 'small business'],
    countryRelevance: 'global',
    url: 'https://hellobooks.ai/blog/ai-bookkeeping-automation-for-small-businesses',
    publishedAt: '2026-01-08',
    kind: 'blog',
  },
  {
    id: 'ai-bookkeeping-vs-traditional-bookkeeping-cost-comparison',
    title: 'AI bookkeeping vs traditional bookkeeping cost comparison',
    excerpt:
      'A per-transaction and per-hour cost comparison of AI bookkeeping vs human bookkeeper vs hybrid. Where each model wins and breaks.',
    tags: ['ai', 'bookkeeping', 'cost comparison', 'pricing'],
    countryRelevance: 'global',
    url: 'https://hellobooks.ai/blog/ai-bookkeeping-vs-traditional-bookkeeping-cost-comparison',
    publishedAt: '2026-01-10',
    kind: 'blog',
  },
  {
    id: '1099-filing-requirements-complete-guide-for-business-owners',
    title: '1099 filing requirements: complete guide for business owners',
    excerpt:
      'IRS 1099-NEC and 1099-MISC rules for US businesses paying contractors: thresholds, deadlines, e-file vs paper, common late-filing penalties.',
    tags: ['1099', 'us', 'irs', 'contractors', 'tax'],
    countryRelevance: 'US',
    url: 'https://hellobooks.ai/blog/1099-filing-requirements-complete-guide-for-business-owners',
    publishedAt: '2025-12-01',
    kind: 'blog',
  },
  {
    id: '1099-k-reporting-what-online-sellers-need-to-know',
    title: '1099-K reporting: what online sellers need to know',
    excerpt:
      'How 1099-K threshold changes affect online sellers on Stripe, PayPal, Amazon, Etsy. What to track, what to reconcile, and how to defend audit-prone numbers.',
    tags: ['1099-k', 'us', 'ecommerce', 'online sellers'],
    countryRelevance: 'US',
    url: 'https://hellobooks.ai/blog/1099-k-reporting-what-online-sellers-need-to-know',
    publishedAt: '2025-12-05',
    kind: 'blog',
  },
  {
    id: 'cash-flow-management-15-strategies-to-never-run-out-of-cash',
    title: 'Cash flow management: 15 strategies to never run out of cash',
    excerpt:
      'A practical playbook for cash-flow management: rolling 13-week forecast, customer-deposit policy, AP staggering, and credit lines as insurance.',
    tags: ['cash flow', 'forecasting', 'working capital'],
    countryRelevance: 'global',
    url: 'https://hellobooks.ai/blog/cash-flow-management-15-strategies-to-never-run-out-of-cash',
    publishedAt: '2025-11-15',
    kind: 'blog',
  },
  {
    id: 'cash-vs-accrual-accounting-which-should-your-business-use',
    title: 'Cash vs accrual accounting: which should your business use',
    excerpt:
      'When small businesses outgrow cash accounting, the tax implications of switching to accrual, and how to run both views for management vs filing.',
    tags: ['cash accounting', 'accrual', 'gaap', 'small business'],
    countryRelevance: 'global',
    url: 'https://hellobooks.ai/blog/cash-vs-accrual-accounting-which-should-your-business-use',
    publishedAt: '2025-11-10',
    kind: 'blog',
  },
  {
    id: 'chart-of-accounts-for-small-business-setup-guide-template',
    title: 'Chart of accounts for small business: setup guide + template',
    excerpt:
      'A starter chart of accounts every small business can adapt, plus rules of thumb for when to split, merge or retire account lines.',
    tags: ['chart of accounts', 'small business', 'setup', 'template'],
    countryRelevance: 'global',
    url: 'https://hellobooks.ai/blog/chart-of-accounts-for-small-business-setup-guide-template',
    publishedAt: '2025-11-05',
    kind: 'blog',
  },
  {
    id: 'chart-of-accounts-setup-for-indian-smes-a-practical-guide',
    title: 'Chart of accounts setup for Indian SMEs: a practical guide',
    excerpt:
      'India-specific chart of accounts: GST output/input ledgers, TDS payable, ESI/PF payable, stock vs WIP. A practical template for SMEs filing under GST + ITR-6.',
    tags: ['chart of accounts', 'in', 'gst', 'sme', 'tds'],
    countryRelevance: 'IN',
    url: 'https://hellobooks.ai/blog/chart-of-accounts-setup-for-indian-smes-a-practical-guide',
    publishedAt: '2025-11-08',
    kind: 'blog',
  },
  {
    id: 'audit-trail-requirements-for-indian-businesses-under-companies-act',
    title: 'Audit trail requirements for Indian businesses under Companies Act',
    excerpt:
      'What Rule 11(g) of the Companies (Audit and Auditors) Rules requires, what auditors check for, and how to satisfy audit-trail rules without slowing down the team.',
    tags: ['audit trail', 'in', 'companies act', 'compliance'],
    countryRelevance: 'IN',
    url: 'https://hellobooks.ai/blog/audit-trail-requirements-for-indian-businesses-under-companies-act',
    publishedAt: '2025-10-20',
    kind: 'blog',
  },
  {
    id: 'common-tally-errors-and-how-to-fix-them',
    title: 'Common Tally errors and how to fix them',
    excerpt:
      'Top Tally errors Indian CAs see in the field — internal error, DLL not found, license server, data corruption — with fix steps and prevention tips.',
    tags: ['tally', 'errors', 'troubleshooting', 'in'],
    countryRelevance: 'IN',
    url: 'https://hellobooks.ai/blog/common-tally-errors-and-how-to-fix-them',
    publishedAt: '2025-10-15',
    kind: 'blog',
  },
  {
    id: 'accounts-payable-automation-for-indian-smes-step-by-step',
    title: 'Accounts payable automation for Indian SMEs: step-by-step',
    excerpt:
      'A staged AP automation rollout for Indian SMEs: vendor onboarding, bill OCR, GST input matching, TDS deduction, payment release, and reconciliation.',
    tags: ['accounts payable', 'automation', 'in', 'sme', 'tds'],
    countryRelevance: 'IN',
    url: 'https://hellobooks.ai/blog/accounts-payable-automation-for-indian-smes-step-by-step',
    publishedAt: '2025-12-20',
    kind: 'blog',
  },
  {
    id: 'best-practices-for-month-end-financial-close-using-management-software',
    title: 'Best practices for month-end financial close using management software',
    excerpt:
      'A repeatable month-end close checklist: reconciliations in order, accruals before adjustments, balance-sheet rolls, sign-off cadence and audit-ready evidence.',
    tags: ['month-end close', 'close process', 'finance teams'],
    countryRelevance: 'global',
    url: 'https://hellobooks.ai/blog/best-practices-for-month-end-financial-close-using-management-software',
    publishedAt: '2025-12-25',
    kind: 'blog',
  },
];
