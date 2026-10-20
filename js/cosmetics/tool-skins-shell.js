export const SL = Object.freeze({ coral: 0xf08a7a, peach: 0xf6bea0, pearl: 0xf6ede6, aqua: 0x77cfc6, teal: 0x3e9a96, sand: 0xe2cc9c, drift: 0xc9b596, glow: 0xfff3ea });

export function shellKit(THREE, K, X) {
  const { clay, M, ext } = K;
  const pearl = (r = 0.02) => X.small(M(new THREE.SphereGeometry(r, 8, 6), clay(SL.glow, { glow: SL.glow, k: 0.7, smooth: true })));
  function scallopShell(p, r, mat, ribMat, x, y, z, rotZ = 0, a0 = -0.95, a1 = 0.95, depth = 0.04) {
    const grp = new THREE.Group(); grp.position.set(x, y, z); grp.rotation.z = rotZ; p.add(grp);
    grp.add(M(ext(X.scallopFan(r, a0, a1, 7), depth, depth * 0.22, 2), mat));
    for (let i = 0; i < 7; i++) { const a = a0 + (a1 - a0) * (i + 0.5) / 7; [-1, 1].forEach(sz => X.rib(grp, ribMat, a, r * 0.18, r * 0.9, sz * (depth / 2 + depth * 0.2), 0.007)); }
    grp.add(M(ext(X.polyShape([[-r * 0.16, -r * 0.1], [r * 0.16, -r * 0.1], [r * 0.12, r * 0.08], [-r * 0.12, r * 0.08]]), depth * 1.1, 0), mat).rotateZ(-Math.PI / 2));
    return grp;
  }
  return { pearl, scallopShell };
}

export function shellThemes(THREE, K, X) {
  const { clay, M, V, ext } = K;
  const { TAU, hemi, puffStar, faceX, scallopBlade, pickArms, sickleBlade, rodFrame, netBag } = X;
  const { pearl, scallopShell } = shellKit(THREE, K, X);
  const slHandle = (g, l, r = 0.031) => X.handle(g, { wood: SL.drift, grip: SL.teal, knobFn: (g, r) => g.add(M(new THREE.SphereGeometry(r * 1.35, 8, 6), clay(SL.pearl, { smooth: true }), 0, -0.08, 0)), bands: [[SL.aqua, 0.78], [SL.sand, 0.84]] }, l, r);
  return { shell: {
    axe(g) {
      const top = slHandle(g, 0.52), cy = top - 0.05;
      g.add(M(new THREE.BoxGeometry(0.06, 0.12, 0.07), clay(SL.teal), 0, cy, 0));
      scallopShell(g, 0.19, clay(SL.coral), clay(SL.peach), 0.02, cy, 0);
      g.add(pearl(0.016).translateX(0.035).translateY(cy).translateZ(0.03));
      g.add(M(new THREE.BoxGeometry(0.05, 0.09, 0.075), clay(SL.teal), -0.035, cy, 0));
      g.scale.setScalar(1.18);
    },
    hoe(g) {
      const top = slHandle(g, 0.52), hd = new THREE.Group(); hd.position.y = top + 0.01; g.add(hd);
      hd.add(M(new THREE.BoxGeometry(0.08, 0.08, 0.075), clay(SL.teal)));
      pickArms(hd, [clay(SL.coral), clay(SL.peach)], clay(SL.pearl));
      scallopShell(hd, 0.07, clay(SL.peach), clay(SL.coral), 0, 0.03, 0, Math.PI / 2, -0.9, 0.9, 0.024);
      g.scale.setScalar(1.18);
    },
    seed(g) {
      g.add(hemi(0.12, clay(SL.peach, { smooth: true }), 0, 0.06, 0, 0.5).rotateX(Math.PI));
      const lid = new THREE.Group(); lid.position.set(0, 0.06, -0.1); lid.rotation.x = -0.45; g.add(lid);
      lid.add(hemi(0.12, clay(SL.coral, { smooth: true }), 0, 0, 0.1, 0.55));
      for (let i = 0; i < 6; i++) { const a = (i + 0.5) / 6 * Math.PI; const r = M(new THREE.TorusGeometry(0.12, 0.006, 3, 10, Math.PI / 2), clay(SL.peach), 0, 0, 0.1); r.rotation.set(0, a, Math.PI / 2); r.scale.set(1, 0.55, 1); lid.add(r); }
      g.add(pearl(0.04).translateY(0.08));
      g.add(M(new THREE.TorusGeometry(0.118, 0.01, 4, 18), clay(SL.sand), 0, 0.06, 0).rotateX(Math.PI / 2));
      g.scale.setScalar(1.25);
    },
    water(g) {
      const prof = t => 0.13 * Math.pow(1 - t, 0.85) * (0.75 + 0.25 * Math.sin(t * Math.PI * 0.9 + 0.6));
      const pts = []; for (let i = 0; i <= 30; i++) { const t = i / 30; pts.push(new THREE.Vector2(Math.max(0.004, prof(t)), t * 0.36)); }
      g.add(M(new THREE.LatheGeometry(pts, 12), clay(SL.peach), 0, 0.03, 0));
      const helix = []; for (let i = 0; i <= 60; i++) { const t = i / 60, a = t * TAU * 3, rr = prof(t) + 0.006; helix.push(V(Math.cos(a) * rr, 0.03 + t * 0.36, Math.sin(a) * rr)); }
      g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(helix), 90, 0.011, 5), clay(SL.coral)));
      const sp = M(new THREE.CylinderGeometry(0.018, 0.03, 0.22, 7), clay(SL.coral), 0.15, 0.17, 0); sp.rotation.z = -0.9; g.add(sp);
      scallopShell(g, 0.06, clay(SL.coral), clay(SL.peach), 0.24, 0.24, 0, 0.62, -1.0, 1.0, 0.016);
      const hd = M(new THREE.TorusGeometry(0.07, 0.016, 5, 12, Math.PI * 1.05), clay(SL.sand), -0.13, 0.13, 0); hd.rotation.z = Math.PI / 2 + 0.25; g.add(hd);
      g.add(pearl(0.016).translateY(0.4));
      g.scale.setScalar(1.25);
    },
    sickle(g) {
      const top = slHandle(g, 0.30, 0.034);
      const { bl, tip } = sickleBlade(g, top, [clay(SL.aqua), clay(SL.teal), clay(SL.aqua)], clay(SL.pearl), 1.25);
      bl.add(M(new THREE.TorusGeometry(0.022, 0.009, 4, 10, Math.PI * 1.4), clay(SL.pearl), tip.x - 0.012, tip.y - 0.005, 0));
      g.add(M(new THREE.CylinderGeometry(0.030, 0.036, 0.06, 7), clay(SL.sand), 0, top - 0.01, 0));
      g.add(pearl(0.014).translateY(top - 0.01).translateZ(0.036));
      g.scale.setScalar(1.18);
    },
    shovel(g) {
      const top = slHandle(g, 0.58), by = top + 0.03;
      g.add(M(new THREE.CylinderGeometry(0.036, 0.044, 0.07, 8), clay(SL.teal), 0, top + 0.01, 0));
      g.add(M(ext(scallopBlade(0.108, 0.13, 7), 0.034, 0.012, 2), clay(SL.coral, { smooth: true }), 0, by, 0));
      [-1, 1].forEach(sz => [-0.9, -0.45, 0, 0.45, 0.9].forEach(a => { const b = M(new THREE.BoxGeometry(0.008, 0.2, 0.006), clay(SL.peach), Math.sin(a) * 0.055, by + 0.1, sz * 0.024); b.rotation.z = -a * 0.55; g.add(b); }));
      g.scale.setScalar(1.18);
    },
    hammer(g) {
      const top = slHandle(g, 0.50), y = top - 0.04;
      const head = M(new THREE.CylinderGeometry(0.046, 0.046, 0.16, 10), clay(SL.sand), 0, y, 0); head.rotation.z = Math.PI / 2; g.add(head);
      [-1, 1].forEach(sx => g.add(faceX(M(puffStar(0.075, 0.45), clay(SL.coral), sx * 0.092, y, 0), sx)));
      const band = M(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 10), clay(SL.aqua), 0, y, 0); band.rotation.z = Math.PI / 2; g.add(band);
      g.scale.setScalar(1.18);
    },
    rod(g) {
      rodFrame(g, { knobFn: g => g.add(M(new THREE.SphereGeometry(0.042, 8, 6), clay(SL.pearl, { smooth: true }), 0, -0.095, 0)), rear: clay(SL.teal), line: 0xeef8f6, pole: (p, L) => {
        p.add(M(new THREE.CylinderGeometry(0.014, 0.027, L, 7), clay(SL.drift), 0, L / 2, 0));
        [0.25, 0.5, 0.75].forEach((f, i) => p.add(M(new THREE.CylinderGeometry(0.025 - f * 0.011, 0.025 - f * 0.011, 0.016, 7), clay(i % 2 ? SL.coral : SL.aqua), 0, L * f, 0)));
      } }, b => { b.add(M(puffStar(0.055, 0.45), clay(SL.coral))); b.add(pearl(0.014).translateZ(0.02)); });
    },
    net(g) {
      g.add(M(new THREE.CylinderGeometry(0.028, 0.03, 0.72, 7), clay(SL.drift), 0, 0.25, 0));
      g.add(M(new THREE.SphereGeometry(0.045, 8, 6), clay(SL.pearl, { smooth: true }), 0, -0.1, 0));
      const ring = M(new THREE.TorusGeometry(0.17, 0.024, 6, 18), clay(SL.sand), 0, 0.6, 0); ring.rotation.x = Math.PI / 2; g.add(ring);
      const twist = M(new THREE.TorusGeometry(0.17, 0.008, 3, 36), clay(SL.teal), 0, 0.605, 0); twist.rotation.x = Math.PI / 2; g.add(twist);
      g.add(M(new THREE.ConeGeometry(0.16, 0.3, 12, 1, true), netBag(SL.aqua, 0.5), 0, 0.75, 0));
      const st = M(puffStar(0.045, 0.45), clay(SL.coral), -0.17, 0.63, 0.03); st.rotation.x = -Math.PI / 2; g.add(st);
      g.scale.setScalar(1.25);
    },
  } };
}

export const SHELL_UMBRELLA = Object.freeze({ N: 10, R: 1.3, th: 0.66, overlap: 1, shape: { w: () => 1, tip: 0.05 } });

export function shellUmbrellaLook(THREE, K, X, { root, L, def, jHook }) {
  const { clay, M } = K, { pearl } = shellKit(THREE, K, X);
  return {
    outer: k => clay(k % 2 ? SL.pearl : SL.coral), inner: () => clay(SL.peach, { side: THREE.BackSide, lift: 0.3 }),
    shaft() {
      root.add(M(new THREE.CylinderGeometry(0.0216, 0.0264, L, 7), clay(SL.drift), 0, L / 2, 0));
      [0, 0.05].forEach((d, i) => root.add(M(new THREE.CylinderGeometry(0.031, 0.031, 0.03, 7), clay(i ? SL.sand : SL.aqua), 0, L - 0.55 + d, 0)));
      jHook(clay(SL.teal), 0.07);
    },
    deco(h) { const p = X.goreSurf(def.R, def.th, 0).p; h.add(M(new THREE.SphereGeometry(0.024, 6, 5), clay(SL.aqua), p.x, p.y, p.z)); },
    finial(c) { c.add(pearl(0.05).translateY(0.05)); },
  };
}
