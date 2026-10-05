// =============================================================
//  🏠 집 모델 재질별 병합 — 드로우콜 줄이기 (7단계 모델이 쓴다)
//  ------------------------------------------------------------
//  7단계(정원 저택)는 건물 + 정원이라 조각이 수백 개다. 병합하지 않으면 메시 수 = 드로우콜 수.
//  같은 재질(+같은 role)의 메시를 한 지오메트리로 합쳐 **재질 수 = 드로우콜 수** 로 만든다.
//
//  ⚠️ role('roof'|'wall'|'door'|'window') 은 색 스와치·밤 점등이 메시 단위로 읽는다 → 키에 role 을 넣어
//     role 이 다른 메시끼리는 합치지 않고, 합친 메시에 같은 userData.role 을 단다.
//     baseColor 는 prepHouseMeshes 가 병합 **뒤에** 기록한다(mountHouseModel 순서 그대로).
//  ⚠️ castShadow/receiveShadow 는 prepHouseMeshes 가 일괄로 덮어쓰므로 키에 넣지 않는다.
//  THREE 는 인자로 받는다(js/house/*.js 와 같은 규칙 — 노드에서 import 안 한다).
// =============================================================

/** root 아래 모든 Mesh 를 (재질, role) 단위로 병합해 root 직속 Mesh 로 바꾼다. 빈 Group 은 걷어낸다. 병합된 메시 수를 돌려준다. */
export function mergeByMaterial(THREE, root) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map();   // key → { material, role, geos:[] }
  const meshes = [];
  root.traverse((o) => { if (o.isMesh && !o.isInstancedMesh && !o.isSkinnedMesh) meshes.push(o); });
  for (const m of meshes) {
    const role = m.userData.role || '';
    const key = `${m.material.uuid}|${role}`;
    let b = buckets.get(key);
    if (!b) { b = { material: m.material, role, geos: [] }; buckets.set(key, b); }
    const rel = new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld);
    const geo = m.geometry.clone().applyMatrix4(rel);
    b.geos.push(geo.index ? geo.toNonIndexed() : geo);
    m.parent.remove(m); m.geometry.dispose();
  }
  // 메시가 빠져 빈 껍데기가 된 Group(벤치 등)을 정리
  const prune = (node) => {
    for (const c of [...node.children]) { prune(c); if (c.isGroup && c.children.length === 0) node.remove(c); }
  };
  prune(root);
  let n = 0;
  for (const b of buckets.values()) {
    const merged = mergeGeometries(THREE, b.geos);
    const mesh = new THREE.Mesh(merged, b.material);
    if (b.role) mesh.userData.role = b.role;
    mesh.castShadow = mesh.receiveShadow = true;
    root.add(mesh); n++;
    for (const g of b.geos) g.dispose();
  }
  return n;
}

/** 위치·법선·uv 만 이어 붙인다(전부 non-indexed). 색은 재질이 갖는다. */
export function mergeGeometries(THREE, geos) {
  const out = new THREE.BufferGeometry();
  for (const name of ['position', 'normal', 'uv']) {
    if (!geos[0].attributes[name]) continue;
    const size = geos[0].attributes[name].itemSize;
    let total = 0;
    for (const g of geos) total += g.attributes[name].count;
    const arr = new Float32Array(total * size);
    let off = 0;
    for (const g of geos) { arr.set(g.attributes[name].array, off); off += g.attributes[name].count * size; }
    out.setAttribute(name, new THREE.BufferAttribute(arr, size));
  }
  return out;
}
