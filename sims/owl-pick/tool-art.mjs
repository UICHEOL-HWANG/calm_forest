import { simKit, baseTools, critterKit, canParts, buildTools, buildUmbrella } from './set-frame.mjs';
export { simKit, baseTools, buildTools, buildUmbrella };

export const OW = Object.freeze({
  body: 0x9a6a44, bodyD: 0x6e4a30, wing: 0x7e5636, wingD: 0x5a3c26, disc: 0xe4d0aa, discD: 0xc4a27a,
  tuft: 0x6e4a30, iris: 0xf0b040, ink: 0x2b2f36, hi: 0xd2d9de, beak: 0xd08a3c, cheek: 0xf09aa6,
  wood: 0xa87a52, woodD: 0x7a5636, leaf: 0x6fae54, leafD: 0x4c8a3c,
  snow: 0xc8ccd4, snowL: 0xd2d6dc, snowD: 0x9aa2ae, speck: 0x5a606c, gold: 0xf0c040,
});

const SNOW = Object.freeze({ ...OW, lift: 0.28, body: OW.snow, bodyD: OW.snowD, wing: OW.snowL, wingD: OW.speck, disc: OW.snowL, discD: OW.snowD, tuft: OW.snow, iris: OW.gold, beak: 0x4a4e58 });

export function owlKit(THREE, K, X) {
  const { clay, M } = K;
  const C = critterKit(THREE, K, X), { V3, grp, sph, dot, surf, dirSurf, stick, tube, eye, fib } = C;

  function scallops(g, S, R, rows, s, col, lift) {
    rows.forEach(([y, xs]) => xs.forEach(x => {
      const pts = [-1, -0.5, 0, 0.5, 1].map(t => { const h = S((x + t * 0.08) * R, (y - 0.05 * (1 - t * t)) * R, s); return h && h.p.clone().addScaledVector(h.n, lift * R); }).filter(Boolean);
      if (pts.length > 2) tube(g, pts, 0.018 * R, col, 6, false);
    }));
  }
  function spreadWing(g, R, sx, P, k = 1) {
    const w = grp(g, sx * 0.9 * R, -0.12 * R, -0.18 * R); w.rotation.y = -sx * 0.35;
    [[0.1, 0.78], [0.45, 0.95], [0.8, 0.9], [1.15, 0.7]].forEach(([a, l], i) => {
      const f = grp(w); f.rotation.z = sx > 0 ? a : Math.PI - a;
      const L = l * R * k;
      sph(f, 1, i % 2 ? P.body : P.wing, L / 2, 0, -i * 0.01 * R, [L / 2, 0.17 * R * k, 0.07 * R], 12, P.lift ?? 0);
      dot(f, 0.06 * R * k, P.wingD, L * 0.78, 0, 0.06 * R, [1.6, 0.6, 0.5]);
    });
  }
  function owlHead(p, R, x, y, z, o = {}) {
    const P = o.P ?? OW, g = grp(p, x, y, z);
    const ax = [(o.wx ?? 1.1) * R, (o.hy ?? 0.95) * R, (o.sz ?? 0.9) * R], ws = o.ws ?? (R < 0.07 ? 16 : 24);
    sph(g, 1, P.body, 0, 0, 0, ax, ws, P.lift ?? 0);
    const S = surf(ax), sides = o.both ? [1, -1] : [1], fy = (o.fy ?? 0) * R;
    sides.forEach(s => {
      [-1, 1].forEach(sx => {
        const h = S(sx * 0.4 * R, 0.06 * R + fy, s);
        stick(g, M(new THREE.SphereGeometry(0.46 * R, 18, 12), clay(P.disc, { smooth: true, lift: P.lift })), h, -0.1 * R).scale.set(1, 1.06, 0.34);
        eye(g, 0.29 * R, { p: h.p.clone().addScaledVector(h.n, 0.05 * R), n: h.n }, P, { ring: P.iris });
        const c = S(sx * 0.7 * R, -0.3 * R + fy, s);
        if (c) stick(g, M(new THREE.SphereGeometry(0.11 * R, 10, 7), clay(P.cheek, { smooth: true })), c, -0.01 * R).scale.set(1, 0.66, 0.34);
      });
      const b = S(0, -0.14 * R + fy, s);
      const bk = M(new THREE.ConeGeometry(0.09 * R, 0.22 * R, 6), clay(P.beak, { smooth: true }));
      bk.position.copy(b.p).addScaledVector(b.n, 0.07 * R); bk.rotation.x = Math.PI - 0.4 * s; g.add(bk);
      if (o.belly) {
        const bh = S(0, -0.55 * R, s);
        stick(g, M(new THREE.SphereGeometry(0.5 * R, 18, 12), clay(P.disc, { smooth: true, lift: P.lift })), bh, -0.12 * R).scale.set(1.1, 0.8, 0.34);
        scallops(g, S, R, [[-0.42, [-0.2, 0, 0.2]], [-0.58, [-0.3, -0.1, 0.1, 0.3]], [-0.74, [-0.2, 0, 0.2]]], s, P.discD, 0.06);
      }
    });
    const tk = o.tuft ?? 1.25;
    [-1, 1].forEach(sx => {
      const t = M(new THREE.ConeGeometry(0.26 * R * tk, 0.46 * R * tk, 6), clay(P.tuft, { smooth: true }), sx * 0.58 * ax[0] / 1.1, 0.74 * ax[1] / 0.95, 0);
      t.scale.z = 0.6; t.rotation.z = -sx * 0.55; g.add(t);
    });
    if (o.wings) [-1, 1].forEach(sx => {
      const w = sph(g, 1, P.wing, sx * 0.95 * ax[0], -0.22 * R, -0.12 * R, [0.2 * R, 0.55 * R, 0.5 * R], 16); w.rotation.z = sx * 0.18;
      [-0.18, 0, 0.18].forEach(dz => dot(g, 0.08 * R, P.wingD, sx * 1.0 * ax[0], -0.7 * R, (dz - 0.1) * R, [0.6, 1, 0.8]));
    });
    if (o.spread) [-1, 1].forEach(sx => spreadWing(g, R, sx, P, o.spread));
    if (o.feet) [-1, 1].forEach(sx => [-1, 0, 1].forEach(i => dot(g, 0.065 * R, P.beak, sx * 0.3 * R + i * 0.08 * R, -ax[1] * 0.96, ax[2] * 0.42 + (1 - Math.abs(i)) * 0.04 * R, [0.8, 0.55, 1.4])));
    if (o.speck) {
      const on = dirSurf(ax), keep = o.both ? d => d.y > 0.25 && Math.abs(d.z) < 0.55 : d => d.z < 0.25 || d.y > 0.72;
      fib(o.speckN ?? 20, keep).forEach(d => { const h = on(d); stick(g, dot(g, 0.045 * R, P.speck, 0, 0, 0, [1.5, 0.55, 0.4]), h, 0.005 * R); });
    }
    return g;
  }
  function owlBody(p, R, x, y, z, o = {}) {
    const P = o.P ?? OW, g = grp(p, x, y, z), ws = R < 0.06 ? 14 : 20;
    const bax = [0.78 * R, 0.74 * R, 0.7 * R];
    sph(g, 1, P.body, 0, 0.74 * R, 0, bax, ws);
    const bc = [0, 0.66 * R, 0.2 * R], belAx = [0.55 * R, 0.55 * R, 0.5 * R];
    sph(g, 1, P.disc, ...bc, belAx, ws);
    const Sb = surf(belAx), S = (u, v, s) => { const h = Sb(u, v - bc[1], s); if (h) h.p.add(V3(...bc)); return h; };
    if (R > 0.035) [[0.82, [-0.18, 0.06]], [0.62, [-0.3, -0.06, 0.18, 0.4]], [0.42, [-0.18, 0.06, 0.3]]].forEach(([yy, xs]) => xs.forEach(xx => {
      const pts = [-1, 0, 1].map(t => { const h = S((xx + t * 0.1) * R, (yy - 0.06 * (1 - t * t)) * R, 1); return h && h.p.clone().addScaledVector(h.n, 0.01 * R); }).filter(Boolean);
      if (pts.length === 3) tube(g, pts, 0.025 * R, P.discD, 6, false);
    }));
    [-1, 1].forEach(sx => {
      const w = sph(g, 1, P.wing, sx * 0.72 * R, 0.76 * R, -0.04 * R, [0.2 * R, 0.56 * R, 0.5 * R], ws); w.rotation.z = sx * 0.2;
      [-0.16, 0.04, 0.24].forEach(dz => dot(g, 0.08 * R, P.wingD, sx * 0.8 * R, 0.28 * R, (dz - 0.06) * R, [0.6, 1, 0.8]));
      [-1, 0, 1].forEach(i => dot(g, 0.07 * R, P.beak, sx * 0.24 * R + i * 0.08 * R, 0.03 * R, 0.5 * R + (1 - Math.abs(i)) * 0.04 * R, [0.8, 0.6, 1.5]));
    });
    owlHead(g, 0.64 * R, 0, 1.44 * R, 0.04 * R, { P, sz: 0.88, speck: o.speck, speckN: 22 });
    return g;
  }
  function twig(p, r, x, y, z, P = OW) {
    const g = grp(p, x, y, z);
    tube(g, [V3(-1.25 * r, -0.04 * r, 0), V3(0, 0.02 * r, 0), V3(1.25 * r, 0.06 * r, 0)], 0.15 * r, P.woodD, 8);
    C.leaf(g, 0.32 * r, P.leaf, null, 1.1 * r, 0.02 * r, 0.02 * r).rotation.set(0.3, 0, -1.0);
    C.leaf(g, 0.26 * r, P.leafD, null, -1.0 * r, -0.02 * r, 0.02 * r).rotation.set(0.3, 0, 1.9);
    return g;
  }
  return { ...C, owlHead, owlBody, twig, spreadWing };
}

export function owlVariants(THREE, K, X) {
  const { clay, M } = K, F = owlKit(THREE, K, X), { canHandle, spout } = canParts(THREE, K), P = OW, S = SNOW;
  const head = (p, r, x, y, z, o = {}) => F.owlHead(p, r, x, y, z, { P, sz: 0.9, ...o });
  const perched = (p, r, x, y, z) => { const g = F.grp(p, x, y - r * 0.45, z); F.twig(g, r, 0, 0, 0); F.owlBody(g, r * 0.8, 0, r * 0.1, 0); return g; };
  const snowy = (p, r, x, y, z, o = {}) => F.owlHead(p, r, x, y, z, { P: S, sz: 0.9, spread: 1.15, speck: true, tuft: 0.7, ...o });
  return {
    A: {
      h: { wood: P.wood, grip: P.bodyD, knob: P.body, bands: [[P.disc, 0.62]] }, a: P.body, b: P.bodyD, edge: P.disc, mount: P.bodyD, bag: P.body, net: P.disc,
      motif: head,
      axe: (g, cy) => head(g, 0.1, 0.13, cy - 0.01, 0, { both: true, sz: 0.6 }),
      water(g) {
        head(g, 0.13, 0.02, 0.15, 0, { sz: 0.95, wx: 1.0, hy: 1.02, fy: 0.2, belly: true, wings: true, feet: true });
        spout(g, P.body, P.bodyD, 0.17, 0.2); canHandle(g, P.bodyD, -0.165, 0.16);
      },
      umb: {
        def: { N: 8, R: 1.0, th: 1.0, overlap: 1, shape: { w: () => 1, tip: 0.04 } },
        outer: k => k % 2 ? P.disc : P.body, inner: P.disc, rim: P.bodyD,
        deco: (h, k, onGore) => { if (k % 2 === 0) [0.38, 0.58, 0.78].forEach(th => onGore(h, th, 0, g => F.tube(g, [-1, 0, 1].map(t => F.V3(t * 0.09, -0.04 * (1 - t * t), 0.01)), 0.014, P.disc, 6, false))); },
        finial: c => head(c, 0.17, 0, 0.13, 0, { sz: 0.92 }),
      },
    },
    B: {
      h: { wood: P.woodD, grip: P.leafD, knob: P.leaf, bands: [[P.leaf, 0.62]] }, a: P.leaf, b: P.leafD, edge: P.wood, mount: P.woodD, bag: P.wood, net: P.disc, band: P.leaf,
      motif: perched,
      axe(g, cy) {
        F.tube(g, [F.V3(-0.02, cy + 0.045, 0), F.V3(0.12, cy + 0.055, 0), F.V3(0.25, cy + 0.07, 0)], 0.017, P.woodD, 8);
        F.leaf(g, 0.085, P.leaf, P.leafD, 0.13, cy + 0.05, 0).rotation.z = Math.PI + 0.25;
        F.leaf(g, 0.06, P.leafD, P.leaf, 0.22, cy + 0.06, -0.005).rotation.z = Math.PI - 0.35;
        F.owlBody(g, 0.072, 0.11, cy + 0.07, 0);
      },
      water(g) {
        g.add(M(new THREE.CylinderGeometry(0.115, 0.13, 0.2, 12), clay(P.woodD), 0, 0.11, 0));
        g.add(M(new THREE.CylinderGeometry(0.112, 0.112, 0.02, 18), clay(P.wood, { smooth: true }), 0, 0.215, 0));
        [0.07, 0.04].forEach(r => g.add(M(new THREE.TorusGeometry(r, 0.006, 5, 18), clay(P.woodD, { smooth: true }), 0, 0.226, 0).rotateX(Math.PI / 2)));
        F.leaf(g, 0.05, P.leaf, P.leafD, -0.09, 0.2, 0.06).rotation.set(0.4, 0, 0.6);
        F.owlBody(g, 0.095, 0.05, 0.222, 0.0);
        spout(g, P.wood, P.leaf, 0.16, 0.15); canHandle(g, P.woodD, -0.175, 0.14);
      },
      umb: {
        def: { N: 8, R: 1.0, th: 0.98, overlap: 1, shape: { w: () => 1, tip: 0.06 } },
        outer: k => k % 2 ? P.leafD : P.leaf, inner: P.leaf, rim: P.woodD,
        deco: (h, k, onGore) => onGore(h, 0.6, 0, g => F.tube(g, [-1, 0, 1].map(t => F.V3(0, t * 0.14, 0.008)), 0.012, k % 2 ? P.leaf : P.leafD, 6, false)),
        finial: c => { const g = F.grp(c, 0, 0.03, 0); F.twig(g, 0.2, 0, 0, 0); F.owlBody(g, 0.14, 0, 0.02, 0); },
      },
    },
    C: {
      h: { wood: S.wood, grip: S.snowD, knob: S.snowL, bands: [[S.gold, 0.62]] }, a: S.snow, b: S.snowD, edge: S.gold, mount: S.snowD, bag: S.snow, net: S.snowL, band: S.gold,
      motif: snowy,
      axe: (g, cy) => snowy(g, 0.095, 0.14, cy, 0, { both: true, sz: 0.6, spread: 1.0 }),
      water(g) {
        snowy(g, 0.13, 0.02, 0.15, 0, { sz: 0.95, wx: 1.0, hy: 1.02, fy: 0.2, belly: true, feet: true, spread: 0.8, speckN: 26 });
        spout(g, S.snow, S.gold, 0.17, 0.2); canHandle(g, S.snowD, -0.165, 0.16);
      },
      umb: {
        def: { N: 8, R: 1.0, th: 1.0, overlap: 1, shape: { w: () => 1, tip: 0.03 } },
        outer: k => k % 2 ? S.snowL : S.snow, inner: S.snowL, rim: S.snowD,
        deco: (h, k, onGore) => [[0.4, 0.12], [0.62, -0.1], [0.82, 0.14]].forEach(([th, ph]) => onGore(h, th, ph, g => F.dot(g, 0.04, S.speck, 0, 0, 0.005, [1.5, 0.55, 0.4]))),
        finial: c => snowy(c, 0.16, 0, 0.13, 0, { sz: 0.92 }),
      },
    },
  };
}

export const SETS = Object.freeze({
  tools_owl: {
    ico: '🦉', name: '부엉이 세트', key: 'owl', pal: OW, variants: owlVariants,
    refs: [['frog', '기존 🐸 개구리', '라운드 8 기준'], ['penguin', '기존 🐧 펭귄', '동물 얼굴 세트']],
    dirs: [
      ['A', '동그란 부엉이', '귀깃·큰 금빛 눈·크림 얼굴판, 날은 양면 얼굴, 물조리개는 통통한 부엉이 몸'],
      ['B', '가지 위 부엉이', '나뭇가지에 앉은 온몸 부엉이, 나뭇잎 날, 물조리개는 그루터기'],
      ['C', '흰올빼미 날개', '눈처럼 흰 올빼미가 날개를 펼친 모양, 검은 깃 점·금빛 눈'],
    ],
  },
});
