import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PLAZA, PLAZA_R, PLAZA_STALL_POS, PLAZA_BUNTING_POSTS } from '../js/data/plaza.js';

// 🍎 과수원 입구 잔디 판(울타리 날개가 이 안에 든다)이 🌾수확제 광장·좌판·깃발 줄에 겹치면 안 된다.
//   (32,2) 에서 울타리 끝이 좌판 자리(25.4,−1)에 박혀 있었다(2026-10-09).
const places = readFileSync(new URL('../js/data/places.js', import.meta.url), 'utf8');
const art = readFileSync(new URL('../js/orchard-art.js', import.meta.url), 'utf8');
const g = /ORCHARD_GATE = new THREE\.Vector3\((-?[\d.]+), 0, (-?[\d.]+)\)/.exec(places);
const p = /GATE_PATCH = \{ cx: (-?[\d.]+), cz: (-?[\d.]+), rx: ([\d.]+), rz: ([\d.]+) \}/.exec(art);

// 국소 → 월드(rotation.y=π/2): x = GATE.x + lz, z = GATE.z − lx — js/spaces/mist.js 와 같은 변환
function patchGap(ox, oz, r) {
  const [gx, gz] = [+g[1], +g[2]], [cx, cz, rx, rz] = p.slice(1).map(Number);
  const ex = gx + cz, ez = gz - cx;
  let m = Infinity;
  for (let i = 0; i < 720; i++) {
    const a = i / 720 * Math.PI * 2;
    m = Math.min(m, Math.hypot(ex + Math.cos(a) * rz - ox, ez + Math.sin(a) * rx - oz) - r);
  }
  const inside = ((ox - ex) / rz) ** 2 + ((oz - ez) / rx) ** 2 < 1;
  return inside ? -1 : m;
}

test('과수원 입구 잔디 판은 수확제 광장·좌판·깃발 줄과 2m 이상 떨어져 있다', () => {
  assert.ok(g && p, 'ORCHARD_GATE·GATE_PATCH 를 못 찾았다');
  const spots = [['plaza', PLAZA.x, PLAZA.z, PLAZA_R], ['stall', PLAZA_STALL_POS.x, PLAZA_STALL_POS.z, 0.9],
    ...PLAZA_BUNTING_POSTS.map(([x, z], i) => [`bunting${i}`, x, z, 0.2])];
  for (const [name, x, z, r] of spots) {
    const gap = patchGap(x, z, r);
    assert.ok(gap >= 2, `${name} 과의 여유 ${gap.toFixed(2)}m`);
  }
});
