import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateCatalog } from '../validate.mjs';
import { parseCell } from '../parse.mjs';
import { compareKeys } from '../i18n-parity.mjs';

const NOW = '2026-10-09';

// A complete, valid, ready, current model. Tests override single fields.
function model(over = {}) {
  return {
    pid: 'CW9172I',
    family: 'wireless',
    series: 'CW9170',
    status: 'ready',
    scope: 'in',
    name_tr: 'Cisco Wireless 9172I',
    summary_tr: 'Küçük ofisler için Wi-Fi 7',
    good_for_tr: 'Küçük ofis',
    lifecycle: 'current',
    management: ['cloud'],
    datasheet_url: 'https://www.cisco.com/ds',
    source_url: 'https://www.cisco.com/src',
    last_verified: '2026-10-09',
    added_date: '2026-10-09',
    ...over,
  };
}

function accessory(over = {}) {
  return {
    pid: 'AIR-ANT2566D4M-R',
    family: 'wireless',
    kind: 'antenna',
    status: 'ready',
    scope: 'in',
    name_tr: 'Anten',
    lifecycle: 'current',
    datasheet_url: 'https://www.cisco.com/ds',
    source_url: 'https://www.cisco.com/src',
    last_verified: '2026-10-09',
    added_date: '2026-10-09',
    ...over,
  };
}

const series = (over = {}) => ({
  family: 'wireless',
  series: 'CW9170',
  status: 'ready',
  scope: 'in',
  series_intro_tr: 'Wi-Fi 7 erişim noktaları',
  ...over,
});

function catalog({ models = [model()], accessories = [], compat = [], seriesRows = [series()], extra = {} } = {}) {
  return { families: { wireless: { models, accessories, compat, series: seriesRows }, ...extra } };
}

const codes = (result) => result.errors.map((e) => e.code);
const run = (c) => validateCatalog(c, { now: NOW });

test('a complete catalog passes', () => {
  const result = run(catalog());
  assert.deepEqual(result.errors, []);
  assert.equal(result.stats.wireless.models.ready, 1);
});

test('empty required field on a ready row fails', () => {
  const result = run(catalog({ models: [model({ name_tr: null })] }));
  assert.ok(codes(result).includes('READY_MISSING_FIELD'));
});

test('the same gap on a draft row is reported, not failed', () => {
  const result = run(catalog({ models: [model({ status: 'draft', name_tr: null, lifecycle: null })] }));
  assert.deepEqual(result.errors, []);
  assert.equal(result.stats.wireless.draftGaps['models.name_tr'], 1);
  assert.equal(result.stats.wireless.lifecycle.unverified, 1);
});

test('duplicate PID fails, inside a family and across families', () => {
  const dup = run(catalog({ models: [model(), model()] }));
  assert.ok(codes(dup).includes('DUP_PID'));
  const across = run(
    catalog({
      extra: { switching: { models: [model({ family: 'switching', series: 'S' })], accessories: [], compat: [], series: [series({ family: 'switching', series: 'S' })] } },
    }),
  );
  assert.ok(codes(across).includes('DUP_PID'));
});

test('a PID shared by a model and an accessory fails', () => {
  const result = run(catalog({ accessories: [accessory({ pid: 'CW9172I' })] }));
  assert.ok(codes(result).includes('DUP_PID'));
});

test('cell issues from the reader surface as BAD_VALUE', () => {
  const bad = model({ status: 'draft', __issues: [{ column: 'management', message: 'not in list' }] });
  assert.ok(codes(run(catalog({ models: [bad] }))).includes('BAD_VALUE'));
});

test('a model whose series has no series row fails', () => {
  const result = run(catalog({ models: [model({ series: 'Nope' })] }));
  assert.ok(codes(result).includes('MISSING_SERIES'));
});

test('family column must match the workbook', () => {
  const result = run(catalog({ models: [model({ family: 'switching' })] }));
  assert.ok(codes(result).includes('FAMILY_MISMATCH'));
});

test('compat pointing at a missing PID fails on either side', () => {
  const missingModel = run(catalog({ accessories: [accessory()], compat: [{ accessory_pid: 'AIR-ANT2566D4M-R', model_pid: 'NOPE' }] }));
  assert.ok(codes(missingModel).includes('COMPAT_MISSING_PID'));
  const missingAcc = run(catalog({ compat: [{ accessory_pid: 'NOPE', model_pid: 'CW9172I' }] }));
  assert.ok(codes(missingAcc).includes('COMPAT_MISSING_PID'));
});

test('compat uses exact PIDs, never substrings', () => {
  const result = run(catalog({ accessories: [accessory()], compat: [{ accessory_pid: 'AIR-ANT2566D4M', model_pid: 'CW9172' }] }));
  assert.equal(codes(result).filter((c) => c === 'COMPAT_MISSING_PID').length, 2);
});

test('duplicate compat pair fails', () => {
  const pair = { accessory_pid: 'AIR-ANT2566D4M-R', model_pid: 'CW9172I' };
  const result = run(catalog({ accessories: [accessory()], compat: [pair, pair] }));
  assert.ok(codes(result).includes('DUP_COMPAT'));
});

test('a valid compat pair passes', () => {
  const result = run(catalog({ accessories: [accessory()], compat: [{ accessory_pid: 'AIR-ANT2566D4M-R', model_pid: 'CW9172I' }] }));
  assert.deepEqual(result.errors, []);
});

test('recommended: not current, no reason, or two in one series all fail', () => {
  const eos = run(catalog({ models: [model({ recommended: true, recommended_why_tr: 'x', lifecycle: 'eos_announced' })] }));
  assert.ok(codes(eos).includes('RECOMMENDED_NOT_CURRENT'));
  const unverified = run(catalog({ models: [model({ status: 'draft', recommended: true, recommended_why_tr: 'x', lifecycle: null })] }));
  assert.ok(codes(unverified).includes('RECOMMENDED_NOT_CURRENT'));
  const noReason = run(catalog({ models: [model({ recommended: true })] }));
  assert.ok(codes(noReason).includes('RECOMMENDED_NO_REASON'));
  const two = run(
    catalog({ models: [model({ recommended: true, recommended_why_tr: 'a' }), model({ pid: 'CW9174I', recommended: true, recommended_why_tr: 'b' })] }),
  );
  assert.ok(codes(two).includes('RECOMMENDED_MULTIPLE'));
});

test('one recommended model with a reason passes', () => {
  assert.deepEqual(run(catalog({ models: [model({ recommended: true, recommended_why_tr: 'Çoğu ofis için yeterli' })] })).errors, []);
});

const eosModel = (over = {}) =>
  model({ pid: 'CW9120I', lifecycle: 'eos_announced', last_order: '2026-12-31', ldos: '2031-12-31', eol_bulletin_url: 'https://www.cisco.com/eol', ...over });

test('end-of-sale without a replacement fails; a PID, a note or replacement_none each satisfy it', () => {
  const none = run(catalog({ models: [model(), eosModel()] }));
  assert.ok(codes(none).includes('REPLACEMENT_MISSING'));
  for (const over of [{ replacement_pid: ['CW9172I'] }, { replacement_note: 'Wi-Fi 7 serisi, doğrulayın' }, { replacement_none: true }]) {
    assert.deepEqual(run(catalog({ models: [model(), eosModel(over)] })).errors, [], JSON.stringify(over));
  }
});

test('end-of-sale needs last_order and the bulletin URL', () => {
  const result = run(catalog({ models: [model(), eosModel({ replacement_none: true, last_order: null, eol_bulletin_url: null })] }));
  assert.ok(codes(result).includes('LIFECYCLE_NEEDS_LAST_ORDER'));
  assert.ok(codes(result).includes('LIFECYCLE_NEEDS_BULLETIN'));
});

test('replacement PID must exist and be a ready, current model', () => {
  const missing = run(catalog({ models: [model(), eosModel({ replacement_pid: ['NOPE'] })] }));
  assert.ok(codes(missing).includes('REPLACEMENT_NOT_FOUND'));
  const draft = run(catalog({ models: [model({ status: 'draft' }), eosModel({ replacement_pid: ['CW9172I'] })] }));
  assert.ok(codes(draft).includes('REPLACEMENT_NOT_PUBLISHABLE'));
  const eosTarget = run(catalog({ models: [eosModel({ pid: 'A', replacement_none: true }), eosModel({ pid: 'B', replacement_pid: ['A'] })] }));
  assert.ok(codes(eosTarget).includes('REPLACEMENT_NOT_PUBLISHABLE'));
});

test('eos_announced past its last order date warns; eos with a future date warns', () => {
  const past = run(catalog({ models: [model(), eosModel({ replacement_none: true, last_order: '2026-10-01' })] }));
  assert.ok(past.warnings.some((w) => w.code === 'EOS_PAST_LAST_ORDER'));
  const future = run(catalog({ models: [model(), eosModel({ lifecycle: 'eos', replacement_none: true, last_order: '2027-01-01' })] }));
  assert.ok(future.warnings.some((w) => w.code === 'EOS_BEFORE_LAST_ORDER'));
});

test('excluded rows are skipped by every check', () => {
  const junk = { pid: 'ASR-902', family: 'wireless', status: 'draft', scope: 'excluded', recommended: true, __issues: [{ column: 'x', message: 'bad' }] };
  const result = run(catalog({ models: [model(), junk, { ...junk }] }));
  assert.deepEqual(result.errors, []);
  assert.equal(result.stats.wireless.models.excluded, 2);
});

test('a bare draft row with only identity fields is fine', () => {
  const bare = { pid: 'X1', family: 'wireless', series: 'CW9170', status: 'draft', scope: 'in' };
  assert.deepEqual(run(catalog({ models: [bare] })).errors, []);
});

test('a draft row still needs status, scope and a PID', () => {
  const result = run(catalog({ models: [{ family: 'wireless', series: 'CW9170' }] }));
  assert.ok(codes(result).includes('MISSING_STATUS'));
  assert.ok(codes(result).includes('MISSING_SCOPE'));
  assert.ok(codes(result).includes('MISSING_PID'));
});

test('ready series needs its Turkish explainer', () => {
  const result = run(catalog({ seriesRows: [series({ series_intro_tr: null })] }));
  assert.ok(codes(result).includes('READY_MISSING_FIELD'));
});

test('a ready model needs a ready series', () => {
  const result = run(catalog({ seriesRows: [series({ status: 'draft', series_intro_tr: null })] }));
  assert.ok(codes(result).includes('SERIES_NOT_READY'));
  const draftModel = run(catalog({ models: [model({ status: 'draft' })], seriesRows: [series({ status: 'draft', series_intro_tr: null })] }));
  assert.deepEqual(draftModel.errors, []);
});

test('PID shape: ready rows must be single orderable PIDs, drafts only warn', () => {
  for (const pid of ['LTE Pluggable', 'AIR-ANT2524V4C-R/RS', 'AIR-ANT2513P4M-N=', 'A, B']) {
    const ready = run(catalog({ models: [model({ pid })] }));
    assert.ok(codes(ready).includes('BAD_PID'), pid);
    const draft = run(catalog({ models: [model({ pid, status: 'draft' })] }));
    assert.ok(!codes(draft).includes('BAD_PID'), pid);
    assert.ok(draft.warnings.some((w) => w.code === 'BAD_PID'), pid);
  }
  assert.deepEqual(run(catalog({ models: [model({ pid: 'C9300X-48HX-A' })] })).errors, []);
});

test('links that do not point at cisco.com or meraki.com raise a warning', () => {
  const result = run(catalog({ models: [model({ datasheet_url: 'https://www.example.com/ds' })] }));
  assert.ok(result.warnings.some((w) => w.code === 'NON_CISCO_SOURCE'));
  assert.equal(run(catalog({ models: [model({ datasheet_url: 'https://documentation.meraki.com/x' })] })).warnings.length, 0);
});

// parseCell: controlled vocabularies and formats
const col = (type, extra = {}) => ({ key: 'k', type, ...extra });

test('parseCell: empty cells are null without an issue', () => {
  assert.deepEqual(parseCell(col('string'), '  '), { value: null });
  assert.deepEqual(parseCell(col('date'), null), { value: null });
});

test('parseCell: unknown vocabulary value is flagged', () => {
  assert.ok(parseCell(col('enum', { vocab: 'lifecycle' }), 'Current').issue);
  assert.equal(parseCell(col('enum', { vocab: 'lifecycle' }), 'current').issue, undefined);
  assert.ok(parseCell(col('enumlist', { vocab: 'management' }), 'cloud, Meraki').issue);
  assert.deepEqual(parseCell(col('enumlist', { vocab: 'management' }), 'cloud; on_prem').value, ['cloud', 'on_prem']);
});

test('parseCell: URLs need https (audit #264-#290)', () => {
  assert.ok(parseCell(col('url'), 'cisco.com/c/en/us/x').issue);
  assert.ok(parseCell(col('url'), '(https://cisco.com/x)').issue);
  assert.equal(parseCell(col('url'), 'https://www.cisco.com/x').issue, undefined);
});

test('parseCell: dates are strict ISO, Excel dates are converted', () => {
  assert.ok(parseCell(col('date'), '31-12-2026').issue);
  assert.ok(parseCell(col('date'), '2026-02-30').issue);
  assert.equal(parseCell(col('date'), '2026-12-31').value, '2026-12-31');
  assert.equal(parseCell(col('date'), new Date('2026-12-31T00:00:00Z')).value, '2026-12-31');
});

test('parseCell: numbers, number lists and booleans', () => {
  assert.equal(parseCell(col('number'), '370').value, 370);
  assert.ok(parseCell(col('number'), '370 W').issue);
  assert.deepEqual(parseCell(col('numlist'), '1, 2.5, 5').value, [1, 2.5, 5]);
  assert.ok(parseCell(col('numlist'), '1, Modular').issue);
  assert.equal(parseCell(col('bool'), 'yes').value, true);
  assert.equal(parseCell(col('bool'), 'Hayır').value, false);
  assert.ok(parseCell(col('bool'), 'maybe').issue);
});

test('i18n key parity finds missing keys either way', () => {
  assert.deepEqual(compareKeys({ a: '1', b: '2' }, { a: '1' }), { missingInEn: ['b'], missingInTr: [] });
  assert.deepEqual(compareKeys({ a: '1' }, { a: '1', c: '3' }), { missingInEn: [], missingInTr: ['c'] });
});
