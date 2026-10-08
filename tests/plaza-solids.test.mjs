import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { plazaPropSolids, plazaPathSolids, SCARECROW, LAMP_POSTS, HAYBALES, PUMPKIN_PILE } from '../js/plaza/solids.js';
import { PLAZA, PLAZA_BUNTING_POSTS } from '../js/data/plaza.js';

// 🚧 수확제 기물을 캐릭터가 통과하던 버그(2026-10-09) — 보이는 기물마다 충돌체가 있어야 한다
const has = (list, x, z) => list.some(([sx, sz, r]) => Math.hypot(sx - x, sz - z) < r);
const w = (x, z) => [PLAZA.x + x, PLAZA.z + z];

test('3단계(시즌 중): 허수아비·가로등·볏단·호박 더미가 막힌다', () => {
  const s = plazaPropSolids(3, 'active');
  assert.ok(has(s, ...w(SCARECROW.x, SCARECROW.z)), '허수아비');
  for (const [x, z] of LAMP_POSTS) assert.ok(has(s, ...w(x, z)), `가로등 ${x}`);
  for (const [x, z] of HAYBALES) assert.ok(has(s, ...w(x, z)), `볏단 ${x}`);
  for (const [x, z] of [[3.5, 1.5], [4.1, 1.35], [3.0, 1.9]]) assert.ok(has(s, ...w(x, z)), `호박 ${x}`);   // build.js stage3 호박 자리
});

test('2단계엔 허수아비·볏단이 아직 없다(빈 자리에 벽이 생기지 않게)', () => {
  const s = plazaPropSolids(2, 'active');
  assert.ok(!has(s, ...w(SCARECROW.x, SCARECROW.z)));
  assert.ok(!has(s, ...w(HAYBALES[0][0], HAYBALES[0][1])));
  assert.ok(has(s, ...w(LAMP_POSTS[0][0], LAMP_POSTS[0][1])), '가로등은 2단계부터');
});

test('시즌 중 깃발 줄 기둥이 전부 막히고, 시즌 뒤엔 풀린다', () => {
  const on = plazaPathSolids(2, 'active'), off = plazaPathSolids(4, 'after');
  for (const [x, z] of PLAZA_BUNTING_POSTS) { assert.ok(has(on, x, z)); assert.ok(!has(off, x, z)); }
});

test('광장 가운데 길은 막지 않는다(기부함으로 걸어 들어갈 수 있게)', () => {
  for (const st of [1, 2, 3]) assert.ok(!has(plazaPropSolids(st, 'active'), PLAZA.x, PLAZA.z + 2), `stage ${st}`);
  assert.ok(PUMPKIN_PILE.r < 1);
});

test('놓는 수확제 장식 4종도 충돌체 목록에 있다', () => {
  const game = readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');
  const line = game.split('\n').find(l => l.includes("} else solid = ['fence'"));
  for (const id of ['haybale', 'pumpkins', 'pumpkinlamp', 'harvestscarecrow']) assert.ok(line.includes(`'${id}'`), id);
});
