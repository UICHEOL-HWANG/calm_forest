// js/cosmetics/skin-ghost.js
// =============================================================
//  calm forest · 👻 할로윈 유령 스킨 — 나이트캡 유령(B) · 구름 유령(C)
//  ------------------------------------------------------------
//  시안: sims/halloween-skin-sim.html ghostNightcap·ghostCloud (2026-10-06 확정, dev/active/halloween-premium/look/)
//  ▶ 덧입히기: buildAnimalMesh 의 built 를 받아 built.group 을 제자리에서 고친다.
//    치수는 built.k(R·bs·bodyY·HR·HY) — 시안의 g.userData.k 와 같은 값이다.
//  ▶ 부위는 userData.part 표식으로 찾는다(눈동자·하이라이트·두개·몸) — 시안처럼 어두운 구를 추측하지 않는다.
//  ▶ ⚠️ 캐릭터 원래 재질은 공유 — 버리지 않는다. 스킨 재질은 모듈 캐시(스킨·색당 1벌).
//  ▶ 후드 끝(처진 뾰족 끝 + 방울)만 part='skinhead' — 머리 꾸미기를 쓰면 숨는다. 시트·목 리본은 늘 보인다.
//  ▶ 흰색은 시안 값 그대로(블룸 임계 0.85 아래로 시안에서 확인) · 시트는 밤에도 보이게 약한 발광.
//  ▶ 드로우콜: 나이트캡 +5(시트·후드 끝·테두리·리본·방울) · 구름 +3(구름 치마·꼬리 1 + 빛 테두리 2)
//  ▶ 공통 도구는 skin-kit.js 에서만 가져온다(skin.js 를 import 하면 순환이 된다).
// =============================================================
import { cached, isDark, part, bakeInto, put, onSurface, tubeGeo, grow, silhouette, drape } from './skin-kit.js';

const TAU = Math.PI * 2;

const SHEET = { color: 0xe6e3f0, glow: 0x4a4860, glowI: 0.55, roughness: 0.96 };
const NIGHTCAP = { body: 1.16, peakH: 2.75, trim: 0xcdbff0, orange: 0xf6a04d,
  // 후드 중 머리 꾸미기에 숨길 부분 — 정수리(peakY0)~꼭대기 구간의 20% 위부터(머리 꼭대기 높이, 처짐이 보이기 시작하는 곳)
  tipFrom: 0.2,
  // 후드 끝을 숨겼을 때 잘린 자리를 닫는 뚜껑 높이(머리 단위) — 원뿔 속에 들어갈 만큼 낮게
  capH: 0.28 };
const CLOUD = { body: 0xf1ecff, emissive: 0x8d7bd6, ei: 0.28, opacity: 0.8,
  rim: 0xc3b4ff, rimOpacity: 0.2, rimGrow: 1.06,
  puff: 0xf6f2ff, puffGlow: 0x6d5cb8, puffEi: 0.18, puffOpacity: 0.92 };

const std = (THREE, color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.92, ...o });

/** 한 장짜리 천은 굽지 않고 그대로 단다 — 인덱스를 유지해야 정점이 3배로 불지 않는다 */
function addSheet(THREE, parent, geo, mat) {
  const m = new THREE.Mesh(geo, mat);
  m.userData.skinOwned = true; m.userData.skin = true;   // disposeSkin 이 지오메트리를 버린다
  m.castShadow = false;
  parent.add(m);
  return m;
}

/** 얼굴 창 — 머리 단위로 정한 타원. 눈·눈썹·주둥이·볼터치가 전부 창 안에 든다 */
function faceWindow(THREE, k, { dy = -0.12, hh = 0.80, pw = 0.70 } = {}) {
  const { HR, HY } = k, cy = HY + HR * dy, H = HR * hh;
  return {
    hole: (phi, y) => ((y - cy) / H) ** 2 + (phi / pw) ** 2 < 1,
    ring: (rAt, n = 48, up = 1.012) => Array.from({ length: n }, (_, i) => {
      const t = i / n * TAU, phi = pw * Math.sin(t), y = cy + H * Math.cos(t), r = rAt(y) * up;
      return new THREE.Vector3(r * Math.sin(phi), y, r * Math.cos(phi));
    }),
  };
}

const sheetMat = (THREE) => cached('ghost-sheet', () => std(THREE, SHEET.color,
  { side: THREE.DoubleSide, roughness: SHEET.roughness, emissive: SHEET.glow, emissiveIntensity: SHEET.glowI }));

// ── 👻 나이트캡 유령 — 머리만 덮는 뾰족 후드가 뒤로 처지고(방울), 어깨까지 짧게 내려온 시트 + 목 리본 ──
export function applyGhostNightcap(THREE, built) {
  const g = built.group, k = built.k, { R, bs, bodyY, HY, HR } = k, Ry = R * bs[1];
  const rAt = silhouette(k, { body: NIGHTCAP.body, flare: 0, peak: true, peakH: NIGHTCAP.peakH });
  const win = faceWindow(THREE, k, { dy: -0.06, hh: 0.78, pw: 0.72 });
  const y0 = rAt.peakY0, yT = rAt.peakTop, yCut = y0 + (yT - y0) * NIGHTCAP.tipFrom;
  //  후드 처짐 — 정수리 위로 갈수록 뒤(−z)·아래로 휘고 살짝 옆으로
  const droop = (p, y) => {
    if (y <= y0) return;
    const t = (y - y0) / (yT - y0);
    p.z -= HR * 2.0 * t * t; p.y -= HR * 1.05 * t * t * t; p.x += HR * 0.28 * t * t;
  };
  //  후드 끝은 격자 위쪽 몇 행 — 잘린 고리는 낮은 둥근 뚜껑으로 닫는다(머리 꾸미기를 써서 끝이 숨어도 정수리가 안 뚫린다)
  const yTop = yT - 0.004, hemY = bodyY - Ry * 0.12, rows = 56;
  const cutRow = Math.round((yTop - yCut) / (yTop - hemY) * rows);
  const D = drape(THREE, { yTop, hemY, rAt, hemAmp: 0.05, hemFreq: 11, rows, fold: 0.03,
    hole: win.hole, cutRow, cap: HR * NIGHTCAP.capH, post: droop });
  const sheet = sheetMat(THREE);
  const trim = cached('ghost-nightcap-trim', () => std(THREE, NIGHTCAP.trim));
  const orange = cached('ghost-nightcap-orange', () => std(THREE, NIGHTCAP.orange, { roughness: 0.95 }));

  addSheet(THREE, g, D.geo, sheet);
  addSheet(THREE, g, D.geoCut, sheet).userData.part = 'skinhead';

  //  늘 보이는 장식 — 얼굴 창 테두리 · 밑단 실 · 목 리본(앞, 창 아래)
  const stage = new THREE.Group();
  put(THREE, stage, tubeGeo(THREE, win.ring(rAt), 0.017, true), trim);
  put(THREE, stage, tubeGeo(THREE, grow(THREE, D.hem, 1.005), 0.018, false, 200), trim);
  const yb = HY - HR * 1.08, rb = rAt(yb) + 0.012;
  const bow = onSurface(THREE, stage, new THREE.Vector3(0, yb, rb), new THREE.Vector3(0, 0, 1));
  [-1, 1].forEach(s => {
    const w = put(THREE, bow, new THREE.SphereGeometry(HR * 0.2, 12, 8), orange, s * HR * 0.2, 0, 0);
    w.scale.set(1.15, 0.7, 0.4); w.rotation.z = s * 0.35;
  });
  put(THREE, bow, new THREE.SphereGeometry(HR * 0.09, 10, 8), orange, 0, 0, HR * 0.02);
  [-1, 1].forEach(s => {
    const t = put(THREE, bow, new THREE.BoxGeometry(HR * 0.1, HR * 0.34, 0.012), orange, s * HR * 0.07, -HR * 0.2, 0);
    t.rotation.z = s * 0.28;
  });
  bakeInto(THREE, g, stage);

  //  방울 — 처진 끝 위치를 같은 변환으로 구한다. 후드 끝과 함께 숨는다
  const tip = new THREE.Vector3(0, yT, 0); droop(tip, yT);
  const tipStage = new THREE.Group();
  put(THREE, tipStage, new THREE.SphereGeometry(HR * 0.2, 14, 10), orange, tip.x, tip.y - HR * 0.1, tip.z);
  bakeInto(THREE, g, tipStage).forEach(m => { m.userData.part = 'skinhead'; });
  return g;
}

// ── 👻 구름 유령 — 천이 아니라 몸 자체가 말랑한 반투명 하양. 구름 치마 + 꼬불 꼬리 + 은은한 보랏빛 테두리 ──
//  팔도 같은 재질로 남는다 → 도구를 쥔 손이 그대로 보인다.
//  여우·고양이 얼굴 무늬는 하얗게 덮여 윤곽과 눈으로 읽힌다(시안에서 허용).
export function applyGhostCloud(THREE, built) {
  const g = built.group, { R, bs } = built.k, Rb = R * Math.max(bs[0], bs[2]);
  const bodyMat = cached('ghost-cloud-body', () => new THREE.MeshStandardMaterial({ color: CLOUD.body, emissive: CLOUD.emissive,
    emissiveIntensity: CLOUD.ei, roughness: 0.55, transparent: true, opacity: CLOUD.opacity, depthWrite: false }));
  const rimMat = cached('ghost-cloud-rim', () => new THREE.MeshBasicMaterial({ color: CLOUD.rim, side: THREE.BackSide, transparent: true,
    opacity: CLOUD.rimOpacity, depthWrite: false, blending: THREE.AdditiveBlending }));
  const puff = cached('ghost-cloud-puff', () => std(THREE, CLOUD.puff, { roughness: 0.7, transparent: true, opacity: CLOUD.puffOpacity,
    emissive: CLOUD.puffGlow, emissiveIntensity: CLOUD.puffEi }));

  const shells = [];
  g.traverse(o => {
    if (!o.isMesh || o.userData.skin) return;
    if (part(o) === 'pupil' || part(o) === 'highlight' || isDark(o)) return;   // 눈·검은 무늬(판다 팔·귀)는 남긴다
    o.material = bodyMat;
    o.castShadow = false;   // 반투명 몸이 단단한 그림자를 드리우지 않게
    if (part(o) === 'body' || part(o) === 'skull') shells.push(o);
  });
  //  빛 테두리 — 몸통·두개에 뒤집힌 껍질 한 겹. 지오메트리는 원본 공유(skinOwned 아님 — 버리면 캐릭터가 깨진다)
  for (const o of shells) {
    const s = new THREE.Mesh(o.geometry, rimMat);
    s.userData.skin = true;
    s.position.copy(o.position); s.rotation.copy(o.rotation); s.scale.copy(o.scale).multiplyScalar(CLOUD.rimGrow);
    o.parent.add(s);
  }

  const stage = new THREE.Group();
  //  구름 치마 — 발치에 몽글한 구 두 겹
  const ring = (n, rr, y, pr, off) => {
    for (let i = 0; i < n; i++) {
      const A = off + i / n * TAU;
      const s = put(THREE, stage, new THREE.SphereGeometry(pr * (0.9 + 0.2 * Math.sin(i * 2.3)), 14, 10), puff, Math.sin(A) * rr, y, Math.cos(A) * rr);
      s.scale.y = 0.85;
    }
  };
  ring(10, Rb * 0.98, 0.11, R * 0.26, 0); ring(8, Rb * 0.8, 0.07, R * 0.22, 0.3);
  //  꼬불 꼬리 — 뒤쪽 바닥에서 S 자로 올라간다(끝으로 갈수록 가늘게)
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const curve = new THREE.CatmullRomCurve3([V3(0, 0.07, -Rb * 0.5), V3(Rb * 0.5, 0.12, -Rb * 1.15), V3(Rb * 0.1, 0.34, -Rb * 1.55),
    V3(-Rb * 0.45, 0.62, -Rb * 1.5), V3(-Rb * 0.5, 0.92, -Rb * 1.15)]);
  const SEG = 40, RAD = 8, ctr = [];
  for (let i = 0; i <= SEG; i++) ctr.push(curve.getPointAt(i / SEG));
  const tail = new THREE.TubeGeometry(curve, SEG, 1, RAD, false), pp = tail.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < pp.count; i++) {
    const si = Math.floor(i / (RAD + 1)), r = R * (0.2 * (1 - si / SEG) + 0.035), cc = ctr[si];
    v.fromBufferAttribute(pp, i).sub(cc).multiplyScalar(r).add(cc);
    pp.setXYZ(i, v.x, v.y, v.z);
  }
  tail.computeVertexNormals();
  put(THREE, stage, tail, puff);
  bakeInto(THREE, g, stage);
  return g;
}
