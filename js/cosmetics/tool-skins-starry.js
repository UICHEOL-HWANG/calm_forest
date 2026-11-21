export const ST = Object.freeze({ night: 0x2c2f6a, navy: 0x1f2350, indigo: 0x4a4a9a, vio: 0x6a5ab0, star: 0xf2d36a, pale: 0xc9d0f0, cloud: 0xc4c8ea });

export function starryKit(THREE, K, X) {
  const { clay, M } = K, { curve, taper } = X;
  const streak = (p, pts, r0, r1, col) => { const c = curve(pts); p.add(new THREE.Mesh(taper(c, t => r0 + (r1 - r0) * t, 24, 6), clay(col, { smooth: true }))); return c; };
  const star = (p, r, col, x, y, z, k = 0.5) => { const s = M(X.puffStar(r, k), clay(col), x, y, z); p.add(s); return s; };
  return { streak, star };
}

export function starryThemes(THREE, K, X) {
  const { clay, M, V, ext } = K;
  const { hemi, roundBlade, pickArms, sickleBlade, netBag } = X;
  const { streak, star } = starryKit(THREE, K, X);
  const sH = (g, l, r = 0.03) => X.handle(g, { wood: ST.vio, grip: ST.night, knob: ST.navy }, l, r);
  const canHandle = (g, col) => g.add(M(new THREE.TorusGeometry(0.075, 0.015, 5, 12, Math.PI * 1.05), clay(col), -0.15, 0.19, 0).rotateZ(Math.PI / 2 + 0.25));
  const tail = (g, top, x1, y1) => streak(g, [[0.02, 0.2, 0.03], [-0.03, 0.26, 0], [0, (0.26 + top) / 2, -0.03], [x1 * 0.4, top - 0.02, 0], [x1, y1, 0]], 0.008, 0.022, ST.pale);
  return { starry: {
    axe(g) {
      const top = sH(g, 0.52), cy = top - 0.04;
      streak(g, [[0.02, 0.2, 0.034], [-0.03, 0.27, 0], [0.0, 0.33, -0.034], [0.04, cy - 0.02, 0], [0.1, cy, 0]], 0.012, 0.03, ST.pale);
      streak(g, [[-0.02, cy - 0.06, 0.01], [0.03, cy - 0.04, 0.012], [0.1, cy - 0.01, 0.01]], 0.006, 0.022, ST.cloud);
      g.add(M(new THREE.BoxGeometry(0.06, 0.1, 0.07), clay(ST.night), 0, cy, 0));
      star(g, 0.11, ST.star, 0.12, cy, 0, 0.48).rotation.z = -0.25;
      g.scale.setScalar(1.18);
    },
    hoe(g) {
      const top = sH(g, 0.52), hd = new THREE.Group(); hd.position.y = top + 0.01; g.add(hd);
      tail(g, top, -0.02, top - 0.01);
      hd.add(M(new THREE.BoxGeometry(0.08, 0.08, 0.075), clay(ST.night)));
      pickArms(hd, [clay(ST.indigo), clay(ST.vio)], clay(ST.pale));
      star(hd, 0.05, ST.star, 0, 0.07, 0);
      g.scale.setScalar(1.18);
    },
    seed(g) {
      const bag = M(new THREE.SphereGeometry(0.11, 12, 10), clay(ST.vio, { smooth: true }), 0, 0.09, 0); bag.scale.set(1, 1.1, 1); g.add(bag);
      g.add(M(new THREE.CylinderGeometry(0.045, 0.065, 0.05, 10), clay(ST.night), 0, 0.2, 0));
      g.add(M(new THREE.TorusGeometry(0.05, 0.011, 5, 12), clay(ST.star), 0, 0.2, 0).rotateX(Math.PI / 2));
      streak(g, [[-0.1, 0.06, 0.06], [-0.05, 0.12, 0.1], [0.03, 0.13, 0.11]], 0.004, 0.014, ST.pale);
      star(g, 0.03, ST.star, 0.05, 0.13, 0.105);
      star(g, 0.04, ST.star, 0, 0.27, 0);
      g.scale.setScalar(1.25);
    },
    water(g) {
      g.add(M(new THREE.CylinderGeometry(0.11, 0.12, 0.2, 14), clay(ST.vio, { smooth: true }), 0, 0.18, 0));
      g.add(hemi(0.1, clay(ST.night, { smooth: true }), 0, 0.28, 0, 0.4));
      const pts = Array.from({ length: 26 }, (_, i) => { const t = i / 25, a = -1.2 + t * Math.PI * 2.1; return V(Math.cos(a) * 0.125, 0.09 + t * 0.19, Math.sin(a) * 0.125); });
      streak(g, pts, 0.004, 0.018, ST.pale);
      const e = pts[pts.length - 1]; star(g, 0.035, ST.star, e.x, e.y + 0.01, e.z);
      const sp = M(new THREE.CylinderGeometry(0.02, 0.032, 0.22, 8), clay(ST.night), 0.15, 0.26, 0); sp.rotation.z = -0.9; g.add(sp);
      star(g, 0.04, ST.star, 0.25, 0.335, 0).rotation.z = -0.4;
      canHandle(g, ST.night);
      g.scale.setScalar(1.25);
    },
    sickle(g) {
      const top = sH(g, 0.30, 0.034);
      const { bl, tip } = sickleBlade(g, top, [clay(ST.indigo), clay(ST.indigo), clay(ST.vio)], clay(ST.pale), 1.2);
      star(bl, 0.035, ST.star, tip.x, tip.y, 0);
      g.add(M(new THREE.CylinderGeometry(0.032, 0.04, 0.05, 9), clay(ST.night), 0, top - 0.01, 0));
      g.scale.setScalar(1.18);
    },
    shovel(g) {
      const top = sH(g, 0.58), by = top + 0.03;
      g.add(M(new THREE.CylinderGeometry(0.036, 0.044, 0.07, 9), clay(ST.night), 0, top + 0.01, 0));
      g.add(M(ext(roundBlade(0.105, 0.13), 0.03, 0.01, 14), clay(ST.indigo, { smooth: true }), 0, by, 0));
      [-1, 1].forEach(sz => {
        streak(g, [[-0.06, by + 0.04, sz * 0.024], [-0.01, by + 0.09, sz * 0.024], [0.03, by + 0.14, sz * 0.024]], 0.003, 0.012, ST.pale);
        star(g, 0.035, ST.star, 0.035, by + 0.15, sz * 0.022);
      });
      g.scale.setScalar(1.18);
    },
    hammer(g) {
      const top = sH(g, 0.50), y = top - 0.04;
      tail(g, top, -0.02, y - 0.03);
      const head = M(new THREE.CylinderGeometry(0.055, 0.055, 0.17, 12), clay(ST.night, { smooth: true }), 0, y, 0); head.rotation.z = Math.PI / 2; g.add(head);
      [-1, 1].forEach(sx => { star(g, 0.06, ST.star, sx * 0.095, y, 0).rotation.y = Math.PI / 2; });
      g.scale.setScalar(1.18);
    },
    rod(g) {
      X.rodFrame(g, { knobFn: g => g.add(M(new THREE.SphereGeometry(0.042, 8, 6), clay(ST.navy, { smooth: true }), 0, -0.1, 0)), rear: clay(ST.night), line: 0xc9d0f0, pole: (p, L) => {
        p.add(M(new THREE.CylinderGeometry(0.013, 0.026, L, 7), clay(ST.vio), 0, L / 2, 0));
        streak(p, Array.from({ length: 30 }, (_, i) => { const t = i / 29, a = t * Math.PI * 5, r = 0.03 - t * 0.014; return V(Math.cos(a) * r, L * (0.12 + t * 0.55), Math.sin(a) * r); }), 0.004, 0.011, ST.pale);
      } }, b => { streak(b, [[0, 0.07, 0], [0.004, 0.035, 0], [0, 0.0, 0]], 0.003, 0.018, ST.pale); star(b, 0.04, ST.star, 0, -0.01, 0); });
    },
    net(g) {
      g.add(M(new THREE.CylinderGeometry(0.024, 0.028, 0.66, 7), clay(ST.vio), 0, 0.27, 0));
      g.add(M(new THREE.SphereGeometry(0.04, 8, 6), clay(ST.navy, { smooth: true }), 0, -0.08, 0));
      g.add(M(new THREE.TorusGeometry(0.17, 0.02, 6, 20), clay(ST.pale), 0, 0.6, 0).rotateX(Math.PI / 2));
      g.add(M(new THREE.ConeGeometry(0.16, 0.3, 12, 1, true), netBag(ST.indigo, 0.5), 0, 0.75, 0));
      streak(g, [[-0.12, 0.6, 0.12], [-0.02, 0.6, 0.17], [0.06, 0.6, 0.17]], 0.004, 0.016, ST.cloud);
      star(g, 0.045, ST.star, 0.09, 0.6, 0.17);
      g.scale.setScalar(1.25);
    },
  } };
}

export const STARRY_UMBRELLA = Object.freeze({ N: 8, R: 1.05, th: 0.88, overlap: 1, shape: { w: () => 1, tip: 0.04 } });

export function starryUmbrellaLook(THREE, K, X, { root, L, def, jHook }) {
  const { clay, M, V } = K, { streak, star } = starryKit(THREE, K, X);
  const onGore = (h, th, ph, r, col) => { const { p, n } = X.goreSurf(def.R * 1.006, th, ph); const s = M(X.puffStar(r, 0.48), clay(col), p.x, p.y, p.z); s.quaternion.setFromUnitVectors(V(0, 0, 1), n); h.add(s); };
  return {
    outer: k => clay(k % 2 ? ST.vio : ST.night), inner: () => clay(ST.indigo, { side: THREE.BackSide, lift: 0.3 }),
    shaft() {
      root.add(M(new THREE.CylinderGeometry(0.022, 0.027, L, 7), clay(ST.vio), 0, L / 2, 0));
      streak(root, Array.from({ length: 30 }, (_, i) => { const t = i / 29, a = t * Math.PI * 4; return V(Math.cos(a) * 0.04, L * (0.15 + t * 0.6), Math.sin(a) * 0.04); }), 0.005, 0.016, ST.pale);
      jHook(clay(ST.night), 0.07);
    },
    deco(h, k) {
      onGore(h, [0.45, 0.65, 0.35, 0.55][k % 4], [0.1, -0.12, 0.0, 0.14][k % 4], [0.06, 0.04, 0.05, 0.035][k % 4], ST.star);
      const q = X.goreSurf(def.R, def.th * 0.98, 0).p; h.add(M(new THREE.SphereGeometry(0.024, 8, 6), clay(ST.pale), q.x, q.y, q.z));
    },
    finial(c) { star(c, 0.07, ST.star, 0, 0.09, 0); c.add(M(new THREE.CylinderGeometry(0.012, 0.02, 0.05, 6), clay(ST.night), 0, 0.02, 0)); },
  };
}
