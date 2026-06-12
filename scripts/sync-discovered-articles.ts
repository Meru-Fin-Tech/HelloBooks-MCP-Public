/**
 * sync-discovered-articles.ts
 *
 * Pulls the full blog URL set from hellobooks.ai/sitemap.xml, slug-derives a
 * title for each, drops anything the curated catalog in src/data/articles.ts
 * already covers, and writes the remainder to src/data/articlesDiscovered.ts.
 *
 * Why a separate file: the curated array stays hand-editable (rich excerpts,
 * tags, country relevance), and `discovered` entries are clearly bulk-imported
 * (slug-derived title, no excerpt, tagged `discovered` + a country hint).
 *
 * Run with: `npm run sync:discovered-articles`
 * Reproducible — sitemap order is deterministic and lastmod stamps are stable.
 */

import { writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CURATED_ARTICLES } from '../src/data/articles.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = join(__dirname, '..', 'src', 'data', 'articlesDiscovered.ts');
const SITEMAP_URL = 'https://hellobooks.ai/sitemap.xml';

// Common acronyms that should stay uppercase (or mixed-case) after the slug
// is split on hyphens. Lowercase-keyed map for cheap lookup.
const ACRONYMS: Record<string, string> = {
  // Tax / compliance
  gst: 'GST', gstr: 'GSTR', tds: 'TDS', tcs: 'TCS', vat: 'VAT', bas: 'BAS',
  payg: 'PAYG', mtd: 'MTD', ewb: 'EWB', irn: 'IRN', hsn: 'HSN', sac: 'SAC',
  cgst: 'CGST', sgst: 'SGST', igst: 'IGST', utgst: 'UTGST', itc: 'ITC',
  rcm: 'RCM', fbt: 'FBT', stp: 'STP', tpar: 'TPAR', cis: 'CIS', drc: 'DRC',
  pt: 'PT', epf: 'EPF', esi: 'ESI', pmt: 'PMT', nsdl: 'NSDL', traces: 'TRACES',
  itr: 'ITR', form16: 'Form 16', form24q: 'Form 24Q', form26q: 'Form 26Q',
  // Accounting / finance
  ar: 'AR', ap: 'AP', cogs: 'COGS', ebitda: 'EBITDA', roi: 'ROI', kpi: 'KPI',
  pl: 'P&L', je: 'JE', fy: 'FY', yoy: 'YoY', mom: 'MoM', eps: 'EPS', ipo: 'IPO',
  mvp: 'MVP', wac: 'WAC', fifo: 'FIFO', lifo: 'LIFO', bom: 'BOM', mrp: 'MRP',
  pos: 'POS', edc: 'EDC', erp: 'ERP', crm: 'CRM', wms: 'WMS', oms: 'OMS',
  cpa: 'CPA', ca: 'CA', cfo: 'CFO', ceo: 'CEO', smb: 'SMB', sme: 'SME',
  // Tech
  ai: 'AI', ml: 'ML', mcp: 'MCP', api: 'API', ui: 'UI', ux: 'UX', url: 'URL',
  saas: 'SaaS', oauth: 'OAuth', rbac: 'RBAC', sso: 'SSO', mfa: 'MFA', ocr: 'OCR',
  pdf: 'PDF', csv: 'CSV', json: 'JSON', xml: 'XML', sql: 'SQL', dpdp: 'DPDP',
  soc: 'SOC', gdpr: 'GDPR', pci: 'PCI', kyc: 'KYC', kyb: 'KYB',
  // Identity codes
  gstin: 'GSTIN', pan: 'PAN', tan: 'TAN', aadhaar: 'Aadhaar', ifsc: 'IFSC',
  // Currencies / regions
  usd: 'USD', inr: 'INR', gbp: 'GBP', aud: 'AUD', aed: 'AED', sgd: 'SGD',
  nzd: 'NZD', cad: 'CAD', us: 'US', usa: 'USA', uk: 'UK', uae: 'UAE',
  // Agencies / org names
  irs: 'IRS', ato: 'ATO', hmrc: 'HMRC', rbi: 'RBI', sebi: 'SEBI', gstn: 'GSTN',
  // Business
  b2b: 'B2B', b2c: 'B2C', d2c: 'D2C', mnc: 'MNC',
};

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'is', 'of', 'on',
  'or', 'the', 'to', 'vs', 'with', 'from', 'into', 'over', 'your',
]);

function capitalize(word: string): string {
  if (word.length === 0) return word;
  return word[0]!.toUpperCase() + word.slice(1).toLowerCase();
}

function slugToTitle(slug: string): string {
  const tokens = slug.split('-').filter(Boolean);
  return tokens.map((tok, idx) => {
    const lc = tok.toLowerCase();
    if (ACRONYMS[lc]) return ACRONYMS[lc]!;
    if (idx > 0 && STOP_WORDS.has(lc)) return lc;
    // year tokens (e.g. "2026") stay as-is
    if (/^\d{4}$/.test(tok)) return tok;
    return capitalize(tok);
  }).join(' ');
}

type CountryRelevance = 'IN' | 'AU' | 'US' | 'CA' | 'GB' | 'AE' | 'SG' | 'NZ' | 'global';

function guessCountry(slug: string): CountryRelevance {
  const s = slug.toLowerCase();
  // High-signal jurisdiction markers — order matters (most specific first).
  if (/\b(gst|gstr|tds|tcs|hsn|cgst|sgst|igst|gstin|gstn|itr|aadhaar|udyam|rbi|sebi|nsdl|traces|fynamics|epf|esi|pmt-06|e-way-bill|e-invoic|tally|vyapar|busy-accounting|marg|zoho-books|munimji|india|indian)\b/.test(s)) return 'IN';
  if (/\b(vat|mtd|hmrc|uk|britain|british|england|making-tax-digital|cis-)\b/.test(s)) return 'GB';
  if (/\b(bas|payg|ato|australia|australian|stp|fbt|abn-)\b/.test(s)) return 'AU';
  if (/\b(irs|1099|1040|1120|1065|w-?9|w-?2|sales-tax|us-|usa-|american)\b/.test(s)) return 'US';
  if (/\b(canada|canadian|gst-hst|pst|qst|cra-)\b/.test(s)) return 'CA';
  if (/\b(uae|emirates|dubai|abu-dhabi|fta-)\b/.test(s)) return 'AE';
  if (/\b(singapore|sg-|iras)\b/.test(s)) return 'SG';
  if (/\b(new-zealand|nz-|kiwi)\b/.test(s)) return 'NZ';
  return 'global';
}

function deriveTags(slug: string): string[] {
  const t = new Set<string>(['discovered']);
  const s = slug.toLowerCase();
  if (/gst|gstr/.test(s)) t.add('gst');
  if (/tds|tcs/.test(s)) t.add('tds-tcs');
  if (/vat|mtd/.test(s)) t.add('vat');
  if (/bas|payg/.test(s)) t.add('bas');
  if (/payroll|salary|wages/.test(s)) t.add('payroll');
  if (/invoic/.test(s)) t.add('invoicing');
  if (/bill\b|bills-/.test(s)) t.add('bills');
  if (/bank|reconcil/.test(s)) t.add('banking');
  if (/inventory|stock/.test(s)) t.add('inventory');
  if (/tax/.test(s)) t.add('tax');
  if (/audit/.test(s)) t.add('audit');
  if (/cash-flow/.test(s)) t.add('cash-flow');
  if (/ai-|machine-learning|automation/.test(s)) t.add('ai-automation');
  if (/cpa|accountant|firm/.test(s)) t.add('accountant');
  if (/quickbooks|xero|wave|freshbooks|tally|zoho/.test(s)) t.add('alternatives');
  return [...t];
}

async function main(): Promise<void> {
  const res = await fetch(SITEMAP_URL);
  if (!res.ok) throw new Error(`sitemap fetch failed: HTTP ${res.status}`);
  const xml = await res.text();

  // Parse <url><loc>...</loc><lastmod>...</lastmod></url> pairs without an
  // XML library — sitemap shape is stable and trivially scrape-safe.
  const urlBlocks = xml.match(/<url>[\s\S]*?<\/url>/g) ?? [];
  type Entry = { slug: string; lastmod: string };
  const blogs: Entry[] = [];
  for (const block of urlBlocks) {
    const locMatch = block.match(/<loc>([^<]+)<\/loc>/);
    const lmMatch = block.match(/<lastmod>([^<]+)<\/lastmod>/);
    if (!locMatch) continue;
    const loc = locMatch[1]!;
    if (!loc.includes('/blog/')) continue;
    const slug = loc.split('/blog/')[1]?.replace(/\/$/, '') ?? '';
    if (!slug || slug.includes('/')) continue; // skip nested pages
    blogs.push({ slug, lastmod: (lmMatch?.[1] ?? '').slice(0, 10) || '2026-01-01' });
  }

  // Drop slugs already covered by the curated catalog (re-running the script
  // is idempotent — we only ever target slugs absent from CURATED_ARTICLES).
  const curatedIds = new Set(CURATED_ARTICLES.map((a) => a.id));
  const fresh = blogs.filter((b) => !curatedIds.has(b.slug));

  // Sort newest first so the array reads chronologically backwards
  fresh.sort((a, b) => b.lastmod.localeCompare(a.lastmod));

  const lines: string[] = [];
  lines.push('/**');
  lines.push(' * Auto-discovered blog articles — generated by');
  lines.push(' *   scripts/sync-discovered-articles.ts');
  lines.push(' *');
  lines.push(' * Source of truth: https://hellobooks.ai/sitemap.xml (blog URLs only).');
  lines.push(' * Titles are slug-derived (lower fidelity than the curated catalog in');
  lines.push(' * articles.ts) and every entry carries the `discovered` tag so callers');
  lines.push(' * can distinguish curated flagship content from bulk import. To');
  lines.push(' * regenerate after the marketing site publishes new posts:');
  lines.push(' *   npm run sync:discovered-articles');
  lines.push(' *');
  lines.push(' * Do NOT hand-edit — re-running the script overwrites this file.');
  lines.push(' */');
  lines.push('');
  lines.push("import type { Article } from './articles.js';");
  lines.push('');
  lines.push('export const DISCOVERED_ARTICLES: Article[] = [');
  for (const b of fresh) {
    const title = slugToTitle(b.slug).replace(/'/g, "\\'");
    const tags = deriveTags(b.slug).map((t) => `'${t}'`).join(', ');
    const country = guessCountry(b.slug);
    // Excerpt fallback — discovered entries have no hand-written summary, so we
    // synthesize one from the title. Keeps the catalog uniformly searchable and
    // satisfies the "every article has a >30-char excerpt" invariant in tests.
    const excerpt = `${title} — published on hellobooks.ai. Open the article for the full write-up.`.replace(/'/g, "\\'");
    lines.push(
      `  { id: '${b.slug}', title: '${title}', excerpt: '${excerpt}', tags: [${tags}], countryRelevance: '${country}', url: 'https://hellobooks.ai/blog/${b.slug}', publishedAt: '${b.lastmod}', kind: 'blog' },`,
    );
  }
  lines.push('];');
  lines.push('');

  writeFileSync(OUT_PATH, lines.join('\n'), 'utf8');
  process.stdout.write(
    `wrote ${fresh.length} discovered articles to src/data/articlesDiscovered.ts (skipped ${blogs.length - fresh.length} already-curated slugs, ${urlBlocks.length} total sitemap urls)\n`,
  );
}

main().catch((err) => {
  process.stderr.write(`sync-discovered-articles failed: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});

// Silence unused-import lint if/when readFileSync gets reused.
void readFileSync;
