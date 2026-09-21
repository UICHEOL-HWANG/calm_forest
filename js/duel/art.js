// =============================================================
//  calm forest · 🐗🦝 밤손님 조형 2종
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-09-21-night-duel-design.md
//  시안 비교: sims/duel-sim.html (A/B/C 3안을 나란히 렌더 — 이 파일을 import 한다)
//
//  ▶ THREE 를 인자로 받는다 — js/visitor-art.js 의 makeVisitor(THREE, id) 와 같은 문법.
//  ▶ 발치가 y=0, 앞면이 −Z. 무대(js/duel/stage.js)가 이 규약을 믿고 회전시킨다.
//  ▶ 모델 하나 = 그림자 O/X 두 덩어리로 합쳐 **드로우콜 2개**로 끝낸다.
//
//  ── 이 형태에 이르기까지 (4차까지 반려됐다. 되돌리지 말 것) ──
//  ① **구를 놓고 부속을 붙이면 🌰밤이 된다.** 🦔 spikyShell 주석의 교훈 그대로 —
//     "바늘이 공보다 작으면 시선이 공을 먼저 읽는다. 껍질 자체가 형태가 되어야 한다."
//     그래서 둘 다 구를 쓰지 않는다. 🐗 는 테이퍼 통이, 🦝 는 사각뿔대가 **머리 자체**다.
//  ② **공통 얼굴(visitor-art 의 makeHead)을 쓰지 않는다.** 튀어나온 큰 흰 눈은 🐸 특징이라
//     붙이는 순간 개구리로 읽힌다(3차 반려). 🦔 처럼 작고 어두운 눈만 쓴다.
//  ③ 🐗 **들창코가 이 종의 전부다.** 없으면 테이퍼 통은 말·당나귀가 된다(4차 반려).
//     ⚠️ 납작한 원반을 덧붙이지 말 것 — 옆에서 접시처럼 삐져나온다(실측). 코끝 구간을
//     앞으로 갈수록 넓어지는 **역테이퍼**로 만들어 형태의 일부로 둔다.
//  ④ 🦝 **검은 블록을 눈 위에 얹으면 젖소 얼룩이 된다**(4차 반려). 눈을 중심으로 바깥
//     아래로 기울인 가면 둘 + **사이의 밝은 콧대**여야 "가면"으로 읽힌다.
// =============================================================

/** 🐗 은 형태가 웨지라 밤 함정에서 벗어났으므로 면이 읽히게 두 톤을 쓴다(🦔 quill/snout 문법) */
const BOAR_COL = { skull: 0x6e5c48, snout: 0x8c7962, dark: 0x453a2e, tusk: 0xe6dcc6 };
/** 🦝 은 차가운 회색 + 검은 가면·꼬리(둘 다 필수 — 빼면 어떤 색이어도 너구리가 아니다) */
const RACC_COL = { body: 0x93958e, pale: 0xe4e0d4, mask: 0x1e1b19 };
const EYE_WHITE = 0xffffff, EYE_DARK = 0x07060a;

// visitor-art.js 비례를 스케일 기준으로만 빌려온다(공통 얼굴은 쓰지 않는다).
//   밤손님은 플레이어와 마주 서는 상대라 방문객보다 크다.
const SCALE = 0.72;                    // ⚠️ 1.75 였다 — 머리만 있던 시절의 값이다.
                                       //    몸을 붙이면서 플레이어(키 ≈1.6, 머리반지름 0.37)와
                                       //    나란히 섰을 때의 비례로 다시 잡았다.
export const HEAD_R = 0.34 * SCALE;

// 네발짐승 골격 — 다리로 몸을 띄우고, 그 위에 몸통, 그 앞에 머리.
const LEG_H = 0.26;                    // 다리 길이
// ⚠️ 몸통 중심을 상수로 두면 bodyR 이 클 때 몸통이 다리를 삼킨다(실측 2회).
//    다리 위에 **얹히는** 높이로 bodyR 에서 파생시켜, 몸통 아래로 늘 틈이 보이게 한다.
const bodyCY = (bodyR) => LEG_H + bodyR * 0.72;
const headY = (bodyR) => bodyCY(bodyR) + bodyR * 0.30;

/** 모델 높이(무대 카메라 프레이밍용) — 등까지의 높이 */
export const DUEL_ART_H = { boar: 0.72, raccoon: 0.60 };   // 다리+몸통 반지름 기준 등 높이

// ── 지오메트리 헬퍼 (THREE 를 인자로 받으므로 전역 THREE 를 참조하지 않는다) ──
const B = (T, w, h, d, x, y, z, rz = 0, ry = 0, rx = 0) => {
  const q = new T.BoxGeometry(w, h, d);
  if (rx) q.rotateX(rx); if (ry) q.rotateY(ry); if (rz) q.rotateZ(rz);
  return q.translate(x, y, z);
};
const SP = (T, r, x, y, z, sx = 1, sy = 1, sz = 1) => {
  const q = new T.SphereGeometry(r, 14, 12);
  if (sx !== 1 || sy !== 1 || sz !== 1) q.scale(sx, sy, sz);
  return q.translate(x, y, z);
};
const CO = (T, r, h, seg, x, y, z, rx = 0, ry = 0, rz = 0) => {
  const q = new T.ConeGeometry(r, h, seg);
  if (rx) q.rotateX(rx); if (ry) q.rotateY(ry); if (rz) q.rotateZ(rz);
  return q.translate(x, y, z);
};
/** 세로 기둥 — 다리 전용(위 rt, 아래 rb).
 *  ⚠️ WBODY(...).rotateX(...) 로 세우려 하지 말 것 — WBODY 는 이미 회전·이동을 마친 상태라
 *     거기에 회전을 덧걸면 **원점 기준으로 다시 돌아** 다리가 엉뚱한 곳으로 간다(실측 버그). */
const LEG = (T, rt, rb, h, x, z) => new T.CylinderGeometry(rt, rb, h, 6).translate(x, h / 2, z);

/** 다리를 **몸통 중심까지** 세운다 — 보이는 길이는 몸통 바닥~땅이고, 위는 몸통 안에 묻힌다.
 *  ⚠️ 다리 길이를 LEG_H 로 끊으면 발이 떠 보인다(실측): 구는 가장자리로 갈수록 바닥이 위로
 *     올라가므로, 다리를 몸통 바깥쪽에 둘수록 그 지점 몸통 바닥이 다리 꼭대기보다 높아진다.
 *     중심까지 밀어 넣으면 다리를 어디에 두든 반드시 몸통에 박힌다. */
const legTo = (bodyR) => bodyCY(bodyR) + bodyR * 0.25;

/** 웨지 통 — 앞(rf, −Z)과 뒤(rr, +Z) 반지름이 다른 테이퍼 원통. 🐗 는 이게 머리이자 주둥이다 */
const WBODY = (T, rf, rr, len, seg, x, y, z) =>
  new T.CylinderGeometry(rf, rr, len, seg).rotateX(-Math.PI / 2).translate(x, y, z);

/** 정점색 — 색이 달라도 한 재질로 합쳐진다(game.js 의 paintGeo 와 같은 문법) */
function paintGeo(T, geo, hex) {
  const c = new T.Color(hex), n = geo.attributes.position.count, arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  geo.setAttribute('color', new T.BufferAttribute(arr, 3));
  return geo;
}

/** game.js 의 mergeGeos 와 같은 구현 — three/addons 없이 정점색까지 합친다 */
function mergeGeos(T, geos) {
  const flat = geos.map(g => (g.index ? g.toNonIndexed() : g));
  const out = new T.BufferGeometry();
  for (const name of ['position', 'normal', 'color']) {
    if (!flat[0].attributes[name]) continue;
    const size = flat[0].attributes[name].itemSize;
    let total = 0;
    for (const g of flat) total += g.attributes[name].count;
    const arr = new Float32Array(total * size);
    let off = 0;
    for (const g of flat) { arr.set(g.attributes[name].array, off); off += g.attributes[name].count * size; }
    out.setAttribute(name, new T.BufferAttribute(arr, size));
  }
  return out;
}

const vtxMat = (T) => new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, flatShading: true });

/** 그림자 O(VS) / X(VN) 두 덩어리로 합쳐 드로우콜 2개로 끝낸다 */
function buildModel(T, fn) {
  const g = new T.Group();
  const VS = [], VN = [];
  const P = (geos, hex, shadow = true) => {
    const a = shadow ? VS : VN;
    for (const q of geos) a.push(paintGeo(T, q.index ? q.toNonIndexed() : q, hex));
  };
  fn(P);
  if (VS.length) { const m = new T.Mesh(mergeGeos(T, VS), vtxMat(T)); m.castShadow = true; m.receiveShadow = true; g.add(m); }
  if (VN.length) g.add(new T.Mesh(mergeGeos(T, VN), vtxMat(T)));
  return g;
}

/** 🦔 dark 눈 문법 — 흰자 없이 작고 어두운 눈 + 반짝임 하나(없으면 검은 구멍으로 보인다) */
function darkEyes(T, P, ex, ey, ez, r) {
  P([SP(T, r, -ex, ey, ez, 1, 1, 0.7), SP(T, r, ex, ey, ez, 1, 1, 0.7)], EYE_DARK, false);
  const hr = r * 0.3;
  P([SP(T, hr, -ex + r * 0.3, ey + r * 0.34, ez - r * 0.4),
     SP(T, hr,  ex + r * 0.3, ey + r * 0.34, ez - r * 0.4)], EYE_WHITE, false);
}

// ═══════════════ 🐗 멧돼지 ═══════════════
function boarBuild(T, P, o) {
  const { rf, rr, len } = o;
  const BY = bodyCY(o.bodyR), HY = headY(o.bodyR);
  const splitT = 0.40, rSplit = rf + (rr - rf) * splitT;
  // 머리를 통째로 앞(−Z)으로 밀어 몸통 자리를 비운다. HZ 만큼 앞이 머리, 그 뒤가 몸.
  const HZ = -o.bodyLen * 0.52;
  const zFront = HZ - len / 2, zBack = HZ + len / 2, zSplit = zFront + len * splitT;
  const rAt = z => rf + (rr - rf) * ((z - zFront) / len);   // 그 z 위치의 머리 웨지 반지름

  // ── 몸통 — 플레이어 캐릭터와 같은 **둥근 덩어리** 문법(구를 눌러 쓴다).
  //   ⚠️ 테이퍼 통은 소시지, 구 3개를 일렬로 두면 애벌레가 된다(실측 2회).
  //   어깨(큰 구)와 엉덩이(작은 구) **둘**로 끝낸다 — 그 둘이 겹치는 허리가 곧 이어짐이다.
  const bz0 = zBack + o.bodyR * 0.30;
  const bz1 = bz0 + o.bodyLen;
  P([SP(T, o.bodyR, 0, BY + o.bodyR * 0.10, bz0, 0.94, 1.00, 1.02)], BOAR_COL.skull);        // 어깨 — 크고 높게
  P([SP(T, o.bodyR * 0.86, 0, BY, bz1, 0.92, 0.96, 1.00)], BOAR_COL.skull);                  // 엉덩이 — 작고 낮게
  // 꼬리 — ⚠️ 수평 막대는 옆으로 뻗은 작대기로 보였다(실측). 아래로 처지게 눕히고 끝에 술을 단다.
  const tailZ = bz1 + o.bodyR * 0.72, tailY = BY + o.bodyR * 0.30;
  const tail = new T.CylinderGeometry(0.018, 0.032, 0.22, 6);
  tail.rotateX(-1.05);                                   // 뒤아래로 처진다
  P([tail.translate(0, tailY - 0.05, tailZ + 0.04)], BOAR_COL.dark);
  P([SP(T, 0.042, 0, tailY - 0.16, tailZ + 0.10, 1, 1.15, 1)], BOAR_COL.dark);   // 끝 술

  // ── 다리 4개 — 몸통 아래로 **확실히 내려와야** 짐승이 된다(묻히면 덩어리다) ──
  for (const [lx, lz] of [[-1, bz0 + o.bodyR * 0.05], [1, bz0 + o.bodyR * 0.05],
                          [-1, bz1 - o.bodyR * 0.02], [1, bz1 - o.bodyR * 0.02]]) {
    const w = lx * o.bodyR * 0.60;   // 다리가 몸통 중심까지 박히므로 안쪽에 둬도 드러난다
    P([LEG(T, o.legR, o.legR * 1.3, legTo(o.bodyR), w, lz)], BOAR_COL.skull);
    P([SP(T, o.legR * 1.2, w, o.legR * 0.5, lz, 1, 0.6, 1.2)], BOAR_COL.dark);   // 발굽
  }

  // 머리+주둥이 — 한 형태. 테이퍼가 "뒤 높고 앞 낮은" 옆선을 만든다
  P([WBODY(T, rf, rSplit, zSplit - zFront, 8, 0, HY, (zFront + zSplit) / 2)], BOAR_COL.snout);
  P([WBODY(T, rSplit, rr, zBack - zSplit, 10, 0, HY, (zSplit + zBack) / 2)], BOAR_COL.skull);

  // 🐽 들창코 — 코끝 구간만 **역테이퍼**(앞이 넓다). 아래로 내려 코가 처진 옆선을 만든다
  const discR = rf * o.discMul, noseLen = rf * 0.55, noseZ = zFront - noseLen / 2, noseY = HY - rf * 0.26;
  P([WBODY(T, discR, rf, noseLen, 10, 0, noseY, noseZ)], BOAR_COL.snout);
  const nz = zFront - noseLen - 0.006;
  P([SP(T, discR * 0.24, -discR * 0.42, noseY, nz, 1, 1.2, .5),
     SP(T, discR * 0.24,  discR * 0.42, noseY, nz, 1, 1.2, .5)], BOAR_COL.dark, false);

  // 뒤통수 마감 — 잘린 원통 끝은 옆에서 뻥 뚫린 듯 보인다. 위로 올려 이마를 볼록하게
  P([SP(T, rr, 0, HY + rr * 0.10, zBack - rr * 0.10, 1, 1.05, 0.62)], BOAR_COL.skull);

  // 눈 — ⚠️ 웨지는 그 z 의 반지름만큼 차 있다. 오프셋이 그보다 짧으면 눈이 통 속에 파묻힌다
  const eyeZ = zBack - rr * 0.62, rLocal = rAt(eyeZ);
  const eyeSize = HEAD_R * 0.085, eyeDist = rLocal + eyeSize * 0.3, eyeAng = 0.78;
  darkEyes(T, P, Math.sin(eyeAng) * eyeDist, HY + Math.cos(eyeAng) * eyeDist, eyeZ, eyeSize);

  // 엄니 — 들창코 바로 뒤 옆에서 위로(코를 가리지 않게 뒤에 둔다)
  const tz = zFront + len * 0.10, tr = rAt(tz);
  P([CO(T, o.tuskR, o.tuskLen, 4, -tr * 0.92, HY - tr * 0.22, tz, -0.10, 0, 0.30),
     CO(T, o.tuskR, o.tuskLen, 4,  tr * 0.92, HY - tr * 0.22, tz, -0.10, 0, -0.30)], BOAR_COL.tusk, false);

  // 귀 — 작고 **뒤로 눕힌다**(말 귀는 위로 선다. 그 차이가 종을 가른다)
  const ez = zBack - rr * 0.62, ey = HY + rr * 0.70;
  P([CO(T, o.earSize * 0.72, o.earSize, 4, -rr * 0.82, ey, ez, 0.45, 0, 0.62),
     CO(T, o.earSize * 0.72, o.earSize, 4,  rr * 0.82, ey, ez, 0.45, 0, -0.62)], BOAR_COL.dark);

  // 갈기 — 등줄기 위 각진 판(털 뭉치 아님 · 촘촘한 반복 아님)
  for (let i = 0; i < o.mane; i++) {
    const t = o.mane > 1 ? i / (o.mane - 1) : 0;
    const z = zBack - rr * 0.45 - t * len * 0.40, r = rAt(z), h = o.maneH * (1 - 0.22 * t);
    P([B(T, 0.05, h, len * 0.11, 0, HY + r * 1.03 + h * 0.5, z, 0, 0, -0.14)], BOAR_COL.dark);
  }
}

// ═══════════════ 🦝 너구리 ═══════════════
function raccoonBuild(T, P, o) {
  const { rf, rr, len } = o;
  const BY = bodyCY(o.bodyR), HY = headY(o.bodyR);
  const HZ = -o.bodyLen * 0.52;
  const zFront = HZ - len / 2, zBack = HZ + len / 2;

  // ── 몸통 — 🐗 과 같은 둥근 덩어리 문법이되 **낮고 납작하게**. 너구리는 땅에 붙어 다닌다.
  const bz0 = zBack + o.bodyR * 0.32;
  const bz1 = bz0 + o.bodyLen;
  P([SP(T, o.bodyR * 0.96, 0, BY, bz0, 1.04, 0.90, 1.02)], RACC_COL.body);
  P([SP(T, o.bodyR * 0.90, 0, BY - o.bodyR * 0.04, bz1, 1.00, 0.86, 0.98)], RACC_COL.body);

  // ── 다리 4개 — 짧게(너구리는 다리가 몸에 거의 묻힌다) ──
  for (const [lx, lz] of [[-1, bz0], [1, bz0], [-1, bz1 - o.bodyR * 0.06], [1, bz1 - o.bodyR * 0.06]]) {
    const w = lx * o.bodyR * 0.62;   // 다리가 몸통 중심까지 박히므로 안쪽에 둬도 드러난다
    P([LEG(T, o.legR, o.legR * 1.1, legTo(o.bodyR), w, lz)], RACC_COL.body);
    P([SP(T, o.legR * 1.15, w, o.legR * 0.42, lz, 1, 0.62, 1.15)], RACC_COL.mask);   // 발끝만 검게
  }

  // 사각뿔대를 가로로 넓히고 세로를 살려 "넓은 뺨 → 좁은 주둥이" 실루엣을 만든다.
  //   🐗 이 옆에서 긴 쐐기라면 🦝 는 **정면에서 넓은 사다리꼴** — 축을 갈라 두 종이 안 겹치게 한다.
  // ⚠️ 4각(사각뿔대)은 몸통의 둥근 덩어리와 따로 논다 — 머리만 각져 보였다(실측).
  //    7각이면 "넓은 뺨 → 좁은 주둥이" 사다리꼴은 남기면서 둥근 몸통과 한 몸으로 읽힌다.
  const head = new T.CylinderGeometry(rf, rr, len, 7).rotateY(Math.PI / 7).rotateX(-Math.PI / 2);
  head.scale(o.wide, o.tall, 1);
  P([head.translate(0, HY, 0)], RACC_COL.body);
  const halfW = z => (rf + (rr - rf) * ((z - zFront) / len)) * o.wide;
  const halfH = z => (rf + (rr - rf) * ((z - zFront) / len)) * o.tall;

  // 🖤 가면 — 눈 중심에 두고 바깥 아래로 기울여 눈꼬리를 만든다
  const mz = zFront + len * o.maskT, mw = halfW(mz), mh = halfH(mz);
  const mEyeX = mw * 0.52, mEyeY = HY + mh * 0.16;
  for (const sgn of [-1, 1]) P([B(T, mw * o.maskW, mh * o.maskH, len * 0.26, sgn * mEyeX, mEyeY, mz, sgn * -0.34)], RACC_COL.mask, false);
  // 눈 — 가면보다 앞에 박아 반짝임이 검은 바탕 위에 뜨게 한다
  const eyeR = HEAD_R * 0.085, eyeZ = mz - len * 0.17, eyeY = mEyeY + mh * 0.06;
  P([SP(T, eyeR, -mEyeX, eyeY, eyeZ, 1, 1, .55), SP(T, eyeR, mEyeX, eyeY, eyeZ, 1, 1, .55)], EYE_DARK, false);
  P([SP(T, eyeR * .48, -mEyeX + eyeR * .34, eyeY + eyeR * .36, eyeZ - eyeR * .5, 1, 1, .55),
     SP(T, eyeR * .48,  mEyeX + eyeR * .34, eyeY + eyeR * .36, eyeZ - eyeR * .5, 1, 1, .55)], EYE_WHITE, false);
  // 콧대 — 두 가면 사이 밝은 세로줄. 이게 있어야 검은 뭉치가 "가면"으로 읽힌다
  P([B(T, mw * 0.30, mh * 1.05, len * 0.22, 0, HY + mh * 0.10, mz - len * 0.02)], RACC_COL.pale);

  // 주둥이 — 머리 앞면에서 이어 나온 사각뿔대(폭을 이어받아 별도 조각으로 안 보이게)
  const sh = halfH(zFront);
  const sn = new T.CylinderGeometry(rf * 0.30, rf * 0.92, o.snoutLen, 7).rotateY(Math.PI / 7).rotateX(-Math.PI / 2);
  sn.scale(o.wide * 0.92, o.tall * 0.86, 1);
  P([sn.translate(0, HY - sh * 0.30, zFront - o.snoutLen / 2)], RACC_COL.pale);
  P([SP(T, rf * 0.30, 0, HY - sh * 0.34, zFront - o.snoutLen - 0.01, 1.25, .85, .7)], EYE_DARK, false);

  // 귀 — 머리 윗면 모서리에 **박힌 삼각형**(떠 있는 공은 더듬이로 보인다)
  const ez = zBack - len * 0.20, ew = halfW(ez), eh = halfH(ez);
  for (const s of [-1, 1]) {
    P([CO(T, o.earR, o.earR * 1.35, 5, s * ew * 0.72, HY + eh * 0.86, ez, 0, s > 0 ? -0.3 : 0.3, s * -0.30)], RACC_COL.body);
    P([CO(T, o.earR * 0.52, o.earR * 0.9, 5, s * ew * 0.76, HY + eh * 0.84, ez - 0.012, 0, s > 0 ? -0.3 : 0.3, s * -0.30)], RACC_COL.mask, false);
  }

  // 꼬리 — 뒤 아래로 눕혀 세운다(머리 위로 세우면 정면에서 유니콘 뿔이 된다).
  //   줄무늬는 굵게 4마디 — 가늘게 여러 개면 환공포증이다.
  const colors = [RACC_COL.body, RACC_COL.mask, RACC_COL.body, RACC_COL.mask];
  let py = BY + o.bodyR * 0.45, pz = bz1 + o.bodyR * 0.70, ang = 0.34;   // 몸통 엉덩이에서 시작
  const n = o.tailSegR.length;
  for (let i = 0; i < n; i++) {
    const segLen = o.tailLen / n, dy = Math.sin(ang) * segLen, dz = Math.cos(ang) * segLen;
    const rTop = o.tailSegR[i], rBot = i === 0 ? o.tailSegR[i] * 1.06 : o.tailSegR[i - 1];
    const q = new T.CylinderGeometry(rTop, rBot, segLen, 8);
    q.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), new T.Vector3(0, dy, dz).normalize()));
    q.translate(0, py + dy / 2, pz + dz / 2);
    P([q], colors[i % colors.length]);
    py += dy; pz += dz; ang += 0.14;
  }
}

// ── 확정 수치 (2026-09-21 사용자 승인: 🐗 = B · 🦝 = A) ──
//   A/C 는 sims/duel-sim.html 의 3안 비교용으로만 남긴다.
export const BOAR_OPT = {
  A: { rf: .155, rr: .40, len: .74, discMul: 1.28, tuskR: .042, tuskLen: .17, earSize: .15, mane: 3, maneH: .15, bodyLen: .34, bodyR: .30, legR: .062 },
  B: { rf: .140, rr: .39, len: .88, discMul: 1.18, tuskR: .046, tuskLen: .19, earSize: .16, mane: 3, maneH: .16, bodyLen: .38, bodyR: .32, legR: .066 },
  C: { rf: .125, rr: .38, len: 1.02, discMul: 1.10, tuskR: .050, tuskLen: .21, earSize: .17, mane: 3, maneH: .17, bodyLen: .42, bodyR: .33, legR: .052 },
};
export const RACC_OPT = {
  A: { rf: .13, rr: .25, len: .44, wide: 1.12, tall: 1.00, maskT: .30, maskW: .58, maskH: .70, snoutLen: .20, earR: .13, tailLen: .62, tailSegR: [.10, .085, .065, .05], bodyLen: .34, bodyR: .27, legR: .052 },
  B: { rf: .12, rr: .26, len: .46, wide: 1.14, tall: 0.98, maskT: .32, maskW: .72, maskH: .84, snoutLen: .22, earR: .14, tailLen: .66, tailSegR: [.105, .09, .07, .05], bodyLen: .38, bodyR: .29, legR: .056 },
  C: { rf: .12, rr: .27, len: .48, wide: 1.16, tall: 0.96, maskT: .34, maskW: .86, maskH: .98, snoutLen: .24, earR: .15, tailLen: .70, tailSegR: [.11, .095, .075, .055], bodyLen: .42, bodyR: .30, legR: .060 },
};

/** 🐗 멧돼지 — 발치 y=0, 앞면 −Z. 드로우콜 2 */
export function makeBoar(THREE, opt = BOAR_OPT.B) { return buildModel(THREE, P => boarBuild(THREE, P, opt)); }
/** 🦝 너구리 — 같은 규약 */
export function makeRaccoon(THREE, opt = RACC_OPT.A) { return buildModel(THREE, P => raccoonBuild(THREE, P, opt)); }
