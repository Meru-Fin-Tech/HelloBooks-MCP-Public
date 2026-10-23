/**
 * `search` + `fetch` — the OpenAI connector contract.
 *
 * ChatGPT's deep-research and company-knowledge paths retrieve through exactly
 * two tools with fixed names and shapes:
 *
 *   search(query)  -> { results: [{ id, title, url }] }
 *   fetch(id)      -> { id, title, text, url, metadata }
 *
 * Without both, ChatGPT rejects the server outside Developer Mode. Ranking is
 * delegated to `feature_search` (which already handles competitor/deadline
 * stopwords) and each hit is resolved to a citable document from
 * ../lib/documents/. `url` is guaranteed non-empty — ChatGPT silently drops a
 * citation whose url is blank.
 *
 * Both tools are read-only over public marketing data, the same data the typed
 * tools serve. Nothing here reads customer or account data.
 */

import { z } from 'zod';
import { featureSearch } from './featureSearch.js';
import {
  buildDocumentIndex,
  documentIdForHit,
  type PublicDocument,
} from '../lib/documents/index.js';

/** OpenAI's `search` returns at most a handful of candidates per query. */
const DEFAULT_SEARCH_LIMIT = 10;

/** Ranked candidates to pull from `feature_search` per returned result. */
const OVERFETCH_FACTOR = 4;

export const publicSearchSchema = {
  query: z
    .string()
    .min(1)
    .max(300)
    .describe('Natural-language query, e.g. "HelloBooks GST filing for India" or "pricing vs Xero".'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(50)
    .optional()
    .describe(`Max results to return (default ${DEFAULT_SEARCH_LIMIT}).`),
};

export const publicFetchSchema = {
  id: z
    .string()
    .min(1)
    .max(400)
    .describe('A document id returned by `search`, e.g. "plan:pro" or "deadline:IN:gstr-3b".'),
};

export interface PublicSearchResult {
  id: string;
  title: string;
  url: string;
}

export function publicSearch(args: { query: string; limit?: number }): {
  results: PublicSearchResult[];
} {
  const limit = args.limit ?? DEFAULT_SEARCH_LIMIT;
  const index = buildDocumentIndex();
  const ranked = featureSearch({
    query: args.query,
    // `feature_search` caps at 50; over-fetch because plan hits collapse onto
    // one document per plan and would otherwise crowd out the tail.
    limit: Math.min(50, limit * OVERFETCH_FACTOR),
  });

  const results: PublicSearchResult[] = [];
  const seen = new Set<string>();
  for (const hit of ranked.results) {
    const docId = documentIdForHit(hit.source, hit.id);
    if (seen.has(docId)) continue;
    const doc = index.get(docId);
    if (!doc) continue; // ranked something the index does not expose — skip it
    seen.add(docId);
    results.push({ id: doc.id, title: doc.title, url: doc.url });
    if (results.length >= limit) break;
  }
  return { results };
}

export function publicFetch(args: { id: string }): PublicDocument {
  const doc = buildDocumentIndex().get(args.id.trim());
  if (!doc) {
    throw new Error(
      `Unknown document id "${args.id}". Call \`search\` first and fetch one of the ids it returns.`,
    );
  }
  return doc;
}
