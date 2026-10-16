import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { POND_R, POND_SPOTS, POND_HOUSE_CLEAR } from '../js/data/pond.js';

const places = readFileSync(new URL('../js/data/places.js', import.meta.url), 'utf8');
const game = readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');
const npcSrc = readFileSync(new URL('../js/data/npcs.js', import.meta.url), 'utf8');
const vec = (src, name) => {
  const m = src.match(new RegExp(`const ${name} = new THREE\\.Vector3\\((-?[\\d.]+), 0, (-?[\\d.]+)\\)`));
  assert.ok(m, `${name} not found`);
  return { x: Number(m[1]), z: Number(m[2]) };
};
const HOUSE = vec(places, 'HOUSE_POS');
const abs = (s) => ({ x: HOUSE.x + s.dx, z: HOUSE.z + s.dz });
const d = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

test('후보는 3개, 모두 7단계 집과 통로를 비켜 선다', () => {
  assert.equal(POND_SPOTS.length, 3);
  for (const s of POND_SPOTS) assert.ok(Math.hypot(s.dx, s.dz) >= POND_HOUSE_CLEAR, JSON.stringify(s));
  assert.ok(POND_HOUSE_CLEAR >= 3.9 + POND_R + 0.6);
});

test('호수·나루터 연못과 겹치지 않는다', () => {
  const lake = vec(game, 'LAKE');
  const dock = vec(places, 'DOCK_POND');
  for (const s of POND_SPOTS) {
    assert.ok(d(abs(s), lake) >= 6 + POND_R + 1);
    assert.ok(d(abs(s), dock) >= 7 + POND_R + 1);
  }
});

test('마을 입구·시설 좌표와 2.5 이상 떨어진다', () => {
  const re = /export const ([A-Z_]+) = new THREE\.Vector3\((-?[\d.]+), 0, (-?[\d.]+)\)/g;
  const gates = [...places.matchAll(re)]
    .map(m => ({ name: m[1], x: Number(m[2]), z: Number(m[3]) }))
    .filter(g => g.name !== 'HOUSE_POS' && Math.abs(g.x) < 45 && Math.abs(g.z) < 45);
  assert.ok(gates.length > 5);
  for (const s of POND_SPOTS) for (const g of gates) assert.ok(d(abs(s), g) >= POND_R + 2.5, `${g.name} ${JSON.stringify(s)}`);
});

test('주민 자리와 R+2 이상 떨어진다', () => {
  const npcs = npcSrc.split('\n').flatMap(line => {
    const p = line.match(/pos: \[(-?[\d.]+), 0, (-?[\d.]+)\]/);
    if (!p) return [];
    const r = line.match(/roam: ([\d.]+)/);
    return [{ x: Number(p[1]), z: Number(p[2]), roam: r ? Number(r[1]) : 0 }];
  });
  assert.ok(npcs.length >= 5, `NPC ${npcs.length}`);
  for (const s of POND_SPOTS) {
    const a = abs(s);
    for (const n of npcs) {
      assert.ok(d(a, n) >= POND_R + 2 + n.roam, `${JSON.stringify(s)} vs NPC ${JSON.stringify(n)} dist ${d(a, n).toFixed(2)}`);
    }
  }
});
