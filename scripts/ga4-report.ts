/**
 * CLI for the optional GA4 Data API reader (src/reporting/).
 *
 * Prints read-only MCP usage reports — total events today, events by date, by
 * client label, by tool name, and bot event count — pulled live from GA4. No
 * database; nothing is written to disk. Run with tsx:
 *
 *   npm run report:ga4 -- --start 2026-06-01 --end today
 *   npm run report:ga4 -- --days 7 --json
 *
 * Requires the three Data API env vars (GA4_PROPERTY_ID, GA4_SA_CLIENT_EMAIL,
 * GA4_SA_PRIVATE_KEY). It does NOT require GA4_REPORTING_TOKEN — that gates only
 * the HTTP endpoint. See docs/MCP_ANALYTICS_REPORTING.md.
 */

import { reportingEnabled } from '../src/reporting/ga4DataApi.js';
import {
  botEventCount,
  eventsByClient,
  eventsByDate,
  eventsByTool,
  resolveDateRange,
  totalEventsToday,
  type LabelledCount,
} from '../src/reporting/mcpReports.js';

/** Minimal flag parser: --key value and boolean --flag. */
function parseArgs(argv: string[]): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith('--')) {
      out[key] = next;
      i++;
    } else {
      out[key] = true;
    }
  }
  return out;
}

function formatTable(title: string, rows: LabelledCount[]): string {
  if (rows.length === 0) return `${title}\n  (no data)\n`;
  const width = Math.max(...rows.map((r) => r.label.length), 5);
  const body = rows
    .map((r) => `  ${r.label.padEnd(width)}  ${r.count}`)
    .join('\n');
  return `${title}\n${body}\n`;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (!reportingEnabled()) {
    console.error(
      'GA4 reporting is not configured. Set GA4_PROPERTY_ID, GA4_SA_CLIENT_EMAIL,\n' +
        'and GA4_SA_PRIVATE_KEY (see docs/MCP_ANALYTICS_REPORTING.md).',
    );
    process.exit(1);
  }

  // --days N is a convenience for --start "NdaysAgo" --end today.
  const days = typeof args.days === 'string' ? Number(args.days) : undefined;
  const start =
    typeof args.start === 'string'
      ? args.start
      : days && Number.isFinite(days)
        ? `${days}daysAgo`
        : undefined;
  const end = typeof args.end === 'string' ? args.end : undefined;

  let range;
  try {
    range = resolveDateRange(start, end);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  const [totalToday, byDate, byClient, byTool, botEvents] = await Promise.all([
    totalEventsToday(),
    eventsByDate(range),
    eventsByClient(range),
    eventsByTool(range),
    botEventCount(range),
  ]);

  const report = { range, totalToday, byDate, byClient, byTool, botEvents };

  if (args.json === true || args.json === 'true') {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log(`MCP GA4 usage report  (${range.startDate} → ${range.endDate})\n`);
  console.log(`Total events today:   ${totalToday}`);
  console.log(`Bot events in range:  ${botEvents}\n`);
  console.log(formatTable('Events by date:', byDate));
  console.log(formatTable('Events by client:', byClient));
  console.log(formatTable('Events by tool:', byTool));
}

main().catch((err) => {
  // Errors from the reporting layer are credential-free by construction.
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(2);
});
