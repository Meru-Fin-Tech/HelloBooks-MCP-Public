/**
 * Local payment-method catalog — public knowledge of the bank-rail / wallet
 * options HelloBooks customers see in each market. Used to answer questions
 * like "which IN rails clear instantly for AR collection?" or "what's the
 * cheapest way to push GBP supplier payments?".
 *
 * For HelloBooks, the `payment_methods` tool is filtered to the use-cases
 * relevant to an accounting / AR–AP product:
 *   - 'invoice-collection' — accept customer payment on AR invoices
 *   - 'b2b-supplier'       — push payment to suppliers (AP)
 *   - 'contractor-payout'  — pay independent contractors / 1099-NEC etc.
 *
 * The catalog itself carries every use-case so the schema stays interchangeable
 * with the sister HelloTime-MCP-Public catalog (the two MCP servers don't
 * share code today; we keep the shape identical to make a future shared
 * package painless).
 *
 * Public-only data: no customer references, no bank-detail strings, no auth.
 * `helloProductSupport` reflects HelloBooks' own status — set to 'live' only
 * where the rail is end-to-end shipped, 'roadmap' for declared intent without
 * a ship date, 'partner-only' when the rail is reachable through a connected
 * processor (e.g. UPI via Razorpay) but not directly.
 */

import type { CountryCode } from './plans.js';

export type PaymentRail = 'instant' | 'same-day' | 'next-day' | 'multi-day';

export type PaymentUseCase =
  | 'payroll'
  | 'invoice-collection'
  | 'contractor-payout'
  | 'b2b-supplier'
  | 'p2p';

export type HelloProductSupport = 'live' | 'roadmap' | 'partner-only';

export interface PaymentMethod {
  id: string;
  country: CountryCode;
  /** Human-readable name (e.g. 'UPI', 'BACS Direct Credit', 'Interac e-Transfer'). */
  name: string;
  rail: PaymentRail;
  useCases: PaymentUseCase[];
  /** Issuing/operating authority (e.g. 'NPCI', 'Pay.UK', 'Interac Corp'). */
  authority: string;
  helloProductSupport?: HelloProductSupport;
  notes?: string[];
}

// ---------------------------------------------------------------------------
// India — NPCI / RBI rails. Razorpay is the live AR-collection processor on
// HelloBooks (already in src/data/integrations.ts); UPI / IMPS / NEFT route
// through it.
// ---------------------------------------------------------------------------

const IN_METHODS: PaymentMethod[] = [
  {
    id: 'in-upi',
    country: 'IN',
    name: 'UPI',
    rail: 'instant',
    useCases: ['payroll', 'contractor-payout', 'invoice-collection', 'b2b-supplier', 'p2p'],
    authority: 'NPCI',
    helloProductSupport: 'live',
    notes: [
      'Unified Payments Interface — 24x7 instant settlement via VPAs.',
      'Per-transaction limit ₹1,00,000 for most categories (₹2,00,000–5,00,000 for specific categories per NPCI circulars).',
      'Most-used invoice-collection rail in India; razored cost compared to card rails.',
    ],
  },
  {
    id: 'in-rupay',
    country: 'IN',
    name: 'RuPay',
    rail: 'instant',
    useCases: ['invoice-collection', 'p2p'],
    authority: 'NPCI',
    helloProductSupport: 'live',
    notes: [
      'Domestic card scheme; lower MDR than international cards. Useful for AR collection on HelloBooks invoices.',
      'RuPay credit cards on UPI are accepted via VPA-linked flows (NPCI 2022 enablement).',
    ],
  },
  {
    id: 'in-razorpay',
    country: 'IN',
    name: 'Razorpay (gateway + payouts)',
    rail: 'instant',
    useCases: ['payroll', 'contractor-payout', 'invoice-collection', 'b2b-supplier'],
    authority: 'Razorpay (RBI-licensed PA / PSP)',
    helloProductSupport: 'live',
    notes: [
      'Aggregator: routes UPI / IMPS / NEFT / RTGS / cards depending on amount and beneficiary.',
      'The canonical AR-collection integration on HelloBooks today (see src/data/integrations.ts).',
    ],
  },
  {
    id: 'in-imps',
    country: 'IN',
    name: 'IMPS',
    rail: 'instant',
    useCases: ['payroll', 'contractor-payout', 'b2b-supplier', 'p2p'],
    authority: 'NPCI',
    helloProductSupport: 'partner-only',
    notes: [
      'Immediate Payment Service — 24x7 inter-bank instant transfer.',
      'Per-transaction limit ₹5,00,000 (NPCI Oct-2021 circular). Often used as the supplier-payout fallback when UPI cap is exceeded.',
    ],
  },
  {
    id: 'in-neft',
    country: 'IN',
    name: 'NEFT',
    rail: 'same-day',
    useCases: ['payroll', 'contractor-payout', 'b2b-supplier'],
    authority: 'Reserve Bank of India',
    helloProductSupport: 'partner-only',
    notes: [
      'National Electronic Funds Transfer — settles in half-hourly batches, 24x7 (since Dec-2019).',
      'No per-transaction cap; suitable for bulk supplier disbursement.',
    ],
  },
  {
    id: 'in-rtgs',
    country: 'IN',
    name: 'RTGS',
    rail: 'instant',
    useCases: ['b2b-supplier'],
    authority: 'Reserve Bank of India',
    notes: [
      'Real-Time Gross Settlement — minimum ₹2,00,000 per transaction; settles continuously, 24x7 (since Dec-2020).',
      'Use for high-value supplier or vendor payouts where same-second settlement matters.',
    ],
  },
];

// ---------------------------------------------------------------------------
// United Kingdom — Pay.UK / Bank of England rails.
// ---------------------------------------------------------------------------

const GB_METHODS: PaymentMethod[] = [
  {
    id: 'gb-bacs',
    country: 'GB',
    name: 'BACS Direct Credit',
    rail: 'multi-day',
    useCases: ['payroll', 'contractor-payout', 'b2b-supplier'],
    authority: 'Pay.UK',
    notes: [
      'Three-day cycle: file submitted Day 1, processed Day 2, credited Day 3.',
      'Cheapest UK rail for high-volume supplier-payment runs.',
    ],
  },
  {
    id: 'gb-fps',
    country: 'GB',
    name: 'Faster Payments (FPS)',
    rail: 'instant',
    useCases: ['payroll', 'contractor-payout', 'invoice-collection', 'b2b-supplier', 'p2p'],
    authority: 'Pay.UK',
    notes: [
      'Near-instant 24x7 inter-bank transfer; per-transaction limit £1,000,000 (most banks impose lower internal limits).',
      'Common for ad-hoc supplier payments and Open-Banking-initiated AR collection.',
    ],
  },
  {
    id: 'gb-chaps',
    country: 'GB',
    name: 'CHAPS',
    rail: 'same-day',
    useCases: ['b2b-supplier'],
    authority: 'Bank of England',
    notes: [
      'Same-day high-value sterling settlement; no upper limit. Bank fees apply per leg.',
      'Reserved for property completions, large supplier payments, or any leg where same-day finality matters.',
    ],
  },
  {
    id: 'gb-open-banking',
    country: 'GB',
    name: 'Open Banking AIS / PIS',
    rail: 'instant',
    useCases: ['invoice-collection', 'contractor-payout'],
    authority: 'Open Banking Ltd (FCA-supervised)',
    notes: [
      'Account Information Services + Payment Initiation Services under PSD2. PIS pushes money via Faster Payments under the hood.',
      'Lower acceptance cost than card rails; the dominant new-build AR-collection option for UK SMBs.',
    ],
  },
];

// ---------------------------------------------------------------------------
// Canada — Payments Canada / Interac.
// ---------------------------------------------------------------------------

const CA_METHODS: PaymentMethod[] = [
  {
    id: 'ca-interac-etransfer',
    country: 'CA',
    name: 'Interac e-Transfer',
    rail: 'instant',
    useCases: ['payroll', 'contractor-payout', 'invoice-collection', 'p2p'],
    authority: 'Interac Corp',
    notes: [
      'Canada-default A2A rail; sender uses email/SMS to push funds, recipient claims into linked bank.',
      'Common per-transaction cap CA$3,000–10,000 depending on bank; bulk B2B disbursement should fall back to EFT.',
      'Interac e-Transfer for Business raises the cap and supports automated deposit.',
    ],
  },
  {
    id: 'ca-eft',
    country: 'CA',
    name: 'EFT (Electronic Funds Transfer)',
    rail: 'multi-day',
    useCases: ['payroll', 'contractor-payout', 'b2b-supplier'],
    authority: 'Payments Canada',
    notes: [
      '1–3 business day settlement via the Automated Clearing Settlement System (ACSS).',
      'Pre-authorised debit / credit covered by Payments Canada Rule H1; the standard rail for AP and recurring billing.',
    ],
  },
  {
    id: 'ca-ach',
    country: 'CA',
    name: 'ACH (cross-border)',
    rail: 'multi-day',
    useCases: ['contractor-payout', 'b2b-supplier'],
    authority: 'Payments Canada / Nacha (cross-border)',
    notes: [
      'Cross-border ACH from US-domiciled processors that route into Canadian EFT. Distinct from US domestic ACH.',
      'Useful for paying Canadian contractors from a US-based payroll processor; FX applied per processor.',
    ],
  },
];

// ---------------------------------------------------------------------------
// Australia — AusPayNet / NPP Australia / BPAY Group.
// ---------------------------------------------------------------------------

const AU_METHODS: PaymentMethod[] = [
  {
    id: 'au-payid',
    country: 'AU',
    name: 'PayID',
    rail: 'instant',
    useCases: ['payroll', 'contractor-payout', 'invoice-collection', 'p2p'],
    authority: 'NPP Australia',
    notes: [
      'Identifier service on top of the New Payments Platform; route via mobile / ABN / email instead of BSB+account.',
      'Reduces incorrect-payment risk for ad-hoc supplier and contractor payouts.',
    ],
  },
  {
    id: 'au-payto',
    country: 'AU',
    name: 'PayTo',
    rail: 'instant',
    useCases: ['payroll', 'invoice-collection', 'b2b-supplier'],
    authority: 'NPP Australia',
    notes: [
      'Mandate-based real-time direct debit on NPP; replacement for legacy BECS direct debit.',
      'The recommended new-build rail for recurring SaaS billing and AR collection in AU.',
    ],
  },
  {
    id: 'au-npp',
    country: 'AU',
    name: 'NPP (New Payments Platform)',
    rail: 'instant',
    useCases: ['payroll', 'contractor-payout', 'invoice-collection', 'b2b-supplier', 'p2p'],
    authority: 'NPP Australia',
    notes: [
      'The underlying real-time rail; PayID and PayTo are services riding on top.',
      'Industry roadmap: AusPayNet plans to retire BECS direct entry by 2030, with NPP as the successor.',
    ],
  },
  {
    id: 'au-bpay',
    country: 'AU',
    name: 'BPAY',
    rail: 'next-day',
    useCases: ['invoice-collection', 'b2b-supplier'],
    authority: 'BPAY Group Limited',
    notes: [
      'Bill-payment scheme using biller code + CRN. Customer-pull rather than business-push.',
      'Common AR-collection mechanism for AU utilities, telcos, and SMBs sending recurring invoices.',
    ],
  },
  {
    id: 'au-eft-direct-entry',
    country: 'AU',
    name: 'EFT (Direct Entry / BECS)',
    rail: 'next-day',
    useCases: ['payroll', 'contractor-payout', 'b2b-supplier'],
    authority: 'AusPayNet',
    notes: [
      'Bulk Electronic Clearing System — overnight ABA-file processing; the historic AU AP and payroll rail.',
      'Earmarked for retirement on the AusPayNet 2030 roadmap; greenfield integrations should target NPP/PayTo.',
    ],
  },
];

// ---------------------------------------------------------------------------
// United States — Nacha / Fed / TCH / EWS rails.
// ---------------------------------------------------------------------------

const US_METHODS: PaymentMethod[] = [
  {
    id: 'us-ach-ccd-ppd',
    country: 'US',
    name: 'ACH (CCD / PPD)',
    rail: 'multi-day',
    useCases: ['payroll', 'contractor-payout', 'b2b-supplier'],
    authority: 'Nacha',
    notes: [
      'Standard 1–2 business day batch rail. PPD = consumer (payroll Direct Deposit), CCD = corporate (B2B).',
      'CCD addenda carry remittance metadata for B2B supplier reconciliation.',
    ],
  },
  {
    id: 'us-same-day-ach',
    country: 'US',
    name: 'Same Day ACH',
    rail: 'same-day',
    useCases: ['payroll', 'contractor-payout', 'b2b-supplier'],
    authority: 'Nacha',
    notes: [
      'Three settlement windows per business day; per-transaction cap raised to $1,000,000 (2022).',
      'Use for off-cycle supplier disbursement that misses the standard ACH deadline.',
    ],
  },
  {
    id: 'us-fedwire',
    country: 'US',
    name: 'Wire (Fedwire)',
    rail: 'same-day',
    useCases: ['b2b-supplier', 'contractor-payout'],
    authority: 'Federal Reserve',
    notes: [
      'Real-time gross settlement on Federal Reserve operating hours (extended to 22h since Apr-2024).',
      'Fees per leg ($15–35 typical); reserved for high-value supplier payments.',
    ],
  },
  {
    id: 'us-zelle',
    country: 'US',
    name: 'Zelle',
    rail: 'instant',
    useCases: ['invoice-collection', 'p2p'],
    authority: 'Early Warning Services (EWS)',
    notes: [
      'Bank-network P2P; consumer-grade with limited merchant-side acceptance for B2B AR.',
      'Per-bank send limits typically $500–5,000/day; not viable as a primary AR rail for SMBs.',
    ],
  },
  {
    id: 'us-rtp',
    country: 'US',
    name: 'RTP (Real-Time Payments)',
    rail: 'instant',
    useCases: ['payroll', 'contractor-payout', 'invoice-collection', 'b2b-supplier'],
    authority: 'The Clearing House',
    notes: [
      '24x7 instant credit transfer; per-transaction cap $10,000,000 (Feb-2025).',
      'FedNow (Federal Reserve, launched Jul-2023) is the alternative instant rail; coverage overlaps but is not identical.',
    ],
  },
];

// ---------------------------------------------------------------------------
// United Arab Emirates — WPS for payroll only. Carried in the catalog but
// HelloBooks' default tool scope (invoice-collection / b2b / contractor-payout)
// excludes payroll-only rails. An agent that explicitly asks for `payroll`
// will still see this entry.
// ---------------------------------------------------------------------------

const AE_METHODS: PaymentMethod[] = [
  {
    id: 'ae-wps-sif',
    country: 'AE',
    name: 'WPS-SIF (Wage Protection System Salary Information File)',
    rail: 'multi-day',
    useCases: ['payroll'],
    authority: 'Central Bank of the UAE / MOHRE',
    notes: [
      'Mandatory rail for paying onshore UAE employees. Employer submits a SIF to its agent bank, which credits employee accounts via UAEFTS.',
      'Non-compliance triggers MOHRE penalties and can suspend new work permits.',
      'Free-zone authorities (DIFC, ADGM) operate parallel WPS schemes with the same SIF format.',
      'Outside HelloBooks default tool scope (payroll-only) — reachable via explicit useCase=payroll filter.',
    ],
  },
];

// ---------------------------------------------------------------------------
// Singapore — ABS / MAS rails.
// ---------------------------------------------------------------------------

const SG_METHODS: PaymentMethod[] = [
  {
    id: 'sg-paynow',
    country: 'SG',
    name: 'PayNow',
    rail: 'instant',
    useCases: ['payroll', 'contractor-payout', 'invoice-collection', 'p2p'],
    authority: 'Association of Banks in Singapore (ABS)',
    notes: [
      'Identifier service on top of FAST; route by NRIC, mobile or UEN.',
      'PayNow Corporate (UEN-routed) is the preferred AR-collection and supplier-payout rail.',
    ],
  },
  {
    id: 'sg-fast',
    country: 'SG',
    name: 'FAST',
    rail: 'instant',
    useCases: ['payroll', 'contractor-payout', 'b2b-supplier', 'p2p'],
    authority: 'Association of Banks in Singapore (ABS)',
    notes: [
      'Fast And Secure Transfers — 24x7 inter-bank instant rail underlying PayNow.',
      'Per-transaction cap raised to S$200,000 (2021).',
    ],
  },
  {
    id: 'sg-giro',
    country: 'SG',
    name: 'GIRO',
    rail: 'multi-day',
    useCases: ['payroll', 'invoice-collection', 'b2b-supplier'],
    authority: 'Association of Banks in Singapore (ABS)',
    notes: [
      'Batch direct credit / direct debit (2–3 day settlement). Long-standing AR-collection standard before PayNow Corporate.',
    ],
  },
];

// ---------------------------------------------------------------------------
// New Zealand — Payments NZ rails. POLi (a legacy A2A wallet) wound down its
// services in September 2023; we keep the entry so an agent can warn callers.
// ---------------------------------------------------------------------------

const NZ_METHODS: PaymentMethod[] = [
  {
    id: 'nz-becs-direct-credit',
    country: 'NZ',
    name: 'Direct Credit (Bulk Electronic Clearing System)',
    rail: 'next-day',
    useCases: ['payroll', 'contractor-payout', 'b2b-supplier'],
    authority: 'Payments NZ',
    notes: [
      'NZ analog of the AU BECS scheme; bulk batched direct credit run by Payments NZ under the SBI rules.',
      'Same-day intra-bank, next-business-day inter-bank for files lodged before the cut-off.',
      'The standard rail for NZ AP and contractor disbursement.',
    ],
  },
  {
    id: 'nz-poli',
    country: 'NZ',
    name: 'POLi',
    rail: 'instant',
    useCases: ['invoice-collection'],
    authority: 'POLi Payments (discontinued)',
    notes: [
      'Legacy account-to-account online payment service. POLi Payments wound down its service on 30 September 2023.',
      'Listed for completeness so an agent can flag the discontinuation rather than recommend it.',
    ],
  },
  {
    id: 'nz-account-to-account',
    country: 'NZ',
    name: 'Account-to-account (Open Banking)',
    rail: 'instant',
    useCases: ['invoice-collection', 'contractor-payout'],
    authority: 'Payments NZ API Centre',
    notes: [
      'Payment-initiation API standards published by the Payments NZ API Centre; partial bank coverage as of 2025.',
      'Expected to replace POLi-style A2A for invoice-collection use cases as bank coverage broadens.',
    ],
  },
];

// ---------------------------------------------------------------------------
// Final catalog
// ---------------------------------------------------------------------------

export const PAYMENT_METHODS: PaymentMethod[] = [
  ...IN_METHODS,
  ...GB_METHODS,
  ...CA_METHODS,
  ...AU_METHODS,
  ...US_METHODS,
  ...AE_METHODS,
  ...SG_METHODS,
  ...NZ_METHODS,
];

/**
 * Use-cases this MCP surfaces. HelloBooks is accounting, so we filter to AR /
 * AP / contractor flows and deliberately drop pure-payroll and P2P rails from
 * the default tool response. Callers can still match those entries via the
 * `useCase` argument or `feature_search`.
 */
export const HELLOBOOKS_USE_CASES: PaymentUseCase[] = [
  'invoice-collection',
  'b2b-supplier',
  'contractor-payout',
];
