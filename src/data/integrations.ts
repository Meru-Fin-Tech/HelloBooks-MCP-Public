/**
 * Integration catalog — public-only metadata for partners that the marketing
 * site lists on /integration and category pages. No credentials, no per-customer
 * configuration — only "this category exists, here are the named partners".
 */

import type { CountryCode } from './plans.js';

export type IntegrationCategory =
  | 'banking'
  | 'payment'
  | 'payroll'
  | 'time-tracking'
  | 'shipping'
  | 'tax-compliance'
  | 'accounting-sync'
  | 'ecommerce'
  | 'crm';

export interface Integration {
  id: string;
  name: string;
  category: IntegrationCategory;
  description: string;
  countries: CountryCode[]; // empty = global
  status: 'live' | 'beta' | 'coming-soon';
  publicUrl?: string;
}

export const INTEGRATIONS: Integration[] = [
  // Banking
  { id: 'plaid', name: 'Plaid', category: 'banking',
    description: 'Bank feed aggregation across 12,000+ US/CA/GB institutions.',
    countries: ['US', 'CA', 'GB'], status: 'live',
    publicUrl: 'https://plaid.com' },
  { id: 'yodlee', name: 'Yodlee', category: 'banking',
    description: 'Multi-region bank feed coverage including AU, NZ, SG.',
    countries: ['AU', 'NZ', 'SG', 'IN'], status: 'live' },

  // Payments
  { id: 'stripe', name: 'Stripe', category: 'payment',
    description: 'Card payments and ACH for invoice collection.',
    countries: [], status: 'live',
    publicUrl: 'https://stripe.com' },
  { id: 'razorpay', name: 'Razorpay', category: 'payment',
    description: 'UPI, cards, and netbanking for India.',
    countries: ['IN'], status: 'live',
    publicUrl: 'https://razorpay.com' },
  { id: 'paypal', name: 'PayPal', category: 'payment',
    description: 'PayPal checkout link on invoices.',
    countries: [], status: 'live' },

  // Payroll
  { id: 'gusto', name: 'Gusto', category: 'payroll',
    description: 'US payroll posting back to journal entries.',
    countries: ['US'], status: 'coming-soon',
    publicUrl: 'https://hellobooks.ai/integration/gusto' },
  { id: 'hellotime-payroll', name: 'HelloTime Payroll', category: 'payroll',
    description: 'AU STP-compliant payroll with auto-superannuation and PAYG.',
    countries: ['AU'], status: 'live',
    publicUrl: 'https://hellotime.app' },

  // Time tracking
  { id: 'hellotime', name: 'HelloTime', category: 'time-tracking',
    description: 'Sister product for shifts, leave, and timesheets that feeds payroll.',
    countries: ['AU', 'IN', 'US'], status: 'live',
    publicUrl: 'https://hellotime.app' },

  // Shipping
  { id: 'shiprocket', name: 'Shiprocket', category: 'shipping',
    description: 'Multi-carrier shipping for delivery challans (IN).',
    countries: ['IN'], status: 'live',
    publicUrl: 'https://hellobooks.ai/integration/shipping' },

  // Tax / compliance
  { id: 'gstn-irp', name: 'GSTN IRP (e-invoicing)', category: 'tax-compliance',
    description: 'GST e-invoicing IRN + signed QR code generation.',
    countries: ['IN'], status: 'live' },
  { id: 'gstn-eway', name: 'GSTN E-Way Bill', category: 'tax-compliance',
    description: 'E-way bill generation and cancellation API.',
    countries: ['IN'], status: 'live' },
  { id: 'ato-stp', name: 'ATO Single Touch Payroll', category: 'tax-compliance',
    description: 'STP Phase 2 reporting to the Australian Taxation Office.',
    countries: ['AU'], status: 'live' },
  { id: 'ato-bas', name: 'ATO BAS Lodgement', category: 'tax-compliance',
    description: 'Pre-fill and lodge Business Activity Statements.',
    countries: ['AU'], status: 'live' },
  { id: 'hmrc-mtd', name: 'HMRC Making Tax Digital', category: 'tax-compliance',
    description: 'MTD VAT submission to HMRC.',
    countries: ['GB'], status: 'live' },

  // Accounting sync
  { id: 'quickbooks', name: 'QuickBooks Online', category: 'accounting-sync',
    description: 'Two-way sync of customers, vendors, invoices, bills, and journals.',
    countries: ['US', 'CA', 'GB', 'AU', 'IN'], status: 'live' },
  { id: 'xero', name: 'Xero', category: 'accounting-sync',
    description: 'Two-way sync with Xero ledgers.',
    countries: ['AU', 'GB', 'US', 'NZ'], status: 'live' },
  { id: 'tally', name: 'Tally', category: 'accounting-sync',
    description: 'Desktop bridge for Tally Prime data exchange.',
    countries: ['IN'], status: 'live' },
  { id: 'zoho-books', name: 'Zoho Books', category: 'accounting-sync',
    description: 'Read-only sync of Zoho ledgers.',
    countries: [], status: 'beta' },

  // Ecommerce
  { id: 'shopify', name: 'Shopify', category: 'ecommerce',
    description: 'Order, payout, and refund sync from Shopify stores.',
    countries: [], status: 'live' },
  { id: 'amazon-seller', name: 'Amazon Seller Central', category: 'ecommerce',
    description: 'Settlement and fee report ingestion.',
    countries: ['US', 'IN', 'GB', 'AU'], status: 'beta' },

  // CRM
  { id: 'hellogrowth', name: 'HelloGrowth CRM', category: 'crm',
    description: 'Native CRM with deals, contacts, and pipeline that links to invoices.',
    countries: [], status: 'live',
    publicUrl: 'https://hellobooks.ai/hellogrowth-crm' },
];
