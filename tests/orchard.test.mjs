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

// syncOrchardTrees() 는 rebuildOrchard() 가 반복 호출될 때마다(Task 8 심기·정산) obstacles 에
// 나무를 다시 등록한다. 지난 항목을 먼저 안 지우면 부를 때마다 나무 수만큼 중복이 쌓여
// obstacles 를 순회하는 모든 충돌 검사가 영원히 느려진다 — 오늘은 rebuildOrchard() 가 월드
// 생성 시 빈 나무 목록으로 딱 한 번만 불려서 무해하지만, 심기 기능이 붙는 순간 터진다.
// js/game.js 는 브라우저 전역(THREE·document)에 의존해 이 파일에서 import 해 실행할 수 없으므로
// (ORCHARD_GATE 회피 테스트와 같은 이유) 소스 텍스트로 "지우는 코드가 있고, 새로 등록하는 코드보다
// 앞에 있다"만 확인한다 — push 존재만 확인하면 이번에 고친 회귀를 못 잡는다.
test('syncOrchardTrees: obstacles 재등록 전에 지난 과수원 나무 항목을 먼저 지운다(중복 누적 방지)', () => {
  const src = readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');
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
const GAME_SRC = () => readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');

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

test('chopTree: 열매가 있으면 hp 를 깎기 전에 막는다(먼저 따야 벤다)', () => {
  const src = GAME_SRC();
  const body = sliceFunctionBody(src, /^function chopTree\(/m);
  assert.ok(body, 'game.js 에서 chopTree 를 찾지 못했다');
  const fruitGuardIdx = body.search(/tree\.fruit/);
  const hpIdx = body.search(/tree\.hp\s*=/);
  assert.ok(fruitGuardIdx >= 0, 'chopTree 안에 열매 확인 코드가 없다');
  assert.ok(hpIdx >= 0, 'chopTree 안에 hp 를 깎는 코드가 없다');
  assert.ok(fruitGuardIdx < hpIdx, '열매 확인이 hp 를 깎는 코드보다 뒤에 있다 — 열매 달린 나무도 베어진다');
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

test('ORCHARD_CHOP_WOOD 는 숲 나무의 CHOP_WOOD(상수 3) 와 이름이 겹치지 않는다', () => {
  const src = GAME_SRC();
  assert.match(src, /const CHOP_WOOD = 3;/, '숲 나무 CHOP_WOOD 상수를 못 찾았다 — 상수명이 바뀌었으면 이 테스트도 같이 고친다');
  assert.match(src, /const ORCHARD_CHOP_WOOD = \{/, '과수원 단계별 목재 상수(ORCHARD_CHOP_WOOD)를 못 찾았다');
  // 같은 이름의 두 번째 선언은 SyntaxError(중복 선언)를 낸다 — node --check 로도 잡히지만
  // "왜 이름을 나눴는지"는 여기 남겨 둔다.
  assert.doesNotMatch(src, /const CHOP_WOOD = \{/, 'CHOP_WOOD 를 객체로 다시 선언하는 곳이 있다 — 기존 숲 나무 상수(숫자 3)와 이름이 겹친다');
});
