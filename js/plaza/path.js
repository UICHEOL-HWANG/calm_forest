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
  wood: 0xa8683c, woodDark: 0x5e3b22, leaf: 0xc8452e, leafDeep: 0xa8322a, leafOrange: 0xe0873a,
  lamp: 0xffd98a, flag0: 0xe26d5a, flag1: 0xf2c14e, flag2: 0x6bb5a6,
};
const FLAGS = ['flag0', 'flag1', 'flag2'];
const POLE_H = 9;                                      // 🎨 게이트 B(2026-09-27): 높이로는 시작 화면에 안 들어와 9 로 고정

const box = (w, h, d, x, y, z) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
const ball = (r, x, y, z, sy = 1) => new THREE.IcosahedronGeometry(r, 0).scale(1, sy, 1).translate(x, y, z);

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
//   🎨 게이트 B2(2026-09-27): 곧은 기둥 + 가로대 + 각진 단풍 덩이(ball, 면 20개) 틀 확정.
//   B3 에서 반원 띠로 매끈하게 바꿨더니 "빨간 관에 호박"처럼 읽혀 되돌렸다(사용자 반려).
//   B4(2026-09-27, 사용자 선택 3안): 틀은 B2 그대로 다듬고 발밑에 떨어진 단풍잎 — 위에서 내려다보는 카메라라 누운 잎이 가장 잘 읽힌다.
//   ⚠️ 해 보고 버린 것: 잎 덩이를 세로로 늘이면 초롱, 평평한 큰 덩이는 버섯 갓, 검붉은 색은 탁함, 갈래가 깊은 잎은 표창처럼 읽혔다.

function archFrame(add) {                              // 기둥·받침·가로대·양옆 등불(세 안 공통)
  for (const s of [-1, 1]) {
    add('wood', box(0.16, 2.5, 0.16, s * HALF, 1.25, 0));
    add('woodDark', box(0.26, 0.1, 0.26, s * HALF, 0.05, 0));
    add('woodDark', box(0.28, 0.06, 0.06, s * (HALF + 0.16), 2.05, 0.05));   // 바깥 팔
    add('woodDark', box(0.02, 0.22, 0.02, s * (HALF + 0.27), 1.93, 0.05));
    add('woodDark', box(0.2, 0.05, 0.2, s * (HALF + 0.27), 1.8, 0.05));       // 등불 지붕
    add('lamp', ball(0.12, s * (HALF + 0.27), 1.66, 0.05, 1.2));
  }
  add('wood', box(HALF * 2 + 0.3, 0.14, 0.18, 0, 2.45, 0));
}

// 단풍잎 한 장(손바닥 5갈래) — 판 한 장, props 묶음이 양면이라 뒤에서도 보인다
//   극좌표로 잎 끝 5개(위·좌우 위·좌우 아래)와 그 사이 오목점, 맨 아래 짧은 꼭지를 시계 방향으로 잇는다
const MAPLE_OUTLINE = [
  [90, 1], [62, 0.5], [28, 0.95], [0, 0.5], [-38, 0.72], [-70, 0.3], [-90, 0.42],   // 꼭지는 -90°
  [-110, 0.3], [218, 0.72], [180, 0.5], [152, 0.95], [118, 0.5],
];
function mapleLeaf(size) {
  const shape = new THREE.Shape();
  MAPLE_OUTLINE.forEach(([deg, r], i) => {
    const a = (deg * Math.PI) / 180, px = Math.cos(a) * r * size, py = Math.sin(a) * r * size;
    i === 0 ? shape.moveTo(px, py) : shape.lineTo(px, py);
  });
  return new THREE.ShapeGeometry(shape);
}

// 단풍 덩이: B2 틀 그대로 다듬기 — 기둥 잎은 늘이지 않고(늘이면 초롱처럼 읽힘) 앞뒤로 엇갈려 3개,
//      가로대 덩이는 크기·깊이를 섞어 한 줄로 늘어선 느낌을 없앤다(평평한 큰 덩이는 버섯 갓처럼 읽힘)
function archCanopyCalm(add) {
  for (const s of [-1, 1]) {
    for (const [y, dz, r, k] of [[0.55, 0.1, 0.25, s > 0 ? 'leaf' : 'leafOrange'], [1.2, -0.08, 0.23, s > 0 ? 'leafOrange' : 'leaf'], [1.85, 0.1, 0.26, 'leaf']]) {
      add(k, ball(r, s * HALF + s * 0.06, y, dz));
    }
  }
  // 빨강·주황을 번갈아(검붉은 색을 섞으면 덩이가 탁해진다 — B4 캡처에서 확인)
  for (const [x, y, z, r, k] of [[-0.95, 2.55, 0.02, 0.34, 'leaf'], [-0.5, 2.78, -0.08, 0.37, 'leafOrange'], [-0.05, 2.62, 0.14, 0.33, 'leaf'],
                                  [0.4, 2.8, -0.04, 0.37, 'leafOrange'], [0.92, 2.56, 0.06, 0.33, 'leaf'], [0.02, 3.0, -0.02, 0.3, 'leaf']]) {
    add(k, ball(r, x, y, z));
  }
}

// 덩이 + 발밑에 떨어진 단풍잎 — 카메라가 위에서 내려다봐서 서 있는 잎보다 누운 잎이 훨씬 잘 보인다
function archCanopyLeaves(add) {
  archCanopyCalm(add);
  const fallen = [[-1.3, 0.6, 0.3, 'leaf'], [-0.7, 1.2, 1.9, 'leafOrange'], [0.5, 1.0, 4.2, 'leafDeep'], [1.2, 0.5, 2.6, 'leaf'],
                  [1.5, -0.6, 5.1, 'leafOrange'], [-1.5, -0.4, 3.4, 'leafDeep'], [0.2, 1.7, 0.9, 'leaf'], [-0.2, -1.1, 2.2, 'leafOrange']];
  for (const [x, z, rot, k] of fallen) add(k, mapleLeaf(0.34).rotateZ(rot).rotateX(-Math.PI / 2).translate(x, 0.035, z));
}

function mapleArch(add) {
  archFrame(add);
  archCanopyLeaves(add);
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
