import { z } from 'zod';
import {
  PAYMENT_METHODS,
  HELLOBOOKS_USE_CASES,
} from '../data/paymentMethods.js';
import type {
  PaymentMethod,
  PaymentRail,
  PaymentUseCase,
} from '../data/paymentMethods.js';
import type { CountryCode } from '../data/plans.js';

const COUNTRIES: CountryCode[] = ['IN', 'US', 'CA', 'GB', 'AU', 'AE', 'SG', 'NZ'];
const RAILS: PaymentRail[] = ['instant', 'same-day', 'next-day', 'multi-day'];

// HelloBooks is an accounting / AR–AP product, so the tool surfaces invoice-
// collection, B2B supplier and contractor-payout rails by default. Payroll-
// only and pure-P2P entries are dropped unless the caller asks for them
// explicitly via the `useCase` filter.
const TOOL_USE_CASES: PaymentUseCase[] = HELLOBOOKS_USE_CASES;

export const localPaymentMethodsSchema = {
  country: z.enum(COUNTRIES as [CountryCode, ...CountryCode[]]).optional()
    .describe('Filter to one country (IN, US, CA, GB, AU, AE, SG, NZ).'),
  useCase: z.enum(['payroll', 'contractor-payout', 'invoice-collection', 'b2b-supplier', 'p2p'])
    .optional()
    .describe('Filter by payment use-case. Defaults to HelloBooks\' invoice-collection + b2b-supplier + contractor-payout scope; pass an explicit value to widen.'),
  rail: z.enum(RAILS as [PaymentRail, ...PaymentRail[]]).optional()
    .describe('Filter by settlement rail (instant, same-day, next-day, multi-day).'),
  id: z.string().optional()
    .describe('Return a single payment method by id (e.g. "in-upi", "au-payid", "us-rtp").'),
};

export interface LocalPaymentMethodsArgs {
  country?: CountryCode;
  useCase?: PaymentUseCase;
  rail?: PaymentRail;
  id?: string;
}

export function localPaymentMethods(args: LocalPaymentMethodsArgs) {
  let results: PaymentMethod[] = PAYMENT_METHODS;

  if (args.id) {
    const idLc = args.id.toLowerCase();
    results = results.filter((m) => m.id === idLc);
  } else {
    // Default scope: only show entries whose useCases intersect HelloBooks'
    // accounting scope. An explicit `useCase` argument bypasses the default.
    if (args.useCase) {
      const uc = args.useCase;
      results = results.filter((m) => m.useCases.includes(uc));
    } else {
      results = results.filter((m) =>
        m.useCases.some((u) => TOOL_USE_CASES.includes(u)),
      );
    }
  }

  if (args.country) results = results.filter((m) => m.country === args.country);
  if (args.rail) results = results.filter((m) => m.rail === args.rail);

  return {
    methods: results,
    count: results.length,
    scope: args.useCase
      ? `useCase=${args.useCase}`
      : args.id
        ? `id=${args.id}`
        : `default (${TOOL_USE_CASES.join(', ')})`,
    disclaimer:
      'Payment-rail availability, per-transaction caps, and settlement windows ' +
      'change with operator notifications (NPCI, Pay.UK, Nacha, NPP Australia, ' +
      'Payments Canada, etc.). Always reconcile against the issuing authority\'s ' +
      'current circulars before relying on a cap or cut-off for an actual ' +
      'AR or AP run. helloProductSupport reflects HelloBooks\' own integration ' +
      'status and not the rail\'s general availability.',
    source: 'https://hellobooks.ai',
  };
}
