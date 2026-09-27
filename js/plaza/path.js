// js/plaza/path.js
// =============================================================
//  🌾 광장으로 이끄는 입구 아치·돌길·깃발 줄·깃대 — 말 없이 동선을 만든다(스펙 §4 발견성 ①②).
//  build.js 처럼 색을 정점에 실어(paintGeo) 묶음마다 메시 1개 — 재질 수가 곧 드로우콜이다.
//    ground: 돌(그림자 안 드리움, 1콜) / props: 아치·기둥·깃대·깃발(양면, 그림자 → 2콜)
//    lamp: 단풍 아치의 등불 2개(밤에 houseWindows 로 점등, +1콜) → 합계 ≤ 4콜
//  ⚠️ shared() 자원 금지 — dispose() 가 전부 해제한다.
// =============================================================
import * as THREE from 'three';
import { houseWindows, mergeGeos, paintGeo, vtxMat } from '../game.js';
import { PLAZA_PATH, PLAZA_POLE, PLAZA_ARCH, PLAZA_ARCH_HALF as HALF, PLAZA_BUNTING_POSTS } from '../data/plaza.js';

const PAL = {
  stone: 0xe4dcc8, post: 0x7a5230, banner: 0xe0873a,
  wood: 0xa8683c, woodDark: 0x5e3b22, leaf: 0xc8452e, leafOrange: 0xe0873a,
  lamp: 0xffd98a, flag0: 0xe26d5a, flag1: 0xf2c14e, flag2: 0x6bb5a6,
};
const FLAGS = ['flag0', 'flag1', 'flag2'];
const POLE_H = 9;                                      // 🎨 게이트 B(2026-09-27): 높이로는 시작 화면에 안 들어와 9 로 고정

const box = (w, h, d, x, y, z) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
const ball = (r, x, y, z, sy = 1) => new THREE.IcosahedronGeometry(r, 0).scale(1, sy, 1).translate(x, y, z);
const round = (r, x, y, z, sy = 1) => new THREE.IcosahedronGeometry(r, 1).scale(1, sy, 1).translate(x, y, z);   // 둥근 잎 덩이(면 80개)

function tri(points, uv) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}
// 아래로 뾰족한 삼각기(+Z 를 본다) — 판 한 장이라 재질이 양면
const pennant = (w = 0.28, h = 0.32) => tri([-w / 2, 0, 0, w / 2, 0, 0, 0, -h, 0], [0, 1, 1, 1, 0.5, 0]);

// ---------- 🍁 입구 단풍 아치(로컬: 아치 중심 기준, 기둥 x ±HALF, 정면 +Z, 돌길이 z 축으로 지나간다) ----------
//   🎨 게이트 B2(2026-09-27): 시안 c 확정. B3: 작은 덩이를 촘촘히 붙이면 울퉁불퉁하고 환공포증처럼 읽혀서
//   기둥 위를 잇는 반원 잎 띠 하나 + 큰 덩이 5개(어깨 2·꼭대기 1·기둥 중간 2)로 줄였다
const LEAF_Y = 2.2;                                   // 반원 띠 중심 높이(기둥 끝)
function mapleArch(add) {
  for (const s of [-1, 1]) {
    add('wood', box(0.16, LEAF_Y + 0.05, 0.16, s * HALF, (LEAF_Y + 0.05) / 2, 0));
    add('woodDark', box(0.26, 0.1, 0.26, s * HALF, 0.05, 0));                       // 받침
    add('leaf', round(0.34, s * HALF, LEAF_Y, 0.02));                               // 어깨 덩이
    add('leafOrange', round(0.24, s * HALF + s * 0.04, 1.15, 0.08, 1.25));          // 기둥 중간 덩이(길쭉하게 감싼 모양)
    add('woodDark', box(0.28, 0.06, 0.06, s * (HALF + 0.16), 2.05 - 0.25, 0.05));    // 바깥 팔 + 매단 등불
    add('woodDark', box(0.02, 0.2, 0.02, s * (HALF + 0.27), 1.69, 0.05));
    add('woodDark', box(0.2, 0.05, 0.2, s * (HALF + 0.27), 1.57, 0.05));
    add('lamp', ball(0.12, s * (HALF + 0.27), 1.43, 0.05, 1.2));
  }
  add('leaf', new THREE.TorusGeometry(HALF, 0.19, 6, 9, Math.PI).translate(0, LEAF_Y, 0.02));   // 잎 띠
  add('leafOrange', round(0.34, 0, LEAF_Y + HALF + 0.05, 0.05));                   // 꼭대기 덩이
}

// ---------- 깃발 줄·깃대 ----------
function bunting(add) {
  const posts = PLAZA_BUNTING_POSTS;
  for (const [x, z, h] of posts) add('post', box(0.1, h, 0.1, x, h / 2, z));
  for (let i = 0; i + 1 < posts.length; i++) {
    const [x1, z1, h1] = posts[i], [x2, z2, h2] = posts[i + 1];
    const rot = -Math.atan2(z2 - z1, x2 - x1);
    for (let k = 1; k < 5; k++) {
      const t = k / 5, sag = Math.sin(t * Math.PI) * 0.3;
      add(FLAGS[(i + k) % 3], pennant().rotateY(rot).translate(x1 + (x2 - x1) * t, h1 + (h2 - h1) * t - 0.1 - sag, z1 + (z2 - z1) * t));
    }
  }
}

function pole(add) {
  add('post', new THREE.CylinderGeometry(0.1, 0.14, POLE_H, 8).translate(PLAZA_POLE.x, POLE_H / 2, PLAZA_POLE.z));
  add('banner', tri([0, 0, 0, 1.6, -0.45, 0, 0, -0.9, 0], [0, 1, 1, 0.5, 0, 0]).translate(PLAZA_POLE.x + 0.1, POLE_H - 0.1, PLAZA_POLE.z));
}

const BUCKET_OF = (k) => (k === 'stone' ? 'ground' : k === 'lamp' ? 'lamp' : 'props');

// 돌길·아치는 stage ≥ 1 이면 항상(완공 뒤에도), 깃대·깃발 줄은 시즌 중(active)·완공 전에만
export function buildPath(stage, phase) {
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
  mapleArch((k, geo) => add(k, geo.translate(PLAZA_ARCH.x, 0, PLAZA_ARCH.z)));
  if (phase === 'active' && stage < 4) { bunting(add); pole(add); }

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
