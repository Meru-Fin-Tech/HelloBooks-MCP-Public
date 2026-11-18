# n8n → HelloBooks public MCP

Point n8n's **MCP Client Tool** node at the HelloBooks public MCP server. No
credential, no API key — the server is public and read-only.

- **Endpoint:** `https://agents.hellobooks.ai/mcp`
- **Transport:** HTTP Streamable
- **Auth:** None

> n8n added native MCP nodes in 1.88+ (and refined them since). Label and field
> names vary by version; match by meaning. If your build has no MCP node, use the
> HTTP Request fallback at the bottom.

## 1. Add the MCP Client node

1. In your workflow, **+ (Add node)** → search **"MCP Client"** (it may appear as
   **MCP Client Tool**).
2. Set **Connection / Transport** to **HTTP Streamable** (some versions call it
   *HTTP*, *Streamable HTTP*, or *HTTP Streamable*). Do **not** pick *Command/stdio*.
3. **Endpoint / Server URL:** `https://agents.hellobooks.ai/mcp`
4. **Authentication:** **None** (leave credentials empty). If the node forces a
   credential, create an **MCP Client (HTTP Streamable) API** credential with the
   URL above and no headers.

That's the whole setup — the node will list the server's tools automatically.

## 2. Worked example — recommend a plan for a country

Goal: given a country, return a HelloBooks plan recommendation.

1. **Manual Trigger** node (or any trigger).
2. **MCP Client** node:
   - **Operation / Resource:** **Execute Tool** (a.k.a. *Call Tool* / *Run Tool*).
   - **Tool Name:** `recommend_plan`
   - **Parameters / Tool Parameters** (JSON):
     ```json
     { "country": "IN" }
     ```
3. **Execute** the workflow. The node returns the ranked recommendation with
   local pricing in its JSON output.

### Variant — search + fetch

Use this when you want a citable document rather than a recommendation:

1. **MCP Client** → **Execute Tool** → `search` with
   `{ "query": "GST filing deadlines India" }`. The result is a list of document
   ids (e.g. `deadline:IN:gstr-3b`).
2. A second **MCP Client** → **Execute Tool** → `fetch` with
   `{ "id": "deadline:IN:gstr-3b" }` to pull the full document text and its
   public hellobooks.ai URL.

Chain the first node's output id into the second node's `id` parameter with an
expression, e.g. `{{ $json.results[0].id }}`.

## 3. Import the ready-made workflow

[`n8n-workflow.json`](n8n-workflow.json) in this folder is a minimal, importable
workflow (Manual Trigger → MCP Client calling `recommend_plan` for `IN`).

1. n8n → **Workflows** → **⋯ / Import from File** (or **Import from URL**).
2. Select `n8n-workflow.json`.
3. Open the **MCP Client** node and confirm the endpoint is
   `https://agents.hellobooks.ai/mcp` and transport is **HTTP Streamable** (n8n
   may reset the transport dropdown on import depending on version).
4. **Execute**.

> If the imported node type doesn't exist in your version, delete it and add the
> MCP Client node by hand per step 1 — the rest of the workflow still applies.

## Fallback — no MCP node? Use HTTP Request

MCP over Streamable HTTP is plain JSON-RPC `POST`s. If your n8n has no MCP node,
an **HTTP Request** node can call a tool directly:

- **Method:** `POST`
- **URL:** `https://agents.hellobooks.ai/mcp`
- **Headers:** `Content-Type: application/json`,
  `Accept: application/json, text/event-stream`
- **Body (JSON):**
  ```json
  {
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": { "name": "recommend_plan", "arguments": { "country": "IN" } }
  }
  ```

A full MCP session normally does an `initialize` handshake first and reuses the
returned `Mcp-Session-Id` header; the native MCP node handles that for you, which
is why it's the recommended path.
