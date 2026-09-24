import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pickSeaTarget, AIM_DIST_WEIGHT } from '../js/sea-aim.js';
import { gameSource } from './helpers/game-source.mjs';   // game.js + js/data (분리 1단계)

const src = gameSource();

// 바다터 좌표계: 뭍(+z) → 부두 끝(-z). 부두 폭 3.4 라 플레이어 x 는 SEA.x ±1.7.
// 아래 좌표는 2026-09-17 로컬 실측에서 그대로 읽은 값이다(참치 0마리 사고의 재현 조건).
const PIER_END = { x: 400, z: -9.55 };          // 부두 끝 한가운데 — 실제로 서게 되는 자리
const FISH = {
  aji:  { x: 393.4, z: -16.3 },
  buri: { x: 400.0, z: -18.1 },
  tuna: { x: 406.8, z: -20.6 },
};
const list = (...ids) => ids.map(id => ({ id, ...FISH[id] }));
const lookAt = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);   // forward = (sin yaw, cos yaw)

// ─────────────────────────────────────────────────────────────
//  조준 규칙 — "보고 던지면 그게 걸린다"(프롬프트가 이미 그렇게 말한다)
// ─────────────────────────────────────────────────────────────

test('바다 쪽(-z)을 그냥 보고 있으면 정면의 방어가 걸린다', () => {
  assert.equal(pickSeaTarget(list('aji', 'buri', 'tuna'), PIER_END, Math.PI).id, 'buri');
});

test('🚨회귀: 참치를 바라보면 참치가 걸린다', () => {
  // 2026-09-17 사고 — 조준이 '가장 가까운' 이라 부두 한가운데(x=400)에선
  // 176 샘플 내내 참치가 0회 조준됐다(방어 56% · 전갱이 44%). 그 결과 13일간
  // sea_records 52건 중 참치 0건 → 🌊'오늘의 대어' 가 참치만 세던 시절 보드가 영구히 비었다.
  const yaw = lookAt(PIER_END, FISH.tuna);
  assert.equal(pickSeaTarget(list('aji', 'buri', 'tuna'), PIER_END, yaw).id, 'tuna',
    '참치를 바라봤는데 더 가까운 방어가 걸리면 안 된다');
});

test('세 어종 모두 바라보는 대로 걸린다 — 조준이 실제로 선택권이다', () => {
  for (const id of ['aji', 'buri', 'tuna']) {
    assert.equal(pickSeaTarget(list('aji', 'buri', 'tuna'), PIER_END, lookAt(PIER_END, FISH[id])).id, id,
      `${id} 를 바라봤는데 다른 어종이 걸렸다`);
  }
});

test('등 뒤(뭍 쪽)의 물고기는 후보에서 빠진다', () => {
  const fishes = [{ id: 'behind', x: 400, z: -2 }, ...list('buri')];   // -2 는 플레이어(-9.55)보다 뭍 쪽
  assert.equal(pickSeaTarget(fishes, PIER_END, Math.PI).id, 'buri', '뒤를 향해 던지면 안 된다');
});

test('앞에 아무것도 없으면 가장 가까운 물고기로 폴백한다 — 던지기가 먹통이 되지 않게', () => {
  const fishes = [{ id: 'near', x: 400, z: -2 }, { id: 'far', x: 400, z: 20 }];
  assert.equal(pickSeaTarget(fishes, PIER_END, Math.PI).id, 'near');
});

test('같은 조준선 위에 겹쳐 있으면 가까운 쪽이 걸린다', () => {
  const fishes = [{ id: 'far', x: 400, z: -25 }, { id: 'near', x: 400, z: -15 }];
  assert.equal(pickSeaTarget(fishes, PIER_END, Math.PI).id, 'near');
});

test('물고기가 없으면 null — 호출부가 토스트로 막는다', () => {
  assert.equal(pickSeaTarget([], PIER_END, Math.PI), null);
});

test('거리 보정은 조준을 뒤집지 못할 만큼만 작다', () => {
  assert.ok(AIM_DIST_WEIGHT > 0, '0 이면 같은 조준선에 겹친 물고기 중 가까운 쪽을 못 고른다');
  assert.ok(AIM_DIST_WEIGHT < 0.5, '커지면 거리 조준으로 퇴행한다 — 참치가 다시 안 걸린다');
});

// ─────────────────────────────────────────────────────────────
//  game.js 와의 결속 — 규칙만 고치고 호출부가 옛 코드를 쓰면 무의미하다
// ─────────────────────────────────────────────────────────────

test('game.js 의 seaAction 이 pickSeaTarget 을 쓴다', () => {
  assert.ok(/import\s*\{[^}]*pickSeaTarget[^}]*\}\s*from\s*'\.\/sea-aim\.js'/.test(src),
    'game.js 가 sea-aim.js 를 import 하지 않는다');
  assert.ok(/pickSeaTarget\(/.test(src), 'seaAction 이 pickSeaTarget 을 호출하지 않는다');
});

test('game.js 에 거리 전용 조준 루프가 남아 있지 않다', () => {
  const i = src.indexOf('function seaAction()');
  assert.ok(i > 0, 'seaAction 을 찾지 못했다');
  assert.ok(!/let best = null, bd = Infinity/.test(src.slice(i, i + 2000)),
    '거리만 보는 옛 조준 루프가 그대로 남아 있다');
});

test('참치는 여전히 SEA_SPECIES 의 마지막 — 배치가 아니라 조준으로 푼다', () => {
  const m = src.match(/const SEA_SPECIES = \[([\s\S]*?)\n\];/);
  assert.ok(m, 'SEA_SPECIES 를 찾지 못했다');
  assert.deepEqual([...m[1].matchAll(/id:\s*'(\w+)'/g)].map(x => x[1]), ['aji', 'buri', 'mola', 'tuna']);
});
