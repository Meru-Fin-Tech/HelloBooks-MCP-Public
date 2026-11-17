import { test } from 'node:test';
import assert from 'node:assert/strict';

import { explainTerm } from '../src/tools/explainTerm.js';
import { GLOSSARY } from '../src/data/glossary.js';

test('exact term match returns a definition and related terms', () => {
  const r = explainTerm({ term: 'accrual accounting' });
  assert.equal(r.found, true);
  assert.equal(r.term?.id, 'accrual-accounting');
  assert.ok(r.term!.definition.length > 20);
  assert.ok(r.related.some((x) => x.id === 'cash-accounting'));
});

test('alias resolves to the canonical term (P&L)', () => {
  const r = explainTerm({ term: 'P&L' });
  assert.equal(r.term?.id, 'profit-and-loss');
});

test('substring match handles a form code (GSTR-3B)', () => {
  const r = explainTerm({ term: 'gstr3b' });
  assert.equal(r.found, true);
  assert.equal(r.term?.id, 'gstr-3b');
});

test('unknown term returns suggestions, not a fabricated definition', () => {
  const r = explainTerm({ term: 'photosynthesis' });
  assert.equal(r.found, false);
  assert.equal(r.term, null);
  assert.ok(Array.isArray(r.suggestions));
});

test('every glossary term is resolvable by its own name', () => {
  for (const g of GLOSSARY) {
    const r = explainTerm({ term: g.term });
    assert.equal(r.found, true, `"${g.term}" should resolve`);
    assert.equal(r.term?.id, g.id);
  }
});

test('every related id points at a real glossary entry', () => {
  const ids = new Set(GLOSSARY.map((g) => g.id));
  for (const g of GLOSSARY) {
    for (const rel of g.related) {
      assert.ok(ids.has(rel), `${g.id} references missing related term "${rel}"`);
    }
  }
});

test('glossary ids are unique', () => {
  const ids = GLOSSARY.map((g) => g.id);
  assert.equal(new Set(ids).size, ids.length);
});
