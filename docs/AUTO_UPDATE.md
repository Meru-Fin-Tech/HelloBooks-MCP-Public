# Auto-update: how new hellobooks.ai content reaches agents.hellobooks.ai

Goal: when the marketing team publishes a new page or blog post on
hellobooks.ai, AI agents querying `agents.hellobooks.ai` should see it **without
anyone hand-editing this repo**. This is achieved in layers, ordered by how
automatic they are.

## The marketing mirror is already automatic (no push needed)

`hellobooks.ai/api/feed/<slug>.json` does **not** keep its own copy of any
catalog. `Web-Fire-hellobooks.ai/src/lib/feeds/mcpCatalogMirror.ts` is a live
proxy that fetches `agents.hellobooks.ai/catalog/<slug>.json` at request time
(15-min ISR cache). So once a change deploys to the MCP, the marketing origin
reflects it within 15 minutes automatically — there is nothing to "push" to the
mirror. (Pricing is the one exception, and it flows the other way: the MCP
federates pricing FROM `hellobooks.ai/api/feed/pricing.json`.)

## Layer 1 — Runtime federation (primary, always on)

Two catalogs refresh themselves live from the marketing origin, with the baked
`src/data/*` as a fallback. No cron, no commit, no deploy, no GitHub-Actions or
`workflow`-scope dependency.

| Catalog | Source of truth | Module | Cache |
| --- | --- | --- | --- |
| Plans / credit packs | `hellobooks.ai/api/feed/pricing.json` | `src/pricingFeed.ts` | 1h |
| Articles / blog posts | `hellobooks.ai/sitemap.xml` (`/blog/` URLs) | `src/articlesFeed.ts` | 1h |

`getArticles()` returns the baked catalog on cold start, then the live-merged
set once the first background refresh lands (~1h TTL, throttled). A newly
published post appears in `list_articles` and `/catalog/articles.json`
automatically. `_meta.dataSource` in each response reports `live-sitemap` vs
`static-fallback`. Disable with `HELLOBOOKS_MCP_DISABLE_ARTICLES_FEED=1`.

## Layer 2 — Baked snapshot refresh (optional, cold-start freshness)

`npm run sync:discovered-articles` regenerates `src/data/articlesDiscovered.ts`
from the sitemap. Only needed to keep the cold-start fallback current, since
Layer 1 already serves new posts live. Install
`docs/sync-discovered-articles.yml.example` to run it weekly and auto-PR the
diff (needs `workflow` scope to install + active org Actions billing to run).

## Layer 3 — Fast cache-bust on catalog changes (optional)

When a catalog change *does* deploy to the MCP, the marketing mirror otherwise
waits out its 15-min ISR window. `docs/notify-marketing-revalidate.yml.example`
pings `hellobooks.ai/api/revalidate` on push to `main` so the mirror busts in
seconds instead. See `CROSS_REPO_REVALIDATE_SETUP.md`.

## What is NOT yet auto-ingested

Layer 1 covers **blog posts** (`/blog/*`). Non-blog marketing pages — SEO
landing pages (`/gst-software-*`, `/for-*`), `/compare/*`, product pages — are
**not** folded into the article catalog (they are not "articles"). If agents
should be able to enumerate every hellobooks.ai page, the next step is a
sitemap-passthrough feed (e.g. `/catalog/pages.json`) built on the same
`src/lib/blogSitemap.ts` fetch, generalised from `/blog/` to all `<loc>` URLs.
Deliberately deferred pending a decision on whether every SEO landing page
should be an agent-citable surface.
