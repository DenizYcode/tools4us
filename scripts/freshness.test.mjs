import test from 'node:test';
import assert from 'node:assert/strict';
import { freshnessReport, daysBetween } from './freshness.mjs';

const story = (over = {}) => ({ slug: { tr: 'a', en: 'a' }, featured: true, last_verified: '2026-10-13', review_by: '2027-01-11', ...over });
const model = (over = {}) => ({ pid: 'X1', last_verified: '2026-10-10', ...over });
const run = (stories, models, today) => freshnessReport({ stories, models, today });

test('daysBetween counts calendar days', () => {
  assert.equal(daysBetween('2026-10-13', '2027-01-11'), 90);
  assert.equal(daysBetween('2026-10-13', '2026-10-13'), 0);
});

test('a fresh featured story and fresh models report nothing', () => {
  const r = run([story()], [model()], '2026-10-14');
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.warnings, []);
  assert.equal(r.facts.nextReview, '2027-01-11');
});

test('a featured story close to review_by warns, past review_by is an error', () => {
  const soon = run([story()], [model()], '2026-12-25');
  assert.equal(soon.errors.length, 0);
  assert.match(soon.warnings[0], /must be re-verified by 2027-01-11/);
  const late = run([story()], [model()], '2027-01-12');
  assert.match(late.errors.join('\n'), /past review_by/);
});

test('a featured story verified more than 90 days ago is an error even before review_by', () => {
  const r = run([story({ review_by: '2027-03-01' })], [model()], '2027-01-12');
  assert.match(r.errors.join('\n'), /verified 91 days ago/);
});

test('an unfeatured story past review_by only warns', () => {
  const r = run([story({ featured: false })], [model()], '2027-02-01');
  assert.deepEqual(r.errors, []);
  assert.match(r.warnings[0], /past review_by/);
});

test('old catalog rows warn once with the oldest PID, a row without a date is an error', () => {
  const r = run([], [model({ pid: 'A', last_verified: '2026-01-01' }), model({ pid: 'B', last_verified: '2026-02-01' }), model()], '2026-10-14');
  assert.equal(r.warnings.length, 1);
  assert.match(r.warnings[0], /2 published model\(s\).*oldest: A/);
  const missing = run([], [model({ last_verified: undefined })], '2026-10-14');
  assert.match(missing.errors[0], /no last_verified/);
});
