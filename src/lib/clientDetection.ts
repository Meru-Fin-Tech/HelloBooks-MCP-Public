/**
 * User-Agent classification for MCP traffic analytics.
 *
 * Pure, dependency-free substring matching. These functions take a raw
 * User-Agent string and return small, bounded enum labels suitable for GA4
 * dimensions (see src/analytics.ts cardinality rules). The raw UA itself is
 * NEVER emitted to analytics — only the derived label.
 *
 * Two orthogonal dimensions are returned:
 *   - `client` — the AI client / software making the call (chatgpt, claude, …).
 *   - `bot`    — the named crawler, if any (GPTBot, ClaudeBot, …), else 'none'.
 *
 * For crawler traffic the `bot` field is authoritative; `client` may resolve to
 * the bot's vendor (e.g. GPTBot → chatgpt) or to 'browser' when the bot spoofs
 * a Mozilla token. To count genuine interactive AI-client visits, filter to
 * `is_bot = false`. See docs/MCP_ANALYTICS.md.
 */

export type AiClient =
  | 'chatgpt'
  | 'claude'
  | 'cursor'
  | 'perplexity'
  | 'gemini'
  | 'copilot'
  | 'postman'
  | 'browser'
  | 'unknown';

export type BotName =
  | 'GPTBot'
  | 'OAI-SearchBot'
  | 'ClaudeBot'
  | 'PerplexityBot'
  | 'Google-Extended'
  | 'Googlebot'
  | 'CCBot'
  | 'Bytespider'
  | 'Bingbot'
  | 'Applebot'
  | 'Amazonbot'
  | 'AhrefsBot'
  | 'SemrushBot'
  | 'other-bot'
  | 'none';

export interface UaClassification {
  client: AiClient;
  bot: BotName;
  isBot: boolean;
}

/**
 * Ordered client matchers — first substring hit wins. Vendor-specific tokens
 * come first; the generic browser-engine tokens are the last non-unknown
 * fallback. Tokens are lower-case (the UA is lower-cased before matching).
 *
 * `gpt-` (with the hyphen) matches `gpt-4`-style client tags without matching
 * the `gptbot` crawler token; `openai` catches the openai.com bot URL.
 */
const CLIENT_MATCHERS: ReadonlyArray<readonly [AiClient, readonly string[]]> = [
  ['chatgpt', ['chatgpt', 'openai', 'gpt-']],
  ['claude', ['claude', 'anthropic']],
  ['cursor', ['cursor']],
  ['perplexity', ['perplexity']],
  ['gemini', ['gemini', 'bard']],
  ['copilot', ['copilot']],
  ['postman', ['postman']],
  ['browser', ['mozilla', 'applewebkit', 'gecko', 'chrome', 'safari', 'firefox', 'edg', 'opr']],
];

/** Named-crawler matchers, checked in order. Canonical name → lower-case token. */
const BOT_MATCHERS: ReadonlyArray<readonly [BotName, string]> = [
  ['GPTBot', 'gptbot'],
  ['OAI-SearchBot', 'oai-searchbot'],
  ['ClaudeBot', 'claudebot'],
  ['PerplexityBot', 'perplexitybot'],
  ['Google-Extended', 'google-extended'],
  ['Googlebot', 'googlebot'],
  ['CCBot', 'ccbot'],
  ['Bytespider', 'bytespider'],
  ['Bingbot', 'bingbot'],
  ['Applebot', 'applebot'],
  ['Amazonbot', 'amazonbot'],
  ['AhrefsBot', 'ahrefsbot'],
  ['SemrushBot', 'semrushbot'],
];

/**
 * Generic crawler signal for unnamed bots, so `is_bot` stays meaningful.
 *
 * Deliberately strict: a bare `bot` substring is NOT enough, because legitimate
 * interactive agents carry it inside a vendor URL (e.g. ChatGPT-User sends
 * `+https://openai.com/bot`). We require either a `<name>bot` *product token*
 * (an alphanumeric run immediately before `bot`, followed by a `/`, delimiter,
 * or end — e.g. `mj12bot/1.0`) or one of the unambiguous crawler words.
 */
const GENERIC_BOT_RE = /[a-z0-9]+bot(?:[/\s;)]|$)|crawler|spider|slurp|feedfetcher|crawl/;

/** Return the named crawler for a UA, 'other-bot' for an unnamed one, else 'none'. */
export function detectBot(userAgent: string): BotName {
  const ua = userAgent.toLowerCase();
  if (!ua) return 'none';
  for (const [name, token] of BOT_MATCHERS) {
    if (ua.includes(token)) return name;
  }
  return GENERIC_BOT_RE.test(ua) ? 'other-bot' : 'none';
}

/** Return the AI-client / software label for a UA, 'unknown' when none match. */
export function detectAiClient(userAgent: string): AiClient {
  const ua = userAgent.toLowerCase();
  if (!ua) return 'unknown';
  for (const [client, tokens] of CLIENT_MATCHERS) {
    if (tokens.some((t) => ua.includes(t))) return client;
  }
  return 'unknown';
}

/** Classify a UA into both the client and bot dimensions in one pass. */
export function classifyUserAgent(userAgent: string | undefined | null): UaClassification {
  const ua = userAgent ?? '';
  const bot = detectBot(ua);
  return { client: detectAiClient(ua), bot, isBot: bot !== 'none' };
}
