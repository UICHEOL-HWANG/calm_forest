// =============================================================
//  🪞 거울 마을 — 조형(THREE 만 의존, 게임 상태 없음)
//  ------------------------------------------------------------
//  스펙 §3·§4 · 확정 시안: 외관 3안 색 반전 숲(mockups/village.html?v=3) · 물건 원색 저폴리(items.html?v=1) · 거울 문(cutscene.html?f=3b)
//  ⚡ 드로우콜 ≤ 60 — 고정 조형(땅·표지물·집·숲 링·덮개 15)은 bakeGroup 으로 solid(무광)·glow(발광) 두 덩이.
//     따로 두는 것: 물건(그날 활성 1개만 보임) · 주민 3(npc 몸) · 빛기둥 1 · 오로라 1 · 반딧불 Points 1 · 거울 문
//  ⚠️ 블룸 임계 0.85 — 흰 발광 금지(연못·등불은 채도 있는 파스텔)
// =============================================================
import * as THREE from 'three';
import { bakeGroup } from '../dream/art.js';
import { LANDMARKS, HOUSES, SPOTS, RING_TREES } from './layout.js';
import { invertColorPure } from './art-color.js';
export { invertColorPure as invertColor };

export const PAL3 = Object.freeze({
  sky: 0x120f2e, fog: 0x2e2858, ground: 0x50629a, pondGlow: 0xc89eff, stone: 0xb8b0d0,
  wood: 0xc8c0e0, roofA: 0x7ad6c0, roofB: 0x6ab8e0, wallB: 0xe8b8d0, lampGlow: 0x9ef6d0,
  leaf: [0xdfe6f2, 0xc8d6ea, 0xeef2ff], trunk: 0x8a86a8, bush: [0x5a6aa0, 0x6a5aa8],
  walls: [0xc8a0d8, 0xa8c0e8, 0xe0b0c0], roofs: [0x6ad6b0, 0xe0d06a, 0x7ab8f0], win: [0x9ef6d0, 0xffe08a, 0xff9ee0],
});
const mat = (c) => new THREE.MeshStandardMaterial({ color: c, flatShading: true, roughness: 0.85 });
function put(parent, geo, color, x, y, z) { const m = new THREE.Mesh(geo, mat(color)); m.position.set(x, y, z); parent.add(m); return m; }

/** 보색 쌍둥이 — 그룹 안 재질을 복제해 색만 보색으로. 공용 눈(userData.npcEye)은 하늘빛 발광 */
export function mirrorizeFigure(group) {
  group.traverse(o => {
    if (!o.isMesh) return;
    if (o.userData.npcEye) { o.material = new THREE.MeshBasicMaterial({ color: 0xbff6ff }); return; }
    const m = o.material.clone();   // ⚠️ clayMat 은 공유 재질일 수 있다 — 복제 없이 바꾸면 마을 주민 색까지 뒤집힌다
    if (m.color) m.color.setHex(invertColorPure(m.color.getHex()));
    if (m.emissive) m.emissive.setHex(0x000000);
    o.material = m;
  });
}

export function makeStopShelter(roof, wood) {
  const g = new THREE.Group();
  for (const s of [-1.1, 1.1]) put(g, new THREE.CylinderGeometry(0.09, 0.11, 2.3, 6), wood, s, 1.15, -0.4);
  put(g, new THREE.BoxGeometry(2.8, 0.16, 1.3), roof, 0, 2.36, -0.25).rotation.x = 0.12;
  put(g, new THREE.BoxGeometry(1.8, 0.12, 0.45), wood, 0, 0.48, -0.55);
  put(g, new THREE.CylinderGeometry(0.06, 0.06, 2.6, 6), 0x8a8f99, 1.7, 1.3, 0.2);
  put(g, new THREE.BoxGeometry(1.0, 0.4, 0.06), 0xfff8ea, 1.7, 2.4, 0.2);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

function star(r1, r2) { const s = new THREE.Shape(); for (let i = 0; i < 10; i++) { const r = i % 2 ? r2 : r1, a = i / 10 * Math.PI * 2 + Math.PI / 2; if (i) s.lineTo(Math.cos(a) * r, Math.sin(a) * r); else s.moveTo(Math.cos(a) * r, Math.sin(a) * r); } return s; }
const warm = (c, k = 0.25) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: k, flatShading: true, roughness: 0.85 });
function at(parent, geo, m, x, y, z) { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; parent.add(o); return o; }
const ITEM_BUILD = {
  ring(g) { at(g, new THREE.TorusGeometry(0.26, 0.07, 6, 14), warm(0xffd27a), 0, 0.3, 0); at(g, new THREE.OctahedronGeometry(0.11, 0), warm(0x9ee8ff, 0.6), 0, 0.6, 0); },
  musicbox(g) { at(g, new THREE.BoxGeometry(0.55, 0.32, 0.4), warm(0xff9e9e), 0, 0.16, 0); at(g, new THREE.BoxGeometry(0.58, 0.07, 0.42), warm(0xffd27a), 0, 0.38, -0.08).rotation.x = -0.5; },
  carrot(g) { at(g, new THREE.ConeGeometry(0.22, 0.62, 8), warm(0xff9e5e), 0, 0.33, 0).rotation.x = Math.PI; [-0.08, 0, 0.08].forEach((x, i) => { at(g, new THREE.ConeGeometry(0.06, 0.28, 5), warm(0x86d18a), x, 0.74, 0).rotation.z = (i - 1) * 0.4; }); },
  yarn(g) { at(g, new THREE.SphereGeometry(0.28, 10, 8), warm(0xc8a0ff), 0, 0.28, 0); [0, 1, 2].forEach(i => { at(g, new THREE.TorusGeometry(0.285, 0.025, 4, 16), warm(0xe8d0ff), 0, 0.28, 0).rotation.set(i * 0.9, i * 0.6, 0.3); }); },
  lantern(g) { at(g, new THREE.BoxGeometry(0.34, 0.42, 0.34), warm(0xffd59e, 0.8), 0, 0.26, 0); at(g, new THREE.ConeGeometry(0.28, 0.16, 4), warm(0xb05a3a), 0, 0.55, 0).rotation.y = Math.PI / 4; },
  brooch(g) { at(g, new THREE.ExtrudeGeometry(star(0.3, 0.13), { depth: 0.07, bevelEnabled: false }), warm(0xffe08a, 0.4), 0, 0.36, 0); at(g, new THREE.SphereGeometry(0.06, 6, 4), warm(0xff9ee0, 0.6), 0, 0.36, 0.09); },
};
export function makeLostItem(id) {
  const b = ITEM_BUILD[id]; if (!b) throw new Error(`unknown lost item: ${id}`);
  const g = new THREE.Group(); g.name = `lost:${id}`; b(g); return g;
}

let haloTex = null;
function halo(color, size, op) {
  if (!haloTex) { const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x = cv.getContext('2d'); const gr = x.createRadialGradient(32, 32, 1, 32, 32, 31); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); haloTex = new THREE.CanvasTexture(cv); }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, color, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending }));
  s.scale.set(size, size, 1); return s;
}

/** 🪞 거울 문 — 은빛 고리 + 거울면(색 반전 마을 색) + 후광. setRise: 세로로 일어섬(0..1) · setOpen: 면 불투명도 */
export function makeMirrorGate() {
  const group = new THREE.Group(); group.name = 'mirrorGate';
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3.4, 0.28, 10, 48), new THREE.MeshStandardMaterial({ color: 0xe6ebf5, metalness: 0.35, roughness: 0.25, emissive: 0x9ec8ff, emissiveIntensity: 0.4 }));
  const face = new THREE.Mesh(new THREE.CircleGeometry(3.3, 48), new THREE.MeshBasicMaterial({ color: 0x3a2f68, transparent: true, opacity: 0, side: THREE.DoubleSide }));
  group.add(ring, face, halo(0xc89eff, 12, 0.45));
  group.visible = false;
  return {
    group,
    setRise(k) { group.scale.set(1, Math.max(0.001, k), 1); group.visible = k > 0.001; },
    setOpen(k) { face.material.opacity = Math.min(1, Math.max(0, k)) * 0.95; },
  };
}

function lowTree(parent, x, z, s, leaf, trunk) {
  put(parent, new THREE.CylinderGeometry(0.16 * s, 0.22 * s, 1.4 * s, 6), trunk, x, 0.7 * s, z);
  put(parent, new THREE.IcosahedronGeometry(1.0 * s, 0), leaf, x, 1.9 * s, z);
  put(parent, new THREE.IcosahedronGeometry(0.7 * s, 0), leaf, x + 0.4 * s, 2.5 * s, z + 0.1 * s);
}
function placed(parent, x, z, ry) { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; parent.add(g); return g; }
function cover(parent, s, P, i) {
  if (s.cover === 'bush') put(parent, new THREE.IcosahedronGeometry(0.55, 0), P.bush[i % 2], s.x, 0.35, s.z).scale.set(1.3, 0.8, 1.1);
  else if (s.cover === 'rock') put(parent, new THREE.DodecahedronGeometry(0.5, 0), P.stone, s.x, 0.24, s.z);
  else lowTree(parent, s.x, s.z - 0.3, 0.9, P.leaf[i % 3], P.trunk);
}

/** 거울 마을 전체 — group 은 MIRROR 좌표에 놓는다 */
export function buildMirrorWorld() {
  const P = PAL3, group = new THREE.Group(); group.name = 'mirrorWorld';
  const solid = new THREE.Group(), glow = new THREE.Group();
  put(solid, new THREE.CircleGeometry(23, 56), P.ground, 0, 0, 0).rotation.x = -Math.PI / 2;
  put(solid, new THREE.RingGeometry(23, 70, 48), P.bush[0], 0, -0.01, 0).rotation.x = -Math.PI / 2;
  const LM = Object.fromEntries(LANDMARKS.map(l => [l.id, l]));
  // 🪞 연못
  put(glow, new THREE.CircleGeometry(3, 32), P.pondGlow, 0, 0.03, 0).rotation.x = -Math.PI / 2;
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; put(solid, new THREE.DodecahedronGeometry(0.34, 0), P.stone, Math.cos(a) * 3.3, 0.16, Math.sin(a) * 3.3); }
  // 🪣 우물
  { const { x, z } = LM.well;
    put(solid, new THREE.CylinderGeometry(0.9, 0.95, 0.9, 10), P.stone, x, 0.45, z);
    put(glow, new THREE.CylinderGeometry(0.7, 0.7, 0.05, 10), P.pondGlow, x, 0.92, z);
    for (const s of [-1, 1]) put(solid, new THREE.BoxGeometry(0.12, 1.6, 0.12), P.wood, x + s * 0.85, 1.3, z);
    put(solid, new THREE.ConeGeometry(1.25, 0.7, 4), P.roofA, x, 2.4, z).rotation.y = Math.PI / 4; }
  // 🕰️ 거꾸로 시계탑 — 지붕이 아래, 받침이 위
  { const { x, z } = LM.clock;
    put(solid, new THREE.ConeGeometry(1.1, 1.6, 4), P.roofB, x, 0.8, z).rotation.set(Math.PI, Math.PI / 4, 0);
    put(solid, new THREE.BoxGeometry(1.5, 3.4, 1.5), P.wallB, x, 3.3, z);
    put(solid, new THREE.BoxGeometry(1.9, 0.35, 1.9), P.stone, x, 5.15, z);
    put(glow, new THREE.CylinderGeometry(0.55, 0.55, 0.06, 20), 0xffe8b0, x, 3.9, z + 0.78).rotation.x = Math.PI / 2; }
  // 🏮 등불 기둥
  { const { x, z } = LM.lamp; put(solid, new THREE.CylinderGeometry(0.12, 0.16, 3.2, 6), P.wood, x, 1.6, z); put(glow, new THREE.BoxGeometry(0.6, 0.7, 0.6), P.lampGlow, x, 3.4, z); }
  // 🚏 거울 정류장(지붕이 남쪽, 앞이 북쪽 연못을 본다)
  { const sh = makeStopShelter(P.roofA, P.wood); sh.position.set(LM.stop.x, 0, LM.stop.z); sh.rotation.y = Math.PI; solid.add(sh); }
  // 집 3 — 창문은 같은 변환의 glow 그룹에
  HOUSES.forEach((h, i) => {
    const s = placed(solid, h.x, h.z, h.ry), w = placed(glow, h.x, h.z, h.ry);
    put(s, new THREE.BoxGeometry(3, 2.2, 2.6), P.walls[i], 0, 1.1, 0);
    const r = put(s, new THREE.ConeGeometry(2.4, 1.5, 4), P.roofs[i], 0, 2.95, 0); r.rotation.y = Math.PI / 4; r.scale.set(1, 1, 0.85);
    put(s, new THREE.BoxGeometry(0.7, 1.1, 0.05), 0x4a4060, 0, 0.55, 1.31);
    for (const wx of [-0.75, 0.75]) put(w, new THREE.BoxGeometry(0.6, 0.6, 0.05), P.win[i], wx, 1.3, 1.31);
  });
  // 가장자리 숲 링 — ⚠️ 정류장 남쪽(z > 14, |x − 2.5| < 7)엔 나무 금지(화면 아래를 가림, 시안 확인)
  for (const t of RING_TREES) lowTree(solid, t.x, t.z, 1.5 + (t.i % 2) * 0.4, P.leaf[t.i % 3], P.trunk);   // 자리·제외 규칙은 layout.js(충돌과 같은 목록)
  SPOTS.forEach((s, i) => cover(solid, s, P, i));
  const body = new THREE.Mesh(bakeGroup(solid), new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85 }));
  body.castShadow = true; body.receiveShadow = true;
  group.add(body, new THREE.Mesh(bakeGroup(glow), new THREE.MeshBasicMaterial({ vertexColors: true })));
  // 오로라 1 · 반딧불 1
  const aur = new THREE.Mesh(new THREE.PlaneGeometry(120, 14), new THREE.MeshBasicMaterial({ color: 0x9ec8ff, transparent: true, opacity: 0.14, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  aur.position.set(0, 30, -70); aur.rotation.z = 0.08; group.add(aur);
  const fp = new Float32Array(40 * 3);
  for (let i = 0; i < 40; i++) { fp[i * 3] = Math.sin(i * 12.9898) * 16; fp[i * 3 + 1] = 0.6 + (i % 7); fp[i * 3 + 2] = Math.cos(i * 78.233) * 15; }
  const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.BufferAttribute(fp, 3));
  group.add(new THREE.Points(fg, new THREE.PointsMaterial({ color: 0x9ef6d0, size: 0.18, transparent: true, opacity: 0.8 })));
  // 물건(런타임이 위치·가시성) · 💧 힌트 빛기둥 · 주민 자리
  const items = new Map();
  for (const id of Object.keys(ITEM_BUILD)) { const g = makeLostItem(id); g.visible = false; group.add(g); items.set(id, g); }
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 7, 10, 1, true), new THREE.MeshBasicMaterial({ color: 0xffe2a8, transparent: true, opacity: 0.14, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  beam.visible = false; beam.position.y = 3.5; group.add(beam);
  const npcAnchors = [0, 1, 2].map(() => { const a = new THREE.Group(); group.add(a); return a; });
  const update = (t) => {
    aur.material.opacity = 0.12 + Math.sin(t * 0.7) * 0.04;
    for (const g of items.values()) if (g.visible) g.rotation.y = t * 1.2;
    npcAnchors.forEach((a, i) => { a.position.y = Math.sin(t * 1.6 + i) * 0.08; });
  };
  return { group, items, npcAnchors, beam, update };
}
