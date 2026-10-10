import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readGlossary, validateGlossary, glossaryJson } from '../glossary.mjs';

const term = (over = {}) => ({ __row: 2, key: 'poe', term_tr: 'PoE', term_en: 'PoE', meaning_tr: 'Güç kablodan gelir.', meaning_en: 'Power comes over the cable.', ...over });

test('a complete term passes; every field must be filled in both languages', () => {
  assert.deepEqual(validateGlossary([term()]), []);
  for (const key of ['term_tr', 'term_en', 'meaning_tr', 'meaning_en']) {
    assert.equal(validateGlossary([term({ [key]: '' })])[0].code, 'GLOSSARY_EMPTY', key);
  }
});

test('keys are lowercase identifiers and unique', () => {
  assert.equal(validateGlossary([term({ key: 'PoE Plus' })])[0].code, 'GLOSSARY_KEY');
  assert.ok(validateGlossary([term(), term({ __row: 3 })]).some((e) => e.code === 'GLOSSARY_DUP'));
});

test('the real glossary loads, validates and publishes both languages', async () => {
  const { terms, problems } = await readGlossary();
  assert.deepEqual(problems, []);
  assert.deepEqual(validateGlossary(terms), []);
  const json = glossaryJson(terms);
  assert.ok(terms.length >= 20);
  for (const entry of Object.values(json)) {
    assert.ok(entry.tr.meaning && entry.en.meaning);
  }
});
