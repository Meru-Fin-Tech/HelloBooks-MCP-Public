/**
 * Deadline-catalog drift detector.
 *
 * For each unique `source` URL in COMPLIANCE_DEADLINES, fetch the authority
 * page once and check that the date strings the catalog claims (annualDates,
 * dueDay) still appear somewhere in the page text. This catches the most
 * common rot: an authority republishes a new FY page with new dates and the
 * catalog quietly goes stale.
 *
 * Designed to run on a quarterly cron (Jan 1 / Apr 1 / Jul 1 / Oct 1) — most
 * authorities publish next-FY dates 1–3 months ahead of FY start.
 *
 * What this is NOT:
 *   - It does not auto-patch the catalog. False positives are likely (some
 *     authority pages are JS-rendered or use non-English date words), so all
 *     drift is reported for human review, never auto-applied.
 *   - It does not update `lastReviewed` — that field must remain human-touched
 *     so it carries real signal about who actually re-confirmed.
 *
 * Exit code: 0 = no drift detected, 1 = at least one suspicious entry.
 * CI can wrap exit-1 with `gh issue create` to alert maintainers.
 *
 * Run locally: `npm run audit:deadline-sources`
 * Run with verbose per-URL output: `VERBOSE=1 npm run audit:deadline-sources`
 */

import { COMPLIANCE_DEADLINES } from '../src/data/complianceDeadlines.js';
import type { Deadline } from '../src/data/complianceDeadlines.js';

const VERBOSE = process.env.VERBOSE === '1';
const TIMEOUT_MS = 20_000;

const MONTH_LONG: Record<string, string> = {
  Jan: 'January', Feb: 'February', Mar: 'March', Apr: 'April',
  May: 'May', Jun: 'June', Jul: 'July', Aug: 'August',
  Sep: 'September', Oct: 'October', Nov: 'November', Dec: 'December',
};

/**
 * Build the set of literal strings we expect to find in the page text for a
 * given "Mon D" date. We accept several common formats authorities use so the
 * check stays low-false-positive without being so loose it always passes.
 *
 *   "Jan 31" → ["Jan 31", "January 31", "31 January", "31 Jan", "31st January"]
 */
export function dateVariants(date: string): string[] {
  const m = date.match(/^([A-Z][a-z]{2}) (\d{1,2})$/);
  if (!m) return [date];
  const [, mon, dayStr] = m;
  const day = parseInt(dayStr!, 10);
  const long = MONTH_LONG[mon!] ?? mon!;
  const suffix = (n: number): string => {
    if (n >= 11 && n <= 13) return 'th';
    const last = n % 10;
    return last === 1 ? 'st' : last === 2 ? 'nd' : last === 3 ? 'rd' : 'th';
  };
  return [
    `${mon} ${day}`,
    `${long} ${day}`,
    `${day} ${mon}`,
    `${day} ${long}`,
    `${day}${suffix(day)} ${long}`,
  ];
}

interface Finding {
  deadline: Deadline;
  reason: string;
}

async function fetchText(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: {
        // Some authority sites 403 default node fetch UA.
        'User-Agent':
          'HelloBooks-MCP-DeadlineDriftBot/1.0 (+https://hellobooks.ai/mcp)',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Crude HTML → text. We don't need a parser — we just want the visible date
 * strings, and substring match is forgiving of leftover tag fragments.
 */
export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ');
}

export function checkDeadline(d: Deadline, pageText: string): Finding | null {
  // 1. Form name must appear on the source page. If it doesn't, the URL is
  //    likely wrong or the page has moved — strong drift signal.
  // We tolerate hyphen / space variants ("GSTR-3B" vs "GSTR 3B").
  const formVariants = new Set([
    d.form,
    d.form.replace(/-/g, ' '),
    d.form.replace(/\s+/g, '-'),
    d.form.replace(/\s*\(.*?\)\s*$/, ''), // strip parenthetical suffix
  ]);
  const formHit = [...formVariants].some((v) => pageText.includes(v));
  if (!formHit) {
    return {
      deadline: d,
      reason: `form name "${d.form}" not found on ${d.source} — URL may have moved or page restructured`,
    };
  }

  // 2. For annualDates entries, at least one variant of each date must appear.
  if (d.annualDates && d.annualDates.length > 0) {
    const missing: string[] = [];
    for (const date of d.annualDates) {
      const hit = dateVariants(date).some((v) => pageText.includes(v));
      if (!hit) missing.push(date);
    }
    if (missing.length > 0) {
      return {
        deadline: d,
        reason: `expected date(s) ${missing.map((m) => `"${m}"`).join(', ')} not found on ${d.source} — authority may have changed the cut-off`,
      };
    }
  }

  // 3. For dueDay entries, look for a near-match like "<dueDay>th of the
  //    month" / "by the <dueDay>th". Many authorities phrase this loosely
  //    so we cast a wide net.
  if (typeof d.dueDay === 'number') {
    const dd = d.dueDay;
    const suffix = (n: number): string => {
      if (n >= 11 && n <= 13) return 'th';
      const last = n % 10;
      return last === 1 ? 'st' : last === 2 ? 'nd' : last === 3 ? 'rd' : 'th';
    };
    const patterns = [
      `${dd}th`, `${dd}st`, `${dd}nd`, `${dd}rd`, // any ordinal
      `${dd}${suffix(dd)}`,                        // correct ordinal
      ` ${dd} `,                                   // bare number with spaces
    ];
    const hit = patterns.some((p) => pageText.includes(p));
    if (!hit) {
      return {
        deadline: d,
        reason: `dueDay ${dd} not referenced on ${d.source} — authority may have changed monthly cut-off`,
      };
    }
  }

  return null;
}

async function main(): Promise<void> {
  // Group deadlines by URL so we fetch each authority page only once.
  const byUrl = new Map<string, Deadline[]>();
  for (const d of COMPLIANCE_DEADLINES) {
    const list = byUrl.get(d.source) ?? [];
    list.push(d);
    byUrl.set(d.source, list);
  }

  console.log(
    `Auditing ${COMPLIANCE_DEADLINES.length} deadline entries across ${byUrl.size} authority URLs…`,
  );

  const findings: Finding[] = [];
  const unreachable: string[] = [];

  for (const [url, deadlines] of byUrl) {
    if (VERBOSE) console.log(`  → fetching ${url}`);
    const html = await fetchText(url);
    if (html === null) {
      unreachable.push(url);
      // Unreachable is not auto-drift — could be transient. We log loudly but
      // do not fail CI just because gst.gov.in had a bad 30 seconds.
      console.warn(`  ! unreachable: ${url} (${deadlines.length} entries skipped)`);
      continue;
    }
    const text = stripHtml(html);
    for (const d of deadlines) {
      const f = checkDeadline(d, text);
      if (f) findings.push(f);
    }
  }

  console.log('');
  console.log(`Audit complete: ${findings.length} drift finding(s), ${unreachable.length} unreachable URL(s).`);

  if (findings.length > 0) {
    console.log('');
    console.log('Drift findings (REVIEW MANUALLY — do not auto-patch):');
    for (const f of findings) {
      console.log(`  [${f.deadline.country}] ${f.deadline.form} (id=${f.deadline.id})`);
      console.log(`      ${f.reason}`);
      console.log(`      lastReviewed: ${f.deadline.lastReviewed}`);
    }
    process.exit(1);
  }

  console.log('No drift detected.');
}

// Only run on direct invocation (npm run audit:deadline-sources), not on
// import from a test file.
const invokedDirectly = (() => {
  const arg = process.argv[1] ?? '';
  return arg.endsWith('audit-deadline-sources.ts') || arg.endsWith('audit-deadline-sources.js');
})();

if (invokedDirectly) {
  main().catch((err) => {
    console.error('audit-deadline-sources crashed:', err);
    process.exit(2);
  });
}
