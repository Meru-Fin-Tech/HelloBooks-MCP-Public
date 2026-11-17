/**
 * Source-URL reachability check (scheduled, network-dependent).
 *
 * Collects every `source` URL the public catalogs cite (compliance deadlines +
 * tax rates), dedupes them, and issues a request to each. Any URL that does not
 * respond with a success/redirect status is reported. Writes
 * `source-url-report.md` and exits non-zero on any failure so a scheduled job
 * can surface broken citations (which silently erode trust in agent answers).
 *
 * Shape (absolute-https) is enforced offline by test/source-urls.test.ts; this
 * script adds the live-reachability layer and is intentionally NOT part of the
 * blocking build.
 */
import { writeFileSync } from 'node:fs';
import { COMPLIANCE_DEADLINES } from '../src/data/complianceDeadlines.js';
import { TAX_RATES } from '../src/data/taxRates.js';

const USER_AGENT =
  process.env.USER_AGENT ??
  'HelloBooks-MCP-Public source-url-checker (+https://github.com/Meru-Fin-Tech/HelloBooks-MCP-Public)';
const FETCH_TIMEOUT_MS = 30_000;
const POLITE_DELAY_MS = 400;

interface Cited {
  url: string;
  refs: string[]; // catalog ids that cite this url
}

function collect(): Cited[] {
  const byUrl = new Map<string, Set<string>>();
  const add = (url: string, ref: string) => {
    if (!byUrl.has(url)) byUrl.set(url, new Set());
    byUrl.get(url)!.add(ref);
  };
  for (const d of COMPLIANCE_DEADLINES) add(d.source, `deadline:${d.id}`);
  for (const r of TAX_RATES) add(r.source, `tax-rate:${r.id}`);
  return [...byUrl.entries()].map(([url, refs]) => ({ url, refs: [...refs] }));
}

async function check(url: string): Promise<{ ok: boolean; status: number | string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    // Prefer HEAD; fall back to GET for authorities that reject HEAD.
    let res = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT },
    });
    if (res.status === 405 || res.status === 403 || res.status === 501) {
      res = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
        headers: { 'User-Agent': USER_AGENT },
      });
    }
    return { ok: res.status >= 200 && res.status < 400, status: res.status };
  } catch (err) {
    return { ok: false, status: err instanceof Error ? err.name : 'error' };
  } finally {
    clearTimeout(timer);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const cited = collect();
  const failures: Array<{ url: string; status: number | string; refs: string[] }> = [];

  for (const c of cited) {
    const { ok, status } = await check(c.url);
    if (!ok) failures.push({ url: c.url, status, refs: c.refs });
    await sleep(POLITE_DELAY_MS);
  }

  const runDate = new Date().toISOString().slice(0, 10);
  const lines = [
    `# Source-URL reachability report (${runDate})`,
    '',
    `Checked ${cited.length} unique source URL(s) across ${COMPLIANCE_DEADLINES.length} deadlines and ${TAX_RATES.length} tax rates.`,
    '',
  ];
  if (failures.length === 0) {
    lines.push('All source URLs responded with a success/redirect status. ✅');
    writeFileSync('source-url-report.md', lines.join('\n'));
    console.log(`source-url check OK (${cited.length} URLs).`);
    process.exit(0);
  }

  lines.push(`## ${failures.length} unreachable URL(s)`, '');
  for (const f of failures) {
    lines.push(`- [${f.status}] ${f.url}`);
    lines.push(`  cited by: ${f.refs.join(', ')}`);
  }
  writeFileSync('source-url-report.md', lines.join('\n'));

  console.error(`source-url check FAILED: ${failures.length} unreachable URL(s):`);
  for (const f of failures) console.error(`  - [${f.status}] ${f.url} (${f.refs.join(', ')})`);
  process.exit(1);
}

main().catch((err) => {
  console.error('source-url check crashed:', err);
  process.exit(2);
});
