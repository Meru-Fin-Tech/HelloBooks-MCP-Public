/**
 * Shared blog-sitemap logic — used by BOTH:
 *   - the offline generator `scripts/sync-discovered-articles.ts` (bakes
 *     src/data/articlesDiscovered.ts at build/commit time), and
 *   - the runtime federation `src/articlesFeed.ts` (overlays newly-published
 *     posts onto the baked catalog live, no rebuild).
 *
 * Keeping the slug->Article derivation in one place means the two paths can
 * never disagree about how a blog URL becomes a catalog entry.
 *
 * Source of truth for the URL set: https://hellobooks.ai/sitemap.xml (blog URLs).
 */

import type { Article, CountryRelevance } from '../data/articles.js';

export const SITE_ROOT = 'https://hellobooks.ai';
export const DEFAULT_SITEMAP_URL = `${SITE_ROOT}/sitemap.xml`;

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

/** Human-readable title from a hyphenated blog slug. */
export function slugToTitle(slug: string): string {
  const tokens = slug.split('-').filter(Boolean);
  return tokens.map((tok, idx) => {
    const lc = tok.toLowerCase();
    if (ACRONYMS[lc]) return ACRONYMS[lc]!;
    if (idx > 0 && STOP_WORDS.has(lc)) return lc;
    if (/^\d{4}$/.test(tok)) return tok; // year tokens stay as-is
    return capitalize(tok);
  }).join(' ');
}

/** Best-effort jurisdiction inference from slug keywords. */
export function guessCountry(slug: string): CountryRelevance {
  const s = slug.toLowerCase();
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

/** Derive lowercase topic tags from a slug. Always includes `discovered`. */
export function deriveTags(slug: string): string[] {
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

export interface BlogEntry {
  slug: string;
  lastmod: string; // YYYY-MM-DD
}

/**
 * Extract `/blog/<slug>` entries from a sitemap XML string. No XML library —
 * the sitemap shape is stable and trivially scrape-safe. Nested paths under
 * /blog/ (e.g. category indexes) are skipped so only leaf posts are captured.
 */
export function parseBlogEntries(xml: string): BlogEntry[] {
  const urlBlocks = xml.match(/<url>[\s\S]*?<\/url>/g) ?? [];
  const out: BlogEntry[] = [];
  for (const block of urlBlocks) {
    const locMatch = block.match(/<loc>([^<]+)<\/loc>/);
    const lmMatch = block.match(/<lastmod>([^<]+)<\/lastmod>/);
    if (!locMatch) continue;
    const loc = locMatch[1]!;
    if (!loc.includes('/blog/')) continue;
    const slug = loc.split('/blog/')[1]?.replace(/\/$/, '') ?? '';
    if (!slug || slug.includes('/')) continue; // skip nested pages
    out.push({ slug, lastmod: (lmMatch?.[1] ?? '').slice(0, 10) || '2026-01-01' });
  }
  return out;
}

/** Turn a discovered blog entry into a catalog Article (slug-derived title). */
export function blogEntryToArticle(entry: BlogEntry): Article {
  const title = slugToTitle(entry.slug);
  return {
    id: entry.slug,
    title,
    excerpt: `${title} — published on hellobooks.ai. Open the article for the full write-up.`,
    tags: deriveTags(entry.slug),
    countryRelevance: guessCountry(entry.slug),
    url: `${SITE_ROOT}/blog/${entry.slug}`,
    publishedAt: entry.lastmod,
    kind: 'blog',
  };
}

/** Fetch + parse the live sitemap. Throws on network / HTTP error (callers decide fallback). */
export async function fetchBlogEntries(url: string, timeoutMs: number): Promise<BlogEntry[]> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { accept: 'application/xml,text/xml,*/*' },
  });
  if (!res.ok) throw new Error(`sitemap HTTP ${res.status}`);
  return parseBlogEntries(await res.text());
}
