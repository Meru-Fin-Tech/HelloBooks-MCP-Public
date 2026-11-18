# Zapier → HelloBooks public MCP

Zapier can call the HelloBooks public MCP server through its **MCP client**
(where available) or with the **Webhooks by Zapier → Custom Request** action.
No API key — the server is public and read-only.

- **Endpoint:** `https://agents.hellobooks.ai/mcp`
- **Transport:** HTTP / Streamable HTTP
- **Auth:** None

> Zapier's MCP features are evolving and field names differ by product area
> (Zaps, Agents, Chatbots). Match by meaning: the *server URL* is the endpoint
> above, the *transport* is HTTP Streamable, *authentication* is none.

## Option A — Zapier MCP client (Agents / Chatbots / MCP action)

1. In a Zapier **Agent**, **Chatbot**, or a Zap step that offers **MCP**, choose
   to **add an MCP server / connect a custom MCP server**.
2. Enter:
   - **Server URL:** `https://agents.hellobooks.ai/mcp`
   - **Transport:** **HTTP Streamable** (not stdio / command).
   - **Authentication:** **None** — leave any key/header field blank.
3. Zapier discovers the tools. Allow the ones you need (e.g. `recommend_plan`,
   `search`, `fetch`).

The agent/chatbot can now ground answers about HelloBooks in live data and call
`recommend_plan` when a user asks "which plan fits a business in India?".

## Option B — Webhooks by Zapier (works on paid Zapier plans)

MCP over Streamable HTTP is JSON-RPC `POST`s, so a **Custom Request** webhook
calls a tool directly.

1. Add an action: **Webhooks by Zapier → Custom Request**.
2. Configure:
   - **Method:** `POST`
   - **URL:** `https://agents.hellobooks.ai/mcp`
   - **Data Pass-Through?:** No
   - **Data (JSON):**
     ```json
     {
       "jsonrpc": "2.0",
       "id": 1,
       "method": "tools/call",
       "params": { "name": "recommend_plan", "arguments": { "country": "IN" } }
     }
     ```
   - **Headers:**
     - `Content-Type`: `application/json`
     - `Accept`: `application/json, text/event-stream`
3. Test the step. The response JSON holds the plan recommendation; map fields
   into later Zap steps (Slack, Gmail, Sheets, etc.).

### search + fetch (two webhook steps)

1. Step 1 — Custom Request, `params.name` = `search`, arguments
   `{ "query": "QuickBooks migration" }`.
2. Step 2 — Custom Request, `params.name` = `fetch`, arguments
   `{ "id": "{{<document id from step 1>}}" }`.

> Strict MCP clients call `initialize` first and reuse the returned
> `Mcp-Session-Id` header. For a single read-only `tools/call` the example above
> usually works; if the server rejects it for a missing session, add an
> `initialize` webhook step and pass its `Mcp-Session-Id` response header into a
> `Mcp-Session-Id` request header on the following steps. The native MCP client
> (Option A) manages the session automatically.
