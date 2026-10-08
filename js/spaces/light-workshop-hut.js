// =============================================================
//  🏮 빛 공방 오두막 외관(C안 · 2026-10-08 승인) — 벽돌 벽 + 기와 박공지붕 + 빗살 여닫이문 + 손수레
//  레퍼런스: dev/active/light-workshop/mockups/hut-reference.webp · 시안 비교: hut-variants.html
//  긴 벽이 카메라(남쪽, +z)를 보고 문·십자창이 한 면에, 기와 경사면이 정면 · 박공은 양옆(±x).
//  THREE 는 인자로 받는다(node 테스트는 three 를 못 불러 소스만 검사).
//  반환 지오메트리는 정점색이 칠해져 있어 호출부가 mergeGeos 로 한 메시(드로우콜 1)로 묶는다.
// =============================================================

const BRICKS = [0xd9b2a8, 0xf0dcc0, 0xbba49c, 0xe6b48d, 0xf6e8d4, 0xc9aea4];   // 분홍·베이지·회갈색
const TILES = [0xd99a6c, 0xc8895d, 0xe2ab7f, 0xcf9166];                       // 테라코타
const WOOD = 0xe9d4ae, WOOD_D = 0xc9a978, WOOD_EDGE = 0xa8835a;

// 크기 — 벽 2.2×1.8×1.5, 지붕 높이 0.95, 받침 0.08
const W = 2.2, D = 1.8, H = 1.5, ROWS = 9, ROW_H = H / ROWS, T = 0.12, BRICK_L = 0.34, ROOF_H = 0.95, BASE = 0.08;
export const HUT_DOOR_X = -0.35;   // 문 중심(오두막 로컬 x)
const WIN_X = 0.55;

// 결정적 난수 — 벽돌·기와 색 배치가 매번 같다
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

function kit(THREE) {
  const M4 = (x, y, z, rot = [0, 0, 0]) => new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), new THREE.Vector3(1, 1, 1));
  const mul = (a, b) => new THREE.Matrix4().multiplyMatrices(a, b);
  const paint = (geo, hex) => {
    const c = new THREE.Color(hex), n = geo.attributes.position.count, arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
    geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    return geo;
  };
  const box = (w, h, d, hex, m) => paint(new THREE.BoxGeometry(w, h, d).applyMatrix4(m), hex);
  return { THREE, M4, mul, paint, box };
}

// 🧱 벽 한 면 — 벽돌을 반 장씩 엇갈려 쌓고 문·창 구멍은 비운다. span(행) → [u0,u1] · face(u, v, 들쭉날쭉) → 벽돌 자리 행렬
function brickWall(K, out, r, { span, holes, face, rowShift }) {
  const gap = 0.018;
  for (let i = 0; i < ROWS; i++) {
    const vc = i * ROW_H + ROW_H / 2;
    const cut = holes.filter(h => vc > h.v0 && vc < h.v1), [u0, u1] = span(i);
    for (let s = u0 - ((i + rowShift) % 2 ? BRICK_L / 2 : 0); s < u1; s += BRICK_L) {
      let pieces = [[Math.max(s, u0), Math.min(s + BRICK_L, u1)]];
      for (const h of cut) pieces = pieces.flatMap(([a, b]) => (b <= h.u0 || a >= h.u1) ? [[a, b]]
        : [[a, Math.min(b, h.u0)], [Math.max(a, h.u1), b]].filter(([p, q]) => q - p > 0.001));
      for (const [a, b] of pieces) {
        const w = b - a - gap; if (w < 0.04) continue;
        out.push(K.box(w, ROW_H - gap, T, BRICKS[Math.floor(r() * BRICKS.length)], face((a + b) / 2, vc, (r() - 0.5) * 0.02)));
      }
    }
  }
}

// 🚪 빗살 여닫이문 한 짝 — 경첩이 원점, sign=+1 이면 +x 로 뻗는다. 빗살은 45° 선을 안쪽 사각형에 잘라 붙인다
function doorLeaf(K, sign) {
  const dw = 0.36, dh = 1.02, dt = 0.04, fr = 0.045, { box, M4 } = K;
  const cx = sign * dw / 2, parts = [box(dw, dh, dt, 0xf1e1c2, M4(cx, dh / 2, 0))];
  parts.push(box(dw, fr, dt + 0.02, WOOD_D, M4(cx, fr / 2, 0.005)), box(dw, fr, dt + 0.02, WOOD_D, M4(cx, dh - fr / 2, 0.005)));
  parts.push(box(fr, dh, dt + 0.02, WOOD_D, M4(sign * fr / 2, dh / 2, 0.005)), box(fr, dh, dt + 0.02, WOOD_D, M4(sign * (dw - fr / 2), dh / 2, 0.005)));
  const iw = dw - 2 * fr, ih = dh - 2 * fr;
  for (let c = -ih / 2 - iw / 2 + 0.06; c < ih / 2 + iw / 2; c += 0.11) {
    const pts = [];
    for (const x of [-iw / 2, iw / 2]) { const y = x * sign + c; if (y >= -ih / 2 && y <= ih / 2) pts.push([x, y]); }
    for (const y of [-ih / 2, ih / 2]) { const x = (y - c) * sign; if (x > -iw / 2 && x < iw / 2) pts.push([x, y]); }
    if (pts.length < 2) continue;
    const [[ax, ay], [bx, by]] = pts, len = Math.hypot(bx - ax, by - ay);
    if (len < 0.05) continue;
    parts.push(box(len, 0.018, 0.012, WOOD_EDGE, M4(cx + (ax + bx) / 2, dh / 2 + (ay + by) / 2, dt / 2 + 0.006, [0, 0, Math.atan2(by - ay, bx - ax)])));
  }
  return parts;
}

// 🔺 박공 삼각벽(밝은 나무판) + 🟫 기와 지붕 — 지붕 로컬은 용마루가 z 축, 마지막에 y 로 90° 돌려 용마루를 x 축에 둔다
function roof(K, out, r, top) {
  const { THREE, box, M4, mul, paint } = K, hw = D / 2, len = W, a = Math.atan2(ROOF_H, hw);
  const turn = new THREE.Matrix4().makeRotationY(Math.PI / 2), toWorld = (m) => mul(turn, m);
  for (const sz of [1, -1]) {
    let k = 0;
    for (let x0 = -hw; x0 < hw - 0.001; x0 += 0.22, k++) {   // 세로 나무판을 삼각형 모양대로 잘라 세운다
      const x1 = Math.min(x0 + 0.21, hw), yt = (x) => ROOF_H * (1 - Math.abs(x) / hw);
      const sh = new THREE.Shape(); sh.moveTo(x0, 0); sh.lineTo(x1, 0); sh.lineTo(x1, yt(x1));
      if (x0 < 0 && x1 > 0) sh.lineTo(0, ROOF_H);
      sh.lineTo(x0, yt(x0)); sh.closePath();
      const g = new THREE.ExtrudeGeometry(sh, { depth: 0.05, bevelEnabled: false }); g.translate(0, 0, -0.025);
      out.push(paint(g.applyMatrix4(toWorld(M4(0, top, sz * (len / 2 - T / 2)))), k % 2 ? 0xf3e6cc : 0xe8d7b6));
    }
    const bl = Math.hypot(hw, ROOF_H) + 0.3;   // 박공 테두리 판
    for (const s of [-1, 1]) out.push(box(bl, 0.09, 0.07, WOOD_EDGE, toWorld(M4(s * (hw / 2 + 0.06), top + ROOF_H / 2, sz * (len / 2 + 0.2), [0, 0, -s * a]))));
  }
  const sl = hw / Math.cos(a) + 0.22, zl = len + 0.4, tl = 0.34, step = 0.235, tw = 0.36;
  for (const s of [1, -1]) {
    // 경사 좌표: 용마루에서 아래로 sx, 법선 n, 용마루 방향 uz · kick 만큼 아랫단을 들어 기와가 겹쳐 보이게
    const slope = (sx, n, uz, kick = 0) => toWorld(mul(M4(0, top + ROOF_H, 0, [0, 0, -s * a]), M4(s * sx, n, uz, [0, 0, -s * kick])));
    out.push(box(sl, 0.05, zl, WOOD_EDGE, slope(sl / 2, 0, 0)));
    for (let d = 0.04, row = 0; d + tl / 2 < sl + 0.05; d += step, row++) {
      const shift = row % 2 ? tw / 2 : 0;
      for (let u = -zl / 2 - shift; u < zl / 2; u += tw) {
        const a0 = Math.max(u, -zl / 2), a1 = Math.min(u + tw, zl / 2), w = a1 - a0 - 0.022;
        if (w < 0.06) continue;
        out.push(box(tl, 0.045, w, TILES[Math.floor(r() * TILES.length)], slope(d + tl / 2, 0.05 + 0.012 * (row % 2), (a0 + a1) / 2, 0.07)));
      }
    }
  }
  out.push(box(0.16, 0.16, zl + 0.04, 0xb9784f, toWorld(M4(0, top + ROOF_H + 0.04, 0, [0, 0, Math.PI / 4]))));   // 용마루
}

// 🏠 오두막 — { solid: 정점색 지오메트리[], glow: 창·문 안쪽 빛 평면[] }
export function buildHutGeos(THREE) {
  const K = kit(THREE), { box, M4, mul } = K, r = rng(11);
  const solid = [], glow = [];
  const door = { u0: HUT_DOOR_X - 0.37, u1: HUT_DOOR_X + 0.37, v0: 0, v1: 1.05 };
  const win = { u0: WIN_X - 0.25, u1: WIN_X + 0.25, v0: 0.62, v1: 1.12 };

  // 바닥 나무 받침 + 문 앞 디딤판
  solid.push(box(W + 0.36, BASE, D + 0.36, WOOD, M4(0, BASE / 2, 0)), box(W + 0.4, 0.03, D + 0.4, WOOD_EDGE, M4(0, 0.015, 0)));
  solid.push(box(1.05, 0.06, 0.6, WOOD, M4(HUT_DOOR_X, 0.03, D / 2 + 0.45)), box(1.09, 0.025, 0.64, WOOD_EDGE, M4(HUT_DOOR_X, 0.0125, D / 2 + 0.45)));
  solid.push(box(W - 2 * T + 0.02, H, D - 2 * T + 0.02, 0x8d7a70, M4(0, BASE + H / 2, 0)));   // 속 벽(줄눈 색)

  // 벽 4면 — 모서리 기둥(T×T)은 짝수 행은 앞뒤 벽이, 홀수 행은 옆벽이 차지해 맞물린다(겹치면 면이 깜빡인다)
  const y0 = BASE, top = y0 + H;
  const frontSpan = (i) => (i % 2 ? [-W / 2 + T, W / 2 - T] : [-W / 2, W / 2]);
  const sideSpan = (i) => (i % 2 ? [-D / 2, D / 2] : [-D / 2 + T, D / 2 - T]);
  for (const [sz, holes] of [[1, [door, win]], [-1, []]])
    brickWall(K, solid, r, { span: frontSpan, holes, rowShift: 0, face: (u, v, j) => M4(u, y0 + v, sz * (D / 2 - T / 2 + j)) });
  for (const sx of [1, -1])
    brickWall(K, solid, r, { span: sideSpan, holes: [], rowShift: 1, face: (u, v, j) => M4(sx * (W / 2 - T / 2 + j), y0 + v, -sx * u, [0, Math.PI / 2, 0]) });

  // 🚪 빗살 여닫이문 — 살짝 열린 모양(왼짝 더 열림)
  for (const [sign, ang] of [[1, -0.55], [-1, 0.32]]) {
    const m = M4(HUT_DOOR_X - sign * 0.37, y0, D / 2 + 0.01, [0, ang, 0]);
    for (const p of doorLeaf(K, sign)) solid.push(p.applyMatrix4(m));
  }
  glow.push(new THREE.PlaneGeometry(0.72, 1.03).applyMatrix4(M4(HUT_DOOR_X, y0 + 0.52, D / 2 - T + 0.02)));   // 문 안쪽 불빛 — 속 벽 앞면(+0.01)보다 앞
  solid.push(box(0.84, 0.07, T + 0.04, WOOD_D, M4(HUT_DOOR_X, y0 + 1.085, D / 2 - T / 2)));                    // 문 인방

  // 🪟 십자 격자창
  const wm = M4(WIN_X, y0 + 0.87, D / 2 - 0.02), ww = 0.46, wh = 0.46, f = 0.05;
  for (const [bw, bh, x, y] of [[ww + 2 * f, f, 0, wh / 2 + f / 2], [ww + 2 * f, f, 0, -wh / 2 - f / 2], [f, wh, -ww / 2 - f / 2, 0], [f, wh, ww / 2 + f / 2, 0], [0.035, wh, 0, 0], [ww, 0.035, 0, 0]])
    solid.push(box(bw, bh, 0.08, WOOD, mul(wm, M4(x, y, 0))));
  glow.push(new THREE.PlaneGeometry(ww, wh).applyMatrix4(mul(wm, M4(0, 0, -0.06))));

  roof(K, solid, r, top);
  return { solid, glow };
}

// 🛒 나무 손수레 — 짐칸 + 손잡이 + 바퀴(테·살 6개·축). m = 놓을 자리 행렬
export function buildCartGeos(THREE, m) {
  const { box, M4, mul, paint } = kit(THREE), P = [];
  const add = (w, h, d, hex, mm) => P.push(box(w, h, d, hex, mul(m, mm)));
  add(0.62, 0.035, 0.44, WOOD, M4(0, 0.36, 0));
  add(0.62, 0.22, 0.03, WOOD, M4(0, 0.47, 0.205)); add(0.62, 0.22, 0.03, WOOD, M4(0, 0.47, -0.205));
  add(0.03, 0.22, 0.44, WOOD, M4(-0.295, 0.47, 0)); add(0.03, 0.26, 0.44, WOOD, M4(0.32, 0.49, 0, [0, 0, -0.25]));
  for (const s of [-1, 1]) add(0.62, 0.035, 0.035, WOOD_D, M4(-0.55, 0.42, s * 0.17, [0, 0, -0.18]));
  add(0.03, 0.035, 0.38, WOOD_D, M4(-0.86, 0.48, 0));
  for (const s of [-1, 1]) add(0.03, 0.34, 0.035, WOOD_D, M4(-0.2, 0.17, s * 0.17));   // 다리
  for (const s of [-1, 1]) {   // 바퀴 양쪽
    const wheel = mul(m, M4(0.12, 0.2, s * 0.25));
    P.push(paint(new THREE.TorusGeometry(0.17, 0.025, 6, 18).applyMatrix4(wheel), WOOD));
    for (let i = 0; i < 3; i++) P.push(box(0.33, 0.022, 0.02, WOOD_D, mul(wheel, M4(0, 0, 0, [0, 0, i * Math.PI / 3]))));
  }
  P.push(paint(new THREE.CylinderGeometry(0.03, 0.03, 0.56, 8).applyMatrix4(mul(m, M4(0.12, 0.2, 0, [Math.PI / 2, 0, 0]))), WOOD_D));   // 축
  return P;
}
