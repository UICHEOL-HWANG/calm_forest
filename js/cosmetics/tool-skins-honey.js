export const HN = Object.freeze({ honey: 0xf0b132, amber: 0xd98a1c, cream: 0xfbe6ae, choco: 0x4d3527, wood: 0xd9a95c, straw: 0xe2a640, drop: 0xffd25a, wing: 0xeaf4f8 });

export function honeyKit(THREE, K, X) {
  const { clay, M } = K;
  const dropMat = () => clay(HN.drop, { glow: HN.drop, k: 0.7 });
  const drip = (p, x, y, z, s = 1) => p.add(X.small(M(new THREE.CapsuleGeometry(0.009 * s, 0.025 * s, 3, 6), dropMat(), x, y, z)));
  function bee(p, s, x, y, z) {
    const b = M(new THREE.SphereGeometry(0.05 * s, 10, 8), clay(HN.honey, { smooth: true }), x, y, z); b.scale.set(1.3, 1, 1); p.add(b);
    [-0.022, 0.018].forEach(dx => { const t = M(new THREE.CylinderGeometry(0.047 * s, 0.047 * s, 0.014 * s, 10), clay(HN.choco), x + dx * s, y, z); t.rotation.z = Math.PI / 2; p.add(t); });
    [-1, 1].forEach(sz => { const w = M(new THREE.SphereGeometry(0.035 * s, 8, 6), X.netBag(HN.wing, 0.6), x - 0.005 * s, y + 0.045 * s, z + sz * 0.025 * s); w.scale.set(0.7, 1, 0.25); w.rotation.x = sz * 0.5; p.add(w); });
  }
  return { dropMat, drip, bee };
}

export function honeyThemes(THREE, K, X) {
  const { clay, M, ext } = K;
  const { small, polyShape, hexPts, roundBlade, pickArms, sickleBlade, rodFrame, netBag } = X;
  const { dropMat, drip, bee } = honeyKit(THREE, K, X);
  const hnHandle = (g, l, r = 0.031) => X.handle(g, { wood: HN.wood, grip: HN.choco, knobFn: (g, r) => g.add(M(new THREE.CylinderGeometry(r * 1.4, r * 1.4, r * 1.6, 6), clay(HN.amber), 0, -0.09, 0)), bands: [[HN.choco, 0.72], [HN.choco, 0.84]] }, l, r);
  const honeyBlade = holes => { const s = polyShape([[0, -0.07], [0.1, -0.125], [0.2, -0.055], [0.2, 0.055], [0.1, 0.125], [0, 0.07]]); holes.forEach(([x, y, r]) => s.holes.push(polyShape(hexPts(r, x, y, Math.PI / 6), new THREE.Path()))); return s; };
  return { honey: {
    axe(g) {
      const top = hnHandle(g, 0.52), cy = top - 0.05;
      g.add(M(new THREE.BoxGeometry(0.06, 0.12, 0.07), clay(HN.choco), 0, cy, 0));
      g.add(M(ext(honeyBlade([]), 0.016, 0, 2), clay(HN.amber), 0.02, cy, 0));
      g.add(M(ext(honeyBlade([[0.075, 0.04, 0.026], [0.075, -0.04, 0.026], [0.14, 0, 0.026]]), 0.042, 0.008, 2), clay(HN.honey), 0.02, cy, 0));
      drip(g, 0.13, cy - 0.12, 0.012); drip(g, 0.17, cy - 0.09, -0.01, 0.8);
      g.add(M(new THREE.BoxGeometry(0.05, 0.09, 0.075), clay(HN.choco), -0.035, cy, 0));
      g.scale.setScalar(1.18);
    },
    hoe(g) {
      const top = hnHandle(g, 0.52), hd = new THREE.Group(); hd.position.y = top + 0.01; g.add(hd);
      hd.add(M(new THREE.CylinderGeometry(0.06, 0.06, 0.08, 6), clay(HN.honey), 0, 0.01, 0).rotateX(Math.PI / 2));
      pickArms(hd, [clay(HN.honey), clay(HN.amber)], clay(HN.choco));
      [-1, 1].forEach(sz => hd.add(M(new THREE.CylinderGeometry(0.03, 0.03, 0.006, 6), clay(HN.amber), 0, 0.01, sz * 0.042).rotateX(Math.PI / 2)));
      g.scale.setScalar(1.18);
    },
    seed(g) {
      const pot = M(new THREE.SphereGeometry(0.12, 12, 10), clay(HN.amber, { smooth: true }), 0, 0.09, 0); pot.scale.set(1, 0.92, 1); g.add(pot);
      g.add(M(new THREE.CylinderGeometry(0.07, 0.085, 0.05, 12), clay(HN.amber), 0, 0.19, 0));
      const rim = M(new THREE.TorusGeometry(0.072, 0.014, 5, 14), clay(HN.honey), 0, 0.215, 0); rim.rotation.x = Math.PI / 2; g.add(rim);
      g.add(M(new THREE.ConeGeometry(0.1, 0.06, 10, 1, true), clay(HN.cream, { side: THREE.DoubleSide }), 0, 0.245, 0));
      const tie = M(new THREE.TorusGeometry(0.066, 0.008, 4, 14), clay(HN.choco), 0, 0.225, 0); tie.rotation.x = Math.PI / 2; g.add(tie);
      [0.4, 2.1, 4.2].forEach(a => drip(g, Math.cos(a) * 0.08, 0.175, Math.sin(a) * 0.08));
      g.add(M(new THREE.BoxGeometry(0.07, 0.05, 0.006), clay(HN.cream), 0, 0.09, 0.118));
      g.scale.setScalar(1.25);
    },
    water(g) {
      const pts = [];
      for (let i = 0; i <= 40; i++) { const t = i / 40, base = 0.13 * Math.sqrt(Math.max(0.02, 1 - (t * 0.97) ** 2)); pts.push(new THREE.Vector2(Math.max(0.004, base * (1 + 0.07 * Math.cos(t * Math.PI * 11))), t * 0.27)); }
      g.add(M(new THREE.LatheGeometry(pts, 14), clay(HN.straw), 0, 0.07, 0));
      const door = new THREE.Shape(); door.moveTo(-0.03, 0); door.absarc(0, 0, 0.03, Math.PI, 0, true); door.closePath();
      g.add(M(ext(door, 0.01, 0.003), clay(HN.choco), 0, 0.09, 0.122));
      g.add(M(new THREE.CylinderGeometry(0.025, 0.025, 0.03, 6), clay(HN.amber), 0, 0.345, 0));
      const sp = M(new THREE.CylinderGeometry(0.018, 0.03, 0.22, 7), clay(HN.honey), 0.15, 0.2, 0); sp.rotation.z = -0.9; g.add(sp);
      const rose = M(new THREE.CylinderGeometry(0.035, 0.035, 0.02, 6), clay(HN.amber), 0.245, 0.27, 0); rose.rotation.z = -0.9; g.add(rose);
      bee(g, 0.55, -0.06, 0.3, 0.07);
      g.scale.setScalar(1.25);
    },
    sickle(g) {
      const top = hnHandle(g, 0.30, 0.034);
      sickleBlade(g, top, [clay(HN.honey), clay(HN.choco), clay(HN.honey)], clay(HN.cream), 1.25);
      g.add(M(new THREE.CylinderGeometry(0.034, 0.034, 0.06, 6), clay(HN.amber), 0, top - 0.01, 0));
      drip(g, 0.0, top - 0.05, 0.035, 0.8);
      g.scale.setScalar(1.18);
    },
    shovel(g) {
      const top = hnHandle(g, 0.58), by = top + 0.03;
      g.add(M(new THREE.CylinderGeometry(0.036, 0.044, 0.07, 6), clay(HN.choco), 0, top + 0.01, 0));
      g.add(M(ext(roundBlade(0.1, 0.125), 0.016, 0, 14), clay(HN.amber), 0, by, 0));
      const sh = roundBlade(0.105, 0.13);
      [[-0.035, 0.1], [0.035, 0.1], [0, 0.16]].forEach(([x, y]) => sh.holes.push(polyShape(hexPts(0.03, x, y, Math.PI / 6), new THREE.Path())));
      g.add(M(ext(sh, 0.036, 0.012, 14), clay(HN.honey, { smooth: true }), 0, by, 0));
      drip(g, 0.06, by + 0.02, 0.03);
      g.scale.setScalar(1.18);
    },
    hammer(g) {
      const top = hnHandle(g, 0.50), y = top - 0.04, grp = new THREE.Group(); grp.position.y = y; grp.rotation.z = Math.PI / 2; g.add(grp);
      grp.add(M(new THREE.CylinderGeometry(0.032, 0.032, 0.2, 10), clay(HN.honey)));
      [-0.07, -0.035, 0, 0.035, 0.07].forEach((yy, i) => grp.add(M(new THREE.CylinderGeometry(0.058 - Math.abs(yy) * 0.12, 0.058 - Math.abs(yy) * 0.12, 0.022, 10), clay(i % 2 ? HN.amber : HN.honey, { smooth: true }), 0, yy, 0)));
      [-1, 1].forEach(s => grp.add(M(new THREE.SphereGeometry(0.035, 8, 6), clay(HN.amber, { smooth: true }), 0, s * 0.1, 0)));
      drip(g, 0.02, y - 0.07, 0, 0.9);
      g.scale.setScalar(1.18);
    },
    rod(g) {
      rodFrame(g, { knobFn: g => g.add(M(new THREE.CylinderGeometry(0.042, 0.042, 0.05, 6), clay(HN.amber), 0, -0.095, 0)), rear: clay(HN.choco), line: 0xf6ead0, pole: (p, L) => {
        p.add(M(new THREE.CylinderGeometry(0.014, 0.027, L, 7), clay(HN.wood), 0, L / 2, 0));
        [0.25, 0.5, 0.75].forEach(f => p.add(M(new THREE.CylinderGeometry(0.025 - f * 0.011, 0.025 - f * 0.011, 0.016, 7), clay(HN.choco), 0, L * f, 0)));
        p.add(small(M(new THREE.SphereGeometry(0.016, 6, 5), dropMat(), 0, L + 0.02, 0)));
      } }, b => bee(b, 0.9, 0, 0, 0));
    },
    net(g) {
      g.add(M(new THREE.CylinderGeometry(0.028, 0.03, 0.72, 7), clay(HN.wood), 0, 0.25, 0));
      g.add(M(new THREE.CylinderGeometry(0.042, 0.042, 0.05, 6), clay(HN.amber), 0, -0.1, 0));
      const fr = polyShape(hexPts(0.215)); fr.holes.push(polyShape(hexPts(0.18), new THREE.Path()));
      const ring = M(ext(fr, 0.03, 0.006, 2), clay(HN.honey), 0, 0.6, 0); ring.rotation.x = -Math.PI / 2; g.add(ring);
      g.add(M(new THREE.ConeGeometry(0.16, 0.3, 6, 1, true), netBag(HN.cream, 0.55), 0, 0.75, 0));
      drip(g, 0.19, 0.57, 0.0);
      g.scale.setScalar(1.25);
    },
  } };
}

export const HONEY_UMBRELLA = Object.freeze({ N: 6, R: 1.05, th: 0.85, overlap: 1, shape: { w: () => 1, tip: 0 }, twist: Math.PI / 6 });

export function honeyUmbrellaLook(THREE, K, X, { root, L, def, jHook }) {
  const { clay, M } = K, { bee } = honeyKit(THREE, K, X);
  return {
    outer: k => clay(k % 2 ? HN.cream : HN.honey), inner: () => clay(HN.cream, { side: THREE.BackSide, lift: 0.3 }),
    shaft() {
      root.add(M(new THREE.CylinderGeometry(0.0234, 0.0286, L, 7), clay(HN.wood), 0, L / 2, 0));
      [0.0, 0.06].forEach(d => root.add(M(new THREE.CylinderGeometry(0.032, 0.032, 0.03, 7), clay(HN.choco), 0, L - 0.55 + d, 0)));
      jHook(clay(HN.choco), 0.07);
    },
    deco(h, k) {
      if (k % 2) return;
      const { p, n } = X.goreSurf(def.R * 1.003, def.th * 0.6, 0);
      const s = M(new THREE.CylinderGeometry(0.06, 0.06, 0.012, 6), clay(HN.amber), p.x, p.y, p.z); s.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n); h.add(s);
    },
    finial(c) { bee(c, 1.3, 0, 0.08, 0); },
  };
}
