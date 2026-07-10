import { test } from 'node:test';
import assert from 'node:assert/strict';

import { ARTICLES as BAKED_ARTICLES } from '../src/data/articles.js';
import {
  mergeSitemapArticles,
  getArticles,
  getArticlesMeta,
  refreshArticlesFromSitemap,
  __resetArticlesCacheForTests,
} from '../src/articlesFeed.js';
import { parseBlogEntries, blogEntryToArticle, slugToTitle } from '../src/lib/blogSitemap.js';

test('mergeSitemapArticles appends a genuinely new slug and sorts newest-first', () => {
  const merged = mergeSitemapArticles([
    { slug: 'a-brand-new-gst-post-2027', lastmod: '2027-01-15' },
  ]);
  assert.equal(merged.length, BAKED_ARTICLES.length + 1);
  assert.equal(merged[0]!.id, 'a-brand-new-gst-post-2027'); // newest -> first
  assert.equal(merged[0]!.countryRelevance, 'IN'); // slug-inferred
});

test('mergeSitemapArticles never duplicates or overwrites a baked article', () => {
  const bakedId = BAKED_ARTICLES[0]!.id;
  const bakedTitle = BAKED_ARTICLES[0]!.title;
  const merged = mergeSitemapArticles([{ slug: bakedId, lastmod: '2099-12-31' }]);
  assert.equal(merged.length, BAKED_ARTICLES.length); // no dupe added
  const kept = merged.find((a) => a.id === bakedId)!;
  assert.equal(kept.title, bakedTitle); // curated title wins, not slug-derived
});

test('getArticles returns the baked catalog when the feed is disabled', () => {
  process.env.HELLOBOOKS_MCP_DISABLE_ARTICLES_FEED = '1';
  __resetArticlesCacheForTests();
  const arts = getArticles();
  assert.equal(arts.length, BAKED_ARTICLES.length);
  assert.equal(getArticlesMeta().dataSource, 'static-fallback');
  delete process.env.HELLOBOOKS_MCP_DISABLE_ARTICLES_FEED;
  __resetArticlesCacheForTests();
});

test('refreshArticlesFromSitemap keeps the baked snapshot on a hard fetch failure', async () => {
  // Point at an unroutable host so the fetch rejects; snapshot must survive.
  process.env.HELLOBOOKS_MCP_SITEMAP_URL = 'http://127.0.0.1:1/sitemap.xml';
  __resetArticlesCacheForTests();
  await refreshArticlesFromSitemap();
  assert.equal(getArticlesMeta().dataSource, 'static-fallback');
  assert.equal(getArticles().length, BAKED_ARTICLES.length);
  delete process.env.HELLOBOOKS_MCP_SITEMAP_URL;
  __resetArticlesCacheForTests();
});

test('parseBlogEntries extracts only leaf /blog/ slugs', () => {
  const xml = `<?xml version="1.0"?><urlset>
    <url><loc>https://hellobooks.ai/blog/gst-2-0-explained</loc><lastmod>2026-09-25</lastmod></url>
    <url><loc>https://hellobooks.ai/blog/category/tax/</loc><lastmod>2026-09-01</lastmod></url>
    <url><loc>https://hellobooks.ai/pricing</loc><lastmod>2026-09-01</lastmod></url>
    <url><loc>https://hellobooks.ai/blog/1099-deadlines</loc></url>
  </urlset>`;
  const entries = parseBlogEntries(xml);
  assert.deepEqual(entries.map((e) => e.slug), ['gst-2-0-explained', '1099-deadlines']);
  assert.equal(entries[0]!.lastmod, '2026-09-25');
  assert.equal(entries[1]!.lastmod, '2026-01-01'); // default when <lastmod> absent
});

test('blogEntryToArticle produces a searchable, well-formed Article', () => {
  const a = blogEntryToArticle({ slug: 'best-gst-software-for-ca-firms', lastmod: '2026-06-01' });
  assert.equal(a.kind, 'blog');
  assert.equal(a.countryRelevance, 'IN');
  assert.ok(a.tags.includes('discovered'));
  assert.ok(a.tags.includes('gst'));
  assert.ok(a.excerpt.length > 30); // list_articles invariant
  assert.equal(a.title, slugToTitle('best-gst-software-for-ca-firms'));
  assert.equal(a.url, 'https://hellobooks.ai/blog/best-gst-software-for-ca-firms');
});
