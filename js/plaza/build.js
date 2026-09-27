// js/plaza/build.js
// =============================================================
//  🌾 광장 3D — 단계별 파츠를 색 키로 칠해(paintGeo) 묶음별 mergeGeos() 한 번(🏛️전시물 방식).
//  예산: 광장 ≤ 12콜. 색을 먼저 정하고(PAL) 파츠는 그 키에만 담는다.
//  ⚠️ shared() 자원 금지 — dispose() 가 전부 해제한다.
// =============================================================
import * as THREE from 'three';
import { mergeGeos, houseWindows, paintGeo, vtxMat } from '../game.js';
import { PLAZA, PLAZA_R, PLAZA_BOX, PLAZA_STALL_POS } from '../data/plaza.js';

// 🎨 디자인 게이트 A(2026-09-27): 시안 c — 붉은 단풍·짙은 나무(가을 강조) 확정
//   dirt 는 마을 길(0xded0b4)보다 한 톤 어두운 낮은 채도 흙 — 주황이면 화면에서 가장 튀어 자재 더미를 묻는다(A2 피드백)
const PAL = { dirt: 0xbca783, stone: 0xdcd5c3, stoneDark: 0xb3a994, wood: 0xa8683c, woodDark: 0x5e3b22, straw: 0xe8bf4a, pumpkin: 0xe8742a, leaf: 0xc8452e, lamp: 0xffd98a };

const box = (w, h, d, x, y, z) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
const cyl = (rt, rb, h, x, y, z, seg = 10) => new THREE.CylinderGeometry(rt, rb, h, seg).translate(x, y, z);
const ball = (r, x, y, z, sy = 1) => new THREE.IcosahedronGeometry(r, 1).scale(1, sy, 1).translate(x, y, z);
const ringFlat = (r1, r2, y) => new THREE.RingGeometry(r1, r2, 32).rotateX(-Math.PI / 2).translate(0, y, 0);

// 로컬 좌표(광장 중심 기준)
const BX = PLAZA_BOX.x - PLAZA.x, BZ = PLAZA_BOX.z - PLAZA.z;
const SX = PLAZA_STALL_POS.x - PLAZA.x, SZ = PLAZA_STALL_POS.z - PLAZA.z;
const SCX = -3.9, SCZ = -1.5;                                     // 허수아비(3·4단계 같은 자리)

function stage1(add) {
  add('dirt', cyl(PLAZA_R, PLAZA_R, 0.06, 0, 0.03, 0, 28));
  for (let i = 0; i < 8; i++) {                                   // 구획 말뚝
    const a = (i / 8) * Math.PI * 2;
    add('woodDark', box(0.14, 0.7, 0.14, Math.cos(a) * (PLAZA_R - 0.3), 0.35, Math.sin(a) * (PLAZA_R - 0.3)));
  }
  for (let i = 0; i < 3; i++) add('wood', box(1.8, 0.18, 0.3, -2.2, 0.12 + i * 0.19, 1.6 + (i % 2) * 0.1));   // 목재 더미
  add('stone', ball(0.35, 2.4, 0.25, 0.2)); add('stoneDark', ball(0.28, 2.9, 0.2, 0.5)); add('stone', ball(0.25, 2.6, 0.45, 0.35));   // 돌 무더기(좌판 뒤에 가리지 않게) — 밝은 stone 위주: stoneDark 는 흙색과 명도가 비슷해 묻힌다
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
  // 허수아비 — 서쪽 가장자리(벤치와 가로등 사이). 가운데 뒤(0,−3.4)는 4단계 나무에 가려 기본 카메라에서 안 보였다
  add('woodDark', box(0.1, 1.9, 0.1, SCX, 0.95, SCZ)); add('woodDark', box(1.1, 0.08, 0.08, SCX, 1.4, SCZ));
  add('straw', box(0.42, 0.55, 0.22, SCX, 1.3, SCZ));             // 짚 몸통
  add('straw', ball(0.25, SCX, 2.05, SCZ));
  add('woodDark', cyl(0.06, 0.34, 0.2, SCX, 2.32, SCZ, 12));       // 밀짚모자
}

function stage4(add) {
  stage3(add);
  add('woodDark', cyl(0.25, 0.35, 2.6, 0, 1.3, 0));                // 수확 나무 줄기
  add('leaf', ball(1.5, 0, 3.4, 0)); add('leaf', ball(1.0, -1.0, 2.9, 0.3)); add('leaf', ball(1.0, 1.0, 3.0, -0.2)); add('leaf', ball(0.9, 0.1, 4.3, 0));
  // 꼬마 등불 4개 — 잎 덩이 바깥 표면, 카메라 쪽(+Z) 반구에 매단다(잎 속에 묻히면 밤에도 안 보인다)
  for (const [x, y, z] of [[-1.58, 2.55, 1.23], [1.19, 2.8, 1.02], [0.08, 2.39, 1.34], [-0.59, 3.82, 1.52]]) add('lamp', ball(0.15, x, y, z));
  add('stoneDark', cyl(0.9, 1.0, 0.25, 0, 0.12, 0, 16));           // 나무 둘레석
}

function props(add, stage, phase) {
  if (stage === 4 || phase === 'after') {                         // 명판(기부함 자리)
    // 세운 간판 — 기둥 둘이 판 위로 솟고 판은 세로로 길게(가로로 넓으면 위에서 볼 때 탁자로 읽힌다).
    //   판은 +Z(카메라 쪽)를 보고 뒤로 살짝 젖혀 위에서 내려다보는 카메라에 면이 보이게 한다
    const tilt = (g) => g.rotateX(-0.18).translate(BX, 1.15, BZ);
    add('woodDark', box(0.12, 1.85, 0.12, BX - 0.5, 0.925, BZ)); add('woodDark', box(0.12, 1.85, 0.12, BX + 0.5, 0.925, BZ));
    add('woodDark', box(1.25, 0.1, 0.24, BX, 1.88, BZ));            // 지붕 턱
    add('wood', tilt(new THREE.BoxGeometry(0.88, 1.1, 0.08)));
    add('stone', tilt(new THREE.BoxGeometry(0.66, 0.78, 0.02).translate(0, 0.02, 0.05)));   // 글자판(밝은 면)
    add('straw', tilt(new THREE.BoxGeometry(0.46, 0.07, 0.02).translate(0, 0.2, 0.065)));   // 🌾 띠
    add('straw', tilt(new THREE.BoxGeometry(0.34, 0.05, 0.02).translate(0, -0.05, 0.065)));
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

export function buildPlaza(stage, phase) {
  const buckets = new Map();
  const add = (k, geo) => {
    const b = BUCKET_OF(k), g = paintGeo(geo, PAL[k]);
    const a = buckets.get(b); a ? a.push(g) : buckets.set(b, [g]);
  };
  if (stage >= 1) { STAGES[stage](add); props(add, stage, phase); }

  const group = new THREE.Group();
  group.position.set(PLAZA.x, 0, PLAZA.z);
  const mats = [];
  for (const [b, geos] of buckets) {
    const mat = b === 'lamp'
      ? new THREE.MeshStandardMaterial({ color: PAL.lamp, emissive: PAL.lamp, emissiveIntensity: 0, roughness: 0.6 })
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
