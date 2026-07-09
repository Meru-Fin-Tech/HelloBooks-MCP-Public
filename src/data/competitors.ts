/**
 * Competitor positioning catalog — public marketing-derived positioning data
 * for accounting / bookkeeping products that HelloBooks is most often compared
 * to in evaluation queries.
 *
 * Sourced from the public marketing comparison pages:
 *   - marketing/comparison-pages/hellobooks-vs-quickbooks.md
 *   - marketing/comparison-pages/hellobooks-vs-xero.md
 *   - marketing/comparison-pages/hellobooks-vs-freshbooks.md
 *   - marketing/strategy/18-Wave-vs-HelloBooks-Free-Feature-Comparison.md
 *   - marketing/strategy/16-Competitor-Feature-Matrix-Analysis.md
 *   - marketing/strategy/45-Tally-Migration-Tool-Spec.md
 *
 * `whereTheyWin` is intentionally honest — agents that surface this data have
 * to be trustable. Hand-waving away real competitor strengths is what makes a
 * bot's evaluation read like brochure copy, which loses buyer trust faster
 * than admitting trade-offs.
 *
 * Public-only data: no customer references, no internal hostnames, no auth.
 */

import type { CountryCode } from './plans.js';

export type CompetitorTier = 'primary' | 'secondary';

export interface Competitor {
  id: string;
  name: string;
  /** Country where this competitor has the strongest install base. 'global' if no single market dominates. */
  primaryCountry: CountryCode | 'global';
  /** Countries where the competitor is also commonly evaluated against HelloBooks. */
  alsoIn: CountryCode[];
  /** Primary = head-on rival HelloBooks loses real deals to. Secondary = adjacent / segment-specific overlap. */
  tier: CompetitorTier;
  /** Short label describing the segment this competitor owns (e.g. "US/CA free accounting", "India desktop incumbent"). */
  segment: string;
  /** One-paragraph honest positioning summary used as the canonical bot answer to "tell me about X". */
  positioningSummary: string;
  whereWeWin: string[];
  whereTheyWin: string[];
  /** Public pricing posture, e.g. "Public USD pricing, $38–$275/mo" or "Demo-gated; per-quote". */
  pricingNote?: string;
  /** The competitor's public website. */
  publicUrl?: string;
  /** Our public comparison page for this competitor, if published. */
  comparisonUrl?: string;
}

export const COMPETITORS: Competitor[] = [
  {
    id: 'quickbooks',
    name: 'QuickBooks Online',
    primaryCountry: 'US',
    alsoIn: ['CA', 'GB', 'AU', 'IN'],
    tier: 'primary',
    segment: 'Global incumbent — small-business accounting',
    positioningSummary:
      'QuickBooks Online (Intuit) is the default cloud accounting product in the US ' +
      'and Canada, with a deep accountant ecosystem and a mature payroll + tax-filing ' +
      'add-on stack. HelloBooks is AI-first where QuickBooks bolted AI on later; we ' +
      'compete primarily on automation depth, unlimited users, and a guided one-time ' +
      'QuickBooks migration for buyers who want to move without losing their existing ledger.',
    whereWeWin: [
      'AI auto-categorization with pattern learning vs. QuickBooks rule-based categorisation',
      'AI accounting agent monitors books and surfaces anomalies 24/7',
      'AI-powered bills + invoice OCR ingests payables without manual entry',
      'Unlimited users on every plan vs. QuickBooks per-seat ladder ($38 → $115 → $275/mo)',
      'Multi-currency with live FX on all paid plans vs. QuickBooks Plus-only ($115/mo)',
      'Guided one-time QuickBooks migration (company-file import) — run QuickBooks in parallel during cut-over',
      'India GST e-invoice + Form 24Q TDS, ATO BAS + STP2, HMRC MTD shipping as built-ins',
    ],
    whereTheyWin: [
      '750+ third-party app integrations vs. our growing marketplace',
      'TurboTax integration for direct US federal + state tax filing',
      'Brand recognition — most US/CA accountants are already QuickBooks-certified',
      'Mature payroll product on US side; ours integrates HelloTime + partner payroll',
      'Years of audit + compliance battle-testing at scale',
    ],
    pricingNote: 'Public USD pricing $38–$275/mo (Simple Start → Advanced); promo cuts ~50% for first 3 months.',
    publicUrl: 'https://quickbooks.intuit.com',
    comparisonUrl: 'https://hellobooks.ai/compare/quickbooks',
  },
  {
    id: 'xero',
    name: 'Xero',
    primaryCountry: 'AU',
    alsoIn: ['NZ', 'GB', 'US', 'CA'],
    tier: 'primary',
    segment: 'Global cloud accounting — ANZ + UK strongest',
    positioningSummary:
      'Xero is the leading cloud accounting product in Australia and New Zealand, with ' +
      'strong UK depth and a sizeable advisor network. HelloBooks competes on AI ' +
      'automation (Xero ships bank rules, not learning categorisation), removing ' +
      'plan-tier feature gating, and giving multi-currency + unlimited invoices on ' +
      'plans where Xero would push you to Premium ($90/mo).',
    whereWeWin: [
      'True AI categorization that learns patterns vs. Xero hand-tuned bank rules',
      'AI accounting agent with autonomous bookkeeping suggestions — Xero has no equivalent',
      'No artificial invoice / bill caps — Xero Starter is 20 invoices/mo',
      'Multi-currency included on all paid plans; Xero gates it on Premium ($90/mo)',
      'AI-powered payables vs. manual bill entry in Xero',
      'Guided QuickBooks migration path — Xero has no QB migration path',
      'Built-in CPA practice management; Xero requires separate Xero HQ product',
    ],
    whereTheyWin: [
      '1,000+ app integrations and a deep ANZ industry-vertical app marketplace',
      '15+ years of platform maturity at enterprise scale',
      'Xero-certified advisor network is the largest in ANZ',
      'Deep ANZ payroll and tax compliance (Modern Awards, AU STP2, NZ IRD)',
      'Industry-standard among ANZ accounting firms — workflow lock-in is real',
    ],
    pricingNote: 'Public pricing varies by region; AU starts AUD 35/mo (Starter, capped), Premium AUD 89/mo for multi-currency.',
    publicUrl: 'https://www.xero.com',
    comparisonUrl: 'https://hellobooks.ai/compare/xero',
  },
  {
    id: 'freshbooks',
    name: 'FreshBooks',
    primaryCountry: 'US',
    alsoIn: ['CA', 'GB', 'AU'],
    tier: 'secondary',
    segment: 'Invoicing-first SaaS for freelancers and small service teams',
    positioningSummary:
      'FreshBooks started as invoicing for freelancers and has steadily added accounting. ' +
      'It wins on invoice UX polish and built-in time tracking for solo billable-hours ' +
      'workflows. HelloBooks competes when the buyer wants real bookkeeping automation, ' +
      'more than 5 clients, or unlimited team seats — FreshBooks gates all three.',
    whereWeWin: [
      'AI does the bookkeeping vs. FreshBooks requiring manual categorise + reconcile',
      'No client limit — FreshBooks Lite caps you at 5 clients ($23/mo)',
      'No per-user fees — FreshBooks adds $11/mo per extra team member',
      'Guided QuickBooks migration; FreshBooks has none',
      'Global tax compliance — GST, HMRC MTD, IRP e-invoice — broader than FreshBooks',
    ],
    whereTheyWin: [
      'Polished invoicing UX, including the client-facing payment view',
      'Built-in time tracking is ideal for freelancers billing by the hour',
      'Mature proposal + estimate workflow',
      'Simpler interface for solo operators who only need invoicing + expenses',
    ],
    pricingNote: 'Public USD pricing $23–$70/mo (Lite/Plus/Premium); +$11/mo per additional user.',
    publicUrl: 'https://www.freshbooks.com',
    comparisonUrl: 'https://hellobooks.ai/compare/freshbooks',
  },
  {
    id: 'wave',
    name: 'Wave',
    primaryCountry: 'US',
    alsoIn: ['CA'],
    tier: 'secondary',
    segment: 'Free accounting for solopreneurs (US + CA)',
    positioningSummary:
      'Wave ships free accounting + invoicing for US and Canadian solo operators, ' +
      'monetising via payment processing and payroll. HelloBooks Free competes head-on ' +
      'with substantially more features at the same $0 price — bank connections via ' +
      'Plaid, AR/AP aging, full mobile app — and a much wider regional footprint.',
    whereWeWin: [
      'HelloBooks Free includes AI chatbot, OCR, smart categorization, AR/AP aging — Wave Free has none of these',
      'Bank connection via Plaid on Free plan; Wave Free has no bank feeds',
      'Full mobile app on Free; Wave mobile is invoicing-only',
      'Supported in 8 countries; Wave is US + Canada only',
      '2 included users on Free plan; Wave Free is 1 user',
    ],
    whereTheyWin: [
      'Brand recognition as "the free option" among US/CA solopreneurs',
      'Integrated Wave Payments (card processing) is well established',
      'Wave Payroll covers all US states + every CA province',
      'Simpler interface for users who only need invoicing + expense capture',
    ],
    pricingNote: 'Free; Wave Pro $16/mo (US) adds receipt scanning + auto-import; payments and payroll are usage-priced add-ons.',
    publicUrl: 'https://www.waveapps.com',
  },
  {
    id: 'zoho-books',
    name: 'Zoho Books',
    primaryCountry: 'IN',
    alsoIn: ['US', 'GB', 'AE', 'CA', 'AU'],
    tier: 'primary',
    segment: 'India SMB accounting with global reach (Zoho One suite)',
    positioningSummary:
      'Zoho Books is the most credible India-built cloud accounting alternative to ' +
      'Tally, and is also pushed globally via the Zoho One bundle. It overlaps deeply ' +
      'with HelloBooks on India GST + e-invoice + e-way bill, but our AI-native ' +
      'positioning, transparent pricing on Indian rupees, and tighter HelloTime ' +
      'attendance + payroll loop are the wedge.',
    whereWeWin: [
      'AI-first bookkeeping — Zoho Books AI is still primarily templated rules',
      'Native HelloTime + HelloGrowth CRM tenancy gives one-login attendance → payroll → P&L',
      'Compliance calendar with PF / ESI / PT / GST due-dates pre-loaded',
      'Guided QuickBooks + Xero migration path',
      'India GST e-invoice + e-way bill via Fynamics GSP — fewer hand-offs than Zoho',
    ],
    whereTheyWin: [
      'Zoho One bundle gives 40+ apps (CRM, HRMS, Desk, etc.) under one subscription',
      'Mature India payroll add-on (Zoho Payroll) with PF/ESI/PT/TDS coverage',
      'Larger India CA / accountant install base; better channel reach',
      'Longer track record in the Indian market — established trust',
      'Deeper international footprint outside India + AE',
    ],
    pricingNote: 'INR ₹749–₹4,999/mo (Standard → Ultimate, varies by org volume); Zoho One bundle pricing varies.',
    publicUrl: 'https://www.zoho.com/books',
  },
  {
    id: 'tally',
    name: 'Tally (Tally Solutions)',
    primaryCountry: 'IN',
    alsoIn: ['AE'],
    tier: 'primary',
    segment: 'India desktop accounting incumbent (7M+ businesses)',
    positioningSummary:
      'Tally is the dominant India desktop accounting product with 7M+ businesses ' +
      'locked in by switching cost and CA familiarity. HelloBooks does not "beat" ' +
      'Tally feature-for-feature in core ledger workflows — we win the cloud + AI + ' +
      'mobile + multi-entity story, and our Tally Migration Tool (master data + ' +
      'transactions) is built specifically to remove the "but my data is in Tally" ' +
      'objection. Most Tally users move when they outgrow desktop, not before.',
    whereWeWin: [
      'Cloud-native — no on-prem install, no remote-desktop hacks for distributed teams',
      'AI categorisation, OCR, and chatbot — none of which Tally Prime ships',
      'Native mobile app (iOS + Android); Tally mobile is third-party add-ons',
      'Multi-entity + multi-currency in one tenancy; Tally needs separate company files',
      'Tally Migration Tool ports master data + transactions in a guided flow',
      'Real-time bank reconciliation; Tally bank rec is manual',
    ],
    whereTheyWin: [
      '7M+ Indian businesses already running on Tally — CA familiarity is universal',
      'Decades of edge-case statutory coverage baked in (especially inventory + JV workflows)',
      'One-time license cost is attractive vs. SaaS for small India businesses',
      'Works fully offline — important for spotty-connectivity sites',
      'Trusted brand at India tax filings; CA workflows are Tally-shaped',
    ],
    pricingNote: 'Tally Prime perpetual licence ₹18,000 (Silver, single-user) or ₹54,000 (Gold, multi-user); annual TSS renewals separate.',
    publicUrl: 'https://tallysolutions.com',
  },
  {
    id: 'bench',
    name: 'Bench',
    primaryCountry: 'US',
    alsoIn: [],
    tier: 'primary',
    segment: 'US outsourced / AI bookkeeping service (post-shutdown)',
    positioningSummary:
      'Bench was the largest US done-for-you bookkeeping service, pairing proprietary ' +
      'software with human bookkeepers. It shut down abruptly in December 2024, locking ' +
      '12,000+ businesses out of their books, then was acquired by Employer.com days ' +
      'later and relaunched. HelloBooks positions as the alternative you own: an AI ' +
      'bookkeeper does the categorize/reconcile/close work daily, but the ledger lives ' +
      'in your account with export any time — so a vendor outage can never lock you out. ' +
      'See hellobooks.ai/bench-alternative.',
    whereWeWin: [
      'You own the ledger — export any time + open MCP access, no service you can be locked out of',
      'AI runs bookkeeping daily vs. Bench delivering monthly cleanup after month-end',
      'Self-serve AI cleanup mode backfills a stalled year in an afternoon',
      'Free Plan + Pro at a $9.99/mo founding price (then $19.99) vs. a monthly service retainer',
      'US filing built in — 1099 e-file + 50-state sales tax from the same ledger',
      'Keep your own CPA in reviewer mode instead of a single assigned bookkeeper',
    ],
    whereTheyWin: [
      'Fully done-for-you — a human team does the work so the owner touches nothing',
      'A dedicated human bookkeeper relationship some buyers specifically want',
      'BenchTax bundles income-tax filing into the same service',
      'Established brand and a large (if disrupted) existing customer base',
    ],
    pricingNote: 'Monthly service retainer (historically ~US$299/mo Essential tier); done-for-you, not self-serve.',
    publicUrl: 'https://bench.co',
    comparisonUrl: 'https://hellobooks.ai/compare/hellobooks-vs-bench',
  },
  {
    id: 'pilot',
    name: 'Pilot',
    primaryCountry: 'US',
    alsoIn: [],
    tier: 'secondary',
    segment: 'US startup managed bookkeeping + CFO services',
    positioningSummary:
      'Pilot pairs software with human bookkeepers plus tax and fractional-CFO services, ' +
      'aimed at VC-backed startups that want accrual, GAAP-ready books done for them. ' +
      'HelloBooks competes for owner-operators and SMBs who want AI to do the bookkeeping ' +
      'at self-serve pricing while keeping their own CPA in reviewer mode — rather than ' +
      'buying a quote-based managed service.',
    whereWeWin: [
      'Self-serve AI bookkeeping vs. a quote-based, done-for-you managed service',
      'Free Plan + Pro at $9.99/mo (then $19.99) vs. a monthly human-service retainer',
      'You own the ledger with export any time + open MCP agent access',
      'Multi-country tax compliance built in (US, UK, AU, CA, India) vs. US-centric service',
      'Unlimited users on every plan',
    ],
    whereTheyWin: [
      'A dedicated human finance team and fractional CFO for high-touch buyers',
      'Strong fit for VC-backed startups, board reporting, and fundraising support',
      'Accrual / GAAP specialists and R&D tax-credit assistance',
      'Done-for-you model means the founder can be fully hands-off',
    ],
    pricingNote: 'Managed-service pricing, typically from ~US$200+/mo billed annually; scales with expenses and complexity.',
    publicUrl: 'https://pilot.com',
    comparisonUrl: 'https://hellobooks.ai/compare/hellobooks-vs-pilot',
  },
  {
    id: 'zeni',
    name: 'Zeni',
    primaryCountry: 'US',
    alsoIn: [],
    tier: 'secondary',
    segment: 'US AI + finance-team bookkeeping for funded startups',
    positioningSummary:
      'Zeni blends AI bookkeeping with a dedicated finance concierge and real-time ' +
      'dashboards, targeting funded startups that want a premium, high-touch back office. ' +
      'HelloBooks wins for businesses that want self-serve AI at a fraction of the price, ' +
      'ledger ownership, and multi-country compliance without a concierge retainer.',
    whereWeWin: [
      'Self-serve AI vs. a high-touch concierge finance-team retainer',
      'Free Plan + Pro at $9.99/mo (then $19.99) vs. premium managed pricing (hundreds+/mo)',
      'You own the ledger with export any time + open MCP access',
      'Multi-country tax compliance built in vs. US-startup-centric service',
      'Unlimited users on every plan',
    ],
    whereTheyWin: [
      'Dedicated finance concierge with bill pay, invoicing, and CFO services',
      'Polished real-time cash-flow and burn dashboards',
      'Positioning and workflows tuned for VC-backed startups',
      'Human-checked books for buyers who want a service, not software',
    ],
    pricingNote: 'Premium managed pricing (historically from several hundred US$/mo); concierge finance-team model.',
    publicUrl: 'https://www.zeni.ai',
    comparisonUrl: 'https://hellobooks.ai/compare/hellobooks-vs-zeni',
  },
];
