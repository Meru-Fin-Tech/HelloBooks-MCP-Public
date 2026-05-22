import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parseCsv } from '../src/lib/parsers/csv.js';

test('parseCsv handles a basic two-column CSV', () => {
  const r = parseCsv('a,b\n1,2\n3,4\n');
  assert.deepEqual(r.columns, ['a', 'b']);
  assert.equal(r.rows.length, 2);
  assert.deepEqual(r.rows[0], { a: '1', b: '2' });
  assert.deepEqual(r.rows[1], { a: '3', b: '4' });
});

test('parseCsv handles quoted fields with commas inside', () => {
  const r = parseCsv('name,memo\n"Acme, Inc","First, then second"\n');
  assert.equal(r.rows[0].name, 'Acme, Inc');
  assert.equal(r.rows[0].memo, 'First, then second');
});

test('parseCsv handles escaped quotes inside quoted fields', () => {
  const r = parseCsv('memo\n"He said ""hi"" today"\n');
  assert.equal(r.rows[0].memo, 'He said "hi" today');
});

test('parseCsv handles embedded newlines inside quoted fields', () => {
  const r = parseCsv('memo\n"line one\nline two"\nnext-row\n');
  assert.equal(r.rows[0].memo, 'line one\nline two');
  assert.equal(r.rows[1].memo, 'next-row');
});

test('parseCsv handles CRLF line endings', () => {
  const r = parseCsv('a,b\r\n1,2\r\n3,4\r\n');
  assert.equal(r.rows.length, 2);
  assert.deepEqual(r.rows[0], { a: '1', b: '2' });
});

test('parseCsv strips UTF-8 BOM', () => {
  const r = parseCsv('﻿a,b\n1,2\n');
  assert.deepEqual(r.columns, ['a', 'b']);
});

test('parseCsv skips wholly empty rows', () => {
  const r = parseCsv('a,b\n1,2\n,\n3,4\n');
  assert.equal(r.rows.length, 2);
});

test('parseCsv returns empty result for empty input', () => {
  const r = parseCsv('');
  assert.equal(r.columns.length, 0);
  assert.equal(r.rows.length, 0);
});

test('parseCsv respects maxRows cap', () => {
  const lines = ['a'];
  for (let i = 0; i < 100; i++) lines.push(String(i));
  const r = parseCsv(lines.join('\n'), { maxRows: 10 });
  assert.equal(r.rows.length, 10);
});

test('parseCsv handles file without trailing newline', () => {
  const r = parseCsv('a,b\n1,2');
  assert.equal(r.rows.length, 1);
  assert.deepEqual(r.rows[0], { a: '1', b: '2' });
});

test('parseCsv fills missing trailing cells as empty strings', () => {
  const r = parseCsv('a,b,c\n1,2\n');
  assert.equal(r.rows[0].a, '1');
  assert.equal(r.rows[0].b, '2');
  assert.equal(r.rows[0].c, '');
});
