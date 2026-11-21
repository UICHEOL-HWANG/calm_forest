export const SF = Object.freeze({ petal: 0xffd42e, petalD: 0xf0aa1e, core: 0x6a4222, coreD: 0x4a2c16, dot: 0x9a6a38, cream: 0xd8ccae, stem: 0x5a9a3a, leaf: 0x4a8a34, leafD: 0x2f6a2a, ink: 0x2e1e12, blush: 0xf08a6a });

export function sunflowerKit(THREE, K, X) {
  const { clay, M, ext } = K;
  const { small } = X;
  const TAU = Math.PI * 2;
  const sph = (p, r, col, x, y, z, s = [1, 1, 1], smooth = true, ws = 12) => { const m = M(new THREE.SphereGeometry(r, ws, Math.max(6, ws * 0.75 | 0)), clay(col, { smooth }), x, y, z); m.scale.set(...s); p.add(m); return m; };
  const leafShape = (w, l) => { const s = new THREE.Shape(); s.moveTo(0, 0); s.bezierCurveTo(l * 0.3, w, l * 0.75, w * 0.8, l, 0); s.bezierCurveTo(l * 0.75, -w * 0.8, l * 0.3, -w, 0, 0); return s; };
  function leaf(p, w, l, x, y, z, rz, ry = 0, col = SF.leaf) { const m = M(ext(leafShape(w, l), w * 0.18, w * 0.06, 6), clay(col, { smooth: true }), x, y, z); m.rotation.set(0, ry, rz); p.add(m); return m; }
  function face(g, r, fz, s = 1) {
    [-1, 1].forEach(sx => {
      g.add(small(M(new THREE.SphereGeometry(r * 0.13, 8, 6), clay(SF.ink, { smooth: true }), sx * r * 0.32, r * 0.1, fz)));
      g.add(small(M(new THREE.SphereGeometry(r * 0.04, 5, 4), clay(SF.cream), sx * r * 0.29, r * 0.14, fz + s * r * 0.1)));
      sph(g, r * 0.12, SF.blush, sx * r * 0.56, -r * 0.12, fz - s * r * 0.04, [1, 0.7, 0.4], true, 8);
    });
    const sm = M(new THREE.TorusGeometry(r * 0.15, r * 0.04, 5, 10, Math.PI), clay(SF.ink), 0, -r * 0.08, fz); sm.rotation.z = Math.PI; if (s < 0) sm.rotation.y = Math.PI; g.add(sm);
  }
  function flower(p, R, x, y, z, o = {}) {
    const g = new THREE.Group(); g.position.set(x, y, z); p.add(g);
    const n = o.n ?? 12, pl = R * 0.62, pw = R * 0.22, d = o.d ?? R * 0.12, c = R * 0.48;
    for (let i = 0; i < n; i++) {
      const a = i * TAU / n;
      if (o.skip && o.skip(a)) continue;
      const pt = M(ext(leafShape(pw, pl), d, 0, 5), clay(i % 2 ? SF.petalD : SF.petal, { smooth: true }), Math.cos(a) * c * 0.8, Math.sin(a) * c * 0.8, i % 2 ? -d * 0.25 : d * 0.25); pt.rotation.z = a; g.add(pt);
    }
    const cz = o.cz ?? 0.55;
    sph(g, c, SF.core, 0, 0, 0, [1, 1, cz], true, 16);
    const faces = o.face === 'both' ? [1, -1] : [1];
    if (o.face !== 'both') {
      for (let i = 0; i < 14; i++) {
        const a = i * 2.39996, rr = c * 0.78 * Math.sqrt((i + 0.5) / 14);
        const zz = -c * cz * Math.sqrt(Math.max(0, 1 - (rr / c) ** 2)) * 0.99;
        g.add(small(M(new THREE.SphereGeometry(c * 0.07, 5, 3), clay(i % 3 ? SF.coreD : SF.dot), Math.cos(a) * rr, Math.sin(a) * rr, zz)));
      }
    }
    faces.forEach(s => face(g, c, s * c * cz * 0.97, s));
    return g;
  }
  return { sph, leaf, flower };
}

export function sunflowerThemes(THREE, K, X) {
  const { clay, M, ext } = K;
  const { roundBlade, pickArms, sickleBlade, netBag } = X;
  const T = sunflowerKit(THREE, K, X);
  const motif = (p, r, x, y, z) => T.flower(p, r * 2.1, x, y, z, { d: r * 0.2, cz: 0.5, n: 10 });
  const H = (g, l, r = 0.03) => X.handle(g, { wood: SF.stem, grip: SF.leafD, knob: SF.petal, bands: [[SF.leaf, 0.62]] }, l, r);
  const canHandle = (g, col, x = -0.17) => g.add(M(new THREE.TorusGeometry(0.075, 0.015, 5, 12, Math.PI * 1.05), clay(col), x, 0.2, 0).rotateZ(Math.PI / 2 + 0.25));
  const spout = (g, col, x) => { const sp = M(new THREE.CylinderGeometry(0.02, 0.032, 0.22, 8), clay(col), x, 0.25, 0); sp.rotation.z = -0.9; g.add(sp); };
  return { sunflower: {
    axe(g) {
      const top = H(g, 0.52), cy = top - 0.05;
      g.add(M(new THREE.BoxGeometry(0.06, 0.1, 0.07), clay(SF.leafD), 0, cy, 0));
      T.flower(g, 0.17, 0.115, cy, 0, { d: 0.022, cz: 0.4, face: 'both' });
      g.scale.setScalar(1.18);
    },
    hoe(g) {
      const top = H(g, 0.52), hd = new THREE.Group(); hd.position.y = top + 0.01; g.add(hd);
      hd.add(M(new THREE.BoxGeometry(0.08, 0.08, 0.075), clay(SF.leafD)));
      pickArms(hd, [clay(SF.petal), clay(SF.petalD)], clay(SF.core));
      motif(hd, 0.05, 0, 0.085, 0);
      g.scale.setScalar(1.18);
    },
    seed(g) {
      T.sph(g, 0.11, SF.petal, 0, 0.09, 0, [1, 1.05, 1], true, 14);
      g.add(M(new THREE.CylinderGeometry(0.045, 0.065, 0.05, 10), clay(SF.leafD), 0, 0.2, 0));
      g.add(M(new THREE.TorusGeometry(0.05, 0.011, 5, 12), clay(SF.core), 0, 0.2, 0).rotateX(Math.PI / 2));
      motif(g, 0.065, 0, 0.09, 0.075);
      g.scale.setScalar(1.25);
    },
    water(g) {
      g.add(M(new THREE.CylinderGeometry(0.1, 0.112, 0.17, 16), clay(SF.stem, { smooth: true }), 0, 0.1, 0));
      const f = T.flower(g, 0.25, 0.01, 0.24, 0.0, { d: 0.022, cz: 0.6, skip: a => Math.cos(a) < -0.4 });
      f.rotation.y = 0.35;
      spout(g, SF.leafD, 0.17);
      canHandle(g, SF.leafD);
      g.scale.setScalar(1.25);
    },
    sickle(g) {
      const top = H(g, 0.30, 0.034);
      const { bl, tip } = sickleBlade(g, top, [clay(SF.petal), clay(SF.petal), clay(SF.petalD)], clay(SF.core), 1.2);
      motif(bl, 0.04, tip.x, tip.y + 0.01, 0);
      g.add(M(new THREE.CylinderGeometry(0.032, 0.04, 0.05, 9), clay(SF.leafD), 0, top - 0.01, 0));
      g.scale.setScalar(1.18);
    },
    shovel(g) {
      const top = H(g, 0.58), by = top + 0.03;
      g.add(M(new THREE.CylinderGeometry(0.036, 0.044, 0.07, 9), clay(SF.leafD), 0, top + 0.01, 0));
      g.add(M(ext(roundBlade(0.105, 0.13), 0.03, 0.01, 14), clay(SF.petal, { smooth: true }), 0, by, 0));
      motif(g, 0.06, 0, by + 0.12, 0.03);
      g.scale.setScalar(1.18);
    },
    hammer(g) {
      const top = H(g, 0.50), y = top - 0.04;
      const head = M(new THREE.CylinderGeometry(0.05, 0.05, 0.15, 12), clay(SF.petalD, { smooth: true }), 0, y, 0); head.rotation.z = Math.PI / 2; g.add(head);
      [-1, 1].forEach(sx => motif(g, 0.058, sx * 0.1, y, 0));
      g.scale.setScalar(1.18);
    },
    rod(g) {
      X.rodFrame(g, { knobFn: g => g.add(M(new THREE.SphereGeometry(0.042, 8, 6), clay(SF.petal, { smooth: true }), 0, -0.1, 0)), rear: clay(SF.leafD), line: 0xe8dcd0, pole: (p, L) => {
        p.add(M(new THREE.CylinderGeometry(0.013, 0.026, L, 7), clay(SF.stem), 0, L / 2, 0));
        T.leaf(p, 0.018, 0.055, 0, L * 0.5, 0, 0.5);
      } }, b => T.flower(b, 0.11, 0, -0.03, 0, { d: 0.014, cz: 0.5, n: 10 }));
    },
    net(g) {
      g.add(M(new THREE.CylinderGeometry(0.024, 0.028, 0.66, 7), clay(SF.stem), 0, 0.27, 0));
      g.add(M(new THREE.SphereGeometry(0.04, 8, 6), clay(SF.petal, { smooth: true }), 0, -0.08, 0));
      g.add(M(new THREE.TorusGeometry(0.17, 0.02, 6, 20), clay(SF.petal), 0, 0.6, 0).rotateX(Math.PI / 2));
      g.add(M(new THREE.ConeGeometry(0.16, 0.3, 12, 1, true), netBag(SF.leaf, 0.5), 0, 0.75, 0));
      motif(g, 0.05, 0, 0.62, 0.17);
      g.scale.setScalar(1.25);
    },
  } };
}

export const SUNFLOWER_UMBRELLA = Object.freeze({ N: 12, R: 1.0, th: 0.95, overlap: 1.05, shape: { w: () => 1, tip: 0.12 } });

export function sunflowerUmbrellaLook(THREE, K, X, { root, L, jHook }) {
  const { clay, M } = K, T = sunflowerKit(THREE, K, X);
  return {
    outer: k => clay(k % 2 ? SF.petalD : SF.petal, { smooth: true }), inner: () => clay(SF.petal, { side: THREE.BackSide, lift: 0.3 }),
    shaft() {
      root.add(M(new THREE.CylinderGeometry(0.022, 0.027, L, 7), clay(SF.stem), 0, L / 2, 0));
      jHook(clay(SF.petal), 0.07);
    },
    deco() {},
    finial(c) {
      T.sph(c, 0.3, SF.core, 0, 0, 0, [1, 0.25, 1], true, 14);
      T.flower(c, 0.3, 0, 0.16, 0, { d: 0.03, cz: 0.6, n: 10 }).rotation.y = 0.2;
    },
  };
}
