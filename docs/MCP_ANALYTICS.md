# MCP Traffic Analytics

Anonymous, server-side usage telemetry for the public MCP endpoint at
`https://agents.hellobooks.ai/mcp`. It answers operational questions —
how many requests, from which AI clients and crawlers, which tools, how fast,
how often errors — **without a database and without collecting customer data**.

- Detection logic: [`src/lib/clientDetection.ts`](../src/lib/clientDetection.ts)
- Middleware: [`src/middleware/mcpAnalytics.ts`](../src/middleware/mcpAnalytics.ts)
- Sink: [`src/analytics.ts`](../src/analytics.ts) (`track()` → GA4 Measurement Protocol)
- Wiring: [`src/http.ts`](../src/http.ts) (`app.use('/mcp', mcpAnalytics, …)`)

This sits alongside the pre-existing per-tool telemetry emitted from
[`src/server.ts`](../src/server.ts) (`mcp_tool_called` / `mcp_tool_errored`).
The middleware adds an **HTTP-transport** view; the server factory keeps its
**tool-handler** view. They are distinct event names — don't sum them.

## How events are delivered (no database)

There is **no database, no Prisma, no SQL, and no repository layer** in this
repo — by design (`.env.example`: *"NO database, NO customer data."*). All
catalog data is static in `src/data/*.ts`, and the only runtime state is a few
in-memory `Map`s.

Analytics therefore goes to an **external** store, **GA4 via the Measurement
Protocol**, exactly like the existing telemetry:

1. The `/mcp` middleware gathers request facts on `res.on('finish')`.
2. It calls `track(eventName, params, clientId)` for each event.
3. `track()` fires a non-blocking `POST` to GA4 and swallows all errors.

If the GA4 env vars (`GA4_MEASUREMENT_ID`, `GA4_API_SECRET`) are **unset** —
local dev, tests, any deploy without analytics — `track()` is a **silent
no-op**: no outbound calls, nothing required to run the server.

Persisting counts locally would require a datastore, which this repo
deliberately does not have. GA4 is the system of record.

## Events emitted

Every completed `/mcp` request emits **`mcp_request`**. Depending on the
request, up to three more are added:

| Event            | When                                  |
| ---------------- | ------------------------------------- |
| `mcp_request`    | every `/mcp` request (always)         |
| `mcp_tool_call`  | JSON-RPC `method === "tools/call"`    |
| `mcp_bot_visit`  | User-Agent matches a known/generic bot|
| `mcp_error`      | response status code `>= 400`         |

All events share the same flat parameter set (scalars only — GA4 stores no
nested objects/arrays):

| Param              | Example            | Notes                                            |
| ------------------ | ------------------ | ------------------------------------------------ |
| `path`             | `/mcp`             | route path only                                  |
| `http_method`      | `POST` / `GET`     |                                                  |
| `rpc_method`       | `tools/call`       | from `req.body.method`; `(none)` when absent     |
| `tool_name`        | `list_plans`       | from `req.body.params.name` on `tools/call` only |
| `status`           | `200`              | `res.statusCode`                                 |
| `success`          | `true`             | `status < 400`                                   |
| `response_time_ms` | `12`              | `Date.now()` delta across the request            |
| `client`           | `chatgpt`          | derived UA label (see below)                     |
| `bot`              | `GPTBot` / `none`  | derived crawler label                            |
| `is_bot`           | `false`            | `bot !== 'none'`                                  |
| `origin_host`      | `chatgpt.com`      | **host only** of the `Origin` header             |
| `referer_host`     | `example.com`      | **host only** of the `Referer` header            |
| `country`          | `IN`               | Cloudflare `cf-ipcountry` edge header            |
| `error_status`     | `400`              | `mcp_error` only                                 |

The GA4 `client_id` is the opaque MCP session id (`mcp-session-id`), falling
back to the freshly-minted id on `initialize`, then to the literal `anon`.

## What is tracked

- Total request volume (`mcp_request` count).
- JSON-RPC **method** usage (`rpc_method`: `initialize`, `tools/list`,
  `tools/call`, `resources/read`, …).
- **Tool** usage (`tool_name` on `mcp_tool_call`).
- **AI client** mix and **bot/crawler** mix (`client`, `bot`, `is_bot`).
- Success vs error counts and **HTTP status codes** (`success`, `status`).
- **Response time** (`response_time_ms`).

## What is NOT tracked

- ❌ Request bodies or **tool argument values** (only the method/tool *name*).
- ❌ Any customer or account data (the server has none — it is read-only public).
- ❌ Authorization/cookie/credential headers.
- ❌ **IP addresses** — never sent. Geography comes only from the coarse
  Cloudflare `cf-ipcountry` country code, matching the existing analytics
  policy. No raw IP, no hashed IP.
- ❌ The raw `User-Agent` string — only the derived bounded label.
- ❌ Full `Origin`/`Referer` URLs — reduced to **host** (no path or query).

## Client & bot detection

Pure substring matching over the lower-cased User-Agent
([`clientDetection.ts`](../src/lib/clientDetection.ts)). Two orthogonal
dimensions:

**AI clients** (`client`): `chatgpt`, `claude`, `cursor`, `perplexity`,
`gemini`, `copilot`, `postman`, `browser`, `unknown`.

**Bots** (`bot`): `GPTBot`, `OAI-SearchBot`, `ClaudeBot`, `PerplexityBot`,
`Google-Extended`, `Googlebot`, `CCBot`, `Bytespider`, `Bingbot`, `Applebot`,
`Amazonbot`, `AhrefsBot`, `SemrushBot`, plus `other-bot` for unnamed crawlers,
else `none`.

> For crawler traffic the **`bot` field is authoritative**. A bot's `client`
> may resolve to its vendor (e.g. GPTBot → `chatgpt`) or to `browser` if the
> bot spoofs a Mozilla token (e.g. Googlebot). **To count genuine interactive
> AI-client visits, filter to `is_bot = false`.**

### Identifying ChatGPT / Claude / GPTBot traffic in GA4

- **ChatGPT (interactive):** `client = chatgpt` AND `is_bot = false`.
- **Claude (interactive):** `client = claude` AND `is_bot = false`.
- **GPTBot (crawler):** `bot = GPTBot` (or any `is_bot = true` for all bots).
- **All AI crawlers:** `is_bot = true`, then break down by `bot`.

## Testing with curl

Start the server locally (analytics stays a silent no-op unless the GA4 vars
are set — the requests still flow through the middleware):

```bash
npm run dev          # tsx watch on http://localhost:8080
```

To actually emit to GA4 while testing, export both vars first
(see GA4 Admin → Data Streams → Measurement Protocol API secrets):

```bash
export GA4_MEASUREMENT_ID=G-XXXXXXXXXX
export GA4_API_SECRET=your-secret
npm run dev
```

Each request below must first `initialize` to obtain a session, but for smoke
testing the middleware you can hit the endpoint directly — every response,
including the `400`, is recorded.

**1. `tools/list` as ChatGPT**

```bash
curl -s http://localhost:8080/mcp \
  -H 'content-type: application/json' \
  -H 'accept: application/json, text/event-stream' \
  -A 'Mozilla/5.0; ChatGPT-User/1.0; +https://openai.com/bot' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
# → mcp_request  { client: chatgpt, is_bot: false, rpc_method: tools/list }
```

**2. `tools/call` as Claude**

```bash
curl -s http://localhost:8080/mcp \
  -H 'content-type: application/json' \
  -H 'accept: application/json, text/event-stream' \
  -A 'Claude-User/1.0 (+Claude-User@anthropic.com)' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"list_plans","arguments":{}}}'
# → mcp_request + mcp_tool_call  { client: claude, tool_name: list_plans }
```

**3. `tools/list` as GPTBot (crawler)**

```bash
curl -s http://localhost:8080/mcp \
  -H 'content-type: application/json' \
  -H 'accept: application/json, text/event-stream' \
  -A 'Mozilla/5.0 (compatible; GPTBot/1.1; +https://openai.com/gptbot)' \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/list"}'
# → mcp_request + mcp_bot_visit  { bot: GPTBot, is_bot: true }
```

**4. Unknown client**

```bash
curl -s http://localhost:8080/mcp \
  -H 'content-type: application/json' \
  -H 'accept: application/json, text/event-stream' \
  -A 'curl/8.4.0' \
  -d '{"jsonrpc":"2.0","id":4,"method":"tools/list"}'
# → mcp_request  { client: unknown, is_bot: false }
```

**5. Failed request (bad/absent session on a non-initialize call → 400)**

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8080/mcp \
  -H 'content-type: application/json' \
  -H 'mcp-session-id: does-not-exist' \
  -d '{"jsonrpc":"2.0","id":5,"method":"tools/list"}'
# → 400, and mcp_request + mcp_error  { status: 400, success: false }
```

> Terminal-event note: each request is recorded exactly once, on the first of
> `res` `finish` / `close` to fire. `finish` covers a normally completed
> response; `close` additionally catches aborted clients and long-lived SSE
> `GET /mcp` streams that end without a `finish` (so they are not undercounted).
> SSE streams are therefore recorded at stream close, not at open.

## Running the unit tests

```bash
npm test
# detection + event-builder coverage in test/client-detection.test.ts
```

## Privacy summary

This is **anonymous usage analytics**, not lead or user tracking. Events carry
only counts, bounded enum labels, a tool/method *name*, latency, status, and a
country code — never bodies, arguments, IPs, credentials, or raw User-Agents.
With the GA4 vars unset the server emits nothing at all. See the design rules in
[`src/analytics.ts`](../src/analytics.ts) and strategy doc 73
(`marketing-strategy → strategy/73-MCP-Analytics-Attribution-Strategy.md`).
