# Quickstart cookbook — connect in 60 seconds

Copy-paste recipes for calling the **HelloBooks public MCP server** from the
command line or your own code.

- **Endpoint:** `https://agents.hellobooks.ai/mcp`
- **Transport:** Streamable HTTP · **Auth:** none · **Access:** read-only, public data

## Step 1 — add it to your AI client (one line)

If you use Claude Code, that's the whole setup:

```bash
claude mcp add --transport http hellobooks https://agents.hellobooks.ai/mcp
```

Using Cursor, VS Code, Windsurf, Zed, Cline and friends? Drop-in config blocks
for each live in [`../mcp-client-configs.md`](../mcp-client-configs.md).

## Step 2 — or call it from code

| You want… | File | Run it |
| --- | --- | --- |
| Raw HTTP, no dependencies | [`curl.md`](./curl.md) | copy the `curl` blocks |
| Node.js | [`node-client.mjs`](./node-client.mjs) | `node examples/quickstart/node-client.mjs` |
| Python | [`python-client.py`](./python-client.py) | `pip install mcp && python examples/quickstart/python-client.py` |

The Node example needs [`@modelcontextprotocol/sdk`](https://www.npmjs.com/package/@modelcontextprotocol/sdk)
(already a dependency of this repo). The Python example needs
[`mcp`](https://pypi.org/project/mcp/) (`pip install mcp`).

## Step 3 — call a tool

Every client above lists the tools, then calls one. Good first calls:

- **`list_plans`** — all HelloBooks tiers, with optional `country` / `plan` filters.
- **`recommend_plan`** — the cheapest tier that fits a business's `needs` and
  `estimatedAnnualTransactions`.
- **`check_integration`**, **`compliance_deadlines`**, **`search`** / **`fetch`** — see the
  [full tool list in the repo README](../../README.md#tools).

## Gotcha: the `Accept` header

Calling the endpoint with raw HTTP? The Streamable HTTP transport answers over
Server-Sent Events, so every request **must** send:

```
Accept: application/json, text/event-stream
```

Without it the server returns **`406 Not Acceptable`**. The Node and Python SDKs
set this for you; [`curl.md`](./curl.md) shows the raw handshake in full.
