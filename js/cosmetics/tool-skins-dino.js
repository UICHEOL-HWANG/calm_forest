export const DC = Object.freeze({ mint: 0x9de3cc, teal: 0x5bb3a4, tealD: 0x3d8a80, belly: 0xe8d2a0, coral: 0xf29a7a, wood: 0xa87a52, ink: 0x2e2a2a, hi: 0xe0d4c4, blush: 0xf08a90 });

export function dinoKit(THREE, K, X) {
  const { clay, M, ext } = K;
  const { small } = X;
  const sph = (p, r, col, x, y, z, s = [1, 1, 1], ws = 14) => { const m = M(new THREE.SphereGeometry(r, ws, Math.max(8, ws * 0.75 | 0)), clay(col, { smooth: true }), x, y, z); m.scale.set(...s); p.add(m); return m; };
  const plateShape = (w, h) => { const s = new THREE.Shape(); s.moveTo(-w, 0); s.bezierCurveTo(-w * 1.05, h * 0.55, -w * 0.35, h * 0.98, 0, h); s.bezierCurveTo(w * 0.35, h * 0.98, w * 1.05, h * 0.55, w, 0); s.lineTo(-w, 0); return s; };
  function plate(p, w, h, col, x, y, z, rz = 0, ry = 0) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.set(0, ry, rz); p.add(g);
    g.add(M(ext(plateShape(w, h), w * 0.32, w * 0.22, 8), clay(col, { smooth: true })));
    return g;
  }
  function eyeDot(g, R, x, y, z, nx, nz) {
    sph(g, R * 0.2, DC.ink, x, y, z, [1, 1.12, 0.75], 12);
    g.add(small(M(new THREE.SphereGeometry(R * 0.075, 8, 6), clay(DC.hi, { smooth: true }), x + nx * R * 0.14, y + R * 0.08, z + nz * R * 0.14)));
    g.add(small(M(new THREE.SphereGeometry(R * 0.035, 6, 5), clay(DC.hi, { smooth: true }), x + nx * R * 0.16, y - R * 0.07, z + nz * R * 0.16)));
  }
  function dinoHead(p, R, x, y, z, o = {}) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = o.ry ?? 0; p.add(g);
    sph(g, R, DC.mint, 0, 0, 0, [0.96, 0.94, 0.96], 20);
    sph(g, R * 0.72, DC.mint, 0, -R * 0.3, R * 0.5, [1.0, 0.76, 1.0], 18);
    sph(g, R * 0.6, DC.belly, 0, -R * 0.5, R * 0.52, [1.0, 0.42, 0.96], 16);
    [-1, 1].forEach(sx => {
      eyeDot(g, R, sx * R * 0.4, R * 0.16, R * 0.74, sx * 0.25, 1);
      g.add(small(M(new THREE.SphereGeometry(R * 0.045, 6, 5), clay(DC.tealD, { smooth: true }), sx * R * 0.16, -R * 0.12, R * 1.18)));
      sph(g, R * 0.13, DC.blush, sx * R * 0.6, -R * 0.2, R * 0.7, [1, 0.7, 0.45], 10);
    });
    const sm = M(new THREE.TorusGeometry(R * 0.16, R * 0.035, 6, 12, Math.PI), clay(DC.ink, { smooth: true }), 0, -R * 0.3, R * 1.14); sm.rotation.z = Math.PI; g.add(sm);
    (o.spikeAngles ?? [0.15, 0.7, 1.25, 1.8]).forEach((a, i, arr) => {
      const s = 1 - Math.abs(i - (arr.length - 1) * 0.35) * 0.18;
      const pg = new THREE.Group(); pg.position.set(0, Math.cos(a) * R * 0.86, -Math.sin(a) * R * 0.9); pg.rotation.x = -a; g.add(pg);
      plate(pg, R * 0.26 * s, R * 0.42 * s, DC.coral, 0, 0, 0, 0, Math.PI / 2);
    });
    return g;
  }
  return { sph, plate, dinoHead };
}

export function dinoThemes(THREE, K, X) {
  const { clay, M, ext } = K;
  const { roundBlade, pickArms, sickleBlade, netBag } = X;
  const T = dinoKit(THREE, K, X);
  const motif = (p, r, x, y, z, ry = 0) => T.dinoHead(p, r, x, y, z, { ry });
  const P = { wood: DC.wood, grip: DC.tealD, knob: DC.coral, bands: [[DC.teal, 0.62]] };
  const H = (g, l, r = 0.03) => X.handle(g, P, l, r);
  const canHandle = (g, col, x = -0.17) => g.add(M(new THREE.TorusGeometry(0.075, 0.015, 5, 12, Math.PI * 1.05), clay(col), x, 0.2, 0).rotateZ(Math.PI / 2 + 0.25));
  const spout = (g, col, x = 0.17, y = 0.25) => { const sp = M(new THREE.CylinderGeometry(0.02, 0.032, 0.22, 8), clay(col), x, y, 0); sp.rotation.z = -0.9; g.add(sp); };
  return { dino: {
    axe(g) {
      const top = H(g, 0.52), cy = top - 0.05;
      g.add(M(new THREE.BoxGeometry(0.06, 0.1, 0.07), clay(DC.tealD), 0, cy, 0));
      T.dinoHead(g, 0.1, 0.1, cy + 0.005, 0, { ry: Math.PI / 2 });
      g.scale.setScalar(1.18);
    },
    hoe(g) {
      const top = H(g, 0.52), hd = new THREE.Group(); hd.position.y = top + 0.01; g.add(hd);
      hd.add(M(new THREE.BoxGeometry(0.08, 0.08, 0.075), clay(DC.tealD)));
      pickArms(hd, [clay(DC.mint), clay(DC.teal)], clay(DC.coral));
      motif(hd, 0.05, 0, 0.085, 0);
      g.scale.setScalar(1.18);
    },
    seed(g) {
      T.sph(g, 0.11, DC.mint, 0, 0.09, 0, [1, 1.05, 1], 16);
      g.add(M(new THREE.CylinderGeometry(0.045, 0.065, 0.05, 12), clay(DC.tealD, { smooth: true }), 0, 0.2, 0));
      g.add(M(new THREE.TorusGeometry(0.05, 0.011, 6, 14), clay(DC.coral, { smooth: true }), 0, 0.2, 0).rotateX(Math.PI / 2));
      motif(g, 0.06, 0, 0.1, 0.085);
      g.scale.setScalar(1.25);
    },
    water(g) {
      T.dinoHead(g, 0.13, -0.01, 0.17, 0, { ry: Math.PI / 2, spikeAngles: [0.25, 0.8, 1.35, 1.9] });
      spout(g, DC.teal, 0.23, 0.2);
      canHandle(g, DC.tealD);
      g.scale.setScalar(1.25);
    },
    sickle(g) {
      const top = H(g, 0.30, 0.034);
      const { bl, tip } = sickleBlade(g, top, [clay(DC.mint), clay(DC.mint), clay(DC.teal)], clay(DC.coral), 1.2);
      motif(bl, 0.04, tip.x, tip.y + 0.012, 0);
      g.add(M(new THREE.CylinderGeometry(0.032, 0.04, 0.05, 9), clay(DC.tealD), 0, top - 0.01, 0));
      g.scale.setScalar(1.18);
    },
    shovel(g) {
      const top = H(g, 0.58), by = top + 0.03;
      g.add(M(new THREE.CylinderGeometry(0.036, 0.044, 0.07, 9), clay(DC.tealD), 0, top + 0.01, 0));
      g.add(M(ext(roundBlade(0.105, 0.13), 0.03, 0.01, 14), clay(DC.mint, { smooth: true }), 0, by, 0));
      motif(g, 0.058, 0, by + 0.12, 0.035);
      g.scale.setScalar(1.18);
    },
    hammer(g) {
      const top = H(g, 0.50), y = top - 0.04;
      const head = M(new THREE.CylinderGeometry(0.05, 0.05, 0.15, 14), clay(DC.teal, { smooth: true }), 0, y, 0); head.rotation.z = Math.PI / 2; g.add(head);
      [-1, 1].forEach(sx => motif(g, 0.056, sx * 0.1, y, 0, sx * Math.PI / 2));
      g.scale.setScalar(1.18);
    },
    rod(g) {
      X.rodFrame(g, { knobFn: g => g.add(M(new THREE.SphereGeometry(0.042, 10, 8), clay(DC.coral, { smooth: true }), 0, -0.1, 0)), rear: clay(DC.tealD), line: 0xe8dcd0, pole: (p, L) => {
        p.add(M(new THREE.CylinderGeometry(0.013, 0.026, L, 8), clay(DC.teal, { smooth: true }), 0, L / 2, 0));
        [0.3, 0.55, 0.8].forEach(f => p.add(M(new THREE.CylinderGeometry(0.027 - f * 0.013, 0.027 - f * 0.013, 0.02, 10), clay(DC.coral, { smooth: true }), 0, L * f, 0)));
      } }, b => T.dinoHead(b, 0.058, 0, -0.04, 0, { ry: 0.5 }));
    },
    net(g) {
      g.add(M(new THREE.CylinderGeometry(0.024, 0.028, 0.66, 7), clay(DC.wood), 0, 0.27, 0));
      g.add(M(new THREE.SphereGeometry(0.04, 10, 8), clay(DC.coral, { smooth: true }), 0, -0.08, 0));
      g.add(M(new THREE.TorusGeometry(0.17, 0.02, 6, 20), clay(DC.mint), 0, 0.6, 0).rotateX(Math.PI / 2));
      g.add(M(new THREE.ConeGeometry(0.16, 0.3, 12, 1, true), netBag(DC.teal, 0.5), 0, 0.75, 0));
      motif(g, 0.05, 0, 0.62, 0.17);
      g.scale.setScalar(1.25);
    },
  } };
}

export const DINO_UMBRELLA = Object.freeze({ N: 8, R: 1.0, th: 1.0, overlap: 1, shape: { w: () => 1, tip: 0.04 } });

export function dinoUmbrellaLook(THREE, K, X, { root, L, def, jHook }) {
  const { clay, M, V } = K, T = dinoKit(THREE, K, X);
  const ridge = (c, ths, w, h, ry) => { const rg = new THREE.Group(); rg.rotation.y = ry; c.add(rg); ths.forEach(t => {
    const s = 1 - Math.abs(t) * 0.35;
    T.plate(rg, w * s, h * s, DC.coral, -Math.sin(t) * def.R * 0.99, (Math.cos(t) - 1) * def.R * 0.99, 0, t);
  }); };
  return {
    outer: k => clay(k % 2 ? DC.teal : DC.mint, { smooth: true }), inner: () => clay(DC.teal, { side: THREE.BackSide }),
    shaft() {
      root.add(M(new THREE.CylinderGeometry(0.022, 0.027, L, 7), clay(DC.wood), 0, L / 2, 0));
      jHook(clay(DC.coral), 0.07);
    },
    deco(h, k) {
      if (k % 2) return;
      const { p, n } = X.goreSurf(def.R * 1.004, 0.7, 0), g = new THREE.Group(); g.position.copy(p); g.quaternion.setFromUnitVectors(V(0, 0, 1), n); h.add(g);
      T.sph(g, 0.06, DC.belly, 0, 0, 0.005, [1, 1, 0.3], 10);
    },
    finial(c) {
      c.add(M(new THREE.TorusGeometry(def.R * Math.sin(def.th) * 0.995, 0.035, 6, 40), clay(DC.coral, { smooth: true }), 0, (Math.cos(def.th) - 1) * def.R, 0).rotateX(Math.PI / 2));
      ridge(c, [-0.32, -0.56, -0.8], 0.11, 0.2, Math.PI / 2);
      T.dinoHead(c, 0.2, 0, 0.12, 0, { spikeAngles: [0.3, 0.9, 1.5] });
    },
  };
}
