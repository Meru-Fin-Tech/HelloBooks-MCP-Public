import { z } from 'zod';
import { ARTICLES } from '../data/articles.js';
import type { Article, CountryRelevance } from '../data/articles.js';

const COUNTRY_FILTER = ['IN', 'AU', 'US', 'CA', 'GB', 'AE', 'SG', 'NZ', 'global'] as const;

export const listArticlesSchema = {
  country: z.enum(COUNTRY_FILTER).optional()
    .describe(
      'ISO country code or "global". Returns articles whose countryRelevance ' +
      'matches OR is "global". Omit to return everything.',
    ),
  tag: z.string().min(2).max(40).optional()
    .describe(
      'Single tag to filter on (case-insensitive substring match against the ' +
      'article tag list). e.g. "gst", "1099", "tally".',
    ),
  query: z.string().min(2).max(120).optional()
    .describe(
      'Free-text query — substring-matched against the title, excerpt and tags ' +
      'of each article. e.g. "QuickBooks alternative" or "audit trail".',
    ),
  limit: z.number().int().min(1).max(100).optional()
    .describe('Max articles to return (default 20).'),
};

export interface ListArticlesArgs {
  country?: CountryRelevance;
  tag?: string;
  query?: string;
  limit?: number;
}

function matchesQuery(article: Article, terms: string[]): boolean {
  if (terms.length === 0) return true;
  const haystack = `${article.title} ${article.excerpt} ${article.tags.join(' ')}`.toLowerCase();
  // ALL terms must be present (substring) — standard "AND" search.
  return terms.every((t) => haystack.includes(t));
}

function matchesTag(article: Article, tag: string): boolean {
  const t = tag.toLowerCase();
  return article.tags.some((at) => at.toLowerCase().includes(t));
}

function matchesCountry(article: Article, country: CountryRelevance): boolean {
  // "global" filter is exclusive — returns only posts tagged "global". Other
  // countries include their tagged content PLUS global posts (inclusive read).
  const a = article.countryRelevance ?? 'global';
  if (country === 'global') return a === 'global';
  return a === country || a === 'global';
}

export function listArticles(args: ListArticlesArgs) {
  const limit = args.limit ?? 20;
  let results: Article[] = ARTICLES;

  if (args.country) {
    const c = args.country;
    results = results.filter((a) => matchesCountry(a, c));
  }

  if (args.tag) {
    const t = args.tag;
    results = results.filter((a) => matchesTag(a, t));
  }

  if (args.query) {
    const terms = args.query
      .toLowerCase()
      .trim()
      .split(/\s+/)
      .filter((t) => t.length > 0);
    results = results.filter((a) => matchesQuery(a, terms));
  }

  // Newest first.
  results = [...results].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

  return {
    articles: results.slice(0, limit),
    count: Math.min(results.length, limit),
    totalMatches: results.length,
    catalogSize: ARTICLES.length,
    source: 'https://hellobooks.ai/blog',
    note:
      'Catalog is a curated subset of published content on hellobooks.ai ' +
      '(compare pages + flagship blog posts). hellobooks.ai/blog hosts ' +
      'additional articles not surfaced through this tool — link callers ' +
      'there if no result is a strong match.',
  };
}
