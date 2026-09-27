// js/plaza/build.js
// =============================================================
//  🌾 광장 3D — 단계별 파츠를 색 키로 칠해(paintGeo) 묶음별 mergeGeos() 한 번(🏛️전시물 방식).
//  예산: 광장 ≤ 12콜. 색을 먼저 정하고(PALETTES) 파츠는 그 키에만 담는다.
//  ⚠️ shared() 자원 금지 — dispose() 가 전부 해제한다.
// =============================================================
import * as THREE from 'three';
import { mergeGeos, houseWindows, paintGeo, vtxMat } from '../game.js';
import { PLAZA, PLAZA_R, PLAZA_BOX, PLAZA_STALL_POS } from '../data/plaza.js';

const PALETTES = {
  a: { dirt: 0xc9a26b, stone: 0xdad4c6, stoneDark: 0xb8b09f, wood: 0xb07d50, woodDark: 0x7a5230, straw: 0xe6c35c, pumpkin: 0xe88a2e, leaf: 0xe0873a, lamp: 0xffe39a },
  b: { dirt: 0xbfa27c, stone: 0xd8d2c4, stoneDark: 0xaaa293, wood: 0xa37c5a, woodDark: 0x6e5440, straw: 0xd9c07a, pumpkin: 0xd98a4a, leaf: 0xc98a52, lamp: 0xfbe3a8 },
  c: { dirt: 0xc49a60, stone: 0xdcd5c3, stoneDark: 0xb3a994, wood: 0xa8683c, woodDark: 0x5e3b22, straw: 0xe8bf4a, pumpkin: 0xe8742a, leaf: 0xc8452e, lamp: 0xffd98a },
};

const box = (w, h, d, x, y, z) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
const cyl = (rt, rb, h, x, y, z, seg = 10) => new THREE.CylinderGeometry(rt, rb, h, seg).translate(x, y, z);
const ball = (r, x, y, z, sy = 1) => new THREE.IcosahedronGeometry(r, 1).scale(1, sy, 1).translate(x, y, z);
const ringFlat = (r1, r2, y) => new THREE.RingGeometry(r1, r2, 32).rotateX(-Math.PI / 2).translate(0, y, 0);

// 로컬 좌표(광장 중심 기준)
const BX = PLAZA_BOX.x - PLAZA.x, BZ = PLAZA_BOX.z - PLAZA.z;
const SX = PLAZA_STALL_POS.x - PLAZA.x, SZ = PLAZA_STALL_POS.z - PLAZA.z;

function stage1(add) {
  add('dirt', cyl(PLAZA_R, PLAZA_R, 0.06, 0, 0.03, 0, 28));
  for (let i = 0; i < 8; i++) {                                   // 구획 말뚝
    const a = (i / 8) * Math.PI * 2;
    add('woodDark', box(0.14, 0.7, 0.14, Math.cos(a) * (PLAZA_R - 0.3), 0.35, Math.sin(a) * (PLAZA_R - 0.3)));
  }
  for (let i = 0; i < 3; i++) add('wood', box(1.8, 0.18, 0.3, -2.2, 0.12 + i * 0.19, 1.6 + (i % 2) * 0.1));   // 목재 더미
  add('stoneDark', ball(0.35, 2.4, 0.25, 0.2)); add('stone', ball(0.28, 2.9, 0.2, 0.5)); add('stoneDark', ball(0.25, 2.6, 0.45, 0.35));   // 돌 무더기(좌판 뒤에 가리지 않게)
}

function stage2(add) {
  add('stone', cyl(PLAZA_R, PLAZA_R, 0.08, 0, 0.04, 0, 32));
  add('stoneDark', ringFlat(3.2, 3.35, 0.09)); add('stoneDark', ringFlat(1.6, 1.75, 0.09));
  for (const s of [-1, 1]) {                                      // 벤치 2개(동·서) + 가로등
    add('wood', box(0.5, 0.08, 1.6, s * 3.6, 0.45, 0));
    add('woodDark', box(0.08, 0.45, 0.08, s * 3.6, 0.22, -0.65)); add('woodDark', box(0.08, 0.45, 0.08, s * 3.6, 0.22, 0.65));
    add('woodDark', box(0.1, 2.4, 0.1, s * 3.0, 1.2, -2.6));
    add('lamp', ball(0.2, s * 3.0, 2.5, -2.6));
  }
}

function stage3(add) {
  stage2(add);
  add('straw', cyl(0.45, 0.45, 0.6, -3.3, 0.3, 2.4));            // 볏단
  add('straw', cyl(0.4, 0.4, 0.55, -2.6, 0.28, 2.9));
  add('pumpkin', ball(0.38, 3.5, 0.3, 1.5, 0.75)); add('pumpkin', ball(0.28, 4.1, 0.22, 1.35, 0.75)); add('pumpkin', ball(0.24, 3.0, 0.2, 1.9, 0.75));   // 좌판(2.4,3.0)과 겹치지 않게
  add('woodDark', box(0.1, 1.9, 0.1, 0, 0.95, -3.4)); add('woodDark', box(1.1, 0.08, 0.08, 0, 1.4, -3.4));   // 허수아비 틀
  add('straw', ball(0.25, 0, 2.05, -3.4));
}

function stage4(add) {
  stage3(add);
  add('woodDark', cyl(0.25, 0.35, 2.6, 0, 1.3, 0));                // 수확 나무 줄기
  add('leaf', ball(1.5, 0, 3.4, 0)); add('leaf', ball(1.0, -1.0, 2.9, 0.3)); add('leaf', ball(1.0, 1.0, 3.0, -0.2)); add('leaf', ball(0.9, 0.1, 4.3, 0));
  for (const [x, y, z] of [[-0.9, 2.5, 0.9], [1.0, 2.6, 0.8], [0.2, 2.3, -1.1], [-1.2, 3.1, -0.6]]) add('lamp', ball(0.14, x, y, z));
  add('stoneDark', cyl(0.9, 1.0, 0.25, 0, 0.12, 0, 16));           // 나무 둘레석
}

function props(add, stage, phase) {
  if (stage === 4 || phase === 'after') {                         // 명판(기부함 자리)
    add('woodDark', box(0.12, 1.1, 0.12, BX - 0.5, 0.55, BZ)); add('woodDark', box(0.12, 1.1, 0.12, BX + 0.5, 0.55, BZ));
    add('wood', box(1.3, 0.8, 0.1, BX, 1.2, BZ));
  } else {                                                        // 기부함
    add('wood', box(0.9, 0.7, 0.7, BX, 0.35, BZ)); add('woodDark', box(0.95, 0.08, 0.75, BX, 0.74, BZ));
    add('straw', box(0.5, 0.05, 0.1, BX, 0.79, BZ));
  }
  if (phase === 'active') {                                       // 좌판
    add('wood', box(1.6, 0.8, 0.7, SX, 0.4, SZ));
    add('woodDark', box(0.08, 1.6, 0.08, SX - 0.75, 0.8, SZ - 0.3)); add('woodDark', box(0.08, 1.6, 0.08, SX + 0.75, 0.8, SZ - 0.3));
    add('straw', box(1.8, 0.08, 0.9, SX, 1.62, SZ - 0.1));
  }
}

const STAGES = [null, stage1, stage2, stage3, stage4];

// 재질 키 → 드로우 묶음. 색은 정점에 실어(paintGeo) 묶음마다 메시 1개 — 재질 수가 곧 드로우콜이라서다.
//   ground: 바닥·테두리(그림자 안 드리움) / props: 나머지 전부(그림자) / lamp: 밤에 켜지는 발광 구슬
//   재질별 메시 8개(메인 8 + 그림자 7 = +15콜)가 예산 12를 넘어 정점색 병합으로 바꿨다(+4콜).
const BUCKET_OF = (k) => (k === 'lamp' ? 'lamp' : k === 'dirt' || k === 'stone' || k === 'stoneDark' ? 'ground' : 'props');

export function buildPlaza(stage, phase, variant = 'a') {
  const pal = PALETTES[variant] || PALETTES.a;
  const buckets = new Map();
  const add = (k, geo) => {
    const b = BUCKET_OF(k), g = paintGeo(geo, pal[k]);
    const a = buckets.get(b); a ? a.push(g) : buckets.set(b, [g]);
  };
  if (stage >= 1) { STAGES[stage](add); props(add, stage, phase); }

  const group = new THREE.Group();
  group.position.set(PLAZA.x, 0, PLAZA.z);
  const mats = [];
  for (const [b, geos] of buckets) {
    const mat = b === 'lamp'
      ? new THREE.MeshStandardMaterial({ color: pal.lamp, emissive: pal.lamp, emissiveIntensity: 0, roughness: 0.6 })
      : vtxMat();
    const merged = mergeGeos(geos);
    for (const g of geos) g.dispose();
    const m = new THREE.Mesh(merged, mat);
    m.castShadow = b === 'props'; m.receiveShadow = b !== 'lamp';
    group.add(m); mats.push(mat);
    if (b === 'lamp') houseWindows.push(mat);                     // 밤에 창문·가로등과 함께 점등(houseWindows 는 재질 배열)
  }
  return {
    group,
    dispose() {
      for (const m of group.children) m.geometry.dispose();
      for (const mat of mats) {
        const i = houseWindows.indexOf(mat); if (i >= 0) houseWindows.splice(i, 1);
        mat.dispose();
      }
    },
  };
}
