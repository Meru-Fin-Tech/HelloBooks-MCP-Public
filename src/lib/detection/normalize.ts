/**
 * Source-specific parser shapes → unified `NormalizedJournal[]` for detectors.
 *
 * Per-source parsers carry different field names (QBO uses `journalNumber`,
 * `accountName`; Xero uses `groupKey`, `accountCode` || `accountName`); the
 * detector library should not care. This module is a thin translation layer.
 */

import type { ParsedJournal as QboParsedJournal, ParsedJournalLine as QboParsedLine } from '../parsers/qboJournal.js';
import type { ParsedJournal as XeroParsedJournal, ParsedJournalLine as XeroParsedLine } from '../parsers/xeroJournal.js';
import type { ParsedJournal as ZohoParsedJournal, ParsedJournalLine as ZohoParsedLine } from '../parsers/zohoJournal.js';
import type { ParsedJournal as WaveParsedJournal, ParsedJournalLine as WaveParsedLine } from '../parsers/waveJournal.js';
import type { NormalizedJournal, NormalizedLine } from './types.js';

function normalizeQboLine(line: QboParsedLine): NormalizedLine {
  return {
    rowIndex: line.rowIndex,
    accountIdentifier: line.accountName,
    debit: line.debit,
    credit: line.credit,
    memo: line.memo,
  };
}

export function normalizeQboJournal(journal: QboParsedJournal): NormalizedJournal {
  return {
    source: 'QBO',
    id: journal.journalNumber,
    reference: journal.journalNumber,
    narration: null,
    date: journal.date,
    lines: journal.lines.map(normalizeQboLine),
    totalDebits: journal.totalDebits,
    totalCredits: journal.totalCredits,
    balanced: journal.balanced,
  };
}

function normalizeXeroLine(line: XeroParsedLine): NormalizedLine {
  return {
    rowIndex: line.rowIndex,
    accountIdentifier: line.accountCode ?? line.accountName,
    debit: line.debit,
    credit: line.credit,
    memo: line.lineDesc ?? line.narration,
  };
}

export function normalizeXeroJournal(journal: XeroParsedJournal): NormalizedJournal {
  return {
    source: 'XERO',
    id: journal.groupKey,
    reference: journal.reference,
    narration: journal.narration,
    date: journal.date,
    lines: journal.lines.map(normalizeXeroLine),
    totalDebits: journal.totalDebits,
    totalCredits: journal.totalCredits,
    balanced: journal.balanced,
  };
}

function normalizeZohoLine(line: ZohoParsedLine): NormalizedLine {
  return {
    rowIndex: line.rowIndex,
    accountIdentifier: line.accountName,
    debit: line.debit,
    credit: line.credit,
    memo: line.lineDesc ?? line.notes,
  };
}

export function normalizeZohoJournal(journal: ZohoParsedJournal): NormalizedJournal {
  return {
    source: 'ZOHO',
    id: journal.journalNumber,
    reference: journal.reference ?? journal.journalNumber,
    narration: journal.notes,
    date: journal.date,
    lines: journal.lines.map(normalizeZohoLine),
    totalDebits: journal.totalDebits,
    totalCredits: journal.totalCredits,
    balanced: journal.balanced,
  };
}

function normalizeWaveLine(line: WaveParsedLine): NormalizedLine {
  return {
    rowIndex: line.rowIndex,
    accountIdentifier: line.accountName,
    debit: line.debit,
    credit: line.credit,
    memo: line.lineDesc ?? line.notes,
  };
}

export function normalizeWaveJournal(journal: WaveParsedJournal): NormalizedJournal {
  return {
    source: 'WAVE',
    id: journal.journalNumber,
    reference: journal.reference ?? journal.journalNumber,
    narration: journal.notes,
    date: journal.date,
    lines: journal.lines.map(normalizeWaveLine),
    totalDebits: journal.totalDebits,
    totalCredits: journal.totalCredits,
    balanced: journal.balanced,
  };
}
