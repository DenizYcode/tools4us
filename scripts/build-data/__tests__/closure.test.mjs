import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildClosure } from '../audit-closure.mjs';

const results = await buildClosure();

test('every one of the 348 audit issues gets exactly one disposition', () => {
  assert.equal(results.length, 348);
  assert.equal(new Set(results.map((r) => r.id)).size, 348);
  for (const r of results) assert.ok(['Fixed', 'Tracked', 'Open'].includes(r.disposition), `#${r.id}`);
});

test('Fixed and Tracked are never claimed without a rule and evidence', () => {
  for (const r of results.filter((x) => x.disposition !== 'Open')) {
    assert.ok(r.rule, `#${r.id} has no rule`);
    assert.ok(r.evidence && !r.evidence.startsWith('Not closed'), `#${r.id} has no evidence`);
  }
});

test('the only High issue still Open is #4 (replacement supervisors are not in the legacy data)', () => {
  const openHigh = results.filter((r) => r.severity === 'High' && r.disposition === 'Open').map((r) => r.id);
  assert.deepEqual(openHigh, [4]);
});
