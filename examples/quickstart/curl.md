# Quickstart: raw HTTP with `curl`

Talk to the HelloBooks public MCP server with nothing but `curl`. No SDK, no
sign-in, no API key.

- **Endpoint:** `https://agents.hellobooks.ai/mcp`
- **Transport:** [Streamable HTTP](https://modelcontextprotocol.io/specification) (JSON-RPC 2.0 over POST)
- **Auth:** none — the catalog is public and read-only.

## The one header you cannot skip

Every POST **must** send:

```
Accept: application/json, text/event-stream
```

The Streamable HTTP transport replies as a Server-Sent Events stream, so it
rejects a request that does not accept `text/event-stream`:

```console
$ curl -s -o /dev/null -w '%{http_code}\n' https://agents.hellobooks.ai/mcp \
    -H 'Content-Type: application/json' \
    -H 'Accept: application/json' \
    -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
406
```

That `406 Not Acceptable` is the single most common first-call mistake. Add
`text/event-stream` to `Accept` and it clears.

## The session handshake

The server is session-based. `initialize` mints a session and returns its id in
the **`Mcp-Session-Id` response header**; every later call must echo that header
back. The flow is: `initialize` → `notifications/initialized` → your real calls.

### 1. `initialize` (capture the session id)

`-D -` dumps the response headers so you can read `Mcp-Session-Id` off the top.

```bash
curl -sS https://agents.hellobooks.ai/mcp -D - \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2025-06-18",
      "capabilities": {},
      "clientInfo": { "name": "curl-quickstart", "version": "1.0.0" }
    }
  }'
```

Trimmed response (headers, then one SSE frame):

```
HTTP/2 200
mcp-session-id: 0b5f2c7e-9a1d-4c3b-8e21-6f4d9a0c1234
content-type: text/event-stream

event: message
data: {"jsonrpc":"2.0","id":1,"result":{
data:   "protocolVersion":"2025-06-18",
data:   "capabilities":{"tools":{},"resources":{},"prompts":{}},
data:   "serverInfo":{"name":"hellobooks-mcp-public","version":"1.6.0"}}}
```

Copy the `mcp-session-id` value — call it `$SID` below.

```bash
SID='0b5f2c7e-9a1d-4c3b-8e21-6f4d9a0c1234'   # ← paste yours
```

### 2. Say hello back (`notifications/initialized`)

One fire-and-forget notification (no `id`, so the server returns `202` with an
empty body). Skipping it leaves the session half-open on strict clients.

```bash
curl -sS https://agents.hellobooks.ai/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -H "Mcp-Session-Id: $SID" \
  -d '{"jsonrpc":"2.0","method":"notifications/initialized"}'
```

### 3. List the tools (`tools/list`)

```bash
curl -sS https://agents.hellobooks.ai/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -H "Mcp-Session-Id: $SID" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'
```

Trimmed response:

```
event: message
data: {"jsonrpc":"2.0","id":2,"result":{"tools":[
data:   {"name":"search","title":"Search the HelloBooks catalog", ...},
data:   {"name":"fetch","title":"Fetch a catalog document", ...},
data:   {"name":"list_plans","title":"List HelloBooks pricing plans", ...},
data:   {"name":"recommend_plan","title":"Recommend a HelloBooks plan", ...},
data:   {"name":"check_integration", ...},
data:   {"name":"compliance_deadlines", ...}
data:   ]}}
```

### 4. Call a tool (`tools/call` → `list_plans`)

`list_plans` takes optional `country` and `plan` filters. With no arguments it
returns every tier at USD/default pricing.

```bash
curl -sS https://agents.hellobooks.ai/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -H "Mcp-Session-Id: $SID" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": { "name": "list_plans", "arguments": { "country": "IN" } }
  }'
```

Tool results arrive as a `content` array; the JSON payload is `content[0].text`
(a JSON string you parse again). Trimmed:

```
event: message
data: {"jsonrpc":"2.0","id":3,"result":{"content":[{"type":"text","text":
data:   "{\"country\":\"IN\",\"currency\":\"INR\",\"plans\":[
data:      {\"id\":\"free\",\"name\":\"Free\",\"monthly\":0, ...},
data:      {\"id\":\"starter\",\"name\":\"Starter\", ...},
data:      {\"id\":\"pro\",\"name\":\"Pro\", ...} ]}"
data:   }],"isError":false}}
```

### 5. Call a tool with real input (`recommend_plan`)

`recommend_plan` scores the tiers against what a business actually needs and
returns the lowest-priced one that fits, plus a ranked breakdown. Arguments:

| field | type | notes |
| --- | --- | --- |
| `country` | string | ISO code, for local pricing. Optional. |
| `needs` | string[] | Free-text needs, e.g. `"GST filing"`, `"multi-currency"`. |
| `estimatedAnnualTransactions` | number | Ledger entries/year. Over the Free cap rules out Free. |

```bash
curl -sS https://agents.hellobooks.ai/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -H "Mcp-Session-Id: $SID" \
  -d '{
    "jsonrpc": "2.0",
    "id": 4,
    "method": "tools/call",
    "params": {
      "name": "recommend_plan",
      "arguments": {
        "country": "IN",
        "needs": ["GST filing", "multi-currency", "API access"],
        "estimatedAnnualTransactions": 12000
      }
    }
  }'
```

Trimmed:

```
event: message
data: {"jsonrpc":"2.0","id":4,"result":{"content":[{"type":"text","text":
data:   "{\"recommended\":{\"id\":\"pro\",\"name\":\"Pro\",\"whyThisTier\":
data:      \"Lowest tier that covers GST filing, multi-currency and API access\"},
data:    \"ranked\":[ {\"id\":\"pro\", ...}, {\"id\":\"business\", ...} ]}"
data:   }],"isError":false}}
```

> Prices and rankings are live-fed from `hellobooks.ai` and are an estimate, not
> a quote.

## Prefer an SDK?

The raw handshake above is what the SDKs do for you. For real code, use
[`node-client.mjs`](./node-client.mjs) or [`python-client.py`](./python-client.py) —
they manage the session id and SSE parsing automatically.
