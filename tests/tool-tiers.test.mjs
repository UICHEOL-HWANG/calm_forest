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

// ⚠️ 주민도 같은 toolMesh 를 쓴다(js/game.js 의 NPC 손). 등급을 넘기면 마을 전체가 금빛이 된다.
test('주민 손의 도구는 등급을 넘기지 않는다(기본 0단계)', () => {
  const i = SRC.indexOf('armR.hand.add(tool)');
  assert.ok(i > 0, 'NPC 손 도구 부착 지점을 못 찾음');
  const line = SRC.slice(SRC.lastIndexOf('\n', SRC.lastIndexOf('toolMesh(', i)), i);
  assert.match(line, /toolMesh\(toolId\)/, '주민 도구에 등급이 넘어간다');
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
