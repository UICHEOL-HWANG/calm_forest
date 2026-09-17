import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FRUITS, TREE_SLOTS, STREAM_SLOTS, STREAM_R, YIELD_PER_DAY, CAP_DAYS,
         ORCHARD_STREAM_LOCAL, ORCHARD_SLOTS_LOCAL,
         fruitOf, fruitKeyOf, sapKeyOf, growDaysOf, nearStream, isWatered, harvestable, capped, settleTrees } from '../js/orchard.js';

test('FRUITS: 스펙 §5 표 — 5종의 id·묘목값·자람일·판매가가 정확히 일치한다', () => {
  assert.deepEqual(FRUITS.map(f => f.id), ['apple', 'pear', 'peach', 'persimmon', 'chestnut']);
  assert.deepEqual(FRUITS.map(f => f.sapCoin), [90, 130, 180, 240, 300]);
  assert.deepEqual(FRUITS.map(f => f.growDays), [3, 3, 4, 4, 5]);
  assert.deepEqual(FRUITS.map(f => f.price), [5, 6, 8, 10, 12]);
  for (const f of FRUITS) {
    assert.ok(f.fruitColor > 0 && f.leafColor > 0, `${f.id}: 색이 있어야 인스턴스로 그린다`);
    assert.ok(typeof f.name === 'string' && f.name.length > 0, `${f.id}: 한국어 이름`);
  }
});

test('상한 상수: 나무 자리 10 · 시냇가 4 · 반경 5 · 하루 2개 · 3일치까지', () => {
  assert.equal(TREE_SLOTS, 10);
  assert.equal(STREAM_SLOTS, 4);
  assert.ok(STREAM_SLOTS < TREE_SLOTS, '시냇가는 일부여야 "어디 심을까" 고민이 생긴다');
  assert.equal(STREAM_R, 5);
  assert.equal(YIELD_PER_DAY, 2);
  assert.equal(CAP_DAYS, 3);
});

test('fruitOf: id 로 찾고, 모르는 값은 null', () => {
  assert.equal(fruitOf('apple').price, 5);
  assert.equal(fruitOf('bogus'), null);
  assert.equal(fruitOf(null), null);
});

test('fruitKeyOf / sapKeyOf: 인벤 키는 id 에서만 파생된다 — 한글·자리번호 금지', () => {
  assert.equal(fruitKeyOf('apple'), 'apple');
  assert.equal(sapKeyOf('apple'), 'sap_apple');
  assert.equal(sapKeyOf('chestnut'), 'sap_chestnut');
});

test('growDaysOf: 모르는 id 는 가장 짧은 3일로 안전하게 떨어진다', () => {
  assert.equal(growDaysOf('chestnut'), 5);
  assert.equal(growDaysOf('bogus'), 3);
});

const STREAM = [{ x: 0, z: 0 }, { x: 0, z: 10 }, { x: 0, z: 20 }];   // z축으로 흐르는 시냇물

test('nearStream: 중심선의 가장 가까운 점 기준 반경 5 — 시작점 기준이 아니다', () => {
  assert.equal(nearStream({ x: 3, z: 10 }, STREAM), true,  '중간 지점 옆 3');
  assert.equal(nearStream({ x: 6, z: 10 }, STREAM), false, '중간 지점 옆 6');
  assert.equal(nearStream({ x: 3, z: 20 }, STREAM), true,  '끝점 옆도 면제 — 시작점만 보면 여기가 false 로 샌다');
  assert.equal(nearStream({ x: 0, z: 40 }, STREAM), false, '시냇물에서 한참 아래');
  assert.equal(nearStream({ x: 0, z: 0 }, []), false, '시냇물이 없으면 면제 없음');
});

test('isWatered: 시냇가는 물을 안 줘도 켜져 있다 · 밖은 watered 플래그를 따른다', () => {
  assert.equal(isWatered({ x: 1, z: 10, watered: false }, STREAM), true, '시냇가는 플래그 무시');
  assert.equal(isWatered({ x: 9, z: 10, watered: false }, STREAM), false);
  assert.equal(isWatered({ x: 9, z: 10, watered: true }, STREAM), true);
});

test('harvestable: 쌓인 열매를 그대로 돌려주고, 자라는 중인 나무는 0', () => {
  assert.equal(harvestable({ stage: 'mature', fruit: 4 }), 4);
  assert.equal(harvestable({ stage: 'mature', fruit: 0 }), 0);
  assert.equal(harvestable({ stage: 'growing', fruit: 2 }), 0, '아직 안 자란 나무에서 따면 안 된다');
  assert.equal(harvestable({ stage: 'sapling', fruit: 0 }), 0);
});

test('capped: 3일치(6개) 도달이면 더 안 쌓인다', () => {
  assert.equal(capped({ fruit: 6 }), true);
  assert.equal(capped({ fruit: 5 }), false);
  assert.equal(capped({ fruit: 7 }), true, '어쩌다 넘어도 상한으로 본다');
});

const mk = (o = {}) => ({ x: 20, z: 20, kind: 'apple', stage: 'growing', age: 0, watered: false, fruit: 0, ...o });

test('settleTrees: 원본을 건드리지 않고 새 배열을 돌려준다', () => {
  const trees = [mk()];
  const out = settleTrees(trees, STREAM, 1);
  assert.notEqual(out.trees, trees);
  assert.notEqual(out.trees[0], trees[0]);
  assert.equal(trees[0].age, 0, '원본 나무의 나이가 안 변해야 한다');
});

test('settleTrees: 자람일을 채우면 mature 로 바뀌고 matured 에 kind 가 실린다', () => {
  const out = settleTrees([mk({ age: 2 })], STREAM, 1);   // 사과 3일
  assert.equal(out.trees[0].stage, 'mature');
  assert.deepEqual(out.matured, [{ kind: 'apple', grew_days: 3 }]);
});

test('settleTrees: growing→mature 로 넘어가는 날에도 watered 는 꺼진다', () => {
  const out = settleTrees([mk({ age: 2, watered: true })], STREAM, 1);   // 사과 3일 — 이 날 mature 로 바뀐다
  assert.equal(out.trees[0].stage, 'mature');
  assert.equal(out.trees[0].watered, false, '자라는 중에 준 물이 정산 후에도 남아있으면 다음 정산에서 공짜 열매가 된다');
});

test('settleTrees: 다 자라기 전엔 열매가 안 달린다', () => {
  const out = settleTrees([mk({ age: 0 })], STREAM, 1);
  assert.equal(out.trees[0].stage, 'growing');
  assert.equal(out.trees[0].fruit, 0);
  assert.deepEqual(out.fruited, []);
});

test('settleTrees: 물이 있으면 하루 2개가 달리고 watered 는 꺼진다', () => {
  const out = settleTrees([mk({ x: 40, z: 40, stage: 'mature', watered: true })], STREAM, 1);
  assert.equal(out.trees[0].fruit, 2);
  assert.equal(out.trees[0].watered, false, '정산 직후 플래그는 꺼진다 — 매일 다시 줘야 한다');
  assert.deepEqual(out.fruited, [{ kind: 'apple', n: 2, watered: 1 }]);
});

test('settleTrees: 물이 없으면 열매가 안 달리지만 나무는 살아 있다', () => {
  const out = settleTrees([mk({ x: 40, z: 40, stage: 'mature', watered: false })], STREAM, 1);
  assert.equal(out.trees[0].fruit, 0);
  assert.equal(out.trees[0].stage, 'mature', '죽지 않는다');
  assert.deepEqual(out.fruited, [{ kind: 'apple', n: 0, watered: 0 }]);
});

test('settleTrees: 시냇가 나무는 물을 안 줘도 열린다', () => {
  const out = settleTrees([mk({ x: 1, z: 10, stage: 'mature', watered: false })], STREAM, 1);
  assert.equal(out.trees[0].fruit, 2);
});

test('settleTrees: 상한 6개를 넘지 않고, 걸린 나무는 capped 에 실린다', () => {
  const out = settleTrees([mk({ x: 1, z: 10, stage: 'mature', fruit: 5 })], STREAM, 1);
  assert.equal(out.trees[0].fruit, 6);
  assert.deepEqual(out.capped, [{ kind: 'apple' }]);
});

test('settleTrees: 이미 상한인 나무를 여러 날 정산해도 capped 는 한 번만 기록된다', () => {
  const out = settleTrees([mk({ x: 1, z: 10, stage: 'mature', fruit: 6 })], STREAM, 4);
  assert.equal(out.trees[0].fruit, 6, '상한을 넘지 않는다');
  assert.deepEqual(out.capped, [{ kind: 'apple' }], '4일이 지나도 capped 이벤트는 한 번뿐');
  assert.deepEqual(out.fruited, [], '상한에 걸린 날은 fruited 기록을 남기지 않는다');
});

test('settleTrees: 여러 날이 지났으면 그만큼 돌지만 상한은 지켜진다', () => {
  const out = settleTrees([mk({ x: 1, z: 10, stage: 'mature' })], STREAM, 5);
  assert.equal(out.trees[0].fruit, 6, '5일이 지나도 3일치까지만');
  assert.deepEqual(out.fruited, [
    { kind: 'apple', n: 2, watered: 1 },
    { kind: 'apple', n: 2, watered: 1 },
    { kind: 'apple', n: 2, watered: 1 },
  ], '상한에 걸리기 전 3일치만 fruited 기록이 쌓인다');
  assert.deepEqual(out.capped, [{ kind: 'apple' }], '상한에 걸린 뒤 남은 날들은 capped 한 건으로만 묶인다');
  assert.deepEqual(out.matured, [], '이미 mature 였으므로 matured 이벤트는 없다');
});

test('settleTrees: days 가 0 이하면 아무것도 안 한다', () => {
  const out = settleTrees([mk({ stage: 'mature' })], STREAM, 0);
  assert.equal(out.trees[0].fruit, 0);
  assert.deepEqual(out.matured, []);
  assert.deepEqual(out.fruited, []);
  assert.deepEqual(out.capped, []);
});

test('SELL_PRICE 의 과일 값이 FRUITS[].price 와 일치한다 — 한쪽만 고치면 여기서 터진다', () => {
  const src = readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');
  const line = src.split('\n').find(l => l.includes('const SELL_PRICE'));
  assert.ok(line, 'SELL_PRICE 선언을 못 찾았다 — 변수명이 바뀌었으면 이 테스트를 같이 고친다');
  for (const f of FRUITS) {
    const m = new RegExp(`\\b${f.id}\\s*:\\s*(\\d+)`).exec(line);
    assert.ok(m, `SELL_PRICE 에 ${f.id} 가 없다`);
    assert.equal(Number(m[1]), f.price, `${f.id}: SELL_PRICE 와 FRUITS[].price 가 어긋난다`);
  }
});

// 🍎 과수원 입구(ORCHARD_GATE)가 배경 나무 회피 목록에서 빠지면, 매 접속마다 새로 뿌리는
//   나무 14그루 중 하나가 그 자리를 막을 확률이 생긴다(다른 게이트 7곳은 전부 이 목록에 있다).
//   Task 6 에서 이 줄을 추가했다 — 나중에 buildWorld() 를 리팩터링하다 이 줄이 빠지면 여기서 잡는다.
test('buildWorld 의 배경 나무 회피 목록에 ORCHARD_GATE 가 다른 게이트들과 같은 패턴으로 들어있다', () => {
  const src = readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');
  assert.ok(
    src.includes("dist2D({ x, z }, ORCHARD_GATE) < 4.5"),
    'ORCHARD_GATE 회피 조건을 못 찾았다 — 배경 나무가 과수원 입구를 가릴 수 있다'
  );
});

test('자리 배치: 앞 4자리는 시냇가 면제, 뒤 6자리는 매일 물이 필요하다', () => {
  const stream = ORCHARD_STREAM_LOCAL.map(([x, z]) => ({ x, z }));
  const slots = ORCHARD_SLOTS_LOCAL.map(([x, z]) => ({ x, z }));
  assert.equal(slots.length, TREE_SLOTS);
  const near = slots.map(s => nearStream(s, stream));
  assert.deepEqual(near, [true, true, true, true, false, false, false, false, false, false]);
  assert.equal(near.filter(Boolean).length, STREAM_SLOTS);
});

// 위 테스트는 불리언 패턴만 본다 — 시냇가 자리가 STREAM_R(5)에 정확히 걸쳐 있어도
// (예: hypot(4,3)===5) `<=` 판정이 우연히 참이기만 하면 그대로 통과해 버린다.
// 좌표를 살짝 흔들거나 `<=`→`<` 로 리팩터링하면 "물 면제"가 조용히 뒤집히는데, 위 테스트는
// 여전히 자기 자신과 일치해 실패하지 않는다. 그래서 실제 거리값에 여유(0.5)를 못 박는다.
test('자리 배치: 시냇가 자리는 경계에서 최소 0.5 안쪽, 먼 자리는 최소 0.5 바깥이다', () => {
  const stream = ORCHARD_STREAM_LOCAL.map(([x, z]) => ({ x, z }));
  const MARGIN = 0.5;
  const distToNearestStream = ({ x, z }) =>
    Math.min(...stream.map(p => Math.hypot(p.x - x, p.z - z)));   // nearStream 과 같은 "최근접 점" 기준

  const nearSlots = ORCHARD_SLOTS_LOCAL.slice(0, STREAM_SLOTS).map(([x, z]) => ({ x, z }));
  const farSlots = ORCHARD_SLOTS_LOCAL.slice(STREAM_SLOTS).map(([x, z]) => ({ x, z }));

  for (const s of nearSlots) {
    const d = distToNearestStream(s);
    assert.ok(d <= STREAM_R - MARGIN,
      `시냇가 자리(${s.x},${s.z})가 경계에서 ${(STREAM_R - d).toFixed(2)}m 안쪽뿐이다 — ${MARGIN}m 이상 필요`);
  }
  for (const s of farSlots) {
    const d = distToNearestStream(s);
    assert.ok(d >= STREAM_R + MARGIN,
      `먼 자리(${s.x},${s.z})가 경계에서 ${(d - STREAM_R).toFixed(2)}m 바깥뿐이다 — ${MARGIN}m 이상 필요`);
  }
});
