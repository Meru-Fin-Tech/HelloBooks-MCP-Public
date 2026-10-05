/**
 * HTTP surface for the voice knowledge pack (see ./voiceKnowledge.ts).
 *
 *   GET  /kb/voice.json?country=IN   full pack (structured + `text`)
 *   GET  /kb/voice.txt?country=IN    just the prompt-ready text block
 *   POST /kb/refresh                 re-pull live pricing now (bearer token)
 *
 * Both GETs send `ETag: "<version>"` and honour If-None-Match with a 304, so
 * a caller that keeps its copy pays one tiny revalidation per call and
 * re-downloads only when a fact changed. `X-KB-Version`, `X-KB-Facts-As-Of`
 * and `X-KB-Generated-At` carry the timestamps on both representations.
 *
 * /kb/refresh exists so a price change on hellobooks.ai reaches the agent
 * immediately instead of after the 1-hour feed TTL. It is disabled (404)
 * unless HELLOBOOKS_KB_REFRESH_TOKEN is set. Content other than prices
 * (onboarding offer, rules) changes through a reviewed commit, not this API —
 * a public server must not accept writes to what an agent tells customers.
 */

import { Router, type Request, type Response } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { ensurePricingWarm, getPricingMeta, refreshPricingFromFeed } from './pricingFeed.js';
import { buildVoicePack, resolveVoiceCountry, type VoicePack } from './voiceKnowledge.js';
import { SUPPORTED_COUNTRY_CODES } from './data/supportedCountries.js';

const CACHE_CONTROL = 'public, max-age=300, stale-while-revalidate=3600';

function tokenMatches(header: string | undefined, expected: string): boolean {
  const given = header?.startsWith('Bearer ') ? header.slice(7) : '';
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function packFor(req: Request, res: Response): Promise<VoicePack | null> {
  const country = resolveVoiceCountry(req.query.country);
  if (!country) {
    res.status(400).json({
      error: 'country-required',
      message: 'Pass ?country=<ISO code>, e.g. ?country=IN',
      supported: SUPPORTED_COUNTRY_CODES,
    });
    return null;
  }
  await ensurePricingWarm();
  const pack = buildVoicePack(country);
  const etag = `"${pack.version}"`;
  res.setHeader('ETag', etag);
  res.setHeader('Cache-Control', CACHE_CONTROL);
  res.setHeader('X-KB-Version', pack.version);
  res.setHeader('X-KB-Facts-As-Of', pack.factsAsOf);
  res.setHeader('X-KB-Generated-At', pack.generatedAt);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Expose-Headers', 'ETag, X-KB-Version, X-KB-Facts-As-Of, X-KB-Generated-At');
  const inm = req.header('if-none-match');
  if (inm && inm.split(',').map((s) => s.trim().replace(/^W\//, '')).includes(etag)) {
    res.status(304).end();
    return null;
  }
  return pack;
}

export function createVoiceKnowledgeRouter(): Router {
  const router = Router();

  router.get('/voice.json', async (req, res, next) => {
    try {
      const pack = await packFor(req, res);
      if (pack) res.type('application/json; charset=utf-8').send(JSON.stringify(pack, null, 2));
    } catch (err) {
      next(err);
    }
  });

  router.get('/voice.txt', async (req, res, next) => {
    try {
      const pack = await packFor(req, res);
      if (pack) res.type('text/plain; charset=utf-8').send(pack.text);
    } catch (err) {
      next(err);
    }
  });

  router.post('/refresh', async (req, res) => {
    const expected = process.env.HELLOBOOKS_KB_REFRESH_TOKEN;
    if (!expected) {
      res.status(404).json({ error: 'not-found' });
      return;
    }
    if (!tokenMatches(req.header('authorization'), expected)) {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }
    const before = getPricingMeta();
    await refreshPricingFromFeed();
    const after = getPricingMeta();
    const refreshed = after.lastFetchedAt !== before.lastFetchedAt;
    res.status(refreshed ? 200 : 502).json({
      refreshed,
      ...after,
      ...(refreshed ? {} : { message: 'Live pricing feed could not be fetched; the last good copy is still being served.' }),
    });
  });

  return router;
}
