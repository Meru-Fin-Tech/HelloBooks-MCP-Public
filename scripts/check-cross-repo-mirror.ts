/**
 * Cross-repo mirror health check (strategy #107).
 *
 * The marketing site (hellobooks.ai) does not keep its own copy of the catalogs
 * — `/api/feed/<slug>.json` is a live proxy of the MCP's `/catalog/<slug>.json`
 * (see docs/CROSS_REPO_REVALIDATE_SETUP.md). If that proxy breaks, AI crawlers
 * landing on hellobooks.ai get stale or empty catalogs. This script fetches both
 * sides for each mirrored slug and reports a mismatch in the row count, so a
 * scheduled job can catch drift. Network-dependent; not part of the build.
 */
const MCP_BASE = (process.env.HELLOBOOKS_MCP_BASE_URL ?? 'https://agents.hellobooks.ai').replace(/\/+$/, '');
const MARKETING_BASE = (process.env.HELLOBOOKS_MARKETING_URL ?? 'https://hellobooks.ai').replace(/\/+$/, '');
const TIMEOUT_MS = 15_000;

const SLUGS = [
  'features', 'integrations', 'competitors', 'compliance-deadlines', 'countries',
  'tax-rates', 'capabilities', 'payment-methods', 'articles', 'videos',
];

async function getJson(url: string): Promise<unknown | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Read the catalog row count from either envelope shape. */
function countOf(body: unknown): number | null {
  if (body === null || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  if (typeof b.count === 'number') return b.count;
  const cat = b.catalog as Record<string, unknown> | undefined;
  if (cat && typeof cat.count === 'number') return cat.count;
  return null;
}

async function main() {
  const failures: string[] = [];
  for (const slug of SLUGS) {
    const [upstream, mirror] = await Promise.all([
      getJson(`${MCP_BASE}/catalog/${slug}.json`),
      getJson(`${MARKETING_BASE}/api/feed/${slug}.json`),
    ]);
    const up = countOf(upstream);
    const mi = countOf(mirror);
    if (up === null) { failures.push(`${slug}: MCP upstream unreachable`); continue; }
    if (mi === null) { failures.push(`${slug}: marketing mirror unreachable/empty`); continue; }
    if (up !== mi) failures.push(`${slug}: count drift — MCP=${up} vs mirror=${mi}`);
    else console.log(`ok  ${slug} (${up})`);
  }
  if (failures.length > 0) {
    console.error(`cross-repo mirror check FAILED (${failures.length}):`);
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log(`cross-repo mirror OK (${SLUGS.length} slugs in sync).`);
}

main().catch((err) => {
  console.error('cross-repo mirror check crashed:', err);
  process.exit(2);
});
