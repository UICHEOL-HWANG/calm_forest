// js/cosmetics/skin.js
// =============================================================
//  calm forest · 🧥 전신 스킨 조형 — 🌿 숲의 정령(S3) · 🧸 플러시 인형(P1)
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-10-01-premium-skins-design.md §3 · 시안 sims/skin-look-sim.html
//  ▶ **덧입히기**(결정 A): buildAnimalMesh 가 만든 캐릭터를 받아 재질·장식만 바꾼다. 7종 공통.
//    모자·목·등 앵커는 건드리지 않는다 → 다른 꾸미기와 같이 입는다.
//  ▶ 부위는 userData.part 표식으로 찾는다(animal-faces.js · game.js buildAnimalMesh).
//  ▶ ⚠️ 캐릭터 원래 재질은 월드·미리보기와 공유 — dispose 금지. 스킨 재질은 모듈 캐시(스킨·색당 1벌).
//  ▶ ⚠️ Color 내부값은 선형이다 — 밝기 판정은 getHex()(sRGB). 시안에서 갈색 발바닥이 "어두움"으로 잡혔다.
//  ▶ 드로우콜: 정령 ≤ +4(껍질 2·알갱이 1·새싹 1) · 인형 ≤ +6(땀·단추·테·구멍·패치판, 재질별 병합)
// =============================================================
import { mergeGeos } from './trail.js';
import { bellyPatchZ } from './skin-rules.js';

export const SKIN_IDS = Object.freeze(['forest_spirit', 'plush_doll']);

const SPIRIT = { body: 0x5fc4a8, emissive: 0x1f7a68, ei: 0.8, opacity: 0.6, rim: 0x9af0c8, rimOpacity: 0.22, rimGrow: 1.06,
  mote: 0xe6ff9a, moteSize: 0.09, motes: 26, sprout: 0x9be07a, sproutGlow: 0x3f9a40 };
//  🐤 병아리는 정수리에 볏(z 0.05~−0.38)이 있다 — 새싹을 이마 쪽으로 비켜 세운다(머리 단위 공간)
const SPROUT_AT = { default: [0, 0.96, 0.05], chick: [0, 0.86, 0.45] };
const PLUSH = { patch: 0xf6e6c8, button: 0x3b2a22, hole: 0xcdbca4, threadK: 0.55 };

const cache = new Map();
const cached = (key, make) => { if (!cache.has(key)) cache.set(key, make()); return cache.get(key); };
const srgbSum = (c) => { const h = c.getHex(); return (((h >> 16) & 255) + ((h >> 8) & 255) + (h & 255)) / 255; };
const isDark = (m) => !!m.material?.color && srgbSum(m.material.color) < 0.5;
const part = (o) => o.userData?.part;
const own = (m) => { m.userData.skinOwned = true; m.userData.skin = true; return m; };

function headOf(g) { return g.children.find(c => part(c) === 'head') || null; }
function skullOf(head) { return head?.children.find(c => part(c) === 'skull') || null; }

/** 타원체(중심 c, 반축 ax) 표면에서 방향 d 쪽 점 · 법선 */
function onEllipsoid(THREE, c, ax, d) {
  const n = d.clone().normalize();
  const s = 1 / Math.sqrt((n.x / ax.x) ** 2 + (n.y / ax.y) ** 2 + (n.z / ax.z) ** 2);
  const p = c.clone().addScaledVector(n, s);
  return { p, nrm: p.clone().sub(c).divide(ax).divide(ax).normalize() };
}
/** 타원체 위 대원 — axis 'x' 면 yz 평면(정수리), 'z' 면 xy 평면(옆구리) */
function arcOn(THREE, c, ax, axis, t0, t1, n, lift = 1.012) {
  const u = new THREE.Vector3(0, 1, 0), v = axis === 'x' ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(1, 0, 0);
  const big = ax.clone().multiplyScalar(lift), pts = [];
  for (let i = 0; i <= n; i++) {
    const t = t0 + (t1 - t0) * i / n;
    pts.push(onEllipsoid(THREE, c, big, u.clone().multiplyScalar(Math.cos(t)).addScaledVector(v, Math.sin(t))).p);
  }
  return pts;
}

/** 스테이징 → 재질별로 한 메시씩 구워 parent 에 붙인다.
 *  ⚠️ stage 는 **부모 없이** 만든 그룹 — 그래야 matrixWorld 가 곧 parent 좌표계다. */
function bakeInto(THREE, parent, stage) {
  stage.updateMatrixWorld(true);
  const byMat = new Map(), out = [];
  stage.traverse(o => {
    if (!o.isMesh) return;
    const geo = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(o.matrixWorld);
    if (!byMat.has(o.material)) byMat.set(o.material, []);
    byMat.get(o.material).push(geo);
    o.geometry.dispose();
  });
  for (const [mat, geos] of byMat) {
    const m = own(new THREE.Mesh(mergeGeos(THREE, geos), mat));
    m.castShadow = false;
    parent.add(m);
    geos.forEach(g => g.dispose());
    out.push(m);
  }
  return out;
}

/** 바늘땀 — 점열을 둘씩 짝지어 짧은 캡슐(간격이 생겨 점선이 된다) */
function stitches(THREE, stage, pts, mat, w) {
  for (let i = 0; i < pts.length - 1; i += 2) {
    const a = pts[i], b = pts[i + 1], len = a.distanceTo(b);
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(w, Math.max(0.001, len - 2 * w), 2, 6), mat);
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    stage.add(m);
  }
}

// ── 🌿 숲의 정령 ──────────────────────────────────────────────
function applySpirit(THREE, built) {
  const g = built.group, { id, R, bs, bodyY, HR, HY } = built.k;
  const bodyMat = cached('spirit-body', () => new THREE.MeshStandardMaterial({ color: SPIRIT.body, emissive: SPIRIT.emissive,
    emissiveIntensity: SPIRIT.ei, roughness: 0.5, transparent: true, opacity: SPIRIT.opacity, depthWrite: false }));
  const rimMat = cached('spirit-rim', () => new THREE.MeshBasicMaterial({ color: SPIRIT.rim, side: THREE.BackSide, transparent: true,
    opacity: SPIRIT.rimOpacity, depthWrite: false, blending: THREE.AdditiveBlending }));
  const shells = [];
  g.traverse(o => {
    if (!o.isMesh || o.userData.skin) return;
    if (part(o) === 'pupil' || part(o) === 'highlight' || isDark(o)) return;   // 눈·검은 무늬(판다 팔·귀)는 남긴다 — 무슨 동물인지 읽히게
    o.material = bodyMat;
    o.castShadow = false;   // 반투명 몸이 단단한 그림자를 드리우지 않게
    if (part(o) === 'body' || part(o) === 'skull') shells.push(o);
  });
  //  빛 테두리 — 몸통·두개에만 뒤집힌 껍질 한 겹(가장자리가 번진다). 지오메트리는 원본 공유(새로 안 만든다)
  for (const o of shells) {
    const s = new THREE.Mesh(o.geometry, rimMat);
    s.userData.skin = true;
    s.position.copy(o.position); s.rotation.copy(o.rotation); s.scale.copy(o.scale).multiplyScalar(SPIRIT.rimGrow);
    o.parent.add(s);
  }
  //  머리 새싹 — 줄기 + 잎 2장, 한 메시로
  const head = headOf(g);
  if (head) {
    const mat = cached('spirit-sprout', () => new THREE.MeshStandardMaterial({ color: SPIRIT.sprout, emissive: SPIRIT.sproutGlow, emissiveIntensity: 0.6, roughness: 0.6 }));
    const wrap = new THREE.Group(), stage = new THREE.Group();
    stage.position.set(...(SPROUT_AT[id] || SPROUT_AT.default));
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.045, 0.32, 6), mat); stem.position.y = 0.14; stage.add(stem);
    [-1, 1].forEach(k => {
      const l = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), mat);
      l.position.set(k * 0.17, 0.33, 0); l.scale.set(1, 0.32, 0.6); l.rotation.z = k * 0.45; stage.add(l);
    });
    wrap.add(stage);
    bakeInto(THREE, head, wrap).forEach(m => { m.userData.part = 'sprout'; });   // 모자를 쓰면 showSprout 가 숨긴다
  }
  //  몸속 빛 알갱이 — Points 1개. 궤도는 skinTick 이 돌린다(시드는 결정적 — 미리보기와 월드가 같게)
  const n = SPIRIT.motes, pos = new Float32Array(n * 3), seed = [];
  for (let i = 0; i < n; i++) {
    const inHead = i % 3 === 0;
    seed.push({ cy: inHead ? HY : bodyY, rr: inHead ? HR * 0.7 : R * 0.75, a: (i * 2.39) % 6.28, b: (i * 1.31) % 6.28, sp: 0.3 + (i % 5) * 0.1 });
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const tex = cached('spirit-mote-tex', () => {
    const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d');
    const gr = x.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(c);
  });
  const moteMat = cached('spirit-mote', () => new THREE.PointsMaterial({ color: SPIRIT.mote, size: SPIRIT.moteSize, map: tex,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  const pts = own(new THREE.Points(geo, moteMat));
  pts.renderOrder = 5; pts.frustumCulled = false;
  g.add(pts);
  const tick = (t) => {
    seed.forEach((s, i) => {
      const a = s.a + t * s.sp, b = s.b + t * s.sp * 0.7;
      pos[i * 3] = Math.cos(a) * Math.sin(b) * s.rr * bs[0];
      pos[i * 3 + 1] = s.cy + Math.cos(b) * s.rr * 0.9;
      pos[i * 3 + 2] = Math.sin(a) * Math.sin(b) * s.rr * bs[2];
    });
    geo.attributes.position.needsUpdate = true;
  };
  tick(0);
  g.userData.skinTick = tick;
}

// ── 🧸 플러시 인형 ────────────────────────────────────────────
function applyPlush(THREE, built) {
  const g = built.group, { R, bs, bodyY } = built.k;
  let bodyMesh = null; g.traverse(o => { if (part(o) === 'body') bodyMesh = o; });
  const bodyHex = bodyMesh ? bodyMesh.material.color.getHex() : 0xc8a080;
  const threadHex = new THREE.Color(bodyHex).multiplyScalar(PLUSH.threadK).getHex();
  const thread = cached(`plush-thread-${threadHex}`, () => new THREE.MeshStandardMaterial({ color: threadHex, roughness: 0.9 }));

  //  몸 좌표계: 옆구리 솔기 2줄 + 배 천 패치(판 + 테두리 땀)
  const bodyStage = new THREE.Group();
  const c = new THREE.Vector3(0, bodyY, 0), ax = new THREE.Vector3(R * bs[0], R * bs[1], R * bs[2]);
  stitches(THREE, bodyStage, arcOn(THREE, c, ax, 'z', 0.4, 2.5, 21), thread, 0.016);
  stitches(THREE, bodyStage, arcOn(THREE, c, ax, 'z', -2.5, -0.4, 21), thread, 0.016);
  const w = R * 0.62, h = R * 0.52;
  const patch = new THREE.Group();
  patch.position.set(0, bodyY - R * 0.16, bellyPatchZ(R, bs));
  patch.rotation.z = 0.08;
  const shape = new THREE.Shape(); const r = Math.min(w, h) * 0.28, x = -w / 2, y = -h / 2;
  shape.moveTo(x + r, y); shape.lineTo(x + w - r, y); shape.quadraticCurveTo(x + w, y, x + w, y + r);
  shape.lineTo(x + w, y + h - r); shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  shape.lineTo(x + r, y + h); shape.quadraticCurveTo(x, y + h, x, y + h - r);
  shape.lineTo(x, y + r); shape.quadraticCurveTo(x, y, x + r, y);
  const patchMat = cached('plush-patch', () => new THREE.MeshStandardMaterial({ color: PLUSH.patch, roughness: 0.92 }));
  const plate = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: w * 0.04, bevelEnabled: true, bevelSize: w * 0.02,
    bevelThickness: w * 0.02, bevelSegments: 2, curveSegments: 6 }), patchMat);
  plate.position.z = -w * 0.03; patch.add(plate);
  stitches(THREE, patch, shape.getSpacedPoints(28).map(p => new THREE.Vector3(p.x * 0.8, p.y * 0.8, w * 0.07)), thread, w * 0.022);
  bodyStage.add(patch);
  bakeInto(THREE, g, bodyStage);

  //  머리 좌표계(단위 구): 정수리 솔기 + 단추 눈
  const head = headOf(g);
  if (!head) return;
  const skull = skullOf(head);
  const hax = skull ? skull.scale.clone() : new THREE.Vector3(1, 1, 1);
  const headStage = new THREE.Group();
  stitches(THREE, headStage, arcOn(THREE, new THREE.Vector3(), hax, 'x', -0.5, 2.4, 25), thread, 0.04);
  const btn = cached('plush-button', () => new THREE.MeshStandardMaterial({ color: PLUSH.button, roughness: 0.3, metalness: 0.1 }));
  const rim = cached('plush-button-rim', () => new THREE.MeshStandardMaterial({ color: new THREE.Color(PLUSH.button).multiplyScalar(1.6).getHex(), roughness: 0.35 }));
  const hole = cached('plush-button-hole', () => new THREE.MeshStandardMaterial({ color: PLUSH.hole, roughness: 0.7 }));
  for (const m of [...head.children]) {
    if (part(m) === 'highlight') { m.visible = false; continue; }
    if (part(m) !== 'pupil') continue;
    m.visible = false;
    const rr = m.geometry.parameters.radius * 1.15, n = m.position.clone().normalize();
    const b = new THREE.Group(); b.position.copy(m.position).addScaledVector(n, rr * 0.15);
    b.lookAt(b.position.clone().add(n));
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(rr, rr, rr * 0.35, 20), btn); disc.rotation.x = Math.PI / 2; b.add(disc);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(rr * 0.9, rr * 0.1, 6, 20), rim); ring.position.z = rr * 0.18; b.add(ring);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => {
      const hm = new THREE.Mesh(new THREE.SphereGeometry(rr * 0.12, 8, 6), hole);
      hm.position.set(sx * rr * 0.28, sy * rr * 0.28, rr * 0.17); hm.scale.z = 0.4; b.add(hm);
    });
    headStage.add(b);
  }
  bakeInto(THREE, head, headStage);
}

/** 🧥 스킨 입히기 — built.group 을 제자리에서 고쳐 돌려준다. 모르는 id·null 이면 그대로 */
export function applySkin(THREE, built, skinId) {
  if (skinId === 'forest_spirit') applySpirit(THREE, built);
  else if (skinId === 'plush_doll') applyPlush(THREE, built);
  return built.group;
}

/** 🌱 정령 머리 새싹 켜고 끄기 — 표식(part='sprout')만 건드린다. 판정은 skin-rules.js sproutVisible */
export function showSprout(group, on) {
  group?.traverse(o => { if (o.userData?.part === 'sprout') o.visible = on; });
}

/** 스킨이 새로 만든 지오메트리만 버린다(재질은 캐시 공유, 캐릭터 원본은 손대지 않는다) */
export function disposeSkin(group) {
  group?.traverse(o => { if (o.userData?.skinOwned) o.geometry?.dispose(); });
}
