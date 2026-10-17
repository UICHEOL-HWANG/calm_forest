import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  BRIDGE_ANG, BRIDGE_COST, ISLE, STREAM_HALF, bridgeBroken, bridgeFoot, bridgeLack, bridgePoint, onStream, streamR, streamStop,
} from '../js/world/bridge.js';
import { defaultUnlocks, restoreUnlocks, unlockedSet } from '../js/world/unlocks.js';

const fresh = (flags = {}) => ({ houseStage: 3, unlocks: { ...defaultUnlocks(), flags } });

test('bridgeBroken: 해금 켜짐 + 새 세이브 + 안 고침일 때만 무너져 있다', () => {
  assert.equal(bridgeBroken(fresh(), true), true);
  assert.equal(bridgeBroken(fresh({ bridge: true }), true), false);            // 고침
  assert.equal(bridgeBroken(fresh(), false), false);                           // 해금 꺼짐(기본) — 기존처럼 열린 다리
  assert.equal(bridgeBroken({ unlocks: restoreUnlocks(undefined) }, true), false);   // 옛 세이브 = legacy
  assert.equal(bridgeBroken({}, true), false);                                 // unlocks 필드 없음
  assert.equal(bridgeBroken(null, true), false);
});

test('다리 플래그 → 🏛️ 박물관·🧑‍🦳 큐레이터가 열린다 · 수리 자리는 집 완성부터', () => {
  const s = fresh();
  assert.equal(unlockedSet(s).has('bridgeRepair'), true);
  assert.equal(unlockedSet(s).has('museum'), false);
  assert.equal(unlockedSet({ ...s, houseStage: 2 }).has('bridgeRepair'), false);
  const fixed = fresh({ bridge: true });
  assert.equal(unlockedSet(fixed).has('museum'), true);
  assert.equal(unlockedSet(fixed).has('curator'), true);
});

test('bridgeLack: 🪵10 🪨5 — 부족한 것만 [키, 필요, 가진 것]', () => {
  assert.deepEqual(BRIDGE_COST, { wood: 10, stone: 5 });
  assert.deepEqual(bridgeLack({ wood: 3, stone: 9 }), [['wood', 10, 3]]);
  assert.deepEqual(bridgeLack({}), [['wood', 10, 0], ['stone', 5, 0]]);
  assert.deepEqual(bridgeLack({ wood: 10, stone: 5 }), []);
});

test('섬 배치: 박물관 기단·계단·큐레이터 자리는 개울 안쪽, 상점·채집 숲·광산 입구는 바깥', () => {
  const inner = (x, z) => Math.hypot(x - ISLE.x, z - ISLE.z) < streamR(Math.atan2(z - ISLE.z, x - ISLE.x)) - STREAM_HALF;
  for (const [x, z] of [[-29.6, 1.7], [-22.4, 1.7], [-29.6, 8.3], [-22.4, 8.3], [-26, 9.4], [-23.9, 9.9], [-26, 8.4]]) assert.ok(inner(x, z), `안쪽이어야: ${x},${z}`);
  const clear = (x, z, r) => {   // 중심 (x,z) 반지름 r 원이 개울+물가와 안 겹친다
    for (let i = 0; i < 32; i++) { const a = i / 32 * Math.PI * 2; if (onStream(x + Math.cos(a) * r, z + Math.sin(a) * r)) return false; }
    return !onStream(x, z);
  };
  assert.ok(clear(-17.5, -4, 2.6), '🏪 꾸미기 가게');
  assert.ok(clear(-18, 23, 9.8), '🍄 채집 숲');
  assert.ok(clear(-14, 3, 2), '⛏️ 광산 입구');
  const f = bridgeFoot();
  assert.ok(Math.hypot(f.x, f.z) < 40, '다리 머리는 마을 경계(42) 안');
  assert.ok(f.x > -21 && f.x < -17, `다리 머리 x≈-19 (${f.x.toFixed(2)})`);
  // 섬 전체가 마을 경계 안 — 바깥으로 돌아갈 길이 없다
  for (let i = 0; i < 64; i++) { const a = i / 64 * Math.PI * 2, r = streamR(a) + STREAM_HALF; assert.ok(Math.hypot(ISLE.x + Math.cos(a) * r, ISLE.z + Math.sin(a) * r) < 42); }
});

test('streamStop: 무너졌으면 어느 쪽으로도 섬에 못 들어간다', () => {
  for (let i = 0; i < 48; i++) {
    const a = i / 48 * Math.PI * 2;
    for (const r of [0.5, 3, streamR(a) - 0.2, streamR(a), streamR(a) + 0.5]) {
      const p = streamStop(ISLE.x + Math.cos(a) * r, ISLE.z + Math.sin(a) * r, true);
      const d = Math.hypot(p.x - ISLE.x, p.z - ISLE.z);
      assert.ok(d >= streamR(Math.atan2(p.z - ISLE.z, p.x - ISLE.x)) + STREAM_HALF, `a=${a.toFixed(2)} r=${r.toFixed(2)} → 안쪽 ${d.toFixed(2)}`);
    }
  }
  // 무너진 다리 위(가운데)도 밀려난다
  const mid = bridgePoint(streamR(BRIDGE_ANG));
  const p = streamStop(mid.x, mid.z, true);
  assert.ok(Math.hypot(p.x - mid.x, p.z - mid.z) > 0.5);
});

test('streamStop: 고친 다리 위는 지나가고, 다리 밖 개울은 여전히 물이다', () => {
  const R = streamR(BRIDGE_ANG);
  for (const r of [R - STREAM_HALF, R, R + STREAM_HALF]) {
    const q = bridgePoint(r), p = streamStop(q.x, q.z, false);
    assert.ok(Math.hypot(p.x - q.x, p.z - q.z) < 1e-9, `다리 위 r=${r.toFixed(2)} 는 그대로`);
  }
  // 다리 옆으로 걸어 나가면 난간에 막힌다(다리 폭 안으로 붙잡힘)
  const side = 0.9, q = { x: bridgePoint(R).x - Math.sin(BRIDGE_ANG) * side, z: bridgePoint(R).z + Math.cos(BRIDGE_ANG) * side };
  const p = streamStop(q.x, q.z, false);
  const off = Math.abs(-(p.x - ISLE.x) * Math.sin(BRIDGE_ANG) + (p.z - ISLE.z) * Math.cos(BRIDGE_ANG));
  assert.ok(off <= 0.55 + 1e-9);
  // 반대편 개울 한가운데 → 물가로
  const a = BRIDGE_ANG + Math.PI, w = streamR(a);
  const s = streamStop(ISLE.x + Math.cos(a) * w, ISLE.z + Math.sin(a) * w, false);
  assert.ok(Math.abs(Math.hypot(s.x - ISLE.x, s.z - ISLE.z) - w) > STREAM_HALF);
  // 섬 안·마을 쪽 땅은 그대로
  const inside = streamStop(ISLE.x + 2, ISLE.z, false);
  assert.deepEqual(inside, { x: ISLE.x + 2, z: ISLE.z });
});

test('배선: 수리 흐름·프롬프트·지도·클램프가 연결돼 있다', () => {
  const game = readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');
  const doors = readFileSync(new URL('../js/spaces/doors.js', import.meta.url), 'utf8');
  const sp = readFileSync(new URL('../js/spaces/bridge.js', import.meta.url), 'utf8');
  assert.match(game, /if \(nearDoor === 'bridge'\) return bridgeInteract\(\);/);
  assert.match(game, /clampToStream\(player\.position\)/);
  assert.match(game, /buildBridge\(\);/);
  assert.match(game, /syncBridge\(\);\s+\/\/ 🌉 복원된 unlocks/);   // applySave 뒤 다시 맞춤(빌더는 로드 전)
  assert.match(doors, /nd = 'bridge'; prompt = bridgePrompt\(\);/);
  assert.match(sp, /gameState\.unlocks\.flags\.bridge = true;/);
  assert.match(sp, /trackEvent\('bridge_repaired'/);
  assert.match(sp, /syncUnlocks\(false\)/);
  assert.match(sp, /isOpen\('bridgeRepair'\)/);
});
