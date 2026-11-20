export const OC = Object.freeze({ pink: 0xe87a96, pinkD: 0xc4567c, rose: 0xf2a8b8, vio: 0x8a5ab8, suck: 0xf0d2d6, ink: 0x2e2840, wood: 0x9a7a8e });

export function octopusKit(THREE, K, X) {
  const { clay, M, V } = K, { small, curve, taper } = X;
  const faceCam = (q, tg) => tg.clone().cross(V(0, 0, 1)).normalize().add(V(0, 0, 0.8)).normalize();
  function tentacle(p, pts, r0, r1, col, o = {}) {
    const c = curve(pts), rf = t => r0 + (r1 - r0) * t;
    p.add(new THREE.Mesh(taper(c, rf, o.segs ?? 16, 6), clay(col, { smooth: true })));
    const e = c.getPointAt(1); p.add(M(new THREE.SphereGeometry(r1, 6, 4), clay(col, { smooth: true }), e.x, e.y, e.z));
    const n = o.n ?? 5, t0 = o.t0 ?? 0.12, t1 = o.t1 ?? 0.85, side = o.side ?? faceCam;
    for (let i = 0; i < n; i++) {
      const t = t0 + (t1 - t0) * i / Math.max(1, n - 1), q = c.getPointAt(t), nr = side(q, c.getTangentAt(t)), rr = rf(t);
      const s = M(new THREE.SphereGeometry(rr * 0.5, 6, 3), clay(OC.suck), q.x + nr.x * rr * 0.85, q.y + nr.y * rr * 0.85, q.z + nr.z * rr * 0.85);
      s.quaternion.setFromUnitVectors(V(0, 1, 0), nr); s.scale.set(1, 0.4, 1); p.add(small(s));
    }
    return c;
  }
  function eye(p, r, x, y, z, ry = 0) {
    const e = new THREE.Group(); e.position.set(x, y, z); e.rotation.y = ry; p.add(e);
    const w = M(new THREE.SphereGeometry(r, 8, 6), clay(OC.suck, { smooth: true })); w.scale.z = 0.5; e.add(w);
    const pu = M(new THREE.SphereGeometry(r * 0.62, 7, 5), clay(OC.ink, { smooth: true }), 0, -r * 0.05, r * 0.25); pu.scale.set(1, 1.15, 0.5); e.add(pu);
    return e;
  }
  function head(p, r, x, y, z, col = OC.pink, ry = 0.5) {
    const h = new THREE.Group(); h.position.set(x, y, z); p.add(h);
    const m = M(new THREE.SphereGeometry(r, 12, 9), clay(col, { smooth: true }), 0, r * 0.25, 0); m.scale.set(1, 1.25, 1); h.add(m);
    [-1, 1].forEach(s => eye(h, r * 0.26, Math.sin(ry + s * 0.42) * r * 0.86, -r * 0.05, Math.cos(ry + s * 0.42) * r * 0.86, ry + s * 0.42));
    [-1, 1].forEach(s => h.add(small(M(new THREE.SphereGeometry(r * 0.13, 6, 4), clay(OC.rose), Math.sin(ry + s * 0.8) * r * 0.9, -r * 0.35, Math.cos(ry + s * 0.8) * r * 0.9))));
    return h;
  }
  function bob(b, s = 1, col = OC.pink) {
    head(b, 0.032 * s, 0, 0, 0, col, 0.4);
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * Math.PI * 2 + 0.3, d = (f, y) => V(Math.cos(a) * f * s, y * s, Math.sin(a) * f * s);
      tentacle(b, [d(0.02, -0.02), d(0.04, -0.045), d(0.058, -0.06), d(0.05, -0.075)], 0.011 * s, 0.004 * s, col, { n: 0, segs: 8 });
    }
  }
  function sucker(p, r, x, y, z) {
    [-1, 1].forEach(sz => {
      const s = M(new THREE.CylinderGeometry(r, r * 1.1, 0.008, 10), clay(OC.suck), x, y, sz * z); s.rotation.x = Math.PI / 2; p.add(small(s));
      const c = M(new THREE.CylinderGeometry(r * 0.45, r * 0.45, 0.01, 8), clay(OC.pinkD), x, y, sz * (z + 0.002)); c.rotation.x = Math.PI / 2; p.add(small(c));
    });
  }
  const handle = (g, l, r = 0.03) => X.handle(g, { wood: OC.wood, grip: OC.pinkD, knob: OC.vio }, l, r);
  return { tentacle, eye, head, bob, sucker, handle };
}

export function octopusThemes(THREE, K, X) {
  const { clay, M, V, ext } = K;
  const { polyShape, roundBlade, rodFrame, netBag } = X;
  const { tentacle, head, bob, sucker, handle } = octopusKit(THREE, K, X);
  const down = () => V(0, -1, 0);
  return { octopus: {
    axe(g) {
      const top = handle(g, 0.52), cy = top - 0.04;
      g.add(M(ext(polyShape([[0.0, -0.06], [0.12, -0.1], [0.17, -0.06], [0.18, 0.05], [0.12, 0.09], [0.0, 0.06]]), 0.022, 0.006, 2), clay(OC.rose), 0, cy, 0));
      tentacle(g, [[0.03, cy + 0.04, 0.01], [0.12, cy + 0.08, 0.012], [0.19, cy + 0.06, 0.012], [0.21, cy, 0.012], [0.18, cy - 0.02, 0.012]], 0.03, 0.012, OC.pink);
      tentacle(g, [[0.03, cy - 0.03, 0], [0.12, cy - 0.09, 0], [0.2, cy - 0.08, 0], [0.22, cy - 0.03, 0], [0.195, cy - 0.005, 0]], 0.03, 0.012, OC.pink);
      tentacle(g, [[0.03, cy, -0.012], [0.12, cy, -0.012], [0.2, cy + 0.01, -0.012], [0.235, cy + 0.035, -0.012]], 0.026, 0.01, OC.pinkD, { n: 0 });
      head(g, 0.07, -0.01, cy + 0.02, 0, OC.pink, 0.6);
      g.scale.setScalar(1.18);
    },
    hoe(g) {
      const top = handle(g, 0.52);
      [-1, 1].forEach(s => tentacle(g, [[s * 0.03, top, 0], [s * 0.11, top + 0.01, 0], [s * 0.19, top - 0.04, 0], [s * 0.22, top - 0.11, 0], [s * 0.2, top - 0.14, 0]], 0.034, 0.011, s > 0 ? OC.pink : OC.pinkD, { side: down }));
      head(g, 0.065, 0, top + 0.03, 0, OC.pink, 0.6);
      g.scale.setScalar(1.18);
    },
    seed(g) {
      head(g, 0.1, 0, 0.07, 0, OC.pink, 0.75);
      for (let i = 0; i < 5; i++) {
        const a = i / 5 * Math.PI * 2 + 0.2, d = (f, y) => V(Math.cos(a) * f, y, Math.sin(a) * f);
        tentacle(g, [d(0.06, 0.02), d(0.11, -0.01), d(0.14, 0.01), d(0.13, 0.04), d(0.11, 0.035)], 0.026, 0.009, OC.pinkD, { n: 3, side: down });
      }
      g.add(M(new THREE.TorusGeometry(0.04, 0.012, 5, 12), clay(OC.vio), 0, 0.22, 0).rotateX(Math.PI / 2));
      g.scale.setScalar(1.25);
    },
    water(g) {
      head(g, 0.135, 0, 0.13, 0, OC.pink, 0.75);
      for (let i = 1; i < 6; i++) {
        const a = i / 6 * Math.PI * 2 + 0.5, d = (f, y) => V(Math.cos(a) * f, y, Math.sin(a) * f);
        tentacle(g, [d(0.08, 0.06), d(0.15, 0.02), d(0.2, 0.025), d(0.19, 0.06), d(0.16, 0.05)], 0.032, 0.011, OC.pinkD, { n: 3, side: down });
      }
      tentacle(g, [[0.1, 0.12, 0.03], [0.17, 0.18, 0.02], [0.22, 0.26, 0.01], [0.27, 0.32, 0], [0.31, 0.33, 0], [0.32, 0.3, 0]], 0.034, 0.016, OC.pink);
      tentacle(g, [[-0.1, 0.1, 0], [-0.2, 0.13, 0], [-0.22, 0.24, 0], [-0.16, 0.3, 0], [-0.1, 0.28, 0]], 0.022, 0.014, OC.pinkD, { n: 4 });
      g.scale.setScalar(1.25);
    },
    sickle(g) {
      const top = handle(g, 0.30, 0.034);
      tentacle(g, [[0, top + 0.01, 0], [0.01, top + 0.12, 0], [0.05, top + 0.24, 0], [0.12, top + 0.31, 0], [0.19, top + 0.3, 0], [0.21, top + 0.26, 0]], 0.028, 0.011, OC.pink, { n: 6, t0: 0.2, t1: 0.9, side: (q, tg) => tg.clone().cross(V(0, 0, -1)).normalize() });
      head(g, 0.045, 0, top + 0.06, 0, OC.pinkD, 0.6);
      g.scale.setScalar(1.18);
    },
    shovel(g) {
      const top = handle(g, 0.58), by = top + 0.04;
      g.add(M(ext(roundBlade(0.112, 0.13), 0.026, 0.008, 14), clay(OC.pinkD), 0, by, 0));
      g.add(M(ext(roundBlade(0.1, 0.125), 0.034, 0.012, 14), clay(OC.pink, { smooth: true }), 0, by + 0.004, 0));
      [[-0.05, 0.1, 0.016], [0.05, 0.12, 0.018], [0, 0.18, 0.02], [-0.045, 0.2, 0.014], [0.05, 0.2, 0.013]].forEach(([x, y, r]) => sucker(g, r, x, by + y, 0.03));
      head(g, 0.05, 0, top - 0.01, 0, OC.pink, 0.6);
      g.scale.setScalar(1.18);
    },
    hammer(g) {
      const top = handle(g, 0.50), y = top - 0.04;
      const hd = M(new THREE.SphereGeometry(0.07, 12, 9), clay(OC.pink, { smooth: true }), 0, y, 0); hd.scale.set(1.35, 0.95, 0.95); g.add(hd);
      [-1, 1].forEach(sx => { const cap = M(new THREE.CylinderGeometry(0.05, 0.056, 0.03, 12), clay(OC.suck), sx * 0.092, y, 0); cap.rotation.z = Math.PI / 2; g.add(cap); });
      [-1, 1].forEach(s => g.add(M(new THREE.SphereGeometry(0.017, 7, 5), clay(OC.ink, { smooth: true }), s * 0.03, y + 0.015, 0.06)));
      [-1, 1].forEach(s => tentacle(g, [[s * 0.03, y - 0.05, 0.02], [s * 0.05, y - 0.11, 0.03], [s * 0.09, y - 0.14, 0.02], [s * 0.1, y - 0.11, 0.02]], 0.018, 0.008, OC.pinkD, { n: 3 }));
      g.scale.setScalar(1.18);
    },
    rod(g) {
      rodFrame(g, { knobFn: g => g.add(M(new THREE.SphereGeometry(0.042, 8, 6), clay(OC.vio, { smooth: true }), 0, -0.1, 0)), rear: clay(OC.pinkD), line: 0xe8dce4, pole: (p, L) => {
        p.add(M(new THREE.CylinderGeometry(0.013, 0.026, L, 7), clay(OC.wood), 0, L / 2, 0));
        [0.3, 0.55, 0.8].forEach(f => p.add(M(new THREE.CylinderGeometry(0.026 - f * 0.012, 0.026 - f * 0.012, 0.02, 7), clay(OC.pink), 0, L * f, 0)));
      } }, b => bob(b, 1.5));
    },
    net(g) {
      g.add(M(new THREE.CylinderGeometry(0.028, 0.03, 0.72, 7), clay(OC.wood), 0, 0.25, 0));
      g.add(M(new THREE.SphereGeometry(0.045, 8, 6), clay(OC.vio), 0, -0.1, 0));
      const ring = M(new THREE.TorusGeometry(0.17, 0.026, 6, 18), clay(OC.pink, { smooth: true }), 0, 0.6, 0); ring.rotation.x = Math.PI / 2; g.add(ring);
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + 0.2, s = M(new THREE.SphereGeometry(0.013, 6, 3), clay(OC.suck), Math.cos(a) * 0.17, 0.624, Math.sin(a) * 0.17); s.scale.y = 0.45; g.add(X.small(s)); }
      g.add(M(new THREE.ConeGeometry(0.16, 0.3, 12, 1, true), netBag(OC.rose, 0.55), 0, 0.75, 0));
      head(g, 0.055, 0, 0.6, 0.17, OC.pinkD, 0);
      g.scale.setScalar(1.25);
    },
  } };
}

export const OCTOPUS_UMBRELLA = Object.freeze({ N: 8, R: 1.0, th: 1.0, overlap: 1, shape: { w: () => 1, tip: 0.05 } });

export function octopusUmbrellaLook(THREE, K, X, { root, L, def, jHook }) {
  const { clay, M, V } = K, { tentacle, eye } = octopusKit(THREE, K, X);
  return {
    outer: k => clay(k % 2 ? OC.pinkD : OC.pink), inner: () => clay(OC.rose, { side: THREE.BackSide, lift: 0.3 }),
    shaft() {
      root.add(M(new THREE.CylinderGeometry(0.022, 0.027, L, 7), clay(OC.wood), 0, L / 2, 0));
      jHook(clay(OC.pinkD), 0.07);
    },
    deco(h, k) {
      const { p, n } = X.goreSurf(def.R * 1.01, def.th * 0.6, 0);
      const s = M(new THREE.SphereGeometry(0.035, 8, 3), clay(OC.suck), p.x, p.y, p.z); s.quaternion.setFromUnitVectors(V(0, 1, 0), n); s.scale.y = 0.35; h.add(s);
      const q = X.goreSurf(def.R, def.th * 0.99, 0).p;
      tentacle(h, [q, V(q.x * 1.02, q.y - 0.08, q.z), V(q.x * 0.98, q.y - 0.15, q.z), V(q.x * 0.9, q.y - 0.13, q.z)], 0.03, 0.012, k % 2 ? OC.pinkD : OC.pink, { n: 0, segs: 8 });
      if (k === 0) [-1, 1].forEach(sp => { const e = X.goreSurf(def.R * 1.01, def.th * 0.42, sp * 0.16); eye(h, 0.09, e.p.x, e.p.y, e.p.z).quaternion.setFromUnitVectors(V(0, 0, 1), e.n); });
    },
    finial(c) { c.add(M(new THREE.SphereGeometry(0.05, 10, 8), clay(OC.pink, { smooth: true }), 0, 0.03, 0)); },
  };
}
