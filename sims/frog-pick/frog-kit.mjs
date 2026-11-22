export const FG = Object.freeze({
  body: 0x86c95a, bodyD: 0x5ea444, belly: 0xcee098, eye: 0xd2d9de, ink: 0x2b2f36, hi: 0xd2d9de, cheek: 0xf09aa6, mouth: 0x3a4a30,
  pad: 0x58a04c, padD: 0x3b7a3e, padV: 0x86c060,
  wood: 0xa87a52, woodD: 0x7a5636,
  yellow: 0xf0cc48, yellowD: 0xd2a838, blue: 0x5f8fc8, blueL: 0x9cc2e4, pond: 0x8ecad6,
  gold: 0xe8b840, goldD: 0xc28a2c, ruby: 0xe0606e,
  lotus: 0xf2a6c0, lotusD: 0xe07aa0, lotusC: 0xf0cc48,
});

const TAU = Math.PI * 2;

export function frogKit(THREE, K, X) {
  const { clay, M, ext } = K;
  const { small } = X;
  const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const sph = (p, r, col, x, y, z, s = [1, 1, 1], ws = 18) => { const m = M(new THREE.SphereGeometry(r, ws, Math.max(6, ws * 0.75 | 0)), clay(col, { smooth: true }), x, y, z); m.scale.set(...s); p.add(m); return m; };
  const dot = (p, r, col, x, y, z, s = [1, 1, 1]) => { const m = small(M(new THREE.SphereGeometry(r, 8, 6), clay(col, { smooth: true }), x, y, z)); m.scale.set(...s); p.add(m); return m; };

  const blob = list => (x, y, s) => {
    let best = null;
    for (const [cx, cy, cz, rx, ry, rz] of list) {
      const q = 1 - ((x - cx) / rx) ** 2 - ((y - cy) / ry) ** 2;
      if (q <= 0) continue;
      const z = cz + s * rz * Math.sqrt(q);
      if (!best || s * z > s * best.p.z) best = { p: V3(x, y, z), n: V3((x - cx) / rx ** 2, (y - cy) / ry ** 2, (z - cz) / rz ** 2).normalize() };
    }
    return best;
  };
  const ellip = (p, e, col, ws = 20) => sph(p, 1, col, e[0], e[1], e[2], [e[3], e[4], e[5]], ws);
  function stick(g, m, hit, lift = 0) { m.position.copy(hit.p).addScaledVector(hit.n, lift); m.quaternion.setFromUnitVectors(V3(0, 0, 1), hit.n); g.add(m); return m; }
  function tube(p, pts, r, col, seg = 16, caps = true) {
    const c = new THREE.CatmullRomCurve3(pts);
    const m = new THREE.Mesh(new THREE.TubeGeometry(c, seg, r, 6, false), clay(col, { smooth: true })); p.add(m);
    if (caps) [pts[0], pts[pts.length - 1]].forEach(q => p.add(small(M(new THREE.SphereGeometry(r, 6, 5), clay(col, { smooth: true }), q.x, q.y, q.z))));
    return m;
  }
  function smile(g, surf, s, w, y, dip, r, col) {
    const pts = [];
    for (let i = 0; i <= 12; i++) { const t = i / 6 - 1, hit = surf(t * w, y - dip * (1 - t * t), s); if (hit) pts.push(hit.p.clone().addScaledVector(hit.n, r * 0.2)); }
    tube(g, pts, r, col);
  }
  function eyes(g, R, o, sides) {
    const ews = R < 0.07 ? 10 : 16, ex = (o.ex ?? 0.47) * R, ey = (o.ey ?? 0.6) * R, er = (o.er ?? 0.37) * R, ez = (o.ez ?? 0) * R;
    [-1, 1].forEach(sx => {
      sph(g, er, o.body ?? FG.body, sx * ex, ey, ez, [1, 1, 1], ews);
      sides.forEach(s => {
        const eg = new THREE.Group(); eg.position.set(sx * ex, ey, ez); eg.rotation.set(-0.32 * s, (s > 0 ? 0 : Math.PI) + s * sx * 0.16, 0); g.add(eg);
        const rs = er * 0.9, zf = er * 0.34 + rs * 0.78;
        sph(eg, rs, FG.eye, 0, er * 0.04, er * 0.34, [1, 1, 0.78], ews);
        const rp = rs * 0.6;
        dot(eg, rp, FG.ink, -sx * rs * 0.04, -rs * 0.02, zf - rp * 0.22, [1, 1.08, 0.45]);
        dot(eg, rp * 0.38, FG.hi, -sx * rs * 0.04 + rp * 0.34, rp * 0.4, zf + rp * 0.02);
        dot(eg, rp * 0.15, FG.hi, -sx * rs * 0.04 - rp * 0.3, -rp * 0.34, zf + rp * 0.0);
      });
    });
  }
  function face(g, surf, R, s, o = {}) {
    smile(g, surf, s, (o.mw ?? 0.46) * R, (o.my ?? -0.22) * R, (o.dip ?? 0.13) * R, R * 0.032, FG.mouth);
    [-1, 1].forEach(sx => {
      const ch = surf(sx * (o.cx ?? 0.66) * R, (o.cy ?? -0.16) * R, s);
      if (ch) stick(g, M(new THREE.SphereGeometry(R * 0.14, 10, 7), clay(FG.cheek, { smooth: true })), ch, -R * 0.015).scale.set(1, 0.66, 0.34);
      const ns = surf(sx * 0.11 * R, (o.ny ?? 0.14) * R, s);
      if (ns && o.nose !== false) stick(g, small(M(new THREE.SphereGeometry(R * 0.03, 6, 5), clay(FG.mouth, { smooth: true }))), ns, 0).scale.set(1, 0.7, 0.5);
    });
  }
  function band(g, R, sz, bd, a0, a1, col, wx = 1.16, ws = 32) {
    const geo = new THREE.SphereGeometry(1, ws, Math.max(3, Math.round((a1 - a0) * 9)), 0, TAU, a0, a1 - a0);
    geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), bd));
    geo.scale(wx * R, 0.84 * R, sz * R); geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, clay(col, { smooth: true })); g.add(m); return m;
  }
  function frogHead(p, R, x, y, z, o = {}) {
    const g = new THREE.Group(); g.position.set(x, y, z); p.add(g);
    const sz = o.sz ?? 0.92, sides = o.both ? [1, -1] : [1];
    const wx = o.wx ?? 1.16, ws = o.ws ?? (R < 0.07 ? 16 : 26), E = [[0, 0, 0, wx * R, 0.84 * R, sz * R]];
    const bd = new THREE.Vector3(...(o.both ? [0, -1, 0] : [0, -0.5, 0.86])).normalize(), cut = o.cut ?? (o.both ? 1.02 : 0.95);
    band(g, R, sz, bd, 0, cut, o.belly ?? FG.belly, wx, ws);
    band(g, R, sz, bd, cut, Math.PI, o.body ?? FG.body, wx, ws);
    const surf = blob(E);
    eyes(g, R, { ...o, ez: o.ez ?? (o.both ? 0 : 0.08) }, sides);
    sides.forEach(s => face(g, surf, R, s, o));
    if (o.hat) o.hat(g, R);
    return g;
  }
  function foot(p, r, x, y, z, ry, col, q = 1) {
    const f = new THREE.Group(); f.position.set(x, y, z); f.rotation.y = ry; p.add(f);
    sph(f, r, col, 0, 0, 0, [0.8, 0.32, 1.1], q < 1 ? 8 : 12);
    [-1, 0, 1].forEach(i => sph(f, r * 0.34, col, i * r * 0.5, r * 0.05, r * 0.95 - Math.abs(i) * r * 0.15, [1, 0.8, 1], q < 1 ? 6 : 8));
    return f;
  }
  function frogSit(p, R, x, y, z, o = {}) {
    const g = new THREE.Group(); g.position.set(x, y, z); p.add(g);
    const body = o.body ?? FG.body, dk = o.dark ?? FG.bodyD, q = R < 0.07 ? 0.6 : 1;
    sph(g, R * 0.78, body, 0, R * 0.5, -R * 0.08, [1, 0.8, 0.95], Math.round(20 * q));
    sph(g, R * 0.56, o.belly ?? FG.belly, 0, R * 0.42, R * 0.2, [0.95, 0.85, 0.7], Math.round(16 * q));
    [-1, 1].forEach(sx => {
      sph(g, R * 0.38, body, sx * R * 0.62, R * 0.3, -R * 0.12, [0.8, 0.75, 1.2], Math.round(14 * q));
      foot(g, R * 0.2, sx * R * 0.6, R * 0.05, R * 0.3, sx * 0.25, dk, q);
      sph(g, R * 0.12, body, sx * R * 0.32, R * 0.24, R * 0.48, [1, 1.5, 1], Math.round(10 * q));
      foot(g, R * 0.14, sx * R * 0.34, R * 0.04, R * 0.56, sx * 0.15, dk, q);
    });
    frogHead(g, R, 0, R * 1.08, R * 0.08, { ...o, both: false });
    return g;
  }

  function padShape(r, notch = 0.55) { const s = new THREE.Shape(); s.moveTo(0, 0); s.absarc(0, 0, r, notch / 2, TAU - notch / 2, false); s.lineTo(0, 0); return s; }
  function lilyPad(p, r, x, y, z, o = {}) {
    const g = new THREE.Group(); g.position.set(x, y, z); p.add(g);
    const th = o.th ?? r * 0.12, notch = o.notch ?? 0.55;
    g.add(M(ext(padShape(r, notch), th, th * 0.45, 18), clay(o.col ?? FG.pad, { smooth: true })));
    const sides = o.both === false ? [1] : [1, -1];
    sides.forEach(s => {
      const zz = s * (th / 2 + th * 0.42);
      for (let i = 1; i < 6; i++) {
        const a = notch / 2 + i * (TAU - notch) / 6;
        tube(g, [V3(Math.cos(a) * r * 0.12, Math.sin(a) * r * 0.12, zz), V3(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5, zz), V3(Math.cos(a) * r * 0.82, Math.sin(a) * r * 0.82, zz)], r * 0.022, o.vein ?? FG.padV, 4, false);
      }
      dot(g, r * 0.07, o.vein ?? FG.padV, 0, 0, zz, [1, 1, 0.4]);
    });
    return g;
  }
  function lotus(p, R, x, y, z, o = {}) {
    const g = new THREE.Group(); g.position.set(x, y, z); p.add(g);
    [[o.n1 ?? 8, R, o.t1 ?? 0.42, FG.lotus, 0], [o.n2 ?? 6, R * 0.8, o.t2 ?? 0.95, FG.lotusD, 0.3]].forEach(([n, l, tilt, col, off]) => {
      for (let i = 0; i < n; i++) {
        const yaw = new THREE.Group(); yaw.rotation.y = i * TAU / n + off; g.add(yaw);
        const tg = new THREE.Group(); tg.rotation.z = tilt; yaw.add(tg);
        sph(tg, 1, col, l * 0.5, 0, 0, [l * 0.52, l * 0.07, l * 0.24], 9);
        sph(tg, 1, col, l * 0.86, l * 0.012, 0, [l * 0.16, l * 0.05, l * 0.11], 6);
      }
    });
    sph(g, R * 0.24, FG.lotusC, 0, R * 0.12, 0, [1, 0.55, 1], 12);
    return g;
  }
  function sou(g, R, o = {}) {
    const h = new THREE.Group(); h.position.set(R * (o.x ?? 0), R * (o.y ?? 0.76), R * (o.z ?? -0.4)); h.rotation.set(o.tilt ?? -0.55, 0, o.rz ?? 0); h.scale.setScalar(o.s ?? 1); g.add(h);
    sph(h, R * 0.46, FG.yellow, 0, R * 0.06, 0, [1, 0.9, 1], 18);
    h.add(M(new THREE.CylinderGeometry(R * 0.44, R * 0.86, R * 0.16, 26, 1, true), clay(FG.yellow, { smooth: true, side: THREE.DoubleSide }), 0, -R * 0.02, 0));
    h.add(M(new THREE.TorusGeometry(R * 0.86, R * 0.035, 6, 30), clay(FG.yellowD, { smooth: true }), 0, -R * 0.1, 0).rotateX(Math.PI / 2));
    h.add(M(new THREE.TorusGeometry(R * 0.45, R * 0.05, 6, 22), clay(FG.yellowD, { smooth: true }), 0, R * 0.08, 0).rotateX(Math.PI / 2));
    dot(h, R * 0.08, FG.yellowD, 0, R * 0.48, 0);
    return h;
  }
  function crown(g, R, o = {}) {
    const c = new THREE.Group(); c.position.set(0, R * (o.y ?? 0.88), R * (o.z ?? -0.08)); c.rotation.z = o.tilt ?? 0.12; g.add(c);
    const r = R * (o.r ?? 0.36);
    c.add(M(new THREE.CylinderGeometry(r, r * 0.92, r * 0.62, 18, 1, true), clay(FG.gold, { smooth: true, side: THREE.DoubleSide })));
    c.add(M(new THREE.TorusGeometry(r * 0.96, r * 0.12, 6, 18), clay(FG.goldD, { smooth: true }), 0, -r * 0.3, 0).rotateX(Math.PI / 2));
    for (let i = 0; i < 5; i++) {
      const a = i * TAU / 5;
      c.add(M(new THREE.ConeGeometry(r * 0.24, r * 0.6, 6), clay(FG.gold, { smooth: true }), Math.sin(a) * r * 0.94, r * 0.55, Math.cos(a) * r * 0.94));
      dot(c, r * 0.13, FG.gold, Math.sin(a) * r * 0.94, r * 0.9, Math.cos(a) * r * 0.94);
    }
    dot(c, r * 0.2, FG.ruby, 0, 0, r * 1.02, [1, 1, 0.5]);
    dot(c, r * 0.2, FG.ruby, 0, 0, -r * 1.02, [1, 1, 0.5]);
    return c;
  }
  function drop(p, r, x, y, z, col = FG.blue) {
    const m = M(new THREE.SphereGeometry(r, 12, 10), clay(col, { smooth: true }), x, y, z);
    const pos = m.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) { const yy = pos.getY(i) / r; if (yy > 0) { const k = 1 - yy * 0.85; pos.setX(i, pos.getX(i) * k); pos.setZ(i, pos.getZ(i) * k); pos.setY(i, pos.getY(i) * 1.5); } }
    m.geometry.computeVertexNormals(); m.scale.z = 0.45; p.add(m); return m;
  }
  function heart(p, r, x, y, z, col = FG.cheek) {
    const s = new THREE.Shape(); s.moveTo(0, -r); s.bezierCurveTo(r * 1.4, -r * 0.1, r * 0.7, r * 1.05, 0, r * 0.4); s.bezierCurveTo(-r * 0.7, r * 1.05, -r * 1.4, -r * 0.1, 0, -r);
    const m = M(ext(s, r * 0.4, r * 0.2, 8), clay(col, { smooth: true }), x, y, z); p.add(m); return m;
  }
  return { sph, dot, blob, stick, tube, eyes, face, frogHead, frogSit, foot, lilyPad, lotus, sou, crown, drop, heart, V3 };
}
