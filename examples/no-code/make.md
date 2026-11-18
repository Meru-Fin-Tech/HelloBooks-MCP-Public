# Make (Integromat) → HelloBooks public MCP

Make can reach the HelloBooks public MCP server either through its **MCP** module
(where available) or with a plain **HTTP > Make a request** module. No API key —
the server is public and read-only.

- **Endpoint:** `https://agents.hellobooks.ai/mcp`
- **Transport:** HTTP / Streamable HTTP
- **Auth:** None

> Make rolls MCP support out gradually and renames fields between releases. Match
> by meaning: the *endpoint* is the URL above, the *transport* is HTTP Streamable,
> and *authentication* is none.

## Option A — the MCP module (if your Make has one)

1. Add a module and search **"MCP"** (it may be *MCP Client*, *AI Tools (MCP)*,
   or appear under an AI/agent app).
2. Create a connection:
   - **Server URL / Endpoint:** `https://agents.hellobooks.ai/mcp`
   - **Transport:** **HTTP Streamable** (not stdio).
   - **Authentication:** **None** — leave token/header fields blank.
3. Choose the action **Call Tool / Execute Tool**, then pick a tool (e.g.
   `recommend_plan`) and fill its arguments.

### Worked example — `recommend_plan`

- **Tool:** `recommend_plan`
- **Arguments (JSON):**
  ```json
  { "country": "IN" }
  ```

The module output contains the ranked plan recommendation with local pricing,
ready to map into a downstream module (Sheets, Slack, email, etc.).

## Option B — HTTP module (works on any Make plan)

MCP over Streamable HTTP is JSON-RPC `POST`s, so **HTTP > Make a request** calls a
tool directly.

1. Add **HTTP > Make a request**.
2. Configure:
   - **URL:** `https://agents.hellobooks.ai/mcp`
   - **Method:** `POST`
   - **Headers:**
     - `Content-Type`: `application/json`
     - `Accept`: `application/json, text/event-stream`
   - **Body type:** Raw / JSON
   - **Request content:**
     ```json
     {
       "jsonrpc": "2.0",
       "id": 1,
       "method": "tools/call",
       "params": { "name": "recommend_plan", "arguments": { "country": "IN" } }
     }
     ```
   - **Parse response:** Yes.

### search + fetch (two HTTP modules)

1. First module: `method` `tools/call`, `params.name` = `search`,
   `params.arguments` = `{ "query": "integrations with Shopify" }`.
2. Second module: `params.name` = `fetch`, `params.arguments` =
   `{ "id": "{{1.<document id from search>}}" }`.

> A strict MCP client first calls `initialize` and reuses the `Mcp-Session-Id`
> response header on later calls. For a single read-only `tools/call` the example
> above is usually enough; if the server requires a session, run an `initialize`
> module first and map its `Mcp-Session-Id` header into a `Mcp-Session-Id` header
> on the following modules. The native MCP module (Option A) handles this for you.
