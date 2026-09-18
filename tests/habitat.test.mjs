import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ENV_TAG, CROP_FOOD, TREE_SHADE, RAIN_DAMP, TAGS, VISITORS,
         envAt, whenOk, meets, matchVisitors, progressOf, blockerOf, nearMiss,
         NEAR_MISS_RATIO } from '../js/habitat.js';

const src = (o = {}) => ({ decor: [], mature: [], trees: [], rain: false, ...o });
const emptyEnv = () => Object.fromEntries(TAGS.map(t => [t, 0]));

test('반경 상수: 일반 3 · fear 6 · 우물 5 · 나무 8', () => {
  assert.equal(ENV_TAG.flowerbed.radius, 3);
  assert.equal(ENV_TAG.scarecrow.radius, 6);
  assert.equal(ENV_TAG.well.radius, 5);
  assert.equal(TREE_SHADE.radius, 8);
  assert.ok(ENV_TAG.scarecrow.radius > ENV_TAG.flowerbed.radius,
    'fear 가 더 넓어야 "허수아비를 옮긴다" 는 선택이 생긴다');
});

test('환경 반경 3 은 CELL=2 기준 정확히 3×3 밭칸을 덮는다', () => {
  const s = src({ decor: [{ id: 'flowerbed', x: 0, z: 0 }] });
  assert.equal(envAt(s, 2, 0).nectar, 2, '한 칸 옆(거리 2) 은 포함');
  assert.equal(envAt(s, 2, 2).nectar, 2, '대각선 한 칸(거리 2.83) 은 포함');
  assert.equal(envAt(s, 4, 0).nectar, 0, '두 칸 옆(거리 4) 은 제외');
});

test('fear 반경 6 — 중심에서 8 떨어진 허수아비는 밭 중앙에 영향이 없다', () => {
  const s = src({ decor: [{ id: 'scarecrow', x: 0, z: 8 }] });
  assert.equal(envAt(s, 0, 0).fear, 0, '밖으로 물리면 방문객을 안 쫓는다(밤손님 방어는 반경 9 라 유지)');
  assert.equal(envAt(s, 0, 4).fear, 3, '거리 4 는 여전히 쫓는다');
});

test('둘레 나무 그늘 반경 8 — 울타리에서 5 바깥 나무가 밭 가장자리에 닿는다', () => {
  const s = src({ trees: [{ x: 0, z: 11 }] });   // half=6 일 때 최근접 나무
  assert.equal(envAt(s, 0, 6).shade, 2, '울타리 선(6) 은 그늘');
  assert.equal(envAt(s, 0, 3).shade, 2, '안쪽 3 까지 닿는다');
  assert.equal(envAt(s, 0, 0).shade, 0, '중앙은 그늘이 없다 — 중앙은 농사, 가장자리는 생태');
});

test('damp: 우물 3(반경 5) + 비 오는 날 2(밭 전체)', () => {
  const well = src({ decor: [{ id: 'well', x: 0, z: 0 }] });
  assert.equal(envAt(well, 0, 5).damp, 3);
  assert.equal(envAt(well, 0, 6).damp, 0, '반경 5 밖');
  assert.equal(envAt(src({ rain: true }), 99, 99).damp, RAIN_DAMP, '비는 자리를 안 가린다');
  assert.equal(envAt({ ...well, rain: true }, 0, 0).damp, 3 + RAIN_DAMP);
});

test('food: 다 자란 작물만 +2 (반경 3)', () => {
  const s = src({ mature: [{ x: 0, z: 0 }, { x: 2, z: 0 }] });
  assert.equal(envAt(s, 0, 0).food, CROP_FOOD.value * 2, '두 칸이 겹쳐 합산된다');
});

test('태그 합산은 같은 태그끼리 누적된다', () => {
  const s = src({ decor: [{ id: 'flowerbed', x: 0, z: 0 }, { id: 'flowerbed', x: 2, z: 0 }] });
  assert.equal(envAt(s, 1, 0).nectar, 4);
});

test('모르는 장식 id 는 무시한다 — 태그 없는 장식이 더 많다', () => {
  assert.equal(envAt(src({ decor: [{ id: 'path', x: 0, z: 0 }] }), 0, 0).nectar, 0);
});

test('envAt 은 모든 태그 키를 0 으로 채워 돌려준다 — 호출부가 undefined 를 안 만나게', () => {
  const env = envAt(src(), 0, 0);
  for (const t of TAGS) assert.equal(env[t], 0, t);
});

test('VISITORS: 스펙의 4종 — id·시간대·조건이 정확히 일치한다', () => {
  assert.deepEqual(VISITORS.map(v => v.id), ['butterfly', 'sparrow', 'hedgehog', 'frog']);
  const by = Object.fromEntries(VISITORS.map(v => [v.id, v]));
  assert.deepEqual(by.butterfly.need, { nectar: 3 });
  assert.deepEqual(by.butterfly.block, { fear: 1 });
  assert.equal(by.butterfly.when, 'day');
  assert.deepEqual(by.sparrow.need, { food: 2 });
  assert.deepEqual(by.sparrow.block, { fear: 1 });
  assert.equal(by.sparrow.when, 'day');
  assert.deepEqual(by.hedgehog.need, { shelter: 3, shade: 2 });
  assert.equal(by.hedgehog.when, 'night');
  assert.deepEqual(by.frog.need, { damp: 4, shade: 1 });
  assert.equal(by.frog.when, 'rain');
  for (const v of VISITORS) {
    assert.ok(v.ico && v.name && v.hint, `${v.id}: 아이콘·한국어 이름·힌트가 있어야 도감에 뜬다`);
    for (const k of Object.keys(v.need)) assert.ok(TAGS.includes(k), `${v.id}: 모르는 태그 ${k}`);
    for (const k of Object.keys(v.block || {})) assert.ok(TAGS.includes(k), `${v.id}: 모르는 태그 ${k}`);
  }
});

test('whenOk: day 는 낮, night 는 밤, rain 은 비 오는 날', () => {
  assert.equal(whenOk('day',   { night: false, rain: false }), true);
  assert.equal(whenOk('day',   { night: true,  rain: false }), false);
  assert.equal(whenOk('night', { night: true,  rain: false }), true);
  assert.equal(whenOk('night', { night: false, rain: false }), false);
  assert.equal(whenOk('rain',  { night: false, rain: true  }), true);
  assert.equal(whenOk('rain',  { night: true,  rain: true  }), true, '개구리는 밤에도 운다');
  assert.equal(whenOk('rain',  { night: false, rain: false }), false);
});

test('meets: need 는 하한선, block 은 상한선', () => {
  const b = VISITORS.find(v => v.id === 'butterfly');
  assert.equal(meets(b, { ...emptyEnv(), nectar: 3 }), true, '딱 맞으면 통과');
  assert.equal(meets(b, { ...emptyEnv(), nectar: 9 }), true, '넘치면 통과 — 정확한 조합을 강요하지 않는다');
  assert.equal(meets(b, { ...emptyEnv(), nectar: 2 }), false);
  assert.equal(meets(b, { ...emptyEnv(), nectar: 9, fear: 3 }), false, '공포가 있으면 꽃이 많아도 안 온다');
});

test('matchVisitors: 조건과 시간대를 둘 다 만족한 종만', () => {
  const env = { ...emptyEnv(), nectar: 6, food: 4 };
  const day = matchVisitors(env, { night: false, rain: false }).map(v => v.id);
  assert.deepEqual(day.sort(), ['butterfly', 'sparrow']);
  assert.deepEqual(matchVisitors(env, { night: true, rain: false }).map(v => v.id), [],
    '밤에는 낮 손님이 안 온다');
});

test('blockerOf: block 위반을 need 부족보다 먼저 집는다 — 치우면 바로 오니까', () => {
  const b = VISITORS.find(v => v.id === 'butterfly');
  assert.equal(blockerOf(b, { ...emptyEnv(), nectar: 1, fear: 3 }), 'fear');
  assert.equal(blockerOf(b, { ...emptyEnv(), nectar: 1 }), 'nectar');
  assert.equal(blockerOf(b, { ...emptyEnv(), nectar: 3 }), null, '막는 게 없으면 null');
});

test('blockerOf: need 가 여럿이면 가장 모자란 하나만 집는다', () => {
  const h = VISITORS.find(v => v.id === 'hedgehog');   // shelter 3, shade 2
  assert.equal(blockerOf(h, { ...emptyEnv(), shelter: 3, shade: 0 }), 'shade');
  assert.equal(blockerOf(h, { ...emptyEnv(), shelter: 0, shade: 2 }), 'shelter');
});

test('progressOf: need 여러 개의 평균 충족률', () => {
  const h = VISITORS.find(v => v.id === 'hedgehog');
  assert.equal(progressOf(h, { ...emptyEnv(), shelter: 3, shade: 2 }), 1);
  assert.equal(progressOf(h, { ...emptyEnv(), shelter: 3, shade: 0 }), 0.5);
  assert.equal(progressOf(h, { ...emptyEnv(), shelter: 9, shade: 0 }), 0.5, '넘쳐도 1 로 잘린다');
});

test('nearMiss: 70% 이상 왔을 때만 신호를 준다', () => {
  const ctx = { night: false, rain: false };
  assert.equal(nearMiss({ ...emptyEnv(), nectar: 1 }, ctx, {}), null, '33% 는 아직 힌트를 주지 않는다');
  const close = nearMiss({ ...emptyEnv(), nectar: 9, fear: 3 }, ctx, {});
  assert.equal(close.visitor, 'butterfly');
  assert.equal(close.blocker, 'fear');
});

test('nearMiss: 이미 발견한 종은 신호를 주지 않는다 — 도감에 조건이 공개돼 있다', () => {
  const ctx = { night: false, rain: false };
  assert.equal(nearMiss({ ...emptyEnv(), nectar: 9, fear: 3 }, ctx, { butterfly: 1 }), null);
});

test('nearMiss: 조건을 이미 다 채운 종은 신호 대상이 아니다 — 그건 곧 온다', () => {
  const ctx = { night: false, rain: false };
  const nm = nearMiss({ ...emptyEnv(), nectar: 9 }, ctx, {});
  assert.notEqual(nm?.visitor, 'butterfly');
});

test('nearMiss: 시간대가 안 맞으면 신호도 없다 — 지금 할 수 있는 것만 말해준다', () => {
  assert.equal(nearMiss({ ...emptyEnv(), nectar: 9, fear: 3 }, { night: true, rain: false }, {}), null);
});

test('NEAR_MISS_RATIO 는 0.7', () => assert.equal(NEAR_MISS_RATIO, 0.7));

// ⚠️ 회귀 잠금 — 이 테스트가 이 기능의 가장 큰 함정을 막는다
test('런타임 전용 필드를 태그 소스로 쓰지 않는다', () => {
  const code = readFileSync(new URL('../js/habitat.js', import.meta.url), 'utf8');
  for (const bad of ['watered', 'wetUntil', 'elapsedTime', 'digAt']) {
    assert.ok(!code.includes(bad),
      `habitat.js 가 ${bad} 를 참조한다 — 세션이 끊기면 사라지는 값이라 태그 소스가 될 수 없다. ` +
      `WET_TIME=9 라 물 준 흙은 9초만 촉촉하고 스폰 지연이 6~14초다(🐸 가 영원히 안 온다).`);
  }
});
