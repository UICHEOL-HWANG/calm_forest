// js/cosmetics/skin-witch.js
// =============================================================
//  calm forest · 🧙 할로윈 마녀 스킨 — 클래식 고깔(A) · 별밤 견습(C)
//  ------------------------------------------------------------
//  시안: sims/halloween-skin-sim.html witchClassic·witchStarry·witchCone·perch·HAT_FIT
//        (2026-10-06 확정, dev/active/halloween-premium/look/)
//  ▶ 덧입히기: buildAnimalMesh 의 built 를 받아 built.group 을 제자리에서 고친다.
//    치수·동물 id 는 built.k(id·R·bs·bodyY·HR·HY) — 시안의 g.userData.k · a.id 와 같은 값이다.
//  ▶ 모자는 머리 단위 공간(HR=1)에서 만들어 head 그룹에 굽는다(buildAnimalHead 가 시안과 같은 함수).
//  ▶ 표식: 고깔 모자 전체(띠·버클·별 포함) = part='skinhead'(머리 꾸미기를 쓰면 숨는다) ·
//    망토·깃·브로치·망토 별·빗자루 = part='skinback'(등 꾸미기를 입으면 숨는다).
//  ▶ 🐻🐼 귀가 챙을 뚫고 나오는 것·🐤 볏이 모자 안에 눌리는 것은 시안 판단으로 허용.
//  ▶ ⚠️ 캐릭터 원래 재질은 공유 — 건드리지 않는다. 스킨 재질은 모듈 캐시(스킨·색당 1벌).
//  ▶ 별(발광)은 작은 면만 — emissive 0xffc233×0.55(휘도 ≈0.33)라 블룸 임계 0.85 아래.
//  ▶ 드로우콜(재질별 병합): 클래식 +6(모자 3 · 망토 천 1 · 깃 1 · 테두리+브로치 1)
//                          별밤 +10(모자 3 · 망토 천 1 · 깃·테두리·별 3 · 빗자루 3)
//    망토 천은 인덱스를 지키려고 굽지 않는다 → 깃과 같은 재질이어도 1콜 따로.
//  ▶ 공통 도구는 skin-kit.js 에서만 가져온다(skin.js 를 import 하면 순환이 된다).
// =============================================================
import { cached, headOf, bakeInto, put, onSurface, tubeGeo, grow, silhouette, drape } from './skin-kit.js';

const PI = Math.PI;

//  모자 자리 — 귀 밑동(고양이 0.46~토끼 0.80)보다 낮은 y 0.50 에 챙을 두고, 크라운을 위로 갈수록 좁혀
//  귀 윗부분이 크라운 옆으로 빠져나오게 한다. 🐰 토끼는 긴 귀와 부딪혀 0.7배로 줄여 앞으로 기울이고 올린다.
const HAT_FIT = { default: { y: 0.50, z: 0, tilt: 0, s: 1 }, rabbit: { y: 0.70, z: 0.30, tilt: 0.38, s: 0.70 } };
const fitOf = (id) => HAT_FIT[id] || HAT_FIT.default;
//  별밤 꼬마 고깔은 이마에 비스듬히 얹는다(perch: 고도·방위·배율) — 🐰 토끼는 귀 앞으로 더 숙이고 조금 작게
const PERCH_FIT = { default: { elev: 1.02, az: 0.2, s: 0.5 }, rabbit: { elev: 0.78, az: 0.22, s: 0.46 } };
const perchOf = (id) => PERCH_FIT[id] || PERCH_FIT.default;

const CLASSIC = { felt: 0x4a3a82, band: 0xf2a23c, gold: 0xf0be4c, cape: 0x6a4eb0 };
const STARRY = { navy: 0x2e3d86, band: 0xe86b8c, trim: 0xf6c84e, star: 0xffd866, starGlow: 0xffc233, starEi: 0.55,
  stick: 0x8a5a30, straw: 0xdcb45e, tie: 0x6a3a28 };
//  망토 별 자리 — [φ(뒤=π), 깃→밑단 비율]
const CAPE_STARS = [[2.5, 0.78], [3.0, 0.45], [3.5, 0.72], [2.15, 0.5], [3.95, 0.5], [2.85, 0.15], [3.3, 0.2], [2.4, 0.12]];

const std = (THREE, color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.92, ...o });
const V3 = (THREE, x, y, z) => new THREE.Vector3(x, y, z);

/** 정점을 함수로 휜다(시안 bend) */
function bend(THREE, geo, fn) {
  const p = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); fn(v); p.setXYZ(i, v.x, v.y, v.z); }
  geo.computeVertexNormals();
  return geo;
}
const lathe = (THREE, pts, seg) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);

/** 다섯 꼭지 별 — 납작한 압출 */
function starGeo(THREE, r, depth) {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = -PI / 2 + i * PI / 5, rr = i % 2 ? r * 0.46 : r;
    if (i) s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  s.closePath();
  return new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false });
}

/** 한 장짜리 천은 굽지 않고 그대로 단다 — 인덱스를 유지해야 정점이 3배로 불지 않는다 */
function addSheet(THREE, parent, geo, mat) {
  const m = new THREE.Mesh(geo, mat);
  m.userData.skinOwned = true; m.userData.skin = true;   // disposeSkin 이 지오메트리를 버린다
  m.castShadow = false;
  parent.add(m);
  return m;
}

/** 휘어진 고깔 — 머리 단위 공간. 챙 → 크라운 → 뒤로 꺾인 끝 */
function witchCone(THREE, parent, felt, { baseR = 1.0, brimR = 1.5, bendBack = 0.55, h = 2.35 } = {}) {
  const sc = h / 2.35;
  const pts = [[baseR * 0.95, 0], [brimR * 0.7, -0.01], [brimR, 0.0], [brimR + 0.03, 0.04], [brimR - 0.02, 0.085], [baseR * 1.04, 0.085],
    [baseR * 0.88, 0.22 * sc], [baseR * 0.68, 0.5 * sc], [baseR * 0.5, 0.85 * sc], [baseR * 0.36, 1.3 * sc], [baseR * 0.22, 1.75 * sc],
    [baseR * 0.1, 2.1 * sc], [0, h]];
  const geo = bend(THREE, lathe(THREE, pts, 32), (v) => {
    const t = Math.max(0, (v.y - 0.9 * sc) / (h - 0.9 * sc));
    v.z -= bendBack * t * t; v.y -= 0.32 * t * t; v.x += 0.1 * t * t;
  });
  return put(THREE, parent, geo, felt);
}

/** 머리 구 위 방향(elev·az)으로 얹기 — 시안 perch */
function perch(THREE, parent, grp, { elev, az, s }, lift = 0.97, roll = 0) {
  const d = V3(THREE, Math.sin(az) * Math.cos(elev), Math.sin(elev), Math.cos(az) * Math.cos(elev)).normalize();
  grp.position.copy(d).multiplyScalar(lift);
  grp.quaternion.setFromUnitVectors(V3(THREE, 0, 1, 0), d);
  grp.rotateY(roll); grp.scale.setScalar(s);
  parent.add(grp);
}

/** 모자 띠 — 크라운 밑동을 감는 고리 */
function hatBand(THREE, hat, mat, { tube, seg, y, zStretch = 1 }) {
  const band = put(THREE, hat, new THREE.TorusGeometry(0.98, tube, 6, seg), mat, 0, y, 0);
  band.rotation.x = PI / 2; band.scale.set(1, 1, zStretch);
}

/** 모자 그룹을 parentless wrap 에 담아 head 에 굽는다 — 전부 skinhead */
function bakeHat(THREE, head, place) {
  const wrap = new THREE.Group();
  place(wrap);
  bakeInto(THREE, head, wrap).forEach(m => { m.userData.part = 'skinhead'; });
}

/** 등 망토 — 뒤쪽 3.5rad 천(굽지 않음) + 깃 고리(stage). 천은 바로 skinback */
function backCape(THREE, g, stage, rAt, { yTop, hemY, rows, hemAmp, hemFreq, mat, collarTube }) {
  const D = drape(THREE, { yTop, hemY, rAt, phi0: PI - 1.75, phi1: PI + 1.75, cols: 56, hemAmp, hemFreq, fold: 0.04, foldFreq: 7, rows });
  addSheet(THREE, g, D.geo, mat).userData.part = 'skinback';
  const col = put(THREE, stage, new THREE.TorusGeometry(rAt(yTop) * 1.02, collarTube, 6, 28), mat, 0, yTop, 0);
  col.rotation.x = PI / 2;
  return D;
}
const capeEdge = (THREE, D) => grow(THREE, D.edgeL.slice().reverse().concat(D.hem, D.edgeR), 1.004);
const bakeBack = (THREE, g, stage) => bakeInto(THREE, g, stage).forEach(m => { m.userData.part = 'skinback'; });

// ── 🧙 클래식 고깔 — 휘어진 보라 고깔 + 금 버클 띠 + 어깨 망토(금 테두리, 별 브로치) ──
export function applyWitchClassic(THREE, built) {
  const g = built.group, k = built.k, { R, HY, HR } = k;
  const felt = cached('witch-classic-felt', () => std(THREE, CLASSIC.felt, { side: THREE.DoubleSide, roughness: 0.98 }));
  const band = cached('witch-classic-band', () => std(THREE, CLASSIC.band));
  const gold = cached('witch-classic-gold', () => std(THREE, CLASSIC.gold, { roughness: 0.35, metalness: 0.35 }));
  const cape = cached('witch-classic-cape', () => std(THREE, CLASSIC.cape, { side: THREE.DoubleSide, roughness: 0.98 }));
  const trim = cached('witch-classic-trim', () => std(THREE, CLASSIC.gold, { roughness: 0.5 }));

  //  모자 — 동물별 자리(HAT_FIT, 🐰 토끼 보정)
  const head = headOf(g);
  if (head) bakeHat(THREE, head, (wrap) => {
    const f = fitOf(k.id), hat = new THREE.Group();
    witchCone(THREE, hat, felt);
    hatBand(THREE, hat, band, { tube: 0.075, seg: 32, y: 0.16, zStretch: 1.2 });
    put(THREE, hat, new THREE.BoxGeometry(0.34, 0.3, 0.07), gold, 0, 0.16, 1.0);   // 버클 테
    put(THREE, hat, new THREE.BoxGeometry(0.17, 0.16, 0.09), felt, 0, 0.16, 1.0);  // 버클 구멍
    hat.position.set(0, f.y, f.z); hat.rotation.x = f.tilt; hat.scale.setScalar(f.s);
    wrap.add(hat);
  });

  //  어깨 망토 — 금 테두리 + 깃 + 별 브로치(브로치는 테두리와 같은 재질로 묶어 1콜 절약)
  const rAt = silhouette(k, { head: 0, body: 1.16, flare: 0.2 });
  const yTop = HY - HR * 0.74, stage = new THREE.Group();
  const D = backCape(THREE, g, stage, rAt, { yTop, hemY: 0.07, rows: 36, hemAmp: 0.06, hemFreq: 6.5, mat: cape, collarTube: 0.045 });
  put(THREE, stage, tubeGeo(THREE, capeEdge(THREE, D), 0.018, false, 240), trim);
  const brooch = onSurface(THREE, stage, V3(THREE, 0, yTop - 0.015, rAt(yTop) * 1.02 + 0.04), V3(THREE, 0, 0, 1));
  put(THREE, brooch, starGeo(THREE, R * 0.12, 0.03), trim);
  bakeBack(THREE, g, stage);
  return g;
}

// ── 🧙 별밤 견습 — 이마에 살짝 얹은 꼬마 고깔 + 별 박힌 남색 짧은 망토 + 등에 멘 빗자루 ──
export function applyWitchStarry(THREE, built) {
  const g = built.group, k = built.k, { R, bs, bodyY, HY, HR } = k, Ry = R * bs[1], Rb = R * Math.max(bs[0], bs[2]);
  const navy = cached('witch-starry-navy', () => std(THREE, STARRY.navy, { side: THREE.DoubleSide, roughness: 0.98 }));
  const band = cached('witch-starry-band', () => std(THREE, STARRY.band));
  const trim = cached('witch-starry-trim', () => std(THREE, STARRY.trim, { roughness: 0.5 }));
  const star = cached('witch-starry-star', () => new THREE.MeshStandardMaterial({ color: STARRY.star, emissive: STARRY.starGlow,
    emissiveIntensity: STARRY.starEi, roughness: 0.5 }));
  const stick = cached('witch-starry-stick', () => std(THREE, STARRY.stick));
  const straw = cached('witch-starry-straw', () => std(THREE, STARRY.straw));
  const tie = cached('witch-starry-tie', () => std(THREE, STARRY.tie));

  //  꼬마 고깔 — 이마에 비스듬히(PERCH_FIT, 🐰 토끼 보정)
  const head = headOf(g);
  if (head) bakeHat(THREE, head, (wrap) => {
    const hat = new THREE.Group();
    witchCone(THREE, hat, navy, { baseR: 1.0, brimR: 1.35, bendBack: 0.5, h: 2.1 });
    hatBand(THREE, hat, band, { tube: 0.07, seg: 28, y: 0.15 });
    put(THREE, onSurface(THREE, hat, V3(THREE, 0.5, 0.2, 0.86), V3(THREE, 0.5, 0.1, 0.86)), starGeo(THREE, 0.2, 0.06), star);
    perch(THREE, wrap, hat, perchOf(k.id));
  });

  //  짧은 망토 + 초승달 브로치 + 별
  const rAt = silhouette(k, { head: 0, body: 1.15, flare: 0.1 });
  const yTop = HY - HR * 0.74, hemY = bodyY - Ry * 0.28, stage = new THREE.Group();
  const D = backCape(THREE, g, stage, rAt, { yTop, hemY, rows: 28, hemAmp: 0.05, hemFreq: 8, mat: navy, collarTube: 0.042 });
  put(THREE, stage, tubeGeo(THREE, capeEdge(THREE, D), 0.016, false, 200), trim);
  const moonAt = onSurface(THREE, stage, V3(THREE, 0, yTop - 0.012, rAt(yTop) * 1.02 + 0.045), V3(THREE, 0, 0, 1));
  put(THREE, moonAt, new THREE.TorusGeometry(R * 0.085, R * 0.025, 6, 16, 4.3), star).rotation.z = 0.9;
  CAPE_STARS.forEach(([phi, v], i) => {
    const { p, nrm } = D.at(phi, yTop + (hemY - yTop) * v);
    const at = onSurface(THREE, stage, p.clone().addScaledVector(nrm, 0.012), nrm, i * 0.7);
    put(THREE, at, starGeo(THREE, R * (0.07 + 0.02 * (i % 3)), 0.02), star);
  });

  //  빗자루 — 등에 비스듬히(끝이 어깨 위·밑단 밖으로 튀어나온다)
  const A = V3(THREE, Rb * 0.78, bodyY - Ry * 0.82, -Rb * 0.72), B = V3(THREE, -Rb * 0.42, bodyY + Ry * 0.98, -Rb * 1.0);
  const dir = B.clone().sub(A), L = dir.length(), broom = new THREE.Group();
  broom.position.copy(A).add(B).multiplyScalar(0.5);
  broom.quaternion.setFromUnitVectors(V3(THREE, 0, 1, 0), dir.normalize());
  stage.add(broom);
  put(THREE, broom, new THREE.CylinderGeometry(0.024, 0.026, L, 8), stick);
  put(THREE, broom, new THREE.CylinderGeometry(0.05, R * 0.17, R * 0.5, 10), straw, 0, -L / 2 - R * 0.08, 0);
  put(THREE, broom, new THREE.TorusGeometry(R * 0.075, 0.016, 5, 12), tie, 0, -L / 2 + R * 0.12, 0).rotation.x = PI / 2;
  bakeBack(THREE, g, stage);
  return g;
}
