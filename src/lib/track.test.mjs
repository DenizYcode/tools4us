// Analytics rules: what is cut from a page view, which events exist, and when nothing is loaded at all.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { EVENTS, isEvent, cleanPath, cleanReferrer, doNotTrack } from './track.mjs';

test('a page path loses its query string and fragment, so a search or a shared list is never reported', () => {
  assert.equal(cleanPath('/tools4us/tr/ara/?q=isik'), '/tools4us/tr/ara/');
  assert.equal(cleanPath('/tools4us/tr/seclimlerim/?l=wireless:cw9172i'), '/tools4us/tr/seclimlerim/');
  assert.equal(cleanPath('/tools4us/tr/sozluk/#mgig'), '/tools4us/tr/sozluk/');
  assert.equal(cleanPath(''), '/');
  assert.equal(cleanPath(undefined), '/');
});

test('a same-site referrer keeps its path only, another site keeps its origin only', () => {
  const origin = 'https://denizycode.github.io';
  assert.equal(cleanReferrer('https://denizycode.github.io/tools4us/tr/ara/?q=isik', origin), '/tools4us/tr/ara/');
  assert.equal(cleanReferrer('https://www.google.com/search?q=cisco+partner', origin), 'https://www.google.com');
  assert.equal(cleanReferrer('', origin), '');
  assert.equal(cleanReferrer('not a url', origin), '');
});

test('Do Not Track and Global Privacy Control both stop analytics', () => {
  assert.equal(doNotTrack({ doNotTrack: '1' }), true);
  assert.equal(doNotTrack({ doNotTrack: 'yes' }), true);
  assert.equal(doNotTrack({}, { doNotTrack: '1' }), true);
  assert.equal(doNotTrack({ msDoNotTrack: '1' }), true);
  assert.equal(doNotTrack({ globalPrivacyControl: true }), true);
  assert.equal(doNotTrack({ doNotTrack: '0' }), false);
  assert.equal(doNotTrack({ doNotTrack: null }), false);
  assert.equal(doNotTrack(), false);
});

test('events are plain names from one list, nothing that could hold typed text', () => {
  assert.ok(EVENTS.length >= 10);
  for (const name of EVENTS) assert.match(name, /^[a-z]+(-[a-z]+)*$/, name);
  assert.equal(new Set(EVENTS).size, EVENTS.length);
  assert.equal(isEvent('search-zero'), true);
  assert.equal(isEvent('isik'), false);
  assert.equal(isEvent('search-zero?q=isik'), false);
});

test('the vendored GoatCounter script is the file that was reviewed (pinned by hash)', () => {
  const dir = new URL('../../public/vendor/goatcounter/', import.meta.url);
  const source = JSON.parse(readFileSync(new URL('source.json', dir), 'utf8'));
  const bytes = readFileSync(new URL('count.js', dir));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), source.sha256);
  assert.equal(bytes.length, source.bytes);
  // It must not name a host of its own: it only talks to the endpoint on its own script tag.
  assert.equal(/https?:\/\//.test(bytes.toString('utf8').replace(/https?:\/\/(www\.goatcounter\.com|opensource\.org)[^\s'"]*/g, '')), false);
});
