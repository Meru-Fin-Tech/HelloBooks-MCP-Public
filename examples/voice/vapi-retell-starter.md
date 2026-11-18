# Vapi / Retell voice-agent starter → HelloBooks

Give a Vapi or Retell voice agent accurate HelloBooks knowledge. Two wiring
options — use **MCP** if your platform supports it, otherwise use the **voice
knowledge pack** as retrieval context. An ElevenLabs note is at the end.

Endpoints (public, read-only, no auth):

- MCP: `https://agents.hellobooks.ai/mcp` (Streamable HTTP)
- Voice KB pack: `https://agents.hellobooks.ai/kb/voice.json?country=IN`
  (and `/kb/voice.txt?country=IN` for the prompt text only)

> Vapi and Retell both rename fields across dashboard versions. Match by meaning:
> the MCP *server URL* is the endpoint above with transport HTTP/Streamable and no
> auth; the knowledge pack is a plain `GET`.

---

## System-prompt snippet (use with either option)

```text
You are the HelloBooks voice assistant. HelloBooks is AI-native cloud accounting,
bookkeeping, tax and payroll software.

Rules:
- Answer questions about HelloBooks plans, pricing, integrations, country/tax
  support, compliance deadlines, features, and competitor comparisons using ONLY
  the HelloBooks knowledge available to you (the connected tools and/or the
  knowledge pack below). Do not invent prices, dates, or features.
- Prices and statutory deadlines change: state them as "approximately" on a call
  and point the caller to hellobooks.ai for the exact current figure.
- If a question is about a specific customer's own books, invoices, or filings,
  say that this line only covers general product information and offer to connect
  them to their account or support.
- Keep answers short and spoken-friendly: one or two sentences, no URLs read out
  character by character, no markdown.
```

---

## Option 1 — MCP tool wiring

### Vapi

1. In the assistant config, open **Tools** (a.k.a. *Model > Tools* /
   *Integrations*) and add an **MCP server**.
2. Set:
   - **Server URL:** `https://agents.hellobooks.ai/mcp`
   - **Transport / Protocol:** **HTTP Streamable** (not stdio).
   - **Authentication:** **None**.
3. Allow the tools you want the agent to call live, e.g. `recommend_plan`,
   `search`, `fetch`, `list_integrations`, `compliance_deadlines`.
4. In the system prompt, tell the model it may call these tools when asked about
   plans, integrations, or deadlines.

> If your Vapi plan has no native MCP block, expose a single tool via a **custom
> function / server URL** that forwards to the MCP `tools/call` JSON-RPC (see the
> HTTP example in the no-code recipes), or use Option 2.

### Retell

1. In the agent's **Functions / Tools**, add a **Custom function** (or an **MCP**
   connection if your workspace has one).
2. For MCP: **Server URL** `https://agents.hellobooks.ai/mcp`, transport
   **HTTP Streamable**, auth **None**.
3. For a custom function instead, define one named `hellobooks_search` that
   `POST`s to `https://agents.hellobooks.ai/mcp` with a `tools/call` body
   (`name: "search"`, then `fetch` the top id). Describe it so the LLM calls it
   for any HelloBooks product question.

Calling MCP tools mid-call adds a round-trip of latency. For the lowest latency,
prefer Option 2 and only reach for live tools when the caller needs something
dynamic (e.g. a tailored `recommend_plan`).

---

## Option 2 — Voice knowledge pack as retrieval context (recommended for latency)

Fetch the per-country pack **once** before/at the start of the call and inject its
`text` into the system prompt. No tool calls mid-conversation → no added latency.

### Fetch it

```bash
curl -s "https://agents.hellobooks.ai/kb/voice.json?country=IN"
# → { "version": "...", "factsAsOf": "...", "generatedAt": "...", "text": "..." , ... }

# Or just the prompt-ready text block:
curl -s "https://agents.hellobooks.ai/kb/voice.txt?country=IN"
```

- `country`: `IN`, `US`, `GB`/`UK`, `AU`, `CA`, `AE`, `SG`, `NZ`. Omit for the
  full bundle. Unknown code → `400` with the supported list.
- Revalidate cheaply: keep the `ETag` / `X-KB-Version` and send `If-None-Match`
  on the next fetch to get a `304` until a fact changes. Refresh once per call or
  on a schedule — never mid-call.

### Inject it

Append the fetched `text` under a heading in the system prompt:

```text
[...system-prompt snippet from above...]

--- HelloBooks knowledge (country: IN; refreshed each call) ---
{{ voice_pack_text }}
```

- **Vapi:** build the assistant with a dynamic/overridable system prompt (e.g.
  via an **assistant override** / dynamic variables when you start the call) and
  set `voice_pack_text` to the fetched `text`. If you orchestrate calls from your
  own backend, fetch the pack there and pass it in the assistant override.
- **Retell:** use a **dynamic variable** / prompt parameter for the system prompt
  and populate it with the fetched `text` when you create the call (Retell's
  `register_call` / `create_phone_call` accept dynamic variables).

---

## ElevenLabs note

ElevenLabs **Conversational AI** agents follow the same two patterns:

- **Knowledge base (retrieval):** add the voice pack as a knowledge source — the
  simplest path is to store the `text` from
  `https://agents.hellobooks.ai/kb/voice.txt?country=IN` as a document/URL in the
  agent's **Knowledge Base**, or inject it into the **System prompt** via a
  dynamic variable when you start the conversation. Refresh it on your own
  schedule using the `ETag` revalidation above.
- **Tools / MCP:** if your ElevenLabs agent supports MCP servers or webhook
  tools, point a server/tool at `https://agents.hellobooks.ai/mcp`
  (HTTP Streamable, no auth) and allow `search` / `fetch` / `recommend_plan`,
  exactly as for Vapi/Retell.

Use the same system-prompt snippet above. As with the other platforms, prefer the
knowledge pack for latency and reserve live MCP tool calls for dynamic answers.
