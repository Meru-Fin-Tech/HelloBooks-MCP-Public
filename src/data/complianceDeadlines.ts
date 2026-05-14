/**
 * Compliance deadline catalog — when statutory returns and filings are due,
 * per country, per form.
 *
 * Public-only data: due dates published by tax/payroll authorities. No
 * customer-specific calendar, no per-tenant overrides. Annual filing dates are
 * the authority's published cut-offs at the time of `lastReviewed` — they
 * **rotate** each fiscal year and the authority may grant ad-hoc extensions.
 * Consumers MUST treat this as a planning hint and reconcile against the
 * authority source before acting on it.
 *
 * Drift check: `npm run check:deadline-drift` (in `scripts/check-deadline-
 * drift.ts`) fetches each `source` URL, scans for `annualDates` / `dueDay`,
 * writes `drift-report.md`, and exits non-zero on drift. Wired into the
 * internal Jenkins box as a quarterly job (Jan 1 / Apr 1 / Jul 1 / Oct 1) —
 * authorities publish next-FY dates 1–3 months ahead of FY start, so that
 * cadence catches rotations before consumers act on stale data. The check
 * alerts; it does not auto-patch — bump `lastReviewed` by hand after
 * reconciling each finding.
 */

import type { CountryCode } from './plans.js';

export type DeadlineFrequency =
  | 'monthly'
  | 'quarterly'
  | 'half-yearly'
  | 'annual'
  | 'per-event';

export interface Deadline {
  /** Stable slug for filter + cross-ref. Lowercase, hyphenated. */
  id: string;
  country: CountryCode;
  /** Authority-issued form name as commonly cited, e.g. "GSTR-3B", "BAS", "1099-NEC". */
  form: string;
  /** Issuing authority (acronym + expansion if not universally known). */
  authority: string;
  frequency: DeadlineFrequency;
  /**
   * For periodic filings tied to a fixed day of the month following the
   * period (e.g. 20 for "20th of the next month"). Omit for `per-event`
   * filings and for forms that use fixed annual dates instead.
   */
  dueDay?: number;
  /**
   * Calendar-date cut-offs for filings that recur on the same dates every
   * year (e.g. ['Jan 31'] for W-2, ['Oct 28','Feb 28','Apr 28','Jul 28']
   * for AU BAS). Format: "MMM D" (English month abbrev + day-of-month).
   */
  annualDates?: string[];
  /** Threshold / exemption / variant. Plain English, no jargon-only abbreviations. */
  applicabilityNote?: string;
  /** Authority URL — the page a human would visit to confirm. */
  source: string;
  /** ISO date (YYYY-MM-DD) of last manual review against the authority source. */
  lastReviewed: string;
}

const LAST_REVIEWED = '2026-05-14';

export const COMPLIANCE_DEADLINES: Deadline[] = [
  // --------------------------------------------------------------- India ----
  {
    id: 'gstr-1',
    country: 'IN',
    form: 'GSTR-1',
    authority: 'GSTN / CBIC',
    frequency: 'monthly',
    dueDay: 11,
    applicabilityNote:
      'Monthly filers (turnover > ₹5 crore in preceding FY, or opted-out of QRMP). Due 11th of month following the tax period.',
    source: 'https://www.gst.gov.in/',
    lastReviewed: LAST_REVIEWED,
  },
  {
    id: 'gstr-1-qrmp',
    country: 'IN',
    form: 'GSTR-1 (QRMP)',
    authority: 'GSTN / CBIC',
    frequency: 'quarterly',
    dueDay: 13,
    applicabilityNote:
      'QRMP scheme (turnover up to ₹5 crore, quarterly filer). Due 13th of month following the quarter end.',
    source: 'https://www.gst.gov.in/',
    lastReviewed: LAST_REVIEWED,
  },
  {
    id: 'gstr-3b',
    country: 'IN',
    form: 'GSTR-3B',
    authority: 'GSTN / CBIC',
    frequency: 'monthly',
    dueDay: 20,
    applicabilityNote:
      'Monthly filers. Due 20th of month following the tax period.',
    source: 'https://www.gst.gov.in/',
    lastReviewed: LAST_REVIEWED,
  },
  {
    id: 'gstr-3b-qrmp',
    country: 'IN',
    form: 'GSTR-3B (QRMP)',
    authority: 'GSTN / CBIC',
    frequency: 'quarterly',
    applicabilityNote:
      'QRMP scheme. Due 22nd (Category-X states) or 24th (Category-Y states) of month following the quarter end. State grouping per CBIC notification.',
    source: 'https://www.gst.gov.in/',
    lastReviewed: LAST_REVIEWED,
  },
  {
    id: 'gstr-9',
    country: 'IN',
    form: 'GSTR-9',
    authority: 'GSTN / CBIC',
    frequency: 'annual',
    annualDates: ['Dec 31'],
    applicabilityNote:
      'Annual return for the preceding FY. Due 31 December following close of the FY.',
    source: 'https://www.gst.gov.in/',
    lastReviewed: LAST_REVIEWED,
  },
  {
    id: 'gstr-9c',
    country: 'IN',
    form: 'GSTR-9C',
    authority: 'GSTN / CBIC',
    frequency: 'annual',
    annualDates: ['Dec 31'],
    applicabilityNote:
      'Reconciliation statement. Mandatory for registered persons with aggregate turnover above ₹5 crore in the FY.',
    source: 'https://www.gst.gov.in/',
    lastReviewed: LAST_REVIEWED,
  },
  {
    id: 'cmp-08',
    country: 'IN',
    form: 'CMP-08',
    authority: 'GSTN / CBIC',
    frequency: 'quarterly',
    dueDay: 18,
    applicabilityNote:
      'Composition-scheme dealers. Self-assessed tax statement due 18th of month following the quarter end.',
    source: 'https://www.gst.gov.in/',
    lastReviewed: LAST_REVIEWED,
  },
  {
    id: 'form-24q',
    country: 'IN',
    form: 'Form 24Q',
    authority: 'Income Tax Department (CBDT) / NSDL',
    frequency: 'quarterly',
    annualDates: ['Jul 31', 'Oct 31', 'Jan 31', 'May 31'],
    applicabilityNote:
      'TDS on salaries. Q1 due 31 Jul, Q2 due 31 Oct, Q3 due 31 Jan, Q4 due 31 May (Q4 is one month later than Q1–Q3 because it covers Jan–Mar wages).',
    source: 'https://www.incometax.gov.in/',
    lastReviewed: LAST_REVIEWED,
  },
  {
    id: 'form-16',
    country: 'IN',
    form: 'Form 16',
    authority: 'Income Tax Department (CBDT)',
    frequency: 'annual',
    annualDates: ['Jun 15'],
    applicabilityNote:
      'Annual TDS certificate to be issued by the employer to each employee by 15 June following the FY end.',
    source: 'https://www.incometax.gov.in/',
    lastReviewed: LAST_REVIEWED,
  },
  {
    id: 'pf-ecr',
    country: 'IN',
    form: 'PF ECR',
    authority: 'EPFO',
    frequency: 'monthly',
    dueDay: 15,
    applicabilityNote:
      'Electronic Challan-cum-Return for Provident Fund contributions. Due 15th of month following the wage month.',
    source: 'https://www.epfindia.gov.in/',
    lastReviewed: LAST_REVIEWED,
  },
  {
    id: 'esi-contribution',
    country: 'IN',
    form: 'ESI contribution',
    authority: 'ESIC',
    frequency: 'monthly',
    dueDay: 15,
    applicabilityNote:
      'Employees\' State Insurance contributions. Due 15th of month following the wage month.',
    source: 'https://www.esic.gov.in/',
    lastReviewed: LAST_REVIEWED,
  },

  // ------------------------------------------------------------ Australia ---
  {
    id: 'bas',
    country: 'AU',
    form: 'BAS',
    authority: 'ATO',
    frequency: 'quarterly',
    annualDates: ['Oct 28', 'Feb 28', 'Apr 28', 'Jul 28'],
    applicabilityNote:
      'Quarterly Business Activity Statement. Q1 (Jul–Sep) due 28 Oct, Q2 (Oct–Dec) due 28 Feb, Q3 (Jan–Mar) due 28 Apr, Q4 (Apr–Jun) due 28 Jul. Tax-agent lodgement concessions may extend the date.',
    source: 'https://www.ato.gov.au/businesses-and-organisations/preparing-lodging-and-paying/business-activity-statements-bas',
    lastReviewed: LAST_REVIEWED,
  },
  {
    id: 'stp',
    country: 'AU',
    form: 'STP (Single Touch Payroll)',
    authority: 'ATO',
    frequency: 'per-event',
    applicabilityNote:
      'Pay-event reporting. STP submission required on or before each pay day. No fixed calendar date — driven by your pay cycle.',
    source: 'https://www.ato.gov.au/businesses-and-organisations/hiring-and-paying-your-workers/single-touch-payroll',
    lastReviewed: LAST_REVIEWED,
  },
  {
    id: 'super-guarantee',
    country: 'AU',
    form: 'Super Guarantee',
    authority: 'ATO',
    frequency: 'quarterly',
    annualDates: ['Jan 28', 'Apr 28', 'Jul 28', 'Oct 28'],
    applicabilityNote:
      'Superannuation Guarantee contributions to employee fund / clearing house. Q1 due 28 Oct, Q2 due 28 Jan, Q3 due 28 Apr, Q4 due 28 Jul. Late SG triggers Super Guarantee Charge.',
    source: 'https://www.ato.gov.au/businesses-and-organisations/super-for-employers',
    lastReviewed: LAST_REVIEWED,
  },

  // ------------------------------------------------------- United Kingdom ---
  {
    id: 'vat-mtd',
    country: 'GB',
    form: 'VAT Return (MTD)',
    authority: 'HMRC',
    frequency: 'quarterly',
    applicabilityNote:
      'Making Tax Digital VAT return. Due 1 calendar month + 7 days after the end of the VAT quarter. Actual cut-off varies by your VAT stagger group, so this catalog cannot publish fixed annual dates.',
    source: 'https://www.gov.uk/vat-returns/deadlines',
    lastReviewed: LAST_REVIEWED,
  },
  {
    id: 'paye-rti',
    country: 'GB',
    form: 'PAYE RTI (FPS)',
    authority: 'HMRC',
    frequency: 'per-event',
    applicabilityNote:
      'Real Time Information Full Payment Submission. Must be filed on or before the date employees are paid.',
    source: 'https://www.gov.uk/running-payroll/reporting-to-hmrc',
    lastReviewed: LAST_REVIEWED,
  },
  {
    id: 'self-assessment',
    country: 'GB',
    form: 'Self Assessment Tax Return',
    authority: 'HMRC',
    frequency: 'annual',
    annualDates: ['Jan 31'],
    applicabilityNote:
      'Online filing deadline for the tax year ending 5 April (i.e. 2025/26 return due 31 Jan 2027). Paper-return deadline is 31 Oct, three months earlier.',
    source: 'https://www.gov.uk/self-assessment-tax-returns/deadlines',
    lastReviewed: LAST_REVIEWED,
  },

  // -------------------------------------------------------- United States ---
  {
    id: '1099-nec',
    country: 'US',
    form: '1099-NEC',
    authority: 'IRS',
    frequency: 'annual',
    annualDates: ['Jan 31'],
    applicabilityNote:
      'Both the recipient copy AND the IRS filing (paper or electronic) are due 31 January following the tax year — 1099-NEC has a single unified deadline, unlike other 1099 series.',
    source: 'https://www.irs.gov/forms-pubs/about-form-1099-nec',
    lastReviewed: LAST_REVIEWED,
  },
  {
    id: '1099-misc-recipient',
    country: 'US',
    form: '1099-MISC (recipient copy)',
    authority: 'IRS',
    frequency: 'annual',
    annualDates: ['Jan 31'],
    applicabilityNote:
      'Furnish 1099-MISC to recipients by 31 January. If reporting in boxes 8 or 10 (substitute payments / gross attorney proceeds), the recipient deadline is 15 February.',
    source: 'https://www.irs.gov/forms-pubs/about-form-1099-misc',
    lastReviewed: LAST_REVIEWED,
  },
  {
    id: '1099-misc-irs-efile',
    country: 'US',
    form: '1099-MISC (IRS e-file)',
    authority: 'IRS',
    frequency: 'annual',
    annualDates: ['Mar 31'],
    applicabilityNote:
      'Electronic filing with the IRS for 1099-MISC and other non-NEC 1099 series (INT, DIV, etc.). Paper-filing deadline is 28 February.',
    source: 'https://www.irs.gov/forms-pubs/about-form-1099-misc',
    lastReviewed: LAST_REVIEWED,
  },
  {
    id: 'w-2',
    country: 'US',
    form: 'W-2',
    authority: 'SSA / IRS',
    frequency: 'annual',
    annualDates: ['Jan 31'],
    applicabilityNote:
      'Furnish W-2 to employees and file with SSA by 31 January following the tax year. Same date for paper and electronic filing.',
    source: 'https://www.irs.gov/forms-pubs/about-form-w-2',
    lastReviewed: LAST_REVIEWED,
  },
  {
    id: 'form-941',
    country: 'US',
    form: 'Form 941',
    authority: 'IRS',
    frequency: 'quarterly',
    annualDates: ['Apr 30', 'Jul 31', 'Oct 31', 'Jan 31'],
    applicabilityNote:
      'Employer quarterly federal tax return (income tax withholding, Social Security, Medicare). Due last day of the month following the quarter end.',
    source: 'https://www.irs.gov/forms-pubs/about-form-941',
    lastReviewed: LAST_REVIEWED,
  },
  {
    id: 'form-940',
    country: 'US',
    form: 'Form 940',
    authority: 'IRS',
    frequency: 'annual',
    annualDates: ['Jan 31'],
    applicabilityNote:
      'Employer\'s annual Federal Unemployment Tax (FUTA) return. Due 31 January following the tax year (10 Feb if all FUTA tax was deposited on time).',
    source: 'https://www.irs.gov/forms-pubs/about-form-940',
    lastReviewed: LAST_REVIEWED,
  },

  // ---------------------------------------------------------------- Canada ---
  {
    id: 't4',
    country: 'CA',
    form: 'T4',
    authority: 'CRA',
    frequency: 'annual',
    annualDates: ['Feb 28'],
    applicabilityNote:
      'Statement of Remuneration Paid. File T4 slips + T4 Summary with CRA and distribute to employees by the last day of February following the calendar year.',
    source: 'https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/payroll/completing-filing-information-returns/t4-information-employers.html',
    lastReviewed: LAST_REVIEWED,
  },
  {
    id: 'gst-hst-monthly',
    country: 'CA',
    form: 'GST/HST Return (monthly filer)',
    authority: 'CRA',
    frequency: 'monthly',
    applicabilityNote:
      'Required filing frequency for registrants with annual taxable supplies above $6 million (and optional for smaller registrants). Return and payment due one month after end of the reporting period.',
    source: 'https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses.html',
    lastReviewed: LAST_REVIEWED,
  },
  {
    id: 'gst-hst-quarterly',
    country: 'CA',
    form: 'GST/HST Return (quarterly filer)',
    authority: 'CRA',
    frequency: 'quarterly',
    applicabilityNote:
      'Default filing frequency for registrants with annual taxable supplies between $1.5 million and $6 million. Return and payment due one month after end of the quarter.',
    source: 'https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses.html',
    lastReviewed: LAST_REVIEWED,
  },
  {
    id: 'gst-hst-annual',
    country: 'CA',
    form: 'GST/HST Return (annual filer)',
    authority: 'CRA',
    frequency: 'annual',
    applicabilityNote:
      'Default filing frequency for registrants with annual taxable supplies up to $1.5 million. Return due 3 months after fiscal year end (or 6 months for self-employed individuals with calendar-year FY). Quarterly instalments may also be required.',
    source: 'https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses.html',
    lastReviewed: LAST_REVIEWED,
  },
];
