export const CD = Object.freeze({ sugar: 0xded6d4, sugarS: 0xc6bcba, red: 0xd2343e, redD: 0xa02632, mint: 0x3f9a62 });

const BLADE = [[0.02, -0.045], [0.14, -0.095], [0.19, -0.105], [0.205, 0], [0.19, 0.105], [0.14, 0.095], [0.02, 0.045]];
const EDGE = [[0.18, -0.108], [0.205, -0.112], [0.222, 0], [0.205, 0.112], [0.18, 0.108], [0.198, 0]];

export function candyKit(THREE, K, X) {
  const { clay, M, V, ext } = K, { curve } = X;
  function stripes(p, c, r, turns, mat, segs) {
    const fr = c.computeFrenetFrames(segs, false);
    [0, Math.PI].forEach(a0 => {
      const pts = [];
      for (let i = 0; i <= segs; i++) {
        const a = a0 + i / segs * turns * Math.PI * 2, q = c.getPointAt(i / segs);
        pts.push(q.addScaledVector(fr.normals[i], Math.cos(a) * r * 0.82).addScaledVector(fr.binormals[i], Math.sin(a) * r * 0.82));
      }
      p.add(new THREE.Mesh(new THREE.TubeGeometry(curve(pts), segs, r * 0.32, 4, false), mat));
    });
  }
  function cane(p, pts, r, turns, col = CD.red) {
    const c = curve(pts), segs = Math.max(12, Math.round(turns * 7));
    p.add(new THREE.Mesh(new THREE.TubeGeometry(c, Math.max(8, Math.round(segs / 2)), r, 7, false), clay(CD.sugar)));
    stripes(p, c, r, turns, clay(col), segs);
    [0, 1].forEach(t => { const q = c.getPointAt(t); p.add(M(new THREE.SphereGeometry(r, 7, 5), clay(CD.sugar, { smooth: true }), q.x, q.y, q.z)); });
    return c;
  }
  const crook = (x0, y0, R, side = 1, a1 = Math.PI * 1.05, n = 10) => Array.from({ length: n }, (_, i) => { const a = Math.PI - a1 * (i + 1) / n; return V(x0 + side * (R + Math.cos(a) * R), y0 + Math.sin(a) * R, 0); });
  function handle(g, l, r = 0.03, hook = 0) {
    const top = l - 0.08;
    cane(g, [V(0, -0.06, 0), V(0, top - (hook ? 0.04 : 0), 0), ...(hook ? crook(0, top, hook, -1, Math.PI * 1.15) : [])], r, l * 13);
    g.add(M(new THREE.SphereGeometry(r * 1.4, 8, 6), clay(CD.redD, { smooth: true }), 0, -0.085, 0));
    return top;
  }
  function mint(p, r, d, x, y, z, n = 8) {
    const grp = new THREE.Group(); grp.position.set(x, y, z); p.add(grp);
    const base = M(new THREE.CylinderGeometry(r, r, d, 18), clay(CD.sugar, { smooth: true })); base.rotation.x = Math.PI / 2; grp.add(base);
    for (let i = 0; i < n; i += 2) {
      const a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2, s = new THREE.Shape(); s.moveTo(0, 0);
      s.quadraticCurveTo(Math.cos(a0 + 0.9) * r * 0.55, Math.sin(a0 + 0.9) * r * 0.55, Math.cos(a1) * r * 0.97, Math.sin(a1) * r * 0.97);
      s.absarc(0, 0, r * 0.97, a1, a1 + (a1 - a0) * 0.9, false);
      s.quadraticCurveTo(Math.cos(a0 + 1.2) * r * 0.3, Math.sin(a0 + 1.2) * r * 0.3, 0, 0);
      grp.add(M(ext(s, d * 1.08, 0, 5), clay(CD.red)));
    }
    return grp;
  }
  const slash = (p, x, y, z, w, h, d, rz = -0.55) => { const s = M(new THREE.BoxGeometry(w, h, d), clay(CD.red), x, y, z); s.rotation.z = rz; p.add(s); return s; };
  return { stripes, cane, crook, handle, mint, slash };
}

export function candyThemes(THREE, K, X) {
  const { clay, M, V, ext } = K;
  const { polyShape, hemi, roundBlade, pickArms, sickleBlade, rodFrame, netBag } = X;
  const { cane, crook, handle, mint, slash } = candyKit(THREE, K, X);
  const miniCane = (p, x, y, s = 1) => cane(p, [V(x, y - 0.07 * s, 0), V(x, y, 0), ...crook(x, y + 0.02 * s, 0.026 * s, 1, Math.PI * 1.1, 6)], 0.013 * s, 2);
  return { candy: {
    axe(g) {
      const top = handle(g, 0.52, 0.03, 0.06), cy = top - 0.06;
      g.add(M(ext(polyShape(BLADE), 0.04, 0.01, 2), clay(CD.sugar, { smooth: true }), 0, cy, 0));
      g.add(M(ext(polyShape(EDGE), 0.034, 0.006, 2), clay(CD.red), 0, cy, 0));
      [0.045, 0.095, 0.145].forEach(x => [-1, 1].forEach(sz => slash(g, x, cy, sz * 0.026, 0.024, 0.13 + x * 0.5, 0.006)));
      g.add(M(new THREE.BoxGeometry(0.06, 0.1, 0.07), clay(CD.redD), 0, cy, 0));
      g.scale.setScalar(1.18);
    },
    hoe(g) {
      const top = handle(g, 0.52), hd = new THREE.Group(); hd.position.y = top + 0.01; g.add(hd);
      hd.add(M(new THREE.BoxGeometry(0.08, 0.08, 0.075), clay(CD.redD)));
      pickArms(hd, [clay(CD.sugar), clay(CD.red)], clay(CD.sugar));
      mint(hd, 0.034, 0.02, 0, 0, 0.042, 6);
      miniCane(hd, 0, 0.1, 0.9);
      g.scale.setScalar(1.18);
    },
    seed(g) {
      g.add(M(new THREE.SphereGeometry(0.105, 14, 10), clay(CD.sugar, { smooth: true }), 0, 0.09, 0));
      [0, 1.05, 2.1].forEach(ry => { const b = M(new THREE.TorusGeometry(0.106, 0.014, 4, 22), clay(CD.red), 0, 0.09, 0); b.rotation.set(0.5, ry, 0.3); g.add(b); });
      g.add(M(new THREE.CylinderGeometry(0.045, 0.065, 0.05, 10), clay(CD.red), 0, 0.19, 0));
      const tie = M(new THREE.TorusGeometry(0.048, 0.012, 5, 12), clay(CD.mint), 0, 0.2, 0); tie.rotation.x = Math.PI / 2; g.add(tie);
      miniCane(g, 0, 0.29, 1.1);
      g.scale.setScalar(1.25);
    },
    water(g) {
      g.add(M(new THREE.CylinderGeometry(0.11, 0.12, 0.2, 14), clay(CD.sugar, { smooth: true }), 0, 0.18, 0));
      [0, Math.PI].forEach(a0 => g.add(new THREE.Mesh(new THREE.TubeGeometry(X.curve(Array.from({ length: 13 }, (_, i) => { const a = a0 + i / 12 * 1.1 * Math.PI * 2; return V(Math.cos(a) * 0.118, 0.085 + 0.19 * i / 12, Math.sin(a) * 0.118); })), 36, 0.017, 4), clay(CD.red))));
      g.add(hemi(0.1, clay(CD.red, { smooth: true }), 0, 0.28, 0, 0.4));
      cane(g, [[0, 0.31, 0], [0, 0.35, 0], ...crook(0, 0.37, 0.025, 1, Math.PI * 1.1, 6)], 0.012, 2);
      cane(g, [[0.09, 0.22, 0], [0.18, 0.29, 0], [0.25, 0.35, 0]], 0.022, 3);
      const rose = M(new THREE.CylinderGeometry(0.04, 0.026, 0.03, 10), clay(CD.red), 0.255, 0.36, 0); rose.rotation.z = -0.9; g.add(rose);
      cane(g, [[-0.1, 0.1, 0], [-0.2, 0.12, 0], [-0.22, 0.24, 0], [-0.16, 0.29, 0], [-0.1, 0.25, 0]], 0.018, 4);
      g.scale.setScalar(1.25);
    },
    sickle(g) {
      const top = handle(g, 0.30, 0.034);
      const { bl, tip } = sickleBlade(g, top, [clay(CD.sugar), clay(CD.sugar), clay(CD.sugarS)], clay(CD.red), 1.25);
      [[0.003, 0.05, 0.072], [0.007, 0.11, 0.072], [0.026, 0.207, 0.06]].forEach(([x, y, w]) => slash(bl, x, y, 0, w, 0.016, 0.022, 0.5));
      bl.add(M(new THREE.SphereGeometry(0.022, 8, 6), clay(CD.red, { smooth: true }), tip.x, tip.y, 0));
      g.add(M(new THREE.CylinderGeometry(0.032, 0.04, 0.05, 9), clay(CD.redD), 0, top - 0.01, 0));
      g.scale.setScalar(1.18);
    },
    shovel(g) {
      const top = handle(g, 0.58), by = top + 0.03;
      g.add(M(new THREE.CylinderGeometry(0.036, 0.044, 0.07, 9), clay(CD.redD), 0, top + 0.01, 0));
      g.add(M(ext(roundBlade(0.112, 0.13), 0.026, 0.008, 14), clay(CD.red), 0, by, 0));
      g.add(M(ext(roundBlade(0.1, 0.125), 0.034, 0.012, 14), clay(CD.sugar, { smooth: true }), 0, by + 0.004, 0));
      [0.06, 0.12, 0.18].forEach(dy => slash(g, 0, by + dy, 0, 0.13, 0.024, 0.062, 0.6));
      g.scale.setScalar(1.18);
    },
    hammer(g) {
      const top = handle(g, 0.50), y = top - 0.04;
      const head = M(new THREE.CylinderGeometry(0.058, 0.058, 0.17, 12), clay(CD.sugar, { smooth: true }), 0, y, 0); head.rotation.z = Math.PI / 2; g.add(head);
      [-0.04, 0.04].forEach(x => { const b = M(new THREE.CylinderGeometry(0.061, 0.061, 0.024, 12), clay(CD.red), x, y, 0); b.rotation.z = Math.PI / 2; g.add(b); });
      [-1, 1].forEach(sx => { mint(g, 0.056, 0.03, sx * 0.095, y, 0).rotation.y = Math.PI / 2; });
      g.scale.setScalar(1.18);
    },
    rod(g) {
      rodFrame(g, { knobFn: g => g.add(M(new THREE.SphereGeometry(0.042, 8, 6), clay(CD.redD, { smooth: true }), 0, -0.1, 0)), rear: clay(CD.red), line: 0xe8e0dc,
        pole: (p, L) => cane(p, [[0, 0, 0], [0, L, 0]], 0.02, 9) }, b => miniCane(b, 0, 0, 1));
    },
    net(g) {
      cane(g, [[0, -0.06, 0], [0, 0.6, 0]], 0.028, 8);
      g.add(M(new THREE.SphereGeometry(0.042, 8, 6), clay(CD.redD, { smooth: true }), 0, -0.1, 0));
      const ring = new THREE.Group(); ring.position.y = 0.6; ring.rotation.x = Math.PI / 2; g.add(ring);
      for (let k = 0; k < 10; k++) { const a = M(new THREE.TorusGeometry(0.17, 0.024, 6, 3, Math.PI / 5), clay(k % 2 ? CD.red : CD.sugar)); a.rotation.z = k * Math.PI / 5; ring.add(a); }
      g.add(M(new THREE.ConeGeometry(0.16, 0.3, 12, 1, true), netBag(CD.red, 0.5), 0, 0.75, 0));
      mint(g, 0.04, 0.024, 0, 0.6, 0.175, 6);
      g.scale.setScalar(1.25);
    },
  } };
}

export const CANDY_UMBRELLA = Object.freeze({ N: 8, R: 1.0, th: 0.95, overlap: 1, shape: { w: () => 1, tip: 0.04 } });

export function candyUmbrellaLook(THREE, K, X, { root, L, def, jHook }) {
  const { clay, M } = K, { cane, mint } = candyKit(THREE, K, X);
  return {
    outer: k => clay(k % 2 ? CD.sugar : CD.red), inner: () => clay(CD.sugar, { side: THREE.BackSide, lift: 0.3 }),
    shaft() {
      cane(root, [[0, 0, 0], [0, L, 0]], 0.024, 12);
      jHook(clay(CD.red), 0.07);
    },
    deco(h, k) {
      const p = X.goreSurf(def.R, def.th * 0.97, 0).p;
      h.add(M(new THREE.SphereGeometry(0.03, 8, 6), clay(k % 2 ? CD.red : CD.sugar, { smooth: true }), p.x, p.y, p.z));
    },
    finial(c) { mint(c, 0.06, 0.03, 0, 0.07, 0); },
  };
}
