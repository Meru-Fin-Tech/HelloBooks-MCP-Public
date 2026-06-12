/**
 * Per-catalog HTTP JSON feeds — the API-based source-of-truth surface.
 *
 * Background: every catalog this MCP serves (features, integrations, competitors,
 * compliance deadlines, country support, tax rates, Munimji capabilities, local
 * payment methods, articles, videos, plans) used to be reachable ONLY over the
 * MCP JSON-RPC transport (tools/resources). The marketing site therefore had no
 * machine-readable way to consume the SAME data and kept (or would have kept)
 * its own static copies — guaranteed drift.
 *
 * This module exposes each catalog as a plain HTTP GET JSON endpoint at
 * `/catalog/<slug>.json`, generated directly from the same `src/data/*` modules
 * the MCP tools read. So:
 *   - The MCP server is the single canonical store for catalog data.
 *   - The website (and any AI crawler) consumes these APIs instead of copying.
 *   - There is exactly one source of truth, surfaced two ways (MCP + HTTP), and
 *     they cannot drift because both read the same modules.
 *
 * PRICING is the one catalog whose canonical home is the marketing site
 * (`hellobooks.ai/api/feed/pricing.json`); this server federates it in via
 * `pricingFeed.ts`, so `/catalog/plans.json` re-publishes the live-federated
 * snapshot and advertises its provenance in `dataSource`.
 *
 * Every feed shares one envelope so consumers can treat them uniformly. Pure
 * functions, no per-request state — safe to cache at any tier exactly like the
 * rest of the discovery surface.
 */

import { SERVER_VERSION } from './server.js';
import { getBaseUrl, getCatalogLastModified } from './discovery.js';
import { getPlans, getCreditPacks, getPricingMeta } from './pricingFeed.js';
import { FREE_TIER_THRESHOLDS, FREE_TIER_THRESHOLD_META } from './data/freeTierThresholds.js';
import { FEATURES, FEATURE_CATEGORIES, FEATURE_CATALOG_META } from './data/features.js';
import { INTEGRATIONS } from './data/integrations.js';
import { COMPETITORS } from './data/competitors.js';
import { COMPLIANCE_DEADLINES } from './data/complianceDeadlines.js';
import { COUNTRY_SUPPORT } from './data/countries.js';
import { TAX_RATES, TAX_RATE_DISCLAIMER } from './data/taxRates.js';
import {
  AUTONOMY_LEGEND,
  BUSINESS_AREAS,
  MUNIMJI_CAPABILITIES,
  CAPABILITY_KB_META,
} from './data/capabilities.js';
import { PAYMENT_METHODS, HELLOBOOKS_USE_CASES } from './data/paymentMethods.js';
import { ARTICLES } from './data/articles.js';
import { VIDEOS, YOUTUBE_CHANNEL } from './data/videos.js';

const MARKETING_BASE_URL = 'https://hellobooks.ai';

/** Provenance of a feed's data. `static` ships with the release; `live-feed` /
 * `static-fallback` come from pricingFeed's federation status. */
export type FeedDataSource = 'static' | 'live-feed' | 'static-fallback';

interface FeedPayload {
  /** Number of primary records (for a quick sanity check by consumers). */
  count: number;
  /** The catalog body, merged into the response envelope's `data` field. */
  data: Record<string, unknown>;
  /** Overrides the default `static` provenance (pricing only). */
  dataSource?: FeedDataSource;
}

export interface CatalogFeedDescriptor {
  /** URL slug — endpoint is `/catalog/<slug>.json`. */
  slug: string;
  title: string;
  description: string;
  /** Human-facing marketing page for the same data. */
  marketingUrl: string;
  build: () => FeedPayload;
}

/**
 * The catalog feed registry. Adding a catalog here automatically exposes its
 * HTTP endpoint (http.ts iterates this list) and lists it in the index — the
 * smoke test asserts each builds and every MCP data catalog is represented.
 */
export const CATALOG_FEEDS: readonly CatalogFeedDescriptor[] = [
  {
    slug: 'plans',
    title: 'Plans & credit packs',
    description:
      'HelloBooks plan tiers and one-time AI credit packs in 8 regional currencies. Live-federated from the marketing pricing feed.',
    marketingUrl: `${MARKETING_BASE_URL}/pricing`,
    build: () => {
      const plans = getPlans();
      const creditPacks = getCreditPacks();
      const meta = getPricingMeta();
      return {
        count: plans.length + creditPacks.length,
        dataSource: meta.dataSource,
        data: {
          plans,
          creditPacks,
          pricing: meta,
        },
      };
    },
  },
  {
    slug: 'features',
    title: 'Feature catalog',
    description:
      'Full HelloBooks marketing feature catalog with categories, tiers, and rollout status.',
    marketingUrl: `${MARKETING_BASE_URL}/features`,
    build: () => ({
      count: FEATURES.length,
      data: {
        categories: FEATURE_CATEGORIES,
        features: FEATURES,
        meta: FEATURE_CATALOG_META,
      },
    }),
  },
  {
    slug: 'integrations',
    title: 'Integrations',
    description:
      'Banks, payments, payroll, accounting sync, ecommerce, CRM and more, with per-integration country availability and status.',
    marketingUrl: `${MARKETING_BASE_URL}/integration`,
    build: () => ({
      count: INTEGRATIONS.length,
      data: { integrations: INTEGRATIONS },
    }),
  },
  {
    slug: 'competitors',
    title: 'Competitor positioning',
    description:
      'Competitor entries with where HelloBooks wins, where the competitor wins, and pricing notes.',
    marketingUrl: `${MARKETING_BASE_URL}/compare`,
    build: () => ({
      count: COMPETITORS.length,
      data: { competitors: COMPETITORS },
    }),
  },
  {
    slug: 'compliance-deadlines',
    title: 'Statutory filing deadlines',
    description:
      'When statutory returns and payroll filings are due, per country and frequency.',
    marketingUrl: `${MARKETING_BASE_URL}/global`,
    build: () => ({
      count: COMPLIANCE_DEADLINES.length,
      data: { deadlines: COMPLIANCE_DEADLINES },
    }),
  },
  {
    slug: 'countries',
    title: 'Country support matrix',
    description:
      'Features and compliance frameworks available per supported country.',
    marketingUrl: `${MARKETING_BASE_URL}/global`,
    build: () => ({
      count: COUNTRY_SUPPORT.length,
      data: { countries: COUNTRY_SUPPORT },
    }),
  },
  {
    slug: 'tax-rates',
    title: 'Statutory tax rates',
    description:
      'Statutory GST/VAT/sales-tax slabs per country, with a compliance disclaimer.',
    marketingUrl: `${MARKETING_BASE_URL}/global`,
    build: () => ({
      count: TAX_RATES.length,
      data: { taxRates: TAX_RATES, disclaimer: TAX_RATE_DISCLAIMER },
    }),
  },
  {
    slug: 'capabilities',
    title: 'Munimji capability knowledge base',
    description:
      'What the Munimji AI does autonomously vs with one-click approval, mapped to business areas and software features.',
    marketingUrl: `${MARKETING_BASE_URL}/features`,
    build: () => ({
      count: MUNIMJI_CAPABILITIES.length,
      data: {
        businessAreas: BUSINESS_AREAS,
        capabilities: MUNIMJI_CAPABILITIES,
        autonomyLegend: AUTONOMY_LEGEND,
        meta: CAPABILITY_KB_META,
      },
    }),
  },
  {
    slug: 'payment-methods',
    title: 'Local payment methods',
    description:
      'Local bank-rail and wallet methods for collection, AP, and payouts, with rail speed and HelloBooks support level.',
    marketingUrl: `${MARKETING_BASE_URL}/integration`,
    build: () => ({
      count: PAYMENT_METHODS.length,
      data: { paymentMethods: PAYMENT_METHODS, useCases: HELLOBOOKS_USE_CASES },
    }),
  },
  {
    slug: 'articles',
    title: 'Published articles',
    description:
      'Published articles on hellobooks.ai — head-to-head compare pages and curated flagship blog posts.',
    marketingUrl: `${MARKETING_BASE_URL}/blog`,
    build: () => ({
      count: ARTICLES.length,
      data: { articles: ARTICLES },
    }),
  },
  {
    slug: 'videos',
    title: 'Product videos',
    description:
      'HelloBooks product videos and the official @hellobooksai YouTube channel link.',
    marketingUrl: `${MARKETING_BASE_URL}`,
    build: () => ({
      count: VIDEOS.length,
      data: { videos: VIDEOS, channel: YOUTUBE_CHANNEL },
    }),
  },
  {
    slug: 'free-tier-thresholds',
    title: 'Free-tier turnover thresholds',
    description:
      'Per-country annual-invoice-turnover caps for the Free plan (Doc 80 / Acc-V3 #1501). Above the cap, an entity must move to Pro or Business.',
    marketingUrl: `${MARKETING_BASE_URL}/pricing`,
    build: () => ({
      count: FREE_TIER_THRESHOLDS.length,
      data: { thresholds: FREE_TIER_THRESHOLDS, meta: FREE_TIER_THRESHOLD_META },
    }),
  },
];

const FEED_BY_SLUG: ReadonlyMap<string, CatalogFeedDescriptor> = new Map(
  CATALOG_FEEDS.map((f) => [f.slug, f]),
);

/** All exposed catalog-feed slugs (endpoint = `/catalog/<slug>.json`). */
export const CATALOG_FEED_SLUGS: readonly string[] = CATALOG_FEEDS.map((f) => f.slug);

/**
 * Build the full response envelope for one catalog feed, or `null` if the slug
 * is unknown. The envelope is intentionally identical in shape across catalogs.
 */
export function generateCatalogFeed(slug: string): Record<string, unknown> | null {
  const feed = FEED_BY_SLUG.get(slug);
  if (!feed) return null;
  const baseUrl = getBaseUrl();
  const { count, data, dataSource } = feed.build();
  return {
    name: 'hellobooks-public',
    version: SERVER_VERSION,
    catalog: feed.slug,
    title: feed.title,
    description: feed.description,
    source: `${baseUrl}/catalog/${feed.slug}.json`,
    marketingUrl: feed.marketingUrl,
    dataSource: dataSource ?? 'static',
    dateModified: getCatalogLastModified().toISOString(),
    count,
    data,
  };
}

/**
 * Index of all catalog feeds, served at `/catalog/index.json`. Lets the website
 * and crawlers discover every feed endpoint from one fetch.
 */
export function generateCatalogFeedIndex(): Record<string, unknown> {
  const baseUrl = getBaseUrl();
  return {
    name: 'hellobooks-public',
    version: SERVER_VERSION,
    description:
      'Index of machine-readable HelloBooks catalog feeds. Each entry is a public, read-only JSON endpoint generated from the same data the MCP server serves at /mcp.',
    dateModified: getCatalogLastModified().toISOString(),
    count: CATALOG_FEEDS.length,
    feeds: CATALOG_FEEDS.map((f) => ({
      catalog: f.slug,
      title: f.title,
      description: f.description,
      url: `${baseUrl}/catalog/${f.slug}.json`,
      marketingUrl: f.marketingUrl,
    })),
  };
}
