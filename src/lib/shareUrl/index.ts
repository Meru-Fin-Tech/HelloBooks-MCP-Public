/**
 * Share-URL surface — public entry points.
 *
 * Two responsibilities:
 *   1. Mint a slug + persist a SharePayload (`mintShare`).
 *   2. Render the public HTML view (`renderSharePage`).
 *
 * Both are stateless wrappers over the in-memory `ShareStore` so the
 * MCP tool layer never imports the store directly.
 */

import type { SharePayload, ShareSlugResult, AnalysisTool } from './types.js';
import type { DetectionFlag } from '../detection/types.js';
import { defaultShareStore } from './store.js';

export { ShareStore, defaultShareStore } from './store.js';
export { renderSharePage } from './render.js';
export { isValidSlug, generateSlug } from './slug.js';
export type {
  SharePayload,
  ShareSlugResult,
  ShareStoreEntry,
  AnalysisTool,
} from './types.js';

export interface MintShareInput {
  tool: AnalysisTool;
  sourceLabel: string;
  inputSummary: SharePayload['inputSummary'];
  flags: DetectionFlag[];
  /** Override the public host. Defaults to env or production URL. */
  publicBaseUrl?: string;
}

const DEFAULT_BASE_URL = process.env.MCP_PUBLIC_BASE_URL ?? 'https://agents.hellobooks.ai';

/**
 * Mint a fresh share URL for a tool's analysis output. Returns the slug,
 * absolute URL, and expiry ISO timestamp.
 */
export function mintShare(input: MintShareInput): ShareSlugResult {
  const summary = summarise(input.flags);
  const payload: SharePayload = {
    tool: input.tool,
    generatedAt: new Date().toISOString(),
    sourceLabel: input.sourceLabel,
    inputSummary: input.inputSummary,
    flags: input.flags,
    summary,
  };
  const { slug, expiresAt } = defaultShareStore.mint(payload);
  const base = (input.publicBaseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
  return {
    slug,
    shareUrl: `${base}/r/${slug}`,
    expiresAt: new Date(expiresAt).toISOString(),
  };
}

function summarise(flags: DetectionFlag[]): SharePayload['summary'] {
  const byCategory: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};
  for (const f of flags) {
    byCategory[f.category] = (byCategory[f.category] ?? 0) + 1;
    bySeverity[f.severity] = (bySeverity[f.severity] ?? 0) + 1;
  }
  return {
    byCategory,
    bySeverity,
    totalFlags: flags.length,
  };
}
