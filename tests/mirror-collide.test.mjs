import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  SOLIDS, SOLID_CIRCLES, HOUSES, LANDMARKS, SPOTS, NPC_SPOTS, MIRROR_LANDING, MIRROR_STOP_LOCAL, MIRROR_PARK,
  RING_TREES, WALK_R, PICK_R, STOP_SHELTER_BOX, carriageBox, VILLAGE_BOARD, VILLAGE_PARK,
} from '../js/mirror/layout.js';
// character.js·places.js 는 three 를 import 해 Node 에서 못 연다 — 값은 소스에서 읽는다
const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const PLAYER_R = +src('js/data/character.js').match(/export const PLAYER_R = ([\d.]+)/)[1];
const [, msx, msz] = src('js/data/places.js').match(/export const MIRROR_STOP = new THREE\.Vector3\(([\d.]+), 0, ([\d.]+)\)/);
const MIRROR_STOP = { x: +msx, z: +msz };
// 🪞 거울 마을 통과 검수(2026-10-09) — 보이는 조형물은 걸어서 뚫고 지나가면 안 된다.
//   실측: tools/mirror/collide.mjs (조형물 중심에 세워 밀려나는지)
const LM = Object.fromEntries(LANDMARKS.map(l => [l.id, l]));
const inBox = (b, x, z, pad = 0) => x > b.x1 - pad && x < b.x2 + pad && z > b.z1 - pad && z < b.z2 + pad;
const blocked = (x, z) => SOLIDS.some(b => inBox(b, x, z, PLAYER_R)) || SOLID_CIRCLES.some(c => Math.hypot(x - c.x, z - c.z) < c.r + PLAYER_R);
const covered = (x, z) => SOLIDS.some(b => inBox(b, x, z)) || SOLID_CIRCLES.some(c => Math.hypot(x - c.x, z - c.z) < c.r);

test('비스듬히 놓인 집 — 벽 모서리 4곳이 충돌 상자 안', () => {
  for (const h of HOUSES) {
    const c = Math.cos(h.ry), s = Math.sin(h.ry);
    for (const [lx, lz] of [[1.5, 1.3], [-1.5, 1.3], [1.5, -1.3], [-1.5, -1.3]]) {
      const x = h.x + lx * c + lz * s, z = h.z - lx * s + lz * c;
      assert.ok(SOLIDS.some(b => inBox(b, x, z, 1e-6)), `집(${h.x},${h.z}) 모서리 (${x.toFixed(2)},${z.toFixed(2)})`);
    }
  }
});

test('등불 기둥·거울 정류장·덮개 나무·가장자리 나무는 막힌다', () => {
  assert.ok(covered(LM.lamp.x, LM.lamp.z), '등불 기둥');
  for (const dx of [-1.1, 1.1]) assert.ok(covered(LM.stop.x + dx, LM.stop.z + 0.4), `정류장 기둥 ${dx}`);
  assert.ok(covered(LM.stop.x, LM.stop.z + 0.55), '정류장 벤치');
  for (const s of SPOTS.filter(x => x.cover === 'tree')) assert.ok(covered(s.x, s.z - 0.3), `덮개 나무 ${s.id}`);
  for (const t of RING_TREES) if (t.r - 0.35 < WALK_R + PLAYER_R) assert.ok(covered(t.x, t.z), `가장자리 나무 ${t.x.toFixed(1)},${t.z.toFixed(1)}`);
});

test('서는 자리는 막히지 않는다 — 하차·정류장 프롬프트·주민 말 걸기(남쪽 1.4)', () => {
  for (const p of [MIRROR_LANDING, MIRROR_STOP_LOCAL, ...NPC_SPOTS.map(n => ({ x: n.x, z: n.z + 1.4 }))]) assert.ok(!blocked(p.x, p.z), JSON.stringify(p));
});

test('숨긴 물건은 모두 주울 수 있다 — PICK_R 안에 막히지 않은 자리가 있다', () => {
  for (const s of SPOTS) {
    const ix = s.x, iz = s.z + 0.35;
    let ok = false;
    for (let r = 0; r <= PICK_R - 0.05 && !ok; r += 0.1) for (let a = 0; a < 16 && !ok; a++) {
      const x = ix + Math.cos(a / 16 * Math.PI * 2) * r, z = iz + Math.sin(a / 16 * Math.PI * 2) * r;
      if (Math.hypot(x, z) <= WALK_R && !blocked(x, z)) ok = true;
    }
    assert.ok(ok, s.id);
  }
});

test('정박 마차 — 달 몸체는 막고 정류장 서는 자리는 비운다(거울·마을 양쪽)', () => {
  const m = carriageBox(MIRROR_PARK), v = carriageBox(VILLAGE_PARK);
  assert.ok(inBox(m, MIRROR_PARK.x, MIRROR_PARK.z) && inBox(v, VILLAGE_PARK.x, VILLAGE_PARK.z));
  assert.ok(!inBox(m, MIRROR_STOP_LOCAL.x, MIRROR_STOP_LOCAL.z, PLAYER_R));
  assert.ok(!inBox(v, VILLAGE_BOARD.x, VILLAGE_BOARD.z, PLAYER_R), '마을 탑승 자리');
  const sv = { x1: MIRROR_STOP.x + STOP_SHELTER_BOX.x1, z1: MIRROR_STOP.z + STOP_SHELTER_BOX.z1, x2: MIRROR_STOP.x + STOP_SHELTER_BOX.x2, z2: MIRROR_STOP.z + STOP_SHELTER_BOX.z2 };
  assert.ok(!inBox(sv, VILLAGE_BOARD.x, VILLAGE_BOARD.z, PLAYER_R), '마을 정류장 상자 vs 탑승 자리');
  assert.ok(inBox(sv, MIRROR_STOP.x, MIRROR_STOP.z + 0.55), '마을 정류장 벤치');
});

test('mirror.js — 쌍둥이 주민·정박 마차·마을 정류장이 충돌체를 쓴다', () => {
  const src = readFileSync(new URL('../js/spaces/mirror.js', import.meta.url), 'utf8');
  assert.match(src, /for \(const c of SOLID_CIRCLES\) solidCircle\(MIRROR\.x \+ c\.x, MIRROR\.z \+ c\.z, c\.r\);/);
  assert.match(src, /solidCircle\(MIRROR\.x \+ s\.x, MIRROR\.z \+ s\.z, NPC_R\)/, '쌍둥이 주민');
  assert.match(src, /carriageSolid\.off = /, '마차 충돌체는 안 보이거나 연출 중이면 끈다');
  assert.match(src, /STOP_SHELTER_BOX/, '마을 정류장도 같은 상자');
  assert.match(src, /if \(carriageSolid\.off && inside\) return;/, '서 있는 자리에 상자가 켜지면 튕긴다 — 비킬 때까지 꺼 둔다');
});
