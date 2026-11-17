import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { POND_SPOTS, POND_STAGE_R, POND_BIG_SPOT } from '../js/data/pond.js';
import { pondSignPos, pondSignSide, signNear, signPulseDue, signParts, signRingEase, signRingLook, SIGN_RING, SIGN_OUT, SIGN_REACH, SIGN_SOLID_R, SIGN_SIDES, SIGN_PLANK_W, SIGN_TOP } from '../js/pond/sign.js';

const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const places = src('js/data/places.js');
const npcSrc = src('js/data/npcs.js');
const vec = (name) => {
  const m = places.match(new RegExp(`const ${name} = new THREE\\.Vector3\\((-?[\\d.]+), 0, (-?[\\d.]+)\\)`));
  assert.ok(m, `${name} not found`);
  return { x: Number(m[1]), z: Number(m[2]) };
};
const HOUSE = vec('HOUSE_POS');
const HOUSE_HALF = 3.95;
const abs = (s) => ({ x: HOUSE.x + s.dx, z: HOUSE.z + s.dz });
const d = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const CASES = [
  ...POND_SPOTS.map((s, i) => ({ name: `small${i}`, c: abs(s), r: POND_STAGE_R[0] })),
  { name: 'big2', c: abs(POND_BIG_SPOT), r: POND_STAGE_R[1] },
  { name: 'big3', c: abs(POND_BIG_SPOT), r: POND_STAGE_R[2] },
];
const facilities = [...places.matchAll(/export const ([A-Z_]+) = new THREE\.Vector3\((-?[\d.]+), 0, (-?[\d.]+)\)/g)]
  .map(m => ({ name: m[1], x: Number(m[2]), z: Number(m[3]) }))
  .filter(g => g.name !== 'HOUSE_POS' && Math.abs(g.x) < 45 && Math.abs(g.z) < 45);
const npcs = npcSrc.split('\n').flatMap(line => {
  const p = line.match(/pos: \[(-?[\d.]+), 0, (-?[\d.]+)\]/);
  return p ? [{ x: Number(p[1]), z: Number(p[2]) }] : [];
});

test('팻말은 돌 고리 밖, 연못 남쪽 화면 띠 밖에 선다', () => {
  for (const { name, c, r } of CASES) {
    const p = pondSignPos(c, r, HOUSE);
    assert.ok(d(p, c) >= r + 1.3 - 1e-9, `${name} 거리 ${d(p, c).toFixed(2)}`);
    assert.ok(d(p, c) - SIGN_SOLID_R - (r + 0.1) >= 0.9, `${name} 돌 고리 틈`);
    const dx = p.x - c.x, dz = p.z - c.z;
    assert.ok(!(dz > 0 && Math.abs(dx) < r + 0.6), `${name} 남쪽 띠 ${dx.toFixed(2)},${dz.toFixed(2)}`);
    assert.ok(Math.abs(dx) - SIGN_PLANK_W / 2 >= r + 0.5, `${name} 판 가장자리`);
  }
  assert.equal(SIGN_OUT, 2.2);
  assert.ok(SIGN_TOP <= 0.95);
  assert.ok(SIGN_PLANK_W <= 0.9);
});

test('7단계 집·시설·주민·꾸미기 가게를 비켜 선다', () => {
  assert.ok(facilities.some(f => f.name === 'SHOP_POS'));
  assert.ok(facilities.length > 5 && npcs.length >= 5);
  for (const { name, c, r } of CASES) {
    const p = pondSignPos(c, r, HOUSE);
    assert.ok(!(Math.abs(p.x - HOUSE.x) < HOUSE_HALF + 0.9 && Math.abs(p.z - HOUSE.z) < HOUSE_HALF + 0.9), `${name} 집`);
    assert.ok(!(Math.abs(p.x - HOUSE.x) < HOUSE_HALF + 0.9 && p.z < HOUSE.z && HOUSE.z - p.z < HOUSE_HALF + 5), `${name} 집 뒤`);
    for (const f of facilities) assert.ok(d(p, f) >= 1.0, `${name} ${f.name}`);
    for (const n of npcs) assert.ok(d(p, n) >= 1.0, `${name} NPC ${JSON.stringify(n)}`);
  }
});

test('자리마다 고르는 쪽: 앞마당은 동남동, 집 서쪽 자리는 서남서', () => {
  assert.deepEqual(SIGN_SIDES.map(s => s.id), ['ese', 'ene', 'wsw', 'wnw']);
  const side = (c, r) => pondSignSide(c, r, HOUSE);
  assert.equal(side(abs(POND_SPOTS[0]), 2), 'wsw');
  assert.equal(side(abs(POND_SPOTS[1]), 2), 'ese');
  assert.equal(side(abs(POND_SPOTS[2]), 2), 'ese');
  assert.equal(side(abs(POND_BIG_SPOT), 2.9), 'wsw');
  assert.equal(side(abs(POND_BIG_SPOT), 3.9), 'wsw');
  assert.equal(pondSignSide({ x: 30, z: 30 }, 2, HOUSE), 'ese');
  assert.equal(pondSignSide({ x: 0, z: 0 }, 2, null), 'ese');
});

test('연못이 옮기거나 커지면 팻말이 따라간다', () => {
  const a = pondSignPos({ x: 30, z: 30 }, 2, HOUSE), b = pondSignPos({ x: 33, z: 28 }, 2, HOUSE);
  assert.ok(Math.abs((b.x - a.x) - 3) < 1e-9 && Math.abs((b.z - a.z) + 2) < 1e-9);
  const small = pondSignPos({ x: 30, z: 30 }, 2, HOUSE), big = pondSignPos({ x: 30, z: 30 }, 3.9, HOUSE);
  assert.ok(Math.abs(d(small, { x: 30, z: 30 }) - 4.2) < 1e-9);
  assert.ok(Math.abs(d(big, { x: 30, z: 30 }) - 6.1) < 1e-9);
  assert.ok(big.x - small.x > 1.8);
});

test('바닥 고리는 판정 반지름 그대로, 물가 돌·모래 밖에 놓인다', () => {
  const ROCK_OUT = 0.1 + 0.36, SAND_OUT = 0.55;
  assert.ok(SIGN_REACH >= 1.4);
  for (const { name, c, r } of CASES) {
    const edge = d(pondSignPos(c, r, HOUSE), c) - SIGN_REACH;
    assert.ok(edge >= r + Math.max(ROCK_OUT, SAND_OUT), `${name} 고리 안쪽 끝 ${edge.toFixed(2)}`);
  }
  const b = src('js/pond/sign-build.js');
  assert.match(b, /new THREE\.RingGeometry\(SIGN_REACH - RING_W, SIGN_REACH, \d+\)/);
  assert.match(b, /depthWrite: false/);
  assert.doesNotMatch(b, /ring\.castShadow/);
  assert.match(src('js/pond/index.js'), /sign\.update\(dt, pondSignNear\(\), pulse\);/);
  assert.match(src('js/pond/index.js'), /signNear\(sign\.group\.position, player\.position\)/);
  assert.match(src('js/neighbors/scene.js'), /reach: false/);
  for (const look of [SIGN_RING.idle, SIGN_RING.active]) {
    for (const ch of [look.color >> 16, (look.color >> 8) & 255, look.color & 255]) assert.ok(ch / 255 < 0.85);
  }
  assert.equal(SIGN_RING.idle.opacity, 0.18);
  assert.equal(SIGN_RING.active.opacity, 0.6);
  assert.equal(signRingLook(0, 0).opacity, 0.18);
  assert.ok(Math.abs(signRingLook(1, 0).opacity - 0.6) < 1e-9);
  assert.equal(signRingLook(1, 3).scale, 1);
  assert.ok(signRingLook(0, Math.PI / 8).opacity > 0.5);
  assert.equal(signRingEase(0, true, 0.1), 0.5);
  assert.equal(signRingEase(0.5, true, 1), 1);
  assert.equal(signRingEase(0.5, false, 0.05), 0.25);
  assert.equal(signRingEase(0.1, false, 1), 0);
});

test('팻말 앞 판정과 한 번뿐인 금빛 고리', () => {
  const sign = { x: 5, z: 5 };
  assert.equal(SIGN_REACH, 1.6);
  assert.equal(signNear(sign, { x: 5, z: 6.5 }), true);
  assert.equal(signNear(sign, { x: 5, z: 6.7 }), false);
  assert.equal(signNear(null, { x: 5, z: 5 }), false);
  const ok = { seen: false, inView: true, busy: false, coach: false, modal: false };
  assert.equal(signPulseDue(ok), true);
  for (const k of ['seen', 'busy', 'coach', 'modal']) assert.equal(signPulseDue({ ...ok, [k]: true }), false, k);
  assert.equal(signPulseDue({ ...ok, inView: false }), false);
});

test('조형은 기둥·판·돌 고리 그림, 글자 없이 판 안에 든다', () => {
  const parts = signParts();
  assert.equal(parts.filter(p => p.kind === 'post').length, 1);
  assert.equal(parts.filter(p => p.kind === 'plank').length, 1);
  const stones = parts.filter(p => p.kind === 'stone');
  assert.ok(stones.length >= 6);
  assert.equal(new Set(stones.map(s => s.color)).size, 2);
  const plank = parts.find(p => p.kind === 'plank');
  assert.equal(plank.w, SIGN_PLANK_W);
  for (const s of [...stones, ...parts.filter(p => p.kind === 'water')]) {
    assert.ok(Math.abs(s.x) + s.w / 2 <= plank.w / 2 && Math.abs(s.y - plank.y) + s.h / 2 <= plank.h / 2, JSON.stringify(s));
  }
  for (const p of parts) assert.ok(p.y + p.h / 2 <= SIGN_TOP + 1e-9);
});

test('연결: 지어지고 치워지는 곳, 문 프롬프트, 수첩 줄 삭제, 이웃 화면', () => {
  const i = src('js/pond/index.js');
  assert.match(i, /import \{ pondSignPos, signNear, signPulseDue[^}]*\} from '\.\/sign\.js';/);
  assert.match(i, /import \{ buildPondSign \} from '\.\/sign-build\.js';/);
  assert.match(i, /const at = pondSignPos\(\{ x, z \}, r, HOUSE_POS\);/);
  assert.match(i, /removeSolid\(signSolid\);/);
  assert.match(i, /sign\.group\.visible = inVillage;/);
  assert.match(i, /gameState\.hintsSeen\.pondSignSeen = true;/);
  assert.match(i, /export function pondSignNear\(\)/);
  const doors = src('js/spaces/doors.js');
  assert.match(doors, /if \(!prompt && pondSignNear\(\)\) \{ \$w\.nearDoor = 'pondsign'; prompt = POND_COPY\.rimBtn; \}/);
  assert.ok(doors.indexOf("$w.nearDoor = 'pondsign'") < doors.indexOf("$w.nearDoor = 'pond';"));
  assert.match(src('js/game.js'), /if \(nearDoor === 'pondsign'\) return openPondRim\(\);/);
  const html = src('index.html');
  assert.equal((html.match(/🗑️\|🐟\|🪨\)/g) || []).length, 2);
  const feed = src('js/pond/feed.js');
  assert.doesNotMatch(feed, /rimRow|footRows|openPondRim/);
  assert.match(feed, /foot: growRow\(\),/);
  assert.doesNotMatch(src('js/hud/collection-book.js'), /#cb-foot \.cb-rows/);
  assert.match(src('js/pond/rim-ui.js'), /markPondSignSeen\(\);/);
  const nb = src('js/neighbors/scene.js');
  assert.match(nb, /pondSignPos\(/);
  assert.match(nb, /buildPondSign\(/);
  const b = src('js/pond/sign-build.js');
  assert.doesNotMatch(b, /CanvasTexture|fillText/);
  for (const f of [i, b, src('js/pond/sign.js')]) assert.doesNotMatch(f, /^\s*\/\//m);
});
