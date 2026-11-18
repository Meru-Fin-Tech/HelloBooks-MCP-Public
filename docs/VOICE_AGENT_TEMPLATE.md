# Voice-agent starter template (Vapi / Retell / ElevenLabs)

An AI phone agent should load the HelloBooks **voice pack once per call** into its
system prompt — not call the MCP mid-call (that adds latency the caller hears).
Each per-country pack is ~850–1,350 tokens.

## 1. Fetch the pack (once, at call start, server-side)

```bash
# Prompt-ready text for one country:
curl -s "https://agents.hellobooks.ai/kb/voice.txt?country=IN"

# Structured JSON (plans, prices, compliance, call goals, guardrails):
curl -s "https://agents.hellobooks.ai/kb/voice.json?country=IN"
```

Cache it: the response carries an `ETag` (the content hash) — send
`If-None-Match` and re-download only on a 304 miss. `X-KB-Facts-As-Of` tells you
when pricing last changed.

## 2. System prompt skeleton

```
You are HelloBooks' onboarding assistant on a phone call.
Only use the facts in the KNOWLEDGE block below. If asked something not covered,
say you'll follow up by email — do not guess prices, dates, or offers.
Follow the call goals and guardrails exactly.

=== KNOWLEDGE (HelloBooks, {COUNTRY}) ===
{paste the /kb/voice.txt body here}
=== END KNOWLEDGE ===
```

## 3. Wire into a platform

- **Vapi**: set the assistant's `model.messages[0]` (system) to the skeleton
  above with the pack injected; no tools/functions needed for Q&A.
- **Retell**: put the pack in the agent's `general_prompt`.
- **ElevenLabs Agents**: paste into the agent's system prompt.

## 4. Refresh

Pricing is live; the pack rebuilds from the current feed. Re-pull at call start
(cheap with `If-None-Match`). For a push refresh after a price change, an operator
can `POST /kb/refresh` with the bearer token.

## Guardrails (already in the pack)

The pack includes explicit guardrails — never promise an unlisted compliance
date, never invent an onboarding price for a country without a published offer,
and defer anything outside the knowledge block. Keep them in the prompt verbatim.
