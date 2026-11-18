# Voice-agent recipes

Wire a voice agent (Vapi, Retell, ElevenLabs, or any platform that can call an
HTTP tool or an MCP server) to HelloBooks knowledge, so a phone/voice assistant
answers questions about HelloBooks plans, integrations, compliance and features
from authoritative data instead of hallucinating.

Two retrieval paths — pick by what your platform supports:

1. **MCP** — point the agent at `https://agents.hellobooks.ai/mcp`
   (Streamable HTTP, no auth) and let it call tools like `recommend_plan`,
   `search`, `fetch` mid-conversation.
2. **Voice knowledge pack** — fetch a compact, prompt-ready per-country pack from
   `GET https://agents.hellobooks.ai/kb/voice.json?country=IN` once and inject it
   as context. Built for voice: small, ETag-revalidated, and carrying a ready-made
   `text` block. Use this when the platform has no MCP support, or when you want
   zero mid-call latency.

## Recipes

- [vapi-retell-starter.md](vapi-retell-starter.md) — Vapi & Retell wiring
  (system prompt + MCP tool **or** knowledge-pack retrieval), plus an ElevenLabs note.

## The voice knowledge pack endpoint

```
GET https://agents.hellobooks.ai/kb/voice.json?country=IN     # one country (JSON)
GET https://agents.hellobooks.ai/kb/voice.txt?country=IN      # just the prompt text
GET https://agents.hellobooks.ai/kb/voice.json               # every country (bundle)
```

- `country` takes an ISO code for a supported country: **IN, US, GB/UK, AU, CA,
  AE, SG, NZ**. Omit it (or `?country=all`) for the full bundle. An unknown code
  returns `400` with the supported list.
- Response JSON: `{ "version", "factsAsOf", "generatedAt", "text", ... }`. The
  `text` field is a compiled, speak-friendly summary — drop it straight into a
  system prompt. `/kb/voice.txt` returns that `text` on its own.
- Caching: the endpoint sends `ETag` / `X-KB-Version`. Keep your copy and send
  `If-None-Match`; you get a `304` until a fact changes. Fetch **once per call**
  (or on a schedule) — not mid-call.

No authentication. Read-only, public product data.
