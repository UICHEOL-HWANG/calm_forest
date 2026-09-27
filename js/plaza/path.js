// js/plaza/path.js
// =============================================================
//  🌾 광장으로 이끄는 입구 아치·돌길·깃발 줄·깃대 — 말 없이 동선을 만든다(스펙 §4 발견성 ①②).
//  build.js 처럼 색을 정점에 실어(paintGeo) 묶음마다 메시 1개 — 재질 수가 곧 드로우콜이다.
//    ground: 돌(그림자 안 드리움, 1콜) / props: 아치·기둥·깃대·깃발(양면, 그림자 → 2콜)
//    lamp: 단풍 아치(c)의 등불만(밤에 houseWindows 로 점등, +1콜) → 합계 ≤ 4콜
//  ⚠️ shared() 자원 금지 — dispose() 가 전부 해제한다.
// =============================================================
import * as THREE from 'three';
import { houseWindows, mergeGeos, paintGeo, vtxMat } from '../game.js';
import { PLAZA_PATH, PLAZA_POLE, PLAZA_ARCH, PLAZA_ARCH_HALF as HALF, PLAZA_BUNTING_MIN_X } from '../data/plaza.js';

const PAL = {
  stone: 0xe4dcc8, post: 0x7a5230, banner: 0xe0873a,
  wood: 0xa8683c, woodDark: 0x5e3b22, straw: 0xe8bf4a, strawDark: 0xc99a34, leaf: 0xc8452e, leafOrange: 0xe0873a,
  lamp: 0xffd98a, flag0: 0xe26d5a, flag1: 0xf2c14e, flag2: 0x6bb5a6,
};
const FLAGS = ['flag0', 'flag1', 'flag2'];
const POLE_H = 9;                                      // 🎨 게이트 B(2026-09-27): 높이로는 시작 화면에 안 들어와 9 로 고정
const POST_H = 2.2, POST_OFF_Z = 0.9;                  // 깃발 줄 기둥 — 돌길 남쪽(카메라 쪽) 옆

const box = (w, h, d, x, y, z) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
const ball = (r, x, y, z, sy = 1) => new THREE.IcosahedronGeometry(r, 0).scale(1, sy, 1).translate(x, y, z);
const arc = (r, t, y) => new THREE.TorusGeometry(r, t, 5, 10, Math.PI).translate(0, y, 0);   // 반원 띠(가로 x, 위로 볼록)

function tri(points, uv) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}
// 아래로 뾰족한 삼각기(+Z 를 본다) — 판 한 장이라 재질이 양면
const pennant = (w = 0.28, h = 0.32) => tri([-w / 2, 0, 0, w / 2, 0, 0, 0, -h, 0], [0, 1, 1, 1, 0.5, 0]);

// ---------- 🌾 입구 아치(로컬: 아치 중심 기준, 기둥 x ±HALF, 정면 +Z, 돌길이 z 축으로 지나간다) ----------
function wheat(add, x, y, z) {                        // 🌾 이삭 3줄기(글자 대신)
  for (const [dx, tilt] of [[-0.12, 0.3], [0, 0], [0.12, -0.3]]) {
    add('strawDark', new THREE.CylinderGeometry(0.018, 0.018, 0.34, 4).rotateZ(tilt).translate(x + dx, y, z));
    add('straw', ball(0.06, x + dx - Math.sin(tilt) * 0.2, y + 0.2, z, 1.8));
  }
}

function hayArch(add) {                               // a. 볏단 기둥 + 짚 아치 + 🌾 현판
  for (const s of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const w = 0.62 - i * 0.06;
      add(i % 2 ? 'strawDark' : 'straw', box(w, 0.5, w, s * HALF, 0.25 + i * 0.5, 0));
      add('woodDark', box(w + 0.02, 0.05, w + 0.02, s * HALF, 0.25 + i * 0.5, 0));   // 묶은 끈
    }
  }
  add('straw', arc(HALF, 0.16, 1.5));
  add('wood', arc(HALF, 0.07, 1.5).translate(0, 0, 0.13));
  add('wood', box(0.9, 0.42, 0.07, 0, 2.62, 0.12));
  add('woodDark', box(0.98, 0.06, 0.1, 0, 2.86, 0.12));
  wheat(add, 0, 2.55, 0.17);
}

function festivalGate(add) {                          // b. 나무 기둥 + 가로대 + 늘어진 삼각기 줄
  for (const s of [-1, 1]) {
    add('woodDark', box(0.16, 2.7, 0.16, s * HALF, 1.35, 0));
    add('woodDark', box(0.26, 0.1, 0.26, s * HALF, 0.05, 0));
    add('woodDark', box(0.03, 0.42, 0.03, s * HALF, 2.9, 0));
    add(s > 0 ? 'flag2' : 'flag0', tri([0, 0, 0, -s * 0.42, -0.12, 0, 0, -0.24, 0], [0, 1, 1, 0.5, 0, 0]).translate(s * HALF, 3.1, 0));   // 기둥 끝 깃발(안쪽으로 — 모바일 화면 폭)
  }
  add('wood', box(HALF * 2 + 0.36, 0.16, 0.18, 0, 2.55, 0));
  add('wood', box(HALF * 2, 0.1, 0.12, 0, 2.2, 0));
  for (let k = 0; k < 7; k++) {
    const t = (k + 0.5) / 7, sag = Math.sin(t * Math.PI) * 0.28;
    add(FLAGS[k % 3], pennant(0.24, 0.3).translate(-HALF + t * HALF * 2, 2.12 - sag, 0.08));
  }
}

function mapleArch(add) {                             // c. 단풍 감은 기둥 + 가로대 단풍 + 양옆 등불
  for (const s of [-1, 1]) {
    add('wood', box(0.16, 2.5, 0.16, s * HALF, 1.25, 0));
    for (let i = 0; i < 4; i++) {                     // 나선으로 오르는 단풍 덩이
      const a = i * 1.9 + (s > 0 ? 0.8 : 0), r = 0.3 - i * 0.03;
      add(i % 2 ? 'leafOrange' : 'leaf', ball(r, s * HALF + Math.cos(a) * 0.14, 0.45 + i * 0.55, Math.sin(a) * 0.14 + 0.05));
    }
    add('woodDark', box(0.28, 0.06, 0.06, s * (HALF + 0.16), 2.05, 0.05));   // 바깥 팔
    add('woodDark', box(0.02, 0.22, 0.02, s * (HALF + 0.27), 1.93, 0.05));
    add('woodDark', box(0.2, 0.05, 0.2, s * (HALF + 0.27), 1.8, 0.05));       // 등불 지붕
    add('lamp', ball(0.12, s * (HALF + 0.27), 1.66, 0.05, 1.2));
  }
  add('wood', box(HALF * 2 + 0.3, 0.14, 0.18, 0, 2.45, 0));
  for (const [x, y, r, k] of [[-0.72, 2.62, 0.34, 'leaf'], [-0.26, 2.72, 0.33, 'leafOrange'], [0.22, 2.7, 0.36, 'leaf'], [0.68, 2.6, 0.32, 'leafOrange'], [0, 2.95, 0.3, 'leaf']]) {
    add(k, ball(r, x, y, 0.04));
  }
}
const ARCHES = { a: hayArch, b: festivalGate, c: mapleArch };

// ---------- 깃발 줄·깃대 ----------
// 랭킹 게시판·시세판 동쪽(x > PLAZA_BUNTING_MIN_X)에만 — 광장 원 안 마지막 점은 빼고, 이웃 점마다 기둥
function bunting(add, path) {
  const posts = path.slice(0, -1).filter(([x]) => x > PLAZA_BUNTING_MIN_X);
  for (const [x, z] of posts) add('post', box(0.1, POST_H, 0.1, x, POST_H / 2, z + POST_OFF_Z));
  for (let i = 0; i + 1 < posts.length; i++) {
    const [x1, z1] = posts[i], [x2, z2] = posts[i + 1];
    const rot = -Math.atan2(z2 - z1, x2 - x1);
    for (let k = 1; k < 5; k++) {
      const t = k / 5, sag = Math.sin(t * Math.PI) * 0.3;
      add(FLAGS[(i + k) % 3], pennant().rotateY(rot).translate(x1 + (x2 - x1) * t, POST_H - 0.1 - sag, z1 + (z2 - z1) * t + POST_OFF_Z));
    }
  }
}

function pole(add) {
  add('post', new THREE.CylinderGeometry(0.1, 0.14, POLE_H, 8).translate(PLAZA_POLE.x, POLE_H / 2, PLAZA_POLE.z));
  add('banner', tri([0, 0, 0, 1.6, -0.45, 0, 0, -0.9, 0], [0, 1, 1, 0.5, 0, 0]).translate(PLAZA_POLE.x + 0.1, POLE_H - 0.1, PLAZA_POLE.z));
}

const BUCKET_OF = (k) => (k === 'stone' ? 'ground' : k === 'lamp' ? 'lamp' : 'props');

// 돌길·아치는 stage ≥ 1 이면 항상(완공 뒤에도), 깃대·깃발 줄은 시즌 중(active)·완공 전에만
export function buildPath(stage, phase, arch = 'a') {
  const group = new THREE.Group();
  group.name = 'plazaPath';
  const mats = [];
  const dispose = () => {
    for (const m of group.children) m.geometry.dispose();
    for (const mat of mats) { const i = houseWindows.indexOf(mat); if (i >= 0) houseWindows.splice(i, 1); mat.dispose(); }
  };
  if (stage < 1) return { group, dispose };

  const buckets = new Map();
  const add = (k, geo) => {
    const b = BUCKET_OF(k), g = paintGeo(geo, PAL[k]);
    const a = buckets.get(b); a ? a.push(g) : buckets.set(b, [g]);
  };
  PLAZA_PATH.forEach(([x, z], i) => {                  // 결정적 회전(부팅마다 같은 모양)
    add('stone', new THREE.CylinderGeometry(0.62, 0.66, 0.05, 7).rotateY(i * 1.7).translate(x, 0.025, z));
  });
  (ARCHES[arch] || hayArch)((k, geo) => add(k, geo.translate(PLAZA_ARCH.x, 0, PLAZA_ARCH.z)));
  if (phase === 'active' && stage < 4) { bunting(add, PLAZA_PATH); pole(add); }

  for (const [b, geos] of buckets) {
    const mat = b === 'lamp'
      ? new THREE.MeshStandardMaterial({ color: PAL.lamp, emissive: PAL.lamp, emissiveIntensity: 0, roughness: 0.6 })
      : vtxMat();
    if (b === 'props') mat.side = THREE.DoubleSide;    // 삼각기는 판 한 장이라 양면
    const merged = mergeGeos(geos);
    for (const g of geos) g.dispose();
    const m = new THREE.Mesh(merged, mat);
    m.castShadow = b === 'props'; m.receiveShadow = b !== 'lamp';
    group.add(m); mats.push(mat);
    if (b === 'lamp') houseWindows.push(mat);          // 밤에 창문·가로등과 함께 점등
  }
  return { group, dispose };
}
