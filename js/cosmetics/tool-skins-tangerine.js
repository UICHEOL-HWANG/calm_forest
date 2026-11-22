export const TG = Object.freeze({ peel: 0xff9a2a, peelD: 0xe2741c, flesh: 0xffc458, pith: 0xe8d2b4, leaf: 0x4a9a48, leafD: 0x2f6e34, wood: 0xa87a52, ink: 0x3a2618, blush: 0xf07a6a, stem: 0x6a7a3a });

export function tangerineKit(THREE, K, X) {
  const { clay, M, ext } = K;
  const { small } = X;
  const sph = (p, r, col, x, y, z, s = [1, 1, 1], smooth = true, ws = 12) => { const m = M(new THREE.SphereGeometry(r, ws, Math.max(6, ws * 0.75 | 0)), clay(col, { smooth }), x, y, z); m.scale.set(...s); p.add(m); return m; };
  const leafShape = (w, l) => { const s = new THREE.Shape(); s.moveTo(0, 0); s.bezierCurveTo(l * 0.3, w, l * 0.75, w * 0.8, l, 0); s.bezierCurveTo(l * 0.75, -w * 0.8, l * 0.3, -w, 0, 0); return s; };
  function leaf(p, w, l, x, y, z, rz, ry = 0, col = TG.leaf) { const m = M(ext(leafShape(w, l), w * 0.18, w * 0.06, 6), clay(col, { smooth: true }), x, y, z); m.rotation.set(0, ry, rz); p.add(m); return m; }
  function tFruit(p, R, x, y, z, o = {}) {
    const g = new THREE.Group(); g.position.set(x, y, z); p.add(g);
    const sz = o.sz ?? 1, sy = 0.84;
    sph(g, R, TG.peel, 0, 0, 0, [1, sy, sz], true, 18);
    const top = R * sy;
    const cx = M(ext(X.starShape(R * 0.22, 0.45, 5), R * 0.05, R * 0.02, 2), clay(TG.leafD), 0, top - R * 0.01, 0); cx.rotation.x = -Math.PI / 2; g.add(cx);
    g.add(M(new THREE.CylinderGeometry(R * 0.04, R * 0.06, R * 0.16, 6), clay(TG.stem), 0, top + R * 0.06, 0));
    const nl = o.leaves ?? 2;
    if (nl > 0) leaf(g, R * 0.32, R * 0.95, 0.0, top + R * 0.08, 0, 0.45, 0.2);
    if (nl > 1) leaf(g, R * 0.26, R * 0.75, 0.0, top + R * 0.08, 0, Math.PI - 0.55, -0.3 + (o.backYaw ?? 0), TG.leafD);
    const faces = o.face === 'both' ? [1, -1] : [1];
    faces.forEach(s => {
      const fz = R * sz * 0.95 * s;
      [-1, 1].forEach(sx => {
        g.add(small(M(new THREE.SphereGeometry(R * 0.125, 8, 6), clay(TG.ink, { smooth: true }), sx * R * 0.3, R * 0.08, fz * 0.97)));
        g.add(small(M(new THREE.SphereGeometry(R * 0.035, 5, 4), clay(TG.pith), sx * R * 0.27, R * 0.12, fz * 0.97 + s * R * 0.09)));
        sph(g, R * 0.12, TG.blush, sx * R * 0.52, -R * 0.12, fz * 0.88, [1, 0.7, 0.4], true, 8);
      });
      const sm = M(new THREE.TorusGeometry(R * 0.15, R * 0.038, 5, 10, Math.PI), clay(TG.ink), 0, -R * 0.1, fz * 0.98); sm.rotation.z = Math.PI; if (s < 0) sm.rotation.y = Math.PI; g.add(sm);
    });
    return g;
  }
  return { sph, leaf, tFruit };
}

export function tangerineThemes(THREE, K, X) {
  const { clay, M, ext } = K;
  const { roundBlade, pickArms, sickleBlade, netBag } = X;
  const T = tangerineKit(THREE, K, X);
  const motif = (p, r, x, y, z) => T.tFruit(p, r, x, y, z, { leaves: 1 });
  const H = (g, l, r = 0.03) => X.handle(g, { wood: TG.wood, grip: TG.leafD, knob: TG.peel, bands: [[TG.leaf, 0.62]] }, l, r);
  const canHandle = (g, col, x = -0.17) => g.add(M(new THREE.TorusGeometry(0.075, 0.015, 5, 12, Math.PI * 1.05), clay(col), x, 0.2, 0).rotateZ(Math.PI / 2 + 0.25));
  const spout = (g, col) => { const sp = M(new THREE.CylinderGeometry(0.02, 0.032, 0.22, 8), clay(col), 0.17, 0.25, 0); sp.rotation.z = -0.9; g.add(sp); };
  return { tangerine: {
    axe(g) {
      const top = H(g, 0.52), cy = top - 0.05;
      g.add(M(new THREE.BoxGeometry(0.06, 0.1, 0.07), clay(TG.leafD), 0, cy, 0));
      T.tFruit(g, 0.1, 0.115, cy - 0.005, 0, { sz: 0.62, face: 'both' });
      g.scale.setScalar(1.18);
    },
    hoe(g) {
      const top = H(g, 0.52), hd = new THREE.Group(); hd.position.y = top + 0.01; g.add(hd);
      hd.add(M(new THREE.BoxGeometry(0.08, 0.08, 0.075), clay(TG.leafD)));
      pickArms(hd, [clay(TG.peel), clay(TG.peelD)], clay(TG.leaf));
      motif(hd, 0.05, 0, 0.085, 0);
      g.scale.setScalar(1.18);
    },
    seed(g) {
      T.sph(g, 0.11, TG.peel, 0, 0.09, 0, [1, 1.05, 1], true, 14);
      g.add(M(new THREE.CylinderGeometry(0.045, 0.065, 0.05, 10), clay(TG.leafD), 0, 0.2, 0));
      g.add(M(new THREE.TorusGeometry(0.05, 0.011, 5, 12), clay(TG.leaf), 0, 0.2, 0).rotateX(Math.PI / 2));
      motif(g, 0.065, 0, 0.09, 0.075);
      g.scale.setScalar(1.25);
    },
    water(g) {
      T.tFruit(g, 0.132, 0, 0.15, 0, { backYaw: -1.8 });
      spout(g, TG.leaf);
      T.leaf(g, 0.024, 0.065, 0.26, 0.32, 0, 0.4);
      canHandle(g, TG.leafD);
      g.scale.setScalar(1.25);
    },
    sickle(g) {
      const top = H(g, 0.30, 0.034);
      const { bl, tip } = sickleBlade(g, top, [clay(TG.peel), clay(TG.peel), clay(TG.peelD)], clay(TG.leaf), 1.2);
      motif(bl, 0.04, tip.x, tip.y + 0.01, 0);
      g.add(M(new THREE.CylinderGeometry(0.032, 0.04, 0.05, 9), clay(TG.leafD), 0, top - 0.01, 0));
      g.scale.setScalar(1.18);
    },
    shovel(g) {
      const top = H(g, 0.58), by = top + 0.03;
      g.add(M(new THREE.CylinderGeometry(0.036, 0.044, 0.07, 9), clay(TG.leafD), 0, top + 0.01, 0));
      g.add(M(ext(roundBlade(0.105, 0.13), 0.03, 0.01, 14), clay(TG.peel, { smooth: true }), 0, by, 0));
      motif(g, 0.06, 0, by + 0.12, 0.03);
      g.scale.setScalar(1.18);
    },
    hammer(g) {
      const top = H(g, 0.50), y = top - 0.04;
      const head = M(new THREE.CylinderGeometry(0.05, 0.05, 0.15, 12), clay(TG.peelD, { smooth: true }), 0, y, 0); head.rotation.z = Math.PI / 2; g.add(head);
      [-1, 1].forEach(sx => motif(g, 0.058, sx * 0.1, y, 0));
      g.scale.setScalar(1.18);
    },
    rod(g) {
      X.rodFrame(g, { knobFn: g => g.add(M(new THREE.SphereGeometry(0.042, 8, 6), clay(TG.peel, { smooth: true }), 0, -0.1, 0)), rear: clay(TG.leafD), line: 0xe8dcd0, pole: (p, L) => {
        p.add(M(new THREE.CylinderGeometry(0.013, 0.026, L, 7), clay(TG.wood), 0, L / 2, 0));
        T.leaf(p, 0.018, 0.055, 0, L * 0.5, 0, 0.5);
      } }, b => T.tFruit(b, 0.062, 0, -0.04, 0, { leaves: 1 }));
    },
    net(g) {
      g.add(M(new THREE.CylinderGeometry(0.024, 0.028, 0.66, 7), clay(TG.wood), 0, 0.27, 0));
      g.add(M(new THREE.SphereGeometry(0.04, 8, 6), clay(TG.peel, { smooth: true }), 0, -0.08, 0));
      g.add(M(new THREE.TorusGeometry(0.17, 0.02, 6, 20), clay(TG.peel), 0, 0.6, 0).rotateX(Math.PI / 2));
      g.add(M(new THREE.ConeGeometry(0.16, 0.3, 12, 1, true), netBag(TG.flesh, 0.5), 0, 0.75, 0));
      motif(g, 0.05, 0, 0.62, 0.17);
      g.scale.setScalar(1.25);
    },
  } };
}

export const TANGERINE_UMBRELLA = Object.freeze({ N: 10, R: 0.95, th: 1.05, overlap: 1, shape: { w: () => 1, tip: 0 } });

export function tangerineUmbrellaLook(THREE, K, X, { root, L, def, jHook }) {
  const { clay, M, V } = K, T = tangerineKit(THREE, K, X);
  return {
    outer: k => clay(k % 2 ? TG.peelD : TG.peel, { smooth: true }), inner: () => clay(TG.pith, { side: THREE.BackSide, lift: 0.3 }),
    shaft() {
      root.add(M(new THREE.CylinderGeometry(0.022, 0.027, L, 7), clay(TG.wood), 0, L / 2, 0));
      jHook(clay(TG.peel), 0.07);
    },
    deco(h, k) {
      if (k % 5) return;
      const { p, n } = X.goreSurf(def.R * 1.004, 0.62, 0), g = new THREE.Group(); g.position.copy(p); g.quaternion.setFromUnitVectors(V(0, 0, 1), n); h.add(g);
      T.leaf(g, 0.05, 0.16, -0.08, 0, 0.01, 0);
    },
    finial(c) { T.tFruit(c, 0.16, 0, 0.12, 0); },
  };
}
