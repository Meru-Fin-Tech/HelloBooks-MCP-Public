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
 *   - AU GST: ato.gov.au/businesses-and-organisations/gst-excise-and-indirect-taxes/gst
 *   - US sales tax: streamlined state-by-state summary (avalara public refs)
 *   - CA GST/HST: canada.ca/en/revenue-agency/services/forms-publications/publications/rc4022
 */

import type { CountryCode } from './plans.js';

// NOTE: 'cess' is currently RESERVED — no TAX_RATES row uses it (the old IN
// compensation-cess rows were folded into the GST 2.0 40% demerit slab). Keep it
// in the union: it is still a valid value for the listTaxRates scheme filter and
// the agent-facing tool enum, so removing it would be a breaking API change.
//
// 'input-taxed' is the Australian GST third category (taxable / GST-free /
// input-taxed). It is statutorily distinct from 'exempt': no GST is charged AND
// no input-tax credit can be claimed. Kept as its own scheme rather than folded
// into 'exempt' so the AU financial-supplies / residential-rent treatment reads
// truthfully. See https://www.ato.gov.au/businesses-and-organisations/gst-excise-and-indirect-taxes/gst/when-to-charge-gst-and-when-not-to/input-taxed-sales
export type RateScheme =
  | 'standard'
  | 'reduced'
  | 'zero'
  | 'exempt'
  | 'input-taxed'
  | 'composition'
  | 'cess'
  | 'state-summary';

export interface TaxRate {
  /** Stable id — `<country>-<scheme>-<slab>`, e.g. `IN-standard-18`. */
  id: string;
  country: CountryCode;
  /**
   * Statutory tax type — GST, VAT, ST, HST, etc.
   *
   * DESIGN NOTE (Canada provincial taxes): we name the actual statutory
   * instrument rather than lumping everything under 'Sales-Tax'. The catalog
   * already distinguishes GST / HST / CGST-SGST / IGST — all technically
   * value-added or sales-type taxes — by their real-world name, so BC/SK/MB
   * provincial sales tax gets its own 'PST' member and Québec's tax gets 'QST'.
   * QST especially deserves the split: it is a distinct VAT-style tax
   * administered by Revenu Québec (not CRA), and the Accounting backend's
   * "Canada GST/HST Return (GST34)" computes a separate QST block for QC
   * entities — folding it into 'Sales-Tax' would erase that reality.
   * Manitoba's tax is legally "RST" (Retail Sales Tax) but is functionally a
   * PST, so it carries taxType 'PST' with the label disambiguating it as RST.
   */
  taxType: 'GST' | 'IGST' | 'CGST-SGST' | 'VAT' | 'Sales-Tax' | 'HST' | 'PST' | 'QST' | 'TDS' | 'TCS';
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
    exampleCategories: ['most services', 'IT services', 'small cars', 'appliances', 'electronics', 'office supplies'],
    notes: 'One of the two principal GST 2.0 slabs (5% and 18%) from 22 Sep 2025 (56th GST Council). Default for most goods and services. RCM applies for specified imports of services from unregistered suppliers.',
    effectiveFrom: '2017-07-01',
    source: 'https://cbic-gst.gov.in/gst-goods-services-rates.html',
  },
  {
    id: 'IN-standard-12',
    country: 'IN',
    taxType: 'GST',
    scheme: 'standard',
    rate: 12,
    label: 'Standard (12%) — superseded by GST 2.0',
    exampleCategories: ['packaged food', 'mobile phones', 'business class air travel'],
    notes: 'ABOLISHED under GST 2.0 (56th GST Council), effective 22 Sep 2025 — the 12% slab was removed and items moved to 5% or 18%. Retained here for historical / pre-2.0 invoices only.',
    effectiveFrom: '2017-07-01',
    effectiveTo: '2025-09-21',
    source: 'https://cbic-gst.gov.in/gst-goods-services-rates.html',
  },
  {
    id: 'IN-reduced-5',
    country: 'IN',
    taxType: 'GST',
    scheme: 'reduced',
    rate: 5,
    label: 'Merit (5%)',
    exampleCategories: ['daily essentials', 'packaged food', 'transport of goods', 'most medicines'],
    notes: 'One of the two principal GST 2.0 slabs (5% and 18%) from 22 Sep 2025 (56th GST Council). Many former 12% items moved here; several essentials (e.g. dairy, key medicines, individual health/life insurance) moved to nil/exempt.',
    effectiveFrom: '2017-07-01',
    source: 'https://cbic-gst.gov.in/gst-goods-services-rates.html',
  },
  {
    id: 'IN-standard-28',
    country: 'IN',
    taxType: 'GST',
    scheme: 'standard',
    rate: 28,
    label: 'Standard (28%) — superseded by GST 2.0',
    exampleCategories: ['luxury goods', 'tobacco', 'automobiles', 'aerated drinks'],
    notes: 'ABOLISHED under GST 2.0 (56th GST Council), effective 22 Sep 2025. Former 28% items moved to 18% (most appliances, small cars) or to the new 40% demerit slab (sin / luxury goods). Retained for historical / pre-2.0 invoices only.',
    effectiveFrom: '2017-07-01',
    effectiveTo: '2025-09-21',
    source: 'https://cbic-gst.gov.in/gst-goods-services-rates.html',
  },
  {
    id: 'IN-demerit-40',
    country: 'IN',
    taxType: 'GST',
    scheme: 'standard',
    rate: 40,
    label: 'Demerit / sin & luxury (40%)',
    exampleCategories: ['pan masala', 'tobacco products', 'aerated & caffeinated drinks', 'luxury vehicles'],
    notes: 'New special de-merit slab introduced by GST 2.0 (56th GST Council), effective 22 Sep 2025 — replaces the old 28% + compensation-cess stack on sin and luxury goods.',
    effectiveFrom: '2025-09-22',
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
    source: 'https://www.ato.gov.au/businesses-and-organisations/gst-excise-and-indirect-taxes/gst',
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
    source: 'https://www.ato.gov.au/businesses-and-organisations/gst-excise-and-indirect-taxes/gst',
  },
  {
    id: 'AU-input-taxed-0',
    country: 'AU',
    taxType: 'GST',
    scheme: 'input-taxed',
    rate: 0,
    label: 'Input-taxed',
    exampleCategories: [
      'financial supplies',
      'lending money / provision of credit for a fee',
      'residential rent',
      'sale of existing residential premises',
    ],
    notes:
      'Third Australian GST category (distinct from GST-free): no GST is charged on the sale, ' +
      'AND the supplier cannot claim GST credits on related purchases. Most common cases are ' +
      'financial supplies and renting/selling residential premises. Note: LCT (Luxury Car Tax, ' +
      '33% above the LCT threshold) and WET (Wine Equalisation Tax, 29% wholesale) are separate ' +
      'Commonwealth taxes, not GST slabs, so they are intentionally not modelled here.',
    effectiveFrom: '2000-07-01',
    source: 'https://www.ato.gov.au/businesses-and-organisations/gst-excise-and-indirect-taxes/gst/when-to-charge-gst-and-when-not-to/input-taxed-sales',
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
    exampleCategories: ['NB, NL, PE'],
    notes: 'New Brunswick, Newfoundland &amp; Labrador, Prince Edward Island. Nova Scotia left this group on 2025-04-01 when it dropped to 14% — see CA-hst-14-ns.',
    effectiveFrom: '2016-07-01',
    source: 'https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses.html',
  },
  {
    id: 'CA-hst-14-ns',
    country: 'CA',
    taxType: 'HST',
    scheme: 'standard',
    rate: 14,
    label: 'HST – Nova Scotia (14%)',
    exampleCategories: ['goods and services taxable under HST in Nova Scotia'],
    notes: 'Nova Scotia cut its HST from 15% to 14% (provincial part 10%→9%, federal GST 5% unchanged) effective 2025-04-01 — the first Canadian HST rate change since 2016.',
    effectiveFrom: '2025-04-01',
    source: 'https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses.html',
  },
  // Provincial sales taxes in the non-HST provinces — these stack ON TOP of
  // the federal GST 5% (CA-gst-5), they do not replace it. See DESIGN NOTE on
  // the taxType union for why PST/QST are their own statutory types.
  {
    id: 'CA-pst-7-bc',
    country: 'CA',
    taxType: 'PST',
    scheme: 'standard',
    rate: 7,
    label: 'PST – British Columbia (7%)',
    exampleCategories: ['most goods', 'software', 'legal services', 'telecommunications'],
    notes: 'BC Provincial Sales Tax, levied on top of the federal GST 5% (combined 12%). Administered by the BC Ministry of Finance, not CRA. Some services and most food are exempt.',
    effectiveFrom: '2013-04-01',
    source: 'https://www2.gov.bc.ca/gov/content/taxes/sales-taxes/pst',
  },
  {
    id: 'CA-pst-6-sk',
    country: 'CA',
    taxType: 'PST',
    scheme: 'standard',
    rate: 6,
    label: 'PST – Saskatchewan (6%)',
    exampleCategories: ['most goods', 'services', 'construction contracts'],
    notes: 'Saskatchewan Provincial Sales Tax, levied on top of the federal GST 5% (combined 11%). Raised from 5% to 6% effective 2017-03-23. Administered by the Saskatchewan Ministry of Finance.',
    effectiveFrom: '2017-03-23',
    source: 'https://www.saskatchewan.ca/business/taxes-licensing/provincial-taxes-policies-and-bulletins/provincial-sales-tax',
  },
  {
    id: 'CA-pst-7-mb',
    country: 'CA',
    taxType: 'PST',
    scheme: 'standard',
    rate: 7,
    label: 'RST – Manitoba (7%)',
    exampleCategories: ['most goods', 'certain services', 'insurance premiums'],
    notes: 'Manitoba Retail Sales Tax (RST) — legally named RST but functionally a PST, hence taxType PST. Levied on top of the federal GST 5% (combined 12%). Reduced from 8% to 7% effective 2019-07-01. Administered by Manitoba Finance.',
    effectiveFrom: '2019-07-01',
    source: 'https://www.gov.mb.ca/finance/taxation/taxes/retail.html',
  },
  {
    id: 'CA-qst-9975-qc',
    country: 'CA',
    taxType: 'QST',
    scheme: 'standard',
    rate: 9.975,
    label: 'QST – Québec (9.975%)',
    exampleCategories: ['most goods and services'],
    notes: 'Québec Sales Tax (QST / TVQ) — a VAT-style tax administered by Revenu Québec (not CRA), levied on top of the federal GST 5% (combined 14.975%). Rate has been 9.975% since 2013-01-01, when it was de-coupled from the GST-inclusive base. Aligns with the QST block computed by the Accounting "Canada GST/HST Return (GST34)" flow for QC entities.',
    effectiveFrom: '2013-01-01',
    source: 'https://www.revenuquebec.ca/en/businesses/consumption-taxes/gsthst-and-qst/basic-rules-for-applying-the-gsthst-and-qst/',
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
    notes: 'Stepped up from 8% on 2024-01-01 (the second of two increases; 7%→8% on 2023-01-01). See SG-standard-8 for the superseded 8% slab.',
    effectiveFrom: '2024-01-01',
    source: 'https://www.iras.gov.sg/taxes/goods-services-tax-(gst)/basics-of-gst/current-gst-rates',
  },
  {
    id: 'SG-standard-8',
    country: 'SG',
    taxType: 'GST',
    scheme: 'standard',
    rate: 8,
    label: 'Standard (8%) — superseded by 9%',
    exampleCategories: ['most goods and services'],
    notes: 'The interim 8% rate that applied for calendar year 2023 (raised from 7% on 2023-01-01, then to 9% on 2024-01-01). Retained for historical / 2023-dated invoices only.',
    effectiveFrom: '2023-01-01',
    effectiveTo: '2023-12-31',
    source: 'https://www.iras.gov.sg/taxes/goods-services-tax-(gst)/basics-of-gst/current-gst-rates',
  },
  {
    id: 'SG-zero-0',
    country: 'SG',
    taxType: 'GST',
    scheme: 'zero',
    rate: 0,
    label: 'Zero-rated',
    exampleCategories: ['export of goods', 'international services'],
    notes: 'Zero-rated supplies carry 0% GST but the supplier can still claim input tax. Distinct from exempt supplies.',
    effectiveFrom: '1994-04-01',
    source: 'https://www.iras.gov.sg/taxes/goods-services-tax-(gst)/charging-gst-(output-tax)/when-to-charge-0-gst-(zero-rate)',
  },
  {
    id: 'SG-exempt-0',
    country: 'SG',
    taxType: 'GST',
    scheme: 'exempt',
    rate: 0,
    label: 'Exempt',
    exampleCategories: [
      'most financial services',
      'sale and lease of residential property',
      'supply of digital payment tokens',
      'investment precious metals',
    ],
    notes: 'Fourth Schedule to the GST Act. No GST is charged and input tax is generally not claimable. Digital payment tokens have been exempt since 2020-01-01.',
    effectiveFrom: '1994-04-01',
    source: 'https://www.iras.gov.sg/taxes/goods-services-tax-(gst)/charging-gst-(output-tax)/when-is-gst-not-charged/supplies-exempt-from-gst',
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
  {
    id: 'NZ-zero-0',
    country: 'NZ',
    taxType: 'GST',
    scheme: 'zero',
    rate: 0,
    label: 'Zero-rated',
    exampleCategories: [
      'exported goods',
      'services supplied to non-residents (remote services)',
      'sale of a going concern',
      'land transactions between GST-registered persons',
    ],
    notes: 'Zero-rated (0%) supplies still allow the supplier to claim input tax. Distinct from exempt supplies.',
    effectiveFrom: '1986-10-01',
    source: 'https://www.ird.govt.nz/gst/charging-gst/zero-rated-supplies',
  },
  {
    id: 'NZ-exempt-0',
    country: 'NZ',
    taxType: 'GST',
    scheme: 'exempt',
    rate: 0,
    label: 'Exempt',
    exampleCategories: [
      'rental of residential dwellings',
      'most financial services',
      'sale of donated goods by non-profit bodies',
    ],
    notes: 'Exempt supplies carry no GST and the supplier cannot claim input tax. Financial services can instead be zero-rated when supplied to a GST-registered person making 75%+ taxable supplies.',
    effectiveFrom: '1986-10-01',
    source: 'https://www.ird.govt.nz/gst/charging-gst/exempt-supplies',
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
  {
    id: 'AE-zero-0',
    country: 'AE',
    taxType: 'VAT',
    scheme: 'zero',
    rate: 0,
    label: 'Zero-rated',
    exampleCategories: [
      'exports outside the GCC',
      'international transport',
      'certain healthcare services',
      'certain education services',
      'first supply of residential buildings (within 3 years of completion)',
      'investment-grade precious metals',
    ],
    notes: 'Zero-rated (0%) supplies still allow the taxable person to recover input VAT. Distinct from exempt supplies.',
    effectiveFrom: '2018-01-01',
    source: 'https://tax.gov.ae/en/taxes/vat.aspx',
  },
  {
    id: 'AE-exempt-0',
    country: 'AE',
    taxType: 'VAT',
    scheme: 'exempt',
    rate: 0,
    label: 'Exempt',
    exampleCategories: [
      'certain financial services (margin-based)',
      'residential buildings (supplies other than the zero-rated first supply)',
      'bare land',
      'local passenger transport',
    ],
    notes: 'Exempt supplies carry no VAT and input VAT is generally not recoverable. Fee-based financial services are standard-rated; margin-based financial services are exempt.',
    effectiveFrom: '2018-01-01',
    source: 'https://tax.gov.ae/en/taxes/vat.aspx',
  },
];

export const TAX_RATE_DISCLAIMER =
  'Public statutory reference only. Rates rotate when budgets change — always confirm ' +
  'against the linked ``source`` URL before quoting figures to a user. This catalog ' +
  'contains no customer data.';
