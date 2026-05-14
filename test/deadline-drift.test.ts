import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  dateVariants,
  pageContainsDate,
  pageContainsDueDayNearForm,
  stripHtml,
} from '../scripts/check-deadline-drift.js';

test('dateVariants covers the common authority-page renderings', () => {
  const v = dateVariants('Jan 31');
  assert.ok(v.includes('Jan 31'));
  assert.ok(v.includes('January 31'));
  assert.ok(v.includes('Jan. 31'));
  assert.ok(v.includes('31 Jan'));
  assert.ok(v.includes('31 January'));
  assert.ok(v.includes('31st January'));
  assert.ok(v.includes('January 31st'));
});

test('dateVariants pluralises ordinals correctly', () => {
  assert.ok(dateVariants('Jan 1').includes('January 1st'));
  assert.ok(dateVariants('Jan 2').includes('January 2nd'));
  assert.ok(dateVariants('Jan 3').includes('January 3rd'));
  assert.ok(dateVariants('Jan 4').includes('January 4th'));
  // 11th / 12th / 13th, not 11st / 12nd / 13rd
  assert.ok(dateVariants('Jan 11').includes('January 11th'));
  assert.ok(dateVariants('Jan 12').includes('January 12th'));
  assert.ok(dateVariants('Jan 13').includes('January 13th'));
  // 21st, 22nd, 23rd are back
  assert.ok(dateVariants('Jan 21').includes('January 21st'));
  assert.ok(dateVariants('Jan 22').includes('January 22nd'));
});

test('pageContainsDate matches case-insensitively across variants', () => {
  const page = 'Returns must be filed by 31st january of the following year.';
  assert.equal(pageContainsDate(page, 'Jan 31'), true);
});

test('pageContainsDate returns false when no variant appears', () => {
  const page = 'The deadline is mid-February.';
  assert.equal(pageContainsDate(page, 'Jan 31'), false);
});

test('pageContainsDueDayNearForm finds the day in the window around the form', () => {
  const page =
    'Section 39: GSTR-3B must be furnished by the 20th of the month following the tax period.';
  assert.equal(pageContainsDueDayNearForm(page, 'GSTR-3B', 20), true);
});

test('pageContainsDueDayNearForm rejects a day far from the form name', () => {
  const padding = 'lorem ipsum '.repeat(200); // ~2400 chars
  const page = `GSTR-3B is the monthly summary return. ${padding} Filing day: 11.`;
  assert.equal(pageContainsDueDayNearForm(page, 'GSTR-3B', 11), false);
});

test('pageContainsDueDayNearForm returns false when form name is absent', () => {
  const page = 'Returns must be filed by the 20th of every month.';
  assert.equal(pageContainsDueDayNearForm(page, 'GSTR-3B', 20), false);
});

test('stripHtml removes tags, scripts and styles', () => {
  const html = `
    <html><head><style>body{}</style></head>
    <body><script>alert(1)</script>
    <p>GSTR-3B is due by the <b>20th</b> of the next month.</p>
    </body></html>`;
  const text = stripHtml(html);
  assert.equal(text.includes('alert'), false);
  assert.equal(text.includes('body{}'), false);
  assert.match(text, /GSTR-3B is due by the 20th of the next month\./);
});
