/**
 * Voice-pack token-budget guard (#91).
 *
 * An AI phone agent loads a country's voice pack into its system prompt once per
 * call, so every pack must stay small (~850–1,350 tokens, documented). If a pack
 * balloons, every call gets slower and pricier. This test caps each per-country
 * pack and the all-countries bundle so a regression fails CI.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { buildVoicePack, buildAllVoicePacks } from '../src/voiceKnowledge.js';
import { SUPPORTED_COUNTRY_CODES } from '../src/data/supportedCountries.js';

process.env.HELLOBOOKS_MCP_DISABLE_PRICING_FEED = '1';
process.env.HELLOBOOKS_MCP_DISABLE_ARTICLES_FEED = '1';

// Fixed reference date so the pack (which embeds due dates) is deterministic.
const NOW = new Date('2026-11-17T00:00:00Z');

/** Per-country ceiling in approx tokens — well above the ~1,350 observed max,
 *  low enough to catch a pack that balloons. */
const PER_COUNTRY_BUDGET = 1800;

test('every per-country voice pack stays within the token budget', () => {
  for (const country of SUPPORTED_COUNTRY_CODES) {
    const pack = buildVoicePack(country, NOW);
    assert.ok(
      pack.approxTokens <= PER_COUNTRY_BUDGET,
      `${country} voice pack is ${pack.approxTokens} tokens (> ${PER_COUNTRY_BUDGET})`,
    );
    assert.ok(pack.approxTokens > 0, `${country} pack must have content`);
  }
});

test('the all-countries bundle reports a token total and per-country packs', () => {
  const bundle = buildAllVoicePacks(NOW);
  assert.ok(bundle.approxTokens > 0);
  // The bundle is ~the sum of its packs — it must be materially larger than one.
  const one = buildVoicePack('IN', NOW).approxTokens;
  assert.ok(bundle.approxTokens > one, 'bundle must be larger than a single pack');
});
