// The site settings check: service addresses must be the expected ones, and every "TO FILL" is reported.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SITE_CONFIG, siteConfigProblems, TO_FILL } from '../../../src/lib/site-config.mjs';

const copy = (patch = {}) => ({
  web3forms: { ...SITE_CONFIG.web3forms, ...(patch.web3forms ?? {}) },
  goatcounter: { ...SITE_CONFIG.goatcounter, ...(patch.goatcounter ?? {}) },
  controller: { ...SITE_CONFIG.controller, ...(patch.controller ?? {}) },
});

test('the real config has no error', () => {
  assert.deepEqual(siteConfigProblems().filter((p) => p.level === 'error'), []);
});

test('placeholders are warnings, one per field', () => {
  const problems = siteConfigProblems(copy({ controller: { name: TO_FILL, email: TO_FILL } }));
  assert.equal(problems.filter((p) => p.code === 'SITE_TO_FILL').length, 2);
  assert.ok(problems.every((p) => p.level === 'warning'));
});

test('filled-in controller details clear the warnings', () => {
  const problems = siteConfigProblems(copy({ controller: { name: 'Ayşe Yılmaz', email: 'ayse@example.com' } }));
  assert.deepEqual(problems, []);
});

test('a form endpoint on another host, a bad key, a bad analytics address and a bad email are errors', () => {
  const codes = (patch) => siteConfigProblems(copy(patch)).filter((p) => p.level === 'error').map((p) => p.code);
  assert.deepEqual(codes({ web3forms: { endpoint: 'https://evil.example.com/submit' } }), ['SITE_FORM_ENDPOINT']);
  assert.deepEqual(codes({ web3forms: { accessKey: 'not-a-key' } }), ['SITE_FORM_KEY']);
  assert.deepEqual(codes({ goatcounter: { endpoint: 'https://stats.example.com/count' } }), ['SITE_ANALYTICS_ENDPOINT']);
  assert.deepEqual(codes({ controller: { email: 'not an email' } }), ['SITE_CONTROLLER_EMAIL']);
});
