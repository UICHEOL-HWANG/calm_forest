// =============================================================
//  🏮 빛 공방 — 계곡과 천문대 사이 빈터의 연못가 오두막 + 공방 주인(🧚 반디 요정)
//  ⚠️ game.js 와 순환 import — 로딩 시점엔 game.js 값을 읽지 않는다(함수 안에서만).
// =============================================================
import { makeNameTag, makeSignpost, mergeGeos, obstacles, paintGeo, player, scene, solidBox, solidCircle, vtxMat } from '../game.js';
import { fadeNameTag } from './npc.js';

let keeperTag = null, keeperAt = null;   // 🏷️ 반디 요정 이름표 — updateLightWorkshop 이 거리로 켠다
import { LIGHT_WORKSHOP, LIGHT_WORKSHOP_POND } from '../data/places.js';
import { buildCartGeos, buildHutGeos } from './light-workshop-hut.js';
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
  const g = new THREE.Group(); g.position.copy(LIGHT_WORKSHOP); g.rotation.y = 0;   // 문·창·반디 요정이 카메라(남쪽)를 정면으로 본다
  // 🧱 벽돌·기와 오두막(C안) + 손수레 + 연못 — 정점색 한 메시 · 창·문 안쪽 불빛 한 메시 → 드로우콜 2
  const { solid, glow } = buildHutGeos(THREE);
  const cartAt = new THREE.Matrix4().makeRotationY(Math.PI / 2 - 0.2).setPosition(-1.65, 0, -0.5);   // 왼쪽 박공 옆, 뒤쪽 — 손잡이가 팻말에 닿지 않게
  solid.push(...buildCartGeos(THREE, cartAt));
  solid.push(paintGeo(baked(new THREE.CircleGeometry(LIGHT_WORKSHOP_POND.r, 20), LIGHT_WORKSHOP_POND.x, 0.03, LIGHT_WORKSHOP_POND.z, { rot: [-Math.PI / 2, 0, 0] }), 0x7fb7c9));   // 연못
  const hut = new THREE.Mesh(mergeGeos(solid), vtxMat());
  hut.castShadow = true; hut.receiveShadow = true; g.add(hut);
  g.add(new THREE.Mesh(mergeGeos(glow), new THREE.MeshBasicMaterial({ color: 0xffe2a0 })));
  const k = buildKeeper(); k.position.set(2, 0, 1.8); k.rotation.y = -0.45;   // 창 오른쪽 앞 — 왼쪽 날개(폭 ~0.5)가 벽·처마(x≤1.32, z≤1.17)에 박히지 않게(1.55,1.45 에선 관통)
  const tag = makeNameTag(KEEPER); tag.position.y = 2.15; k.add(tag);   // 더듬이 끝(1.8) 위
  keeperTag = tag; keeperAt = { x: LIGHT_WORKSHOP.x + k.position.x, z: LIGHT_WORKSHOP.z + k.position.z };
  g.add(k);
  g.add(makeSignpost('🏮 빛 공방', -1.85, 1.2));   // 왼쪽 앞 모서리(연못 옆) — 창·열린 문짝을 가리지 않는다
  scene.add(g);
  obstacles.push({ x: LIGHT_WORKSHOP.x, z: LIGHT_WORKSHOP.z, r: 3.4 });   // 밭 금지 — 오두막·손수레·연못·요정까지
  // 🚧 걸어서 뚫지 못하게(2026-10-09 격자 검수: 원 하나로는 벽 모서리·손수레 손잡이·요정 몸을 통과했다)
  const { x: wx, z: wz } = LIGHT_WORKSHOP;
  solidBox(wx - 1.17, wz - 0.97, wx + 1.17, wz + 0.97);   // 벽돌 벽(반폭 1.1·0.9 + 들쭉날쭉)
  solidBox(wx - 0.76, wz + 0.97, wx + 0.06, wz + 1.14);   // 열린 문짝 두 장
  solidCircle(wx - 1.65, wz - 0.5, 0.45);                 // 🛒 손수레 짐칸·바퀴
  solidCircle(wx - 1.77, wz + 0.09, 0.35);                // 🛒 손잡이(앞으로 뻗음)
  solidCircle(wx + k.position.x, wz + k.position.z, 0.58); // 🧚 반디 요정 몸(앞치마 0.56 까지)
}

/** 🏷️ 게임 루프(updateNPC 옆)에서 — 반디 요정 이름표를 마을 주민과 같은 거리 규칙으로 켠다 */
export function updateLightWorkshop() {
  if (keeperTag) fadeNameTag(keeperTag, Math.hypot(player.position.x - keeperAt.x, player.position.z - keeperAt.z));
}
