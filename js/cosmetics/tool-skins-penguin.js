export const PG = Object.freeze({ navy: 0x2a3348, navyL: 0x45537a, belly: 0xd0d6de, beak: 0xf0a030, feet: 0xe88a34, blush: 0xf0a0b0, ink: 0x1c1f28, ice: 0x8ccde0 });

const BLADE = [[0.02, -0.045], [0.14, -0.095], [0.19, -0.105], [0.205, 0], [0.19, 0.105], [0.14, 0.095], [0.02, 0.045]];
const EDGE = [[0.18, -0.108], [0.205, -0.112], [0.222, 0], [0.205, 0.112], [0.18, 0.108], [0.198, 0]];

export function penguinKit(THREE, K, X) {
  const { clay, M } = K;
  const { small } = X;
  const sph = (p, r, col, x, y, z, s = [1, 1, 1], smooth = true, ws = 12) => { const m = M(new THREE.SphereGeometry(r, ws, Math.max(6, ws * 0.75 | 0)), clay(col, { smooth }), x, y, z); m.scale.set(...s); p.add(m); return m; };
  function beak(p, r, x, y, z, s = 1) { const b = M(new THREE.ConeGeometry(r, r * 2, 8), clay(PG.beak), x, y, z); b.rotation.x = s * Math.PI / 2; p.add(b); return b; }
  function pHead(p, R, x, y, z) {
    const g = new THREE.Group(); g.position.set(x, y, z); p.add(g);
    sph(g, R, PG.navy, 0, 0, 0, [1, 1, 1], true, 16);
    [-1, 1].forEach(sx => sph(g, R * 0.62, PG.belly, sx * R * 0.27, 0, R * 0.42, [1, 1, 1], true, 12));
    [-1, 1].forEach(sx => {
      g.add(small(M(new THREE.SphereGeometry(R * 0.12, 8, 6), clay(PG.ink, { smooth: true }), sx * R * 0.28, R * 0.08, R)));
      g.add(small(M(new THREE.SphereGeometry(R * 0.04, 5, 4), clay(PG.belly), sx * R * 0.25, R * 0.13, R * 1.1)));
      sph(g, R * 0.11, PG.blush, sx * R * 0.5, -R * 0.2, R * 0.92, [1, 0.7, 0.4], true, 8);
    });
    beak(g, R * 0.15, 0, -R * 0.13, R * 1.08);
    return g;
  }
  function flatFace(p, r, x, y, zs, s) {
    [[-0.3, 0.06, 0.52], [0.3, 0.06, 0.52], [0, -0.28, 0.5]].forEach(([dx, dy, rr]) => {
      const d = M(new THREE.CylinderGeometry(r * rr, r * rr, 0.006, 20), clay(PG.belly, { smooth: true }), x + dx * r, y + dy * r, zs + s * 0.003); d.rotation.x = Math.PI / 2; p.add(d);
    });
    [-1, 1].forEach(sx => {
      sph(p, r * 0.13, PG.ink, x + sx * r * 0.3, y + r * 0.1, zs + s * 0.008, [1, 1, 0.6], true, 8);
      sph(p, r * 0.11, PG.blush, x + sx * r * 0.62, y - r * 0.2, zs + s * 0.007, [1, 0.7, 0.3], true, 8);
    });
    beak(p, r * 0.17, x, y - r * 0.12, zs + s * r * 0.18, s);
  }
  return { sph, beak, pHead, flatFace };
}

export function penguinThemes(THREE, K, X) {
  const { clay, M, ext } = K;
  const { polyShape, roundBlade, pickArms, sickleBlade, netBag } = X;
  const T = penguinKit(THREE, K, X);
  const H = (g, l, r = 0.03) => X.handle(g, { wood: PG.navy, grip: PG.ink, knob: PG.beak, bands: [[PG.belly, 0.62]] }, l, r);
  const canHandle = (g, col, x = -0.16) => g.add(M(new THREE.TorusGeometry(0.075, 0.015, 5, 12, Math.PI * 1.05), clay(col), x, 0.2, 0).rotateZ(Math.PI / 2 + 0.25));
  const spout = (g, col) => { const sp = M(new THREE.CylinderGeometry(0.02, 0.032, 0.22, 8), clay(col), 0.16, 0.25, 0); sp.rotation.z = -0.9; g.add(sp); };
  return { penguin: {
    axe(g) {
      const top = H(g, 0.52), cy = top - 0.05;
      g.add(M(new THREE.BoxGeometry(0.06, 0.11, 0.07), clay(PG.ink), 0, cy, 0));
      g.add(M(ext(polyShape(BLADE), 0.04, 0.01, 2), clay(PG.navy, { smooth: true }), 0, cy, 0));
      g.add(M(ext(polyShape(EDGE), 0.034, 0.006, 2), clay(PG.ice), 0, cy, 0));
      [-1, 1].forEach(s => T.flatFace(g, 0.1, 0.112, cy, s * 0.03, s));
      g.scale.setScalar(1.18);
    },
    hoe(g) {
      const top = H(g, 0.52), hd = new THREE.Group(); hd.position.y = top + 0.01; g.add(hd);
      hd.add(M(new THREE.BoxGeometry(0.08, 0.08, 0.075), clay(PG.ink)));
      pickArms(hd, [clay(PG.navy), clay(PG.navyL)], clay(PG.ice));
      T.pHead(hd, 0.05, 0, 0.085, 0);
      g.scale.setScalar(1.18);
    },
    seed(g) {
      T.sph(g, 0.11, PG.belly, 0, 0.09, 0, [1, 1.05, 1], true, 14);
      g.add(M(new THREE.CylinderGeometry(0.045, 0.065, 0.05, 10), clay(PG.ink), 0, 0.2, 0));
      g.add(M(new THREE.TorusGeometry(0.05, 0.011, 5, 12), clay(PG.ice), 0, 0.2, 0).rotateX(Math.PI / 2));
      T.pHead(g, 0.065, 0, 0.09, 0.075);
      g.scale.setScalar(1.25);
    },
    water(g) {
      T.sph(g, 0.14, PG.navy, 0, 0.17, 0, [1, 1.1, 1], true, 18);
      T.sph(g, 0.115, PG.belly, 0, 0.13, 0.05, [1, 1, 1], true, 16);
      [-1, 1].forEach(sx => T.sph(g, 0.056, PG.belly, sx * 0.045, 0.255, 0.085, [1, 1, 1], true, 10));
      [-1, 1].forEach(sx => {
        g.add(M(new THREE.SphereGeometry(0.017, 8, 6), clay(PG.ink, { smooth: true }), sx * 0.046, 0.265, 0.138));
        T.sph(g, 0.016, PG.blush, sx * 0.088, 0.228, 0.118, [1, 0.7, 0.4], true, 8);
        T.sph(g, 0.035, PG.feet, sx * 0.05, 0.02, 0.09, [1, 0.35, 1.5], true, 8);
      });
      T.beak(g, 0.022, 0, 0.235, 0.155);
      spout(g, PG.beak);
      canHandle(g, PG.navy);
      g.scale.setScalar(1.25);
    },
    sickle(g) {
      const top = H(g, 0.30, 0.034);
      const { bl, tip } = sickleBlade(g, top, [clay(PG.navy), clay(PG.navy), clay(PG.navyL)], clay(PG.ice), 1.2);
      T.pHead(bl, 0.04, tip.x, tip.y + 0.01, 0);
      g.add(M(new THREE.CylinderGeometry(0.032, 0.04, 0.05, 9), clay(PG.ink), 0, top - 0.01, 0));
      g.scale.setScalar(1.18);
    },
    shovel(g) {
      const top = H(g, 0.58), by = top + 0.03;
      g.add(M(new THREE.CylinderGeometry(0.036, 0.044, 0.07, 9), clay(PG.ink), 0, top + 0.01, 0));
      g.add(M(ext(roundBlade(0.105, 0.13), 0.03, 0.01, 14), clay(PG.navy, { smooth: true }), 0, by, 0));
      T.pHead(g, 0.06, 0, by + 0.12, 0.03);
      g.scale.setScalar(1.18);
    },
    hammer(g) {
      const top = H(g, 0.50), y = top - 0.04;
      const head = M(new THREE.CylinderGeometry(0.05, 0.05, 0.15, 12), clay(PG.navyL, { smooth: true }), 0, y, 0); head.rotation.z = Math.PI / 2; g.add(head);
      [-1, 1].forEach(sx => T.pHead(g, 0.058, sx * 0.1, y, 0));
      g.scale.setScalar(1.18);
    },
    rod(g) {
      X.rodFrame(g, { knobFn: g => g.add(M(new THREE.SphereGeometry(0.042, 8, 6), clay(PG.beak, { smooth: true }), 0, -0.1, 0)), rear: clay(PG.navy), line: 0xd0d6de, pole: (p, L) => {
        p.add(M(new THREE.CylinderGeometry(0.013, 0.026, L, 7), clay(PG.navy), 0, L / 2, 0));
        [0.3, 0.55, 0.8].forEach(f => p.add(M(new THREE.CylinderGeometry(0.027 - f * 0.013, 0.027 - f * 0.013, 0.02, 8), clay(PG.belly), 0, L * f, 0)));
      } }, b => T.pHead(b, 0.06, 0, -0.02, 0));
    },
    net(g) {
      g.add(M(new THREE.CylinderGeometry(0.024, 0.028, 0.66, 7), clay(PG.navy), 0, 0.27, 0));
      g.add(M(new THREE.SphereGeometry(0.04, 8, 6), clay(PG.beak, { smooth: true }), 0, -0.08, 0));
      g.add(M(new THREE.TorusGeometry(0.17, 0.02, 6, 20), clay(PG.navy), 0, 0.6, 0).rotateX(Math.PI / 2));
      g.add(M(new THREE.ConeGeometry(0.16, 0.3, 12, 1, true), netBag(PG.navyL, 0.5), 0, 0.75, 0));
      T.pHead(g, 0.05, 0, 0.62, 0.17);
      g.scale.setScalar(1.25);
    },
  } };
}

export const PENGUIN_UMBRELLA = Object.freeze({ N: 8, R: 1.0, th: 0.95, overlap: 1, shape: { w: () => 1, tip: 0.03 } });

export function penguinUmbrellaLook(THREE, K, X, { root, L, def, jHook }) {
  const { clay, M, V } = K, T = penguinKit(THREE, K, X);
  return {
    outer: k => clay(k % 2 ? PG.belly : PG.navy, { smooth: true }), inner: () => clay(PG.navyL, { side: THREE.BackSide, lift: 0.3 }),
    shaft() {
      root.add(M(new THREE.CylinderGeometry(0.022, 0.027, L, 7), clay(PG.navy), 0, L / 2, 0));
      jHook(clay(PG.beak), 0.07);
    },
    deco(h, k) {
      if (k % 2) return;
      const { p, n } = X.goreSurf(def.R * 1.004, 0.6, 0), g = new THREE.Group(); g.position.copy(p); g.quaternion.setFromUnitVectors(V(0, 0, 1), n); h.add(g);
      T.sph(g, 0.05, PG.beak, 0, 0, 0, [1, 1, 0.4], true, 8);
    },
    finial(c) { T.pHead(c, 0.12, 0, 0.1, 0); },
  };
}
