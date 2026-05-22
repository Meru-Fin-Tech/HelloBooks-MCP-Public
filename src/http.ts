/**
 * HTTP transport entry point.
 *
 * Exposes the MCP server over Streamable HTTP at POST /mcp and SSE GET /mcp,
 * with two layers of rate limiting:
 *   1. Per-IP global limiter (catches scrapers / runaway clients).
 *   2. Per-session limiter (caps single-session requests to a reasonable bound).
 *
 * Health-check at /health, transport-agnostic JSON probe at /info.
 *
 * Discovery surface (see ./discovery.ts) at:
 *   /                            HTML landing + JSON-LD
 *   /.well-known/agent.json      A2A protocol agent card
 *   /.well-known/ai-plugin.json  OpenAI plugin manifest
 *   /.well-known/mcp.json        MCP discovery hint
 *   /openapi.json                OpenAPI 3.1
 *   /llms.txt                    llmstxt.org index
 *   /catalog.json                Machine-readable tool/resource catalog
 *   /changelog.json              Recent catalog changes
 *   /sitemap.xml                 Sitemap with <lastmod>
 *   /robots.txt                  AI-bot allow-list
 *   /feed.xml                    RSS 2.0 of catalog changes
 *
 * No authentication — by design. The catalog is public-only data.
 */

import express, { type Request, type Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import { randomUUID } from 'node:crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createServer } from './server.js';
import {
  generateAgentCard,
  generateAiPluginManifest,
  generateCatalogJson,
  generateChangelogJson,
  generateLandingHtml,
  generateLlmsTxt,
  generateMcpDiscovery,
  generateOpenApi,
  generateRobotsTxt,
  generateRssFeed,
  generateSitemap,
} from './discovery.js';

const PORT = Number(process.env.PORT ?? 8080);
const HOST = process.env.HOST ?? '0.0.0.0';

// ---------------------------------------------------------------------------
// Rate limits
// ---------------------------------------------------------------------------

// Default keyGenerator in v7+ handles IPv4/IPv6 correctly.
const ipLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120, // 120 requests / minute / IP
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP. Limit: 120/min.' },
});

const sessionLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60, // 60 requests / minute / session
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests on this session. Limit: 60/min.' },
  keyGenerator: (req) => {
    const sid = req.header('mcp-session-id');
    // When no session id yet, fall back to IP via the request socket; the IP
    // limiter above already covers the IPv6-correct keying.
    return sid ?? `nosession:${req.ip ?? 'unknown'}`;
  },
});

// ---------------------------------------------------------------------------
// Transport wiring
// ---------------------------------------------------------------------------

interface SessionEntry {
  transport: StreamableHTTPServerTransport;
  createdAt: number;
}
const sessions = new Map<string, SessionEntry>();

// Reap idle sessions (>30 min) so memory doesn't grow unbounded.
const SESSION_TTL_MS = 30 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [id, entry] of sessions) {
    if (now - entry.createdAt > SESSION_TTL_MS) {
      entry.transport.close().catch(() => {});
      sessions.delete(id);
    }
  }
}, 5 * 60 * 1000).unref();

async function handleMcpRequest(req: Request, res: Response): Promise<void> {
  const sid = req.header('mcp-session-id');
  let entry = sid ? sessions.get(sid) : undefined;

  if (!entry) {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (id) => {
        sessions.set(id, { transport, createdAt: Date.now() });
      },
    });
    transport.onclose = () => {
      if (transport.sessionId) sessions.delete(transport.sessionId);
    };
    const server = createServer();
    await server.connect(transport);
    entry = { transport, createdAt: Date.now() };
  }

  await entry.transport.handleRequest(req, res, req.body);
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1); // accurate req.ip behind a load balancer
app.use(express.json({ limit: '256kb' })); // requests are tiny — cap aggressively

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', sessions: sessions.size });
});

app.get('/info', (_req, res) => {
  res.json({
    name: 'hellobooks-mcp-public',
    version: '0.7.0',
    description:
      'Public read-only MCP server for HelloBooks plans, integrations, country support, compliance, competitors, deadlines, local payment methods, feature catalog data, published articles, and product videos.',
    transport: { http: '/mcp', sse: '/mcp' },
    install: 'claude mcp add --transport http hellobooks https://agents.hellobooks.ai/mcp',
    docs: 'https://hellobooks.ai/mcp',
    repository: 'https://github.com/Meru-Fin-Tech/HelloBooks-MCP-Public',
    discovery: {
      landing: '/',
      agent_card: '/.well-known/agent.json',
      ai_plugin: '/.well-known/ai-plugin.json',
      mcp: '/.well-known/mcp.json',
      openapi: '/openapi.json',
      llms_txt: '/llms.txt',
      catalog: '/catalog.json',
      changelog: '/changelog.json',
      sitemap: '/sitemap.xml',
      robots: '/robots.txt',
      rss: '/feed.xml',
    },
  });
});

// ---------------------------------------------------------------------------
// Discovery surface
// ---------------------------------------------------------------------------
//
// Static-by-construction generators in ./discovery.ts. Cache headers tuned so
// bots see fresh data within 15 minutes of a deploy and edges stay warm for a
// day. No rate-limiting on these — they are pure-function GETs with no per-
// request state.

const CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=900, stale-while-revalidate=86400',
} as const;

function sendText(res: Response, body: string, contentType: string): void {
  res.setHeader('Content-Type', contentType);
  for (const [k, v] of Object.entries(CACHE_HEADERS)) res.setHeader(k, v);
  res.send(body);
}

function sendJson(res: Response, body: unknown): void {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  for (const [k, v] of Object.entries(CACHE_HEADERS)) res.setHeader(k, v);
  res.send(JSON.stringify(body, null, 2));
}

app.get('/', (_req, res) => sendText(res, generateLandingHtml(), 'text/html; charset=utf-8'));
app.get('/llms.txt', (_req, res) => sendText(res, generateLlmsTxt(), 'text/plain; charset=utf-8'));
app.get('/robots.txt', (_req, res) => sendText(res, generateRobotsTxt(), 'text/plain; charset=utf-8'));
app.get('/sitemap.xml', (_req, res) => sendText(res, generateSitemap(), 'application/xml; charset=utf-8'));
app.get('/feed.xml', (_req, res) => sendText(res, generateRssFeed(), 'application/rss+xml; charset=utf-8'));
app.get('/openapi.json', (_req, res) => sendJson(res, generateOpenApi()));
app.get('/catalog.json', (_req, res) => sendJson(res, generateCatalogJson()));
app.get('/changelog.json', (_req, res) => sendJson(res, generateChangelogJson()));
app.get('/.well-known/agent.json', (_req, res) => sendJson(res, generateAgentCard()));
app.get('/.well-known/ai-plugin.json', (_req, res) => sendJson(res, generateAiPluginManifest()));
app.get('/.well-known/mcp.json', (_req, res) => sendJson(res, generateMcpDiscovery()));

app.use('/mcp', ipLimiter, sessionLimiter);
app.post('/mcp', (req, res) => {
  handleMcpRequest(req, res).catch((err) => {
    if (!res.headersSent) {
      res.status(500).json({ error: 'mcp-handler-failure' });
    }
    process.stderr.write(`MCP error: ${err}\n`);
  });
});
app.get('/mcp', (req, res) => {
  handleMcpRequest(req, res).catch((err) => {
    if (!res.headersSent) {
      res.status(500).json({ error: 'mcp-handler-failure' });
    }
    process.stderr.write(`MCP SSE error: ${err}\n`);
  });
});

app.listen(PORT, HOST, () => {
  process.stdout.write(`hellobooks-mcp-public listening on http://${HOST}:${PORT}\n`);
});
