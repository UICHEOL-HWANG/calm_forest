import { critterKit, critterTools, critterUmbrellaLook } from './tool-skins-critter-kit.js';
import { mapleLeafShape } from './tool-skins-extra-kit.js';

export const HG = Object.freeze({
  spike: 0x8a5a3a, spikeD: 0x5e3c26, spikeL: 0xa87850, face: 0xe4cfa6, faceD: 0xc9a97c,
  ink: 0x2b2f36, hi: 0xd2d9de, cheek: 0xf09aa6, wood: 0xa87a52, woodD: 0x7a5636, maple: 0xe0803a, mapleD: 0xc0602c,
});

const SPIKES = [HG.spike, HG.spikeD, HG.spikeL];

function hogKit(THREE, K, X) {
  const { clay, M, ext } = K;
  const C = critterKit(THREE, K, X), { V3, grp, sph, dot, surf, stick, tube, eye, spikes } = C, P = HG;

  function face(g, R, fax, fc) {
    const Sf = surf(fax), on = (u, v) => { const h = Sf(u - fc.x, v - fc.y, 1); if (h) h.p.add(fc); return h; };
    [-1, 1].forEach(sx => {
      eye(g, 0.12 * R, on(sx * 0.27 * R, 0.12 * R), P);
      const c = on(sx * 0.44 * R, -0.16 * R);
      if (c) stick(g, M(new THREE.SphereGeometry(0.11 * R, 8, 6), clay(P.cheek, { smooth: true })), c, -0.01 * R).scale.set(1, 0.66, 0.34);
    });
  }
  function snout(g, R, y, z, k) {
    sph(g, 1, P.face, 0, y, z, [0.3 * R * k, 0.25 * R * k, 0.34 * R * k], 12);
    sph(g, 0.1 * R * k, P.ink, 0, y + 0.05 * R * k, z + 0.33 * R * k, [1.15, 0.9, 0.9], 8);
    dot(g, 0.035 * R * k, P.hi, 0.03 * R * k, y + 0.09 * R * k, z + 0.41 * R * k, [1, 1, 0.6], 0.3);
    tube(g, [-1, 0, 1].map(t => V3(t * 0.09 * R * k, y - (0.17 + 0.04 * (1 - t * t)) * R * k, z + 0.24 * R * k)), 0.02 * R * k, P.ink, 6, false);
  }
  function maple(p, r, x, y, z) {
    const m = M(ext(mapleLeafShape(THREE, r, 36), r * 0.12, 0, 3), clay(P.maple, { smooth: true }), x, y, z); p.add(m); return m;
  }
  function hogBall(p, R, x, y, z) {
    const g = grp(p, x, y, z), ws = R < 0.07 ? 12 : 16;
    sph(g, R, P.spike, 0, 0, 0, [1, 1, 1], ws);
    spikes(g, [R, R, R], V3(), R < 0.07 ? 40 : 56, d => d.z < 0.45 && d.y > -0.78, 0.36 * R, 0.14 * R, SPIKES, V3(0, 0.05, -0.2));
    const fax = [0.66 * R, 0.6 * R, 0.5 * R], fc = V3(0, -0.04 * R, 0.66 * R);
    sph(g, 1, P.face, fc.x, fc.y, fc.z, fax, ws);
    snout(g, R, -0.14 * R, 1.06 * R, 0.62);
    face(g, R, fax, fc);
    [-1, 1].forEach(sx => sph(g, 0.11 * R, P.faceD, sx * 0.24 * R, -0.56 * R, 0.86 * R, [1, 0.8, 0.8], 8));
    maple(g, 0.34 * R, 0.12 * R, 1.08 * R, 0.05 * R).rotation.set(-0.5, 0.3, -0.35);
    return g;
  }
  return { C, hogBall };
}

function hogSpec(THREE, K, X) {
  const { clay, M } = K, { C, hogBall } = hogKit(THREE, K, X), P = HG;
  const coneDeco = (h, onGore) => [[0.35, 0.1], [0.55, -0.12], [0.75, 0.12]].forEach(([th, ph]) => onGore(h, th, ph, g => { const c = M(new THREE.ConeGeometry(0.035, 0.09, 4), clay(P.spikeD)); c.rotation.x = Math.PI / 2; c.position.z = 0.03; g.add(c); }));
  return {
    C,
    h: { wood: P.woodD, grip: P.spikeD, knob: P.maple, bands: [[P.maple, 0.62]] }, a: P.maple, b: P.mapleD, edge: P.face, mount: P.spikeD, bag: P.spike, net: P.maple, band: P.maple,
    motif: hogBall,
    axe: (g, cy) => hogBall(g, 0.092, 0.15, cy - 0.01, 0),
    water(g, { spout, canHandle }) {
      hogBall(g, 0.125, 0.02, 0.15, 0);
      [-1, 1].forEach(sx => C.sph(g, 0.022, P.faceD, 0.02 + sx * 0.06, 0.03, 0.07, [1, 0.6, 1.3], 8));
      spout(g, P.spike, P.maple, 0.17, 0.2); canHandle(g, P.spikeD, -0.17, 0.16);
    },
    umb: {
      outer: k => k % 2 ? P.maple : P.spike, inner: P.face, rim: P.spikeD,
      deco: (h, k, onGore) => { if (k % 2) onGore(h, 0.62, 0, g => C.leaf(g, 0.08, P.mapleD, null, 0, -0.06, 0.01)); else coneDeco(h, onGore); },
      finial: c => hogBall(c, 0.16, 0, 0.17, 0),
    },
  };
}

export function hedgehogThemes(THREE, K, X) {
  const D = hogSpec(THREE, K, X);
  return { hedgehog: critterTools(THREE, K, X, D.C, D) };
}

export const HEDGEHOG_UMBRELLA = Object.freeze({ N: 8, R: 1.0, th: 1.0, overlap: 1, shape: { w: () => 1, tip: 0.04 } });

export function hedgehogUmbrellaLook(THREE, K, X, ctx) {
  return critterUmbrellaLook(THREE, K, X, ctx, hogSpec(THREE, K, X));
}
