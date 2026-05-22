/**
 * Shape stored when a share URL is minted, plus the response handed back
 * to the calling tool. Storage is single-process in-memory by design —
 * marketing-MCP slugs are ephemeral analysis artifacts, not transactional
 * state. A multi-instance deploy would lose slugs minted on instance A
 * when looked up on instance B; that's acceptable for the funnel use case
 * because re-running the same analysis re-mints a fresh slug.
 */

import type { DetectionFlag } from '../detection/types.js';

export type AnalysisTool =
  | 'analyzeQboJournalCleanup'
  | 'analyzeQboJournalAnomalies'
  | 'analyzeXeroJournalCleanup'
  | 'analyzeXeroJournalAnomalies'
  | 'analyzeJournalVariance'
  | 'compareBooksToHellobooks'
  | 'estimateMigrationEffort'
  | 'analyzeTrialBalance'
  | 'analyzeProfitLoss';

export interface SharePayload {
  /** Which analytical tool minted this share. */
  tool: AnalysisTool;
  /** ISO timestamp the share was minted. */
  generatedAt: string;
  /** Per-source label — what file the analysis ran against. */
  sourceLabel: string;
  /** Original input row count + journal count for context on the share page. */
  inputSummary: {
    totalRows: number;
    totalJournals: number;
  };
  /** Detection flags produced by the analysis. */
  flags: DetectionFlag[];
  /** Pre-computed roll-ups so the renderer does not need to traverse `flags`. */
  summary: {
    byCategory: Record<string, number>;
    bySeverity: Record<string, number>;
    totalFlags: number;
  };
}

export interface ShareSlugResult {
  slug: string;
  shareUrl: string;
  expiresAt: string;
}

export interface ShareStoreEntry {
  slug: string;
  payload: SharePayload;
  /** Epoch ms when the entry should be evicted. */
  expiresAt: number;
  /** Epoch ms when the entry was minted (for debugging / metrics). */
  createdAt: number;
}
