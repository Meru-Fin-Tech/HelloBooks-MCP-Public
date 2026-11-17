import { test } from 'node:test';
import assert from 'node:assert/strict';

import { countrySupport } from '../src/tools/countrySupport.js';

test('summary mode returns counts, not full feature/compliance arrays', () => {
  const r = countrySupport({ summary: true }) as any;
  assert.equal(r.mode, 'summary');
  assert.ok(r.countries.length > 0);
  for (const c of r.countries) {
    assert.ok(typeof c.featureCount === 'number', 'summary row has featureCount');
    assert.ok(typeof c.complianceCount === 'number', 'summary row has complianceCount');
    assert.ok(!('features' in c), 'summary row must NOT inline the features array');
    assert.ok(!('compliance' in c), 'summary row must NOT inline the compliance array');
    assert.ok(c.country && c.countryName, 'summary row keeps country + name');
  }
});

test('summary counts match the full detail', () => {
  const full = countrySupport({}) as any;
  const summary = countrySupport({ summary: true }) as any;
  assert.equal(summary.count, full.count);
  const byCode = new Map(full.countries.map((c: any) => [c.country, c]));
  for (const s of summary.countries) {
    const f = byCode.get(s.country) as any;
    assert.ok(f, `full matrix has ${s.country}`);
    assert.equal(s.featureCount, f.features.length, `${s.country} featureCount matches`);
    assert.equal(s.complianceCount, f.compliance.length, `${s.country} complianceCount matches`);
  }
});

test('summary is ignored when a specific country is requested (full detail returned)', () => {
  const r = countrySupport({ country: 'IN', summary: true }) as any;
  assert.equal(r.count, 1);
  assert.ok(Array.isArray(r.countries[0].features), 'per-country query returns full detail');
});

test('default (no summary) behaviour is unchanged', () => {
  const r = countrySupport({}) as any;
  assert.equal(r.mode, undefined, 'default response has no summary mode flag');
  assert.ok(Array.isArray(r.countries[0].features), 'default returns full detail');
});
