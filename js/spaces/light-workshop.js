// =============================================================
//  🏮 빛 공방 — 반딧불이 계곡 연못가 오두막 + 공방 주인(🧚 반디 요정)
//  ⚠️ game.js 와 순환 import — 로딩 시점엔 game.js 값을 읽지 않는다(함수 안에서만).
// =============================================================
import { clayMat, makeNameTag, makeSignpost, obstacles, scene, solidCircle } from '../game.js';
import { LIGHT_WORKSHOP } from '../data/places.js';
import * as THREE from 'three';

export const KEEPER = { id: 'lightkeeper', emoji: '🧚', name: '반디 요정', color: 0xe58fb0 };
const GLOW = 0xd7f27a;

const glowMat = (color) => new THREE.MeshBasicMaterial({ color });

// 공방 주인 — 후보 B(반디 요정, 승인안). 메시 12개, 주민 몸집(몸 0.5·머리 0.38)과 같은 비율.
function buildKeeper() {
  const k = new THREE.Group();
  const add = (m, x, y, z) => { m.position.set(x, y, z); m.castShadow = true; k.add(m); return m; };
  add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 1), clayMat(0xe58fb0)), 0, 0.55, 0).scale.set(1, 1.05, 1);   // 몸
  add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.38, 1), clayMat(0xfff1e0)), 0, 1.15, 0);                          // 머리
  const eye = new THREE.MeshStandardMaterial({ color: 0x2a221e, roughness: 0.5 });
  for (const ex of [-0.13, 0.13]) add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), eye), ex, 1.18, 0.32);       // 눈 2
  add(new THREE.Mesh(new THREE.SphereGeometry(0.36, 14, 10), clayMat(0xfaf3e2)), 0, 0.48, 0.38).scale.set(1.0, 1.05, 0.5);   // 앞치마
  const wingMat = new THREE.MeshStandardMaterial({ color: 0xdff3ff, roughness: 0.4, transparent: true, opacity: 0.62, side: THREE.DoubleSide });
  for (const s of [-1, 1]) {                                                                                          // 날개 2
    const w = add(new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 10), wingMat), s * 0.62, 1.1, -0.3);
    w.scale.set(0.75, 1.1, 0.08); w.rotation.set(0.15, s * 1.0, s * -0.5); w.castShadow = false;
  }
  const antMat = clayMat(0x6b4a5a);
  for (const s of [-1, 1]) {                                                                                          // 더듬이 2 + 빛 끝 2
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.42, 5), antMat), s * 0.13, 1.6, 0.04).rotation.z = -s * 0.35;
    add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), glowMat(GLOW)), s * 0.21, 1.8, 0.04).castShadow = false;
  }
  const bulb = add(new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), glowMat(GLOW)), 0, 0.42, -0.5);             // 반딧불 꽁무니
  bulb.scale.set(1, 0.9, 1.25); bulb.castShadow = false;
  return k;
}

export function buildLightWorkshop() {
  const g = new THREE.Group(); g.position.copy(LIGHT_WORKSHOP); g.rotation.y = -2.2;   // 계곡 중심을 바라보게
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.5, 1.8), clayMat(0xd8b48a)); body.position.y = 0.75; body.castShadow = true; g.add(body);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.75, 1.0, 4), clayMat(0x6f8f7a)); roof.position.y = 2.0; roof.rotation.y = Math.PI / 4; roof.castShadow = true; g.add(roof);
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.9, 0.05), clayMat(0x8a5a3c)); door.position.set(0, 0.45, 0.92); g.add(door);
  const win = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.35, 0.05), new THREE.MeshBasicMaterial({ color: 0xffe2a0 })); win.position.set(0.68, 0.95, 0.92); g.add(win);
  const pond = new THREE.Mesh(new THREE.CircleGeometry(0.9, 20), clayMat(0x7fb7c9)); pond.rotation.x = -Math.PI / 2; pond.position.set(-1.6, 0.03, 1.4); g.add(pond);
  const k = buildKeeper(); k.position.set(0.9, 0, 1.5); k.rotation.y = 0.3;
  const tag = makeNameTag(KEEPER); tag.position.y = 2.15; k.add(tag);   // 더듬이 끝(1.8) 위
  g.add(k);
  g.add(makeSignpost('🏮 빛 공방', -0.4, 2.2));
  scene.add(g);
  obstacles.push({ x: LIGHT_WORKSHOP.x, z: LIGHT_WORKSHOP.z, r: 1.6 });
  solidCircle(LIGHT_WORKSHOP.x, LIGHT_WORKSHOP.z, 1.3);   // 오두막은 걸어서 못 지나간다
}
