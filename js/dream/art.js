// =============================================================
//  🌙 꿈의 숲 — 조형(THREE 만 의존, 게임 상태 없음)
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-10-08-dream-forest-design.md §3 · 시안 dev/active/dimension-maps/storyboard.html
//  ⚡ 드로우콜 예산 ≤ 60 — 고정 조형은 정점색으로 구워 세 덩어리로 합친다:
//     solid(무광 · 섬·나무 줄기·침대) / glow(발광 · 수정·버섯 갓) / cloud(구름 바다)
//     움직이는 것만 따로 둔다: 디딤돌(InstancedMesh 1콜) · 조각(자리당 3콜, 하루 7개만 보임) · 반딧불(Points 1콜)
//  ⚠️ 블룸 임계 0.85 — 흰색에 가까운 발광은 번진다. 수정은 채도 있는 파스텔로, 하얗게 빛나는 건 조각뿐.
// =============================================================
import * as THREE from 'three';
import { ISLANDS, BRIDGES, SHARD_SPOTS, CLOUD_BED, BRIDGE_HALF } from './layout.js';

const ISLAND_TOP = { main: 0xd9ccff, pink: 0xffd6ec, sky: 0xc6f2ff, star: 0xe2d6ff };
const CRYSTAL = [0xff9ee0, 0x9ee8ff, 0xffd59e, 0xb59eff];
const SHARD_COL = [0xfff09e, 0xff9ee0, 0x9ee8ff];

// ── 굽기: 메시 트리를 정점색 지오메트리 하나로 ──────────────
export function bakeGroup(root) {
  root.updateMatrixWorld(true);
  const inv = root.matrixWorld.clone().invert(), m = new THREE.Matrix4();
  const geos = [];
  root.traverse(o => {
    if (!o.isMesh) return;
    m.multiplyMatrices(inv, o.matrixWorld);
    const g = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(m);
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
    const c = o.material.color, n = g.attributes.position.count, col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geos.push(g);
  });
  const out = new THREE.BufferGeometry();
  for (const name of ['position', 'normal', 'color']) {
    const arr = new Float32Array(geos.reduce((s, g) => s + g.attributes[name].count, 0) * 3);
    let off = 0;
    for (const g of geos) { arr.set(g.attributes[name].array, off); off += g.attributes[name].count * 3; }
    out.setAttribute(name, new THREE.BufferAttribute(arr, 3));
  }
  geos.forEach(g => g.dispose());
  root.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });   // 굽기용 원본은 버린다
  out.computeBoundingSphere();
  return out;
}

const tmpMat = (color) => new THREE.MeshBasicMaterial({ color });   // 굽기 전용 — 색만 읽는다
export function part(parent, geo, color, x = 0, y = 0, z = 0) {
  const o = new THREE.Mesh(geo, tmpMat(color)); o.position.set(x, y, z); parent.add(o); return o;
}

let _haloTex = null;
function haloTexture() {
  if (_haloTex) return _haloTex;
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const g = cv.getContext('2d'); const gr = g.createRadialGradient(32, 32, 1, 32, 32, 31);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.4)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  _haloTex = new THREE.CanvasTexture(cv);
  return _haloTex;
}
function halo(color, size, opacity = 0.7) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTexture(), color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }));
  s.scale.set(size, size, 1);
  return s;
}

// ── 부품 ────────────────────────────────────────────────────
function islandParts(solid, isl) {
  const g = new THREE.Group(); g.position.set(isl.x, 0, isl.z); solid.add(g);
  part(g, new THREE.CylinderGeometry(isl.r, isl.r * 0.93, 0.6, 11), ISLAND_TOP[isl.id], 0, -0.3, 0);
  const under = part(g, new THREE.ConeGeometry(isl.r * 0.93, isl.r * 1.5, 11), 0x8e78c8, 0, -0.6 - isl.r * 0.75, 0); under.rotation.x = Math.PI;
  const drip = part(g, new THREE.ConeGeometry(isl.r * 0.32, isl.r * 0.7, 7), 0x7a64b8, isl.r * 0.38, -0.6 - isl.r * 1.45, 0.3); drip.rotation.x = Math.PI;
  // 풀 얼룩 — 윗면에 살짝 다른 색 원판(밋밋한 판처럼 안 보이게). 겹쳐 깜빡이지 않게 높이를 조금씩 달리 둔다
  for (let i = 0; i < 4; i++) {
    const a = i * 1.7 + isl.x, rr = isl.r * (0.25 + (i % 2) * 0.3);
    const p = part(g, new THREE.CylinderGeometry(isl.r * 0.22, isl.r * 0.22, 0.02, 8), ISLAND_TOP[isl.id], Math.cos(a) * rr, 0.006 + i * 0.004, Math.sin(a) * rr);
    p.material.color.offsetHSL(0, 0, i % 2 ? 0.035 : -0.025);   // 섬 색에서 한 끗만 — 진하면 구멍처럼 보인다(실측 2026-10-08)
  }
}

function crystalTree(solid, glow, x, z, s, col) {
  part(solid, new THREE.CylinderGeometry(0.1 * s, 0.16 * s, 1.2 * s, 5), 0xf0e2ff, x, 0.6 * s, z);
  const c = part(glow, new THREE.OctahedronGeometry(0.85 * s, 0), col, x, 1.75 * s, z); c.scale.set(1, 1.35, 1);
}

function mushroomLamp(solid, glow, x, z, col) {
  part(solid, new THREE.CylinderGeometry(0.08, 0.12, 0.6, 6), 0xffffff, x, 0.3, z);
  part(glow, new THREE.SphereGeometry(0.35, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), col, x, 0.55, z);
}

/** 🛏️ 구름 침대 — 머리가 -z. 꾸미기 가구(☁️ cloudBed)도 같은 부품을 쓴다 */
export function cloudBedParts(parent, glowParent = null) {
  part(parent, new THREE.BoxGeometry(1.5, 0.45, 2.2), 0xb98fd6, 0, 0.22, 0);
  part(parent, new THREE.BoxGeometry(1.42, 0.22, 2.1), 0xfff6ff, 0, 0.55, 0);
  const pillow = part(parent, new THREE.SphereGeometry(0.34, 10, 8), 0xffffff, 0, 0.72, -0.72); pillow.scale.set(1.4, 0.5, 0.9);
  part(parent, new THREE.BoxGeometry(1.46, 0.12, 1.2), 0x9ecbff, 0, 0.68, 0.38);
  [[-0.8, -0.9], [0.8, -0.9], [-0.85, 0.2], [0.85, 0.3], [-0.6, 1.1], [0.6, 1.1]].forEach(([x, z], i) => {
    part(parent, new THREE.IcosahedronGeometry(0.3 + (i % 3) * 0.05, 1), 0xffffff, x, 0.25, z);
  });
  if (glowParent) part(glowParent, new THREE.OctahedronGeometry(0.12, 0), 0xfff09e, 0, 1.25, -1.05);   // 머리맡 작은 별
}

/** 🌙 초승달 마차 — 두 원호(바깥 R1.5 · 안쪽 r1.35 중심 +0.55)로 그린 요람 외곽선을 옆으로 세워 뽑는다.
 *  ⚠️ 시안에서 구멍(hole)으로 파면 안쪽 원이 바깥을 벗어나 삼각분할이 깨져 고리처럼 보였다 — 외곽선을 직접 그린다. */
export function makeMoonCarriage() {
  const root = new THREE.Group(); root.name = 'moonCarriage';
  const R = 1.5, r = 1.35, cy = 0.55, ty = (R * R - r * r + cy * cy) / (2 * cy), tx = Math.sqrt(R * R - ty * ty);
  const aO = Math.atan2(ty, tx), aI = Math.atan2(ty - cy, tx), N = 36;
  const sh = new THREE.Shape();
  for (let i = 0; i <= N; i++) { const a = Math.PI - aO + (Math.PI + 2 * aO) * (i / N); const x = R * Math.cos(a), y = R * Math.sin(a); if (i) sh.lineTo(x, y); else sh.moveTo(x, y); }
  for (let i = 0; i <= N; i++) { const a = 2 * Math.PI + aI - (Math.PI + 2 * aI) * (i / N); sh.lineTo(r * Math.cos(a), cy + r * Math.sin(a)); }
  const geo = new THREE.ExtrudeGeometry(sh, { depth: 1.2, bevelEnabled: true, bevelSize: 0.1, bevelThickness: 0.1, bevelSegments: 2, curveSegments: 24 });
  geo.translate(0, 0, -0.6);
  const moon = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xfff0b0, emissive: 0xd9b45a, emissiveIntensity: 0.35, roughness: 0.6, flatShading: true }));
  moon.rotation.y = Math.PI / 2;   // 진행 방향(+z) 옆에서 보면 초승달
  moon.position.y = 1.5;
  root.add(moon);
  const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.22, 1.3), new THREE.MeshStandardMaterial({ color: 0x8f7ad6, roughness: 0.9, flatShading: true }));
  cushion.position.y = 0.5; root.add(cushion);
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.26, 0.2), new THREE.MeshBasicMaterial({ color: 0xffd27a }));
  lamp.position.set(0, 2.3, 1.55); root.add(lamp);
  const lh = halo(0xffd27a, 1.5, 0.7); lh.position.copy(lamp.position); root.add(lh);
  // ⚡ 털 5덩이+머리는 한 정점색 메시로 굽는다(양 한 마리 6콜→1콜, 🪞 거울 마을 정박 마차까지 ≤60 예산 — 2026-10-08 실측)
  const sheepMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true });
  const wingMat = new THREE.MeshStandardMaterial({ color: 0xe8f4ff, transparent: true, opacity: 0.85, flatShading: true });
  const reinMat = new THREE.MeshBasicMaterial({ color: 0xffd27a });
  const sheep = [];
  [-0.45, 0.45].forEach((sx) => {
    const s = new THREE.Group(); s.position.set(sx, 1.0, 3.0); root.add(s); sheep.push(s);
    const body = new THREE.Group();
    for (let k = 0; k < 5; k++) part(body, new THREE.IcosahedronGeometry(0.3, 1), 0xffffff, ((k * 37) % 5 - 2) * 0.1, ((k * 13) % 3) * 0.08, ((k * 7) % 5 - 2) * 0.14);
    part(body, new THREE.SphereGeometry(0.22, 10, 8), 0x5a4a5a, 0, 0.08, 0.5).scale.set(0.9, 1, 1.15);
    s.add(new THREE.Mesh(bakeGroup(body), sheepMat));
    const wing = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), wingMat); wing.position.y = 0.3; wing.scale.set(1.8, 0.15, 0.6); s.add(wing);
    const rein = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 2.0, 4), reinMat);
    rein.position.set(-sx * 0.45, 0.3, -1.0); rein.rotation.x = Math.PI / 2 - 0.2; s.add(rein);
  });
  root.userData.sheep = sheep;
  root.userData.seatY = 0.62;   // 앉는 높이(플레이어 발바닥 기준)
  return root;
}

/** ✨ 조각 하나 — 결정 + 빛기둥 + 후광 */
function makeShard(spot, i) {
  const g = new THREE.Group(); g.position.set(spot.x, 0, spot.z); g.name = `shard:${spot.id}`;
  const col = SHARD_COL[i % SHARD_COL.length];
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.3, 0), new THREE.MeshBasicMaterial({ color: col }));
  gem.scale.y = 1.6; gem.position.y = 1.0; g.add(gem);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 7, 10, 1, true),
    new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.14, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  beam.position.y = 3.5; g.add(beam);
  const h = halo(col, 2.0, 0.8); h.position.y = 1.0; g.add(h);
  g.userData = { gem, beam, halo: h, phase: i * 1.3 };
  return g;
}

/** 꿈의 숲 전체. 반환 { group, shards: Map<id, Group>, carriage, update(t) } — group 은 DREAM 좌표에 놓는다 */
export function buildDreamWorld() {
  const group = new THREE.Group(); group.name = 'dream';
  const solid = new THREE.Group(), glow = new THREE.Group(), cloud = new THREE.Group();

  // 하늘 구(안개 무시) — 위 남보라 → 아래 라벤더
  const skyGeo = new THREE.SphereGeometry(140, 24, 16);
  const pos = skyGeo.attributes.position, cols = new Float32Array(pos.count * 3);
  const top = new THREE.Color(0x221d55), bot = new THREE.Color(0xc9a6e8), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    c.copy(bot).lerp(top, THREE.MathUtils.clamp(pos.getY(i) / 55 + 0.15, 0, 1));   // 지평선 위 금세 남보라로 — 카메라가 내려다봐도 위쪽은 밤하늘
    cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
  }
  skyGeo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  const sky = new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
  sky.renderOrder = -1; group.add(sky);
  // ⚠️ 황금각 공식(i·2.399, i·0.618)으로 뿌렸더니 별이 점선처럼 줄지어 보였다(실측 2026-10-08) → 시드 난수
  const starPos = new Float32Array(420 * 3);
  let seed = 0x5eed;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 420; i++) {
    const th = rnd() * Math.PI * 2, ph = Math.acos(1 - rnd() * 1.1);
    starPos[i * 3] = 120 * Math.sin(ph) * Math.cos(th); starPos[i * 3 + 1] = 120 * Math.cos(ph) * 0.9 + 4; starPos[i * 3 + 2] = 120 * Math.sin(ph) * Math.sin(th);
  }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  group.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xfff6d8, size: 0.7, sizeAttenuation: true, fog: false, transparent: true, opacity: 0.9 })));
  const moon = new THREE.Mesh(new THREE.IcosahedronGeometry(6, 2), new THREE.MeshBasicMaterial({ color: 0xfff1c0, fog: false }));
  moon.position.set(-45, 42, -95); group.add(moon);
  const mh = halo(0xffeec0, 46, 0.45); mh.material.fog = false; mh.position.copy(moon.position); group.add(mh);

  for (const isl of ISLANDS) islandParts(solid, isl);
  [[-4.0, -2.2, 1.2, 0], [3.8, -3.8, 1.0, 1], [5.0, 0.6, 0.8, 2], [-14.6, -14.0, 1.4, 3], [12.0, -16.6, 1.1, 0], [14.8, -15.8, 0.9, 2], [21.0, 1.6, 1.0, 1]]
    .forEach(([x, z, s, ci]) => crystalTree(solid, glow, x, z, s, CRYSTAL[ci]));
  [[1.8, 5.0, 0xffb3e6], [-0.6, 5.6, 0x9ef0ff], [-1.2, -5.4, 0xfff09e], [-12.4, -11.2, 0x9ef0ff], [13.6, -12.6, 0xffb3e6]]
    .forEach(([x, z, col]) => mushroomLamp(solid, glow, x, z, col));
  const bed = new THREE.Group(); bed.position.set(CLOUD_BED.x, 0, CLOUD_BED.z); solid.add(bed);
  const bedGlow = new THREE.Group(); bedGlow.position.copy(bed.position); glow.add(bedGlow);
  cloudBedParts(bed, bedGlow);
  // 구름 바다(발밑 멀리) — 섬이 떠 있다는 감각의 절반이 이것
  //   ⚠️ 섬 바로 밑(y -9, 반경 14)에 두니 카메라 높이에서 회색 덩어리로 화면을 막았다(실측 2026-10-08) → 더 낮고 멀리
  for (let i = 0; i < 20; i++) {
    const a = i * 2.39996, rr = 26 + (i * 9.1) % 38;
    const cg = new THREE.Group(); cg.position.set(Math.cos(a) * rr + 3, -16 - (i % 4) * 2.2, Math.sin(a) * rr - 6); cloud.add(cg);
    for (let k = 0; k < 4; k++) part(cg, new THREE.IcosahedronGeometry(2.2 + (k % 2) * 0.9, 1), 0xf4eeff, k * 2.8 - 4.2, (k % 2) * 0.6, ((k * 3) % 4) * 0.5 - 0.75);
  }

  const vtx = (opts) => new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9, ...opts });
  group.add(new THREE.Mesh(bakeGroup(solid), vtx({})));
  group.add(new THREE.Mesh(bakeGroup(glow), new THREE.MeshBasicMaterial({ vertexColors: true })));
  group.add(new THREE.Mesh(bakeGroup(cloud), vtx({ roughness: 1, transparent: true, opacity: 0.85, emissive: 0x6a5aa8, emissiveIntensity: 0.35 })));   // 달빛 받은 구름 — 무광이면 보라 앰비언트에 회색으로 죽는다
  [[-4.0, 2.1, -2.2, CRYSTAL[0], 3.2], [3.8, 1.8, -3.8, CRYSTAL[1], 2.8], [-14.6, 2.4, -14.0, CRYSTAL[3], 3.6], [13.4, 1.9, -16.2, CRYSTAL[0], 3.0]]
    .forEach(([x, y, z, col, s]) => { const h = halo(col, s, 0.35); h.position.set(x, y, z); group.add(h); });

  // 디딤돌 — 다리를 따라 1.3 간격(섬 안쪽은 건너뜀). InstancedMesh 하나로 떠다니게
  const stones = [];
  const main = ISLANDS[0];
  for (const b of BRIDGES) {
    const to = ISLANDS.find(i => i.id === b.to);
    const len = Math.hypot(b.bx - b.ax, b.bz - b.az);
    for (let d = main.r - 0.3; d < len - to.r + 0.3; d += 1.3) stones.push({ x: b.ax + (b.bx - b.ax) * d / len, z: b.az + (b.bz - b.az) * d / len, ph: d });
  }
  const stoneMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(BRIDGE_HALF * 0.95, BRIDGE_HALF * 0.7, 0.3, 7),
    new THREE.MeshStandardMaterial({ color: 0xeadfff, flatShading: true, roughness: 0.9 }), stones.length);
  group.add(stoneMesh);
  const _m = new THREE.Matrix4();

  const ffPos = new Float32Array(60 * 3);
  for (let i = 0; i < 60; i++) { ffPos[i * 3] = ((i * 53) % 44) - 18; ffPos[i * 3 + 1] = 0.6 + ((i * 17) % 60) / 10; ffPos[i * 3 + 2] = ((i * 29) % 34) - 22; }
  const ffGeo = new THREE.BufferGeometry(); ffGeo.setAttribute('position', new THREE.BufferAttribute(ffPos, 3));
  const fireflies = new THREE.Points(ffGeo, new THREE.PointsMaterial({ color: 0xffe9a8, size: 0.28, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
  group.add(fireflies);

  const shards = new Map();
  SHARD_SPOTS.forEach((s, i) => { const m = makeShard(s, i); m.visible = false; shards.set(s.id, m); group.add(m); });

  const carriage = makeMoonCarriage();
  group.add(carriage);

  function update(t) {
    for (let i = 0; i < stones.length; i++) {
      const s = stones[i];
      _m.makeTranslation(s.x, -0.15 + Math.sin(t * 1.1 + s.ph) * 0.06, s.z); stoneMesh.setMatrixAt(i, _m);
    }
    stoneMesh.instanceMatrix.needsUpdate = true;
    for (const g of shards.values()) {
      if (!g.visible) continue;
      const u = g.userData;
      u.gem.rotation.y = t * 1.5 + u.phase;
      u.gem.position.y = u.halo.position.y = 1.0 + Math.sin(t * 2 + u.phase) * 0.15;
      u.beam.material.opacity = 0.1 + Math.sin(t * 1.7 + u.phase) * 0.04;
    }
    fireflies.material.opacity = 0.65 + Math.sin(t * 3) * 0.25;
    for (const s of carriage.userData.sheep) s.position.y = 1.0 + Math.sin(t * 2.2 + s.position.x * 3) * 0.12;
  }
  update(0);

  return { group, shards, carriage, update };
}
