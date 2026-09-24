import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gameSource } from './helpers/game-source.mjs';   // game.js + js/data (분리 1단계)
import { ORCHARD_AUTO_TOOLS, orchardToolFor, FRUITS, TREE_SLOTS, STREAM_SLOTS, STREAM_R, YIELD_PER_DAY, CAP_DAYS,
         ORCHARD_STREAM_LOCAL, ORCHARD_SLOTS_LOCAL, ORCHARD_CHOP_HP, ORCHARD_CHOP_WOOD,
         chopWoodOf, chopDamage, chopHit, freeSlots, daysBetween,
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
  assert.deepEqual(out.fruited, [{ kind: 'apple', n: 2, watered: 1, days: 1 }]);
});

test('settleTrees: 물이 없으면 열매가 안 달리지만 나무는 살아 있다', () => {
  const out = settleTrees([mk({ x: 40, z: 40, stage: 'mature', watered: false })], STREAM, 1);
  assert.equal(out.trees[0].fruit, 0);
  assert.equal(out.trees[0].stage, 'mature', '죽지 않는다');
  assert.deepEqual(out.fruited, [{ kind: 'apple', n: 0, watered: 0, days: 1 }]);
});

test('settleTrees: 마른 채로 여러 날이 지나도 fruited 는 나무당 한 건, n:0·watered:0 으로 뭉친다', () => {
  const out = settleTrees([mk({ x: 40, z: 40, stage: 'mature', watered: false })], STREAM, 3);
  assert.equal(out.trees[0].fruit, 0, '물이 없으니 3일이 지나도 열매가 안 열린다');
  assert.deepEqual(out.fruited, [{ kind: 'apple', n: 0, watered: 0, days: 3 }],
    '정산 3일이 전부 마른 날이어도 이벤트는 한 건 — GA4 로 그대로 보낸다');
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
  assert.deepEqual(out.fruited, [{ kind: 'apple', n: 6, watered: 3, days: 3 }],
    '상한에 걸리기 전 3일치가 나무 1그루당 한 건으로 뭉쳐 실린다 — 하루 1건씩이 아니다');
  assert.deepEqual(out.capped, [{ kind: 'apple' }], '상한에 걸린 뒤 남은 날들은 capped 한 건으로만 묶인다');
  assert.deepEqual(out.matured, [], '이미 mature 였으므로 matured 이벤트는 없다');
});

test('settleTrees: 상한에 안 걸리는 여러 날도 fruited 는 나무당 한 건으로 총합이 실린다', () => {
  const out = settleTrees([mk({ x: 1, z: 10, stage: 'mature' })], STREAM, 2);
  assert.equal(out.trees[0].fruit, 4);
  assert.deepEqual(out.fruited, [{ kind: 'apple', n: 4, watered: 2, days: 2 }],
    '이틀치 n·watered·days 총합이 한 건에 실린다');
  assert.deepEqual(out.capped, [], '상한에 걸리지 않았다');
});

test('settleTrees: days 가 0 이하면 아무것도 안 한다', () => {
  const out = settleTrees([mk({ stage: 'mature' })], STREAM, 0);
  assert.equal(out.trees[0].fruit, 0);
  assert.deepEqual(out.matured, []);
  assert.deepEqual(out.fruited, []);
  assert.deepEqual(out.capped, []);
});

// ── 🪓 베기 규칙 (스펙 §4) — 소스 텍스트가 아니라 동작으로 잠근다 ──
test('ORCHARD_CHOP_WOOD: 단계 비례 목재 — 묘목 1 · 자라는 중 2 · 다 자람 3', () => {
  assert.deepEqual(ORCHARD_CHOP_WOOD, { sapling: 1, growing: 2, mature: 3 });
  assert.equal(chopWoodOf('sapling'), 1);
  assert.equal(chopWoodOf('growing'), 2);
  assert.equal(chopWoodOf('mature'), 3);
  assert.equal(chopWoodOf('bogus'), 1, '모르는 단계는 가장 적게 — 목재 인플레 쪽으로 떨어지면 안 된다');
  assert.equal(chopWoodOf(undefined), 1);
  for (const w of Object.values(ORCHARD_CHOP_WOOD)) {
    assert.ok(w <= 3, '숲 나무 한 그루(3)보다 많이 주면 과수원이 목재 소스가 된다');
  }
});

test('chopHit: 맨 도끼는 3번 · 강철 도끼는 2번에 쓰러진다', () => {
  assert.equal(ORCHARD_CHOP_HP, 3);
  assert.equal(chopDamage(false), 1);
  assert.equal(chopDamage(true), 2);

  // 맨 도끼 — hp 3 → 2 → 1 → 0
  let tree = { kind: 'apple', stage: 'mature', fruit: 0 };
  const seq = [];
  for (let i = 0; i < 3; i++) { const r = chopHit(tree, false); seq.push([r.hp, r.felled]); tree = { ...tree, hp: r.hp }; }
  assert.deepEqual(seq, [[2, false], [1, false], [0, true]], '맨 도끼는 정확히 세 번');

  // 강철 도끼 — hp 3 → 1 → 0
  let steel = { kind: 'apple', stage: 'mature', fruit: 0 };
  const seq2 = [];
  for (let i = 0; i < 2; i++) { const r = chopHit(steel, true); seq2.push([r.hp, r.felled]); steel = { ...steel, hp: r.hp }; }
  assert.deepEqual(seq2, [[1, false], [0, true]], '강철 도끼는 한 번 덜 친다');
});

test('chopHit: 쓰러지는 순간 단계에 맞는 목재가 나온다', () => {
  assert.equal(chopHit({ stage: 'sapling', hp: 1, fruit: 0 }, false).wood, 1);
  assert.equal(chopHit({ stage: 'growing', hp: 1, fruit: 0 }, false).wood, 2);
  assert.equal(chopHit({ stage: 'mature', hp: 1, fruit: 0 }, false).wood, 3);
  assert.equal(chopHit({ stage: 'mature', hp: 2, fruit: 0 }, false).wood, undefined, '아직 안 쓰러졌으면 목재가 없다');
});

test('chopHit: 열매가 달린 나무는 못 벤다 — hp 도 안 깎인다(먼저 따야 한다)', () => {
  const tree = { kind: 'apple', stage: 'mature', fruit: 2, hp: 3 };
  const r = chopHit(tree, true);
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'fruit');
  assert.equal(r.hp, undefined, '거부인데 hp 를 돌려주면 부르는 쪽이 그걸 써서 조용히 깎는다');
  assert.equal(tree.hp, 3, '원본을 건드리지 않는다');
  // 다 따면 그때부터 베인다
  assert.equal(chopHit({ ...tree, fruit: 0 }, true).ok, true);
});

// ── 빈 자리 — 그리기·지도·심기 판정이 같은 답을 내야 한다 ──
test('freeSlots: 나무가 선 자리를 빼고 돌려준다(입력 순서 유지)', () => {
  const slots = [{ x: 0, z: 0 }, { x: 1, z: 2 }, { x: 3, z: 4 }];
  const trees = [{ x: 1, z: 2, kind: 'apple' }];
  assert.deepEqual(freeSlots(trees, slots), [{ x: 0, z: 0 }, { x: 3, z: 4 }]);
  assert.deepEqual(freeSlots([], slots), slots, '나무가 없으면 전부 빈 자리');
  assert.deepEqual(freeSlots(slots.map(s => ({ ...s })), slots), [], '다 차면 빈 자리가 없다');
  assert.deepEqual(freeSlots(), [], '인자가 없어도 터지지 않는다');
});

test('freeSlots: 좌표가 다르면 자리가 아니다 — 음수·소수도 문자열 키가 갈리지 않는다', () => {
  const slots = [{ x: -3, z: -12 }, { x: 0.5, z: 1.5 }];
  assert.deepEqual(freeSlots([{ x: -3, z: -12 }], slots), [{ x: 0.5, z: 1.5 }]);
  assert.deepEqual(freeSlots([{ x: 3, z: 12 }], slots), slots, '부호만 달라도 다른 자리다');
  assert.deepEqual(freeSlots([{ x: 0.5, z: 1.5 }], slots), [{ x: -3, z: -12 }]);
});

// 실제 과수원 자리표로도 확인 — 자리 좌표가 바뀌어도 규칙이 따라온다
test('freeSlots: 실제 자리표에서 3그루를 심으면 7자리가 남는다', () => {
  const slots = ORCHARD_SLOTS_LOCAL.map(([x, z]) => ({ x, z }));
  const trees = slots.slice(0, 3).map(s => ({ ...s, kind: 'apple' }));
  assert.equal(freeSlots(trees, slots).length, TREE_SLOTS - 3);
});

// ── 오프라인 복귀 — 과일 상한 설계가 통째로 여기에 기댄다 ──
test('daysBetween: 날짜 경계로 센다 · 최소 1일', () => {
  assert.equal(daysBetween('2026-09-16', '2026-09-17'), 1);
  assert.equal(daysBetween('2026-09-10', '2026-09-17'), 7, '일주일 만에 들어오면 7일치');
  assert.equal(daysBetween('2026-09-17', '2026-09-17'), 1, '같은 날이어도 0일이 아니라 1일(호출부가 날짜 게이트로 막는다)');
  assert.equal(daysBetween('2026-09-18', '2026-09-17'), 1, '시계가 거꾸로 가도 음수 정산은 없다');
});

test('daysBetween: 달·해 경계를 넘어도 맞는다 — 월말 계산이 흔한 사고 자리다', () => {
  assert.equal(daysBetween('2026-08-31', '2026-09-01'), 1);
  assert.equal(daysBetween('2026-12-31', '2027-01-01'), 1);
  assert.equal(daysBetween('2026-02-27', '2026-03-01'), 2, '2026년 2월은 28일까지');
});

test('daysBetween: 값이 없거나 깨졌으면 1일로 안전하게 떨어진다', () => {
  assert.equal(daysBetween(null, '2026-09-17'), 1, '첫 정산(settleDate 없음)');
  assert.equal(daysBetween('', '2026-09-17'), 1);
  assert.equal(daysBetween('2026-09-17', null), 1);
  assert.equal(daysBetween('망가진 값', '2026-09-17'), 1, 'NaN 이 그대로 settleTrees 로 흘러가면 정산이 통째로 멈춘다');
});

test('SELL_PRICE 의 과일 값이 FRUITS[].price 와 일치한다 — 한쪽만 고치면 여기서 터진다', () => {
  const src = gameSource();
  const line = src.split('\n').find(l => l.includes('const SELL_PRICE'));
  assert.ok(line, 'SELL_PRICE 선언을 못 찾았다 — 변수명이 바뀌었으면 이 테스트를 같이 고친다');
  for (const f of FRUITS) {
    const m = new RegExp(`\\b${f.id}\\s*:\\s*(\\d+)`).exec(line);
    assert.ok(m, `SELL_PRICE 에 ${f.id} 가 없다`);
    assert.equal(Number(m[1]), f.price, `${f.id}: SELL_PRICE 와 FRUITS[].price 가 어긋난다`);
  }
});

// 팔 때(SELL_PRICE)는 위에서 잠갔다. 살 때도 같은 자물쇠가 필요하다 —
//   상점 묘목값과 "N일이면 자라요" 문구가 FRUITS[] 를 손으로 베낀 두 번째 사본이라
//   한쪽만 고치면 상점에서 90🪙 를 받고 3일이라 써 놓고 실제로는 다른 값으로 자란다.
test('SHOP_BUY 묘목의 값·자람일 문구가 FRUITS[] 와 일치한다 — 한쪽만 고치면 여기서 터진다', () => {
  const src = gameSource();
  const lines = src.split('\n');
  for (const f of FRUITS) {
    const line = lines.find(l => l.includes(`{ id: '${sapKeyOf(f.id)}'`));
    assert.ok(line, `SHOP_BUY 에 ${sapKeyOf(f.id)} 묘목 줄이 없다`);

    const coin = /\bcoin:\s*(\d+)/.exec(line);
    assert.ok(coin, `${f.id}: 묘목 줄에 coin 이 없다`);
    assert.equal(Number(coin[1]), f.sapCoin, `${f.id}: 상점 묘목값과 FRUITS[].sapCoin 이 어긋난다`);

    const desc = /desc:\s*'(\d+)일이면 자라요 · 매일 (\S+?)2개'/.exec(line);
    assert.ok(desc, `${f.id}: 묘목 설명이 "N일이면 자라요 · 매일 <아이콘>2개" 꼴이 아니다 — 문구를 바꿨으면 이 테스트도 같이 고친다`);
    assert.equal(Number(desc[1]), f.growDays, `${f.id}: 상점 설명의 자람일과 FRUITS[].growDays 가 어긋난다`);
    assert.equal(desc[2], f.ico, `${f.id}: 상점 설명의 아이콘과 FRUITS[].ico 가 어긋난다`);

    assert.match(line, new RegExp(`give:\\s*\\{\\s*${sapKeyOf(f.id)}:\\s*1\\s*\\}`),
      `${f.id}: 묘목 인벤 키가 sapKeyOf(id) 와 다르다 — 산 묘목을 못 심게 된다`);
  }
});

// 객체 리터럴 선언(`const NAME = { ... };`)에서 키 이름만 뽑는다 — 값은 이모지 문자열·숫자뿐이라
// 중첩 객체를 고려할 필요가 없다. 선언 형태가 바뀌면 여기서 먼저 터진다(그게 의도다).
function literalKeys(src, name) {
  const start = src.indexOf(`const ${name} = {`);
  if (start < 0) return null;
  const open = src.indexOf('{', start), close = src.indexOf('};', open);
  if (close < 0) return null;
  return [...src.slice(open + 1, close).matchAll(/(?:^|[,{\s])([A-Za-z_$][\w$]*)\s*:/g)].map(m => m[1]);
}

// 📊 시세판 월드 텍스처(hi/lo argmax)·상인 말풍선(topPriceLine)·시세판 모달(marketData)은
//   전부 SELL_PRICE 의 키를 돌면서 SELL_ICO_G 로 아이콘을 찾는다. 한쪽에만 품목을 추가하면
//   화면에 문자 그대로 "undefined" 가 찍힌다 — 과일 5종이 정확히 그 상태였다.
//   "과일이 들어있나"가 아니라 "두 표가 같은 키 집합인가"가 진짜 불변식이다.
test('SELL_ICO_G 가 SELL_PRICE 의 모든 키를 덮는다 — 빠지면 화면에 "undefined" 가 찍힌다', () => {
  const src = gameSource();
  const priceKeys = literalKeys(src, 'SELL_PRICE');
  const icoKeys = literalKeys(src, 'SELL_ICO_G');
  assert.ok(priceKeys?.length, 'SELL_PRICE 선언을 못 찾았다 — 변수명·형태가 바뀌었으면 이 테스트를 같이 고친다');
  assert.ok(icoKeys?.length, 'SELL_ICO_G 선언을 못 찾았다 — 변수명·형태가 바뀌었으면 이 테스트를 같이 고친다');

  const missing = priceKeys.filter(k => !icoKeys.includes(k));
  assert.deepEqual(missing, [], `SELL_ICO_G 에 아이콘이 없는 판매 품목: ${missing.join(', ')}`);
  for (const f of FRUITS) assert.ok(icoKeys.includes(f.id), `SELL_ICO_G 에 ${f.id} 가 없다`);
});

// ♻️ rebuildOrchard() 는 심기·물주기·수확·베기·정산마다 불린다. 매번 InstancedMesh 8~15개를
//   새로 만들어 버리므로 인스턴스 행렬 버퍼를 안 놓으면 GPU 메모리가 계속 샌다.
//   반대로 지오메트리·재질은 shared() 캐시라 dispose 하면 다음 rebuild 가 해제된 자원을 쓰고,
//   줄기·잎은 마을 숲 나무와도 공유해서 마을 나무까지 같이 사라진다. 둘 다 잠근다.
test('rebuildOrchard: 인스턴스 버퍼만 dispose 하고 shared() 지오메트리·재질은 건드리지 않는다', () => {
  const src = gameSource();
  const start = src.search(/^function rebuildOrchard\(/m);
  assert.ok(start >= 0, 'game.js 에서 rebuildOrchard 를 찾지 못했다');
  // 주석에 "geometry.dispose() 를 부르면 안 된다" 같은 설명이 들어 있으므로 코드만 남긴다
  const body = src.slice(start, start + src.slice(start).indexOf('\n}'))
    .split('\n').map(l => l.replace(/\/\/.*$/, '')).join('\n');

  assert.match(body, /isInstancedMesh/,
    'rebuildOrchard 가 InstancedMesh 를 가려내지 않는다 — 인스턴스 행렬 버퍼(instanceMatrix)가 호출마다 샌다');
  assert.match(body, /\.dispose\(\)/, 'rebuildOrchard 에 dispose 호출이 없다');
  assert.doesNotMatch(body, /geometry\.dispose\(\)/,
    'rebuildOrchard 가 geometry.dispose() 를 부른다 — shared() 캐시라 다음 rebuild 와 마을 숲 나무가 같이 깨진다');
  assert.doesNotMatch(body, /material[^.]*\.dispose\(\)/,
    'rebuildOrchard 가 material.dispose() 를 부른다 — shared() 캐시라 다른 소품까지 사라진다');
});

// 🎒 도구 페이지 자동 전환 — toolZoneKey() 가 돌려주는 구역 이름은 전부 ZONE_PAGE 에 있어야 한다.
//   'orchard' 만 빠져 있어서 과수원이 유일하게 페이지가 안 열리는 구역이었다(M4).
//   ZONE_PAGE 에 없으면 조용히 아무 일도 안 일어나므로, 새 구역을 넣을 때 또 빠뜨리기 쉽다.
test("toolZoneKey() 가 돌려주는 구역 이름은 전부 ZONE_PAGE 에 있다", () => {
  const src = gameSource();
  const body = src.slice(src.search(/^function toolZoneKey\(/m));
  const zoneBody = body.slice(0, body.indexOf('\n}'));
  const zones = [...zoneBody.matchAll(/return '([a-z]+)'/g)].map(m => m[1]);
  assert.ok(zones.length >= 8, `toolZoneKey 에서 구역 이름을 못 뽑았다(${zones.length}개) — 함수 모양이 바뀌었으면 이 테스트도 같이 고친다`);
  assert.ok(zones.includes('orchard'), 'toolZoneKey 가 과수원을 안 돌려준다');

  const pages = literalKeys(src, 'ZONE_PAGE');
  assert.ok(pages?.length, 'ZONE_PAGE 선언을 못 찾았다');
  const missing = zones.filter(z => !pages.includes(z));
  assert.deepEqual(missing, [], `ZONE_PAGE 에 빠진 구역: ${missing.join(', ')} — 그 구역만 도구 페이지가 안 열린다`);
});

// 🍎 과수원 입구(ORCHARD_GATE)가 배경 나무 회피 목록에서 빠지면, 매 접속마다 새로 뿌리는
//   나무 14그루 중 하나가 그 자리를 막을 확률이 생긴다(다른 게이트 7곳은 전부 이 목록에 있다).
//   Task 6 에서 이 줄을 추가했다 — 나중에 buildWorld() 를 리팩터링하다 이 줄이 빠지면 여기서 잡는다.
test('buildWorld 의 배경 나무 회피 목록에 ORCHARD_GATE 가 다른 게이트들과 같은 패턴으로 들어있다', () => {
  const src = gameSource();
  // 반경은 조형이 커지면 바뀐다(문 앞 5 + 몸통 6.5). 숫자를 박지 말고 "조건이 있는가"만 본다
  assert.match(
    src,
    /dist2D\(\{ x, z \}, ORCHARD_GATE\) < [\d.]+/,
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

// syncOrchardTrees() 는 rebuildOrchard() 가 반복 호출될 때마다(Task 8 심기·정산) obstacles 에
// 나무를 다시 등록한다. 지난 항목을 먼저 안 지우면 부를 때마다 나무 수만큼 중복이 쌓여
// obstacles 를 순회하는 모든 충돌 검사가 영원히 느려진다 — 오늘은 rebuildOrchard() 가 월드
// 생성 시 빈 나무 목록으로 딱 한 번만 불려서 무해하지만, 심기 기능이 붙는 순간 터진다.
// js/game.js 는 브라우저 전역(THREE·document)에 의존해 이 파일에서 import 해 실행할 수 없으므로
// (ORCHARD_GATE 회피 테스트와 같은 이유) 소스 텍스트로 "지우는 코드가 있고, 새로 등록하는 코드보다
// 앞에 있다"만 확인한다 — push 존재만 확인하면 이번에 고친 회귀를 못 잡는다.
test('syncOrchardTrees: obstacles 재등록 전에 지난 과수원 나무 항목을 먼저 지운다(중복 누적 방지)', () => {
  const src = gameSource();
  const start = src.search(/^function syncOrchardTrees\(/m);
  assert.ok(start >= 0, 'game.js 에서 syncOrchardTrees 를 찾지 못했다 — 함수명이 바뀌었으면 이 테스트도 같이 고친다');
  const rest = src.slice(start + 1);
  const endRel = rest.search(/^function \w+\(/m);
  const body = endRel < 0 ? rest : rest.slice(0, endRel);

  assert.match(body, /obstacles\.push\(/, 'obstacles 에 나무를 등록하는 줄을 못 찾았다');
  const pushIdx = body.search(/obstacles\.push\(/);
  const clearIdx = body.search(/obstacles\.splice\(/);
  assert.ok(clearIdx >= 0,
    'syncOrchardTrees 안에 obstacles.splice(...) 로 지난 항목을 지우는 코드가 없다 — ' +
    'rebuildOrchard() 를 나무가 있는 상태로 반복 호출하면(심기·정산) obstacles 에 중복이 쌓인다');
  assert.ok(clearIdx < pushIdx,
    '지우는 코드가 새로 등록하는 코드보다 뒤에 있다 — 순서가 바뀌면 방금 등록한 항목까지 같이 지워질 수 있다');
});

// =============================================================
//  Task 8 — 심기·물주기·수확·베기·정산의 game.js 쪽 배선(wiring)
//  js/game.js 는 THREE·document 전역에 의존해 이 파일에서 import 해 실행할 수 없다(위와 같은 이유).
//  그래서 소스 텍스트로 "규칙이 지켜지는 형태로 쓰여 있다"만 확인한다 — 실제 동작은 수동 추적으로 검증했다.
// =============================================================
const GAME_SRC = () => gameSource();

// 함수 하나의 본문만 잘라낸다(다음 최상위 function 선언 전까지) — 위 syncOrchardTrees 테스트와 같은 절단 방식.
function sliceFunctionBody(src, headerRe) {
  const start = src.search(headerRe);
  if (start < 0) return null;
  const rest = src.slice(start + 1);
  const endRel = rest.search(/^(function|export function|const) \w+/m);
  return endRel < 0 ? rest : rest.slice(0, endRel);
}

test('getGameState: 과수원 나무의 hp(도끼질 진행도)를 저장용 스냅샷에서만 걷어내고, 살아 있는 gameState.orchard.trees 는 건드리지 않는다', () => {
  const src = GAME_SRC();
  const body = sliceFunctionBody(src, /^export function getGameState\(/m);
  assert.ok(body, 'game.js 에서 getGameState 를 찾지 못했다 — 함수명이 바뀌었으면 이 테스트도 같이 고친다');
  // hp 를 스프레드에서 빼는 구조 분해가 있어야 한다(저장 스냅샷 전용)
  assert.match(body, /\{\s*hp,\s*\.\.\.rest\s*\}/,
    'getGameState 안에 { hp, ...rest } 형태로 hp 를 걸러내는 코드가 없다 — ' +
    '도끼로 반쯤 벤 나무의 hp 가 그대로 세이브에 들어간다');
  // gameState.orchard.trees 자체를 재할당하면 안 된다 — 재할당하면 저장할 때마다
  // 진행 중인 도끼질 타수가 사라진다(요청마다 requestSave 가 불린다).
  assert.doesNotMatch(body, /gameState\.orchard\.trees\s*=/,
    'getGameState 가 gameState.orchard.trees 를 직접 재할당한다 — ' +
    '저장할 때마다(모든 액션 뒤) 진행 중인 도끼질 hp 가 초기화된다');
});

// 🍎 복원된 나무가 안 그려지던 회귀(C1).
//   buildWorld() 의 rebuildOrchard() 는 로그인 전이라 나무 목록이 항상 비어 있고,
//   settleOrchard() 의 rebuildOrchard() 는 날짜 게이트(settleDate === today)에 막힌다.
//   그래서 applySave() 가 trees 를 복원한 **뒤에** 직접 다시 그려야 한다.
//
//   ⚠️ 이 테스트가 증명하는 것: applySave 안에 rebuildOrchard() 호출이 있고,
//      그것이 saved.orchard 복원 코드보다 뒤에 있다(=빈 목록을 그리지 않는다).
//   ⚠️ 증명하지 못하는 것: rebuildOrchard() 가 실제로 나무를 그리는지, 충돌체가 붙는지.
//      js/game.js 는 THREE·document 전역에 묶여 이 파일에서 실행할 수 없다(이 파일 다른 소스-텍스트
//      테스트와 같은 한계). 렌더 자체는 브라우저에서 확인해야 한다.
test('applySave: 복원한 과수원 나무를 rebuildOrchard() 로 다시 그린다 — 복원 코드보다 뒤에서', () => {
  const src = GAME_SRC();
  const body = sliceFunctionBody(src, /^function applySave\(/m);
  assert.ok(body, 'game.js 에서 applySave 를 찾지 못했다 — 함수명이 바뀌었으면 이 테스트도 같이 고친다');

  const restoreIdx = body.search(/gameState\.orchard\.trees\s*=\s*saved\.orchard\.trees/);
  assert.ok(restoreIdx >= 0, 'applySave 안에서 과수원 나무를 복원하는 줄을 못 찾았다');

  const drawIdx = body.search(/rebuildOrchard\(\)/);
  assert.ok(drawIdx >= 0,
    'applySave 가 rebuildOrchard() 를 부르지 않는다 — 같은 날 새로고침하면 과수원이 빈 언덕으로 보인다 ' +
    '(나무도 충돌체도 없고, 찬 자리는 "심을 수 있는 흙"으로 그려진다)');
  assert.ok(restoreIdx < drawIdx,
    'rebuildOrchard() 가 나무 복원보다 앞에 있다 — 빈 목록을 그리게 되어 고친 회귀가 그대로 돌아온다');
});

// game.js 의 chopTree 는 이제 배선만 한다 — 규칙 자체는 위 chopHit() 동작 테스트가 잠근다.
//   여기서는 "규칙 모듈을 실제로 쓰는가" 만 본다(규칙을 다시 손으로 쓰면 두 벌이 갈라진다).
test('chopTree(game.js): 규칙을 다시 쓰지 않고 js/orchard.js 의 chopHit() 을 쓴다', () => {
  const src = GAME_SRC();
  const body = sliceFunctionBody(src, /^function chopTree\(/m);
  assert.ok(body, 'game.js 에서 chopTree 를 찾지 못했다');
  assert.match(body, /chopHit\(tree,/, 'chopTree 가 chopHit() 을 안 쓴다 — 규칙이 game.js 로 다시 새어 들어왔다');
  assert.doesNotMatch(body, /tree\.hp\s*\?\?/, 'chopTree 안에서 hp 기본값을 다시 정한다 — ORCHARD_CHOP_HP 가 유일한 출처여야 한다');
  assert.doesNotMatch(body, /upgrades\.axe\s*\?/, 'chopTree 안에서 강철 도끼 타수를 다시 계산한다 — chopDamage() 가 유일한 출처여야 한다');
});

// 🔒 해금 카운터 — 🧑‍🌾일꾼이 거둔 고급 작물이 안 세지면, 밀을 심고 일꾼에게 맡긴 유저는
//   "고급 작물을 한 번 거두세요" 를 이미 해낸 채로 영원히 본다(I6).
//   증가 지점이 하나뿐이어야 "정확히 한 번만 해금" 이 구조적으로 보장된다.
test('advHarvest 를 올리는 곳은 bumpAdvHarvest() 한 곳뿐이다 — 해금이 두 번 터질 수 없다', () => {
  const src = GAME_SRC();
  const bumps = [...src.matchAll(/progress\.advHarvest\s*=\s*\(gameState\.progress\.advHarvest\s*\|\|\s*0\)\s*\+\s*1/g)];
  assert.equal(bumps.length, 1, '고급 작물 수확 카운터를 올리는 코드가 한 곳이 아니다 — 해금 분기가 갈라지면 묘목 2그루가 두 번 나간다');

  const body = sliceFunctionBody(src, /^function bumpAdvHarvest\(/m);
  assert.ok(body, 'game.js 에서 bumpAdvHarvest 를 찾지 못했다');
  assert.match(body, /advHarvest\s*!==\s*1\)\s*return false/, '"처음 1이 될 때만" 가드가 없다 — 거둘 때마다 해금이 다시 터진다');
  assert.match(body, /trackEvent\('orchard_unlock'/, 'bumpAdvHarvest 가 orchard_unlock 을 안 보낸다');
  assert.match(body, /sap_apple:\s*2/, 'bumpAdvHarvest 가 묘목 2그루를 안 준다');
  assert.match(body, /syncOrchardGateLock\(\)/, 'bumpAdvHarvest 가 가로대를 안 치운다');
  assert.doesNotMatch(body, /ui\.toast/,
    'bumpAdvHarvest 안에서 토스트를 띄운다 — 오프라인 일꾼 정산에선 플레이어가 마을 밖에 있었으므로 ' +
    '토스트가 아니라 요약 모달 한 줄로 알려야 한다. 토스트는 부르는 쪽이 정한다');
});

test('workerApply: 일꾼이 거둔 고급 작물도 과수원 해금에 센다', () => {
  const src = GAME_SRC();
  const body = sliceFunctionBody(src, /^function workerApply\(/m);
  assert.ok(body, 'game.js 에서 workerApply 를 찾지 못했다');
  assert.match(body, /bumpAdvHarvest\(/,
    'workerApply 가 bumpAdvHarvest 를 안 부른다 — 일꾼에게 밭을 맡긴 유저는 과수원을 영영 못 연다');
  // 오프라인(tally 있음)과 접속 중(tally 없음)의 알림이 갈라져 있어야 한다
  assert.match(body, /tally\.orchardUnlock\s*=\s*true/,
    '오프라인 정산에서 해금을 tally 에 남기지 않는다 — 요약 모달에 알릴 방법이 없다');
});

// 스펙 §6-2 가 이름 붙인 생애주기 이벤트. shop_buy 만으로는 안 되는 이유가 둘이다 —
//   item 이 상점 id('sap_apple')라 파종·수확의 kind('apple')와 join 이 끊기고,
//   §6-3 의 trees(그 시점 보유 그루 수)는 나중에 복원할 길이 아예 없다.
test('sapling_buy: kind·coin·trees 를 보내고 GA4 예약어를 쓰지 않는다', () => {
  const src = GAME_SRC();
  const body = sliceFunctionBody(src, /^function buyShop\(/m);
  assert.ok(body, 'game.js 에서 buyShop 을 찾지 못했다');
  const m = body.match(/trackEvent\('sapling_buy',\s*\{([^}]*)\}\)/);
  assert.ok(m, 'buyShop 안에서 sapling_buy 트래킹 호출을 찾지 못했다 — 스펙 §6-2 의 이벤트다');
  for (const p of ['kind', 'coin', 'trees']) {
    assert.match(m[1], new RegExp(`\\b${p}\\s*:`), `sapling_buy 에 ${p} 파라미터가 없다`);
  }
  // 상점 id 가 아니라 과일 kind 여야 한다 — 'sap_apple' 을 그대로 보내면 퍼널이 끊긴다
  assert.doesNotMatch(m[1], /kind:\s*id\b/, "sapling_buy 의 kind 로 상점 item id 를 보낸다 — 'apple' 같은 과일 id 여야 한다");
  for (const banned of ['source', 'medium', 'campaign', 'campaign_id', 'term', 'content']) {
    assert.doesNotMatch(m[1], new RegExp(`\\b${banned}\\s*:`),
      `sapling_buy 가 GA4 예약어 "${banned}" 를 파라미터 키로 쓴다 — 세션 유입 정보가 오염된다`);
  }
});

test('tree_water 트래킹은 GA4 캠페인 예약어(source/medium/campaign 등)가 아니라 method 로 물주기 방식을 보낸다', () => {
  const src = GAME_SRC();
  const body = sliceFunctionBody(src, /^function waterTree\(/m);
  assert.ok(body, 'game.js 에서 waterTree 를 찾지 못했다');
  const m = body.match(/trackEvent\('tree_water',\s*\{([^}]*)\}\)/);
  assert.ok(m, 'waterTree 안에서 tree_water 트래킹 호출을 찾지 못했다');
  assert.match(m[1], /\bmethod\s*:/, 'tree_water 이벤트에 method 파라미터가 없다');
  for (const banned of ['source', 'medium', 'campaign', 'campaign_id', 'term', 'content']) {
    assert.doesNotMatch(m[1], new RegExp(`\\b${banned}\\s*:`),
      `tree_water 이벤트가 GA4 예약어 "${banned}" 를 파라미터 키로 쓴다 — 세션 유입 정보가 오염된다`);
  }
});

test('숲 나무 CHOP_WOOD(숫자 3) 와 과수원 목재 표는 이름이 겹치지 않는다', () => {
  const src = GAME_SRC();
  assert.match(src, /const CHOP_WOOD = 3;/, '숲 나무 CHOP_WOOD 상수를 못 찾았다 — 상수명이 바뀌었으면 이 테스트도 같이 고친다');
  // 같은 이름의 두 번째 선언은 SyntaxError(중복 선언)를 낸다 — node --check 로도 잡히지만
  // "왜 이름을 나눴는지"는 여기 남겨 둔다.
  assert.doesNotMatch(src, /const CHOP_WOOD = \{/, 'CHOP_WOOD 를 객체로 다시 선언하는 곳이 있다 — 기존 숲 나무 상수(숫자 3)와 이름이 겹친다');
  // 과수원 목재 표는 js/orchard.js 로 옮겼다 — game.js 에 다시 생기면 두 벌이 갈라진다
  assert.doesNotMatch(src, /const ORCHARD_CHOP_WOOD = \{/,
    'game.js 에 ORCHARD_CHOP_WOOD 가 다시 선언됐다 — 단계별 목재 규칙은 js/orchard.js 가 유일한 출처다');
});

// ── 🍎 도구 자동 전환 (밭의 farm-auto 와 같은 원칙) ──
test('ORCHARD_AUTO_TOOLS: 🪓도끼는 자동 전환에서 빠진다 — 파괴 동작은 명시적으로만', () => {
  assert.deepEqual(ORCHARD_AUTO_TOOLS, ['seed', 'water', 'sickle']);
  assert.equal(ORCHARD_AUTO_TOOLS.includes('axe'), false, '도끼가 들어가면 실수로 나무를 벤다');
});

test('orchardToolFor: 빈 자리면 씨앗 · 열매 있으면 낫 · 마른 성목이면 물', () => {
  assert.equal(orchardToolFor(null, true, false), 'seed');
  assert.equal(orchardToolFor(null, false, false), null, '아무것도 없으면 바꾸지 않는다');
  assert.equal(orchardToolFor({ stage: 'mature', fruit: 4, watered: false }, false, false), 'sickle');
  assert.equal(orchardToolFor({ stage: 'mature', fruit: 0, watered: false }, false, false), 'water');
});

test('orchardToolFor: 시냇가거나 이미 물을 준 성목은 바꾸지 않는다', () => {
  assert.equal(orchardToolFor({ stage: 'mature', fruit: 0, watered: false }, false, true), null, '시냇가는 물이 필요 없다');
  assert.equal(orchardToolFor({ stage: 'mature', fruit: 0, watered: true }, false, false), null, '이미 줬다');
});

test('orchardToolFor: 어린 나무는 바꾸지 않는다 — 물을 줘도 성장이 안 빨라진다', () => {
  assert.equal(orchardToolFor({ stage: 'sapling', fruit: 0, watered: false }, false, false), null);
  assert.equal(orchardToolFor({ stage: 'growing', fruit: 0, watered: false }, false, false), null);
});

test('orchardToolFor: 열매가 있으면 물보다 수확이 먼저 — 딸 것이 눈앞에 있는데 물조리개가 나오면 안 된다', () => {
  assert.equal(orchardToolFor({ stage: 'mature', fruit: 2, watered: false }, false, false), 'sickle');
});
