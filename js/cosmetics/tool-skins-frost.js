export const FR = Object.freeze({ ice: 0x8fc3e6, iceL: 0xc4e2f4, deep: 0x4f86b8, snow: 0xf2f6fa, knit: 0xd9504f, knitL: 0xf08a7c, carrot: 0xf08a2c, coal: 0x3a3a48, birch: 0xdfe8ee, gem: 0xeaf7ff });

function frostBlade(X) {
  const pts = [[0, -0.07], [0.09, -0.12]], N = 6;
  for (let i = 0; i <= N * 2; i++) { const t = i / (N * 2), a = -0.95 + 1.9 * t, rr = i % 2 ? 0.15 : 0.19; pts.push([0.02 + Math.cos(a) * rr, Math.sin(a) * rr * 0.78]); }
  pts.push([0.09, 0.12], [0, 0.07]);
  return X.polyShape(pts);
}

export function frostThemes(THREE, K, X) {
  const { clay, M, ext } = K;
  const { small, flake, puffStar, starShape, polyShape, roundBlade, hemi, pickArms, sickleBlade, rodFrame, netBag } = X;
  const gem = () => clay(FR.gem, { glow: FR.gem, k: 0.85 });
  const frHandle = (g, l, r = 0.031) => X.handle(g, { wood: FR.birch, grip: FR.knit, knob: FR.snow, bands: [[FR.knitL, 0.8], [FR.knit, 0.85]] }, l, r);
  function beanie(p, r, y, z = 0) {
    p.add(hemi(r, clay(FR.knit, { smooth: true }), 0, y, z, 0.8, 12));
    const br = M(new THREE.TorusGeometry(r * 0.97, r * 0.16, 5, 14), clay(FR.knitL), 0, y + r * 0.04, z); br.rotation.x = Math.PI / 2; p.add(br);
    p.add(M(new THREE.SphereGeometry(r * 0.32, 8, 6), clay(FR.snow), 0, y + r * 0.85, z));
  }
  return { frost: {
    axe(g) {
      const top = frHandle(g, 0.52), cy = top - 0.05;
      g.add(M(new THREE.BoxGeometry(0.06, 0.12, 0.07), clay(FR.deep), 0, cy, 0));
      g.add(M(ext(frostBlade(X), 0.04, 0.008, 2), clay(FR.ice), 0.02, cy, 0));
      [-1, 1].forEach(sz => { const inl = M(ext(frostBlade(X), 0.006, 0, 2), clay(FR.iceL), 0.035, cy, sz * 0.026); inl.scale.set(0.72, 0.72, 1); g.add(inl); });
      g.add(small(M(flake(0.034), gem(), 0.1, cy, 0.034)));
      g.add(M(new THREE.BoxGeometry(0.075, 0.03, 0.085), clay(FR.snow), 0, cy + 0.07, 0));
      g.add(M(new THREE.BoxGeometry(0.05, 0.09, 0.075), clay(FR.deep), -0.035, cy, 0));
      g.scale.setScalar(1.18);
    },
    hoe(g) {
      const top = frHandle(g, 0.52), hd = new THREE.Group(); hd.position.y = top + 0.01; g.add(hd);
      hd.add(M(new THREE.BoxGeometry(0.08, 0.08, 0.075), clay(FR.deep)));
      pickArms(hd, [clay(FR.ice), clay(FR.iceL)], clay(FR.snow));
      hd.add(M(puffStar(0.06, 0.34, 6), clay(FR.snow), 0, 0.07, 0));
      hd.add(small(M(flake(0.018), gem(), 0, 0.07, 0.022)));
      g.scale.setScalar(1.18);
    },
    seed(g) {
      g.add(M(new THREE.SphereGeometry(0.115, 12, 10), clay(FR.snow, { smooth: true }), 0, 0.085, 0));
      beanie(g, 0.095, 0.14);
      [-1, 1].forEach(s => g.add(small(M(new THREE.SphereGeometry(0.0115, 6, 5), clay(FR.coal), s * 0.038, 0.113, 0.1035))));
      const c = M(new THREE.ConeGeometry(0.0138, 0.063, 6), clay(FR.carrot), 0, 0.09, 0.1265); c.rotation.x = Math.PI / 2; g.add(c);
      g.scale.setScalar(1.25);
    },
    water(g) {
      g.add(M(new THREE.SphereGeometry(0.13, 12, 10), clay(FR.snow, { smooth: true }), 0, 0.13, 0));
      g.add(M(new THREE.SphereGeometry(0.088, 12, 10), clay(FR.snow, { smooth: true }), 0, 0.29, 0));
      const sc = M(new THREE.TorusGeometry(0.075, 0.024, 6, 14), clay(FR.knit), 0, 0.225, 0); sc.rotation.x = Math.PI / 2; g.add(sc);
      const tail = M(new THREE.BoxGeometry(0.035, 0.09, 0.012), clay(FR.knit), 0.04, 0.17, 0.11); tail.rotation.z = 0.2; g.add(tail);
      beanie(g, 0.078, 0.33);
      [-1, 1].forEach(s => g.add(small(M(new THREE.SphereGeometry(0.009, 6, 5), clay(FR.coal), s * 0.03, 0.31, 0.08))));
      const sp = M(new THREE.ConeGeometry(0.026, 0.24, 7), clay(FR.carrot), 0.16, 0.3, 0); sp.rotation.z = -Math.PI / 2 + 0.55; g.add(sp);
      [0.11, 0.15].forEach(y => g.add(small(M(new THREE.SphereGeometry(0.012, 6, 5), clay(FR.coal), 0, y, 0.125))));
      const hd = M(new THREE.TorusGeometry(0.07, 0.016, 5, 12, Math.PI * 1.05), clay(FR.deep), -0.14, 0.16, 0); hd.rotation.z = Math.PI / 2 + 0.25; g.add(hd);
      g.scale.setScalar(1.25);
    },
    sickle(g) {
      const top = frHandle(g, 0.30, 0.034);
      const { bl, tip } = sickleBlade(g, top, [clay(FR.iceL), clay(FR.ice), clay(FR.deep)], clay(FR.snow), 1.25);
      bl.add(small(M(flake(0.026), gem(), tip.x, tip.y, 0)));
      g.add(M(new THREE.CylinderGeometry(0.030, 0.036, 0.06, 7), clay(FR.knit), 0, top - 0.01, 0));
      g.scale.setScalar(1.18);
    },
    shovel(g) {
      const top = frHandle(g, 0.58), by = top + 0.03;
      g.add(M(new THREE.CylinderGeometry(0.036, 0.044, 0.07, 8), clay(FR.deep), 0, top + 0.01, 0));
      g.add(M(ext(roundBlade(0.1, 0.125), 0.016, 0, 14), clay(FR.deep), 0, by, 0));
      const sh = roundBlade(0.105, 0.13); sh.holes.push(starShape(0.052, 0.32, 6, 0, 0.13, new THREE.Path()));
      g.add(M(ext(sh, 0.034, 0.012, 14), clay(FR.ice, { smooth: true }), 0, by, 0));
      g.add(M(new THREE.BoxGeometry(0.2, 0.025, 0.04), clay(FR.snow), 0, by + 0.012, 0));
      g.scale.setScalar(1.18);
    },
    hammer(g) {
      const top = frHandle(g, 0.50), y = top - 0.04;
      g.add(M(ext(polyShape([[-0.1, -0.05], [0.1, -0.05], [0.1, 0.05], [-0.1, 0.05]]), 0.1, 0.012, 2), clay(FR.ice), 0, y, 0));
      g.add(M(new THREE.BoxGeometry(0.2, 0.03, 0.11), clay(FR.snow), 0, y + 0.06, 0));
      [-1, 1].forEach(sx => { const ic = M(new THREE.ConeGeometry(0.012, 0.05, 5), clay(FR.iceL), sx * 0.07, y - 0.085, 0.03); ic.rotation.x = Math.PI; g.add(ic); });
      g.add(small(M(flake(0.028), gem(), 0.03, y, 0.064)));
      g.scale.setScalar(1.18);
    },
    rod(g) {
      rodFrame(g, { knobFn: g => g.add(M(new THREE.SphereGeometry(0.045, 8, 6), clay(FR.snow), 0, -0.095, 0)), rear: clay(FR.knit), line: 0xeef6ff, pole: (p, L) => {
        p.add(M(new THREE.CylinderGeometry(0.014, 0.027, L, 7), clay(FR.birch), 0, L / 2, 0));
        [0.25, 0.5, 0.75].forEach((f, i) => p.add(M(new THREE.CylinderGeometry(0.025 - f * 0.011, 0.025 - f * 0.011, 0.016, 7), clay(i % 2 ? FR.knitL : FR.knit), 0, L * f, 0)));
        p.add(small(M(flake(0.028), gem(), 0, L + 0.025, 0)));
      } }, b => { b.add(M(new THREE.SphereGeometry(0.05, 10, 8), clay(FR.snow, { smooth: true }))); const t = M(new THREE.TorusGeometry(0.05, 0.012, 5, 14), clay(FR.knit)); t.rotation.x = Math.PI / 2; b.add(t); });
    },
    net(g) {
      g.add(M(new THREE.CylinderGeometry(0.028, 0.03, 0.72, 7), clay(FR.birch), 0, 0.25, 0));
      g.add(M(new THREE.SphereGeometry(0.045, 8, 6), clay(FR.snow), 0, -0.1, 0));
      const fr = starShape(0.215, 0.8, 6); fr.holes.push(starShape(0.18, 0.8, 6, 0, 0, new THREE.Path()));
      const ring = M(ext(fr, 0.028, 0.006, 4), clay(FR.ice), 0, 0.6, 0); ring.rotation.x = -Math.PI / 2; g.add(ring);
      g.add(M(new THREE.ConeGeometry(0.16, 0.3, 12, 1, true), netBag(FR.iceL, 0.5), 0, 0.75, 0));
      g.add(small(M(flake(0.026), gem(), 0, 0.615, 0.21)));
      g.scale.setScalar(1.25);
    },
  } };
}

export const FROST_UMBRELLA = Object.freeze({ N: 6, R: 1.0, th: 0.92, overlap: 1, shape: { w: () => 1, tip: -0.05 }, twist: Math.PI / 6 });

export function frostUmbrellaLook(THREE, K, X, { root, L, def, jHook }) {
  const { clay, M } = K;
  return {
    outer: k => clay(k % 2 ? FR.iceL : FR.ice), inner: () => clay(FR.snow, { side: THREE.BackSide, lift: 0.3 }),
    shaft() {
      root.add(M(new THREE.CylinderGeometry(0.0198, 0.0242, L, 7), clay(FR.birch), 0, L / 2, 0));
      [0, 0.04].forEach((d, i) => root.add(M(new THREE.CylinderGeometry(0.03, 0.03, 0.035, 7), clay(i ? FR.knitL : FR.knit), 0, L - 0.55 + d, 0)));
      jHook(clay(FR.knit), 0.07);
    },
    deco(h) { const p = X.goreSurf(def.R, def.th, 0).p; const ic = M(new THREE.ConeGeometry(0.02, 0.09, 5), clay(FR.iceL), p.x, p.y - 0.04, p.z); ic.rotation.x = Math.PI; h.add(ic); },
    finial(c) { c.add(M(X.puffStar(0.08, 0.34, 6), clay(FR.snow), 0, 0.09, 0)); c.add(X.small(M(X.flake(0.03), clay(FR.gem, { glow: FR.gem, k: 0.85 }), 0, 0.09, 0.03))); },
  };
}
