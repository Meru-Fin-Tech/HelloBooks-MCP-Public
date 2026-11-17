/**
 * Accounting / tax glossary — public, original, plain-language definitions of
 * the terms a HelloBooks buyer or accountant actually asks about. Scoped to the
 * product's own domains (bookkeeping + the IN/UK/AU/US/CA compliance regimes it
 * serves) rather than generic finance, so answers stay on-brand and citable.
 *
 * Definitions are written from scratch and intentionally brief. `source` points
 * at the authority or a HelloBooks page for confirmation. No PII, no secrets.
 */

export type GlossaryCategory =
  | 'bookkeeping'
  | 'statements'
  | 'tax'
  | 'compliance'
  | 'payroll'
  | 'ar-ap';

export interface GlossaryTerm {
  id: string;
  term: string;
  aliases: string[];
  category: GlossaryCategory;
  definition: string;
  related: string[];
}

export const GLOSSARY: GlossaryTerm[] = [
  {
    id: 'double-entry', term: 'Double-entry bookkeeping', aliases: ['double entry'],
    category: 'bookkeeping',
    definition: 'A method where every transaction is recorded in at least two accounts — a debit in one and an equal credit in another — so the books always balance.',
    related: ['journal-entry', 'general-ledger', 'trial-balance'],
  },
  {
    id: 'journal-entry', term: 'Journal entry', aliases: ['journal', 'ledger entry'],
    category: 'bookkeeping',
    definition: 'A single dated record of a transaction showing the accounts debited and credited and the amounts, before it is posted to the ledger.',
    related: ['double-entry', 'general-ledger'],
  },
  {
    id: 'general-ledger', term: 'General ledger', aliases: ['ledger', 'gl'],
    category: 'bookkeeping',
    definition: 'The master record of all a business’s accounts and the transactions posted to them, from which the financial statements are produced.',
    related: ['chart-of-accounts', 'trial-balance'],
  },
  {
    id: 'chart-of-accounts', term: 'Chart of accounts', aliases: ['coa'],
    category: 'bookkeeping',
    definition: 'The organised list of every account a business uses to record transactions, grouped into assets, liabilities, equity, income and expenses.',
    related: ['general-ledger'],
  },
  {
    id: 'accrual-accounting', term: 'Accrual accounting', aliases: ['accruals', 'accrual basis'],
    category: 'bookkeeping',
    definition: 'Recording income and expenses when they are earned or incurred, not when cash changes hands — so the books reflect economic activity in the right period.',
    related: ['cash-accounting'],
  },
  {
    id: 'cash-accounting', term: 'Cash accounting', aliases: ['cash basis'],
    category: 'bookkeeping',
    definition: 'Recording income and expenses only when cash is actually received or paid. Simpler than accrual, but a less accurate picture of what is owed and due.',
    related: ['accrual-accounting'],
  },
  {
    id: 'reconciliation', term: 'Bank reconciliation', aliases: ['reconcile', 'bank rec'],
    category: 'bookkeeping',
    definition: 'Matching the transactions in your books against your bank statement so the two agree, catching missing, duplicated or miscategorised entries.',
    related: ['general-ledger'],
  },
  {
    id: 'depreciation', term: 'Depreciation', aliases: ['depreciate'],
    category: 'bookkeeping',
    definition: 'Spreading the cost of a long-lived asset across the years it is used, instead of expensing it all at once, to match cost with the benefit it provides.',
    related: ['balance-sheet'],
  },
  {
    id: 'trial-balance', term: 'Trial balance', aliases: ['tb'],
    category: 'statements',
    definition: 'A report listing every ledger account’s closing balance to check that total debits equal total credits before preparing the financial statements.',
    related: ['general-ledger', 'balance-sheet'],
  },
  {
    id: 'balance-sheet', term: 'Balance sheet', aliases: ['statement of financial position'],
    category: 'statements',
    definition: 'A snapshot at a point in time of what a business owns (assets), owes (liabilities) and the owners’ residual stake (equity). Assets = liabilities + equity.',
    related: ['profit-and-loss', 'trial-balance'],
  },
  {
    id: 'profit-and-loss', term: 'Profit and loss statement', aliases: ['p&l', 'pnl', 'income statement'],
    category: 'statements',
    definition: 'A report of income minus expenses over a period, showing whether the business made a profit or a loss. Also called the income statement.',
    related: ['balance-sheet'],
  },
  {
    id: 'working-capital', term: 'Working capital', aliases: [],
    category: 'statements',
    definition: 'Current assets minus current liabilities — the short-term money a business has available to fund day-to-day operations.',
    related: ['balance-sheet', 'accounts-receivable', 'accounts-payable'],
  },
  {
    id: 'accounts-receivable', term: 'Accounts receivable', aliases: ['ar', 'receivables', 'debtors'],
    category: 'ar-ap',
    definition: 'Money customers owe the business for goods or services already delivered but not yet paid for.',
    related: ['invoice', 'aging-report', 'accounts-payable'],
  },
  {
    id: 'accounts-payable', term: 'Accounts payable', aliases: ['ap', 'payables', 'creditors'],
    category: 'ar-ap',
    definition: 'Money the business owes its suppliers for goods or services it has received but not yet paid for.',
    related: ['accounts-receivable'],
  },
  {
    id: 'invoice', term: 'Invoice', aliases: ['bill', 'tax invoice'],
    category: 'ar-ap',
    definition: 'A document issued to a customer requesting payment, listing the goods/services, amounts, tax and due date.',
    related: ['credit-note', 'accounts-receivable'],
  },
  {
    id: 'credit-note', term: 'Credit note', aliases: ['credit memo'],
    category: 'ar-ap',
    definition: 'A document that reduces the amount a customer owes — issued for a return, overcharge or post-invoice discount.',
    related: ['invoice'],
  },
  {
    id: 'aging-report', term: 'Aging report', aliases: ['ageing report', 'ar aging'],
    category: 'ar-ap',
    definition: 'A report that groups unpaid invoices by how overdue they are (e.g. 0–30, 31–60, 61–90 days) to prioritise collections.',
    related: ['accounts-receivable'],
  },
  {
    id: 'fiscal-year', term: 'Fiscal year', aliases: ['financial year', 'fy', 'accounting period'],
    category: 'statements',
    definition: 'The 12-month period a business uses for accounting and tax. It varies by country (e.g. India runs Apr–Mar; the US commonly Jan–Dec).',
    related: [],
  },
  {
    id: 'gst', term: 'Goods and Services Tax (GST)', aliases: ['goods and services tax'],
    category: 'tax',
    definition: 'A broad consumption tax added to most goods and services, collected by businesses and remitted to the government. Used in India, Australia, Singapore, New Zealand and Canada, among others.',
    related: ['vat', 'input-tax-credit', 'gstr-3b'],
  },
  {
    id: 'vat', term: 'Value Added Tax (VAT)', aliases: ['value added tax'],
    category: 'tax',
    definition: 'A consumption tax charged at each stage of the supply chain on the value added, ultimately borne by the final consumer. The UK and EU use VAT; it is conceptually similar to GST.',
    related: ['gst', 'making-tax-digital'],
  },
  {
    id: 'input-tax-credit', term: 'Input tax credit (ITC)', aliases: ['itc', 'input credit', 'input vat'],
    category: 'tax',
    definition: 'The credit a business claims for GST/VAT it paid on purchases, offsetting it against the tax it collects on sales so tax is only paid on the value it adds.',
    related: ['gst', 'vat'],
  },
  {
    id: 'gstr-3b', term: 'GSTR-3B', aliases: ['gstr 3b', '3b return'],
    category: 'compliance',
    definition: 'A monthly (or quarterly) self-declared GST summary return in India reporting total sales, purchases, input tax credit and the net tax payable.',
    related: ['gstr-1', 'gst', 'input-tax-credit'],
  },
  {
    id: 'gstr-1', term: 'GSTR-1', aliases: ['gstr 1'],
    category: 'compliance',
    definition: 'An India GST return detailing all outward supplies (sales) for the period, filed monthly or quarterly depending on turnover.',
    related: ['gstr-3b', 'gst'],
  },
  {
    id: 'e-invoicing', term: 'E-invoicing', aliases: ['e invoice', 'irn', 'einvoice'],
    category: 'compliance',
    definition: 'Reporting B2B invoices to a government portal that validates each one and returns a unique Invoice Reference Number (IRN). Mandatory in India above a turnover threshold.',
    related: ['invoice', 'gst'],
  },
  {
    id: 'making-tax-digital', term: 'Making Tax Digital (MTD)', aliases: ['mtd'],
    category: 'compliance',
    definition: 'A UK programme requiring businesses to keep digital records and file VAT (and, increasingly, income tax) returns to HMRC through compatible software.',
    related: ['vat'],
  },
  {
    id: 'bas', term: 'Business Activity Statement (BAS)', aliases: ['activity statement'],
    category: 'compliance',
    definition: 'A form Australian businesses lodge (usually quarterly) to the ATO to report and pay GST, PAYG withholding and other tax obligations.',
    related: ['gst'],
  },
  {
    id: 'tds', term: 'Tax Deducted at Source (TDS)', aliases: ['withholding tax', 'tax deducted at source'],
    category: 'compliance',
    definition: 'Tax that the payer deducts from certain payments (salary, contractor fees, rent, interest) and remits to the government on the recipient’s behalf. Common in India.',
    related: ['payroll'],
  },
  {
    id: '1099', term: 'Form 1099', aliases: ['1099-nec', '1099-misc', '1099 nec'],
    category: 'compliance',
    definition: 'A set of US IRS forms reporting payments to non-employees and other income; 1099-NEC reports contractor compensation of $600 or more in a year.',
    related: ['w-2'],
  },
  {
    id: 'w-2', term: 'Form W-2', aliases: ['w2', 'wage statement'],
    category: 'payroll',
    definition: 'A US form an employer files annually reporting each employee’s wages and the taxes withheld from them.',
    related: ['1099', 'payroll'],
  },
  {
    id: 'payroll', term: 'Payroll', aliases: ['pay run'],
    category: 'payroll',
    definition: 'The process of calculating and paying employee wages, withholding taxes and statutory deductions, and filing the related returns.',
    related: ['w-2', 'tds'],
  },
  {
    id: 'multi-currency', term: 'Multi-currency accounting', aliases: ['multicurrency', 'foreign currency', 'fx'],
    category: 'bookkeeping',
    definition: 'Recording transactions in more than one currency and translating them to a base reporting currency, tracking the gains or losses when exchange rates move.',
    related: ['invoice'],
  },
];
