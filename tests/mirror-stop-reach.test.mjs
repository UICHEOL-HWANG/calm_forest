import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  VILLAGE_BOARD, VILLAGE_STOP, VILLAGE_WALL, nearVillageStop, boardPath, segHitsBox, STOP_REACH,
} from '../js/mirror/layout.js';
import { rideSchedule } from '../js/mirror/ride-schedule.js';

// 실측(2026-10-09 페르소나 p32 10판 중 4판 "마차 옆에서 아무 반응이 없다") — 걸어서 멈춘 자리들
const HUG = {
  southOfShelter: { x: 16, z: 18.22 },      // 마을 쪽(남)에서 걸어오면 지붕 뒤 벽에 막힌다 — 승차 지점까지 2.62
  southWestCorner: { x: 14.18, z: 18.22 },
  eastOfCarriage: { x: 21.22, z: 16.26 },   // 정박 마차 동쪽에 막힌다
  northOfCarriage: { x: 19.2, z: 15.43 },
  westOfShelter: { x: 14.18, z: 17 },
};

test('VILLAGE_STOP 은 places.js MIRROR_STOP 과 같다(THREE 없는 사본)', () => {
  const src = readFileSync(new URL('../js/data/places.js', import.meta.url), 'utf8');
  const m = src.match(/MIRROR_STOP = new THREE\.Vector3\(([-\d.]+),\s*0,\s*([-\d.]+)\)/);
  assert.ok(m);
  assert.deepEqual({ x: +m[1], z: +m[2] }, { ...VILLAGE_STOP });
});

test('옛 판정(승차 지점 반경)으로는 정류장 뒤·마차 옆에서 안내가 안 떴다 — 회귀 기록', () => {
  const d = (p) => Math.hypot(p.x - VILLAGE_BOARD.x, p.z - VILLAGE_BOARD.z);
  assert.ok(d(HUG.southOfShelter) >= STOP_REACH);
  assert.ok(d(HUG.eastOfCarriage) >= STOP_REACH);
});

test('정류장 둘레·정박 마차 옆 어디에 붙어 서도 탑승 안내가 뜬다', () => {
  for (const [k, p] of Object.entries(HUG)) assert.ok(nearVillageStop(p.x, p.z), k);
  assert.ok(nearVillageStop(VILLAGE_BOARD.x, VILLAGE_BOARD.z), '승차 지점');
});

test('조금만 떨어지면 안 뜬다(다른 입구·호수 낚시와 안 겹치게)', () => {
  for (const p of [{ x: 16, z: 21 }, { x: 24.5, z: 16.6 }, { x: 16, z: 12 }, { x: 11.5, z: 17 }]) assert.ok(!nearVillageStop(p.x, p.z), JSON.stringify(p));
});

test('segHitsBox — 상자를 지나는 선분만 참', () => {
  const box = { x1: 0, z1: 0, x2: 2, z2: 2 };
  assert.ok(segHitsBox({ x: -1, z: 1 }, { x: 3, z: 1 }, box));
  assert.ok(!segHitsBox({ x: -1, z: -1 }, { x: 3, z: -1 }, box));
  assert.ok(!segHitsBox({ x: -1, z: 3 }, { x: -0.5, z: 5 }, box));
});

test('boardPath — 정류장·마차 벽을 뚫지 않고 승차 지점에 닿는다', () => {
  for (const [k, p] of Object.entries(HUG)) {
    const path = boardPath(p, VILLAGE_BOARD, VILLAGE_WALL);
    assert.deepEqual(path[0], p, k);
    assert.deepEqual(path.at(-1), { ...VILLAGE_BOARD }, k);
    for (let i = 1; i < path.length; i++) for (const box of VILLAGE_WALL) assert.ok(!segHitsBox(path[i - 1], path[i], box), `${k} 구간 ${i}`);
  }
});

test('boardPath — 호숫가(이미 열린 쪽)에서는 곧장 간다', () => {
  assert.equal(boardPath({ x: 15, z: 15.3 }, VILLAGE_BOARD, VILLAGE_WALL).length, 2);
  assert.equal(boardPath({ x: 1, z: 2 }, VILLAGE_BOARD, null).length, 2, '상자가 없으면(거울 쪽) 곧장');
});

test('rideSchedule — 걷는 길이 길면 걷기 단계만 늘어난다(종종걸음 속도 유지)', () => {
  const base = rideSchedule(false), long = rideSchedule(false, 9);
  assert.equal(rideSchedule(false, 0).total, base.total);
  assert.ok(long.walk[1] - long.walk[0] >= 9 / 4.5 - 1e-9);
  assert.ok(Math.abs((long.total - long.walk[1]) - (base.total - base.walk[1])) < 1e-9, '걷기 뒤 단계 길이는 그대로');
});

test('boardPath — 안내가 뜨는 빈 바닥 어디서 타도(격자 0.25) 정류장·마차 상자를 뚫지 않는다', () => {
  const R = 0.42, n = { all: 0 };   // 플레이어 반경 — 상자에 이만큼은 못 붙는다
  const free = (x, z) => VILLAGE_WALL.every(b => !(x > b.x1 - R && x < b.x2 + R && z > b.z1 - R && z < b.z2 + R)) && Math.hypot(x - 16, z - 9) > 6.2;
  for (let x = 12; x <= 23; x += 0.25) for (let z = 13; z <= 21; z += 0.25) {
    if (!free(x, z) || !nearVillageStop(x, z)) continue;
    n.all++;
    const path = boardPath({ x, z }, VILLAGE_BOARD, VILLAGE_WALL);
    for (let i = 1; i < path.length; i++) for (const box of VILLAGE_WALL) assert.ok(!segHitsBox(path[i - 1], path[i], box), `(${x},${z}) 구간 ${i}`);
  }
  assert.ok(n.all > 100, `검사한 자리 ${n.all}`);
});
