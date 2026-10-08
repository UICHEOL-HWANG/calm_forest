// =============================================================
//  🏮 빛 공방 — 반딧불이 계곡 연못가 오두막 + 공방 주인(🧚 반디 요정)
//  ⚠️ game.js 와 순환 import — 로딩 시점엔 game.js 값을 읽지 않는다(함수 안에서만).
// =============================================================
import { makeNameTag, makeSignpost, mergeGeos, obstacles, paintGeo, scene, solidCircle, vtxMat } from '../game.js';
import { LIGHT_WORKSHOP } from '../data/places.js';
import * as THREE from 'three';

export const KEEPER = { id: 'lightkeeper', emoji: '🧚', name: '반디 요정', color: 0xe58fb0 };
const GLOW = 0xd7f27a;

// 🧱 지오메트리를 제자리에 굽는다 — 위치·크기·회전을 정점에 반영해 색(정점색)과 함께 병합한다(드로우콜 절약).
function baked(geo, x, y, z, { scale = [1, 1, 1], rot = [0, 0, 0] } = {}) {
  geo.applyMatrix4(new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), new THREE.Vector3(...scale)));
  return geo;
}
const paint = (geo, hex, x, y, z, opt) => paintGeo(baked(geo, x, y, z, opt), hex);

// 공방 주인 — 후보 B(반디 요정, 승인안). 형태 12부품 → 메시 3개(불투명 1 · 날개 1 · 빛 1).
function buildKeeper() {
  const k = new THREE.Group();
  const solid = [
    paint(new THREE.IcosahedronGeometry(0.5, 1), 0xe58fb0, 0, 0.55, 0, { scale: [1, 1.05, 1] }),          // 몸
    paint(new THREE.IcosahedronGeometry(0.38, 1), 0xfff1e0, 0, 1.15, 0),                                  // 머리
    paint(new THREE.SphereGeometry(0.36, 14, 10), 0xfaf3e2, 0, 0.48, 0.38, { scale: [1.0, 1.05, 0.5] }),  // 앞치마
  ];
  for (const ex of [-0.13, 0.13]) solid.push(paint(new THREE.SphereGeometry(0.05, 8, 8), 0x2a221e, ex, 1.18, 0.32));   // 눈
  for (const s of [-1, 1]) solid.push(paint(new THREE.CylinderGeometry(0.018, 0.018, 0.42, 5), 0x6b4a5a, s * 0.13, 1.6, 0.04, { rot: [0, 0, -s * 0.35] }));   // 더듬이
  const body = new THREE.Mesh(mergeGeos(solid), vtxMat()); body.castShadow = true; k.add(body);

  const wings = [-1, 1].map(s => baked(new THREE.SphereGeometry(0.55, 14, 10), s * 0.62, 1.1, -0.3, { scale: [0.75, 1.1, 0.08], rot: [0.15, s * 1.0, s * -0.5] }));
  k.add(new THREE.Mesh(mergeGeos(wings), new THREE.MeshStandardMaterial({ color: 0xdff3ff, roughness: 0.4, transparent: true, opacity: 0.62, side: THREE.DoubleSide })));

  const glow = [-1, 1].map(s => baked(new THREE.SphereGeometry(0.06, 8, 6), s * 0.21, 1.8, 0.04));      // 더듬이 빛 끝
  glow.push(baked(new THREE.SphereGeometry(0.24, 12, 10), 0, 0.42, -0.5, { scale: [1, 0.9, 1.25] }));    // 반딧불 꽁무니
  k.add(new THREE.Mesh(mergeGeos(glow), new THREE.MeshBasicMaterial({ color: GLOW })));
  return k;
}

export function buildLightWorkshop() {
  const g = new THREE.Group(); g.position.copy(LIGHT_WORKSHOP); g.rotation.y = -0.35;   // 카메라(남쪽)를 향하게 — 문·창·반디 요정이 보이도록, 계곡 쪽으로 살짝
  const pond = baked(new THREE.CircleGeometry(0.9, 20), -1.6, 0.03, 1.4, { rot: [-Math.PI / 2, 0, 0] });
  const hut = new THREE.Mesh(mergeGeos([
    paint(new THREE.BoxGeometry(2.2, 1.5, 1.8), 0xd8b48a, 0, 0.75, 0),
    paint(new THREE.ConeGeometry(1.75, 1.0, 4), 0x6f8f7a, 0, 2.0, 0, { rot: [0, Math.PI / 4, 0] }),
    paint(new THREE.BoxGeometry(0.55, 0.9, 0.05), 0x8a5a3c, 0, 0.45, 0.92),
    paintGeo(pond, 0x7fb7c9),
  ]), vtxMat());
  hut.castShadow = true; g.add(hut);
  const win = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.35, 0.05), new THREE.MeshBasicMaterial({ color: 0xffe2a0 })); win.position.set(0.68, 0.95, 0.92); g.add(win);
  const k = buildKeeper(); k.position.set(0.9, 0, 1.5); k.rotation.y = 0.3;
  const tag = makeNameTag(KEEPER); tag.position.y = 2.15; k.add(tag);   // 더듬이 끝(1.8) 위
  g.add(k);
  g.add(makeSignpost('🏮 빛 공방', -0.4, 2.2));
  scene.add(g);
  obstacles.push({ x: LIGHT_WORKSHOP.x, z: LIGHT_WORKSHOP.z, r: 1.6 });
  solidCircle(LIGHT_WORKSHOP.x, LIGHT_WORKSHOP.z, 1.3);   // 오두막은 걸어서 못 지나간다
}
