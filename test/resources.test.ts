import { test } from 'node:test';
import assert from 'node:assert/strict';

import { RESOURCES, readResource } from '../src/resources/index.js';

test('RESOURCES exposes about + changelog + feature-catalog', () => {
  const uris = RESOURCES.map((r) => r.uri).sort();
  assert.deepEqual(uris, [
    'hellobooks://about',
    'hellobooks://changelog',
    'hellobooks://feature-catalog',
  ]);
});

test('readResource(about) returns markdown', () => {
  const out = readResource('hellobooks://about');
  assert.equal(out.contents.length, 1);
  assert.equal(out.contents[0]!.mimeType, 'text/markdown');
  assert.match(out.contents[0]!.text, /# HelloBooks/);
});

test('readResource(changelog) returns valid JSON', () => {
  const out = readResource('hellobooks://changelog');
  assert.equal(out.contents[0]!.mimeType, 'application/json');
  const parsed = JSON.parse(out.contents[0]!.text);
  assert.ok(Array.isArray(parsed.entries));
  assert.ok(parsed.entries.length > 0);
  assert.ok(parsed.entries.length <= 50);
});

test('readResource(feature-catalog) returns the full catalog as JSON', () => {
  const out = readResource('hellobooks://feature-catalog');
  assert.equal(out.contents[0]!.mimeType, 'application/json');
  const parsed = JSON.parse(out.contents[0]!.text);
  assert.equal(parsed.categoryCount, 13);
  assert.ok(parsed.featureCount >= 90);
  assert.ok(Array.isArray(parsed.features));
  assert.ok(Array.isArray(parsed.categories));
});

test('readResource throws on unknown URI', () => {
  assert.throws(() => readResource('hellobooks://does-not-exist'));
});
