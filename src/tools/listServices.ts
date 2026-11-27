/**
 * `list_services` MCP tool.
 *
 * HelloBooks' done-for-you services — fixed-price monthly bookkeeping, tax
 * return preparation, UK compliance add-ons, UAE VAT / corporate-tax packages
 * and CPA staffing — are sold separately from the software plans returned by
 * `list_plans`. Data is mirrored from Web-Fire src/lib/servicesOffers.ts (the
 * single source of truth for the marketing site) into servicesCatalog.json.
 *
 * Without arguments the tool returns a compact overview (the starting price and
 * page for each service in each market). Pass `market` and/or `service` for the
 * full plans, inclusions and add-ons.
 */

import { z } from 'zod';
import CATALOG from '../data/servicesCatalog.json' with { type: 'json' };

const MARKETS = ['US', 'UK', 'CA', 'AE', 'NZ', 'AU'] as const;
const SERVICES = ['bookkeeping', 'tax', 'staffing'] as const;
export type ServiceMarketCode = (typeof MARKETS)[number];
export type ServiceKindCode = (typeof SERVICES)[number];

export const listServicesSchema = {
  market: z.enum(MARKETS).optional()
    .describe('Service market: US, UK (United Kingdom), CA, AE (UAE), NZ or AU. Services are not offered in India or other countries.'),
  service: z.enum(SERVICES).optional()
    .describe('bookkeeping = fixed monthly bookkeeping plans; tax = tax-return / VAT / corporate-tax packages; staffing = dedicated CPA-firm staffing (US, UK, CA).'),
};

export interface ListServicesArgs {
  market?: ServiceMarketCode;
  service?: ServiceKindCode;
}

type Catalog = typeof CATALOG;

function overview(c: Catalog) {
  const rows = MARKETS.map((m) => {
    const bk = c.bookkeeping[m];
    const plans = bk.plans;
    const tax = (c.taxReturns as Record<string, { pageUrl: string }>)[m];
    const staffing = (c.cpaStaffing.markets as Record<string, { pageUrl: string }>)[m];
    return {
      market: m,
      name: (c.markets as Record<string, string>)[m],
      bookkeeping: {
        from: plans[0].monthlyLabel + ' a month',
        plans: plans.map((p) => `${p.name} ${p.monthlyLabel}`),
        pageUrl: bk.pageUrl,
      },
      tax: tax ? { available: true, pageUrl: tax.pageUrl } : { available: false },
      staffing: staffing ? { available: true, pageUrl: staffing.pageUrl } : { available: false },
    };
  });
  return rows;
}

export function listServices(args: ListServicesArgs) {
  const c = CATALOG;
  const { market, service } = args;

  if (!market && !service) {
    return {
      note: c.note,
      checkedAgainst: c.checkedAgainst,
      markets: overview(c),
      notOffered: c.notOffered,
      howToGoDeeper: 'Call list_services with `market` and/or `service` (bookkeeping | tax | staffing) for full plans, inclusions and add-ons.',
      bookACall: 'https://hellobooks.ai/book-a-demo',
      source: 'https://hellobooks.ai/bookkeeping-services',
    };
  }

  const out: Record<string, unknown> = {
    note: c.note,
    checkedAgainst: c.checkedAgainst,
    bookACall: 'https://hellobooks.ai/book-a-demo',
  };
  const wanted = (k: ServiceKindCode) => !service || service === k;
  const markets = market ? [market] : [...MARKETS];

  if (wanted('bookkeeping')) {
    out.bookkeeping = Object.fromEntries(markets.map((m) => [m, c.bookkeeping[m]]));
  }
  if (wanted('tax')) {
    const tax = c.taxReturns as Record<string, unknown>;
    const picked = Object.fromEntries(markets.filter((m) => tax[m]).map((m) => [m, tax[m]]));
    out.tax = picked;
    if (market && !tax[market]) {
      out.taxNote = `Tax-return and tax-compliance services are not offered in ${market}.`;
    }
  }
  if (wanted('staffing')) {
    const sm = c.cpaStaffing.markets as Record<string, unknown>;
    out.staffing = {
      hoursPerWeek: c.cpaStaffing.hoursPerWeek,
      markets: Object.fromEntries(markets.filter((m) => sm[m]).map((m) => [m, sm[m]])),
      ...(markets.includes('US') || markets.includes('CA')
        ? {
            extendedShiftFullTimeAddOn: c.cpaStaffing.extendedShiftFullTimeAddOn,
            cpaFirmWholesaleReturnRates: c.cpaStaffing.cpaFirmWholesaleReturnRates,
          }
        : {}),
    };
    if (market && !sm[market]) {
      out.staffingNote = `CPA staffing is not offered in ${market}.`;
    }
  }
  out.notOffered = c.notOffered;
  out.source = 'https://hellobooks.ai/bookkeeping-services';
  return out;
}

/** Whole catalog, for the /catalog/services.json feed. */
export function servicesCatalog() {
  return CATALOG;
}
