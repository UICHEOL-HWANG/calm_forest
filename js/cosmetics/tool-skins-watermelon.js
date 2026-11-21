export const WM = Object.freeze({ rind: 0x3e9a48, rindD: 0x22602c, rindL: 0xb8dc98, flesh: 0xf0505a, fleshD: 0xc83a48, seed: 0x2a1c1c });

export function watermelonKit(THREE, K) {
  const { clay, M, ext } = K;
  const sph = (p, r, col, x, y, z, s = [1, 1, 1], smooth = true, ws = 12) => { const m = M(new THREE.SphereGeometry(r, ws, Math.max(6, ws * 0.75 | 0)), clay(col, { smooth }), x, y, z); m.scale.set(...s); p.add(m); return m; };
  function sector(r0, r1, a0, a1) {
    const s = new THREE.Shape();
    s.moveTo(Math.cos(a0) * r0, Math.sin(a0) * r0); s.absarc(0, 0, r1, a0, a1, false);
    if (r0 > 0) s.absarc(0, 0, r0, a1, a0, true); else s.lineTo(0, 0);
    s.closePath(); return s;
  }
  function seeds(g, pts, r, zf, zb) {
    pts.forEach(([sx, sy, rot]) => [zf, zb].forEach(z => { if (z == null) return; const sd = sph(g, r, WM.seed, sx, sy, z, [0.6, 1, 0.35], true, 6); sd.rotation.z = rot; }));
  }
  function wedge(p, R, x, y, z, o = {}) {
    const g = new THREE.Group(); g.position.set(x, y, z); p.add(g);
    const a0 = o.a0 ?? -0.55, a1 = o.a1 ?? 0.55, d = o.d ?? R * 0.28;
    g.add(M(ext(sector(0, R, a0, a1), d, R * 0.035, 12), clay(WM.rind, { smooth: true })));
    g.add(M(ext(sector(0, R * 0.9, a0 + 0.015, a1 - 0.015), d + R * 0.05, 0, 12), clay(WM.rindL)));
    g.add(M(ext(sector(0, R * 0.82, a0 + 0.03, a1 - 0.03), d + R * 0.09, 0, 12), clay(WM.flesh, { smooth: true })));
    const zf = d / 2 + R * 0.045, mid = (a0 + a1) / 2, sp = (a1 - a0) * 0.28;
    const pts = [[0.42, 0], [0.62, -sp], [0.62, sp], [0.7, 0], [0.5, -sp * 1.4], [0.5, sp * 1.4]].slice(0, o.seeds ?? 5).map(([rr, da]) => [Math.cos(mid + da) * R * rr, Math.sin(mid + da) * R * rr, mid + da - Math.PI / 2]);
    seeds(g, pts, R * 0.045, zf, -zf);
    return g;
  }
  return { sph, wedge };
}

export function watermelonThemes(THREE, K, X) {
  const { clay, M, ext } = K;
  const { roundBlade, pickArms, sickleBlade, netBag } = X;
  const T = watermelonKit(THREE, K);
  const UP = Math.PI / 2;
  const motif = (p, r, x, y, z) => T.wedge(p, r * 1.6, x, y - r * 0.7, z, { a0: UP - 0.5, a1: UP + 0.5, d: r * 0.4, seeds: 3 });
  const H = (g, l, r = 0.03) => X.handle(g, { wood: WM.rindL, grip: WM.rind, knob: WM.flesh, bands: [[WM.flesh, 0.62]] }, l, r);
  const canHandle = (g, col, x = -0.17) => g.add(M(new THREE.TorusGeometry(0.075, 0.015, 5, 12, Math.PI * 1.05), clay(col), x, 0.2, 0).rotateZ(Math.PI / 2 + 0.25));
  const spout = (g, col) => { const sp = M(new THREE.CylinderGeometry(0.02, 0.032, 0.22, 8), clay(col), 0.17, 0.25, 0); sp.rotation.z = -0.9; g.add(sp); };
  return { watermelon: {
    axe(g) {
      const top = H(g, 0.52), cy = top - 0.05;
      g.add(M(new THREE.BoxGeometry(0.06, 0.1, 0.07), clay(WM.rind), 0, cy, 0));
      T.wedge(g, 0.2, 0.01, cy, 0, { a0: -0.6, a1: 0.6, d: 0.036, seeds: 6 });
      g.scale.setScalar(1.18);
    },
    hoe(g) {
      const top = H(g, 0.52), hd = new THREE.Group(); hd.position.y = top + 0.01; g.add(hd);
      hd.add(M(new THREE.BoxGeometry(0.08, 0.08, 0.075), clay(WM.rind)));
      pickArms(hd, [clay(WM.flesh), clay(WM.fleshD)], clay(WM.rind));
      motif(hd, 0.05, 0, 0.085, 0);
      g.scale.setScalar(1.18);
    },
    seed(g) {
      T.sph(g, 0.11, WM.flesh, 0, 0.09, 0, [1, 1.05, 1], true, 14);
      g.add(M(new THREE.CylinderGeometry(0.045, 0.065, 0.05, 10), clay(WM.rind), 0, 0.2, 0));
      g.add(M(new THREE.TorusGeometry(0.05, 0.011, 5, 12), clay(WM.rind), 0, 0.2, 0).rotateX(Math.PI / 2));
      motif(g, 0.065, 0, 0.09, 0.075);
      g.scale.setScalar(1.25);
    },
    water(g) {
      g.add(M(new THREE.CylinderGeometry(0.118, 0.122, 0.2, 18), clay(WM.flesh, { smooth: true }), 0, 0.18, 0));
      g.add(M(new THREE.CylinderGeometry(0.126, 0.128, 0.05, 18), clay(WM.rind, { smooth: true }), 0, 0.085, 0));
      g.add(M(new THREE.CylinderGeometry(0.124, 0.124, 0.014, 18), clay(WM.rindL), 0, 0.117, 0));
      for (let i = 0; i < 9; i++) {
        const a = i * 0.7 - 1.2, yy = 0.16 + (i % 3) * 0.045;
        if (Math.cos(a) < -0.55) continue;
        const sd = T.sph(g, 0.012, WM.seed, Math.cos(a) * 0.12, yy, Math.sin(a) * 0.12, [0.6, 1, 0.35], true, 6); sd.rotation.y = UP - a;
      }
      T.wedge(g, 0.11, 0, 0.27, 0, { a0: UP - 0.5, a1: UP + 0.5, d: 0.03, seeds: 4 });
      spout(g, WM.rind);
      canHandle(g, WM.rind);
      g.scale.setScalar(1.25);
    },
    sickle(g) {
      const top = H(g, 0.30, 0.034);
      const { bl, tip } = sickleBlade(g, top, [clay(WM.flesh), clay(WM.flesh), clay(WM.fleshD)], clay(WM.rind), 1.2);
      motif(bl, 0.04, tip.x, tip.y + 0.01, 0);
      g.add(M(new THREE.CylinderGeometry(0.032, 0.04, 0.05, 9), clay(WM.rind), 0, top - 0.01, 0));
      g.scale.setScalar(1.18);
    },
    shovel(g) {
      const top = H(g, 0.58), by = top + 0.03;
      g.add(M(new THREE.CylinderGeometry(0.036, 0.044, 0.07, 9), clay(WM.rind), 0, top + 0.01, 0));
      g.add(M(ext(roundBlade(0.105, 0.13), 0.03, 0.01, 14), clay(WM.flesh, { smooth: true }), 0, by, 0));
      motif(g, 0.06, 0, by + 0.12, 0.03);
      g.scale.setScalar(1.18);
    },
    hammer(g) {
      const top = H(g, 0.50), y = top - 0.04;
      const head = M(new THREE.CylinderGeometry(0.05, 0.05, 0.15, 12), clay(WM.fleshD, { smooth: true }), 0, y, 0); head.rotation.z = Math.PI / 2; g.add(head);
      [-1, 1].forEach(sx => motif(g, 0.058, sx * 0.1, y, 0));
      g.scale.setScalar(1.18);
    },
    rod(g) {
      X.rodFrame(g, { knobFn: g => g.add(M(new THREE.SphereGeometry(0.042, 8, 6), clay(WM.flesh, { smooth: true }), 0, -0.1, 0)), rear: clay(WM.rind), line: 0xe8dcd0, pole: (p, L) => {
        p.add(M(new THREE.CylinderGeometry(0.013, 0.026, L, 7), clay(WM.rindL), 0, L / 2, 0));
        [0.25, 0.45, 0.65, 0.85].forEach(f => p.add(M(new THREE.CylinderGeometry(0.027 - f * 0.013, 0.027 - f * 0.013, 0.02, 8), clay(WM.flesh), 0, L * f, 0)));
      } }, b => T.wedge(b, 0.085, 0, 0.03, 0, { a0: -UP - 0.5, a1: -UP + 0.5, d: 0.022, seeds: 3 }));
    },
    net(g) {
      g.add(M(new THREE.CylinderGeometry(0.024, 0.028, 0.66, 7), clay(WM.rindL), 0, 0.27, 0));
      g.add(M(new THREE.SphereGeometry(0.04, 8, 6), clay(WM.flesh, { smooth: true }), 0, -0.08, 0));
      g.add(M(new THREE.TorusGeometry(0.17, 0.02, 6, 20), clay(WM.flesh), 0, 0.6, 0).rotateX(Math.PI / 2));
      g.add(M(new THREE.ConeGeometry(0.16, 0.3, 12, 1, true), netBag(WM.rindL, 0.5), 0, 0.75, 0));
      motif(g, 0.05, 0, 0.62, 0.17);
      g.scale.setScalar(1.25);
    },
  } };
}

export const WATERMELON_UMBRELLA = Object.freeze({ N: 8, R: 1.0, th: 0.95, overlap: 1, shape: { w: () => 1, tip: 0.02 } });

export function watermelonUmbrellaLook(THREE, K, X, { root, L, def, jHook }) {
  const { clay, M, V } = K, T = watermelonKit(THREE, K);
  const rim = (c, col, r) => c.add(M(new THREE.TorusGeometry(def.R * Math.sin(def.th) * 0.995, r, 6, 40), clay(col), 0, (Math.cos(def.th) - 1) * def.R, 0).rotateX(Math.PI / 2));
  return {
    outer: () => clay(WM.flesh, { smooth: true }), inner: () => clay(WM.rindL, { side: THREE.BackSide, lift: 0.3 }),
    shaft() {
      root.add(M(new THREE.CylinderGeometry(0.022, 0.027, L, 7), clay(WM.rindL), 0, L / 2, 0));
      jHook(clay(WM.flesh), 0.07);
    },
    deco(h, k) {
      [[0.4, 0.1 * (k % 2 ? 1 : -1)], [0.72, -0.12], [0.72, 0.12]].forEach(([th, ph]) => {
        const { p, n } = X.goreSurf(def.R * 1.004, th, ph), g = new THREE.Group(); g.position.copy(p); g.quaternion.setFromUnitVectors(V(0, 0, 1), n); h.add(g);
        T.sph(g, 0.035, WM.seed, 0, 0, 0, [0.6, 1, 0.35], true, 8);
      });
    },
    finial(c) { rim(c, WM.rind, 0.05); rim(c, WM.rindL, 0.025); T.sph(c, 0.08, WM.rind, 0, 0, 0, [1, 0.5, 1], true, 14); },
  };
}
