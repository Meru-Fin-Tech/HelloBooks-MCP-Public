/**
 * Quarterly drift check for src/data/complianceDeadlines.ts.
 *
 * For each catalog entry, fetch the authority `source` page and look for the
 * date(s) the catalog claims. Surfaces entries where a published date is no
 * longer present on the page — a strong (but not certain) signal the authority
 * moved it. False positives are expected: this script ALERTS, it does not
 * auto-patch the catalog. A human reviews each finding against the authority
 * page before bumping `lastReviewed`.
 *
 * Writes `drift-report.md` in the repo root and exits non-zero when any
 * drift finding is recorded, so the quarterly Jenkins job can fail the build
 * and surface the report (archived artifact + email-on-failure).
 *
 * Notes:
 *  - URLs are deduped: many GSTN entries share `gst.gov.in/`, so the page
 *    is fetched once and every deadline pointing at it scans the same text.
 *  - Entries without `annualDates` or `dueDay` (e.g. VAT MTD, STP, CRA
 *    GST/HST variants) are only reachability-checked.
 */

import { writeFileSync } from 'node:fs';
import { COMPLIANCE_DEADLINES } from '../src/data/complianceDeadlines.js';
import type { Deadline } from '../src/data/complianceDeadlines.js';

const USER_AGENT =
  process.env.USER_AGENT ??
  'HelloBooks-MCP-Public deadline-drift-checker (+https://github.com/Meru-Fin-Tech/HelloBooks-MCP-Public)';
const FETCH_TIMEOUT_MS = 30_000;
const POLITE_DELAY_MS = 500;
const NEAR_FORM_WINDOW = 400;

type Severity = 'drift' | 'fetch-failed';

interface Finding {
  id: string;
  country: string;
  form: string;
  source: string;
  severity: Severity;
  detail: string;
}

const MONTHS: Record<string, { short: string; long: string }> = {
  Jan: { short: 'Jan', long: 'January' },
  Feb: { short: 'Feb', long: 'February' },
  Mar: { short: 'Mar', long: 'March' },
  Apr: { short: 'Apr', long: 'April' },
  May: { short: 'May', long: 'May' },
  Jun: { short: 'Jun', long: 'June' },
  Jul: { short: 'Jul', long: 'July' },
  Aug: { short: 'Aug', long: 'August' },
  Sep: { short: 'Sep', long: 'September' },
  Oct: { short: 'Oct', long: 'October' },
  Nov: { short: 'Nov', long: 'November' },
  Dec: { short: 'Dec', long: 'December' },
};

function ordinal(day: number): string {
  const mod100 = day % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${day}th`;
  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}

export function dateVariants(date: string): string[] {
  // Input format guaranteed by the Deadline schema: "MMM D" e.g. "Jan 31".
  const match = /^([A-Za-z]{3})\s+(\d{1,2})$/.exec(date.trim());
  if (!match) return [date];
  const monthKey = match[1];
  const day = Number(match[2]);
  const m = MONTHS[monthKey];
  if (!m) return [date];

  const ord = ordinal(day);
  return Array.from(
    new Set([
      `${m.short} ${day}`,
      `${m.short}. ${day}`,
      `${m.long} ${day}`,
      `${m.long} ${ord}`,
      `${m.short} ${ord}`,
      `${day} ${m.short}`,
      `${day} ${m.short}.`,
      `${day} ${m.long}`,
      `${ord} ${m.short}`,
      `${ord} ${m.long}`,
      `${ord} of ${m.long}`,
      `${ord} of ${m.short}`,
    ]),
  );
}

export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

export function pageContainsDate(pageText: string, date: string): boolean {
  const variants = dateVariants(date);
  const lower = pageText.toLowerCase();
  return variants.some((v) => lower.includes(v.toLowerCase()));
}

export function pageContainsDueDayNearForm(
  pageText: string,
  form: string,
  dueDay: number,
): boolean {
  const haystack = pageText.toLowerCase();
  // Match the form name even when the authority page renders extra whitespace.
  const formNorm = form.toLowerCase().replace(/\s+/g, ' ').trim();
  const dayPatterns = [
    new RegExp(`\\b${dueDay}\\b`),
    new RegExp(`\\b${dueDay}${ordinal(dueDay).slice(String(dueDay).length)}\\b`),
  ];
  let cursor = 0;
  let found = false;
  while (cursor < haystack.length) {
    const idx = haystack.indexOf(formNorm, cursor);
    if (idx < 0) break;
    const start = Math.max(0, idx - NEAR_FORM_WINDOW);
    const end = Math.min(haystack.length, idx + formNorm.length + NEAR_FORM_WINDOW);
    const window = haystack.slice(start, end);
    if (dayPatterns.some((re) => re.test(window))) {
      found = true;
      break;
    }
    cursor = idx + formNorm.length;
  }
  return found;
}

async function fetchOnce(url: string): Promise<{ ok: boolean; status: number; text: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en',
      },
      redirect: 'follow',
    });
    const text = res.ok ? await res.text() : '';
    return { ok: res.ok, status: res.status, text };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchWithRetry(url: string): Promise<{ ok: boolean; status: number; text: string }> {
  try {
    const first = await fetchOnce(url);
    if (first.ok) return first;
    // One backoff retry on non-2xx; many authority pages are transiently flaky.
    await new Promise((r) => setTimeout(r, 2_000));
    return await fetchOnce(url);
  } catch (err) {
    return { ok: false, status: 0, text: String(err) };
  }
}

function checkDeadlineAgainstPage(d: Deadline, pageText: string): Finding[] {
  const findings: Finding[] = [];
  if (d.annualDates && d.annualDates.length > 0) {
    for (const date of d.annualDates) {
      if (!pageContainsDate(pageText, date)) {
        findings.push({
          id: d.id,
          country: d.country,
          form: d.form,
          source: d.source,
          severity: 'drift',
          detail: `annualDate "${date}" not found on source page (checked variants: ${dateVariants(
            date,
          ).join(', ')})`,
        });
      }
    }
  } else if (typeof d.dueDay === 'number') {
    if (!pageContainsDueDayNearForm(pageText, d.form, d.dueDay)) {
      findings.push({
        id: d.id,
        country: d.country,
        form: d.form,
        source: d.source,
        severity: 'drift',
        detail: `dueDay ${d.dueDay} not found within ±${NEAR_FORM_WINDOW} chars of "${d.form}" on source page`,
      });
    }
  }
  // No annualDates and no dueDay → entry is descriptive only (e.g. VAT MTD,
  // STP, CRA GST/HST variants). Reachability of the URL is the only signal.
  return findings;
}

function formatReport(
  findings: Finding[],
  okIds: string[],
  total: number,
  runDate: string,
): string {
  const lines: string[] = [];
  lines.push(`# Compliance deadline drift report — ${runDate}`);
  lines.push('');
  lines.push(
    `Scanned ${total} catalog entries. **${findings.length}** potential issue(s) found; **${okIds.length}** entries checked clean.`,
  );
  lines.push('');
  lines.push(
    'False positives are expected — authority sites reformat their guidance pages without changing the underlying dates, which can break the page-scan heuristic. Each finding below must be reconciled by a human against the authority source before any catalog change.',
  );
  lines.push('');
  lines.push(
    '**Do not** patch `src/data/complianceDeadlines.ts` directly from this report. If a finding is a real authority change, update the date AND bump `lastReviewed` for that entry by hand.',
  );
  lines.push('');

  const driftFindings = findings.filter((f) => f.severity === 'drift');
  const fetchFailures = findings.filter((f) => f.severity === 'fetch-failed');

  if (fetchFailures.length > 0) {
    lines.push('## Fetch failures');
    lines.push('');
    lines.push(
      'These authority pages could not be reached. That itself can indicate the authority moved the URL — verify manually.',
    );
    lines.push('');
    for (const f of fetchFailures) {
      lines.push(`- **${f.id}** (${f.country} — ${f.form}) — ${f.source}`);
      lines.push(`  - ${f.detail}`);
    }
    lines.push('');
  }

  if (driftFindings.length > 0) {
    lines.push('## Potential date drift');
    lines.push('');
    for (const f of driftFindings) {
      lines.push(`### ${f.id} (${f.country} — ${f.form})`);
      lines.push(`- **Source:** ${f.source}`);
      lines.push(`- **Issue:** ${f.detail}`);
      lines.push('');
    }
  }

  if (findings.length === 0) {
    lines.push('## Result');
    lines.push('');
    lines.push('All scanned entries still match their authority sources. No action required.');
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push(
    'Generated by `scripts/check-deadline-drift.ts` (`npm run check:deadline-drift`).',
  );
  return lines.join('\n');
}

async function main(): Promise<void> {
  const runDate = new Date().toISOString().slice(0, 10);
  const uniqueUrls = Array.from(new Set(COMPLIANCE_DEADLINES.map((d) => d.source)));
  const pageByUrl = new Map<string, { ok: boolean; status: number; text: string }>();

  for (const url of uniqueUrls) {
    const result = await fetchWithRetry(url);
    pageByUrl.set(
      url,
      result.ok ? { ...result, text: stripHtml(result.text) } : result,
    );
    await new Promise((r) => setTimeout(r, POLITE_DELAY_MS));
  }

  const findings: Finding[] = [];
  const okIds: string[] = [];
  for (const d of COMPLIANCE_DEADLINES) {
    const page = pageByUrl.get(d.source);
    if (!page || !page.ok) {
      findings.push({
        id: d.id,
        country: d.country,
        form: d.form,
        source: d.source,
        severity: 'fetch-failed',
        detail: `fetch returned status ${page?.status ?? 'unknown'}${
          page && page.status === 0 ? ` (${page.text.slice(0, 200)})` : ''
        }`,
      });
      continue;
    }
    const entryFindings = checkDeadlineAgainstPage(d, page.text);
    if (entryFindings.length === 0) {
      okIds.push(d.id);
    } else {
      findings.push(...entryFindings);
    }
  }

  const report = formatReport(findings, okIds, COMPLIANCE_DEADLINES.length, runDate);
  writeFileSync('drift-report.md', report, 'utf8');

  if (findings.length === 0) {
    console.log(`deadline drift check OK (${COMPLIANCE_DEADLINES.length} entries).`);
    process.exit(0);
  }

  console.error(
    `deadline drift check FAILED: ${findings.length} finding(s) across ${COMPLIANCE_DEADLINES.length} entries. See drift-report.md.`,
  );
  for (const f of findings) {
    console.error(`  - [${f.severity}] ${f.id} (${f.country}): ${f.detail}`);
  }
  process.exit(1);
}

// Only run when invoked directly — the pure helpers are exported for tests.
const invokedDirectly =
  import.meta.url === `file://${process.argv[1]}` ||
  import.meta.url.endsWith(process.argv[1] ?? '') ||
  process.argv[1]?.endsWith('check-deadline-drift.ts');

if (invokedDirectly) {
  main().catch((err) => {
    console.error('deadline drift check crashed:', err);
    process.exit(2);
  });
}
