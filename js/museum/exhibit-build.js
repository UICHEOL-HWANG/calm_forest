// =============================================================
//  🏛️ 전시물 도형 목록 → THREE 메시 (재질별 정점색 병합)
//  ------------------------------------------------------------
//  ▶ solid / glow / glass 세 재질로 묶어 **전시물 하나 = 메시 최대 3개**. 색은 정점에 실어 재질 수를 늘리지 않는다
//    (🏛️ 옛 전시물 13종에서 쓴 수법 — 재질을 색마다 만들면 그 수가 곧 드로우콜이다).
//  ▶ THREE 를 인자로 받는다 — 이 파일이 three 를 import 하지 않아야 Node 테스트가 가짜 THREE 로 돌 수 있다.
//  ▶ 재질은 **전시물마다 새로** 만든다. disposeTree 가 재질까지 dispose 하므로 공유하면 다음 전시물이 깨진다.
//  ▶ game.js 의 mergeGeos 는 import 하지 않는다(순환) — 같은 방식의 작은 병합을 여기 둔다.
// =============================================================
const GEO = {
  sph: (T, a) => new T.SphereGeometry(...a),
  cyl: (T, a) => new T.CylinderGeometry(...a),
  cone: (T, a) => new T.ConeGeometry(...a),
  box: (T, a) => new T.BoxGeometry(...a),
  ico: (T, a) => new T.IcosahedronGeometry(...a),
  dod: (T, a) => new T.DodecahedronGeometry(...a),
  torus: (T, a) => new T.TorusGeometry(...a),
  lathe: (T, [pts, seg]) => new T.LatheGeometry(pts.map(([r, y]) => new T.Vector2(r, y)), seg),
  tube: (T, [pts, seg, r, radial]) => new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(q => new T.Vector3(...q))), seg, r, radial),
};

const MATERIAL = {
  solid: (T) => new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0, flatShading: true }),
  glow:  (T) => new T.MeshBasicMaterial({ vertexColors: true }),   // 빛 받지 않는 밝은 색(반딧불·달빛) — 채널 ≤0xd9 는 parts 테스트가 잠근다
  glass: (T) => new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.2, metalness: 0, transparent: true, opacity: 0.26, depthWrite: false, side: T.DoubleSide }),
};

function paint(T, geo, hex) {
  const c = new T.Color(hex), n = geo.attributes.position.count, arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  geo.setAttribute('color', new T.BufferAttribute(arr, 3));
  return geo;
}

function merge(T, geos) {
  const flat = geos.map(g => (g.index ? g.toNonIndexed() : g));
  const out = new T.BufferGeometry();
  for (const name of ['position', 'normal', 'color']) {
    const size = flat[0].attributes[name].itemSize;
    const total = flat.reduce((n, g) => n + g.attributes[name].count, 0);
    const arr = new Float32Array(total * size);
    let off = 0;
    for (const g of flat) { arr.set(g.attributes[name].array, off); off += g.attributes[name].count * size; }
    out.setAttribute(name, new T.BufferAttribute(arr, size));
  }
  return out;
}

/** @returns {THREE.Group|null} parts 가 없으면 null */
export function buildExhibitMesh(T, parts) {
  if (!parts || !parts.length) return null;
  const byMat = { solid: [], glow: [], glass: [] };
  for (const q of parts) {
    const geo = GEO[q.shape](T, q.args);
    geo.applyMatrix4(new T.Matrix4().compose(new T.Vector3(...q.pos), new T.Quaternion().setFromEuler(new T.Euler(...q.rot)), new T.Vector3(...q.scl)));
    byMat[q.mat].push(paint(T, geo, q.color));
  }
  const g = new T.Group();
  for (const [k, geos] of Object.entries(byMat)) {
    if (!geos.length) continue;
    const m = new T.Mesh(merge(T, geos), MATERIAL[k](T));
    if (k === 'solid') m.castShadow = true;
    g.add(m);
  }
  return g;
}
