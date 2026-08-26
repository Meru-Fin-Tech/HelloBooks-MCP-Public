/**
 * MCP usage reports built on the GA4 Data API reader (./ga4DataApi.ts).
 *
 * Answers the operational questions the writer feeds GA4 with — total volume,
 * volume over time, which AI clients, which tools, how much bot traffic — by
 * reading the four MCP event names back out of GA4. No database; nothing is
 * persisted locally. Every function is a no-op-free thin wrapper over
 * `runReport`, which itself throws when reporting is not configured.
 *
 * The `client` and `tool_name` breakdowns read GA4 *custom dimensions*
 * (`customEvent:client`, `customEvent:tool_name`). Those event-scoped custom
 * dimensions must be registered once in GA4 Admin — see
 * docs/MCP_ANALYTICS_REPORTING.md. The volume/date/bot reports need no custom
 * dimensions and work immediately.
 */

import {
  parseRows,
  runReport,
  type DateRange,
  type RunReportRequest,
} from './ga4DataApi.js';

/**
 * The MCP event names emitted by src/middleware/mcpAnalytics.ts. Kept here as
 * the read-side mirror so this reporting code never imports — and so can never
 * accidentally alter — the emission path. Keep in sync with the middleware.
 */
export const MCP_EVENT_NAMES = [
  'mcp_request',
  'mcp_tool_call',
  'mcp_bot_visit',
  'mcp_error',
] as const;

/** The event name that represents a single bot visit. */
export const BOT_EVENT_NAME = 'mcp_bot_visit';

/**
 * Accept either a YYYY-MM-DD calendar date or a GA4 relative date token
 * (`today`, `yesterday`, `NdaysAgo`). Rejects everything else so untrusted
 * query input can't be smuggled into the report request.
 */
const DATE_TOKEN = /^(today|yesterday|\d{1,4}daysAgo|\d{4}-\d{2}-\d{2})$/;

/** True if `value` is a valid GA4 date token. */
export function isValidDateToken(value: string): boolean {
  return DATE_TOKEN.test(value.trim());
}

/**
 * Validate and normalise a {start,end} date range. Throws on invalid input.
 * Defaults to the last 28 days (inclusive) when a bound is omitted.
 */
export function resolveDateRange(start?: string, end?: string): DateRange {
  const startDate = (start ?? '27daysAgo').trim();
  const endDate = (end ?? 'today').trim();
  if (!isValidDateToken(startDate)) {
    throw new Error(`Invalid start date: "${startDate}".`);
  }
  if (!isValidDateToken(endDate)) {
    throw new Error(`Invalid end date: "${endDate}".`);
  }
  return { startDate, endDate };
}

/** Dimension filter restricting a report to the four MCP event names. */
function mcpEventFilter(names: readonly string[] = MCP_EVENT_NAMES): unknown {
  return {
    filter: {
      fieldName: 'eventName',
      inListFilter: { values: [...names] },
    },
  };
}

/** Sum the single eventCount metric across all rows of a report. */
function sumEventCount(report: Awaited<ReturnType<typeof runReport>>): number {
  return parseRows(report).reduce((total, row) => total + (row.metrics[0] ?? 0), 0);
}

/** A labelled count, e.g. { label: 'list_plans', count: 42 }. */
export interface LabelledCount {
  label: string;
  count: number;
}

/** Total MCP events (all four names) for today. */
export async function totalEventsToday(): Promise<number> {
  const report = await runReport({
    dateRanges: [{ startDate: 'today', endDate: 'today' }],
    metrics: [{ name: 'eventCount' }],
    dimensionFilter: mcpEventFilter(),
  });
  return sumEventCount(report);
}

/** MCP events per calendar day across the range, ascending by date. */
export async function eventsByDate(range: DateRange): Promise<LabelledCount[]> {
  const req: RunReportRequest = {
    dateRanges: [range],
    dimensions: [{ name: 'date' }],
    metrics: [{ name: 'eventCount' }],
    dimensionFilter: mcpEventFilter(),
    orderBys: [{ dimension: { dimensionName: 'date' } }],
  };
  const report = await runReport(req);
  return parseRows(report).map((row) => ({
    label: row.dimensions[0] ?? '',
    count: row.metrics[0] ?? 0,
  }));
}

/**
 * MCP events broken down by AI-client label (`customEvent:client`), descending
 * by count. Requires the `client` custom dimension to be registered in GA4.
 */
export async function eventsByClient(range: DateRange): Promise<LabelledCount[]> {
  const report = await runReport({
    dateRanges: [range],
    dimensions: [{ name: 'customEvent:client' }],
    metrics: [{ name: 'eventCount' }],
    dimensionFilter: mcpEventFilter(),
    orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
  });
  return parseRows(report).map((row) => ({
    label: row.dimensions[0] || '(not set)',
    count: row.metrics[0] ?? 0,
  }));
}

/**
 * Tool-call volume broken down by tool name (`customEvent:tool_name`),
 * descending by count. Scoped to `mcp_tool_call` only, since `tool_name` is
 * only populated on that event. Requires the `tool_name` custom dimension.
 */
export async function eventsByTool(range: DateRange): Promise<LabelledCount[]> {
  const report = await runReport({
    dateRanges: [range],
    dimensions: [{ name: 'customEvent:tool_name' }],
    metrics: [{ name: 'eventCount' }],
    dimensionFilter: mcpEventFilter(['mcp_tool_call']),
    orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
  });
  return parseRows(report).map((row) => ({
    label: row.dimensions[0] || '(not set)',
    count: row.metrics[0] ?? 0,
  }));
}

/** Bot visit count (mcp_bot_visit events) across the range. */
export async function botEventCount(range: DateRange): Promise<number> {
  const report = await runReport({
    dateRanges: [range],
    metrics: [{ name: 'eventCount' }],
    dimensionFilter: mcpEventFilter([BOT_EVENT_NAME]),
  });
  return sumEventCount(report);
}

/** Shape returned by the combined report (endpoint + CLI). */
export interface McpReport {
  range: DateRange;
  totalToday: number;
  byDate: LabelledCount[];
  byClient: LabelledCount[];
  byTool: LabelledCount[];
  botEvents: number;
}

/**
 * Fetch all reports for a range in parallel. `byClient`/`byTool` depend on
 * registered custom dimensions; if those aren't set up yet the whole call
 * fails — callers wanting partial results should call the individual functions.
 */
export async function fullReport(range: DateRange): Promise<McpReport> {
  const [totalToday, byDate, byClient, byTool, botEvents] = await Promise.all([
    totalEventsToday(),
    eventsByDate(range),
    eventsByClient(range),
    eventsByTool(range),
    botEventCount(range),
  ]);
  return { range, totalToday, byDate, byClient, byTool, botEvents };
}
