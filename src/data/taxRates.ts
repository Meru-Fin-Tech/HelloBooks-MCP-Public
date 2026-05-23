/**
 * Public, statute-derived tax-rate catalog.
 *
 * This catalog is intentionally a curated reference, not a live tax
 * engine — it covers the **canonical slabs and codes** that Indian GST,
 * UK VAT, US sales tax (federal-level summary), and the other supported
 * jurisdictions publish on official gazettes. Rates rotate when budgets
 * change; every entry carries a ``source`` URL so agents can confirm
 * before quoting figures to an end user.
 *
 * Audited by ``audit-public-data`` to be free of any customer / org data.
 *
 * Sources:
 *   - IN GST: cbic.gov.in/htdocs-cbec/gst/gst-rate-finder
 *   - UK VAT: gov.uk/guidance/rates-of-vat-on-different-goods-and-services
 *   - AU GST: ato.gov.au/business/gst
 *   - US sales tax: streamlined state-by-state summary (avalara public refs)
 *   - CA GST/HST: canada.ca/en/revenue-agency/services/forms-publications/publications/rc4022
 */

import type { CountryCode } from './plans.js';

export type RateScheme = 'standard' | 'reduced' | 'zero' | 'exempt' | 'composition' | 'cess' | 'state-summary';

export interface TaxRate {
  /** Stable id — `<country>-<scheme>-<slab>`, e.g. `IN-standard-18`. */
  id: string;
  country: CountryCode;
  /** Statutory tax type — GST, VAT, ST, HST, etc. */
  taxType: 'GST' | 'IGST' | 'CGST-SGST' | 'VAT' | 'Sales-Tax' | 'HST' | 'TDS' | 'TCS';
  scheme: RateScheme;
  /** Percentage as a number — e.g. 18 for 18%. Composition rates use the published flat number. */
  rate: number;
  /** Human-readable slab label — "Standard (18%)", "Reduced (5%)", "Zero", "Composition – trader (1%)", etc. */
  label: string;
  /** Common categories that fall under this slab. */
  exampleCategories: string[];
  /** Optional notes about edge cases / threshold gates / RCM applicability. */
  notes?: string;
  /** Effective from (ISO date). */
  effectiveFrom: string;
  /** Effective to (ISO date) — omit when current. */
  effectiveTo?: string;
  source: string;
}

export const TAX_RATES: TaxRate[] = [
  // ── India GST ───────────────────────────────────────────────────────
  {
    id: 'IN-standard-18',
    country: 'IN',
    taxType: 'GST',
    scheme: 'standard',
    rate: 18,
    label: 'Standard (18%)',
    exampleCategories: ['most services', 'restaurants (non-AC)', 'IT services', 'office supplies'],
    notes: 'Default for B2B services. RCM applies for specified imports of services from unregistered suppliers.',
    effectiveFrom: '2017-07-01',
    source: 'https://cbic-gst.gov.in/gst-goods-services-rates.html',
  },
  {
    id: 'IN-standard-12',
    country: 'IN',
    taxType: 'GST',
    scheme: 'standard',
    rate: 12,
    label: 'Standard (12%)',
    exampleCategories: ['packaged food', 'mobile phones', 'business class air travel'],
    effectiveFrom: '2017-07-01',
    source: 'https://cbic-gst.gov.in/gst-goods-services-rates.html',
  },
  {
    id: 'IN-reduced-5',
    country: 'IN',
    taxType: 'GST',
    scheme: 'reduced',
    rate: 5,
    label: 'Reduced (5%)',
    exampleCategories: ['restaurants (AC)', 'transport of goods', 'essential household items'],
    effectiveFrom: '2017-07-01',
    source: 'https://cbic-gst.gov.in/gst-goods-services-rates.html',
  },
  {
    id: 'IN-standard-28',
    country: 'IN',
    taxType: 'GST',
    scheme: 'standard',
    rate: 28,
    label: 'Standard (28%)',
    exampleCategories: ['luxury goods', 'tobacco', 'automobiles', 'aerated drinks'],
    notes: 'Compensation cess may apply on top of the headline 28% — see IN-cess-* entries.',
    effectiveFrom: '2017-07-01',
    source: 'https://cbic-gst.gov.in/gst-goods-services-rates.html',
  },
  {
    id: 'IN-zero-0',
    country: 'IN',
    taxType: 'GST',
    scheme: 'zero',
    rate: 0,
    label: 'Zero-rated',
    exampleCategories: ['exports', 'supplies to SEZ', 'unprocessed food grains'],
    notes: 'Zero-rated supplies remain eligible for input tax credit (ITC).',
    effectiveFrom: '2017-07-01',
    source: 'https://cbic-gst.gov.in/gst-goods-services-rates.html',
  },
  {
    id: 'IN-exempt-0',
    country: 'IN',
    taxType: 'GST',
    scheme: 'exempt',
    rate: 0,
    label: 'Exempt',
    exampleCategories: ['healthcare services', 'educational services', 'fresh milk'],
    notes: 'Exempt supplies are NOT eligible for ITC. Different treatment from zero-rated.',
    effectiveFrom: '2017-07-01',
    source: 'https://cbic-gst.gov.in/gst-goods-services-rates.html',
  },
  {
    id: 'IN-composition-trader-1',
    country: 'IN',
    taxType: 'GST',
    scheme: 'composition',
    rate: 1,
    label: 'Composition – trader (1%)',
    exampleCategories: ['small traders < Rs 1.5 cr turnover'],
    notes: 'CGST 0.5% + SGST 0.5%. CMP-08 quarterly + GSTR-4 annual.',
    effectiveFrom: '2019-04-01',
    source: 'https://cbic-gst.gov.in/composition-scheme.html',
  },
  {
    id: 'IN-composition-manufacturer-1',
    country: 'IN',
    taxType: 'GST',
    scheme: 'composition',
    rate: 1,
    label: 'Composition – manufacturer (1%)',
    exampleCategories: ['small manufacturers < Rs 1.5 cr turnover'],
    notes: 'CGST 0.5% + SGST 0.5%. Cannot collect tax from customers.',
    effectiveFrom: '2019-04-01',
    source: 'https://cbic-gst.gov.in/composition-scheme.html',
  },
  {
    id: 'IN-composition-restaurant-5',
    country: 'IN',
    taxType: 'GST',
    scheme: 'composition',
    rate: 5,
    label: 'Composition – restaurant (5%)',
    exampleCategories: ['small restaurants not serving alcohol'],
    notes: 'CGST 2.5% + SGST 2.5%.',
    effectiveFrom: '2019-04-01',
    source: 'https://cbic-gst.gov.in/composition-scheme.html',
  },

  // ── UK VAT ──────────────────────────────────────────────────────────
  {
    id: 'GB-standard-20',
    country: 'GB',
    taxType: 'VAT',
    scheme: 'standard',
    rate: 20,
    label: 'Standard (20%)',
    exampleCategories: ['most goods and services'],
    effectiveFrom: '2011-01-04',
    source: 'https://www.gov.uk/guidance/rates-of-vat-on-different-goods-and-services',
  },
  {
    id: 'GB-reduced-5',
    country: 'GB',
    taxType: 'VAT',
    scheme: 'reduced',
    rate: 5,
    label: 'Reduced (5%)',
    exampleCategories: ['domestic fuel', "children's car seats", 'home energy improvements'],
    effectiveFrom: '1997-09-01',
    source: 'https://www.gov.uk/guidance/rates-of-vat-on-different-goods-and-services',
  },
  {
    id: 'GB-zero-0',
    country: 'GB',
    taxType: 'VAT',
    scheme: 'zero',
    rate: 0,
    label: 'Zero',
    exampleCategories: ['most food', "children's clothes", 'books', 'newspapers'],
    notes: 'Zero-rated — supplier reclaims input VAT. Different from exempt.',
    effectiveFrom: '1973-04-01',
    source: 'https://www.gov.uk/guidance/rates-of-vat-on-different-goods-and-services',
  },
  {
    id: 'GB-exempt-0',
    country: 'GB',
    taxType: 'VAT',
    scheme: 'exempt',
    rate: 0,
    label: 'Exempt',
    exampleCategories: ['insurance', 'postage stamps', 'health services'],
    notes: 'Exempt — supplier cannot reclaim input VAT.',
    effectiveFrom: '1973-04-01',
    source: 'https://www.gov.uk/guidance/rates-of-vat-on-different-goods-and-services',
  },

  // ── Australia GST ───────────────────────────────────────────────────
  {
    id: 'AU-standard-10',
    country: 'AU',
    taxType: 'GST',
    scheme: 'standard',
    rate: 10,
    label: 'Standard (10%)',
    exampleCategories: ['most goods and services'],
    effectiveFrom: '2000-07-01',
    source: 'https://www.ato.gov.au/business/gst',
  },
  {
    id: 'AU-zero-0',
    country: 'AU',
    taxType: 'GST',
    scheme: 'zero',
    rate: 0,
    label: 'GST-free',
    exampleCategories: ['basic food', 'medical services', 'exports'],
    effectiveFrom: '2000-07-01',
    source: 'https://www.ato.gov.au/business/gst',
  },

  // ── United States — sales-tax summary (state-level) ─────────────────
  {
    id: 'US-state-summary',
    country: 'US',
    taxType: 'Sales-Tax',
    scheme: 'state-summary',
    rate: 0,
    label: 'Sales tax is state-administered',
    exampleCategories: ['everything'],
    notes:
      'There is no federal sales tax in the US. Rates are state + county + city; nexus is required ' +
      'per state. Combined rates range roughly 0% (NH, MT, OR, DE) up to ~10.25% (Chicago) ' +
      'depending on jurisdiction. Use Avalara/TaxJar for live rates per ZIP.',
    effectiveFrom: '1933-01-01',
    source: 'https://taxfoundation.org/data/all/state/2024-sales-taxes/',
  },

  // ── Canada — federal + harmonised ──────────────────────────────────
  {
    id: 'CA-gst-5',
    country: 'CA',
    taxType: 'GST',
    scheme: 'standard',
    rate: 5,
    label: 'GST (5%)',
    exampleCategories: ['federal GST applied in non-HST provinces (AB, BC, MB, NT, NU, QC, SK, YT)'],
    notes: 'In HST provinces (ON, NB, NS, NL, PE) the combined HST rate applies in lieu of separate GST + PST.',
    effectiveFrom: '2008-01-01',
    source: 'https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses.html',
  },
  {
    id: 'CA-hst-13-on',
    country: 'CA',
    taxType: 'HST',
    scheme: 'standard',
    rate: 13,
    label: 'HST – Ontario (13%)',
    exampleCategories: ['goods and services taxable under HST in Ontario'],
    effectiveFrom: '2010-07-01',
    source: 'https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses.html',
  },
  {
    id: 'CA-hst-15-atlantic',
    country: 'CA',
    taxType: 'HST',
    scheme: 'standard',
    rate: 15,
    label: 'HST – Atlantic (15%)',
    exampleCategories: ['NB, NS, NL, PE'],
    effectiveFrom: '2016-07-01',
    source: 'https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses.html',
  },

  // ── Singapore GST ───────────────────────────────────────────────────
  {
    id: 'SG-standard-9',
    country: 'SG',
    taxType: 'GST',
    scheme: 'standard',
    rate: 9,
    label: 'Standard (9%)',
    exampleCategories: ['most goods and services'],
    notes: 'Stepped up from 8% on 2024-01-01.',
    effectiveFrom: '2024-01-01',
    source: 'https://www.iras.gov.sg/taxes/goods-services-tax-(gst)',
  },

  // ── New Zealand GST ─────────────────────────────────────────────────
  {
    id: 'NZ-standard-15',
    country: 'NZ',
    taxType: 'GST',
    scheme: 'standard',
    rate: 15,
    label: 'Standard (15%)',
    exampleCategories: ['most goods and services'],
    effectiveFrom: '2010-10-01',
    source: 'https://www.ird.govt.nz/gst',
  },

  // ── UAE VAT ─────────────────────────────────────────────────────────
  {
    id: 'AE-standard-5',
    country: 'AE',
    taxType: 'VAT',
    scheme: 'standard',
    rate: 5,
    label: 'Standard (5%)',
    exampleCategories: ['most goods and services'],
    effectiveFrom: '2018-01-01',
    source: 'https://tax.gov.ae/en/taxes/vat.aspx',
  },
];

export const TAX_RATE_DISCLAIMER =
  'Public statutory reference only. Rates rotate when budgets change — always confirm ' +
  'against the linked ``source`` URL before quoting figures to a user. This catalog ' +
  'contains no customer data.';
