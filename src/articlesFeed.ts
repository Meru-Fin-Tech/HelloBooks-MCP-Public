/**
 * Live article federation — makes newly-published hellobooks.ai blog posts
 * appear in `list_articles` and `/catalog/articles.json` WITHOUT a rebuild,
 * commit, or deploy.
 *
 * Direction of truth:
 *   - The curated + baked-discovered arrays in src/data/articles.ts are the
 *     availability guarantee (always present, hand-edited excerpts survive).
 *   - hellobooks.ai/sitemap.xml is the freshness overlay: any /blog/ slug not
 *     already in the baked catalog is folded in with a slug-derived title.
 *
 * Same opportunistic-refresh design as pricingFeed.ts:
 *   - getArticles() is SYNCHRONOUS and never blocks on the network — baked on
 *     cold start, live-merged once the first background refresh lands.
 *   - refreshArticlesFromSitemap() runs in the background; any failure is
 *     swallowed and the last-good snapshot is kept. No new failure modes.
 *   - maybeRefresh() throttles so a flaky sitemap is never hammered.
 *
 * Env:
 *   HELLOBOOKS_MCP_DISABLE_ARTICLES_FEED=1  pin to baked data, never fetch
 *   HELLOBOOKS_MCP_SITEMAP_URL=<url>        override the sitemap URL
 *   HELLOBOOKS_MCP_DEBUG=1                  log refresh failures to stderr
 */

import { ARTICLES as BAKED_ARTICLES } from './data/articles.js';
import type { Article } from './data/articles.js';
import { DEFAULT_SITEMAP_URL, blogEntryToArticle, type BlogEntry } from './lib/blogSitemap.js';

const FETCH_TIMEOUT_MS = 4000;
const TTL_MS = 60 * 60 * 1000;            // serve a successful fetch for 1 hour
const MIN_REFETCH_GAP_MS = 5 * 60 * 1000; // attempt a refresh at most every 5 min

function feedDisabled(): boolean {
  return process.env.HELLOBOOKS_MCP_DISABLE_ARTICLES_FEED === '1';
}

function sitemapUrl(): string {
  return process.env.HELLOBOOKS_MCP_SITEMAP_URL ?? DEFAULT_SITEMAP_URL;
}

/**
 * Merge live blog entries onto the baked catalog. Baked entries (curated
 * excerpts, richer compare pages) always win on id collision; only genuinely
 * new slugs are appended. Result is sorted newest-first, matching listArticles.
 */
export function mergeSitemapArticles(entries: BlogEntry[]): Article[] {
  const known = new Set(BAKED_ARTICLES.map((a) => a.id));
  const fresh = entries
    .filter((e) => !known.has(e.slug))
    .map(blogEntryToArticle);
  return [...BAKED_ARTICLES, ...fresh].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

interface Snapshot {
  articles: Article[];
  source: 'sitemap' | 'baked';
  fetchedAt: number;
  liveCount: number; // how many entries the last sitemap fetch added over baked
}

let current: Snapshot = {
  articles: BAKED_ARTICLES,
  source: 'baked',
  fetchedAt: 0,
  liveCount: 0,
};
let refreshing: Promise<void> | null = null;
let nextAllowedFetch = 0;

/** Current article catalog — live-merged once warm, baked on cold start. */
export function getArticles(): Article[] {
  maybeRefresh();
  return current.articles;
}

/** Provenance of the data currently being served — surfaced in tool responses. */
export function getArticlesMeta() {
  return {
    dataSource: current.source === 'sitemap' ? ('live-sitemap' as const) : ('static-fallback' as const),
    catalogSize: current.articles.length,
    liveDiscovered: current.liveCount,
    lastFetchedAt: current.fetchedAt ? new Date(current.fetchedAt).toISOString() : null,
  };
}

/** Kick off a background refresh if the snapshot is stale and none is in flight. */
function maybeRefresh(): void {
  if (feedDisabled() || refreshing) return;
  const now = Date.now();
  if (now < nextAllowedFetch) return;
  if (current.source === 'sitemap' && now - current.fetchedAt < TTL_MS) return;
  nextAllowedFetch = now + MIN_REFETCH_GAP_MS;
  refreshing = refreshArticlesFromSitemap().finally(() => {
    refreshing = null;
  });
}

/**
 * Fetch the sitemap and swap in a fresh snapshot. Never throws — on any
 * network / HTTP / parse failure the last-good snapshot is kept.
 */
export async function refreshArticlesFromSitemap(): Promise<void> {
  if (feedDisabled()) return;
  try {
    const { fetchBlogEntries } = await import('./lib/blogSitemap.js');
    const entries = await fetchBlogEntries(sitemapUrl(), FETCH_TIMEOUT_MS);
    const merged = mergeSitemapArticles(entries);
    current = {
      articles: merged,
      source: 'sitemap',
      fetchedAt: Date.now(),
      liveCount: merged.length - BAKED_ARTICLES.length,
    };
  } catch (err) {
    if (process.env.HELLOBOOKS_MCP_DEBUG === '1') {
      process.stderr.write(`[articlesFeed] refresh failed: ${String(err)}\n`);
    }
  }
}

/** Test-only: reset the snapshot back to baked data. */
export function __resetArticlesCacheForTests(): void {
  current = { articles: BAKED_ARTICLES, source: 'baked', fetchedAt: 0, liveCount: 0 };
  refreshing = null;
  nextAllowedFetch = 0;
}
