import { critterKit, critterTools, critterUmbrellaLook } from './tool-skins-critter-kit.js';

export const SP = Object.freeze({
  skin: 0x8a3a5a, skinD: 0x6a2a44, skinL: 0xa45070, flesh: 0xf0b040, caramel: 0xb8642a,
  steam: 0xd0d4d8, paper: 0xd8ccb0, wood: 0xa87a52,
});

function potatoKit(THREE, K, X) {
  const { clay, M, ext } = K;
  const C = critterKit(THREE, K, X), { V3, grp, sph, dot, stick, tube } = C, P = SP;
  const prof = (R, t) => R * Math.pow(Math.max(0, Math.sin(Math.PI * t)), 0.62) * (1 + 0.14 * (t - 0.5));

  function potato(p, R, L, x, y, z, o = {}) {
    const g = grp(p, x, y, z), n = 10, seg = R < 0.05 ? 10 : 12;
    const pts = Array.from({ length: n + 1 }, (_, i) => new THREE.Vector2(Math.max(prof(R, i / n), 0.0005), (i / n - 0.5) * L));
    const geo = new THREE.LatheGeometry(pts, seg); geo.rotateZ(-Math.PI / 2);
    g.add(new THREE.Mesh(geo, clay(P.skin, { smooth: true })));
    const hit = (t, a) => { const r = prof(R, t); return { p: V3((t - 0.5) * L, r * Math.cos(a), r * Math.sin(a)), n: V3(0, Math.cos(a), Math.sin(a)) }; };
    tube(g, [V3(-0.5 * L, 0, 0), V3(-0.5 * L - 0.1 * R, 0.05 * R, 0), V3(-0.5 * L - 0.25 * R, 0.18 * R, 0)], 0.05 * R, P.skinD, 5, false);
    (o.spots ?? [[0.3, 0.4], [0.62, -0.6], [0.45, 2.4], [0.72, 1.4], [0.22, -2.2]]).forEach(([t, a]) => stick(g, dot(g, 0.07 * R, P.skinD, 0, 0, 0, [1.6, 0.8, 0.35]), hit(t, a), 0));
    sph(g, 1, P.flesh, 0, prof(R, 0.5) * 0.8, 0, [0.36 * L, 0.18 * R, 0.5 * R], 12, 0.12);
    [[-0.18, 0.15], [0.05, -0.2], [0.2, 0.12]].forEach(([u, v]) => dot(g, 0.1 * R, P.caramel, u * L, prof(R, 0.5) * 0.96, v * R, [1, 0.35, 1]));
    [-1, 1].forEach(s => tube(g, [-0.32, -0.1, 0.12, 0.32].map(u => V3(u * L, prof(R, 0.5 + u) * 0.86, s * 0.46 * R * Math.cos(u * 2.6))), 0.07 * R, P.skinL, 8, false));
    return g;
  }
  function steam(p, r, x, y, z, k = 1) {
    const g = grp(p, x, y, z);
    [[0, 0, 1], [0.6, 1.3, 0.8], [-0.1, 2.4, 0.62], [0.5, 3.3, 0.45]].slice(0, 2 + k).forEach(([dx, dy, s]) => sph(g, r * s, P.steam, dx * r, dy * r, 0, [1, 0.9, 0.9], 8, 0.35));
    return g;
  }
  function sliceShape(s) {
    const sh = new THREE.Shape();
    sh.moveTo(0, -0.045 * s); sh.quadraticCurveTo(0.09 * s, -0.06 * s, 0.16 * s, -0.115 * s);
    sh.quadraticCurveTo(0.25 * s, 0, 0.16 * s, 0.115 * s); sh.quadraticCurveTo(0.09 * s, 0.06 * s, 0, 0.045 * s); sh.closePath();
    return sh;
  }
  function slice(p, x, y, z) {
    const g = grp(p, x, y, z);
    g.add(M(ext(sliceShape(1), 0.05, 0.012, 8), clay(P.skin, { smooth: true })));
    g.add(M(ext(sliceShape(0.86), 0.064, 0.006, 8), clay(P.flesh, { smooth: true, lift: 0.12 }), 0.022, 0, 0));
    [[0.1, 0.03], [0.15, -0.04], [0.18, 0.05], [0.07, -0.01]].forEach(([u, v]) => [-1, 1].forEach(s => dot(g, 0.012, P.caramel, u, v, s * 0.038, [1, 1, 0.35])));
    return g;
  }
  return { C, potato, steam, slice };
}

function potatoSpec(THREE, K, X) {
  const F = potatoKit(THREE, K, X), P = SP;
  return {
    C: F.C,
    h: { wood: P.wood, grip: P.skinD, knob: P.skin, bands: [[P.flesh, 0.62]] }, a: P.skin, b: P.skinD, edge: P.flesh, mount: P.skinD, bag: P.skin, net: P.paper, band: P.flesh,
    motif: (p, r, x, y, z) => { F.potato(p, r * 0.62, r * 2.1, x, y, z); F.steam(p, r * 0.22, x, y + r * 0.55, z, 1); },
    axe(g, cy) { F.slice(g, 0.015, cy - 0.01, 0); F.steam(g, 0.025, 0.17, cy + 0.1, 0, 2); },
    water(g, { spout, canHandle }) {
      F.potato(g, 0.12, 0.36, 0.0, 0.13, 0, { spots: [[0.25, 1.4], [0.7, 1.8], [0.4, -1.2], [0.6, -1.6]] });
      F.steam(g, 0.028, 0.07, 0.25, 0, 2);
      spout(g, P.skin, P.flesh, 0.17, 0.17); canHandle(g, P.skinD, -0.18, 0.15);
    },
    umb: {
      outer: k => k % 2 ? P.flesh : P.skin, inner: P.flesh, rim: P.skinD,
      deco: (h, k, onGore) => { if (k % 2) [[0.4, 0.08], [0.6, -0.1], [0.8, 0.08]].forEach(([th, ph]) => onGore(h, th, ph, g => F.C.dot(g, 0.03, P.caramel, 0, 0, 0.004, [1, 1, 0.35]))); },
      finial: c => { F.potato(c, 0.1, 0.3, 0, 0.09, 0); F.steam(c, 0.03, 0, 0.2, 0, 1); },
    },
  };
}

export function sweetpotatoThemes(THREE, K, X) {
  const D = potatoSpec(THREE, K, X);
  return { sweetpotato: critterTools(THREE, K, X, D.C, D) };
}

export const SWEETPOTATO_UMBRELLA = Object.freeze({ N: 8, R: 1.0, th: 1.0, overlap: 1, shape: { w: () => 1, tip: 0.04 } });

export function sweetpotatoUmbrellaLook(THREE, K, X, ctx) {
  return critterUmbrellaLook(THREE, K, X, ctx, potatoSpec(THREE, K, X));
}
