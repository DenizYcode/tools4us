import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseStoryFile, readStories, validateStories, storiesJson } from '../stories.mjs';
import { loadCatalog } from '../catalog.mjs';

const TODAY = '2026-10-13';
const catalog = {
  families: {
    switching: {
      models: [
        { pid: 'CUR', status: 'ready', scope: 'in', lifecycle: 'current' },
        { pid: 'EOS', status: 'ready', scope: 'in', lifecycle: 'eos' },
        { pid: 'DRAFT', status: 'draft', scope: 'in', lifecycle: 'current' },
      ],
    },
  },
};

const meta = (over = {}) => ({
  slug_tr: 'ornek', slug_en: 'example', title_tr: 'Örnek', title_en: 'Example', teaser_tr: 'Kısa', teaser_en: 'Short',
  why_tr: 'Önemli', why_en: 'Matters', category: 'new', status: 'ready', published_date: '2026-10-01', last_verified: '2026-10-10',
  review_by: '2027-01-08', featured: false, order: null, related_pids: [], cta_family: 'switching',
  sources: [{ title: 'Cisco', url: 'https://www.cisco.com/a' }], ...over,
});
const story = (over = {}, id = 'a') => ({ id, file: `content/stories/${id}.md`, meta: meta(over), body: { tr: 'Gövde', en: 'Body' } });
const codes = (r) => r.errors.map((e) => e.code);

test('a complete ready story passes', () => {
  const r = validateStories([story()], catalog, { today: TODAY });
  assert.deepEqual(r.errors, []);
});

test('parseStoryFile splits frontmatter and the two language sections', () => {
  const file = '---\r\nslug_tr: a\r\nslug_en: b\r\n---\r\n<!-- tr -->\r\nMerhaba\r\n\r\n<!-- en -->\r\nHello\r\n';
  const { meta: m, body } = parseStoryFile(file);
  assert.equal(m.slug_tr, 'a');
  assert.deepEqual(body, { tr: 'Merhaba', en: 'Hello' });
  assert.throws(() => parseStoryFile('no frontmatter'));
  assert.throws(() => parseStoryFile('---\na: 1\n---\nstray\n<!-- tr -->\nx'), /before the first/);
  assert.throws(() => parseStoryFile('---\na: 1\n---\n<!-- tr -->\nx\n<!-- tr -->\ny'), /twice/);
});

test('a required field, a body section or a date missing fails a ready story but not a draft', () => {
  for (const [over, code] of [[{ why_tr: '' }, 'STORY_REQUIRED'], [{ last_verified: '' }, 'STORY_REQUIRED'], [{ review_by: 'yarın' }, 'STORY_DATE']]) {
    assert.ok(codes(validateStories([story(over)], catalog, { today: TODAY })).includes(code), JSON.stringify(over));
    assert.deepEqual(validateStories([story({ ...over, status: 'draft' })], catalog, { today: TODAY }).errors, []);
  }
  const noEn = story();
  noEn.body.en = '';
  assert.ok(codes(validateStories([noEn], catalog, { today: TODAY })).includes('STORY_BODY'));
});

test('a story must point at ready, current catalog models', () => {
  assert.ok(codes(validateStories([story({ related_pids: ['NOPE'] })], catalog, { today: TODAY })).includes('STORY_PID_UNKNOWN'));
  assert.ok(codes(validateStories([story({ related_pids: ['EOS'] })], catalog, { today: TODAY })).includes('STORY_PID_NOT_CURRENT'));
  assert.ok(codes(validateStories([story({ related_pids: ['DRAFT'] })], catalog, { today: TODAY })).includes('STORY_PID_NOT_CURRENT'));
  assert.deepEqual(validateStories([story({ related_pids: ['CUR'] })], catalog, { today: TODAY }).errors, []);
});

test('sources need a Cisco or Meraki https link, in the list and in the body', () => {
  assert.ok(codes(validateStories([story({ sources: [] })], catalog, { today: TODAY })).includes('STORY_SOURCES'));
  assert.ok(codes(validateStories([story({ sources: [{ title: 'x', url: 'https://example.com/a' }] })], catalog, { today: TODAY })).includes('STORY_SOURCE_HOST'));
  const bad = story();
  bad.body.tr = 'Bkz. [site](https://example.com/a)';
  assert.ok(codes(validateStories([bad], catalog, { today: TODAY })).includes('STORY_LINK'));
});

test('a featured story past review_by fails the build; other stories only warn', () => {
  const expired = { review_by: '2026-10-12', last_verified: '2026-07-01', featured: true, order: 1 };
  assert.ok(codes(validateStories([story(expired)], catalog, { today: TODAY })).includes('STORY_FEATURED_EXPIRED'));
  const plain = validateStories([story({ ...expired, featured: false })], catalog, { today: TODAY });
  assert.deepEqual(plain.errors, []);
  assert.ok(plain.warnings.some((w) => w.code === 'STORY_REVIEW_OVERDUE'));
});

test('a featured story must have been verified within 90 days of review_by; others only warn', () => {
  const long = { last_verified: '2026-01-01', review_by: '2027-06-01' };
  assert.ok(codes(validateStories([story({ ...long, featured: true, order: 1 })], catalog, { today: TODAY })).includes('STORY_REVIEW_LONG'));
  const plain = validateStories([story(long)], catalog, { today: TODAY });
  assert.deepEqual(plain.errors, []);
  assert.ok(plain.warnings.some((w) => w.code === 'STORY_REVIEW_LONG'));
});

test('cta_family is optional (the call to action is then the first Cisco source) but must be a launch family when given', () => {
  assert.deepEqual(validateStories([story({ cta_family: '' })], catalog, { today: TODAY }).errors, []);
  assert.ok(codes(validateStories([story({ cta_family: 'datacenter' })], catalog, { today: TODAY })).includes('STORY_CTA'));
});

test('featured stories: integer unique order, at most four', () => {
  const f = (order, id) => story({ featured: true, order, slug_tr: `t${id}`, slug_en: `e${id}` }, id);
  assert.ok(codes(validateStories([f(1, 'a'), f(1, 'b')], catalog, { today: TODAY })).includes('STORY_ORDER'));
  assert.ok(codes(validateStories([story({ featured: true, order: null })], catalog, { today: TODAY })).includes('STORY_ORDER'));
  const five = ['a', 'b', 'c', 'd', 'e'].map((id, i) => f(i + 1, id));
  assert.ok(codes(validateStories(five, catalog, { today: TODAY })).includes('STORY_FEATURED_COUNT'));
  assert.deepEqual(validateStories(five.slice(0, 4), catalog, { today: TODAY }).errors, []);
});

test('slugs are unique per language and URL-safe; category and video id are checked', () => {
  assert.ok(codes(validateStories([story({}, 'a'), story({}, 'b')], catalog, { today: TODAY })).includes('STORY_SLUG_DUPLICATE'));
  assert.ok(codes(validateStories([story({ slug_tr: 'Büyük Harf' })], catalog, { today: TODAY })).includes('STORY_SLUG'));
  assert.ok(codes(validateStories([story({ category: 'misc' })], catalog, { today: TODAY })).includes('STORY_CATEGORY'));
  assert.ok(codes(validateStories([story({ video_youtube_id: 'short' })], catalog, { today: TODAY })).includes('STORY_VIDEO'));
  assert.deepEqual(validateStories([story({ video_youtube_id: 'dQw4w9WgXcQ' })], catalog, { today: TODAY }).errors, []);
});

test('only ready stories are published', () => {
  const json = storiesJson([story({}, 'a'), story({ status: 'draft', slug_tr: 'x', slug_en: 'y' }, 'b')]);
  assert.deepEqual(json.stories.map((s) => s.id), ['a']);
  assert.equal(json.stories[0].body.en, 'Body');
});

test('the real stories load and pass against the real catalog', async () => {
  const read = readStories();
  assert.deepEqual(read.problems, []);
  const { catalog: real } = await loadCatalog();
  // Dated on purpose: the calendar gate is check:data; this test must not start failing when a review date passes.
  const result = validateStories(read.stories, real, { today: TODAY });
  assert.deepEqual(result.errors, []);
});
