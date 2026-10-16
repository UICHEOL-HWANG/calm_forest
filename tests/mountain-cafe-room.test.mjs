import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from '../vendor/three/three.module.js';
import { ROOM, ENTRY, EXIT_SPOT, ORDER_SPOT, SPOT_R, BARISTA, TABLES, SEATS, CAFE_COLLIDERS, clampCafe, nearestSeat } from '../js/mountain/cafe-layout.js';
import { buildCafeRoom } from '../js/mountain/cafe-art.js';
import { EN } from '../js/i18n-en.js';

const R = 0.35;
const free = p => CAFE_COLLIDERS.every(c => Math.hypot(p.x - c.x, p.z - c.z) >= c.r + R - 1e-6);
const read = p => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('entry, exit and order spots are free and inside the room', () => {
  for (const p of [ENTRY, EXIT_SPOT, ORDER_SPOT]) {
    assert.ok(free(p), JSON.stringify(p));
    assert.ok(Math.abs(p.x) < ROOM.w / 2 - 0.4 && Math.abs(p.z) < ROOM.d / 2, JSON.stringify(p));
  }
  assert.ok(Math.hypot(EXIT_SPOT.x - ORDER_SPOT.x, EXIT_SPOT.z - ORDER_SPOT.z) > 2 * SPOT_R);
  assert.ok(Math.hypot(ORDER_SPOT.x - BARISTA.x, ORDER_SPOT.z - BARISTA.z) < 2.5);
});

test('clampCafe keeps the player inside the walls and out of furniture', () => {
  const out = clampCafe({ x: 20, z: -20 });
  assert.ok(Math.abs(out.x) <= ROOM.w / 2 && Math.abs(out.z) <= ROOM.d / 2);
  const t = TABLES[0];
  assert.ok(free(clampCafe({ x: t.x + 0.05, z: t.z })));
  const p = { x: ENTRY.x, z: ENTRY.z };
  assert.equal(clampCafe(p), p);
});

test('six seats, two per table, and nearestSeat skips taken ones', () => {
  assert.equal(TABLES.length, 3);
  assert.equal(SEATS.length, 6);
  const a = nearestSeat(ENTRY);
  const b = nearestSeat(ENTRY, [a]);
  assert.notDeepEqual(a, b);
});

test('the room is two drawables', () => {
  let n = 0; buildCafeRoom(THREE).traverse(o => { if (o.isMesh) n++; });
  assert.equal(n, 2);
});

test('prompts and actions are wired and translated', () => {
  const doors = read('js/spaces/doors.js');
  assert.match(doors, /if \(inCafe\(\)\) \{/);
  assert.match(doors, /nd = 'cafeexit'; prompt = '🚪 나가기';/);
  assert.match(doors, /nd = 'cafeorder'; prompt = '☕ 주문하기';/);
  const m = read('js/spaces/mountain.js');
  for (const nd of ['hutcafe', 'cafeexit', 'cafeorder']) assert.match(m, new RegExp(`nearDoor === '${nd}'`));
  for (const ko of ['☕ 주문하기', '솜눈']) assert.ok(EN[ko], ko);
});

test('inside the cafe the mountain is hidden and the warm look replaces the mountain theme', () => {
  const room = read('js/mountain/cafe-room.js');
  assert.match(room, /mg\.visible = false/);
  assert.match(room, /applyLook\(/);
  assert.match(read('js/spaces/mountain.js'), /if \(cafe\?\.active\(\)\) return cafe\.lookFrame\(env\);/);
});

test('the barista name tag fades in by player distance like village NPC tags', () => {
  const room = read('js/mountain/cafe-room.js');
  assert.match(room, /createCafe\(\{[^}]*fadeNameTag[^}]*\}\)/);
  assert.match(room, /const d = Math\.hypot\(l\.x - BARISTA\.x, l\.z - BARISTA\.z\);/);
  assert.match(room, /fadeNameTag\(tag, d\);/);
  const m = read('js/spaces/mountain.js');
  assert.match(m, /import \{[^}]*\bfadeNameTag\b[^}]*\} from '\.\/npc\.js';/);
  assert.match(m, /createCafe\(\{[^}]*fadeNameTag[^}]*\}\)/);
});

test('disposeTree frees every mesh geometry and material under a group', async () => {
  const { disposeTree } = await import('../js/mountain/dispose.js');
  const g = new THREE.Group();
  const meshes = [0, 1, 2].map(() => new THREE.Mesh(new THREE.SphereGeometry(0.1, 4, 4), new THREE.MeshBasicMaterial()));
  g.add(meshes[0]);
  meshes[0].add(meshes[1]);
  g.add(meshes[2]);
  const hits = [];
  meshes.forEach(m => { m.geometry.addEventListener('dispose', () => hits.push('g')); m.material.addEventListener('dispose', () => hits.push('m')); });
  disposeTree(g);
  assert.equal(hits.filter(h => h === 'g').length, 3);
  assert.equal(hits.filter(h => h === 'm').length, 3);
});

test('cafe clearSeated releases the mug and steam through disposeTree', () => {
  const room = read('js/mountain/cafe-room.js');
  assert.match(room, /const release = o => \{ group\.remove\(o\); disposeTree\(o\); \};/);
  assert.match(room, /\[seated\.mug, \.\.\.seated\.steam\]\.forEach\(release\)/);
});
