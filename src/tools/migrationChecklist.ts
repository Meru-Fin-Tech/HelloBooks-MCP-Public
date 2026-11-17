/**
 * `migration_checklist` — a phased, dated plan for moving to HelloBooks.
 *
 * Complements `estimate_migration_effort` (which quotes hours/price from an
 * uploaded CSV): this tool answers "how do I actually migrate from
 * QuickBooks/Xero/Tally?" with an ordered, best-practice checklist whose phase
 * durations scale with complexity, plus the country-specific tax-setup step.
 * Read-only, public guidance — not a binding project plan.
 */
import { z } from 'zod';
import { SUPPORTED_COUNTRY_CODES, type SupportedCountryCode } from '../data/supportedCountries.js';

const SOURCES = ['quickbooks', 'xero', 'tally', 'zoho-books', 'wave', 'sage', 'excel', 'other'] as const;
type Source = (typeof SOURCES)[number];

const SOURCE_LABEL: Record<Source, string> = {
  quickbooks: 'QuickBooks', xero: 'Xero', tally: 'Tally', 'zoho-books': 'Zoho Books',
  wave: 'Wave', sage: 'Sage', excel: 'spreadsheets', other: 'your current software',
};

export const migrationChecklistSchema = {
  from: z.enum(SOURCES).describe('The software being migrated from.'),
  country: z.enum(SUPPORTED_COUNTRY_CODES).optional().describe('ISO country code, for the tax-setup step.'),
  complexity: z.enum(['low', 'medium', 'high']).optional().describe('Scales phase durations. Default medium.'),
  includeHistory: z.boolean().optional().describe('Whether to migrate full transaction history (vs opening balances only). Default false.'),
};

export interface MigrationChecklistArgs {
  from: Source;
  country?: SupportedCountryCode;
  complexity?: 'low' | 'medium' | 'high';
  includeHistory?: boolean;
}

export interface MigrationPhase {
  n: number;
  title: string;
  durationDays: [number, number];
  steps: string[];
  note?: string;
}

export interface MigrationChecklistResult {
  from: Source;
  fromLabel: string;
  country: SupportedCountryCode | 'unspecified';
  complexity: 'low' | 'medium' | 'high';
  includeHistory: boolean;
  phases: MigrationPhase[];
  estimatedTimelineDays: [number, number];
  taxSetupNote: string;
  assistedNote: string;
  disclaimer: string;
}

const MULT: Record<'low' | 'medium' | 'high', number> = { low: 1, medium: 1.5, high: 2.5 };

/** Country-specific tax-setup guidance (generic where not separately curated). */
function taxNote(country?: SupportedCountryCode): string {
  switch (country) {
    case 'IN':
      return 'India: add your GSTIN, set the GST scheme (regular/composition), map HSN/SAC codes, and enable e-invoicing if your turnover is above the IRP threshold.';
    case 'GB':
      return 'UK: register the VAT number, pick the VAT scheme, and connect Making Tax Digital (MTD) for VAT filing.';
    case 'AU':
      return 'Australia: set the GST registration and BAS cadence, and configure PAYG withholding if you run payroll.';
    case 'US':
      return 'US: configure state sales-tax nexus/rates and, if you pay contractors, 1099 settings.';
    case 'CA':
      return 'Canada: set GST/HST (and QST for Quebec) registration and the filing frequency.';
    default:
      return 'Set your tax registration (GST/VAT/sales tax), scheme and filing cadence for your country before importing balances.';
  }
}

function scale(base: [number, number], m: number): [number, number] {
  return [Math.max(1, Math.round(base[0] * m)), Math.max(1, Math.round(base[1] * m))];
}

export function migrationChecklist(args: MigrationChecklistArgs): MigrationChecklistResult {
  const complexity = args.complexity ?? 'medium';
  const m = MULT[complexity];
  const includeHistory = args.includeHistory ?? false;
  const label = SOURCE_LABEL[args.from];

  const phases: MigrationPhase[] = [
    {
      n: 1, title: 'Plan & choose a cutover date', durationDays: scale([1, 2], m),
      steps: [
        'Pick a cutover date at the start of a month or fiscal period — cleaner opening balances.',
        'Decide scope: chart of accounts, opening balances, customers, suppliers, items, open invoices/bills, and how much transaction history.',
        'Nominate an owner and tell the team the freeze date for the old system.',
      ],
    },
    {
      n: 2, title: `Export from ${label}`, durationDays: scale([1, 1], m),
      steps: [
        `Export the chart of accounts, customer and supplier lists, and item/product list from ${label}.`,
        'Export the trial balance / opening balances as of the cutover date.',
        'Export open accounts-receivable and accounts-payable (unpaid invoices and bills).',
        includeHistory ? 'Export the journal/transaction history for the period you want to carry over.' : 'Keep the old system read-only for historical lookups instead of importing full history.',
      ],
    },
    {
      n: 3, title: 'Clean & map the data', durationDays: scale([1, 3], m),
      steps: [
        'De-duplicate accounts, customers and suppliers; fix inconsistent names, dates and encodings.',
        'Map your old chart of accounts to the HelloBooks chart of accounts.',
        `Reconcile the ${label} trial balance so debits equal credits before import.`,
      ],
      note: complexity === 'high' ? 'High complexity: budget extra time here — this is where most migrations slip.' : undefined,
    },
    {
      n: 4, title: 'Set up HelloBooks', durationDays: scale([1, 1], m),
      steps: [
        'Create the company/entity and set the fiscal year and base currency.',
        taxNote(args.country),
        'Create the chart of accounts and add users with the right roles.',
      ],
    },
    {
      n: 5, title: 'Import into HelloBooks', durationDays: scale([1, 2], m),
      steps: [
        'Import customers, suppliers and items first.',
        'Import opening balances / the trial balance as of the cutover date.',
        'Import open invoices and bills so AR/AP aging is correct.',
        includeHistory ? 'Import the historical transactions you chose to carry over.' : 'Skip history import — rely on the read-only old system for past detail.',
      ],
      note: 'HelloBooks offers an assisted (done-for-you) migration that pre-populates this from your exports.',
    },
    {
      n: 6, title: 'Reconcile & verify', durationDays: scale([1, 2], m),
      steps: [
        `Confirm the HelloBooks opening trial balance matches the ${label} trial balance exactly.`,
        'Tie out bank and credit-card balances to statements as of the cutover date.',
        'Check that AR and AP aging totals match the old system.',
      ],
    },
    {
      n: 7, title: 'Parallel run & cutover', durationDays: scale([3, 7], m),
      steps: [
        'Run both systems briefly, or spot-check the first weeks of entries in HelloBooks.',
        'Once numbers agree, stop entering new transactions in the old system — HelloBooks is now the system of record.',
        'Keep the old system archived (read-only) for the statutory retention period.',
      ],
    },
  ];

  const estimatedTimelineDays: [number, number] = [
    phases.reduce((s, p) => s + p.durationDays[0], 0),
    phases.reduce((s, p) => s + p.durationDays[1], 0),
  ];

  return {
    from: args.from,
    fromLabel: label,
    country: args.country ?? 'unspecified',
    complexity,
    includeHistory,
    phases,
    estimatedTimelineDays,
    taxSetupNote: taxNote(args.country),
    assistedNote:
      'For a data-driven hours/price estimate, paste a journal-entry CSV export into estimate_migration_effort. HelloBooks also offers a done-for-you assisted migration.',
    disclaimer:
      'Best-practice guidance, not a binding plan. Durations are rough ranges that scale with complexity; your mileage varies with data volume and cleanliness.',
  };
}
