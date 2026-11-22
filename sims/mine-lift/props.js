export function buildLift(T, id) {
  const mat = (c, extra = {}) => new T.MeshStandardMaterial({ color: c, roughness: 0.85, metalness: 0, flatShading: true, ...extra });
  const glow = (c, k = 1.2) => new T.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: k, roughness: 0.4 });
  const M = (geo, m, parent, p = [0, 0, 0], r = [0, 0, 0]) => { const o = new T.Mesh(geo, m); o.position.set(...p); o.rotation.set(...r); o.castShadow = true; parent.add(o); return o; };
  const B = (w, h, d) => new T.BoxGeometry(w, h, d);
  const g = new T.Group(), cage = new T.Group(), spin = [];
  g.add(cage);
  const hole = new T.Mesh(new T.CircleGeometry(1.05, 20), new T.MeshBasicMaterial({ color: 0x050608 }));
  hole.rotation.x = -Math.PI / 2; hole.position.y = 0.01; g.add(hole);
  let gate = null, ropeTop = 3.3;
  const lamp = (parent, p) => { M(B(0.16, 0.22, 0.16), mat(0x3a3330), parent, p); M(new T.SphereGeometry(0.07, 8, 6), glow(0xffc66a, 2), parent, [p[0], p[1] - 0.02, p[2]]); const l = new T.PointLight(0xffc27a, 6, 9, 1.2); l.position.set(p[0], p[1], p[2] + 0.4); parent.add(l); };

  if (id === 'A') {
    const wood = mat(0x7a5232), dark = mat(0x5a3b24);
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) M(B(0.18, 3.4, 0.18), wood, g, [x, 1.7, z]);
    M(B(2.3, 0.22, 0.24), wood, g, [0, 3.4, 0]); M(B(0.24, 0.22, 2.3), wood, g, [0, 3.4, 0]);
    const wheel = M(new T.CylinderGeometry(0.34, 0.34, 0.12, 12), dark, g, [0, 3.62, 0], [Math.PI / 2, 0, 0]); spin.push([wheel, 'y']);
    M(B(1.6, 0.12, 1.6), mat(0x8a6a44), cage, [0, 0.08, 0]);
    for (const [x, z, w, d] of [[0, -0.76, 1.6, 0.08], [-0.76, 0, 0.08, 1.6], [0.76, 0, 0.08, 1.6]]) { M(B(w, 0.08, d), wood, cage, [x, 0.75, z]); M(B(w, 0.08, d), wood, cage, [x, 0.42, z]); }
    gate = new T.Group(); gate.position.set(-0.76, 0, 0.78); cage.add(gate);
    for (const y of [0.42, 0.75]) M(B(1.52, 0.07, 0.07), mat(0xa07a4a), gate, [0.76, y, 0]);
    M(B(0.07, 0.8, 0.07), wood, gate, [1.48, 0.42, 0]);
    lamp(g, [1.0, 2.5, 1.14]);
  } else if (id === 'B') {
    const iron = mat(0x3c4048, { metalness: 0.4, roughness: 0.6 }), brass = mat(0xc89a48, { metalness: 0.5, roughness: 0.45 });
    for (const [x, z] of [[-1.05, -1.05], [1.05, -1.05], [-1.05, 1.05], [1.05, 1.05]]) M(B(0.14, 3.6, 0.14), iron, g, [x, 1.8, z]);
    M(B(2.4, 0.18, 2.4), iron, g, [0, 3.6, 0]);
    const gear = M(new T.CylinderGeometry(0.42, 0.42, 0.1, 10), brass, g, [0.7, 3.85, 0], [Math.PI / 2, 0, 0]); spin.push([gear, 'y']);
    M(B(1.7, 0.1, 1.7), mat(0x2a2c30), cage, [0, 0.06, 0]);
    for (let i = 0; i < 8; i++) M(B(0.22, 0.02, 0.12), mat(i % 2 ? 0x2a2a2a : 0xe8b830), cage, [-0.77 + i * 0.22, 0.12, 0.79]);
    for (let k = -3; k <= 3; k++) { M(B(0.04, 1.9, 0.04), iron, cage, [k * 0.26, 1.0, -0.82]); M(B(0.04, 1.9, 0.04), iron, cage, [-0.82, 1.0, k * 0.26]); M(B(0.04, 1.9, 0.04), iron, cage, [0.82, 1.0, k * 0.26]); }
    M(B(1.7, 0.08, 1.7), iron, cage, [0, 1.95, 0]);
    gate = new T.Group(); gate.position.set(-0.82, 0, 0.82); cage.add(gate);
    for (let k = 0; k < 7; k++) M(B(0.04, 1.9, 0.04), brass, gate, [0.02 + k * 0.26, 1.0, 0]);
    lamp(cage, [0, 1.75, 0]);
    ropeTop = 3.6;
  } else {
    const wood = mat(0x8a6038), rim = mat(0x5f4630);
    for (const x of [-1.1, 1.1]) M(B(0.2, 3.2, 0.2), wood, g, [x, 1.6, 0]);
    M(B(2.6, 0.22, 0.22), wood, g, [0, 3.2, 0]);
    const crank = new T.Group(); crank.position.set(1.55, 0.95, 0); g.add(crank); spin.push([crank, 'x']);
    M(new T.CylinderGeometry(0.28, 0.28, 0.5, 10), rim, crank, [0, 0, 0], [0, 0, Math.PI / 2]);
    M(B(0.08, 0.7, 0.08), wood, crank, [0.3, 0.3, 0]);
    for (const z of [-0.3, 0.3]) M(B(0.18, 1.0, 0.18), wood, g, [1.55, 0.5, z]);
    const bucket = new T.Mesh(new T.CylinderGeometry(0.85, 0.72, 0.8, 12, 1, true), mat(0x9a7448, { side: T.DoubleSide })); bucket.position.y = 0.42; cage.add(bucket);
    M(new T.CylinderGeometry(0.72, 0.72, 0.08, 12), mat(0x7a5a38), cage, [0, 0.06, 0]);
    for (const y of [0.2, 0.62]) M(new T.TorusGeometry(0.8 - (0.62 - y) * 0.15, 0.04, 6, 16), rim, cage, [0, y, 0], [Math.PI / 2, 0, 0]);
    for (const a of [0, 2.1, 4.2]) { const r = M(B(0.03, 2.6, 0.03), mat(0xc8b088), cage, [Math.cos(a) * 0.4, 2.1, Math.sin(a) * 0.4]); r.rotation.z = Math.cos(a) * 0.15; r.rotation.x = -Math.sin(a) * 0.15; }
    lamp(g, [-1.1, 2.6, 0.2]);
    ropeTop = 3.2;
  }
  const rope = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, 1, 6), mat(0xd8c49a)); g.add(rope);
  const setRide = (t) => {
    const close = Math.min(1, t / 0.3), sink = Math.max(0, (t - 0.3) / 0.7);
    if (gate && id === 'A') gate.rotation.y = -Math.PI / 2 * (1 - close);
    if (gate && id === 'B') gate.position.x = -0.82 - 1.6 * (1 - close);
    cage.position.y = -2.8 * sink * sink;
    const bot = cage.position.y + (id === 'C' ? 3.4 : id === 'B' ? 2.0 : 0.8);
    rope.scale.y = Math.max(0.01, ropeTop - bot); rope.position.y = (ropeTop + bot) / 2;
    for (const [o, ax] of spin) o.rotation[ax] = t * 9;
  };
  const fill = new T.PointLight(0xffd9a0, 4, 7, 1.4); fill.position.set(0.6, 2.2, 2.2); g.add(fill);
  setRide(0);
  return { g, cage, setRide };
}
