// js/cosmetics/skin-kit.js
// =============================================================
//  calm forest · 🧥 전신 스킨 공통 도구 (잎 모듈 — skin.js·skin-ghost.js·skin-witch.js 가 같이 쓴다)
//  ------------------------------------------------------------
//  ▶ 순환 import 방지: 이 파일은 trail.js(mergeGeos)만 가져온다. skin.js 를 import 하지 않는다.
//  ▶ THREE 는 인자로 받는다(모듈 상단 import 금지 — 노드 테스트가 소스만 읽는다).
//  ▶ 천(drape)·실루엣은 시안 sims/halloween-skin-sim.html 의 silhouette·drape 를 옮긴 것(2026-10-06 확정).
// =============================================================
import { mergeGeos } from './trail.js';

const PI = Math.PI, TAU = PI * 2;

// ── 재질 캐시 · 표식 ──────────────────────────────────────────
//  ⚠️ 스킨 재질은 스킨·색당 1벌 — 캐릭터를 다시 만들 때마다 새로 만들지 않는다(dispose 도 안 한다)
const cache = new Map();
export const cached = (key, make) => { if (!cache.has(key)) cache.set(key, make()); return cache.get(key); };
//  ⚠️ Color 내부값은 선형이다 — 밝기 판정은 getHex()(sRGB)
export const srgbSum = (c) => { const h = c.getHex(); return (((h >> 16) & 255) + ((h >> 8) & 255) + (h & 255)) / 255; };
export const isDark = (m) => !!m.material?.color && srgbSum(m.material.color) < 0.5;
export const part = (o) => o.userData?.part;
export const own = (m) => { m.userData.skinOwned = true; m.userData.skin = true; return m; };
export function headOf(g) { return g.children.find(c => part(c) === 'head') || null; }

/** 스테이징 → 재질별로 한 메시씩 구워 parent 에 붙인다.
 *  ⚠️ stage 는 **부모 없이** 만든 그룹 — 그래야 matrixWorld 가 곧 parent 좌표계다. */
export function bakeInto(THREE, parent, stage) {
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

// ── 스테이징 조립 ─────────────────────────────────────────────
/** 스테이징 그룹에 메시 하나 — bakeInto 가 구우면서 지오메트리를 버린다 */
//  ⚠️ 스테이징 전용 — built.group 에 직접 put 하지 말 것(부모 없는 stage 에만 넣고 bakeInto 로 굽는다)
export const put = (THREE, parent, geo, mat, x = 0, y = 0, z = 0) => {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m;
};
/** 표면 위(방향 nrm 쪽을 보는) 장식 그룹 */
export function onSurface(THREE, parent, p, nrm, roll = 0) {
  const g = new THREE.Group(); g.position.copy(p); g.lookAt(p.clone().add(nrm)); g.rotateZ(roll); parent.add(g); return g;
}
export const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const wrapPi = (a) => ((a + PI) % TAU + TAU) % TAU - PI;
/** 점열을 따라가는 관(테두리·밑단 실) */
export const tubeGeo = (THREE, pts, rad, closed = false, seg = 120) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, closed), seg, rad, 6, closed);
/** 점열을 수평으로 k 배(천 위로 살짝 띄우기) */
export const grow = (THREE, pts, k) => pts.map(p => new THREE.Vector3(p.x * k, p.y, p.z * k));

// ── 실루엣 프로파일: 높이 y → 반지름 (머리 타원 ∪ 몸 타원 + 치마) ──
//  k = built.k(R·bs·bodyY·HR·HY). o.head 0 이면 머리 없이 몸만, o.peak 면 머리 위로 뾰족 후드.
export function silhouette(k, o) {
  const { R, bs, bodyY, HR, HY } = k, Rb = R * Math.max(bs[0], bs[2]), Ry = R * bs[1];
  const hr = HR * (o.head ?? 1.17), hv = HR * 1.2, B = o.body ?? 1.2, fl = o.flare ?? 0.22;
  const yMid = bodyY - Ry * 0.35, y0 = 0.03;
  const rm = Rb * B * Math.sqrt(1 - ((yMid - bodyY) / (Ry * B)) ** 2);
  const rBody = (y) => {
    if (y < yMid) { const s = Math.min(1, (yMid - y) / (yMid - y0)); return rm + Rb * fl * Math.pow(s, 1.3); }
    const t = (y - bodyY) / (Ry * B); return Math.abs(t) < 1 ? Rb * B * Math.sqrt(1 - t * t) : 0;
  };
  const peakY0 = HY + hv * 0.55, peakTop = HY + HR * (o.peakH ?? 2.9);
  const rHead = (y) => {
    if (!hr) return 0;
    if (o.peak && y > peakY0) {
      const r0 = hr * Math.sqrt(1 - 0.55 ** 2), u = (y - peakY0) / (peakTop - peakY0);
      return u >= 1 ? 0 : r0 * Math.pow(1 - u, 1.15);
    }
    const t = (y - HY) / hv; return Math.abs(t) < 1 ? hr * Math.sqrt(1 - t * t) : 0;
  };
  const yMax = o.peak ? peakTop : HY + hv, N = 320, tab = [];
  for (let i = 0; i <= N; i++) { const y = yMax * i / N; tab.push(Math.max(rBody(y), rHead(y))); }
  for (let pass = 0; pass < 3; pass++) { const c = tab.slice(); for (let i = 3; i < N - 2; i++) tab[i] = (c[i - 2] + c[i - 1] + c[i] + c[i + 1] + c[i + 2]) / 5; }
  const f = (y) => { const u = Math.min(N, Math.max(0, y / yMax * N)), i = Math.floor(u); return i >= N ? tab[N] : tab[i] + (tab[i + 1] - tab[i]) * (u - i); };
  f.yMax = yMax; f.peakY0 = peakY0; f.peakTop = peakTop;
  return f;
}

// ── 천(drape) 생성기 — φ 는 앞(+z)=0, +x 쪽으로 증가 ──
//  hole(φ, y): 건너뛸 사각형(얼굴 창) · cut(φ, y): 따로 떼어 geoCut 으로 보낼 사각형(후드 끝처럼 따로 숨길 부위).
//  법선은 자르기 **전** 전체 격자에서 구한다 → 두 조각 이음매에 음영 단차가 없다.
export function drape(THREE, { yTop, hemY, rAt, phi0 = -PI, phi1 = PI, rows = 44, cols = 72, hemAmp = 0.05, hemFreq = 9,
  fold = 0.03, foldFreq = 6, foldK = () => 1, hole = null, cut = null, post = null }) {
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const pos = [], idx = [], idxCut = [], dphi = (phi1 - phi0) / cols;
  const hemAt = (phi) => { const f = ((phi * hemFreq / TAU) % 1 + 1) % 1; return hemY + hemAmp * (1 - Math.sqrt(Math.max(0, 1 - (2 * f - 1) ** 2))); };
  const P = (i, j) => {
    const v = i / rows, phi = phi0 + j * dphi, y = yTop + (hemAt(phi) - yTop) * v;
    const r = rAt(y) * (1 + fold * Math.sin(foldFreq * phi + y * 1.7) * foldK(y) * sstep(0.04, 0.2, v));
    const p = V3(r * Math.sin(phi), y, r * Math.cos(phi)); if (post) post(p, y);
    return { p, y };
  };
  const grid = [];
  for (let i = 0; i <= rows; i++) { grid.push([]); for (let j = 0; j <= cols; j++) { const q = P(i, j); grid[i].push(q); pos.push(q.p.x, q.p.y, q.p.z); } }
  const W = cols + 1;
  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
    const cphi = wrapPi(phi0 + (j + 0.5) * dphi), cy = (grid[i][j].y + grid[i + 1][j + 1].y) / 2;
    if (hole && hole(cphi, cy)) continue;
    const a = i * W + j, b = a + 1, c = a + W, d = c + 1;
    (cut && cut(cphi, cy) ? idxCut : idx).push(a, c, b, b, c, d);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex([...idx, ...idxCut]); geo.computeVertexNormals();
  let geoCut = null;
  if (cut) { geoCut = geo.clone(); geoCut.setIndex(idxCut); geo.setIndex(idx); }
  const col = (j) => grid.map(r => r[j].p), hem = grid[rows].map(q => q.p);
  return { geo, geoCut, hem, edgeL: col(0), edgeR: col(cols),
    at: (phi, y) => { const r = rAt(y); return { p: V3(r * Math.sin(phi), y, r * Math.cos(phi)), nrm: V3(Math.sin(phi), 0, Math.cos(phi)) }; } };
}
