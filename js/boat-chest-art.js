// =============================================================
//  🧰 나룻배 보물상자 조형 — 상자(A2 확정안) · 보상 3D 모형 · 개봉 빛줄기
//  ------------------------------------------------------------
//  시안: sims/boat-chest-sim.html (?set=A · ?mode=pickup · ?mode=items · ?mode=result) — 2026-09-29 승인.
//  ▶ A2: 나무 궤짝 + 금테 두 줄 + 자물쇠, 옆에 작은 부표(0.75배·채도 낮춘 빨강·깃발 없음)를 밧줄로.
//        B안처럼 부표가 크면 궤짝보다 부표가 먼저 보였다 — 크기를 올리지 말 것.
//  ▶ 🌙 밤: 금테·자물쇠만 은은하게(emissive 0.55) + 둘레 물빛(방사형 그라데이션, 더하기 혼합).
//        게임 블룸 임계 0.85 를 넘지 않는 세기 — 나룻배 등불 함정(js/boat-lamp.js)과 같은 규칙.
//  ▶ 보상은 이모지 스프라이트가 아니라 로우폴리 모형 — 평면 이모지가 로우폴리 화면에서 튄다(사용자).
//        문법은 게임 cropMini(로우폴리 열매 + 원뿔 잎, clayMat)와 같다.
//  ▶ 같은 재질끼리 합친다(금테 몸통·금테 뚜껑·부표 빨강 …) — 강 코스 드로우콜을 아낀다.
//  ▶ 재질 팩토리(wood)는 호출부가 넘긴다 — 게임은 woodMat(나뭇결), 없으면 단색. game.js 를 import 하지 않는다.
// =============================================================
import * as THREE from 'three';

export const CHEST_SCALE = 1.25;   // 1인칭 11m 거리에서 ⭐별조각보다 작아 안 읽혀서 키웠다(시안 실측)
const W = 1.0, D = 0.66, H = 0.52;

const clay = (color, flat = true) => new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0, flatShading: flat });
const plainWood = (rx, ry, tint = 0xc89560) => clay(tint);

// 변환을 구워 넣은 지오메트리들을 하나로(게임 mergeGeos 와 같은 방식 — 비인덱스 + 속성 이어 붙이기)
function merge(geos) {
  const flat = geos.map(g => (g.index ? g.toNonIndexed() : g));
  const out = new THREE.BufferGeometry();
  for (const name of ['position', 'normal', 'uv']) {
    if (!flat.every(g => g.attributes[name])) continue;
    const size = flat[0].attributes[name].itemSize;
    const arr = new Float32Array(flat.reduce((n, g) => n + g.attributes[name].count, 0) * size);
    let off = 0;
    for (const g of flat) { arr.set(g.attributes[name].array, off); off += g.attributes[name].count * size; }
    out.setAttribute(name, new THREE.BufferAttribute(arr, size));
  }
  return out;
}
const placed = (geo, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s = [1, 1, 1]) =>
  geo.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(...s)));

// 가장자리가 부드럽게 사라지는 물빛 — 납작한 원판처럼 보이지 않게(시안에서 원판이 판때기로 보였다)
let _haloTex = null;
function haloTex() {
  if (_haloTex) return _haloTex;
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  return (_haloTex = new THREE.CanvasTexture(c));
}

// 작은 부표 — 궤짝 오른쪽 옆, 밧줄로 묶임. 개봉 연출에선 물에 남는다(userData.isBuoy)
function smallBuoy() {
  const grp = new THREE.Group(); grp.userData.isBuoy = true;
  const s = 0.75, at = new THREE.Vector3(1.0, 0.12, 0.05), from = new THREE.Vector3(0.5, 0.3, 0.05);
  const red = merge([placed(new THREE.SphereGeometry(0.3 * s, 10, 8), at.x, at.y + 0.1 * s, at.z, 0, 0, 0, [1, 1.15, 1])]);
  const white = merge([
    placed(new THREE.CylinderGeometry(0.305 * s, 0.305 * s, 0.14 * s, 12), at.x, at.y + 0.1 * s, at.z),
    placed(new THREE.CylinderGeometry(0.035 * s, 0.035 * s, 0.4 * s, 5), at.x, at.y + 0.5 * s, at.z),
  ]);
  grp.add(new THREE.Mesh(red, clay(0xd4574c)), new THREE.Mesh(white, clay(0xf6f1e6)));
  const len = from.distanceTo(at);
  const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, len, 5), clay(0xd9c49a));
  rope.position.copy(from).add(at).multiplyScalar(0.5);
  rope.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), at.clone().sub(from).normalize());
  grp.add(rope);
  return grp;
}

/**
 * 상자 메시. 반환 그룹의 userData: { body, lid(경첩 pivot), gold, halo, ring, glint, buoy, H, bodyY }
 * @param {{ wood?: (rx:number, ry:number, tint:number) => THREE.Material, buoy?: boolean }} opts
 */
export function makeChestMesh({ wood = plainWood, buoy = true } = {}) {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const gold = new THREE.MeshStandardMaterial({ color: 0xf0c04a, roughness: 0.45, metalness: 0.35, flatShading: true, emissive: 0xffb830, emissiveIntensity: 0 });
  const box = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), wood(2, 1, 0xa9743f)); box.position.y = H / 2; box.castShadow = true; body.add(box);
  // 둥근 뚜껑 — 위 반원통(θ 0~π 를 z축 회전하면 윗반원). 뒤 모서리 경첩으로 열린다(개봉 화면)
  const lid = new THREE.Group(); lid.position.set(0, H, -D / 2); body.add(lid);
  const lidGeo = new THREE.CylinderGeometry(D / 2, D / 2, W, 10, 1, false, 0, Math.PI); lidGeo.rotateZ(Math.PI / 2);
  const lidMat = wood(2, 1, 0x9a6636); lidMat.side = THREE.DoubleSide;          // 열리면 안쪽 면이 보인다
  const lidMesh = new THREE.Mesh(lidGeo, lidMat); lidMesh.position.z = D / 2; lid.add(lidMesh);
  const inside = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.1, D - 0.1), clay(0x3a2412));   // 열렸을 때 보이는 안쪽
  inside.rotation.x = -Math.PI / 2; inside.position.y = H + 0.002; body.add(inside);
  // 금테 — 몸통(띠 2 + 자물쇠) 한 덩어리, 뚜껑(아치 2) 한 덩어리
  const bodyGold = merge([
    ...[-W * 0.3, W * 0.3].map(x => placed(new THREE.BoxGeometry(0.09, H + 0.02, D + 0.03), x, H / 2, 0)),
    placed(new THREE.BoxGeometry(0.2, 0.24, 0.07), 0, H * 0.92, D / 2 + 0.03),
  ]);
  const lidGold = merge([-W * 0.3, W * 0.3].map(x => placed(new THREE.TorusGeometry(D / 2 + 0.015, 0.045, 5, 10, Math.PI), x, 0, D / 2, 0, Math.PI / 2, 0)));
  body.add(new THREE.Mesh(bodyGold, gold)); lid.add(new THREE.Mesh(lidGold, gold));
  const b = buoy ? smallBuoy() : null; if (b) body.add(b);
  body.position.y = -0.2;                                          // 반쯤 잠김
  // 물결 고리 + 반짝임 1개 + 🌙 물빛(밤에만)
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.72, 0.81, 28),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.02; g.add(ring);
  const glint = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0),
    new THREE.MeshStandardMaterial({ color: 0xfff3b0, emissive: 0xffd35a, emissiveIntensity: 0.6 }));
  glint.scale.set(1, 1.8, 1); glint.position.y = 1.25; g.add(glint);
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4),
    new THREE.MeshBasicMaterial({ map: haloTex(), color: 0xffc860, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
  halo.rotation.x = -Math.PI / 2; halo.position.y = 0.03; halo.visible = false; g.add(halo);
  g.scale.setScalar(CHEST_SCALE);
  Object.assign(g.userData, { body, lid, gold, halo, ring, glint, buoy: b, H, bodyY: body.position.y });
  return g;
}

// 🌙 밤이면 금테 발광 + 물빛. 풀에서 꺼낼 때마다 그 판의 밤낮으로 맞춘다
export function setChestNight(g, night) {
  const u = g.userData;
  u.gold.emissiveIntensity = night ? 0.55 : 0;
  u.glint.material.emissiveIntensity = night ? 0.8 : 0.6;
  u.halo.visible = !!night;
}

// 떠 있는 동안 — 까딱 흔들림 · 물결 고리 퍼짐 · 반짝임 회전
export function animateChest(g, t, phase = 0) {
  const u = g.userData;
  u.body.position.y = u.bodyY + Math.sin(t * 2.2 + phase) * 0.05;
  u.body.rotation.z = Math.sin(t * 1.6 + phase) * 0.06;
  const k = (t * 0.7) % 1; u.ring.scale.setScalar(1 + k * 0.5); u.ring.material.opacity = 0.55 * (1 - k);
  u.glint.rotation.y = t * 2.4;
}

// 개봉 화면(R3) 뒤의 금빛 빛줄기 — 더하기 혼합 쐐기 8개
export function makeChestRays() {
  const g = new THREE.Group();
  for (let i = 0; i < 8; i++) {
    const geo = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, -0.12, 1.4, 0, 0.12, 1.4, 0], 3));
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffd35a, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    m.rotation.z = (i / 8) * Math.PI * 2; g.add(m);
  }
  return g;
}

// 🌱 묘목 — 삼베로 싼 뿌리 흙덩이 + 줄기 + 잎 뭉치 + 열매 하나(열매 색만 종마다 다르다)
const SAPLING_FRUIT = { sap_apple: 0xe0473e, sap_peach: 0xffa28a, sap_chestnut: 0x8b5a2b };

/** 보상 3D 모형(높이 ≈ 0.5). id 는 CHEST_LOOT id — 모르는 id 면 빈 그룹 */
export function makeLootMesh(id) {
  const g = new THREE.Group();
  const add = (geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); g.add(m); return m; };
  if (id === 'sap_apple' || id === 'sap_peach' || id === 'sap_chestnut') {
    add(new THREE.IcosahedronGeometry(0.16, 0), clay(0xa8784a), 0, 0.1, 0).scale.set(1, 0.75, 1);
    add(new THREE.TorusGeometry(0.12, 0.025, 4, 10), clay(0xd9c49a), 0, 0.17, 0, Math.PI / 2);
    add(new THREE.CylinderGeometry(0.025, 0.035, 0.34, 5), clay(0x8a6a4a), 0, 0.36, 0);
    const leaves = merge([[0, 0.58, 0, 0.17], [0.11, 0.5, 0.04, 0.12], [-0.1, 0.52, -0.03, 0.12]]
      .map(([x, y, z, s]) => placed(new THREE.IcosahedronGeometry(s, 0), x, y, z)));
    g.add(new THREE.Mesh(leaves, clay(0x6fb06a)));
    add(new THREE.IcosahedronGeometry(0.07, 0), clay(SAPLING_FRUIT[id], false), 0.1, 0.43, 0.1);
  } else if (id === 'bait') {
    add(new THREE.CylinderGeometry(0.15, 0.15, 0.22, 10), clay(0x9aa6ad), 0, 0.11, 0);            // 깡통
    add(new THREE.CylinderGeometry(0.152, 0.152, 0.08, 10), clay(0x4f8fbf), 0, 0.12, 0);          // 띠 라벨
    add(new THREE.TorusGeometry(0.08, 0.03, 5, 10, Math.PI * 1.3), clay(0xe99aa6), 0.02, 0.26, 0, 0, 0, 0.4).scale.set(1, 1.2, 1);   // 지렁이
  } else if (id === 'fert') {
    add(new THREE.SphereGeometry(0.2, 8, 6), clay(0xd8b98a), 0, 0.18, 0).scale.set(1, 1.1, 0.8);  // 자루
    add(new THREE.CylinderGeometry(0.05, 0.09, 0.1, 6), clay(0xc2a070), 0, 0.4, 0);               // 묶은 목
    const sprout = merge([
      placed(new THREE.ConeGeometry(0.05, 0.12, 5), -0.04, 0.5, 0, 0, 0, 0.5),
      placed(new THREE.ConeGeometry(0.05, 0.12, 5), 0.04, 0.5, 0, 0, 0, -0.5),
      placed(new THREE.CircleGeometry(0.07, 8), 0, 0.2, 0.162),                                    // 앞면 새싹 문양
    ]);
    g.add(new THREE.Mesh(sprout, clay(0x6fb06a)));
  } else if (id === 'gem') {
    const m = new THREE.MeshStandardMaterial({ color: 0x7fd6e8, roughness: 0.25, metalness: 0.1, flatShading: true, emissive: 0x2f8fa3, emissiveIntensity: 0.25 });
    add(new THREE.OctahedronGeometry(0.2, 0), m, 0, 0.26, 0).scale.set(1, 1.3, 1);               // 깎은 보석
  } else if (id === 'color') {
    add(new THREE.CylinderGeometry(0.16, 0.15, 0.24, 10), clay(0xeceae4), 0, 0.12, 0);            // 페인트 통
    const paint = merge([
      placed(new THREE.CylinderGeometry(0.14, 0.14, 0.02, 10), 0, 0.245, 0),
      placed(new THREE.SphereGeometry(0.035, 6, 4), 0.15, 0.2, 0.03, 0, 0, 0, [0.7, 1.6, 0.7]),   // 흘러내린 방울
    ]);
    g.add(new THREE.Mesh(paint, clay(0x7ec4e8)));
    add(new THREE.TorusGeometry(0.15, 0.012, 4, 12, Math.PI), clay(0x5d5b57), 0, 0.24, 0, 0, Math.PI / 2);   // 손잡이
    add(new THREE.BoxGeometry(0.05, 0.3, 0.03), clay(0xc89560), -0.06, 0.36, 0, 0, 0, 0.35);       // 붓 자루
    add(new THREE.BoxGeometry(0.07, 0.08, 0.04), clay(0xe86a5a), -0.11, 0.21, 0, 0, 0, 0.35);      // 붓 끝
  }
  return g;
}
