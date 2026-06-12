/**
 * Live pricing federation.
 *
 * Fetches hellobooks.ai/api/feed/pricing.json — the generated output of the
 * marketing site's canonical pricingConfig.ts — and overlays its prices and
 * feature bullets onto the baked plan / credit-pack catalog in src/data/plans.ts.
 *
 * Design — the baked catalog is the availability guarantee; the feed is an
 * opportunistic freshness overlay:
 *   - getPlans() / getCreditPacks() are SYNCHRONOUS and never block on the
 *     network. They return the current snapshot — baked on cold start, live
 *     once the first background refresh lands (typically within ~1s).
 *   - refreshPricingFromFeed() runs in the background; any failure is swallowed
 *     and the last-good snapshot (baked, or a previous feed copy) is kept.
 *   - maybeRefresh() throttles attempts so a flaky feed is never hammered.
 * This adds no new failure modes to the server.
 *
 * Env:
 *   HELLOBOOKS_MCP_DISABLE_PRICING_FEED=1  pin to baked data, never fetch
 *   HELLOBOOKS_MCP_PRICING_FEED_URL=<url>  override the feed URL
 *   HELLOBOOKS_MCP_DEBUG=1                 log refresh failures to stderr
 */

import { z } from 'zod';
import { PLANS as BAKED_PLANS, CREDIT_PACKS as BAKED_PACKS } from './data/plans.js';
import type { Plan, PlanPrice, CreditPack, PackPrice, CountryCode, CurrencyCode } from './data/plans.js';

const DEFAULT_FEED_URL = 'https://hellobooks.ai/api/feed/pricing.json';
const FETCH_TIMEOUT_MS = 4000;
const TTL_MS = 60 * 60 * 1000;            // serve a successful fetch for 1 hour
const MIN_REFETCH_GAP_MS = 5 * 60 * 1000; // attempt a refresh at most every 5 min

const COUNTRIES: CountryCode[] = ['US', 'IN', 'CA', 'GB', 'AU', 'AE', 'SG', 'NZ'];

// The feed carries an ISO currency code; the MCP catalog also carries a symbol.
const CURRENCY_SYMBOL: Record<string, string> = {
  USD: '$', INR: '₹', CAD: 'C$', GBP: '£',
  AUD: 'A$', AED: 'AED ', SGD: 'S$', NZD: 'NZ$',
};

function feedDisabled(): boolean {
  return process.env.HELLOBOOKS_MCP_DISABLE_PRICING_FEED === '1';
}

function feedUrl(): string {
  return process.env.HELLOBOOKS_MCP_PRICING_FEED_URL ?? DEFAULT_FEED_URL;
}

function symbolFor(currency: string): string {
  return CURRENCY_SYMBOL[currency] ?? currency;
}

// --- Feed schema — a malformed feed fails validation and triggers fallback ---

const feedTierSchema = z.object({
  id: z.string(),
  currency: z.string(),
  monthlyPrice: z.number(),
  annualPrice: z.number(),
  anchorMonthlyPrice: z.number(),
  features: z.array(z.string()),
  // monthlyAiCredits is the per-month AI-credit allowance (-1 = unlimited);
  // optional so a feed that omits it falls back to the baked catalog rather
  // than failing validation and freezing the snapshot. See feedToPlans below.
  limits: z.object({
    perClientPrice: z.number(),
    monthlyAiCredits: z.number().optional(),
  }).passthrough(),
});

const feedAddOnSchema = z.object({
  id: z.string(),
  currency: z.string(),
  price: z.number(),
  // Pack size in AI credits. Optional for the same fallback-safety reason.
  credits: z.number().optional(),
});

const feedRegionSchema = z.object({
  region: z.string(),
  tiers: z.array(feedTierSchema),
  addOns: z.array(feedAddOnSchema),
});

const feedSchema = z.object({
  tiers: z.array(feedTierSchema),
  addOns: z.array(feedAddOnSchema),
  regions: z.array(feedRegionSchema),
  updatedAt: z.string().optional(),
}).passthrough();

export type PricingFeed = z.infer<typeof feedSchema>;

// --- Transform: overlay feed prices/features onto the baked catalog ----------

/**
 * Build the plan catalog from the feed. The baked plan structure (plan id,
 * name, tagline, signup URL) is kept; prices, feature bullets, and the
 * monthly AI-credit allowance are overlaid when the feed carries them.
 * Plans absent from the feed (Warehouse / Manufacturing add-on modules)
 * keep their baked values untouched.
 *
 * monthlyAiCredits is region-invariant, so the top-level tier is the
 * canonical source. ?? (not ||) keeps a feed-supplied 0 as an intentional
 * override; only undefined falls back to baked.
 */
export function feedToPlans(feed: PricingFeed): Plan[] {
  return BAKED_PLANS.map((baked) => {
    const feedTier = feed.tiers.find((t) => t.id === baked.plan);
    if (!feedTier) return baked; // e.g. warehouse-addon / manufacturing-addon

    const prices: PlanPrice[] = COUNTRIES.map((country) => {
      const region = feed.regions.find((r) => r.region === country);
      const tier = region?.tiers.find((t) => t.id === baked.plan);
      const bakedPrice = baked.prices.find((p) => p.country === country);
      if (!tier) return bakedPrice ?? baked.prices[0];

      const price: PlanPrice = {
        country,
        currency: tier.currency as CurrencyCode,
        symbol: symbolFor(tier.currency),
        monthly: tier.monthlyPrice,
        annual: tier.annualPrice,
        anchorMonthly: tier.anchorMonthlyPrice,
      };
      // `perClient` is vestigial after Web-Fire #514 — the retired
      // "$59.99/mo + $4.99/client" CPA SKU is gone and the field is no
      // longer populated. Kept optional in PlanPrice for back-compat.
      return price;
    });

    return {
      ...baked,
      prices,
      features: feedTier.features.length > 0 ? feedTier.features : baked.features,
      monthlyAiCredits: feedTier.limits.monthlyAiCredits ?? baked.monthlyAiCredits,
    };
  });
}

/**
 * Build the credit-pack catalog from the feed, overlaying per-region prices.
 * Pack credit counts are region-invariant, so the top-level addOns entry is
 * the canonical source; per-region addOns drive only the per-region price.
 */
export function feedToCreditPacks(feed: PricingFeed): CreditPack[] {
  return BAKED_PACKS.map((baked) => {
    const topLevelAddon = feed.addOns.find((a) => a.id === baked.id);
    const prices: PackPrice[] = COUNTRIES.map((country) => {
      const region = feed.regions.find((r) => r.region === country);
      const addon = region?.addOns.find((a) => a.id === baked.id);
      const bakedPrice = baked.prices.find((p) => p.country === country);
      if (!addon) return bakedPrice ?? baked.prices[0];
      return {
        country,
        currency: addon.currency as CurrencyCode,
        symbol: symbolFor(addon.currency),
        price: addon.price,
      };
    });
    return {
      ...baked,
      prices,
      credits: topLevelAddon?.credits ?? baked.credits,
    };
  });
}

// --- Snapshot cache + background refresh -------------------------------------

interface Snapshot {
  plans: Plan[];
  creditPacks: CreditPack[];
  source: 'feed' | 'baked';
  fetchedAt: number;
  feedUpdatedAt?: string;
}

let current: Snapshot = {
  plans: BAKED_PLANS,
  creditPacks: BAKED_PACKS,
  source: 'baked',
  fetchedAt: 0,
};
let refreshing: Promise<void> | null = null;
let nextAllowedFetch = 0;

/** Current plan catalog — live feed data once warm, baked data on cold start. */
export function getPlans(): Plan[] {
  maybeRefresh();
  return current.plans;
}

/** Current credit-pack catalog — live feed data once warm, baked on cold start. */
export function getCreditPacks(): CreditPack[] {
  maybeRefresh();
  return current.creditPacks;
}

/** Provenance of the data currently being served — surfaced in tool responses. */
export function getPricingMeta() {
  return {
    dataSource: current.source === 'feed' ? ('live-feed' as const) : ('static-fallback' as const),
    feedUpdatedAt: current.feedUpdatedAt ?? null,
    lastFetchedAt: current.fetchedAt ? new Date(current.fetchedAt).toISOString() : null,
  };
}

/** Kick off a background refresh if the snapshot is stale and none is in flight. */
function maybeRefresh(): void {
  if (feedDisabled() || refreshing) return;
  const now = Date.now();
  if (now < nextAllowedFetch) return;
  if (current.source === 'feed' && now - current.fetchedAt < TTL_MS) return;
  nextAllowedFetch = now + MIN_REFETCH_GAP_MS;
  refreshing = refreshPricingFromFeed().finally(() => {
    refreshing = null;
  });
}

/**
 * Fetch + validate the feed and swap in a fresh snapshot. Never throws — on any
 * network / HTTP / validation failure the last-good snapshot is kept.
 */
export async function refreshPricingFromFeed(): Promise<void> {
  if (feedDisabled()) return;
  try {
    const res = await fetch(feedUrl(), {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`pricing feed HTTP ${res.status}`);
    const feed = feedSchema.parse(await res.json());
    current = {
      plans: feedToPlans(feed),
      creditPacks: feedToCreditPacks(feed),
      source: 'feed',
      fetchedAt: Date.now(),
      feedUpdatedAt: feed.updatedAt,
    };
  } catch (err) {
    // Keep the last-good snapshot. maybeRefresh()'s nextAllowedFetch throttle
    // prevents hammering the feed on repeated failures.
    if (process.env.HELLOBOOKS_MCP_DEBUG === '1') {
      process.stderr.write(`[pricingFeed] refresh failed: ${String(err)}\n`);
    }
  }
}

/** Test-only: reset the snapshot back to baked data. */
export function __resetPricingCacheForTests(): void {
  current = { plans: BAKED_PLANS, creditPacks: BAKED_PACKS, source: 'baked', fetchedAt: 0 };
  refreshing = null;
  nextAllowedFetch = 0;
}
