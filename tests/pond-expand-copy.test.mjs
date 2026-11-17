import { test } from 'node:test';
import assert from 'node:assert/strict';
import { POND_COPY } from '../js/pond/copy.js';

globalThis.location = { search: '?lang=en', hostname: 'localhost', href: 'http://localhost/', reload() {} };
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
try { globalThis.navigator ??= { language: 'en-US', languages: ['en-US'] }; } catch { }
globalThis.crypto ??= { randomUUID: () => 'test-uuid' };
const { t, setLang } = await import('../js/i18n.js');
setLang('en');

const strings = (o) => (typeof o === 'string' ? [o] : Object.values(o).flatMap(strings));
const GROW = Object.entries(POND_COPY).filter(([k]) => k.startsWith('grow')).flatMap(([, v]) => strings(v));
const RIM = Object.entries(POND_COPY).filter(([k]) => k.startsWith('rim')).flatMap(([, v]) => strings(v));
const fill = (s) => s.replace(/\{(\d)\}/g, (_, i) => String(4 + Number(i)));

test('확정 문구 그대로', () => {
  assert.equal(POND_COPY.growBtn, '🌊 연못 넓히기');
  assert.equal(POND_COPY.growMaxed, '🏝️ 다 넓힌 큰 연못이에요');
  assert.deepEqual(POND_COPY.growTitle, { 2: '🌊 넓은 연못으로', 3: '🏝️ 큰 연못으로' });
  assert.equal(POND_COPY.growCount, '{0} → {1}단계');
  assert.deepEqual(POND_COPY.growRow, { book: '📒 물고기 수첩', stone: '🪨 돌', wood: '🪵 목재', coins: '🪙 코인' });
  assert.equal(POND_COPY.growBookNum, '{0} / {1}종');
  assert.deepEqual(POND_COPY.growHint, {
    book: '📒 새 물고기를 낚으면 수첩이 채워져요',
    stone: '🪨 돌은 광산에서 캐면 나와요',
    wood: '🪵 목재는 숲에서 나무를 베면 나와요',
    coins: '🪙 상인에게 팔면 코인이 모여요',
    decor: '🪑 새 연못 자리에 꾸미기가 있어요. 옮긴 뒤 넓혀 주세요',
    plots: '🌱 새 연못 자리에 밭이 있어요. 비운 뒤 넓혀 주세요',
  });
  assert.equal(POND_COPY.growBuy, '넓히기');
  assert.equal(POND_COPY.growWhere, '🧭 넓은 연못은 꾸미기 가게 옆 빈터에 새로 자리 잡아요');
  assert.equal(POND_COPY.growMoved, '🌊 넓은 연못이 꾸미기 가게 옆에 생겼어요. 가 보세요');
  assert.deepEqual(POND_COPY.growDone, {
    2: '🌊 연못이 넓어졌어요. 바다 대어가 4마리까지 살 수 있어요',
    3: '🏝️ 큰 연못이 됐어요. 작은 섬과 징검다리가 생겼어요',
  });
  assert.equal(POND_COPY.growTip, '📒 수첩이 {0}종이에요. 연못을 넓힐 수 있어요');
  assert.equal(GROW.length, 22);
});

test('문구 규칙: 엠대시·놀다·화살표 이모지 없음', () => {
  for (const s of [...GROW, ...RIM]) {
    assert.ok(!s.includes('—'), s);
    assert.ok(!/놀/.test(s), s);
    assert.ok(!/[⬅➡⬆⬇↗↘↙↖]/u.test(s), s);
  }
});

test('넓히기 문구는 숫자가 들어간 뒤에도 영어로 다 바뀐다', () => {
  for (const s of GROW) {
    const en = t(fill(s));
    assert.ok(!/[가-힣]/.test(en), `영어 없음: ${s} → ${en}`);
    assert.ok(!/\{\d/.test(en), `자리 남음: ${s} → ${en}`);
  }
  assert.equal(t('1 → 2단계'), 'Stage 1 → 2');
  assert.equal(t('5 / 4종'), '5 / 4 kinds');
  assert.equal(t('📒 수첩이 8종이에요. 연못을 넓힐 수 있어요'), '📒 Your notebook has 8 kinds. You can expand the pond');
});

test('물가 꾸미기 확정 문구 그대로, 영어로 다 바뀐다', () => {
  assert.equal(POND_COPY.rimBtn, '🪨 물가 꾸미기');
  assert.equal(POND_COPY.rimTitle, '🪨 물가 꾸미기');
  assert.deepEqual(POND_COPY.rimName, { rock: '기본 돌', pebble: '흰 조약돌', brick: '붉은 벽돌', shell: '조개와 산호' });
  assert.equal(POND_COPY.rimUsing, '쓰는 중');
  assert.equal(POND_COPY.rimSwitch, '바꾸기');
  assert.equal(POND_COPY.rimShort, '🪙 코인이 모자라요. 상인에게 팔면 모여요');
  assert.equal(POND_COPY.rimDone, '🪨 물가를 새로 꾸몄어요');
  assert.equal(RIM.length, 10);
  for (const s of RIM) assert.ok(!/[가-힣]/.test(t(s)), `영어 없음: ${s} → ${t(s)}`);
});

test('광고 버튼 조각도 영어가 있다', () => {
  for (const s of ['광고 보고', '받기']) assert.ok(!/[가-힣]/.test(t(s)), s);
});
