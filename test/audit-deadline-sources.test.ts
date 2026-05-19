/**
 * Unit tests for the pure helpers in scripts/audit-deadline-sources.ts.
 * The network-hitting main() is guarded against import-on-test by the
 * `invokedDirectly` check in that file.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  dateVariants,
  stripHtml,
  checkDeadline,
} from '../scripts/audit-deadline-sources.js';
import { COMPLIANCE_DEADLINES } from '../src/data/complianceDeadlines.js';

test('dateVariants expands "Jan 31" into the common phrasings authorities use', () => {
  const v = dateVariants('Jan 31');
  assert.ok(v.includes('Jan 31'));
  assert.ok(v.includes('January 31'));
  assert.ok(v.includes('31 January'));
  assert.ok(v.includes('31 Jan'));
  assert.ok(v.includes('31st January'));
});

test('dateVariants picks the correct ordinal suffix for 1st/2nd/3rd/11th/22nd', () => {
  assert.ok(dateVariants('Apr 1').includes('1st April'));
  assert.ok(dateVariants('Apr 2').includes('2nd April'));
  assert.ok(dateVariants('Apr 3').includes('3rd April'));
  assert.ok(dateVariants('Apr 11').includes('11th April'));   // not 11st
  assert.ok(dateVariants('Apr 22').includes('22nd April'));
});

test('stripHtml removes tags, script/style blocks, and entities', () => {
  const html =
    '<html><head><style>.a{color:red}</style></head><body>' +
    '<script>alert(1)</script>' +
    '<p>Due&nbsp;<b>31 January</b>&amp;done</p>' +
    '</body></html>';
  const text = stripHtml(html);
  assert.ok(text.includes('31 January'));
  assert.ok(text.includes('Due'));
  assert.ok(text.includes('&done')); // &amp; → &
  assert.ok(!text.includes('alert'));
  assert.ok(!text.includes('color:red'));
  assert.ok(!text.includes('<'));
});

test('checkDeadline returns null when form name + every date appears in page text', () => {
  const d = COMPLIANCE_DEADLINES.find((x) => x.id === 'bas')!;
  const page =
    'Business Activity Statement (BAS) due dates: 28 October, 28 February, ' +
    '28 April, 28 July. Tax-agent concessions may apply.';
  assert.equal(checkDeadline(d, page), null);
});

test('checkDeadline flags a missing form name', () => {
  const d = COMPLIANCE_DEADLINES.find((x) => x.id === 'bas')!;
  const page = 'Some unrelated authority page that happens to mention 28 October.';
  const f = checkDeadline(d, page);
  assert.ok(f);
  assert.match(f!.reason, /not found/);
});

test('checkDeadline flags a missing annual date', () => {
  const d = COMPLIANCE_DEADLINES.find((x) => x.id === 'bas')!;
  // Form name appears, but only 3 of 4 dates do.
  const page = 'BAS due 28 October, 28 February, 28 April, plus other notes.';
  const f = checkDeadline(d, page);
  assert.ok(f);
  assert.match(f!.reason, /Jul 28|28 July/);
});

test('checkDeadline accepts dueDay match via ordinal', () => {
  const d = COMPLIANCE_DEADLINES.find((x) => x.id === 'pf-ecr')!;
  const page = 'PF ECR Provident Fund return must be filed by the 15th of the following month.';
  assert.equal(checkDeadline(d, page), null);
});

test('checkDeadline flags dueDay drift when the number is not referenced', () => {
  const d = COMPLIANCE_DEADLINES.find((x) => x.id === 'pf-ecr')!;
  const page = 'PF ECR must be filed monthly. (No specific day mentioned.)';
  const f = checkDeadline(d, page);
  assert.ok(f);
  assert.match(f!.reason, /dueDay 15/);
});
