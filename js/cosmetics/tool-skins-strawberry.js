export const SB = Object.freeze({ red: 0xd8404e, redD: 0xa82a3a, seed: 0xf0d070, leaf: 0x4f9a4a, leafD: 0x3a7a3a, cream: 0xe4d4c2, pink: 0xf0a0b0, wood: 0xb08068 });

export function strawberryKit(THREE, K, X) {
  const { clay, M, ext } = K;
  function leafCap(p, r, x, y, z, stem = true) {
    const c = M(ext(X.starShape(r, 0.38, 5), r * 0.12, r * 0.04, 2), clay(SB.leaf), x, y, z); c.rotation.x = -Math.PI / 2; p.add(c);
    if (stem) p.add(M(new THREE.CylinderGeometry(r * 0.1, r * 0.14, r * 0.5, 6), clay(SB.leafD), x, y + r * 0.25, z));
    return c;
  }
  function berry(p, R, h, x, y, z, o = {}) {
    const g = new THREE.Group(); g.position.set(x, y, z); p.add(g);
    const rf = t => R * Math.max(o.blunt ?? 0.04, Math.sin(t * Math.PI * 0.62) / Math.sin(Math.PI * 0.62)) ** 0.85;
    const pts = []; for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push(new THREE.Vector2(rf(t), t * h)); }
    pts.push(new THREE.Vector2(R * 0.5, h * 1.06), new THREE.Vector2(0.001, h * 1.08));
    g.add(new THREE.Mesh(new THREE.LatheGeometry(pts, 14), clay(o.col ?? SB.red, { smooth: true })));
    const n = o.seeds ?? 14;
    for (let i = 0; i < n; i++) {
      const t = 0.18 + 0.7 * ((i * 0.618) % 1), a = i * 2.4, r = rf(t);
      const sd = M(new THREE.SphereGeometry(R * 0.07, 5, 3), clay(SB.seed), Math.cos(a) * r, t * h, Math.sin(a) * r);
      sd.scale.set(1, 1.4, 1); g.add(X.small(sd));
    }
    if (o.cap !== false) leafCap(g, R * 0.95, 0, h * 1.04, 0, o.stem ?? true);
    return g;
  }
  const strawberryShape = (w, l) => {
    const s = new THREE.Shape();
    s.moveTo(0, -w * 0.55);
    s.bezierCurveTo(l * 0.35, -w * 1.15, l * 0.85, -w * 0.5, l, 0);
    s.bezierCurveTo(l * 0.85, w * 0.5, l * 0.35, w * 1.15, 0, w * 0.55);
    s.closePath(); return s;
  };
  return { leafCap, berry, strawberryShape };
}

export function strawberryThemes(THREE, K, X) {
  const { clay, M, ext } = K;
  const { small, pickArms, sickleBlade, netBag } = X;
  const { leafCap, berry, strawberryShape } = strawberryKit(THREE, K, X);
  const bH = (g, l, r = 0.03) => X.handle(g, { wood: SB.wood, grip: SB.leafD, knob: SB.red }, l, r);
  const canHandle = (g, col, x = -0.16) => g.add(M(new THREE.TorusGeometry(0.075, 0.015, 5, 12, Math.PI * 1.05), clay(col), x, 0.2, 0).rotateZ(Math.PI / 2 + 0.25));
  const seeds = (p, pts, z, x0 = 0, y0 = 0) => [-1, 1].forEach(sz => pts.forEach(([x, y]) => { const s = M(new THREE.SphereGeometry(0.0075, 5, 3), clay(SB.seed), x0 + x, y0 + y, sz * z); s.scale.z = 0.5; p.add(small(s)); }));
  return { strawberry: {
    axe(g) {
      const top = bH(g, 0.52), cy = top - 0.05;
      g.add(M(ext(strawberryShape(0.1, 0.22), 0.04, 0.012, 14), clay(SB.red, { smooth: true }), 0, cy, 0));
      seeds(g, [[0.05, 0.03], [0.09, -0.04], [0.12, 0.035], [0.16, -0.01], [0.06, -0.035], [0.1, 0.0], [0.18, 0.02], [0.14, -0.045]], 0.031, 0, cy);
      const c = M(ext(X.starShape(0.07, 0.4, 5), 0.012, 0.004, 2), clay(SB.leaf), 0.005, cy, 0); c.rotation.y = Math.PI / 2; g.add(c);
      g.add(M(new THREE.BoxGeometry(0.06, 0.1, 0.066), clay(SB.leafD), 0, cy, 0));
      g.scale.setScalar(1.18);
    },
    hoe(g) {
      const top = bH(g, 0.52), hd = new THREE.Group(); hd.position.y = top + 0.01; g.add(hd);
      hd.add(M(new THREE.BoxGeometry(0.08, 0.08, 0.075), clay(SB.leafD)));
      pickArms(hd, [clay(SB.red), clay(SB.red)], clay(SB.leaf));
      berry(hd, 0.04, 0.07, 0, 0.11, 0, { seeds: 8 }).rotation.z = Math.PI;
      g.scale.setScalar(1.18);
    },
    seed(g) {
      berry(g, 0.11, 0.2, 0, 0.27, 0, { seeds: 18, cap: false }).rotation.z = Math.PI;
      leafCap(g, 0.1, 0, 0.27, 0, false);
      g.add(M(new THREE.CylinderGeometry(0.012, 0.018, 0.07, 6), clay(SB.leafD), 0, 0.31, 0));
      g.add(M(new THREE.TorusGeometry(0.02, 0.007, 4, 10), clay(SB.leafD), 0, 0.35, 0));
      g.scale.setScalar(1.25);
    },
    water(g) {
      berry(g, 0.14, 0.22, 0, 0.06, 0, { blunt: 0.35, seeds: 22, stem: false });
      g.add(M(new THREE.CylinderGeometry(0.012, 0.016, 0.07, 6), clay(SB.leafD), 0, 0.36, 0));
      g.add(M(new THREE.SphereGeometry(0.02, 6, 5), clay(SB.leafD), 0, 0.395, 0));
      const sp = M(new THREE.CylinderGeometry(0.02, 0.03, 0.22, 8), clay(SB.leaf), 0.16, 0.24, 0); sp.rotation.z = -0.9; g.add(sp);
      leafCap(g, 0.035, 0.25, 0.31, 0, false).rotation.set(0, 0, -0.9 - Math.PI / 2);
      canHandle(g, SB.leafD);
      g.scale.setScalar(1.25);
    },
    sickle(g) {
      const top = bH(g, 0.30, 0.034);
      const { bl } = sickleBlade(g, top, [clay(SB.red), clay(SB.red), clay(SB.redD)], clay(SB.cream), 1.25);
      [[0.0, 0.05], [0.012, 0.1], [0.03, 0.17], [0.05, 0.22]].forEach(([x, y]) => [-1, 1].forEach(sz => { const s = M(new THREE.SphereGeometry(0.007, 5, 3), clay(SB.seed), x, y, sz * 0.009); s.scale.z = 0.5; bl.add(small(s)); }));
      leafCap(g, 0.05, 0, top - 0.005, 0, false);
      g.add(M(new THREE.CylinderGeometry(0.032, 0.04, 0.05, 9), clay(SB.leafD), 0, top - 0.03, 0));
      g.scale.setScalar(1.18);
    },
    shovel(g) {
      const top = bH(g, 0.58), by = top + 0.03;
      g.add(M(ext(strawberryShape(0.11, 0.2), 0.03, 0.01, 14), clay(SB.red, { smooth: true }), 0, by, 0).rotateZ(Math.PI / 2));
      seeds(g, [[0.04, 0.05], [-0.04, 0.07], [0.0, 0.1], [0.05, 0.13], [-0.05, 0.12], [0.02, 0.16], [-0.015, 0.04]], 0.026, 0, by);
      leafCap(g, 0.06, 0, by + 0.01, 0, false).rotation.x = 0;
      g.add(M(new THREE.CylinderGeometry(0.036, 0.044, 0.06, 9), clay(SB.leafD), 0, top + 0.0, 0));
      g.scale.setScalar(1.18);
    },
    hammer(g) {
      const top = bH(g, 0.50), y = top - 0.04;
      [-1, 1].forEach(sx => { const b = berry(g, 0.06, 0.1, sx * 0.005, y, 0, { seeds: 10, stem: false }); b.rotation.z = -sx * Math.PI / 2; });
      g.add(M(new THREE.BoxGeometry(0.05, 0.07, 0.07), clay(SB.leafD), 0, y, 0));
      g.scale.setScalar(1.18);
    },
    rod(g) {
      X.rodFrame(g, { knobFn: g => g.add(M(new THREE.SphereGeometry(0.042, 8, 6), clay(SB.red, { smooth: true }), 0, -0.1, 0)), rear: clay(SB.leafD), line: 0xe8dcd4, pole: (p, L) => {
        p.add(M(new THREE.CylinderGeometry(0.013, 0.026, L, 7), clay(SB.wood), 0, L / 2, 0));
        [0.3, 0.6].forEach(f => leafCap(p, 0.03 - f * 0.01, 0, L * f, 0, false));
      } }, b => berry(b, 0.042, 0.075, 0, -0.06, 0, { seeds: 8 }));
    },
    net(g) {
      g.add(M(new THREE.CylinderGeometry(0.024, 0.028, 0.66, 7), clay(SB.wood), 0, 0.27, 0));
      g.add(M(new THREE.SphereGeometry(0.04, 8, 6), clay(SB.red, { smooth: true }), 0, -0.08, 0));
      g.add(M(new THREE.TorusGeometry(0.17, 0.022, 6, 20), clay(SB.red), 0, 0.6, 0).rotateX(Math.PI / 2));
      g.add(M(new THREE.ConeGeometry(0.16, 0.3, 12, 1, true), netBag(SB.pink, 0.55), 0, 0.75, 0));
      leafCap(g, 0.06, 0, 0.62, 0.17, false);
      berry(g, 0.03, 0.05, 0.0, 0.585, 0.17, { seeds: 6, stem: false }).rotation.z = Math.PI;
      g.scale.setScalar(1.25);
    },
  } };
}

export const STRAWBERRY_UMBRELLA = Object.freeze({ N: 10, R: 0.95, th: 1.05, overlap: 1, shape: { w: () => 1, tip: 0 } });

export function strawberryUmbrellaLook(THREE, K, X, { root, L, def, jHook }) {
  const { clay, M, V } = K;
  return {
    outer: k => clay(k % 2 ? SB.redD : SB.red), inner: () => clay(SB.pink, { side: THREE.BackSide, lift: 0.3 }),
    shaft() {
      root.add(M(new THREE.CylinderGeometry(0.022, 0.027, L, 7), clay(SB.wood), 0, L / 2, 0));
      jHook(clay(SB.leafD), 0.07);
    },
    deco(h) {
      [[0.4, 0.1], [0.62, -0.12], [0.85, 0.06]].forEach(([th, ph]) => { const { p, n } = X.goreSurf(def.R * 1.004, th, ph); const s = M(new THREE.SphereGeometry(0.025, 6, 4), clay(SB.seed), p.x, p.y, p.z); s.quaternion.setFromUnitVectors(V(0, 1, 0), n); s.scale.set(0.8, 0.4, 1.3); h.add(s); });
    },
    finial(c) {
      const lc = M(K.ext(X.starShape(0.42, 0.42, 5), 0.03, 0.01, 2), clay(SB.leaf), 0, -0.05, 0); lc.rotation.x = -Math.PI / 2; c.add(lc);
      c.add(M(new THREE.CylinderGeometry(0.03, 0.045, 0.16, 7), clay(SB.leafD), 0, 0.06, 0));
    },
  };
}
