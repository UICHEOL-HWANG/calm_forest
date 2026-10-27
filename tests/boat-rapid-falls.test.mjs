import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = p => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('점프칸 C: 물살 둔덕·흰 물마루·물거품·깃발 줄', () => {
  const src = read('js/boat/rapid-falls.js');
  assert.match(src, /export function makeRapidFall\(/);
  assert.match(src, /export function tickRapidFalls\(/);
  assert.match(src, /CylinderGeometry\([^)]*Math\.PI\)/);
  assert.match(src, /TubeGeometry\(/);
  assert.ok((src.match(/new THREE\.InstancedMesh\(/g) || []).length >= 3);
  for (const c of ['0xf2c14e', '0xe0603f', '0x3fb3c2']) assert.ok(src.includes(c), c);
  assert.ok((src.match(/new THREE\.MeshStandardMaterial/g) || []).length <= 5);
});

test('강에는 흰 판 대신 점프칸 C 를 놓고, 급류에서만 물거품이 움직인다', () => {
  const r = read('js/spaces/river.js');
  const i = r.indexOf('g.userData.falls =');
  const block = r.slice(i, r.indexOf('});', i));
  assert.match(block, /makeRapidFall\(/);
  assert.ok(!block.includes('PlaneGeometry'));
  assert.match(r, /if \(boat\.course === 'rapid'\) tickRapidFalls\(riverGroup\?\.userData\.falls, t\)/);
});

test('달리는 나룻배는 고물 장식·등받이를 빼고, 정박한 배는 그대로', () => {
  const r = read('js/spaces/river.js');
  assert.match(r, /export function makeBoatHull\(s = 1, withOar = false, plain = false\)/);
  const i = r.indexOf('export function makeBoatHull(');
  const body = r.slice(i, r.indexOf('\n}\n', i));
  assert.match(body, /if \(!plain\) \{/);
  const m = read('js/boat/models.js');
  assert.match(m, /makeBoatHull\(1\.05, false, true\)/);
  assert.match(r, /makeBoatHull\(0\.9, true\)/);
  assert.match(r, /makeBoatHull\(1, true\)/);
});
