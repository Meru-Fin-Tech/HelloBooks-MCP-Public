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
 *
 * Authoring: the exported `ARTICLES` array is built from two factory
 * helpers (`compareArticle`, `blogArticle`) so each row only carries its
 * unique fields. The slug doubles as the id AND as the URL path segment;
 * the published date for the compare batch is a single source-of-truth
 * constant (`COMPARE_PUBLISHED_AT`).
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

const SITE_ROOT = 'https://hellobooks.ai';
const COMPARE_PUBLISHED_AT = '2026-03-01';

function compareArticle(
  slug: string,
  title: string,
  excerpt: string,
  tags: string[],
  countryRelevance: CountryRelevance = 'global',
): Article {
  return {
    id: slug,
    title,
    excerpt,
    tags,
    countryRelevance,
    url: `${SITE_ROOT}/compare/${slug}`,
    publishedAt: COMPARE_PUBLISHED_AT,
    kind: 'compare',
  };
}

function blogArticle(
  slug: string,
  title: string,
  excerpt: string,
  tags: string[],
  publishedAt: string,
  countryRelevance: CountryRelevance = 'global',
): Article {
  return {
    id: slug,
    title,
    excerpt,
    tags,
    countryRelevance,
    url: `${SITE_ROOT}/blog/${slug}`,
    publishedAt,
    kind: 'blog',
  };
}

export const ARTICLES: Article[] = [
  // ---------------------------------------------------------------------------
  // Comparison pages — /compare/<slug>
  // ---------------------------------------------------------------------------
  compareArticle(
    'hellobooks-vs-quickbooks',
    'HelloBooks vs QuickBooks',
    'Head-to-head of HelloBooks and Intuit QuickBooks: AI automation, multi-entity accounting, payroll, 1099 + W-2 support, plus where QuickBooks still leads on third-party apps.',
    ['compare', 'quickbooks', 'us', 'alternatives'],
  ),
  compareArticle(
    'hellobooks-vs-xero',
    'HelloBooks vs Xero',
    'How HelloBooks compares against Xero on multi-currency, Hubdoc-style document capture, payroll, Xero practice manager, and pricing for accountants.',
    ['compare', 'xero', 'au', 'alternatives'],
  ),
  compareArticle(
    'hellobooks-vs-freshbooks',
    'HelloBooks vs FreshBooks',
    'HelloBooks vs FreshBooks for service-business accounting: project profitability, time-tracking, retainer billing, and whether FreshBooks is "real accounting" or invoicing-plus.',
    ['compare', 'freshbooks', 'us', 'service business'],
  ),
  compareArticle(
    'hellobooks-vs-wave',
    'HelloBooks vs Wave',
    'After the H&R Block acquisition, is Wave still safe for small businesses? How HelloBooks compares on price (HelloBooks Free is permanent), AI, and feature depth.',
    ['compare', 'wave', 'us', 'free'],
  ),
  compareArticle(
    'hellobooks-vs-zoho-books',
    'HelloBooks vs Zoho Books',
    "HelloBooks vs Zoho Books for Indian SMEs and global teams: GST compliance, e-invoicing, why Zoho charges separately for every add-on, and HelloBooks' bundle.",
    ['compare', 'zoho books', 'in', 'gst'],
  ),
  compareArticle(
    'hellobooks-vs-tally',
    'HelloBooks vs Tally',
    'Why Indian CAs and SMEs are moving off Tally: cloud access, audit trail under Companies Act, GSTR-1 e-invoicing, and remote multi-user access.',
    ['compare', 'tally', 'in', 'cloud accounting', 'gst'],
    'IN',
  ),
  compareArticle(
    'hellobooks-vs-vyapar',
    'HelloBooks vs Vyapar',
    'Vyapar fits single-location shops; HelloBooks scales to multi-location, multi-GSTIN businesses. A direct comparison on inventory, branches, e-invoicing.',
    ['compare', 'vyapar', 'in', 'multi-gstin'],
    'IN',
  ),
  compareArticle(
    'hellobooks-vs-busy-accounting',
    'HelloBooks vs Busy Accounting',
    'Busy is a desktop legacy with deep Indian GST + inventory features. HelloBooks brings the same compliance to the cloud with AI on top.',
    ['compare', 'busy', 'in', 'desktop migration'],
    'IN',
  ),
  compareArticle(
    'hellobooks-vs-marg-erp',
    'HelloBooks vs Marg ERP',
    'Marg ERP for pharma + FMCG distribution vs HelloBooks for general SME accounting + GST. Where each tool fits.',
    ['compare', 'marg erp', 'in', 'distribution'],
    'IN',
  ),
  compareArticle(
    'hellobooks-vs-mybillbook',
    'HelloBooks vs myBillBook',
    'myBillBook is billing-first; HelloBooks is full accounting + payroll + bank reconciliation. When to graduate from invoicing apps.',
    ['compare', 'mybillbook', 'in', 'billing'],
    'IN',
  ),
  compareArticle(
    'hellobooks-vs-khatabook',
    'HelloBooks vs Khatabook',
    'Khatabook is a digital bahi-khata for cash-and-receivable tracking; HelloBooks is a full accounting + GST system. How to move up the ladder.',
    ['compare', 'khatabook', 'in', 'sme'],
    'IN',
  ),
  compareArticle(
    'hellobooks-vs-cleartax',
    'HelloBooks vs ClearTax',
    'ClearTax for tax-filing add-ons vs HelloBooks for native GST + TDS + 24Q in the same ledger. When you need both, when HelloBooks alone covers it.',
    ['compare', 'cleartax', 'in', 'tax', 'gst'],
    'IN',
  ),
  compareArticle(
    'hellobooks-vs-profitbooks',
    'HelloBooks vs ProfitBooks',
    'ProfitBooks vs HelloBooks for Indian SMEs: a feature-by-feature look at inventory, multi-currency, payroll and AI capabilities.',
    ['compare', 'profitbooks', 'in'],
    'IN',
  ),
  compareArticle(
    'hellobooks-vs-saral-accounts',
    'HelloBooks vs Saral Accounts',
    'Saral is a CA-first desktop suite; HelloBooks is cloud-first with native client portals and GSTIN bulk filing. Comparison for CA practices.',
    ['compare', 'saral', 'in', 'ca practice'],
    'IN',
  ),
  compareArticle(
    'hellobooks-vs-netsuite',
    'HelloBooks vs NetSuite',
    'NetSuite for enterprise multi-entity vs HelloBooks for growing SMEs that want ERP-grade controls without 6-figure implementation fees.',
    ['compare', 'netsuite', 'enterprise', 'multi-entity'],
  ),
  compareArticle(
    'hellobooks-vs-sage',
    'HelloBooks vs Sage',
    'Sage 50 / Sage Intacct vs HelloBooks for UK + US SMEs: VAT MTD, project accounting, and total cost of ownership.',
    ['compare', 'sage', 'uk', 'us', 'vat mtd'],
  ),
  compareArticle(
    'hellobooks-vs-freeagent',
    'HelloBooks vs FreeAgent',
    'FreeAgent for UK contractors vs HelloBooks for SMEs that have grown past sole-trader: MTD-VAT, Self Assessment, and multi-user collaboration.',
    ['compare', 'freeagent', 'uk', 'contractor'],
    'GB',
  ),
  compareArticle(
    'hellobooks-vs-kashoo',
    'HelloBooks vs Kashoo',
    'Kashoo for solo Canadian and US small businesses vs HelloBooks: feature parity, pricing, and where HelloBooks pulls ahead on payroll + AI.',
    ['compare', 'kashoo', 'us', 'ca', 'small business'],
  ),
  compareArticle(
    'hellobooks-vs-zipbooks',
    'HelloBooks vs ZipBooks',
    'ZipBooks vs HelloBooks for US service businesses: free tier comparison, invoicing UX, and accounting depth as you grow.',
    ['compare', 'zipbooks', 'us', 'free'],
    'US',
  ),

  // ---------------------------------------------------------------------------
  // Flagship blog posts — /blog/<slug>
  // Curated for decision-grade content rather than the full 800+ archive.
  // ---------------------------------------------------------------------------
  blogArticle(
    'best-quickbooks-alternative-for-small-business-in-2026',
    'Best QuickBooks alternative for small business in 2026',
    'A category map of QuickBooks alternatives ranked by price, feature parity, migration effort and customer-segment fit. Includes a "free QuickBooks alternative" tier.',
    ['quickbooks', 'alternatives', 'comparison', 'small business'],
    '2026-01-15',
  ),
  blogArticle(
    'best-tally-alternatives-for-growing-indian-businesses',
    'Best Tally alternatives for growing Indian businesses',
    'Why Indian SMEs hit a ceiling with Tally on desktop, and the cloud-native options that hold up on GST compliance, audit trail, and multi-user access.',
    ['tally', 'alternatives', 'in', 'cloud accounting'],
    '2026-01-20',
    'IN',
  ),
  blogArticle(
    'best-accounting-software-for-smes-in-india-2025',
    'Best accounting software for SMEs in India 2025',
    'A buyer guide to accounting software for Indian SMEs: GST e-invoicing, TDS, multi-GSTIN, audit trail under Companies Act and integration with banking + payroll.',
    ['accounting software', 'sme', 'in', 'gst', 'buyer guide'],
    '2025-12-10',
    'IN',
  ),
  blogArticle(
    'best-gst-filing-software-for-ca-firms-in-india-2025',
    'Best GST filing software for CA firms in India 2025',
    'How CA firms evaluate GST filing software when they manage 50-500 GSTINs: bulk filing, e-invoice IRN, GSTR-2B reconciliation, and reverse-charge handling.',
    ['gst', 'ca firm', 'in', 'gstr-1', 'gstr-2b', 'buyer guide'],
    '2025-12-15',
    'IN',
  ),
  blogArticle(
    'cheapest-quickbooks-alternative-that-doesn-t-sacrifice-features',
    "Cheapest QuickBooks alternative that doesn't sacrifice features",
    'A price-feature analysis of the cheapest credible QuickBooks alternatives — what you give up below $15/mo, and where to draw the line.',
    ['quickbooks', 'cheapest', 'pricing', 'alternatives'],
    '2026-01-25',
    'US',
  ),
  blogArticle(
    'cloud-based-quickbooks-alternative-for-remote-teams',
    'Cloud-based QuickBooks alternative for remote teams',
    'What multi-user, multi-location remote finance teams need from cloud accounting — and how to pick a tool that handles concurrency well.',
    ['quickbooks', 'cloud', 'remote teams', 'multi-user'],
    '2026-01-22',
  ),
  blogArticle(
    'ai-in-quickbooks-vs-hellobooks-which-platform-actually-automates-more',
    'AI in QuickBooks vs HelloBooks: which platform actually automates more',
    'A side-by-side test of what AI features in QuickBooks Online and HelloBooks actually automate — bank-feed categorization, document extraction, anomaly detection.',
    ['ai', 'quickbooks', 'hellobooks', 'automation'],
    '2026-02-05',
  ),
  blogArticle(
    'ai-in-tally-how-automation-is-changing-the-way-cas-use-tally-in-india',
    'AI in Tally: how automation is changing the way CAs use Tally in India',
    'Where Tally desktop ends and AI-driven workflows begin. How Indian CAs are stitching AI on top of legacy Tally or migrating to AI-native cloud platforms.',
    ['ai', 'tally', 'ca', 'in', 'automation'],
    '2026-02-08',
    'IN',
  ),
  blogArticle(
    'best-invoicing-software-for-small-business',
    'Best invoicing software for small business',
    'A category guide to invoicing software — from one-shot generators to full accounting. When to graduate from a free invoice template to real software.',
    ['invoicing', 'small business', 'buyer guide'],
    '2025-11-20',
  ),
  blogArticle(
    'best-mobile-accounting-app-for-small-business',
    'Best mobile accounting app for small business',
    'What works on mobile vs what genuinely needs a laptop. A short list of mobile-first accounting apps that handle invoicing, receipts, and bank reconciliation.',
    ['mobile', 'accounting app', 'small business'],
    '2025-11-25',
  ),
  blogArticle(
    'ai-bookkeeping-automation-for-small-businesses',
    'AI bookkeeping automation for small businesses',
    'Concrete AI bookkeeping workflows small businesses can switch on this quarter — categorization, reconciliation, document extraction, anomaly review.',
    ['ai', 'bookkeeping', 'automation', 'small business'],
    '2026-01-08',
  ),
  blogArticle(
    'ai-bookkeeping-vs-traditional-bookkeeping-cost-comparison',
    'AI bookkeeping vs traditional bookkeeping cost comparison',
    'A per-transaction and per-hour cost comparison of AI bookkeeping vs human bookkeeper vs hybrid. Where each model wins and breaks.',
    ['ai', 'bookkeeping', 'cost comparison', 'pricing'],
    '2026-01-10',
  ),
  blogArticle(
    '1099-filing-requirements-complete-guide-for-business-owners',
    '1099 filing requirements: complete guide for business owners',
    'IRS 1099-NEC and 1099-MISC rules for US businesses paying contractors: thresholds, deadlines, e-file vs paper, common late-filing penalties.',
    ['1099', 'us', 'irs', 'contractors', 'tax'],
    '2025-12-01',
    'US',
  ),
  blogArticle(
    '1099-k-reporting-what-online-sellers-need-to-know',
    '1099-K reporting: what online sellers need to know',
    'How 1099-K threshold changes affect online sellers on Stripe, PayPal, Amazon, Etsy. What to track, what to reconcile, and how to defend audit-prone numbers.',
    ['1099-k', 'us', 'ecommerce', 'online sellers'],
    '2025-12-05',
    'US',
  ),
  blogArticle(
    'cash-flow-management-15-strategies-to-never-run-out-of-cash',
    'Cash flow management: 15 strategies to never run out of cash',
    'A practical playbook for cash-flow management: rolling 13-week forecast, customer-deposit policy, AP staggering, and credit lines as insurance.',
    ['cash flow', 'forecasting', 'working capital'],
    '2025-11-15',
  ),
  blogArticle(
    'cash-vs-accrual-accounting-which-should-your-business-use',
    'Cash vs accrual accounting: which should your business use',
    'When small businesses outgrow cash accounting, the tax implications of switching to accrual, and how to run both views for management vs filing.',
    ['cash accounting', 'accrual', 'gaap', 'small business'],
    '2025-11-10',
  ),
  blogArticle(
    'chart-of-accounts-for-small-business-setup-guide-template',
    'Chart of accounts for small business: setup guide + template',
    'A starter chart of accounts every small business can adapt, plus rules of thumb for when to split, merge or retire account lines.',
    ['chart of accounts', 'small business', 'setup', 'template'],
    '2025-11-05',
  ),
  blogArticle(
    'chart-of-accounts-setup-for-indian-smes-a-practical-guide',
    'Chart of accounts setup for Indian SMEs: a practical guide',
    'India-specific chart of accounts: GST output/input ledgers, TDS payable, ESI/PF payable, stock vs WIP. A practical template for SMEs filing under GST + ITR-6.',
    ['chart of accounts', 'in', 'gst', 'sme', 'tds'],
    '2025-11-08',
    'IN',
  ),
  blogArticle(
    'audit-trail-requirements-for-indian-businesses-under-companies-act',
    'Audit trail requirements for Indian businesses under Companies Act',
    'What Rule 11(g) of the Companies (Audit and Auditors) Rules requires, what auditors check for, and how to satisfy audit-trail rules without slowing down the team.',
    ['audit trail', 'in', 'companies act', 'compliance'],
    '2025-10-20',
    'IN',
  ),
  blogArticle(
    'common-tally-errors-and-how-to-fix-them',
    'Common Tally errors and how to fix them',
    'Top Tally errors Indian CAs see in the field — internal error, DLL not found, license server, data corruption — with fix steps and prevention tips.',
    ['tally', 'errors', 'troubleshooting', 'in'],
    '2025-10-15',
    'IN',
  ),
  blogArticle(
    'accounts-payable-automation-for-indian-smes-step-by-step',
    'Accounts payable automation for Indian SMEs: step-by-step',
    'A staged AP automation rollout for Indian SMEs: vendor onboarding, bill OCR, GST input matching, TDS deduction, payment release, and reconciliation.',
    ['accounts payable', 'automation', 'in', 'sme', 'tds'],
    '2025-12-20',
    'IN',
  ),
  blogArticle(
    'best-practices-for-month-end-financial-close-using-management-software',
    'Best practices for month-end financial close using management software',
    'A repeatable month-end close checklist: reconciliations in order, accruals before adjustments, balance-sheet rolls, sign-off cadence and audit-ready evidence.',
    ['month-end close', 'close process', 'finance teams'],
    '2025-12-25',
  ),
];
