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
 * No authentication — by design. The catalog is public-only data.
 */

import express, { type Request, type Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import { randomUUID } from 'node:crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createServer } from './server.js';

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
    version: '0.1.0',
    description:
      'Public read-only MCP server for HelloBooks plans, integrations, country support, and compliance.',
    transport: { http: '/mcp', sse: '/mcp' },
    install: 'claude mcp add --transport http hellobooks https://agents.hellobooks.ai/mcp',
    docs: 'https://hellobooks.ai/mcp',
    repository: 'https://github.com/Meru-Fin-Tech/HelloBooks-MCP-Public',
  });
});

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
