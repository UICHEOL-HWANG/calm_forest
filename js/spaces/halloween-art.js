// js/spaces/halloween-art.js
// =============================================================
//  calm forest · 🎃 할로윈 한정 코인 장식 6종 조형 — THREE 를 인자로 받는 순수 모듈
//  ------------------------------------------------------------
//  ▶ 시안 HTML(tools/halloween/build-mockup.mjs)과 게임(indoor.js decorMesh · game.js outdoorMesh)이 같은 코드를 쓴다.
//  ▶ 메시 ≤3: 불투명 몸체는 정점색 한 덩이(mergeGeos), 발광은 재질별로 따로(같은 재질 조각은 합친다).
//  ▶ 원점 = 바닥 중심, 단위 = 배율 전(실내는 decorMesh 가 DECOR_SCALE 을 곱한다).
//  ▶ 승인안(HALLOWEEN_STYLE) 한 벌만 둔다. 다른 안은 지웠다 — buildHalloween 은 목록 밖 id/style 이면 throw.
//  ▶ 테스트: tests/halloween-art.test.mjs
// =============================================================

export const HALLOWEEN_INDOOR_IDS = ['ghostCandle', 'miniGrave', 'witchCauldron'];
export const HALLOWEEN_OUTDOOR_IDS = ['ghostlamp', 'gravefence', 'webarch'];
export const HALLOWEEN_STYLE = { ghostCandle: 'ghost', miniGrave: 'gable', witchCauldron: 'bubble', ghostlamp: 'lantern', gravefence: 'iron', webarch: 'tree' };   // 2026-10-07 사용자 승인
export const HALLOWEEN_STYLES = Object.fromEntries(Object.entries(HALLOWEEN_STYLE).map(([id, style]) => [id, [style]]));

/** 재질 공장 — 몸체는 정점색 재질, 발광은 MeshStandardMaterial. night=true 면 0 으로 시작해 밤에 houseWindows 가 켠다 */
export function makeCtx(T, onNight = null) {
  return {
    vtxMat: () => new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, flatShading: true }),
    glowMat: (color, emissive, intensity, night = false) => {
      const m = new T.MeshStandardMaterial({ color, emissive, emissiveIntensity: night ? 0 : intensity, roughness: 0.5 });
      if (night && onNight) onNight(m);
      return m;
    },
  };
}

function kit(T) {
  const paint = (geo, hex) => {
    const c = new T.Color(hex), n = geo.attributes.position.count, arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
    geo.setAttribute('color', new T.BufferAttribute(arr, 3));
    return geo;
  };
  // parts 는 비어 있으면 안 된다(flat[0] 가정)
  const merge = (geos) => {
    const flat = geos.map(g => (g.index ? g.toNonIndexed() : g));
    const out = new T.BufferGeometry();
    for (const name of ['position', 'normal', 'color']) {
      const size = flat[0].attributes[name].itemSize;
      let total = 0; for (const g of flat) total += g.attributes[name].count;
      const arr = new Float32Array(total * size); let off = 0;
      for (const g of flat) { arr.set(g.attributes[name].array, off); off += g.attributes[name].count * size; }
      out.setAttribute(name, new T.BufferAttribute(arr, size));
    }
    return out;
  };
  return {
    merge,
    box: (w, h, d, x, y, z, c) => paint(new T.BoxGeometry(w, h, d).translate(x, y, z), c),
    tilt: (w, h, d, x, y, z, c, rz) => paint(new T.BoxGeometry(w, h, d).rotateZ(rz).translate(x, y, z), c),
    cyl: (rt, rb, h, x, y, z, c, seg = 8) => paint(new T.CylinderGeometry(rt, rb, h, seg).translate(x, y, z), c),
    cone: (r, h, x, y, z, c, seg = 8) => paint(new T.ConeGeometry(r, h, seg).translate(x, y, z), c),
    ball: (r, x, y, z, c) => paint(new T.IcosahedronGeometry(r, 0).translate(x, y, z), c),
    orb: (r, x, y, z, c) => paint(new T.IcosahedronGeometry(r, 1).translate(x, y, z), c),   // 발광용 — 각진 보석처럼 안 보이게 한 단계 더 둥글게
    // flat=true 면 바닥에 눕힌 고리 — 기본은 세운 전체 고리
    ring: (R, r, x, y, z, c, flat = false) => {
      const geo = new T.TorusGeometry(R, r, 5, 14);
      return paint((flat ? geo.rotateX(Math.PI / 2) : geo).translate(x, y, z), c);
    },
  };
}

const STONE = 0x9a9a92, DARK = 0x2a2a33, IRON = 0x3b3a44, WOOD = 0x5a5148, GHOST_BODY = 0xffffff, INK = 0x2b2540, WEB = 0xe9e6f5;
// 발광 항목: [geo | geo[], color, emissive, intensity, night]
const GHOST_GLOW = [0xe9fff7, 0x9fe8d8], BREW = [0x7dff8a, 0x33d05a], FIRE = [0xffb04a, 0xff6a1a];

const BUILDERS = {
  ghostCandle(k, parts, glows) {   // 높이 ≤0.5 · 폭 ≤0.3 — 탁상 소품(sm). 유령 모양 초: 치마 퍼진 몸통 + 물결 아랫단 + 둥근 머리 + 큰 눈 + 유령빛 불꽃
    parts.push(k.ball(0.024, -0.04, 0.29, 0.095, INK), k.ball(0.024, 0.04, 0.29, 0.095, INK), k.ball(0.014, 0, 0.23, 0.105, INK));
    const body = [k.cyl(0.1, 0.14, 0.22, 0, 0.11, 0, GHOST_BODY, 10), k.orb(0.11, 0, 0.27, 0, GHOST_BODY)];   // 몸통은 살짝 스스로 빛나게 — 낮에도 회색 돌로 안 읽히도록
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; body.push(k.orb(0.035, Math.cos(a) * 0.115, 0.03, Math.sin(a) * 0.115, GHOST_BODY)); }
    glows.push([body, 0xffffff, 0xffffff, 0.25, false]);
    glows.push([k.orb(0.05, 0, 0.42, 0, 0xffffff), ...GHOST_GLOW, 0.85, false]);
  },
  miniGrave(k, parts) {   // 폭 ≤0.5 · 깊이 ≤0.3 · 높이 ≤0.6 — 바닥 소품. 박공 지붕 묘비
    parts.push(k.box(0.46, 0.05, 0.28, 0, 0.025, 0, 0x6e6a62), k.box(0.3, 0.3, 0.07, 0, 0.2, 0, STONE), k.tilt(0.21, 0.21, 0.07, 0, 0.4, 0, STONE, Math.PI / 4));
  },
  witchCauldron(k, parts, glows) {   // 지름 ≤1.0 · 높이 ≤1.2 — 큰 가구. 거품 솥
    parts.push(k.cyl(0.42, 0.34, 0.4, 0, 0.4, 0, DARK, 12), k.ring(0.42, 0.05, 0, 0.6, 0, 0x3a3a46, true));
    for (const a of [0, 2.1, 4.2]) parts.push(k.cyl(0.05, 0.04, 0.2, Math.cos(a) * 0.26, 0.1, Math.sin(a) * 0.26, DARK, 6));
    glows.push([k.cyl(0.38, 0.38, 0.03, 0, 0.58, 0, 0xffffff, 12), ...BREW, 0.9, false]);
    glows.push([[k.orb(0.07, -0.1, 0.72, 0.05, 0xffffff), k.orb(0.05, 0.12, 0.82, -0.04, 0xffffff), k.orb(0.04, 0, 0.94, 0.1, 0xffffff)], ...BREW, 0.9, false]);
  },
  ghostlamp(k, parts, glows) {   // 야외 — 높이 ≤2.0 · 폭 ≤0.7. 철제 등롱, 안쪽 구가 밤에 켜진다(night)
    parts.push(k.cyl(0.05, 0.07, 1.3, 0, 0.65, 0, WOOD, 6), k.box(0.34, 0.04, 0.34, 0, 1.3, 0, IRON), k.cone(0.26, 0.2, 0, 1.78, 0, IRON, 4));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) parts.push(k.cyl(0.02, 0.02, 0.44, sx * 0.15, 1.54, sz * 0.15, IRON, 5));
    glows.push([k.orb(0.12, 0, 1.54, 0, 0xffffff), ...GHOST_GLOW, 1.0, true]);
  },
  gravefence(k, parts) {   // 야외 — 울타리와 같은 1.2 폭 한 마디 · 높이 ≤0.75. 철창 + 양끝 묘비
    parts.push(k.box(1.1, 0.05, 0.05, 0, 0.45, 0, IRON), k.box(1.1, 0.05, 0.05, 0, 0.15, 0, IRON));
    [-0.3, -0.1, 0.1, 0.3].forEach(x => parts.push(k.cyl(0.015, 0.015, 0.5, x, 0.3, 0, IRON, 5), k.cone(0.03, 0.08, x, 0.58, 0, IRON, 5)));
    [-0.52, 0.52].forEach(x => parts.push(k.box(0.12, 0.6, 0.12, x, 0.3, 0, STONE), k.ball(0.08, x, 0.64, 0, STONE)));
  },
  webarch(k, parts) {   // 야외 — 폭 ≤2.6 · 높이 ≤2.6 · 걸어서 통과(충돌체 없음). 휜 죽은 나무 둘이 맞닿은 아치 + 거미줄(얇은 고리+살, 한 덩이)
    parts.push(k.tilt(0.14, 2.3, 0.14, -1.0, 1.15, 0, 0x4a3b30, -0.18), k.tilt(0.14, 2.3, 0.14, 1.0, 1.15, 0, 0x4a3b30, 0.18), k.tilt(0.1, 1.2, 0.1, -0.35, 2.15, 0, 0x4a3b30, -1.15), k.tilt(0.1, 1.2, 0.1, 0.35, 2.15, 0, 0x4a3b30, 1.15));
    const cx = 0, cy = 1.85, R = 0.5, n = 3;
    for (let i = 1; i <= n; i++) parts.push(k.ring(R * i / n, 0.012, cx, cy, 0, WEB, false));
    for (let a = 0; a < 6; a++) parts.push(k.tilt(R * 2, 0.012, 0.012, cx, cy, 0, WEB, a * Math.PI / 6));
  },
};

/** 한 점의 모델을 만든다. 같은 재질의 발광 조각(배열)은 하나로 합친다 */
export function buildHalloween(T, id, style, ctx) {
  if (!Object.hasOwn(BUILDERS, id) || !HALLOWEEN_STYLES[id].includes(style)) throw new Error(`Unknown halloween model id/style: ${id}/${style}`);
  const k = kit(T), parts = [], glows = [], g = new T.Group();
  BUILDERS[id](k, parts, glows);
  g.add(new T.Mesh(k.merge(parts), ctx.vtxMat()));
  for (const [geo, color, emissive, intensity, night] of glows) g.add(new T.Mesh(Array.isArray(geo) ? k.merge(geo) : geo, ctx.glowMat(color, emissive, intensity, night)));
  return g;
}
