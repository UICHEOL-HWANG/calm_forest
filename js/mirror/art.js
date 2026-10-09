// =============================================================
//  🪞 거울 마을 — 조형(THREE 만 의존, 게임 상태 없음)
//  ------------------------------------------------------------
//  스펙 §3·§4 · 확정 시안: 외관 3안 색 반전 숲(mockups/village.html?v=3) · 물건 원색 저폴리(items.html?v=1) · 거울 문(cutscene.html?f=3b)
//  ⚡ 드로우콜 ≤ 60 — 고정 조형(땅·표지물·집·숲 링·덮개 15)은 bakeGroup 으로 solid(무광)·glow(발광) 두 덩이.
//     따로 두는 것: 물건(그날 활성 1개만 보임) · 주민 3(npc 몸) · 빛기둥 1 · 오로라 1 · 반딧불 Points 1 · 거울 문
//  ⚠️ 블룸 임계 0.85 — 흰 발광 금지(연못·등불은 채도 있는 파스텔)
// =============================================================
import * as THREE from 'three';
import { bakeGroup, part } from '../dream/art.js';
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

const SIGN_X = 2.1;   // 🚏 표지판 기둥 x(돌리기 전) — 판 1.6~2.6 이 지붕 끝 1.4 와 20cm 떨어진다 · 충돌은 layout.js SIGN_POLE.dx(= −SIGN_X)
export function makeStopShelter(roof, wood) {
  const g = new THREE.Group();
  for (const s of [-1.1, 1.1]) put(g, new THREE.CylinderGeometry(0.09, 0.11, 2.3, 6), wood, s, 1.15, -0.4);
  put(g, new THREE.BoxGeometry(2.8, 0.16, 1.3), roof, 0, 2.36, -0.25).rotation.x = 0.12;
  put(g, new THREE.BoxGeometry(1.8, 0.12, 0.45), wood, 0, 0.48, -0.55);
  put(g, new THREE.CylinderGeometry(0.06, 0.06, 2.2, 6), 0x8a8f99, SIGN_X, 1.1, 0.2);   // 지붕(x ±1.4) 밖 — 1.7 이면 판(폭 1.0)이 지붕 모서리를 파고들었다 · 기둥(지름 12cm)이 판(두께 6cm)보다 굵어 판 아래 끝(2.2)에서 멈춘다 — 판 위까지 올리면 그림을 세로로 가로질렀다(2026-10-10 지적)
  put(g, new THREE.BoxGeometry(1.0, 0.4, 0.06), 0x3f63a8, SIGN_X, 2.4, 0.2);   // 판도 얼굴과 같은 파랑 — 흰 판 테두리가 튀어나와 보였다
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

/** 🚏 표지판 얼굴 — 빈 흰 판은 뒷면처럼 읽힌다. 판(SIGN_X, 2.4, 0.2) 앞뒤에 그림 한 장씩.
 *  마을 정류장은 조명 받는 재질 한 메시 · 거울 쪽은 연못과 한 장(아틀라스)으로 합쳐 드로우콜 1 을 아낀다(makeMirrorPond) */
function drawSign(x, ox, oy, light) {   // 256×104 — 파란 바탕(흰 판은 블룸 0.85 에 번진다) + 크림 원 + 🚏
  x.fillStyle = '#3f63a8'; x.fillRect(ox, oy, 256, 104);
  x.fillStyle = light; x.beginPath(); x.arc(ox + 128, oy + 52, 42, 0, Math.PI * 2); x.fill();
  x.font = '64px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('🚏', ox + 128, oy + 56);
}
function mergeGeos(geos) {   // non-indexed position·normal·uv 이어 붙이기
  const out = new THREE.BufferGeometry();
  for (const k of ['position', 'normal', 'uv']) {
    const size = geos[0].attributes[k].itemSize, arr = new Float32Array(geos.reduce((n, g) => n + g.attributes[k].array.length, 0));
    let off = 0; for (const g of geos) { arr.set(g.attributes[k].array, off); off += g.attributes[k].array.length; }
    out.setAttribute(k, new THREE.BufferAttribute(arr, size));
  }
  geos.forEach(g => g.dispose());
  return out;
}
function signFaceGeometry() {
  return mergeGeos([1, -1].map(s => {
    const p = new THREE.PlaneGeometry(0.96, 0.36).toNonIndexed();
    if (s < 0) p.rotateY(Math.PI);
    p.translate(SIGN_X, 2.4, 0.2 + s * 0.032);   // 판 겉면(±0.03)에 붙인다 — 띄우면 비스듬히 볼 때 따로 놀아 보인다(2026-10-09 지적)
    return p;
  }));
}
let _signTex = null;
export function makeStopSignFace() {
  if (!_signTex) {
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 104;
    drawSign(cv.getContext('2d'), 0, 0, '#f4ecd8');
    _signTex = new THREE.CanvasTexture(cv); _signTex.colorSpace = THREE.SRGBColorSpace;
  }
  const m = new THREE.Mesh(signFaceGeometry(), new THREE.MeshStandardMaterial({ map: _signTex, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));   // polygonOffset — 판 겉면과 2mm, 멀리서 깜빡이지 않게
  m.name = 'stopSignFace';
  return m;
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
// ── 🌤️ 거울 천장 · 연못에 비친 낮 마을 (스펙 §3 "하늘엔 거꾸로 매달린 낮 마을" — 시안 sims/mirror-sky-sheep-sim.html C-3 확정, 2026-10-09)
//   플레이 카메라(41°)는 하늘을 못 본다 → 천장은 도착 연출(ride.js 올려다보기)에서, 마을 안에선 연못이 낮 마을을 비춘다
//   ⚠️ 블룸 임계 0.85 — 낮 색은 한 톤 눌렀다 · 안개 밖(fog:false) · 드로우콜 3(천장 땅·천장 조형·연못)
const DAY = { grass: '#8fc79a', grassEdge: '#7ab68a', path: '#d8c49a', walls: [0xe0c4a2, 0xdccfb0, 0xd6bb9c], roofs: [0xd47a74, 0x7aa0d8, 0xd89a5c], leaf: 0x6fae6a, trunk: 0x9a7350 };
export const MIRROR_CEILING = Object.freeze({ x: 30, y: 20, z: 2, scale: 0.75 });   // 로컬 — 도착 카메라(서쪽에서 동쪽)가 올려다보는 자리
function canvasTex(size, draw) {
  const cv = document.createElement('canvas'); cv.width = cv.height = size; draw(cv.getContext('2d'));
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function makeMirrorCeiling() {
  const root = new THREE.Group(); root.name = 'mirrorCeiling';
  const tex = canvasTex(256, (x) => {
    const gr = x.createRadialGradient(128, 128, 20, 128, 128, 128);
    gr.addColorStop(0, DAY.grass); gr.addColorStop(0.75, DAY.grassEdge); gr.addColorStop(1, 'rgba(46,40,88,0)');   // 가장자리는 안개색으로 사라진다
    x.fillStyle = gr; x.fillRect(0, 0, 256, 256);
    x.strokeStyle = DAY.path; x.lineWidth = 10; x.beginPath(); x.arc(128, 128, 60, 0, Math.PI * 1.6); x.stroke();
  });
  const disc = new THREE.Mesh(new THREE.CircleGeometry(34, 48), new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false, fog: false }));
  disc.rotation.x = -Math.PI / 2; root.add(disc);
  const town = new THREE.Group();
  const box = (geo, c, x, y, z) => part(town, geo, c, x, y, z);
  [[-12, -4], [10, -9], [2, 12], [-4, -15], [16, 6]].forEach(([x, z], i) => {
    box(new THREE.BoxGeometry(3.3, 2.42, 2.86), DAY.walls[i % 3], x, 1.21, z);
    box(new THREE.ConeGeometry(2.64, 1.65, 4), DAY.roofs[i % 3], x, 3.25, z).rotation.y = Math.PI / 4;
  });
  for (let i = 0; i < 14; i++) {
    const a = i / 14 * Math.PI * 2, x = Math.cos(a) * 22, z = Math.sin(a) * 22;
    box(new THREE.CylinderGeometry(0.2, 0.26, 1.56, 5), DAY.trunk, x, 0.78, z);
    box(new THREE.ConeGeometry(1.17, 2.6, 6), DAY.leaf, x, 2.6, z);
  }
  box(new THREE.CylinderGeometry(0.7, 0.85, 7, 8), 0xdcd0c0, -18, 3.5, 10);   // 🗼 등대
  box(new THREE.ConeGeometry(1.0, 1.4, 8), DAY.roofs[0], -18, 7.7, 10);
  root.add(new THREE.Mesh(bakeGroup(town), new THREE.MeshBasicMaterial({ vertexColors: true, fog: false })));
  root.rotation.z = Math.PI;   // 위아래 뒤집어 매단다
  root.scale.setScalar(MIRROR_CEILING.scale);
  root.position.set(MIRROR_CEILING.x, MIRROR_CEILING.y, MIRROR_CEILING.z);
  return root;
}
/** 🪞 연못 — 낮 하늘이 비친 수면 + 가장자리에서 안쪽으로 거꾸로 선 집·나무 + 물결 링(기존 연못 빛 위에 한 장) · 🚏 거울 정류장 표지판 얼굴도 같은 메시 */
function makeMirrorPond(stopAt) {
  const tex = canvasTex(512, (x) => {   // 왼쪽 위 256² = 연못 · 오른쪽 위 256×104 = 🚏 표지판 얼굴(아래 절반은 비운다)
    x.save(); x.beginPath(); x.arc(128, 128, 126, 0, Math.PI * 2); x.clip();
    const gr = x.createRadialGradient(128, 128, 10, 128, 128, 128); gr.addColorStop(0, '#bcdbe6'); gr.addColorStop(1, '#86bcd8');
    x.fillStyle = gr; x.fillRect(0, 0, 256, 256);
    x.fillStyle = 'rgba(255,255,255,.35)';
    for (const [cx, cy, r] of [[95, 110, 16], [112, 104, 20], [130, 112, 14], [165, 150, 12], [178, 146, 15]]) { x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill(); }
    const css = (c) => `#${c.toString(16).padStart(6, '0')}`;
    [[0.3, 0], [1.5, -1], [2.4, 1], [3.4, -1], [4.3, 2], [5.4, -1]].forEach(([a, i]) => {
      x.save(); x.translate(128 + Math.cos(a) * 126, 128 + Math.sin(a) * 126); x.rotate(a + Math.PI / 2);   // 물가 → 안쪽으로 비친다
      if (i >= 0) { x.fillStyle = css(DAY.walls[i]); x.fillRect(-16, 0, 32, 24); x.fillStyle = css(DAY.roofs[i]); x.beginPath(); x.moveTo(-22, 24); x.lineTo(0, 44); x.lineTo(22, 24); x.fill(); }
      else { x.fillStyle = css(DAY.trunk); x.fillRect(-3, 0, 6, 12); x.fillStyle = css(DAY.leaf); x.beginPath(); x.moveTo(-13, 12); x.lineTo(0, 40); x.lineTo(13, 12); x.fill(); }
      x.restore();
    });
    x.strokeStyle = 'rgba(255,255,255,.5)'; x.lineWidth = 3;
    for (const r of [40, 70, 100]) { x.beginPath(); x.arc(128, 128, r, 0, Math.PI * 2); x.stroke(); }
    x.restore();
    x.strokeStyle = '#c89eff'; x.lineWidth = 6; x.beginPath(); x.arc(128, 128, 124, 0, Math.PI * 2); x.stroke();   // 연못 빛 테두리(P.pondGlow)
    drawSign(x, 256, 0, '#d8d0bc');   // 무광(Basic)이라 크림 원을 한 톤 눌렀다(블룸)
  });
  const atlas = (g, u0, v0, du, dv) => { const uv = g.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setXY(k, u0 + uv.getX(k) * du, v0 + uv.getY(k) * dv); return g; };
  const pond = atlas(new THREE.CircleGeometry(3, 40).toNonIndexed().rotateX(-Math.PI / 2).translate(0, 0.05, 0), 0, 0.5, 0.5, 0.5);
  const sign = atlas(signFaceGeometry().applyMatrix4(stopAt), 0.5, 1 - 104 / 512, 0.5, 104 / 512);
  const m = new THREE.Mesh(mergeGeos([pond, sign]), new THREE.MeshBasicMaterial({ map: tex, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  m.name = 'mirrorPond';
  return m;
}

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
  { const sh = makeStopShelter(P.roofA, P.wood); sh.position.set(LM.stop.x, 0, LM.stop.z); sh.rotation.y = Math.PI; solid.add(sh); }   // 표지판 얼굴은 연못 아틀라스에(makeMirrorPond)
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
  const ceiling = makeMirrorCeiling(); ceiling.visible = false;   // ⚡ 도착 연출 동안만 켠다(js/spaces/mirror.js) — 플레이 카메라는 하늘을 못 보는데 3콜을 먹었다(QA M8 66>60)
  const stopAt = new THREE.Matrix4().makeRotationY(Math.PI).setPosition(LM.stop.x, 0, LM.stop.z);
  group.add(ceiling, makeMirrorPond(stopAt));
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
  return { group, items, npcAnchors, beam, ceiling, update };
}
