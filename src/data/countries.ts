/**
 * Per-country feature + compliance support matrix.
 *
 * Public-only — describes what HelloBooks ships in each market. No customer
 * data, no usage stats. Sourced from marketing pages /au, /in/gst, /uk-vat,
 * and /us pricing pages.
 */

import type { CountryCode } from './plans.js';

export interface CountryFeature {
  key: string;
  label: string;
  description: string;
}

export interface ComplianceFramework {
  key: string;
  label: string;
  authority: string;
  version?: string;
  status: 'live' | 'beta' | 'coming-soon';
  certInfo?: string;
}

export interface CountrySupport {
  country: CountryCode;
  countryName: string;
  defaultCurrency: string;
  features: CountryFeature[];
  compliance: ComplianceFramework[];
  marketingUrl: string;
}

export const COUNTRY_SUPPORT: CountrySupport[] = [
  {
    country: 'AU',
    countryName: 'Australia',
    defaultCurrency: 'AUD',
    marketingUrl: 'https://hellobooks.ai/au',
    features: [
      { key: 'bas-prefill', label: 'BAS pre-fill',
        description: 'Auto-populate G1, 1A, 1B, W1, W2 from ledger.' },
      { key: 'stp-phase2', label: 'STP Phase 2 payroll',
        description: 'Single Touch Payroll with disaggregated income types.' },
      { key: 'super-stream', label: 'SuperStream',
        description: 'Superannuation contributions to clearing house.' },
      { key: 'fbt-tracking', label: 'FBT tracking',
        description: 'Fringe Benefits Tax category tagging on transactions.' },
      { key: 'abn-lookup', label: 'ABN lookup',
        description: 'Live ABN registry validation when adding suppliers.' },
      { key: 'gst-tax-codes', label: 'GST tax codes',
        description: 'GST Free, Input Taxed, GST on Capital, Export.' },
    ],
    compliance: [
      { key: 'bas', label: 'Business Activity Statement', authority: 'ATO',
        version: 'GST Act 1999', status: 'live',
        certInfo: 'BAS Agent partner program' },
      { key: 'stp2', label: 'Single Touch Payroll Phase 2', authority: 'ATO',
        version: 'STP2', status: 'live' },
      { key: 'tpar', label: 'Taxable Payments Annual Report', authority: 'ATO',
        status: 'live' },
    ],
  },
  {
    country: 'IN',
    countryName: 'India',
    defaultCurrency: 'INR',
    marketingUrl: 'https://hellobooks.ai/in/gst',
    features: [
      { key: 'gst-einvoice', label: 'GST e-invoicing',
        description: 'IRN generation with signed QR code via GSTN IRP.' },
      { key: 'eway-bill', label: 'E-way bill',
        description: 'Generate, update, cancel e-way bills.' },
      { key: 'gstr-1', label: 'GSTR-1',
        description: 'Outward supply return preparation and JSON export.' },
      { key: 'gstr-3b', label: 'GSTR-3B',
        description: 'Summary return computation from ledger.' },
      { key: 'tds-tcs', label: 'TDS / TCS',
        description: 'Income-tax TDS and GST TCS handling.' },
      { key: 'hsn-sac', label: 'HSN / SAC codes',
        description: 'HSN/SAC catalog and GST rate auto-mapping.' },
      { key: 'reverse-charge', label: 'Reverse charge mechanism',
        description: 'RCM tagging on bills and journal entries.' },
    ],
    compliance: [
      { key: 'gst-act', label: 'GST Act 2017', authority: 'GSTN / CBIC',
        version: 'CGST/SGST/IGST', status: 'live' },
      { key: 'einvoice-irp', label: 'E-Invoice IRP', authority: 'GSTN',
        version: 'Schema v1.1', status: 'live' },
      { key: 'eway-bill-act', label: 'E-Way Bill', authority: 'GSTN',
        status: 'live' },
      { key: 'income-tax-act', label: 'Income Tax Act 1961', authority: 'CBDT',
        status: 'live' },
    ],
  },
  {
    country: 'GB',
    countryName: 'United Kingdom',
    defaultCurrency: 'GBP',
    marketingUrl: 'https://hellobooks.ai/uk',
    features: [
      { key: 'mtd-vat', label: 'Making Tax Digital VAT',
        description: 'MTD-compliant digital VAT submission to HMRC.' },
      { key: 'cis', label: 'CIS deductions',
        description: 'Construction Industry Scheme deduction tracking.' },
      { key: 'rti-payroll', label: 'RTI payroll',
        description: 'Real Time Information PAYE submissions.' },
      { key: 'reverse-charge-vat', label: 'Reverse charge VAT',
        description: 'Domestic reverse charge for construction.' },
    ],
    compliance: [
      { key: 'mtd', label: 'Making Tax Digital for VAT', authority: 'HMRC',
        version: 'MTD v2', status: 'live',
        certInfo: 'Recognised by HMRC (sandbox + production)' },
      { key: 'rti', label: 'PAYE Real Time Information', authority: 'HMRC',
        status: 'beta' },
    ],
  },
  {
    country: 'US',
    countryName: 'United States',
    defaultCurrency: 'USD',
    marketingUrl: 'https://hellobooks.ai/us',
    features: [
      { key: 'form-1099', label: '1099 generation',
        description: '1099-NEC and 1099-MISC vendor reporting.' },
      { key: 'sales-tax', label: 'Sales tax tracking',
        description: 'Multi-state sales tax with nexus configuration.' },
      { key: 'w9-collection', label: 'W-9 collection',
        description: 'Vendor TIN collection workflow.' },
      { key: 'plaid-bank-feed', label: 'Plaid bank feeds',
        description: 'Bank, credit card, and loan account feeds via Plaid.' },
    ],
    compliance: [
      { key: '1099', label: '1099 reporting', authority: 'IRS',
        status: 'live' },
      { key: 'sales-tax-multistate', label: 'Multi-state sales tax',
        authority: 'State revenue authorities', status: 'live' },
    ],
  },
  {
    country: 'CA',
    countryName: 'Canada',
    defaultCurrency: 'CAD',
    marketingUrl: 'https://hellobooks.ai/ca',
    features: [
      { key: 'gst-hst', label: 'GST / HST',
        description: 'Federal and harmonized sales tax tracking.' },
      { key: 'pst-qst', label: 'PST / QST',
        description: 'Provincial and Quebec sales tax.' },
    ],
    compliance: [
      { key: 'cra-gst', label: 'GST/HST Return', authority: 'CRA',
        status: 'live' },
    ],
  },
  {
    country: 'AE',
    countryName: 'United Arab Emirates',
    defaultCurrency: 'AED',
    marketingUrl: 'https://hellobooks.ai/ae',
    features: [
      { key: 'vat-uae', label: 'UAE VAT',
        description: '5% VAT tracking with FTA-compliant tax invoices.' },
      { key: 'corp-tax-uae', label: 'UAE Corporate Tax',
        description: '9% corporate tax computation support.' },
    ],
    compliance: [
      { key: 'fta-vat', label: 'FTA VAT', authority: 'Federal Tax Authority',
        status: 'live' },
    ],
  },
  {
    country: 'SG',
    countryName: 'Singapore',
    defaultCurrency: 'SGD',
    marketingUrl: 'https://hellobooks.ai/sg',
    features: [
      { key: 'gst-sg', label: 'Singapore GST',
        description: 'GST tracking with IRAS-compliant invoicing.' },
      { key: 'cpf', label: 'CPF contributions',
        description: 'Central Provident Fund contribution tracking.' },
    ],
    compliance: [
      { key: 'iras-gst', label: 'IRAS GST F5', authority: 'IRAS',
        status: 'live' },
    ],
  },
  {
    country: 'NZ',
    countryName: 'New Zealand',
    defaultCurrency: 'NZD',
    marketingUrl: 'https://hellobooks.ai/nz',
    features: [
      { key: 'gst-nz', label: 'NZ GST',
        description: '15% GST tracking and return preparation.' },
    ],
    compliance: [
      { key: 'ird-gst', label: 'IRD GST101A', authority: 'Inland Revenue',
        status: 'live' },
    ],
  },
];
