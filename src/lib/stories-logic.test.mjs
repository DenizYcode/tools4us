import { test } from 'node:test';
import assert from 'node:assert/strict';
import { featuredStrip, isFresh, storiesMentioning, categoryCounts, indexOrder, youtubeEmbedUrl } from './stories-logic.mjs';

const s = (id, over = {}) => ({ id, featured: true, order: 1, review_by: '2027-01-11', related_pids: [], category: 'new', published_date: '2026-10-13', ...over });

test('the strip keeps featured, fresh stories in order and stops at four', () => {
  const list = [s('c', { order: 3 }), s('a', { order: 1 }), s('x', { featured: false }), s('old', { review_by: '2026-10-12' }), s('b', { order: 2 }), s('d', { order: 4 }), s('e', { order: 5 })];
  assert.deepEqual(featuredStrip(list, '2026-10-13').map((x) => x.id), ['a', 'b', 'c', 'd']);
});

test('a story drops off the strip the day after review_by', () => {
  const story = s('a', { review_by: '2026-10-13' });
  assert.equal(isFresh(story, '2026-10-13'), true);
  assert.equal(isFresh(story, '2026-10-14'), false);
  assert.deepEqual(featuredStrip([story], '2026-10-14'), []);
});

test('a story naming a model that is not current never appears in the strip', () => {
  const list = [s('a', { related_pids: ['OLD'] }), s('b', { related_pids: ['NEW'] })];
  assert.deepEqual(featuredStrip(list, '2026-10-13', (pid) => pid === 'NEW').map((x) => x.id), ['b']);
});

test('stories mentioning a model card, category counts and index order', () => {
  const list = [s('a', { related_pids: ['P1'], category: 'licence' }), s('b', { category: 'security', published_date: '2026-11-01' }), s('c', { category: 'licence' })];
  assert.deepEqual(storiesMentioning(list, ['P1', 'P2']).map((x) => x.id), ['a']);
  assert.deepEqual(categoryCounts(list), [{ category: 'licence', count: 2 }, { category: 'security', count: 1 }]);
  assert.deepEqual(indexOrder(list).map((x) => x.id), ['b', 'a', 'c']);
});

test('video embeds use the no-cookie host', () => assert.match(youtubeEmbedUrl('dQw4w9WgXcQ'), /^https:\/\/www\.youtube-nocookie\.com\/embed\/dQw4w9WgXcQ/));
