export const PAL = { honey: 0xe2a55a, top: 0xf4dcaa, neck: 0x8a5630, board: 0x3b2a22, cream: 0xfff3dc, red: 0xd9574a, green: 0x5c9a68, gold: 0xf2c14e, blue: 0x6aa6d8, stick: 0xe9c48c, felt: 0xfff6e6, dark: 0x4a3324, strap: 0x4f8a5c };

export function makeKit(T) {
  const UP = new T.Vector3(0, 1, 0);
  const clay = (c) => new T.MeshStandardMaterial({ color: c, roughness: 0.92, metalness: 0, flatShading: true });
  const brass = (c = 0xe9bf4f) => new T.MeshStandardMaterial({ color: c, roughness: 0.42, metalness: 0.5, flatShading: true });
  function M(parent, geo, mat, p = [0, 0, 0], r = [0, 0, 0]) {
    const m = new T.Mesh(geo, typeof mat === 'number' ? clay(mat) : mat);
    m.position.set(...p); m.rotation.set(...r); m.castShadow = true; parent.add(m);
    return m;
  }
  function rod(parent, color, r, seg = 7) {
    const m = M(parent, new T.CylinderGeometry(r, r, 1, seg).translate(0, 0.5, 0), color);
    m.set = (a, b) => { const d = b.clone().sub(a); m.position.copy(a); m.scale.set(1, d.length(), 1); m.quaternion.setFromUnitVectors(UP, d.normalize()); };
    return m;
  }
  const strapTube = (parent, pts, r) => M(parent, new T.TubeGeometry(new T.CatmullRomCurve3(pts), 24, r, 5), PAL.strap);
  const V = (x, y, z) => new T.Vector3(x, y, z);
  return { T, M, rod, strapTube, clay, brass, PAL, V };
}

export function finish(rig, group, pose) {
  rig.root.add(group);
  const dispose = () => {
    group.removeFromParent();
    group.traverse((o) => {
      if (!o.isMesh) return;
      o.geometry.dispose();
      o.material.dispose();
    });
  };
  return { group, pose, dispose };
}
