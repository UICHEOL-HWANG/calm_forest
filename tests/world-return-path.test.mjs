import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { returnStart, crossesWater, segDist } from '../js/world/return-path.js';

// 마을의 물 — js/game.js announceUnlock 이 넘기는 값과 같다(LAKE · DOCK_POND · 박물관 섬 개울)
const WATERS = [{ x: 16, z: 9, r: 6 }, { x: 0, z: -21.5, r: 7 }, { x: -26.3, z: 4.8, r: 7.6 }];
const EDGE = 14;

test('선분까지 거리', () => {
  assert.equal(segDist(0, 5, -10, 0, 10, 0), 5);
  assert.equal(segDist(20, 0, -10, 0, 10, 0), 10);
});

test('🦆 사공 오리(2.5,-13.5)는 나루터 연못을 가로질러 오지 않는다', () => {
  assert.ok(crossesWater(2.5 + 2.5 / Math.hypot(2.5, 13.5) * EDGE, -13.5 - 13.5 / Math.hypot(2.5, 13.5) * EDGE, 2.5, -13.5, WATERS),
    '바깥 방향 그대로면 연못을 지난다(재현)');
  const s = returnStart(2.5, -13.5, EDGE, WATERS);
  assert.ok(!crossesWater(s.x, s.z, 2.5, -13.5, WATERS));
});

test('섬 밖에 사는 모든 이웃이 물을 안 건너고 돌아온다', () => {
  const src = readFileSync(new URL('../js/data/npcs.js', import.meta.url), 'utf8');
  const homes = [...src.matchAll(/id: '([a-z]+)', name:[^\n]*?pos: \[(-?[\d.]+), 0, (-?[\d.]+)\]/g)]
    .map(m => ({ id: m[1], x: +m[2], z: +m[3] }))
    .filter(h => h.id !== 'curator');   // 🧑‍🦳 섬 안에 산다 — 박물관 문에서 나온다(game.js announceUnlock)
  assert.ok(homes.length >= 9, `집 좌표를 못 읽었다(${homes.length})`);
  for (const h of homes) {
    const s = returnStart(h.x, h.z, EDGE, WATERS);
    assert.ok(!crossesWater(s.x, s.z, h.x, h.z, WATERS), `${h.id} 가 물을 건넌다`);
    assert.ok(Math.abs(Math.hypot(s.x - h.x, s.z - h.z) - EDGE) < 1e-9, `${h.id} 출발 거리`);
  }
});

test('물이 없으면 예전처럼 바깥 방향', () => {
  const s = returnStart(10, 0, EDGE, []);
  assert.ok(Math.abs(s.x - 24) < 1e-9 && Math.abs(s.z) < 1e-9);
});
