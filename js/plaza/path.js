// js/plaza/path.js
// =============================================================
//  🌾 광장으로 이끄는 돌길·깃발 줄·깃대 — 말 없이 동선을 만든다(스펙 §4 발견성 ①②).
//  예산 ≤ 3콜: 돌(1, 그림자 안 드리움) · 기둥+깃대+깃발(정점색 1 + 그림자 1)
//    브리프 원안(돌·나무·깃발 재질 3개)은 나무가 그림자 패스를 하나 더 먹어 4콜이다 →
//    build.js 처럼 색을 정점에 실어(paintGeo) 나무와 깃발을 한 메시로 묶었다.
//  ⚠️ shared() 자원 금지 — dispose() 가 전부 해제한다.
// =============================================================
import * as THREE from 'three';
import { mergeGeos, paintGeo, vtxMat } from '../game.js';
import { PLAZA_PATH, PLAZA_POLE } from '../data/plaza.js';

const PAL = { stone: 0xe4dcc8, wood: 0x7a5230, banner: 0xe0873a };
const FLAG_COLORS = [0xe26d5a, 0xf2c14e, 0x6bb5a6];
const POST_H = 2.2, POST_OFF_Z = 0.9;                  // 깃발 줄 기둥 — 돌길 남쪽(카메라 쪽) 옆

function tri(points, uv) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}
const smallFlag = () => tri([-0.14, 0, 0, 0.14, 0, 0, 0, -0.32, 0], [0, 1, 1, 1, 0.5, 0]);

// 깃발 줄: 스폰 쪽 첫 구간은 비운다(시작점 과밀 방지) — 3칸마다 기둥, 기둥 사이에 처진 삼각기 5장
function bunting(add, path) {
  const posts = path.filter((_, i) => i >= 3 && i % 3 === 0);
  for (const [x, z] of posts) add(PAL.wood, new THREE.BoxGeometry(0.1, POST_H, 0.1).translate(x, POST_H / 2, z + POST_OFF_Z));
  for (let i = 0; i + 1 < posts.length; i++) {
    const [x1, z1] = posts[i], [x2, z2] = posts[i + 1];
    const rot = -Math.atan2(z2 - z1, x2 - x1);
    for (let k = 1; k < 6; k++) {
      const t = k / 6, sag = Math.sin(t * Math.PI) * 0.35;
      add(FLAG_COLORS[(i + k) % 3], smallFlag().rotateY(rot).translate(x1 + (x2 - x1) * t, POST_H - 0.1 - sag, z1 + (z2 - z1) * t + POST_OFF_Z));
    }
  }
}

function pole(add, h) {
  add(PAL.wood, new THREE.CylinderGeometry(0.1, 0.14, h, 8).translate(PLAZA_POLE.x, h / 2, PLAZA_POLE.z));
  add(PAL.banner, tri([0, 0, 0, 1.6, -0.45, 0, 0, -0.9, 0], [0, 1, 1, 0.5, 0, 0]).translate(PLAZA_POLE.x + 0.1, h - 0.1, PLAZA_POLE.z));
}

// path: 돌 놓을 점들(기본 PLAZA_PATH). 돌길은 stage ≥ 1 이면 항상, 깃대·깃발 줄은 시즌 중(active)·완공 전에만
export function buildPath(stage, phase, poleH = 9, path = PLAZA_PATH) {
  const group = new THREE.Group();
  group.name = 'plazaPath';
  const mats = [];
  const dispose = () => { for (const m of group.children) m.geometry.dispose(); for (const m of mats) m.dispose(); };
  if (stage < 1) return { group, dispose };

  const stones = [], deco = [];
  path.forEach(([x, z], i) => {                        // 결정적 회전(부팅마다 같은 모양)
    stones.push(paintGeo(new THREE.CylinderGeometry(0.62, 0.66, 0.05, 7).rotateY(i * 1.7).translate(x, 0.025, z), PAL.stone));
  });
  if (phase === 'active' && stage < 4) {
    const add = (hex, geo) => deco.push(paintGeo(geo, hex));
    bunting(add, path);
    pole(add, poleH);
  }

  const put = (geos, shadow, side) => {
    if (!geos.length) return;
    const mat = vtxMat(); mat.side = side;
    const merged = mergeGeos(geos);
    for (const g of geos) g.dispose();
    const m = new THREE.Mesh(merged, mat);
    m.castShadow = shadow; m.receiveShadow = true;
    group.add(m); mats.push(mat);
  };
  put(stones, false, THREE.FrontSide);
  put(deco, true, THREE.DoubleSide);                   // 삼각기는 판 한 장이라 양면
  return { group, dispose };
}
