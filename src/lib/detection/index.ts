/**
 * Detection library — pure-function detectors over `NormalizedJournal[]`.
 *
 * Each detector returns `DetectionFlag[]`. Detectors do not chain; the MCP
 * tool layer concatenates the flag streams from the detectors it cares
 * about for a given analysis (cleanup vs anomalies vs variance).
 */

export type {
  DetectionFlag,
  DetectionCategory,
  DetectionSeverity,
  NormalizedJournal,
  NormalizedLine,
} from './types.js';

export { normalizeQboJournal, normalizeXeroJournal, normalizeZohoJournal, normalizeWaveJournal } from './normalize.js';
export { detectImbalance } from './imbalance.js';
export { detectDuplicates } from './duplicates.js';
export { detectRoundNumber } from './roundNumber.js';
export { schemaFlagsFromJournals } from './schemaIssues.js';
export { detectVariance } from './variance.js';
export { detectTbImbalance, detectTbWrongSign, detectTbRoundBalance } from './trialBalanceChecks.js';
export { detectPnlSubtotalMismatch, detectPnlNegativeExpense, detectPnlMarginRedFlag } from './profitLossChecks.js';
export { detectBsEquationBroken, detectBsNegativeCashOrAr, detectBsNegativeEquity } from './balanceSheetChecks.js';
