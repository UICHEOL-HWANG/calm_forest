export const MP = Object.freeze({ red: 0xd4502e, orange: 0xe8843a, amber: 0xf0b04a, bark: 0x7a5236, barkD: 0x5a3a26, ring: 0xe9cf9f, acorn: 0xc68a4c, cap: 0x7b5534, cream: 0xf3dfb8 });

export function mapleKit(THREE, K, X) {
  const { clay, M, ext } = K;
  const leaf = (r, color, depth = 0.03) => M(ext(X.mapleShape(r), depth, depth * 0.25, 2), clay(color));
  function acorn(p, s, x, y, z) {
    const b = M(new THREE.SphereGeometry(0.1 * s, 10, 8), clay(MP.acorn, { smooth: true }), x, y, z); b.scale.set(1, 1.18, 1); p.add(b);
    p.add(M(new THREE.ConeGeometry(0.03 * s, 0.05 * s, 6), clay(MP.acorn), x, y - 0.12 * s, z).rotateX(Math.PI));
    p.add(X.hemi(0.108 * s, clay(MP.cap), x, y + 0.04 * s, z, 0.62, 8));
    p.add(M(new THREE.CylinderGeometry(0.012 * s, 0.016 * s, 0.05 * s, 5), clay(MP.barkD), x, y + 0.11 * s, z));
  }
  return { leaf, acorn };
}

export function mapleThemes(THREE, K, X) {
  const { clay, M, ext } = K;
  const { TAU, rib, faceX, roundBlade, pickArms, sickleBlade, rodFrame, netBag } = X;
  const { leaf, acorn } = mapleKit(THREE, K, X);
  const mpHandle = (g, l, r = 0.032) => X.handle(g, { wood: MP.bark, grip: MP.barkD, knobFn: (g, r) => acorn(g, r * 4.2, 0, -0.1, 0), bands: [[MP.amber, 0.82]] }, l, r);
  return { maple: {
    axe(g) {
      const top = mpHandle(g, 0.52), cy = top - 0.05;
      g.add(M(new THREE.BoxGeometry(0.06, 0.12, 0.07), clay(MP.barkD), 0, cy, 0));
      const R = 0.135, ox = 0.02 + R * 0.15, lf = leaf(R, MP.red, 0.04); lf.rotation.z = -Math.PI / 2; lf.position.set(ox, cy, 0); g.add(lf);
      [-1, 1].forEach(sz => [0, 1.0, -1.0].forEach(a => { const v = rib(g, clay(MP.amber), a, 0.02, a ? R * 0.62 : R * 0.86, sz * 0.026, 0.009); v.position.x += ox - R * 0.15; v.position.y += cy; }));
      g.add(M(new THREE.BoxGeometry(0.05, 0.09, 0.075), clay(MP.barkD), -0.035, cy, 0));
      g.scale.setScalar(1.18);
    },
    hoe(g) {
      const top = mpHandle(g, 0.52), hd = new THREE.Group(); hd.position.y = top + 0.01; g.add(hd);
      hd.add(M(new THREE.BoxGeometry(0.08, 0.08, 0.075), clay(MP.barkD)));
      pickArms(hd, [clay(MP.red), clay(MP.orange)], clay(MP.amber));
      const lf = leaf(0.055, MP.amber, 0.022); lf.position.y = 0.05; hd.add(lf);
      g.scale.setScalar(1.18);
    },
    seed(g) {
      acorn(g, 1.15, 0, 0.1, 0);
      const lf = leaf(0.05, MP.red, 0.018); lf.position.set(0.05, 0.24, 0.03); lf.rotation.set(-0.5, 0.3, -0.6); g.add(lf);
      g.scale.setScalar(1.25);
    },
    water(g) {
      g.add(M(new THREE.CylinderGeometry(0.105, 0.125, 0.2, 9), clay(MP.bark), 0, 0.17, 0));
      for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + 0.3, b = M(new THREE.BoxGeometry(0.02, 0.17, 0.02), clay(MP.barkD), Math.cos(a) * 0.112, 0.16, Math.sin(a) * 0.112); b.rotation.y = -a; g.add(b); }
      g.add(M(new THREE.CylinderGeometry(0.1, 0.104, 0.02, 9), clay(MP.ring), 0, 0.275, 0));
      [0.07, 0.04].forEach(r => { const t = M(new THREE.TorusGeometry(r, 0.006, 4, 14), clay(MP.cap), 0, 0.286, 0); t.rotation.x = Math.PI / 2; g.add(t); });
      const sp = M(new THREE.CylinderGeometry(0.018, 0.03, 0.22, 7), clay(MP.bark), 0.15, 0.22, 0); sp.rotation.z = -0.9; g.add(sp);
      const rose = leaf(0.055, MP.orange, 0.02); rose.position.set(0.25, 0.29, 0); rose.rotation.set(0, Math.PI / 2, 0.67); g.add(rose);
      const hd = M(new THREE.TorusGeometry(0.07, 0.016, 5, 12, Math.PI * 1.05), clay(MP.barkD), -0.12, 0.17, 0); hd.rotation.z = Math.PI / 2 + 0.25; g.add(hd);
      const lf = leaf(0.045, MP.red, 0.016); lf.position.set(-0.03, 0.3, 0.06); lf.rotation.set(-1.2, 0, 0.4); g.add(lf);
      g.scale.setScalar(1.25);
    },
    sickle(g) {
      const top = mpHandle(g, 0.30, 0.036);
      const { bl, tip } = sickleBlade(g, top, [clay(MP.red), clay(MP.orange), clay(MP.amber)], clay(MP.cream), 1.25);
      const lf = leaf(0.035, MP.red, 0.014); lf.position.copy(tip); bl.add(lf);
      g.add(M(new THREE.CylinderGeometry(0.030, 0.036, 0.06, 7), clay(MP.barkD), 0, top - 0.01, 0));
      g.scale.setScalar(1.18);
    },
    shovel(g) {
      const top = mpHandle(g, 0.58), by = top + 0.03;
      g.add(M(new THREE.CylinderGeometry(0.036, 0.044, 0.07, 8), clay(MP.barkD), 0, top + 0.01, 0));
      g.add(M(ext(roundBlade(0.105, 0.13), 0.035, 0.014, 14), clay(MP.red, { smooth: true }), 0, by, 0));
      [-1, 1].forEach(sz => {
        g.add(M(new THREE.BoxGeometry(0.01, 0.2, 0.006), clay(MP.amber), 0, by + 0.11, sz * 0.026));
        [-0.6, 0.6].forEach(a => { const v = M(new THREE.BoxGeometry(0.008, 0.09, 0.006), clay(MP.amber), Math.sin(a) * 0.035, by + 0.1, sz * 0.026); v.rotation.z = -a; g.add(v); });
      });
      g.scale.setScalar(1.18);
    },
    hammer(g) {
      const top = mpHandle(g, 0.50), y = top - 0.04;
      const head = M(new THREE.CylinderGeometry(0.058, 0.058, 0.19, 9), clay(MP.bark), 0, y, 0); head.rotation.z = Math.PI / 2; g.add(head);
      [-1, 1].forEach(sx => {
        const d = M(new THREE.CylinderGeometry(0.052, 0.052, 0.012, 9), clay(MP.ring), sx * 0.096, y, 0); d.rotation.z = Math.PI / 2; g.add(d);
        [0.034, 0.016].forEach(r => g.add(faceX(M(new THREE.TorusGeometry(r, 0.004, 3, 12), clay(MP.cap), sx * 0.103, y, 0))));
      });
      g.add(M(new THREE.CylinderGeometry(0.006, 0.008, 0.06, 4), clay(MP.barkD), 0.02, y + 0.08, 0));
      const lf = leaf(0.035, MP.orange, 0.014); lf.position.set(0.03, y + 0.12, 0); lf.rotation.z = -0.4; g.add(lf);
      g.scale.setScalar(1.18);
    },
    rod(g) {
      rodFrame(g, { knobFn: g => acorn(g, 0.45, 0, -0.1, 0), rear: clay(MP.barkD), line: 0xf1e3c8, pole: (p, L) => {
        p.add(M(new THREE.CylinderGeometry(0.014, 0.027, L, 7), clay(MP.bark), 0, L / 2, 0));
        [[0.25, MP.red], [0.5, MP.orange], [0.75, MP.amber]].forEach(([f, c]) => p.add(M(new THREE.CylinderGeometry(0.025 - f * 0.011, 0.025 - f * 0.011, 0.016, 7), clay(c), 0, L * f, 0)));
      } }, b => acorn(b, 0.5, 0, 0, 0));
    },
    net(g) {
      g.add(M(new THREE.CylinderGeometry(0.03, 0.03, 0.72, 7), clay(MP.bark), 0, 0.25, 0));
      acorn(g, 0.45, 0, -0.12, 0);
      const ring = M(new THREE.TorusGeometry(0.17, 0.024, 6, 18), clay(MP.orange), 0, 0.6, 0); ring.rotation.x = Math.PI / 2; g.add(ring);
      g.add(M(new THREE.ConeGeometry(0.16, 0.3, 12, 1, true), netBag(MP.cream, 0.55), 0, 0.74, 0));
      const lf = leaf(0.06, MP.red, 0.016); lf.position.set(-0.15, 0.63, 0.08); lf.rotation.set(-0.3, 0.6, 0.4); g.add(lf);
      g.scale.setScalar(1.25);
    },
  } };
}

export const MAPLE_UMBRELLA = Object.freeze({ N: 5, R: 1.0, th: 0.9, overlap: 1, shape: { w: () => 1, tip: 0.18 } });

export function mapleUmbrellaLook(THREE, K, X, { root, L, def, jHook }) {
  const { clay, M } = K, { leaf, acorn } = mapleKit(THREE, K, X);
  return {
    outer: k => clay([MP.red, MP.orange][k % 2]), inner: () => clay(MP.amber, { side: THREE.BackSide, lift: 0.3 }),
    shaft() {
      root.add(M(new THREE.CylinderGeometry(0.0234, 0.0286, L, 7), clay(MP.bark), 0, L / 2, 0));
      jHook(clay(MP.barkD));
      const lf = leaf(0.07, MP.red, 0.02); lf.position.set(0.03, L * 0.45, 0); lf.rotation.set(0, 0.5, -0.8); root.add(lf);
    },
    deco(h) {
      const a = X.goreSurf(def.R * 1.004, def.th * 0.25, 0).p, b = X.goreSurf(def.R * 1.004, def.th * 0.95, 0).p;
      const v = M(new THREE.BoxGeometry(a.distanceTo(b), 0.016, 0.03), clay(MP.amber), (a.x + b.x) / 2, (a.y + b.y) / 2, 0);
      v.rotation.z = Math.atan2(b.y - a.y, b.x - a.x); h.add(v);
    },
    finial(c) { acorn(c, 0.55, 0, 0.06, 0); },
  };
}
