import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  E5_ARMS, E5_STORE_KEY, E5_START_MS, armForE5, decideE5, parseE5Stored, e5UserProps, guestFirst,
} from '../js/exp-e5.js';

const AFTER = Date.parse('2026-10-31T00:00:00+09:00');
const BEFORE = AFTER - 1;
const base = { clientId: 'cid-1', newDevice: true, inApp: true, platform: 'web', now: AFTER };

test('무리·저장 키·시작 시각', () => {
  assert.deepEqual(E5_ARMS, ['control', 'guest_first']);
  assert.equal(E5_STORE_KEY, 'cf_e5');
  assert.equal(E5_START_MS, AFTER);
});

test('같은 기기는 항상 같은 무리, 전체로는 반반에 가깝다', () => {
  assert.equal(armForE5('abc'), armForE5('abc'));
  const n = 4000;
  const g = Array.from({ length: n }, (_, i) => armForE5(`dev-${i}`)).filter(a => a === 'guest_first').length;
  assert.ok(Math.abs(g / n - 0.5) < 0.03, `guest_first 비율 ${g / n}`);
});

test('E3 와 독립 배정이다(솔트가 다르다)', async () => {
  const { armForE3 } = await import('../js/exp-e3.js');
  const ids = Array.from({ length: 2000 }, (_, i) => `d${i}`);
  const same = ids.filter(id => (armForE5(id) === 'guest_first') === (armForE3(id) === 'on')).length;
  assert.ok(Math.abs(same / ids.length - 0.5) < 0.04, `일치율 ${same / ids.length}`);
});

test('시작 전에는 아무도 배정하지 않는다', () => {
  const d = decideE5({ ...base, now: BEFORE });
  assert.equal(d.enrolled, false);
  assert.equal(d.reason, 'not_started');
  assert.equal(guestFirst(d), false);
});

test('시작 뒤 앱 안 브라우저의 새 기기는 해시 무리로 배정', () => {
  const d = decideE5(base);
  assert.equal(d.enrolled, true);
  assert.equal(d.reason, 'new');
  assert.equal(d.arm, armForE5('cid-1'));
});

test('앱 안 브라우저가 아니면 제외', () => {
  assert.equal(decideE5({ ...base, inApp: false }).reason, 'not_inapp');
});

test('웹이 아니면 제외', () => {
  for (const platform of ['toss', 'android', 'ios', 'itch']) {
    assert.equal(decideE5({ ...base, platform }).reason, 'platform');
  }
});

test('기존 기기는 제외', () => {
  assert.equal(decideE5({ ...base, newDevice: false }).reason, 'returning');
});

test('저장된 무리가 있으면 재방문에도 그 무리', () => {
  const d = decideE5({ ...base, newDevice: false, stored: { arm: 'guest_first' } });
  assert.equal(d.enrolled, true);
  assert.equal(d.arm, 'guest_first');
  assert.equal(d.reason, 'device');
});

test('개발 세션은 강제 무리만 따르고 사용자 속성은 남기지 않는다', () => {
  const forced = decideE5({ ...base, dev: true, forced: 'guest_first', now: BEFORE });
  assert.equal(guestFirst(forced), true);
  assert.deepEqual(e5UserProps(forced), {});
  assert.equal(decideE5({ ...base, dev: true }).reason, 'dev');
});

test('사용자 속성은 배정된 기기에만 exp_login', () => {
  const d = decideE5(base);
  assert.deepEqual(e5UserProps(d), { exp_login: d.arm });
  assert.deepEqual(e5UserProps(decideE5({ ...base, inApp: false })), {});
});

test('저장값 파싱은 잘못된 값을 버린다', () => {
  assert.deepEqual(parseE5Stored('{"arm":"control"}'), { arm: 'control' });
  assert.equal(parseE5Stored('{"arm":"on"}'), null);
  assert.equal(parseE5Stored('not json'), null);
  assert.equal(parseE5Stored(null), null);
});

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

test('analytics.js 사용자 속성에 E5 무리를 싣는다', () => {
  const src = read('../js/analytics.js');
  assert.match(src, /import \{ e5Decision \} from '\.\/exp-e5-boot\.js'/);
  assert.ok(src.includes('...e5UserProps(e5Decision())'));
});

test('처치 문구는 영어판이 있다', async () => {
  const { E5_COPY } = await import('../js/exp-e5.js');
  const en = read('../js/i18n-en.js');
  for (const s of Object.values(E5_COPY)) assert.ok(en.includes(`'${s}'`), `영어판 없음: ${s}`);
});
