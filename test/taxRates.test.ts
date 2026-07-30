import { test } from 'node:test';
import assert from 'node:assert/strict';

import { listTaxRates } from '../src/tools/listTaxRates.js';
import { lookupTaxRate } from '../src/tools/lookupTaxRate.js';
import { TAX_RATES } from '../src/data/taxRates.js';

// Pin pricing to the baked catalog so the shared test setup stays
// deterministic when these tests are mixed into the suite.
process.env.HELLOBOOKS_MCP_DISABLE_PRICING_FEED = '1';

test('list_tax_rates returns every catalog entry when unfiltered', () => {
  const r = listTaxRates({});
  assert.equal(r.rates.length, TAX_RATES.length);
  assert.equal(r.count, TAX_RATES.length);
  assert.ok(r.disclaimer.includes('confirm'));
});

test('list_tax_rates country=IN returns Indian slabs only', () => {
  const r = listTaxRates({ country: 'IN' });
  assert.ok(r.rates.length >= 5);
  for (const rate of r.rates) assert.equal(rate.country, 'IN');
});

test('list_tax_rates scheme=composition returns Indian composition slabs', () => {
  const r = listTaxRates({ scheme: 'composition' });
  // Trader 1%, Manufacturer 1%, Restaurant 5%.
  assert.equal(r.count, 3);
  for (const rate of r.rates) assert.equal(rate.scheme, 'composition');
});

test('list_tax_rates taxType=VAT covers GB and AE', () => {
  const r = listTaxRates({ taxType: 'VAT' });
  const countries = new Set(r.rates.map((x) => x.country));
  assert.ok(countries.has('GB'));
  assert.ok(countries.has('AE'));
});

test('lookup_tax_rate by exact id returns deterministic match', () => {
  const r = lookupTaxRate({ id: 'IN-standard-18' });
  assert.ok(r.match);
  assert.equal(r.match!.id, 'IN-standard-18');
  assert.equal(r.match!.rate, 18);
});

test('lookup_tax_rate by unknown id returns null with hint', () => {
  const r = lookupTaxRate({ id: 'XX-never-existed' });
  assert.equal(r.match, null);
  assert.ok(r.hint);
});

test('lookup_tax_rate without id or country surfaces validation hint', () => {
  const r = lookupTaxRate({});
  assert.equal(r.match, null);
  assert.ok(r.message!.toLowerCase().includes('required'));
});

test('lookup_tax_rate by country + category picks a plausible slab', () => {
  const r = lookupTaxRate({ country: 'IN', category: 'office supplies' });
  assert.ok(r.match);
  // "office supplies" appears explicitly under IN-standard-18.
  assert.equal(r.match!.id, 'IN-standard-18');
});

test('lookup_tax_rate by country without category returns the country standard slab', () => {
  const r = lookupTaxRate({ country: 'AU' });
  assert.ok(r.match);
  assert.equal(r.match!.country, 'AU');
  assert.equal(r.match!.scheme, 'standard');
});

test('lookup_tax_rate GB exports query selects zero or reduced slab plausibly', () => {
  const r = lookupTaxRate({ country: 'GB', category: 'books' });
  // GB-zero-0 lists "books" — direct hit.
  assert.ok(r.match);
  assert.equal(r.match!.id, 'GB-zero-0');
});

test('Canada provincial sales taxes exist at the correct rates', () => {
  // BC PST 7%, SK PST 6%, MB RST 7% (taxType PST), QC QST 9.975%.
  const expected = [
    { id: 'CA-pst-7-bc', taxType: 'PST', rate: 7 },
    { id: 'CA-pst-6-sk', taxType: 'PST', rate: 6 },
    { id: 'CA-pst-7-mb', taxType: 'PST', rate: 7 },
    { id: 'CA-qst-9975-qc', taxType: 'QST', rate: 9.975 },
  ];
  for (const { id, taxType, rate } of expected) {
    const r = lookupTaxRate({ id });
    assert.ok(r.match, `${id} must exist in the catalog`);
    assert.equal(r.match!.country, 'CA');
    assert.equal(r.match!.taxType, taxType, `${id} should be taxType ${taxType}`);
    assert.equal(r.match!.rate, rate, `${id} should be ${rate}%`);
    assert.equal(r.match!.scheme, 'standard');
  }
});

test('list_tax_rates taxType=PST returns the three BC/SK/MB provincial rates', () => {
  const r = listTaxRates({ taxType: 'PST' });
  assert.equal(r.count, 3);
  const ids = new Set(r.rates.map((x) => x.id));
  assert.ok(ids.has('CA-pst-7-bc'));
  assert.ok(ids.has('CA-pst-6-sk'));
  assert.ok(ids.has('CA-pst-7-mb'));
  for (const rate of r.rates) assert.equal(rate.taxType, 'PST');
});

test('list_tax_rates taxType=QST returns only Québec', () => {
  const r = listTaxRates({ taxType: 'QST' });
  assert.equal(r.count, 1);
  assert.equal(r.rates[0]!.id, 'CA-qst-9975-qc');
  assert.equal(r.rates[0]!.rate, 9.975);
});

test('every tax rate entry carries an authoritative source URL', () => {
  for (const rate of TAX_RATES) {
    assert.ok(rate.source.startsWith('https://'), `rate ${rate.id} must link an https source`);
    assert.ok(rate.effectiveFrom.match(/^\d{4}-\d{2}-\d{2}$/), `rate ${rate.id} needs ISO effectiveFrom`);
  }
});

// ── GST 2.0 supersession (56th GST Council, eff. 22 Sep 2025) ──────────
// The AEO refresh (fix/aeo-full-accuracy-refresh-2026-07-10) reworked the
// India slabs but shipped untested. These lock the supersession contract so
// the 12%/28% legacy rows can never silently lose their close-out dates and
// the new 40% demerit slab can never silently disappear or drift.

const byId = (id: string) => {
  const row = TAX_RATES.find((r) => r.id === id);
  assert.ok(row, `expected a TAX_RATES row with id ${id}`);
  return row!;
};

test('IN-standard-12 is superseded by GST 2.0 with effectiveTo 2025-09-21', () => {
  const row = byId('IN-standard-12');
  assert.equal(row.rate, 12);
  assert.equal(row.effectiveTo, '2025-09-21');
});

test('IN-standard-28 is superseded by GST 2.0 with effectiveTo 2025-09-21', () => {
  const row = byId('IN-standard-28');
  assert.equal(row.rate, 28);
  assert.equal(row.effectiveTo, '2025-09-21');
});

test('IN-demerit-40 is the new GST 2.0 sin/luxury slab from 2025-09-22', () => {
  const row = byId('IN-demerit-40');
  assert.equal(row.rate, 40);
  assert.equal(row.effectiveFrom, '2025-09-22');
  // The demerit slab is a live successor — it must NOT carry a close-out date.
  assert.equal(row.effectiveTo, undefined);
});

// ── Canada — Nova Scotia HST 15% → 14% (eff. 2025-04-01) ───────────────
test('CA-hst-14-ns exists at rate 14 effective 2025-04-01', () => {
  const row = byId('CA-hst-14-ns');
  assert.equal(row.country, 'CA');
  assert.equal(row.taxType, 'HST');
  assert.equal(row.rate, 14);
  assert.equal(row.effectiveFrom, '2025-04-01');
});

test('CA-hst-15-atlantic note points at the Nova Scotia change', () => {
  const row = byId('CA-hst-15-atlantic');
  assert.ok(row.notes, 'CA-hst-15-atlantic must carry a supersession note');
  assert.ok(
    row.notes!.includes('CA-hst-14-ns'),
    'CA-hst-15-atlantic note must reference CA-hst-14-ns',
  );
});

// ── lookup_tax_rate must never return a superseded slab from fuzzy match ─
// Regression for the live bug where lookup_tax_rate(IN, "luxury car") returned
// the ABOLISHED IN-standard-28 (28%, effectiveTo 2025-09-21) instead of the
// current IN-demerit-40 (40%). The best-match/standard-slab paths must exclude
// rows that carry an effectiveTo; explicit id lookups must still return them.

for (const category of ['luxury car', 'tobacco', 'pan masala']) {
  test(`lookup_tax_rate IN "${category}" resolves to the current 40% demerit slab, not the abolished 28%`, () => {
    const r = lookupTaxRate({ country: 'IN', category });
    assert.ok(r.match, `expected a match for ${category}`);
    assert.equal(r.match!.id, 'IN-demerit-40');
    assert.notEqual(r.match!.id, 'IN-standard-28');
    assert.equal(r.match!.effectiveTo, undefined, 'a current-rate lookup must not return a superseded row');
  });
}

test('lookup_tax_rate IN without category returns the current standard slab, not a superseded one', () => {
  const r = lookupTaxRate({ country: 'IN' });
  assert.ok(r.match);
  assert.equal(r.match!.scheme, 'standard');
  assert.equal(r.match!.effectiveTo, undefined, 'the standard-slab fallback must skip retired standard rows');
  assert.equal(r.match!.id, 'IN-standard-18');
});

test('lookup_tax_rate by explicit id still returns a superseded slab (historical lookups stay valid)', () => {
  const r = lookupTaxRate({ id: 'IN-standard-28' });
  assert.ok(r.match);
  assert.equal(r.match!.id, 'IN-standard-28');
  assert.equal(r.match!.rate, 28);
  assert.equal(r.match!.effectiveTo, '2025-09-21');
});

// ── General invariant: "superseded" labels must be dated ───────────────
// Any row we call superseded MUST carry the date it stopped being current,
// or downstream consumers would quote a dead rate as live.
test('every row labelled "superseded" carries an effectiveTo close-out date', () => {
  const superseded = TAX_RATES.filter((r) => r.label.toLowerCase().includes('superseded'));
  assert.ok(superseded.length >= 2, 'expected the GST 2.0 legacy slabs to be labelled superseded');
  for (const row of superseded) {
    assert.ok(
      row.effectiveTo && /^\d{4}-\d{2}-\d{2}$/.test(row.effectiveTo),
      `superseded row ${row.id} must carry an ISO effectiveTo`,
    );
  }
});
