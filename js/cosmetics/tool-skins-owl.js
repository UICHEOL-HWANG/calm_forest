import { critterKit, critterTools, critterUmbrellaLook } from './tool-skins-critter-kit.js';

export const OW = Object.freeze({
  body: 0x9a6a44, bodyD: 0x6e4a30, wing: 0x7e5636, wingD: 0x5a3c26, disc: 0xe4d0aa, discD: 0xc4a27a,
  tuft: 0x6e4a30, iris: 0xf0b040, ink: 0x2b2f36, hi: 0xd2d9de, beak: 0xd08a3c, cheek: 0xf09aa6, wood: 0xa87a52,
});

function owlKit(THREE, K, X) {
  const { clay, M } = K;
  const C = critterKit(THREE, K, X), { grp, sph, dot, surf, stick, tube, eye } = C, P = OW;

  function scallops(g, S, R, rows, s, col, lift) {
    rows.forEach(([y, xs]) => xs.forEach(x => {
      const pts = [-1, 0, 1].map(t => { const h = S((x + t * 0.08) * R, (y - 0.05 * (1 - t * t)) * R, s); return h && h.p.clone().addScaledVector(h.n, lift * R); }).filter(Boolean);
      if (pts.length > 2) tube(g, pts, 0.018 * R, col, 6, false);
    }));
  }
  function owlHead(p, R, x, y, z, o = {}) {
    const g = grp(p, x, y, z);
    const ax = [(o.wx ?? 1.1) * R, (o.hy ?? 0.95) * R, (o.sz ?? 0.9) * R], ws = R < 0.07 ? 12 : 18;
    sph(g, 1, P.body, 0, 0, 0, ax, ws);
    const S = surf(ax), sides = o.both ? [1, -1] : [1], fy = (o.fy ?? 0) * R;
    sides.forEach(s => {
      [-1, 1].forEach(sx => {
        const h = S(sx * 0.4 * R, 0.06 * R + fy, s);
        stick(g, M(new THREE.SphereGeometry(0.46 * R, 12, 8), clay(P.disc, { smooth: true })), h, -0.1 * R).scale.set(1, 1.06, 0.34);
        eye(g, 0.29 * R, { p: h.p.clone().addScaledVector(h.n, 0.05 * R), n: h.n }, P, { ring: P.iris });
        const c = S(sx * 0.7 * R, -0.3 * R + fy, s);
        if (c) stick(g, M(new THREE.SphereGeometry(0.11 * R, 8, 6), clay(P.cheek, { smooth: true })), c, -0.01 * R).scale.set(1, 0.66, 0.34);
      });
      const b = S(0, -0.14 * R + fy, s);
      const bk = M(new THREE.ConeGeometry(0.09 * R, 0.22 * R, 6), clay(P.beak, { smooth: true }));
      bk.position.copy(b.p).addScaledVector(b.n, 0.07 * R); bk.rotation.x = Math.PI - 0.4 * s; g.add(bk);
      if (o.belly) {
        const bh = S(0, -0.55 * R, s);
        stick(g, M(new THREE.SphereGeometry(0.5 * R, 12, 8), clay(P.disc, { smooth: true })), bh, -0.12 * R).scale.set(1.1, 0.8, 0.34);
        scallops(g, S, R, [[-0.42, [-0.2, 0, 0.2]], [-0.58, [-0.3, -0.1, 0.1, 0.3]], [-0.74, [-0.2, 0, 0.2]]], s, P.discD, 0.06);
      }
    });
    const tk = o.tuft ?? 1.25;
    [-1, 1].forEach(sx => {
      const t = M(new THREE.ConeGeometry(0.26 * R * tk, 0.46 * R * tk, 6), clay(P.tuft, { smooth: true }), sx * 0.58 * ax[0] / 1.1, 0.74 * ax[1] / 0.95, 0);
      t.scale.z = 0.6; t.rotation.z = -sx * 0.55; g.add(t);
    });
    if (o.wings) [-1, 1].forEach(sx => {
      const w = sph(g, 1, P.wing, sx * 0.95 * ax[0], -0.22 * R, -0.12 * R, [0.2 * R, 0.55 * R, 0.5 * R], 12); w.rotation.z = sx * 0.18;
      [-0.18, 0, 0.18].forEach(dz => dot(g, 0.08 * R, P.wingD, sx * 1.0 * ax[0], -0.7 * R, (dz - 0.1) * R, [0.6, 1, 0.8]));
    });
    if (o.feet) [-1, 1].forEach(sx => [-1, 0, 1].forEach(i => dot(g, 0.065 * R, P.beak, sx * 0.3 * R + i * 0.08 * R, -ax[1] * 0.96, ax[2] * 0.42 + (1 - Math.abs(i)) * 0.04 * R, [0.8, 0.55, 1.4])));
    return g;
  }
  return { C, owlHead };
}

function owlSpec(THREE, K, X) {
  const { C, owlHead } = owlKit(THREE, K, X), P = OW;
  const head = (p, r, x, y, z, o = {}) => owlHead(p, r, x, y, z, { sz: 0.9, ...o });
  return {
    C,
    h: { wood: P.wood, grip: P.bodyD, knob: P.body, bands: [[P.disc, 0.62]] }, a: P.body, b: P.bodyD, edge: P.disc, mount: P.bodyD, bag: P.body, net: P.disc,
    motif: head,
    axe: (g, cy) => head(g, 0.1, 0.13, cy - 0.01, 0, { both: true, sz: 0.6 }),
    water(g, { spout, canHandle }) {
      head(g, 0.13, 0.02, 0.15, 0, { sz: 0.95, wx: 1.0, hy: 1.02, fy: 0.2, belly: true, wings: true, feet: true });
      spout(g, P.body, P.bodyD, 0.17, 0.2); canHandle(g, P.bodyD, -0.165, 0.16);
    },
    umb: {
      outer: k => k % 2 ? P.disc : P.body, inner: P.disc, rim: P.bodyD,
      deco: (h, k, onGore) => { if (k % 2 === 0) [0.38, 0.58, 0.78].forEach(th => onGore(h, th, 0, g => C.tube(g, [-1, 0, 1].map(t => C.V3(t * 0.09, -0.04 * (1 - t * t), 0.01)), 0.014, P.disc, 6, false))); },
      finial: c => head(c, 0.17, 0, 0.13, 0, { sz: 0.92 }),
    },
  };
}

export function owlThemes(THREE, K, X) {
  const D = owlSpec(THREE, K, X);
  return { owl: critterTools(THREE, K, X, D.C, D) };
}

export const OWL_UMBRELLA = Object.freeze({ N: 8, R: 1.0, th: 1.0, overlap: 1, shape: { w: () => 1, tip: 0.04 } });

export function owlUmbrellaLook(THREE, K, X, ctx) {
  return critterUmbrellaLook(THREE, K, X, ctx, owlSpec(THREE, K, X));
}
