import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TOOL_UPGRADE, TIER_PALETTE, BLOOM_LUMA, luma, tierOf } from '../js/tool-tiers.js';

// 🪓 도구 등급 — 0 기본 / 1 업그레이드(코인·제작) / 2 히든(친밀도)
//   업그레이드는 이미 게임에 있었지만 toolMesh 가 upgrades 를 안 읽어 "모습이 그대로" 였다.
//   이 모듈은 "어떤 등급인가" 와 "그 등급의 색" 만 정한다(THREE 비의존 — 그래서 노드에서 잠글 수 있다).
const SRC = readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');

// ── 등급 판정 ─────────────────────────────────────────────────
test('업그레이드가 없으면 0단계', () => {
  assert.equal(tierOf('axe', { upgrades: {} }), 0);
  assert.equal(tierOf('axe', { upgrades: { axe: false } }), 0);
});

test('업그레이드를 보유하면 1단계 — 기존 유저가 접속하자마자 체감한다', () => {
  assert.equal(tierOf('axe', { upgrades: { axe: true } }), 1);
  assert.equal(tierOf('water', { upgrades: { water: true } }), 1);
  assert.equal(tierOf('rod', { upgrades: { rod: true } }), 1);
  assert.equal(tierOf('net', { upgrades: { net: true } }), 1);
});

// 🍲 큰 냄비는 요리 버프라 손에 드는 도구가 아니다 — 도구 등급과 섞이면 안 된다
test('도구가 아닌 업그레이드(pot)는 어떤 도구 등급도 올리지 않았다', () => {
  for (const id of Object.keys(TOOL_UPGRADE)) {
    assert.equal(tierOf(id, { upgrades: { pot: true } }), 0, `${id} 가 pot 으로 올라갔다`);
  }
  assert.equal(TOOL_UPGRADE.pot, undefined);
});

// ⛏️🌰🌾🪏🔨 는 아직 업그레이드가 없다(dev docs 3번 작업에서 신설)
test('아직 업그레이드가 없는 도구는 무엇을 가져도 0단계', () => {
  for (const id of ['hoe', 'seed', 'sickle', 'shovel', 'hammer']) {
    assert.equal(tierOf(id, { upgrades: { axe: true, water: true, rod: true, net: true } }), 0);
  }
});

test('상태가 없거나 모르는 도구여도 터지지 않고 0단계', () => {
  assert.equal(tierOf('axe'), 0);
  assert.equal(tierOf('axe', {}), 0);
  assert.equal(tierOf('nope', { upgrades: { nope: true } }), 0);
  assert.equal(tierOf(undefined, { upgrades: {} }), 0);
});

// ── 팔레트 ────────────────────────────────────────────────────
test('팔레트는 0·1·2 세 단계가 같은 키를 갖는다', () => {
  assert.equal(TIER_PALETTE.length, 3);
  const keys = Object.keys(TIER_PALETTE[0]).sort();
  for (const T of TIER_PALETTE) assert.deepEqual(Object.keys(T).sort(), keys, `${T.id}단계 키가 다르다`);
});

// ⚠️ 블룸 임계 0.85(휘도) — 넘는 색으로 넓은 면을 칠하면 후광이 형태를 삼킨다.
//    2단계의 "금" 이 특히 위험하다(금속 몸체 전체가 그 색이다) — 광택이 아니라 색으로만 내야 하는 이유.
//    edge(날의 밝은 면)는 예외다: 기존 게임 색 0xd9dfe4 를 그대로 옮긴 것이고,
//    좁은 하이라이트라 살짝 넘어도 반짝임으로 읽힌다(말풍선처럼 넓은 면이 아니다).
test('넓은 면을 칠하는 색은 블룸 임계 아래다', () => {
  const over = [];
  for (const T of TIER_PALETTE) {
    for (const [k, v] of Object.entries(T)) {
      if (typeof v !== 'number' || k === 'id' || k === 'edge') continue;
      if (luma(v) > BLOOM_LUMA) over.push(`${T.id}단계 ${k}=0x${v.toString(16)} (휘도 ${luma(v).toFixed(2)})`);
    }
  }
  assert.deepEqual(over, [], `블룸이 번지는 색: ${over.join(', ')}`);
});

test('휘도 계산이 블룸이 쓰는 식과 같다', () => {
  assert.equal(luma(0x000000), 0);
  assert.ok(Math.abs(luma(0xffffff) - 1) < 1e-9);
  // js/game.js 주석이 "#f5efe0 은 휘도 0.94였음" 이라 적어 둔 값과 맞는지 — 식이 어긋나면 규칙이 헛돈다
  assert.equal(luma(0xf5efe0).toFixed(2), '0.94');
  assert.ok(luma(0xf5efe0) > BLOOM_LUMA, '말풍선에서 글자를 삼켰던 색이 통과하면 기준이 헐겁다');
  assert.ok(luma(TIER_PALETTE[2].metal) < 0.7, '2단계 금색이 이미 밝다 — 더 밝히면 번진다');
});

test('등급이 오를수록 금속이 달라진다(같은 색이면 구분이 안 된다)', () => {
  const metals = TIER_PALETTE.map(T => T.metal);
  assert.equal(new Set(metals).size, 3, '금속 색이 겹친다');
});

// ── 짝 검증: game.js 연결 ─────────────────────────────────────
test('toolMesh 가 등급을 받는다', () => {
  assert.match(SRC, /function toolMesh\(id, tier = 0\)/, 'toolMesh 가 tier 를 안 받거나 기본값이 0 이 아니다');
});

// ⚠️ 🧑‍🌾일꾼(makeWorkerMesh)도 같은 toolMesh 를 쓴다. 등급을 넘기면 고용한 일꾼까지 금빛 도구를 든다.
test('일꾼 손의 도구는 등급을 넘기지 않는다(기본 0단계)', () => {
  const i = SRC.indexOf('armR.hand.add(tool)');
  assert.ok(i > 0, '일꾼 손 도구 부착 지점을 못 찾음');
  // 창을 좁게 — 위쪽에 toolMesh 호출이 하나 더 생겨도 엉뚱한 줄을 검사하고 통과하면 안 된다
  const win = SRC.slice(Math.max(0, i - 200), i);
  assert.match(win, /toolMesh\(toolId\)/, '일꾼 도구에 등급이 넘어간다');
});

// 🌊 바다 릴대도 같은 함수를 탄다 — 등급 개념이 없는 도구라 0단계로 고정되어야 한다
test('바다 릴대는 등급을 넘기지 않는다', () => {
  assert.match(SRC, /seaRodMesh = toolMesh\('reel'\)/, '릴대에 등급이 넘어간다');
});

// ⚠️ bootWorld → buildPlayer → setHeldTool 은 세이브를 읽기 전에 돈다.
//    복원 뒤에 다시 만들지 않으면 "이미 산 사람은 접속할 때마다 옛 모습" 이 되어,
//    이 기능이 구매한 그 세션에서만 동작한다(테스트가 잡지 못한 채 배포될 뻔했다).
test('세이브에서 업그레이드를 복원하면 손에 든 도구를 다시 만든다', () => {
  const i = SRC.indexOf('function applySave(');
  assert.ok(i > 0, 'applySave 를 못 찾음');
  const body = SRC.slice(i, SRC.indexOf('\n}\n', i));
  const up = body.indexOf('saved.upgrades');
  const ref = body.indexOf('refreshHeldTool()');
  assert.ok(ref > 0, 'applySave 가 손에 든 도구를 갱신하지 않는다 — 접속 시 옛 모습이 남는다');
  assert.ok(ref > up, '업그레이드 복원보다 먼저 갱신하면 아무 소용이 없다');
});

test('손에 든 도구는 지금 등급으로 만든다', () => {
  const fn = SRC.slice(SRC.indexOf('function setHeldTool(id)'));
  assert.match(fn.slice(0, 600), /tierOf\(/, 'setHeldTool 이 등급을 반영하지 않는다');
});

// 업그레이드를 산 순간 손에 든 도구가 옛 모습 그대로면, 다음 도구 전환까지 보상이 안 보인다
test('업그레이드를 얻으면 손에 든 도구를 다시 만든다', () => {
  for (const [name, fn] of [['buyShop', 'function buyShop(id)'], ['craftUpgrade', 'function craftUpgrade(id)']]) {
    const i = SRC.indexOf(fn);
    assert.ok(i > 0, `${name} 을 못 찾음`);
    const body = SRC.slice(i, SRC.indexOf('\n}', i));
    assert.match(body, /refreshHeldTool\(\)/, `${name} 이 손에 든 도구를 갱신하지 않는다`);
  }
});

// ── 🔧 새 업그레이드 5종의 효과 규칙 ──────────────────────────
//   효과는 전부 "반복 노동 완화" 다. 보상량을 늘리면 코인 인플레가 생기는데,
//   지금 문제는 코인이 남는 것이라 정반대다(dev/active/tool-tiers/).
import { mineHitPower, buildCostOf, seedSaved, digIsOneShot, sickleReach, SEED_SAVE } from '../js/tool-tiers.js';

const none = { upgrades: {} };

test('⛏️ 무쇠 괭이 — 광맥을 한 번 덜 친다(🪓강철 도끼와 같은 패턴)', () => {
  assert.equal(mineHitPower(none), 1);
  assert.equal(mineHitPower({ upgrades: { hoe: true } }), 2);
});

test('🔨 묵직한 망치 — 건축 목재가 준다', () => {
  assert.equal(buildCostOf(none, 10), 10);
  assert.equal(buildCostOf({ upgrades: { hammer: true } }, 10), 7);
});

// 🌰 고급 씨앗(🌾밀·🌽옥수수·🍇포도)은 상점에서 코인으로 사는 물건이다.
//    절약이 붙으면 이 기획이 늘리려는 코인 싱크를 스스로 깎는다.
test('🌰 씨앗 주머니 — 기본 씨앗만 아낀다', () => {
  assert.equal(seedSaved(none, 0.0, false), false);
  assert.equal(seedSaved({ upgrades: { seed: true } }, 0.0, false), true);
  assert.equal(seedSaved({ upgrades: { seed: true } }, 0.99, false), false);
  assert.equal(seedSaved({ upgrades: { seed: true } }, 0.0, true), false, '고급 씨앗까지 아끼면 코인 싱크가 깎인다');
});

test('🌰 절약 확률은 경계에서 갈린다', () => {
  const up = { upgrades: { seed: true } };
  assert.equal(seedSaved(up, SEED_SAVE - 0.001, false), true);
  assert.equal(seedSaved(up, SEED_SAVE, false), false, '난수는 0 이상 1 미만이라 경계는 제외여야 한다');
});

test('🪏 넓은 삽 — 한 번에 메운다', () => {
  assert.equal(digIsOneShot(none), false);
  assert.equal(digIsOneShot({ upgrades: { shovel: true } }), true);
});

test('🌾 잘 드는 낫 — 옆 칸까지 닿는다', () => {
  assert.equal(sickleReach(none), 0);
  assert.equal(sickleReach({ upgrades: { sickle: true } }), 1);
});

test('상태가 없어도 터지지 않는다', () => {
  assert.equal(mineHitPower({}), 1);
  assert.equal(buildCostOf({}, 10), 10);
  assert.equal(digIsOneShot({}), false);
  assert.equal(sickleReach({}), 0);
  assert.equal(seedSaved({}, 0, false), false);
});

// ── 짝 검증: 5종이 실제로 게임에 등록됐는가 ───────────────────
test('새 업그레이드 5종이 도구 등급 매핑에 들어 있다', () => {
  for (const id of ['hoe', 'seed', 'sickle', 'shovel', 'hammer']) {
    assert.equal(TOOL_UPGRADE[id], id, `${id} 매핑 없음 — 사도 모습이 안 바뀐다`);
    assert.equal(tierOf(id, { upgrades: { [id]: true } }), 1);
  }
});

test('5종이 작업대(UPGRADES)와 상점(SHOP_BUY) 양쪽에 있다', () => {
  const up = SRC.slice(SRC.indexOf('const UPGRADES = ['), SRC.indexOf('\n];', SRC.indexOf('const UPGRADES = [')));
  const shop = SRC.slice(SRC.indexOf('const SHOP_BUY'), SRC.indexOf('\n];', SRC.indexOf('const SHOP_BUY')));
  for (const id of ['hoe', 'seed', 'sickle', 'shovel', 'hammer']) {
    assert.match(up, new RegExp(`id: '${id}'`), `작업대에 ${id} 없음`);
    assert.match(shop, new RegExp(`upgrade: '${id}'`), `상점에 ${id} 없음`);
  }
});

test('세이브 기본값에 5종이 있다(없으면 복원 때 undefined 가 섞인다)', () => {
  const line = SRC.match(/upgrades: \{[^}]*\}/)[0];
  for (const id of ['hoe', 'seed', 'sickle', 'shovel', 'hammer']) {
    assert.match(line, new RegExp(`${id}: false`), `gameState.upgrades 기본값에 ${id} 없음`);
  }
});
