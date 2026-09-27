// js/plaza/decor.js
// =============================================================
//  🌾 수확제 광장 장식 4종 — 좌판(볏단·호박 더미)·완공 보상(호박 등불 🥈·수확제 허수아비 🥇).
//  game.js outdoorMesh() 첫 줄이 여기로 묻고, null 이면 기존 분기로 간다.
//  build.js 처럼 색을 정점에 실어(paintGeo) 묶음마다 메시 1개 — 모델당 ≤ 3콜:
//    body: 몸통(그림자) / fine: 끈·꼭지·얼굴 같은 작은 부속(그림자 끔 — 섀도맵 텍셀보다 작으면 지글거린다)
//    lamp: 밤에 켜지는 발광부(houseWindows — 고스트는 indoor.js buildDecorGhost 가 목록을 도로 잘라 낸다)
//  🎨 디자인 게이트 D(2026-09-27 사용자 확정): 볏단 b(둥근 두루마리)·호박 더미 b(나무 상자)·
//     호박 등불 c(몸통째 빛나는 종이 초롱)·수확제 허수아비 b(밀짚모자·어깨띠·과일 바구니).
//     버린 안: 네모 건초·세운 볏가리·바닥 호박 셋·얼굴 새긴 호박 등·호박 머리 허수아비(단풍 화관은 혹처럼 읽혔다).
//  크기 기준: 기존 scarecrow 높이 ≈ 2.2·팔 폭 ≈ 1.3, postlamp 높이 ≈ 1.7
// =============================================================
import * as THREE from 'three';
import { houseWindows, mergeGeos, paintGeo, vtxMat } from '../game.js';

// build.js PAL 과 같은 계열(straw·pumpkin·wood·woodDark·leaf 는 같은 값) — 광장과 한 벌로 읽히게
const PAL = {
  straw: 0xe8bf4a, twine: 0xa8683c, pumpkin: 0xe8742a, pumpkinDeep: 0xd9642a,
  pumpkinGreen: 0x8fa552, stem: 0x6b7a35, leafGreen: 0x7fa04a,
  wood: 0xa8683c, woodDark: 0x5e3b22, leaf: 0xc8452e, check: 0xf2c14e, sack: 0xd8c29a,
  face: 0x4a2e1a, apple: 0xd8503a,
};
// 호박 초롱 발광부 — 낮엔 호박 주황, 밤엔 houseWindows 가 emissive 를 올려 통째로 빛난다
const LAMP = { color: 0xe0702a, emissive: 0xffb45a };

const box = (w, h, d, x, y, z) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
const cyl = (rt, rb, h, x, y, z, seg = 10) => new THREE.CylinderGeometry(rt, rb, h, seg).translate(x, y, z);
const ball = (r, x, y, z, sy = 1) => new THREE.IcosahedronGeometry(r, 1).scale(1, sy, 1).translate(x, y, z);

// 🎃 골 진 호박 — 구의 가로 반지름을 8골로 오목하게(세로는 눌러 납작하게). 골이 있어야 토마토·버섯 갓과 갈린다
//   정면(+Z)에 마루가 오도록 골 위상을 맞춘다. 중심이 원점, 높이 ±r·sy
function pumpkinGeo(r, sy = 0.78, depth = 0.1, ribs = 8) {
  const g = new THREE.SphereGeometry(r, ribs * 2, 10);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const th = Math.atan2(z, x) - Math.PI / 2;
    const s = 1 - depth * (0.5 - 0.5 * Math.cos(ribs * th));
    p.setXYZ(i, x * s, y * sy, z * s);
  }
  g.computeVertexNormals();
  return g;
}
// 땅(또는 받침 y)에 앉힌 호박 + 꼭지
const pumpkin = (add, r, x, y, z, color = 'pumpkin', sy = 0.78, ry = 0) => {
  add('body', color, pumpkinGeo(r, sy).rotateY(ry).translate(x, y + r * sy, z));
  add('fine', 'stem', cyl(r * 0.1, r * 0.14, r * 0.35, x, y + r * sy * 2 + r * 0.1, z, 6));
};

// 납작한 판(잎) — ShapeGeometry 는 +Z 를 본다
function flat(points) {
  const s = new THREE.Shape();
  points.forEach(([px, py], i) => (i ? s.lineTo(px, py) : s.moveTo(px, py)));
  return new THREE.ShapeGeometry(s);
}
// ---------- 🌾 볏단 — 둥근 볏짚 두루마리. 단면이 카메라(+Z)를 본다. 나이테는 두 겹만(촘촘한 반복 금지) ----------
function haybale(add) {
  add('body', 'straw', cyl(0.42, 0.42, 0.62, 0, 0, 0, 14).rotateX(Math.PI / 2).translate(0, 0.42, 0));
  for (const zs of [1, -1]) {
    for (const [r1, r2] of [[0.26, 0.3], [0.1, 0.14]]) {
      add('fine', 'twine', new THREE.RingGeometry(r1, r2, 14).rotateY(zs > 0 ? 0 : Math.PI).translate(0, 0.42, zs * 0.326));   // 단면에서 0.016 내민다
    }
  }
  add('fine', 'twine', cyl(0.435, 0.435, 0.05, 0, 0, 0, 14).rotateX(Math.PI / 2).translate(0, 0.42, 0));
}

// ---------- 🎃 호박 더미 — 나무 상자에 담아 두고 앞에 하나 내려놓았다 ----------
function pumpkins(add) {
  add('body', 'wood', box(0.86, 0.36, 0.56, 0, 0.18, 0));
  add('body', 'woodDark', box(0.9, 0.06, 0.6, 0, 0.36, 0));             // 테두리
  add('fine', 'woodDark', box(0.88, 0.04, 0.02, 0, 0.18, 0.285));       // 앞 널 이음(0.005 내밀기)
  pumpkin(add, 0.24, -0.2, 0.3, 0);
  pumpkin(add, 0.22, 0.22, 0.3, 0.02, 'pumpkinDeep', 0.8, 0.5);
  pumpkin(add, 0.16, 0.02, 0.36, -0.14, 'pumpkinGreen', 0.8, 0.2);
  pumpkin(add, 0.22, 0.36, 0, 0.5, 'pumpkin', 0.78, 0.9);
}

// ---------- 🏮 호박 등불(🥈) — 호박 모양 종이 초롱을 짧은 말뚝 위에. 몸통 전체가 lamp 묶음 ----------
function pumpkinlamp(add) {
  add('body', 'woodDark', box(0.09, 0.9, 0.09, 0, 0.45, 0));
  add('body', 'woodDark', box(0.34, 0.06, 0.34, 0, 0.92, 0));           // 받침판
  const r = 0.3, top = 0.95 + r * 1.6;
  add('lamp', null, pumpkinGeo(r, 0.8, 0.14).translate(0, 0.95 + r * 0.8, 0));
  add('fine', 'stem', cyl(0.03, 0.045, 0.12, 0, top + 0.05, 0, 6));
  add('fine', 'leafGreen', flat([[0, 0], [0.14, 0.05], [0.18, 0.14], [0.06, 0.12]]).rotateX(-0.5).translate(0.03, top + 0.02, 0));
}

// ---------- 🧑‍🌾 수확제 허수아비(🥇) — 🧙 마법사 허수아비(파란 고깔·맨 널빤지)와 갈리게:
//   빨강 셔츠를 입히고 밀짚모자·노랑 어깨띠·과일 바구니로 "잔치 복장" 을 형태로 준다
function harvestscarecrow(add) {
  add('body', 'wood', box(0.12, 0.9, 0.1, 0, 0.45, 0));                     // 기둥(셔츠 아래)
  add('body', 'leaf', box(0.44, 0.52, 0.26, 0, 1.12, 0));                   // 셔츠 몸통
  add('body', 'woodDark', box(0.46, 0.08, 0.28, 0, 0.88, 0));               // 허리 끈
  for (const s of [-1, 1]) {
    add('body', 'leaf', box(0.46, 0.17, 0.2, s * 0.44, 1.28, 0));          // 소매(팔 벌림)
    add('body', 'straw', new THREE.ConeGeometry(0.08, 0.2, 6).rotateZ(s * Math.PI / 2).translate(s * 0.76, 1.28, 0));   // 소매 끝 짚(바깥으로 벌어짐)
  }
  for (const x of [-0.12, 0.12]) add('fine', 'straw', new THREE.ConeGeometry(0.07, 0.18, 6).rotateX(Math.PI).translate(x, 0.79, 0.03));   // 밑단 짚
  // 삼베 머리 + 꿰맨 눈·입
  add('body', 'sack', ball(0.21, 0, 1.58, 0, 1.08));
  for (const s of [-1, 1]) add('fine', 'face', box(0.05, 0.05, 0.02, s * 0.08, 1.61, 0.205));
  add('fine', 'face', box(0.1, 0.02, 0.02, 0, 1.51, 0.2));
  // 밀짚모자 — 챙 + 턱 있는 모자 몸(챙만 넓으면 버섯 갓처럼 읽힌다) + 노랑 띠
  add('body', 'straw', cyl(0.4, 0.42, 0.05, 0, 1.78, 0, 14));
  add('body', 'straw', cyl(0.2, 0.24, 0.2, 0, 1.9, 0, 12));
  add('fine', 'check', cyl(0.245, 0.245, 0.06, 0, 1.83, 0, 12));
  add('body', 'check', new THREE.BoxGeometry(0.1, 0.62, 0.03).rotateZ(0.62).translate(0, 1.12, 0.14));   // 어깨띠(셔츠 앞 0.01 밖)
  const bx = 0.56, by = 1.0;                                                // 과일 바구니 — 오른 소매 아래에 걸었다
  add('body', 'wood', cyl(0.19, 0.14, 0.2, bx, by, 0.02, 10));
  add('fine', 'woodDark', new THREE.TorusGeometry(0.16, 0.02, 4, 10, Math.PI).translate(bx, by + 0.1, 0.02));
  add('fine', 'apple', ball(0.08, bx - 0.07, by + 0.13, 0.05));
  add('fine', 'apple', ball(0.07, bx + 0.07, by + 0.12, -0.03));
  add('fine', 'pumpkin', ball(0.07, bx + 0.02, by + 0.15, 0.09, 0.8));
}

const MODELS = { haybale, pumpkins, pumpkinlamp, harvestscarecrow };

function assemble(build) {
  const buckets = new Map();
  const add = (b, key, geo) => {
    const g = b === 'lamp' ? geo : paintGeo(geo, PAL[key]);                 // 발광부는 한 색 재질이라 정점색 없음
    const a = buckets.get(b); a ? a.push(g) : buckets.set(b, [g]);
  };
  build(add);
  const group = new THREE.Group();
  for (const [b, geos] of buckets) {
    let mat;
    if (b === 'lamp') {
      mat = new THREE.MeshStandardMaterial({ color: LAMP.color, emissive: LAMP.emissive, emissiveIntensity: 0, roughness: 0.9, flatShading: true });
      houseWindows.push(mat);                                               // 밤에 창문·가로등과 함께 점등
    } else {
      mat = vtxMat();
      if (b === 'fine') mat.side = THREE.DoubleSide;                        // 고리·잎 판은 한 장
    }
    const merged = mergeGeos(geos);
    for (const g of geos) g.dispose();
    const m = new THREE.Mesh(merged, mat);
    m.castShadow = b === 'body'; m.receiveShadow = b !== 'lamp';
    group.add(m);
  }
  return group;
}

// id 가 광장 장식이 아니면 null — outdoorMesh 가 기존 분기로 넘어간다
export function plazaDecorMesh(id) {
  const build = MODELS[id];
  return build ? assemble(build) : null;
}
