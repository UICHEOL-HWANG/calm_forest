import { critterKit, critterTools, critterUmbrellaLook } from './tool-skins-critter-kit.js';

export const SB = Object.freeze({
  fur: 0xd8d2c8, furL: 0xdcd6cc, furS: 0xb8b0a6, ear: 0xf0a8b4, nose: 0xe0788c, cheek: 0xf09aa6,
  ink: 0x2b2f36, hi: 0xd2d9de, scarf: 0xd04a44, scarfD: 0xa8343a, flake: 0xa8c8e8, flakeD: 0x7aa0c8, wood: 0xa87a52,
});
const LIFT = 0.28;

function bunnyKit(THREE, K, X) {
  const { clay, M } = K;
  const C = critterKit(THREE, K, X), { grp, sph, surf, stick, eye } = C, P = SB;

  function ear(g, R, sx, o, ws) {
    const e = grp(g, sx * 0.3 * R, 0.62 * R, -0.04 * R);
    e.rotation.set(0, 0, -sx * 0.2 - (o.sweep ?? 0));
    const L = (o.len ?? 0.72) * R;
    sph(e, 1, P.fur, 0, L, 0, [0.2 * R, L, 0.11 * R], ws, LIFT);
    (o.both ? [1, -1] : [1]).forEach(s => sph(e, 1, P.ear, 0, L * 0.98, s * 0.06 * R, [0.12 * R, L * 0.78, 0.06 * R], ws - 2));
  }
  function face(g, R, S, s, fy) {
    [-1, 1].forEach(sx => {
      const h = S(sx * 0.36 * R, 0.06 * R + fy, s);
      eye(g, 0.15 * R, { p: h.p.clone().addScaledVector(h.n, 0.02 * R), n: h.n }, P);
      const c = S(sx * 0.6 * R, -0.22 * R + fy, s);
      if (c) stick(g, M(new THREE.SphereGeometry(0.11 * R, 8, 6), clay(P.cheek, { smooth: true })), c, -0.01 * R).scale.set(1, 0.66, 0.34);
      const m = S(sx * 0.12 * R, -0.24 * R + fy, s);
      stick(g, M(new THREE.SphereGeometry(0.15 * R, 10, 7), clay(P.furL, { smooth: true, lift: LIFT })), m, -0.02 * R).scale.set(1, 0.82, 0.55);
    });
    const n = S(0, -0.12 * R + fy, s);
    stick(g, M(new THREE.SphereGeometry(0.075 * R, 8, 6), clay(P.nose, { smooth: true })), n, 0.03 * R).scale.set(1.25, 0.85, 0.7);
  }
  function scarf(g, R, y, rad) {
    g.add(M(new THREE.TorusGeometry(rad, 0.11 * R, 5, 14), clay(P.scarf, { smooth: true }), 0, y, 0).rotateX(Math.PI / 2));
    const k = grp(g, 0.45 * rad, y - 0.02 * R, 0.85 * rad);
    sph(k, 0.12 * R, P.scarfD, 0, 0, 0, [1, 1, 0.8], 8);
    [[-0.14, -0.18, 0.25], [0.08, -0.22, -0.2]].forEach(([dx, dy, rz]) => { const t = sph(k, 1, P.scarf, dx * R, dy * R, 0.02 * R, [0.08 * R, 0.2 * R, 0.05 * R], 8); t.rotation.z = rz; });
    [-0.17, 0.06].forEach(dx => sph(k, 1, P.scarfD, dx * R, -0.38 * R, 0.02 * R, [0.08 * R, 0.035 * R, 0.05 * R], 6));
  }
  function flakeAt(p, r, x, y, z, col) {
    const g = grp(p, x, y, z), mat = clay(col, { smooth: true });
    [0, 1, 2].forEach(i => { const b = M(new THREE.BoxGeometry(r * 2, r * 0.26, r * 0.2), mat); b.rotation.z = i * Math.PI / 3; g.add(b); });
    g.add(M(new THREE.CylinderGeometry(r * 0.32, r * 0.32, r * 0.24, 6), mat).rotateX(Math.PI / 2));
    return g;
  }
  function head(p, R, x, y, z, o = {}) {
    const g = grp(p, x, y, z), ax = [R, (o.hy ?? 0.9) * R, (o.sz ?? 0.88) * R], ws = R < 0.07 ? 12 : 16;
    sph(g, 1, P.fur, 0, 0, 0, ax, ws, LIFT);
    const S = surf(ax), fy = (o.fy ?? 0) * R;
    (o.both ? [1, -1] : [1]).forEach(s => face(g, R, S, s, fy));
    [-1, 1].forEach(sx => ear(g, R, sx, o, R < 0.12 ? 9 : 12));
    if (o.scarf) scarf(g, R, -0.82 * ax[1], 0.62 * R);
    if (o.paws) [-1, 1].forEach(sx => sph(g, 0.15 * R, P.furS, sx * 0.4 * R, -0.85 * ax[1], 0.48 * ax[2], [1, 0.6, 1.3], 8));
    if (o.tail) sph(g, 0.24 * R, P.furL, 0, -0.35 * R, -0.95 * ax[2], [1, 1, 1], 10, LIFT);
    return g;
  }
  return { C, head, flakeAt };
}

function bunnySpec(THREE, K, X) {
  const { C, head, flakeAt } = bunnyKit(THREE, K, X), P = SB;
  return {
    C,
    h: { wood: P.wood, grip: P.scarfD, knob: P.fur, bands: [[P.scarf, 0.62]] }, a: P.fur, b: P.furS, edge: P.flake, mount: P.scarfD, bag: P.fur, net: P.furL, band: P.scarf,
    motif: (p, r, x, y, z) => head(p, r * 0.85, x, y - r * 0.15, z, { len: 0.8 }),
    axe: (g, cy) => head(g, 0.1, 0.14, cy - 0.02, 0, { both: true, sz: 0.62, scarf: true, len: 0.8 }),
    water(g, { spout, canHandle }) {
      head(g, 0.13, 0.02, 0.14, 0, { sz: 0.95, hy: 1.0, fy: 0.15, scarf: true, paws: true, tail: true, len: 0.62, sweep: 0.5 });
      spout(g, P.fur, P.scarf, 0.17, 0.19); canHandle(g, P.furS, -0.165, 0.15);
    },
    umb: {
      outer: k => k % 2 ? P.flake : P.fur, inner: P.furL, rim: P.scarf,
      deco: (h, k, onGore) => { if (k % 2 === 0) onGore(h, 0.6, 0, g => flakeAt(g, 0.09, 0, 0, 0.01, P.flakeD)); },
      finial: c => head(c, 0.16, 0, 0.13, 0, { len: 0.75 }),
    },
  };
}

export function snowbunnyThemes(THREE, K, X) {
  const D = bunnySpec(THREE, K, X);
  return { snowbunny: critterTools(THREE, K, X, D.C, D) };
}

export const SNOWBUNNY_UMBRELLA = Object.freeze({ N: 8, R: 1.0, th: 1.0, overlap: 1, shape: { w: () => 1, tip: 0.04 } });

export function snowbunnyUmbrellaLook(THREE, K, X, ctx) {
  return critterUmbrellaLook(THREE, K, X, ctx, bunnySpec(THREE, K, X));
}
