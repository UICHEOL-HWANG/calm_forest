import { simKit, baseTools, critterKit, canParts, buildTools, buildUmbrella } from '../owl-pick/set-frame.mjs';
export { simKit, baseTools, buildTools, buildUmbrella };

export const HG = Object.freeze({
  spike: 0x8a5a3a, spikeD: 0x5e3c26, spikeL: 0xa87850, face: 0xe4cfa6, faceD: 0xc9a97c,
  ink: 0x2b2f36, hi: 0xd2d9de, cheek: 0xf09aa6, ear: 0xe0a898,
  apple: 0xd8483c, appleD: 0xa8302c, leaf: 0x6fae54, leafD: 0x4c8a3c,
  wood: 0xa87a52, woodD: 0x7a5636, maple: 0xe0803a, mapleD: 0xc0602c,
});

export function hogKit(THREE, K, X) {
  const { clay, M, ext } = K;
  const C = critterKit(THREE, K, X), { V3, grp, sph, dot, surf, stick, tube, eye, spikes } = C;
  const SPK = P => [P.spike, P.spikeD, P.spikeL];

  function face(g, P, R, fax, fc, o) {
    const Sf = surf(fax), on = (u, v) => { const h = Sf(u - fc.x, v - fc.y, 1); if (h) h.p.add(fc); return h; };
    [-1, 1].forEach(sx => {
      eye(g, (o.er ?? 0.12) * R, on(sx * (o.ex ?? 0.3) * R, (o.ey ?? 0.14) * R), P);
      const c = on(sx * (o.cx ?? 0.5) * R, (o.cy ?? -0.14) * R);
      if (c) stick(g, M(new THREE.SphereGeometry(0.11 * R, 10, 7), clay(P.cheek, { smooth: true })), c, -0.01 * R).scale.set(1, 0.66, 0.34);
    });
  }
  function snout(g, P, R, y, z, k = 1) {
    sph(g, 1, P.face, 0, y, z, [0.3 * R * k, 0.25 * R * k, 0.34 * R * k], 16);
    sph(g, 0.1 * R * k, P.ink, 0, y + 0.05 * R * k, z + 0.33 * R * k, [1.15, 0.9, 0.9], 12);
    dot(g, 0.035 * R * k, P.hi, 0.03 * R * k, y + 0.09 * R * k, z + 0.41 * R * k, [1, 1, 0.6], 0.3);
    const pts = [-1, 0, 1].map(t => V3(t * 0.09 * R * k, y - (0.17 + 0.04 * (1 - t * t)) * R * k, z + 0.24 * R * k));
    tube(g, pts, 0.02 * R * k, P.ink, 6, false);
  }
  function hogHead(p, R, x, y, z, o = {}) {
    const P = o.P ?? HG, g = grp(p, x, y, z), ws = R < 0.07 ? 16 : 24;
    if (o.profile) g.rotation.y = Math.PI / 2;
    const fax = [0.8 * R, 0.76 * R, 0.78 * R], fc = V3(0, -0.04 * R, 0.06 * R);
    sph(g, 1, P.face, fc.x, fc.y, fc.z, fax, ws);
    const cax = [0.88 * R, 0.86 * R, 0.8 * R], cc = V3(0, 0.06 * R, -0.14 * R);
    sph(g, 1, P.spike, cc.x, cc.y, cc.z, cax, ws);
    spikes(g, cax, cc, o.N ?? (R < 0.07 ? 70 : 120), d => d.z < 0.15 + 0.5 * Math.max(0, d.y) && d.y > -0.6, 0.42 * R, 0.12 * R, SPK(P));
    snout(g, P, R, -0.16 * R, 0.62 * R);
    face(g, P, R, fax, fc, o);
    [-1, 1].forEach(sx => sph(g, 0.14 * R, P.ear, sx * 0.58 * R, 0.5 * R, 0.12 * R, [1, 1, 0.5], 10));
    if (o.feet) [-1, 1].forEach(sx => sph(g, 0.14 * R, P.faceD, sx * 0.42 * R, -0.76 * R, 0.4 * R, [1, 0.6, 1.3], 10));
    return g;
  }
  function apple(p, r, x, y, z, P = HG) {
    const g = grp(p, x, y, z);
    sph(g, r, P.apple, 0, 0, 0, [1, 0.9, 1], 18);
    tube(g, [V3(0, r * 0.8, 0), V3(r * 0.06, r * 1.05, 0), V3(r * 0.16, r * 1.22, 0)], r * 0.07, P.woodD, 6);
    C.leaf(g, r * 0.32, P.leaf, null, r * 0.12, r * 1.02, 0).rotation.z = -1.1;
    return g;
  }
  function hogBody(p, R, x, y, z, o = {}) {
    const P = o.P ?? HG, g = grp(p, x, y, z), ws = R < 0.06 ? 14 : 20;
    sph(g, 1, P.face, 0, 0.42 * R, 0.05 * R, [0.6 * R, 0.4 * R, 0.75 * R], ws);
    const bax = [0.72 * R, 0.6 * R, 0.9 * R], bc = V3(0, 0.62 * R, -0.12 * R);
    sph(g, 1, P.spike, bc.x, bc.y, bc.z, bax, ws);
    spikes(g, bax, bc, o.N ?? (R < 0.06 ? 70 : 120), d => d.y > -0.15 && d.z < 0.6, 0.42 * R, 0.12 * R, SPK(P), V3(0, 0.15, -0.55));
    [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([sx, sz]) => sph(g, 0.12 * R, P.faceD, sx * 0.4 * R, 0.08 * R, sz * 0.45 * R, [1, 0.6, 1.3], 10));
    hogHead(g, 0.55 * R, 0, 0.62 * R, 0.6 * R, { P, N: R < 0.06 ? 40 : 70 });
    if (o.apple !== false) apple(g, 0.3 * R, 0.02 * R, 1.5 * R, -0.22 * R, P);
    return g;
  }
  function maple(p, r, x, y, z, P = HG) {
    const m = M(ext(X.mapleShape(r), r * 0.12, r * 0.04, 3), clay(P.maple, { smooth: true }), x, y, z); p.add(m); return m;
  }
  function hogBall(p, R, x, y, z, o = {}) {
    const P = o.P ?? HG, g = grp(p, x, y, z), ws = R < 0.07 ? 16 : 24;
    sph(g, R, P.spike, 0, 0, 0, [1, 1, 1], ws);
    spikes(g, [R, R, R], V3(), o.N ?? (R < 0.07 ? 80 : 120), d => d.z < 0.45 && d.y > -0.78, 0.34 * R, 0.11 * R, SPK(P), V3(0, 0.05, -0.2));
    const fax = [0.66 * R, 0.6 * R, 0.5 * R], fc = V3(0, -0.04 * R, 0.66 * R);
    sph(g, 1, P.face, fc.x, fc.y, fc.z, fax, ws);
    snout(g, P, R, -0.14 * R, 1.06 * R, 0.62);
    face(g, P, R, fax, fc, { ex: 0.27, ey: 0.12, er: 0.12, cx: 0.44, cy: -0.16 });
    [-1, 1].forEach(sx => sph(g, 0.11 * R, P.faceD, sx * 0.24 * R, -0.56 * R, 0.86 * R, [1, 0.8, 0.8], 10));
    if (o.leaf !== false) maple(g, 0.34 * R, 0.12 * R, 1.08 * R, 0.05 * R, P).rotation.set(-0.5, 0.3, -0.35);
    return g;
  }
  return { ...C, hogHead, hogBody, hogBall, apple, maple };
}

export function hogVariants(THREE, K, X) {
  const { clay, M } = K, F = hogKit(THREE, K, X), { canHandle, spout } = canParts(THREE, K), P = HG;
  const coneDeco = (h, k, onGore) => { if (k % 2 === 0) [[0.35, 0.1], [0.55, -0.12], [0.75, 0.12]].forEach(([th, ph]) => onGore(h, th, ph, g => { const c = M(new THREE.ConeGeometry(0.035, 0.09, 4), clay(P.spikeD)); c.rotation.x = Math.PI / 2; c.position.z = 0.03; g.add(c); })); };
  return {
    A: {
      h: { wood: P.wood, grip: P.spikeD, knob: P.spike, bands: [[P.face, 0.62]] }, a: P.spike, b: P.spikeD, edge: P.face, mount: P.spikeD, bag: P.spike, net: P.face,
      motif: (p, r, x, y, z) => F.hogHead(p, r, x, y, z),
      axe: (g, cy) => F.hogHead(g, 0.1, 0.15, cy, 0, { profile: true }),
      water(g) {
        F.hogHead(g, 0.13, 0.02, 0.15, 0, { feet: true });
        spout(g, P.face, P.spikeD, 0.17, 0.2); canHandle(g, P.spikeD, -0.17, 0.16);
      },
      umb: {
        def: { N: 8, R: 1.0, th: 1.0, overlap: 1, shape: { w: () => 1, tip: 0.04 } },
        outer: k => k % 2 ? P.face : P.spike, inner: P.face, rim: P.spikeD, deco: coneDeco,
        finial: c => F.hogHead(c, 0.17, 0, 0.14, 0),
      },
    },
    B: {
      h: { wood: P.wood, grip: P.appleD, knob: P.apple, bands: [[P.leaf, 0.62]] }, a: P.apple, b: P.appleD, edge: P.face, mount: P.leafD, bag: P.apple, net: P.face, band: P.leaf,
      motif: (p, r, x, y, z) => F.hogBody(p, r * 0.9, x, y - r * 0.5, z),
      axe(g, cy) {
        F.sph(g, 0.1, P.apple, 0.13, cy - 0.02, 0, [1, 0.92, 0.38], 20);
        F.sph(g, 0.08, P.face, 0.13, cy - 0.02, 0, [1, 0.92, 0.56], 18);
        [-1, 1].forEach(s => [0, 1, 2, 3, 4].forEach(i => { const a = i * Math.PI * 0.4, d = F.dot(g, 0.008, P.spikeD, 0.13 + Math.sin(a) * 0.022, cy - 0.02 + Math.cos(a) * 0.022, s * 0.045, [0.6, 1.3, 0.5]); d.rotation.z = -a; }));
        F.hogBody(g, 0.068, 0.12, cy + 0.07, 0, { apple: false });
        F.leaf(g, 0.03, P.leaf, null, 0.2, cy + 0.06, 0).rotation.z = -0.9;
      },
      water(g) {
        F.apple(g, 0.13, 0.0, 0.14, 0);
        F.hogBody(g, 0.09, 0.04, 0.235, 0.0, { apple: false });
        spout(g, P.apple, P.leafD, 0.16, 0.17); canHandle(g, P.appleD, -0.17, 0.15);
      },
      umb: {
        def: { N: 8, R: 1.0, th: 0.98, overlap: 1, shape: { w: () => 1, tip: 0.05 } },
        outer: k => k % 2 ? P.face : P.apple, inner: P.face, rim: P.leafD,
        deco: (h, k, onGore) => { if (k % 2) [[0.5, 0.08], [0.7, -0.08]].forEach(([th, ph]) => onGore(h, th, ph, g => F.dot(g, 0.03, P.spikeD, 0, 0, 0.005, [0.7, 1.3, 0.5]))); },
        finial: c => F.hogBody(c, 0.16, 0, 0.02, 0),
      },
    },
    C: {
      h: { wood: P.woodD, grip: P.spikeD, knob: P.maple, bands: [[P.maple, 0.62]] }, a: P.maple, b: P.mapleD, edge: P.face, mount: P.spikeD, bag: P.spike, net: P.maple, band: P.maple,
      motif: (p, r, x, y, z) => F.hogBall(p, r, x, y, z),
      axe: (g, cy) => F.hogBall(g, 0.092, 0.15, cy - 0.01, 0),
      water(g) {
        F.hogBall(g, 0.125, 0.02, 0.15, 0);
        [-1, 1].forEach(sx => F.sph(g, 0.022, P.faceD, 0.02 + sx * 0.06, 0.03, 0.07, [1, 0.6, 1.3], 10));
        spout(g, P.spike, P.maple, 0.17, 0.2); canHandle(g, P.spikeD, -0.17, 0.16);
      },
      umb: {
        def: { N: 8, R: 1.0, th: 1.0, overlap: 1, shape: { w: () => 1, tip: 0.04 } },
        outer: k => k % 2 ? P.maple : P.spike, inner: P.face, rim: P.spikeD,
        deco: (h, k, onGore) => { if (k % 2) onGore(h, 0.62, 0, g => F.leaf(g, 0.08, P.mapleD, null, 0, -0.06, 0.01)); else coneDeco(h, 0, onGore); },
        finial: c => F.hogBall(c, 0.16, 0, 0.17, 0),
      },
    },
  };
}

export const SETS = Object.freeze({
  tools_hedgehog: {
    ico: '🦔', name: '고슴도치 세트', key: 'hedgehog', pal: HG, variants: hogVariants,
    refs: [['frog', '기존 🐸 개구리', '라운드 8 기준'], ['squirrel', '기존 🐿️ 다람쥐', '밤색 동물 세트']],
    dirs: [
      ['A', '고슴도치 얼굴', '밤색 가시 모자·크림 얼굴·까만 코, 도끼 날은 옆모습 고슴도치'],
      ['B', '사과 업은 고슴도치', '등에 빨간 사과를 업은 온몸 고슴도치, 날은 사과 단면, 물조리개는 사과'],
      ['C', '밤송이 공 고슴도치', '공처럼 웅크린 가시 공에 얼굴만 빼꼼, 단풍잎 하나'],
    ],
  },
});
