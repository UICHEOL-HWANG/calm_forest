import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gameSource } from './helpers/game-source.mjs';
import { walkMarks, TRAIL_DEMO, WALK_STEP, WALK_FADE, WALK_SPEED, WALK_LEN, WALK_Z0 } from '../js/cosmetics/trail-walk.js';

// ✨ 상점 이펙트 탭 — B안 '앞으로 걸어온다'(2026-09-28, sims/trail-preview-sim.html 에서 3안 비교 후 채택)
//   캐릭터 발밑에 두 개 깔려 뭐가 뭔지 모르던 것을: 캐릭터 없이 보이지 않는 발이 화면 쪽으로 걸어오며 자국을 남긴다.
const SRC = gameSource();
const CAFE = readFileSync(new URL('../js/spaces/cafe.js', import.meta.url), 'utf8');

test('t=0 에는 첫 자국 하나만 막 찍혔다', () => {
  const m = walkMarks(0);
  assert.equal(m.length, 1);
  assert.equal(m[0].z, WALK_Z0);
  assert.equal(m[0].age, 0);
});

test('자국은 안쪽에서 화면 쪽(+z)으로 한 걸음씩 나아간다', () => {
  const m = walkMarks(3 * WALK_STEP / WALK_SPEED + 0.01).sort((a, b) => a.age - b.age);
  for (let i = 1; i < m.length; i++) assert.ok(m[i - 1].z > m[i].z, '새 자국일수록 앞(+z)');
  for (let i = 1; i < m.length; i++) assert.ok(Math.abs(m[i - 1].z - m[i].z - WALK_STEP) < 1e-9, '간격 = 한 걸음');
});

test('좌우를 번갈아 딛는다 — 한 줄이면 점선이다', () => {
  const m = walkMarks(1.0).sort((a, b) => a.z - b.z);
  for (let i = 1; i < m.length; i++) assert.notEqual(m[i].side, m[i - 1].side);
});

test('오래된 자국은 사라진다 — 나이는 전부 페이드 시간 안', () => {
  for (const t of [0.5, 2, 5.3, 17.9]) {
    for (const k of walkMarks(t)) assert.ok(k.age >= 0 && k.age < WALK_FADE, `t=${t} age=${k.age}`);
  }
});

test('끝까지 가면 다시 안쪽부터 — 자국은 늘 길 위에 있다', () => {
  for (let t = 0; t < 20; t += 0.37) {
    for (const k of walkMarks(t)) assert.ok(k.z >= WALK_Z0 - 1e-9 && k.z < WALK_Z0 + WALK_LEN, `t=${t} z=${k.z}`);
  }
});

test('한 화면에 2~7개 — 너무 적으면 걷는 게 안 읽히고 많으면 덩어리다', () => {
  for (let t = 2; t < 12; t += 0.23) {
    const n = walkMarks(t).length;
    assert.ok(n >= 2 && n <= 7, `t=${t} n=${n}`);
  }
});

test('이펙트 탭이면 프리뷰가 캐릭터 대신 걷는 자국을 본다', () => {
  assert.match(CAFE, /showTrail\(cosTab === 'trail'\)/);
  assert.match(SRC, /function showTrail\(/);
  assert.match(SRC, /makeTrailWalk\(THREE, /);
});

test('이펙트 탭에선 돌리지 않으니 "드래그해서 돌려보기" 안내도 감춘다', () => {
  assert.match(CAFE, /hint\.style\.visibility = cosTab === 'trail' \? 'hidden' : ''/);
});

test('입어 본 게 없어도 이펙트 탭은 🐾 발바닥이 걷는다 — 캐릭터가 나오면 뭘 파는 탭인지 모른다', () => {
  assert.equal(TRAIL_DEMO, 'paw');
  assert.match(SRC, /makeTrailWalk\(THREE, tid \|\| TRAIL_DEMO,/);
});

test('자국 n 은 살아 있는 동안 안정적이고 걸음 순서대로 늘어난다', () => {
  const a = walkMarks(1.0), b = walkMarks(1.1);
  for (const k of a) { const same = b.find(x => x.n === k.n); if (same) assert.equal(same.z, k.z); }
  const sorted = a.sort((x, y) => x.z - y.z).map(k => k.n);
  for (let i = 1; i < sorted.length; i++) assert.ok(sorted[i] > sorted[i - 1]);
});

test('💎 미리보기 반짝이 색은 자국 id(k.n) 에서 — 첫 자국이 n=1 이라 내부 카운터면 한 색 어긋난다', () => {
  assert.equal(walkMarks(WALK_FADE)[0].n, 1);
  const src = readFileSync(new URL('../js/cosmetics/trail-walk.js', import.meta.url), 'utf8');
  assert.match(src, /fx\.onStamp\([^)]*step:\s*k\.n/);
});
