/**
 * Protected internal endpoint for the GA4 Data API reports (./mcpReports.ts).
 *
 * Mounted by src/http.ts ONLY when both conditions hold:
 *   1. Reporting is configured (the three Data API env vars — see ga4DataApi).
 *   2. A bearer token is set in GA4_REPORTING_TOKEN.
 * Otherwise `createReportingRouter()` returns null and no route exists at all —
 * the feature is invisible and unreachable on a default deploy.
 *
 * Auth: every request must present the token as `Authorization: Bearer <token>`
 * or an `x-reporting-token: <token>` header. Comparison is timing-safe. The
 * token, the service-account key, and the GA4 access token are never returned in
 * any response or error.
 */

import { Router, type Request, type Response } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { reportingEnabled } from './ga4DataApi.js';
import {
  botEventCount,
  eventsByClient,
  eventsByDate,
  eventsByTool,
  resolveDateRange,
  totalEventsToday,
} from './mcpReports.js';

/** Constant-time string comparison that tolerates differing lengths. */
export function tokensMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Extract a presented token from the Authorization or x-reporting-token header. */
export function presentedToken(req: Request): string {
  const auth = req.header('authorization') ?? '';
  const bearer = /^Bearer\s+(.+)$/i.exec(auth);
  if (bearer) return bearer[1].trim();
  return (req.header('x-reporting-token') ?? '').trim();
}

/** First query value as a trimmed string, or undefined. */
function queryStr(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) return value.trim();
  return undefined;
}

/** Turn a thrown error into a safe, credential-free message. */
function safeMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Unknown error';
}

/**
 * Build the reporting router, or `null` when the feature is disabled.
 *
 * @param token the expected bearer token (defaults to GA4_REPORTING_TOKEN).
 */
export function createReportingRouter(
  token: string | undefined = process.env.GA4_REPORTING_TOKEN?.trim(),
): Router | null {
  if (!token || !reportingEnabled()) return null;

  const router = Router();

  // Auth guard for every route on this router.
  router.use((req: Request, res: Response, next) => {
    const presented = presentedToken(req);
    if (!presented || !tokensMatch(presented, token)) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }
    next();
  });

  // Combined report. Query params: ?start=YYYY-MM-DD&end=YYYY-MM-DD
  // (GA4 relative tokens like `today`, `7daysAgo` are also accepted).
  router.get('/', async (req: Request, res: Response) => {
    let range;
    try {
      range = resolveDateRange(queryStr(req.query.start), queryStr(req.query.end));
    } catch (err) {
      res.status(400).json({ error: safeMessage(err) });
      return;
    }

    try {
      const [totalToday, byDate, byClient, byTool, botEvents] = await Promise.all([
        totalEventsToday(),
        eventsByDate(range),
        eventsByClient(range),
        eventsByTool(range),
        botEventCount(range),
      ]);
      res.json({ range, totalToday, byDate, byClient, byTool, botEvents });
    } catch (err) {
      // 502: we reached our service fine, but the upstream GA4 call failed
      // (e.g. custom dimensions not registered, or property/permission issue).
      res.status(502).json({ error: safeMessage(err) });
    }
  });

  return router;
}
