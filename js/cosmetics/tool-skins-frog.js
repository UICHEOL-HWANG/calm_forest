export const FG = Object.freeze({ body: 0x6cc44c, bodyD: 0x4c9a3c, belly: 0xcee098, eye: 0xd8d8d8, ink: 0x2b2f36, hi: 0xd8d8d8, cheek: 0xf09aa6, mouth: 0x3a4a30, wood: 0xa87a52 });

const EYE_LIFT = 0.3;

export function frogKit(THREE, K, X) {
  const { clay, M } = K;
  const { small } = X;
  const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const sph = (p, r, col, x, y, z, s = [1, 1, 1], ws = 18, lift = 0) => { const m = M(new THREE.SphereGeometry(r, ws, Math.max(6, ws * 0.75 | 0)), clay(col, { smooth: true, lift }), x, y, z); m.scale.set(...s); p.add(m); return m; };
  const dot = (p, r, col, x, y, z, s = [1, 1, 1], lift = 0) => { const m = small(M(new THREE.SphereGeometry(r, 8, 6), clay(col, { smooth: true, lift }), x, y, z)); m.scale.set(...s); p.add(m); return m; };
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
  function stick(g, m, hit, lift = 0) { m.position.copy(hit.p).addScaledVector(hit.n, lift); m.quaternion.setFromUnitVectors(V3(0, 0, 1), hit.n); g.add(m); return m; }
  function tube(p, pts, r, col, seg = 16) {
    const c = new THREE.CatmullRomCurve3(pts);
    const m = new THREE.Mesh(new THREE.TubeGeometry(c, seg, r, 6, false), clay(col, { smooth: true })); p.add(m);
    [pts[0], pts[pts.length - 1]].forEach(q => p.add(small(M(new THREE.SphereGeometry(r, 6, 5), clay(col, { smooth: true }), q.x, q.y, q.z))));
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
      sph(g, er, FG.body, sx * ex, ey, ez, [1, 1, 1], ews);
      sides.forEach(s => {
        const eg = new THREE.Group(); eg.position.set(sx * ex, ey, ez); eg.rotation.set(-0.32 * s, (s > 0 ? 0 : Math.PI) + s * sx * 0.16, 0); g.add(eg);
        const rs = er * 0.9, zf = er * 0.34 + rs * 0.78;
        sph(eg, rs, FG.eye, 0, er * 0.04, er * 0.34, [1, 1, 0.78], ews, EYE_LIFT);
        const rp = rs * 0.6;
        dot(eg, rp, FG.ink, -sx * rs * 0.04, -rs * 0.02, zf - rp * 0.22, [1, 1.08, 0.45]);
        dot(eg, rp * 0.38, FG.hi, -sx * rs * 0.04 + rp * 0.34, rp * 0.4, zf + rp * 0.02, [1, 1, 1], EYE_LIFT);
        dot(eg, rp * 0.15, FG.hi, -sx * rs * 0.04 - rp * 0.3, -rp * 0.34, zf, [1, 1, 1], EYE_LIFT);
      });
    });
  }
  function face(g, surf, R, s, o = {}) {
    smile(g, surf, s, (o.mw ?? 0.46) * R, (o.my ?? -0.22) * R, (o.dip ?? 0.13) * R, R * 0.032, FG.mouth);
    [-1, 1].forEach(sx => {
      const ch = surf(sx * 0.66 * R, -0.16 * R, s);
      if (ch) stick(g, M(new THREE.SphereGeometry(R * 0.14, 10, 7), clay(FG.cheek, { smooth: true })), ch, -R * 0.015).scale.set(1, 0.66, 0.34);
      const ns = surf(sx * 0.11 * R, 0.14 * R, s);
      if (ns) stick(g, small(M(new THREE.SphereGeometry(R * 0.03, 6, 5), clay(FG.mouth, { smooth: true }))), ns, 0).scale.set(1, 0.7, 0.5);
    });
  }
  function band(g, R, sz, bd, a0, a1, col, wx, ws) {
    const geo = new THREE.SphereGeometry(1, ws, Math.max(3, Math.round((a1 - a0) * 9)), 0, Math.PI * 2, a0, a1 - a0);
    geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), bd));
    geo.scale(wx * R, 0.84 * R, sz * R); geo.computeVertexNormals();
    g.add(new THREE.Mesh(geo, clay(col, { smooth: true })));
  }
  function frogHead(p, R, x, y, z, o = {}) {
    const g = new THREE.Group(); g.position.set(x, y, z); p.add(g);
    const sz = o.sz ?? 0.92, sides = o.both ? [1, -1] : [1];
    const wx = o.wx ?? 1.16, ws = o.ws ?? (R < 0.07 ? 16 : 26);
    const bd = new THREE.Vector3(...(o.both ? [0, -1, 0] : [0, -0.5, 0.86])).normalize(), cut = o.both ? 1.02 : 0.95;
    band(g, R, sz, bd, 0, cut, FG.belly, wx, ws);
    band(g, R, sz, bd, cut, Math.PI, FG.body, wx, ws);
    const surf = blob([[0, 0, 0, wx * R, 0.84 * R, sz * R]]);
    eyes(g, R, { ...o, ez: o.ez ?? (o.both ? 0 : 0.08) }, sides);
    sides.forEach(s => face(g, surf, R, s, o));
    return g;
  }
  function foot(p, r, x, y, z, ry, col) {
    const f = new THREE.Group(); f.position.set(x, y, z); f.rotation.y = ry; p.add(f);
    sph(f, r, col, 0, 0, 0, [0.8, 0.32, 1.1], 12);
    [-1, 0, 1].forEach(i => sph(f, r * 0.34, col, i * r * 0.5, r * 0.05, r * 0.95 - Math.abs(i) * r * 0.15, [1, 0.8, 1], 8));
    return f;
  }
  return { sph, tube, frogHead, foot };
}

export function frogThemes(THREE, K, X) {
  const { clay, M, ext } = K;
  const { roundBlade, pickArms, sickleBlade, netBag } = X;
  const F = frogKit(THREE, K, X);
  const motif = (p, r, x, y, z) => F.frogHead(p, r, x, y, z, { sz: 0.9 });
  const P = { wood: FG.wood, grip: FG.bodyD, knob: FG.body, bands: [[FG.body, 0.62]] };
  const H = (g, l, r = 0.03) => X.handle(g, P, l, r);
  const canHandle = (g, col, x = -0.155, y = 0.19) => {
    const t = M(new THREE.TorusGeometry(0.075, 0.016, 8, 16, Math.PI * 1.05), clay(col, { smooth: true }), x, y, 0).rotateZ(Math.PI / 2 + 0.25); g.add(t);
    [0, Math.PI * 1.05].forEach(a => t.add(M(new THREE.SphereGeometry(0.018, 10, 8), clay(col, { smooth: true }), Math.cos(a) * 0.075, Math.sin(a) * 0.075, 0)));
  };
  const spout = (g, col, tip, x = 0.17, y = 0.24) => {
    const sp = M(new THREE.CylinderGeometry(0.02, 0.032, 0.22, 10), clay(col, { smooth: true }), x, y, 0); sp.rotation.z = -0.9; g.add(sp);
    const t = M(new THREE.CylinderGeometry(0.034, 0.024, 0.03, 12), clay(tip, { smooth: true }), x + Math.sin(0.9) * 0.115, y + Math.cos(0.9) * 0.115, 0); t.rotation.z = -0.9; g.add(t);
  };
  return { frog: {
    axe(g) {
      const top = H(g, 0.52), cy = top - 0.05;
      g.add(M(new THREE.CylinderGeometry(0.034, 0.034, 0.1, 12), clay(FG.bodyD, { smooth: true }), 0, cy, 0));
      F.frogHead(g, 0.1, 0.13, cy - 0.01, 0, { both: true, sz: 0.55 });
      g.scale.setScalar(1.18);
    },
    hoe(g) {
      const top = H(g, 0.52), hd = new THREE.Group(); hd.position.y = top + 0.01; g.add(hd);
      hd.add(M(new THREE.BoxGeometry(0.08, 0.08, 0.075), clay(FG.bodyD)));
      pickArms(hd, [clay(FG.body), clay(FG.bodyD)], clay(FG.belly));
      motif(hd, 0.055, 0, 0.09, 0);
      g.scale.setScalar(1.18);
    },
    seed(g) {
      F.sph(g, 0.11, FG.body, 0, 0.09, 0, [1, 1.05, 1], 20);
      g.add(M(new THREE.CylinderGeometry(0.045, 0.065, 0.05, 12), clay(FG.bodyD, { smooth: true }), 0, 0.2, 0));
      g.add(M(new THREE.TorusGeometry(0.05, 0.011, 6, 14), clay(FG.belly, { smooth: true }), 0, 0.2, 0).rotateX(Math.PI / 2));
      motif(g, 0.06, 0, 0.1, 0.085);
      g.scale.setScalar(1.25);
    },
    water(g) {
      F.frogHead(g, 0.125, 0.04, 0.15, 0, { sz: 0.95, my: -0.24, dip: 0.14, wx: 1.08, ws: 22, ez: 0.16 });
      [-1, 1].forEach(sx => F.foot(g, 0.04, 0.04 + sx * 0.075, 0.055, 0.075, sx * 0.25, FG.bodyD));
      spout(g, FG.body, FG.bodyD);
      canHandle(g, FG.bodyD);
      g.scale.setScalar(1.25);
    },
    sickle(g) {
      const top = H(g, 0.30, 0.034);
      const { bl, tip } = sickleBlade(g, top, [clay(FG.body), clay(FG.body), clay(FG.bodyD)], clay(FG.belly), 1.2);
      motif(bl, 0.042, tip.x, tip.y + 0.015, 0);
      g.add(M(new THREE.CylinderGeometry(0.032, 0.04, 0.05, 9), clay(FG.bodyD), 0, top - 0.01, 0));
      g.scale.setScalar(1.18);
    },
    shovel(g) {
      const top = H(g, 0.58), by = top + 0.03;
      g.add(M(new THREE.CylinderGeometry(0.036, 0.044, 0.07, 9), clay(FG.bodyD), 0, top + 0.01, 0));
      g.add(M(ext(roundBlade(0.105, 0.13), 0.03, 0.01, 14), clay(FG.body, { smooth: true }), 0, by, 0));
      motif(g, 0.058, 0, by + 0.11, 0.035);
      g.scale.setScalar(1.18);
    },
    hammer(g) {
      const top = H(g, 0.50), y = top - 0.04;
      const head = M(new THREE.CylinderGeometry(0.05, 0.05, 0.15, 14), clay(FG.bodyD, { smooth: true }), 0, y, 0); head.rotation.z = Math.PI / 2; g.add(head);
      [-1, 1].forEach(sx => g.add(M(new THREE.CylinderGeometry(0.054, 0.054, 0.02, 14), clay(FG.belly, { smooth: true }), sx * 0.075, y, 0).rotateZ(Math.PI / 2)));
      motif(g, 0.05, 0, y + 0.075, 0.01);
      g.scale.setScalar(1.18);
    },
    rod(g) {
      X.rodFrame(g, { knobFn: g => g.add(M(new THREE.SphereGeometry(0.042, 12, 9), clay(FG.body, { smooth: true }), 0, -0.1, 0)), rear: clay(FG.bodyD), line: 0xd8dcd0, pole: (p, L) => {
        p.add(M(new THREE.CylinderGeometry(0.013, 0.026, L, 8), clay(FG.wood), 0, L / 2, 0));
        [0.3, 0.55, 0.8].forEach(f => p.add(M(new THREE.CylinderGeometry(0.027 - f * 0.013, 0.027 - f * 0.013, 0.02, 10), clay(FG.body, { smooth: true }), 0, L * f, 0)));
      } }, b => F.frogHead(b, 0.05, 0, -0.04, 0, { sz: 0.9 }));
    },
    net(g) {
      g.add(M(new THREE.CylinderGeometry(0.024, 0.028, 0.66, 7), clay(FG.wood), 0, 0.27, 0));
      g.add(M(new THREE.SphereGeometry(0.04, 10, 8), clay(FG.body, { smooth: true }), 0, -0.08, 0));
      g.add(M(new THREE.TorusGeometry(0.17, 0.02, 8, 24), clay(FG.body, { smooth: true }), 0, 0.6, 0).rotateX(Math.PI / 2));
      g.add(M(new THREE.ConeGeometry(0.16, 0.3, 14, 1, true), netBag(FG.belly, 0.5), 0, 0.75, 0));
      motif(g, 0.05, 0, 0.64, 0.17);
      g.scale.setScalar(1.25);
    },
  } };
}

export const FROG_UMBRELLA = Object.freeze({ N: 8, R: 1.0, th: 1.0, overlap: 1, shape: { w: () => 1, tip: 0.02 } });

export function frogUmbrellaLook(THREE, K, X, { root, L, def, jHook }) {
  const { clay, M } = K, F = frogKit(THREE, K, X);
  return {
    outer: k => clay(k % 2 ? FG.belly : FG.body, { smooth: true }), inner: () => clay(FG.belly, { side: THREE.BackSide }),
    shaft() {
      root.add(M(new THREE.CylinderGeometry(0.022, 0.027, L, 7), clay(FG.wood), 0, L / 2, 0));
      jHook(clay(FG.body), 0.07);
    },
    deco() {},
    finial(c) {
      c.add(M(new THREE.TorusGeometry(def.R * Math.sin(def.th) * 0.995, 0.035, 6, 40), clay(FG.bodyD, { smooth: true }), 0, (Math.cos(def.th) - 1) * def.R, 0).rotateX(Math.PI / 2));
      F.frogHead(c, 0.17, 0, 0.12, 0, { sz: 0.92 });
    },
  };
}
