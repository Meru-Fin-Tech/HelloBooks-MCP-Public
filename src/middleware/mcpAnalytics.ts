/**
 * Per-request analytics for the /mcp surface.
 *
 * Mounted only on /mcp (see src/http.ts). Emits one anonymous usage event per
 * HTTP request — plus derived events for tool calls, bot visits, and errors —
 * through the existing GA4 sink (src/analytics.ts). Fire-and-forget and wrapped
 * in try/catch: a telemetry fault can never delay, alter, or fail an MCP call.
 *
 * Privacy (see docs/MCP_ANALYTICS.md):
 *   - NO request body, NO tool argument values, NO auth headers, NO IP address.
 *   - Only HTTP method, path, JSON-RPC method name, tool *name*, status code,
 *     latency, a derived User-Agent label, the origin/referer *host* (never the
 *     full URL/path/query), and the Cloudflare country code are sent.
 *
 * The event-building logic is a pure function (`buildMcpAnalyticsEvents`) so it
 * is unit-testable without express; the middleware is a thin adapter that
 * gathers request context on `res.finish` and forwards each event to `track`.
 */

import type { NextFunction, Request, Response } from 'express';
import { track, type AnalyticsParams } from '../analytics.js';
import { classifyUserAgent } from '../lib/clientDetection.js';

/** Plain, framework-free snapshot of one completed MCP request. */
export interface McpAnalyticsContext {
  path: string;
  httpMethod: string;
  userAgent: string;
  origin?: string;
  referer?: string;
  rpcMethod: string;
  toolName: string;
  statusCode: number;
  responseTimeMs: number;
  sessionId: string;
  country: string;
}

/** One GA4 event ready for `track(name, params, clientId)`. */
export interface AnalyticsEvent {
  name: string;
  params: AnalyticsParams;
  clientId: string;
}

/** Host-only extraction — drops path/query so no URL detail leaks to GA4. */
function hostOf(value: string | undefined): string {
  if (!value) return '';
  try {
    return new URL(value).host;
  } catch {
    return '';
  }
}

/** JSON-RPC method name from a parsed body; '' for batches / malformed input. */
export function rpcMethodOf(body: unknown): string {
  if (body && typeof body === 'object' && !Array.isArray(body)) {
    const method = (body as { method?: unknown }).method;
    if (typeof method === 'string') return method;
  }
  return '';
}

/** Tool name from a `tools/call` body — never the arguments. */
export function toolNameOf(body: unknown): string {
  if (body && typeof body === 'object' && !Array.isArray(body)) {
    const params = (body as { params?: unknown }).params;
    if (params && typeof params === 'object' && !Array.isArray(params)) {
      const name = (params as { name?: unknown }).name;
      if (typeof name === 'string') return name;
    }
  }
  return '';
}

/**
 * Build the analytics events for one completed MCP request. Pure — no I/O, no
 * `track` — so it is trivially unit-testable. Always returns at least the
 * `mcp_request` event, plus `mcp_tool_call` / `mcp_bot_visit` / `mcp_error`
 * when the request warrants them.
 */
export function buildMcpAnalyticsEvents(ctx: McpAnalyticsContext): AnalyticsEvent[] {
  const { client, bot, isBot } = classifyUserAgent(ctx.userAgent);
  const success = ctx.statusCode < 400;
  const isToolCall = ctx.rpcMethod === 'tools/call';

  const params: AnalyticsParams = {
    path: ctx.path,
    http_method: ctx.httpMethod,
    rpc_method: ctx.rpcMethod || '(none)',
    tool_name: isToolCall ? ctx.toolName || '(unknown)' : '',
    status: ctx.statusCode,
    success,
    response_time_ms: ctx.responseTimeMs,
    client,
    bot,
    is_bot: isBot,
    origin_host: hostOf(ctx.origin),
    referer_host: hostOf(ctx.referer),
    country: ctx.country,
  };

  const clientId = ctx.sessionId || 'anon';
  const events: AnalyticsEvent[] = [{ name: 'mcp_request', params, clientId }];

  if (isToolCall) events.push({ name: 'mcp_tool_call', params, clientId });
  if (isBot) events.push({ name: 'mcp_bot_visit', params, clientId });
  if (!success) {
    events.push({
      name: 'mcp_error',
      params: { ...params, error_status: ctx.statusCode },
      clientId,
    });
  }

  return events;
}

/** Coerce an express response-header value to a single string. */
function headerString(value: string | number | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value == null ? '' : String(value);
}

/**
 * Express middleware — mount on /mcp only (see src/http.ts).
 *
 * Registers a `finish` listener so the status code and latency are final, then
 * emits the events for the request. Everything inside the listener is wrapped
 * in try/catch; `track` is itself fire-and-forget (never awaited, never throws).
 */
export function mcpAnalytics(req: Request, res: Response, next: NextFunction): void {
  const startedAt = Date.now();

  res.on('finish', () => {
    try {
      // On `initialize` the session id is minted during the request and lives
      // on the response header, not the request header — fall back to it so the
      // very first call of a session is attributed to the right client_id.
      const sessionId =
        req.header('mcp-session-id') ||
        headerString(res.getHeader('mcp-session-id')) ||
        'anon';

      const ctx: McpAnalyticsContext = {
        path: req.path,
        httpMethod: req.method,
        userAgent: req.header('user-agent') ?? '',
        origin: req.header('origin'),
        referer: req.header('referer'),
        rpcMethod: rpcMethodOf(req.body),
        toolName: toolNameOf(req.body),
        statusCode: res.statusCode,
        responseTimeMs: Date.now() - startedAt,
        sessionId,
        country: req.header('cf-ipcountry') ?? 'unknown',
      };

      for (const ev of buildMcpAnalyticsEvents(ctx)) {
        track(ev.name, ev.params, ev.clientId);
      }
    } catch {
      /* telemetry is best-effort — never let it break an MCP request */
    }
  });

  next();
}
