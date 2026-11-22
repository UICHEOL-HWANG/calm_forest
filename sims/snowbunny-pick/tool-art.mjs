import { simKit, baseTools, critterKit, canParts, buildTools, buildUmbrella } from '../owl-pick/set-frame.mjs';
export { simKit, baseTools, buildTools, buildUmbrella };

export const SB = Object.freeze({
  fur: 0xd8d2c8, furL: 0xdcd6cc, furS: 0xb8b0a6, ear: 0xf0a8b4, nose: 0xe0788c, cheek: 0xf09aa6,
  ink: 0x2b2f36, hi: 0xd2d9de, scarf: 0xd04a44, scarfD: 0xa8343a, flake: 0xa8c8e8, flakeD: 0x7aa0c8,
  snow: 0xc4ccd6, snowD: 0x9aa6b4, carrot: 0xe07a2a, leaf: 0x6fae54, wood: 0xa87a52, woodD: 0x7a5636,
});
const LIFT = 0.28;

export function bunnyKit(THREE, K, X) {
  const { clay, M } = K;
  const C = critterKit(THREE, K, X), { V3, grp, sph, surf, stick, eye } = C;
  const P = SB;

  function ear(g, R, sx, o) {
    const e = grp(g, sx * (o.ex ?? 0.3) * R, (o.ey ?? 0.62) * R, (o.ez ?? -0.04) * R);
    e.rotation.set(o.back ?? 0, 0, -sx * (o.tilt ?? 0.2) - (o.sweep ?? 0));
    const L = (o.len ?? 0.72) * R, ws = R < 0.07 ? 10 : 12;
    sph(e, 1, P.fur, 0, L, 0, [0.2 * R, L, 0.11 * R], ws, LIFT);
    (o.both ? [1, -1] : [1]).forEach(s => sph(e, 1, P.ear, 0, L * 0.98, s * 0.06 * R, [0.12 * R, L * 0.78, 0.06 * R], ws));
    if (o.cuff) e.add(M(new THREE.TorusGeometry(0.2 * R, 0.06 * R, 6, 14), clay(o.cuff, { smooth: true }), 0, 0.12 * R, 0).rotateX(Math.PI / 2));
    return e;
  }
  function face(g, R, S, s, fy, o = {}) {
    [-1, 1].forEach(sx => {
      const h = S(sx * 0.36 * R, 0.06 * R + fy, s);
      eye(g, (o.er ?? 0.15) * R, { p: h.p.clone().addScaledVector(h.n, 0.02 * R), n: h.n }, P);
      const c = S(sx * 0.6 * R, -0.22 * R + fy, s);
      if (c) stick(g, M(new THREE.SphereGeometry(0.11 * R, 10, 7), clay(P.cheek, { smooth: true })), c, -0.01 * R).scale.set(1, 0.66, 0.34);
      const m = S(sx * 0.12 * R, -0.24 * R + fy, s);
      stick(g, M(new THREE.SphereGeometry(0.15 * R, 12, 8), clay(P.furL, { smooth: true, lift: LIFT })), m, -0.02 * R).scale.set(1, 0.82, 0.55);
    });
    const n = S(0, -0.12 * R + fy, s);
    stick(g, M(new THREE.SphereGeometry(0.075 * R, 10, 7), clay(P.nose, { smooth: true })), n, 0.03 * R).scale.set(1.25, 0.85, 0.7);
  }
  function scarf(g, R, y, rad, front = 1) {
    g.add(M(new THREE.TorusGeometry(rad, 0.11 * R, 8, 22), clay(P.scarf, { smooth: true }), 0, y, 0).rotateX(Math.PI / 2));
    const k = grp(g, 0.45 * rad, y - 0.02 * R, front * 0.85 * rad);
    sph(k, 0.12 * R, P.scarfD, 0, 0, 0, [1, 1, 0.8], 10);
    [[-0.14, -0.18, 0.25], [0.08, -0.22, -0.2]].forEach(([dx, dy, rz]) => { const t = sph(k, 1, P.scarf, dx * R, dy * R, 0.02 * R, [0.08 * R, 0.2 * R, 0.05 * R], 10); t.rotation.z = rz; });
    [-0.17, 0.06].forEach(dx => sph(k, 1, P.scarfD, dx * R, -0.38 * R, 0.02 * R, [0.08 * R, 0.035 * R, 0.05 * R], 8));
  }
  function flakeAt(p, r, x, y, z, col = P.flake) {
    const g = grp(p, x, y, z), mat = clay(col, { smooth: true });
    [0, 1, 2].forEach(i => { const b = M(new THREE.BoxGeometry(r * 2, r * 0.26, r * 0.2), mat); b.rotation.z = i * Math.PI / 3; g.add(b); });
    g.add(M(new THREE.CylinderGeometry(r * 0.32, r * 0.32, r * 0.24, 6), mat).rotateX(Math.PI / 2));
    return g;
  }
  function pawPrint(p, r, col) {
    const mat = clay(col, { smooth: true, side: THREE.DoubleSide });
    const pad = M(new THREE.CircleGeometry(r, 10), mat, 0, -0.3 * r, 0.006); pad.scale.y = 1.2; p.add(pad);
    [-1, 0, 1].forEach(i => p.add(M(new THREE.CircleGeometry(r * 0.45, 8), mat, i * 0.85 * r, 1.0 * r - Math.abs(i) * 0.3 * r, 0.006)));
  }
  function hat(g, R, ws, sides, ax) {
    const ky = ax[1] / (0.9 * R), kz = Math.max(0.7, ax[2] / (0.88 * R));
    const h = X.hemi(1.04 * R, clay(P.scarf, { smooth: true }), 0, 0.12 * R, 0, 0.82 * ky, ws); h.scale.z = 0.92 * kz; g.add(h);
    const brim = M(new THREE.TorusGeometry(0.98 * R, 0.13 * R, 8, 24), clay(P.scarfD, { smooth: true }), 0, 0.16 * R, 0); brim.rotation.x = Math.PI / 2; brim.scale.y = 0.92 * kz; g.add(brim);
    const Sh = surf([1.04 * R, 0.85 * ky * R, 0.96 * kz * R]);
    sides.forEach(s => { const hb = Sh(0, 0.42 * R, s); hb.p.y += 0.12 * R; { const f = new THREE.Group(); stick(g, f, hb, 0.02 * R); flakeAt(f, 0.17 * R, 0, 0, 0); } });
  }

  function head(p, R, x, y, z, o = {}) {
    const g = grp(p, x, y, z), ax = [(o.wx ?? 1.0) * R, (o.hy ?? 0.9) * R, (o.sz ?? 0.88) * R], ws = o.ws ?? (R < 0.07 ? 14 : 20);
    sph(g, 1, P.fur, 0, 0, 0, ax, ws, LIFT);
    const S = surf(ax), sides = o.both ? [1, -1] : [1], fy = (o.fy ?? 0) * R;
    sides.forEach(s => face(g, R, S, s, fy, o));
    if (o.ears !== false) [-1, 1].forEach(sx => ear(g, R, sx, { both: o.both, ey: o.hat ? 0.66 * ax[1] / (0.9 * R) : 0.62, len: o.len, tilt: o.tilt, sweep: o.sweep, cuff: o.hat ? P.scarfD : null }));
    if (o.hat) hat(g, R, ws, sides, ax);
    if (o.scarf) scarf(g, R, -0.82 * ax[1], 0.62 * R);
    if (o.paws) [-1, 1].forEach(sx => sph(g, 0.15 * R, P.furS, sx * 0.4 * R, -0.85 * ax[1], 0.48 * ax[2], [1, 0.6, 1.3], 10));
    if (o.tail) sph(g, 0.24 * R, P.furL, 0, -0.35 * R, -0.95 * ax[2], [1, 1, 1], 12, LIFT);
    return g;
  }
  function carrot(p, r, x, y, z) {
    const g = grp(p, x, y, z); g.rotation.set(0.3, 0, -0.9);
    g.add(M(new THREE.ConeGeometry(0.32 * r, r * 1.3, 8), clay(P.carrot, { smooth: true }), 0, -0.65 * r, 0).rotateX(Math.PI));
    [-0.35, 0, 0.35].forEach(a => { const l = M(new THREE.ConeGeometry(0.1 * r, 0.5 * r, 5), clay(P.leaf, { smooth: true }), -Math.sin(a) * 0.22 * r, 0.22 * r, 0); l.rotation.z = a; g.add(l); });
    return g;
  }
  function loaf(p, R, x, y, z, o = {}) {
    const g = grp(p, x, y, z), ws = R < 0.07 ? 12 : 16;
    sph(g, 1, P.fur, 0, 0.46 * R, -0.12 * R, [0.62 * R, 0.48 * R, 0.78 * R], ws, LIFT);
    const hc = V3(0, 0.84 * R, 0.42 * R), hax = [0.5 * R, 0.44 * R, 0.44 * R];
    sph(g, 1, P.fur, hc.x, hc.y, hc.z, hax, ws, LIFT);
    const Sh = surf(hax), S = (u, v, s) => { const h = Sh(u, v, s); if (h) h.p.add(hc); return h; };
    const r = 0.5 * R;
    [-1, 1].forEach(sx => {
      const h = S(sx * 0.36 * r, 0.06 * r, 1);
      eye(g, 0.16 * r, { p: h.p.clone().addScaledVector(h.n, 0.02 * r), n: h.n }, P);
      const c = S(sx * 0.6 * r, -0.24 * r, 1);
      if (c) stick(g, M(new THREE.SphereGeometry(0.11 * r, 10, 7), clay(P.cheek, { smooth: true })), c, -0.01 * r).scale.set(1, 0.66, 0.34);
      const m = S(sx * 0.13 * r, -0.26 * r, 1);
      stick(g, M(new THREE.SphereGeometry(0.16 * r, 10, 7), clay(P.furL, { smooth: true, lift: LIFT })), m, -0.02 * r).scale.set(1, 0.82, 0.55);
      ear(g, r, sx, { ex: 0.26, ey: 0.55, ez: -0.15, back: -1.2, tilt: 0.35, len: 0.78 }).position.add(hc);
      sph(g, 0.12 * R, P.furS, sx * 0.2 * R, 0.08 * R, 0.5 * R, [1, 0.6, 1.3], 10);
    });
    stick(g, M(new THREE.SphereGeometry(0.075 * r, 10, 7), clay(P.nose, { smooth: true })), S(0, -0.13 * r, 1), 0.03 * r).scale.set(1.25, 0.85, 0.7);
    sph(g, 0.2 * R, P.furL, 0, 0.5 * R, -0.88 * R, [1, 1, 1], 12, LIFT);
    if (o.carrot) carrot(g, 0.22 * R, 0.36 * R, 0.3 * R, 0.62 * R);
    return g;
  }
  const snowball = (p, R, x, y, z, o = {}) => sph(p, R, P.snow, x, y, z, o.s ?? [1, 0.92, 1], R < 0.07 ? 14 : 18, 0.3);
  return { ...C, pawPrint, head, loaf, snowball, carrot, scarf, flakeAt, ear };
}

export function bunnyVariants(THREE, K, X) {
  const F = bunnyKit(THREE, K, X), { canHandle, spout } = canParts(THREE, K), P = SB;
  const head = (p, r, x, y, z, o = {}) => F.head(p, r, x, y, z, { sz: 0.88, ...o });
  return {
    A: {
      h: { wood: P.wood, grip: P.scarfD, knob: P.fur, bands: [[P.scarf, 0.62]] }, a: P.fur, b: P.furS, edge: P.flake, mount: P.scarfD, bag: P.fur, net: P.furL, band: P.scarf,
      motif: (p, r, x, y, z) => head(p, r * 0.85, x, y - r * 0.15, z, { len: 0.8 }),
      axe: (g, cy) => head(g, 0.1, 0.14, cy - 0.02, 0, { both: true, sz: 0.62, scarf: true, len: 0.8, ws: 16 }),
      water(g) {
        head(g, 0.13, 0.02, 0.14, 0, { sz: 0.95, hy: 1.0, fy: 0.15, scarf: true, paws: true, tail: true, len: 0.62, sweep: 0.5 });
        spout(g, P.fur, P.scarf, 0.17, 0.19); canHandle(g, P.furS, -0.165, 0.15);
      },
      umb: {
        def: { N: 8, R: 1.0, th: 1.0, overlap: 1, shape: { w: () => 1, tip: 0.04 } },
        outer: k => k % 2 ? P.flake : P.fur, inner: P.furL, rim: P.scarf,
        deco: (h, k, onGore) => { if (k % 2 === 0) onGore(h, 0.6, 0, g => F.flakeAt(g, 0.09, 0, 0, 0.01, P.flakeD)); },
        finial: c => head(c, 0.16, 0, 0.13, 0, { len: 0.75, ws: 16 }),
      },
    },
    B: {
      h: { wood: P.wood, grip: P.snowD, knob: P.snow, bands: [[P.carrot, 0.62]] }, a: P.snow, b: P.snowD, edge: P.furL, mount: P.snowD, bag: P.snow, net: P.furL, band: P.carrot,
      motif: (p, r, x, y, z) => F.loaf(p, r * 1.6, x, y - r * 0.6, z),
      axe(g, cy) {
        F.snowball(g, 0.105, 0.13, cy - 0.03, 0, { s: [1, 0.86, 0.42] });
        F.loaf(g, 0.088, 0.12, cy + 0.035, 0);
      },
      water(g) {
        F.snowball(g, 0.13, 0.0, 0.13, 0);
        F.loaf(g, 0.12, 0.02, 0.215, 0.0, { carrot: true });
        spout(g, P.snow, P.carrot, 0.16, 0.15); canHandle(g, P.snowD, -0.17, 0.14);
      },
      umb: {
        def: { N: 8, R: 1.0, th: 0.98, overlap: 1, shape: { w: () => 1, tip: 0.05 } },
        outer: k => k % 2 ? P.fur : P.snow, inner: P.furL, rim: P.snowD,
        deco: (h, k, onGore) => { if (k % 2) [[0.45, 0.07], [0.7, -0.07]].forEach(([th, ph]) => onGore(h, th, ph, g => F.pawPrint(g, 0.03, P.ear))); },
        finial: c => { F.snowball(c, 0.13, 0, 0.06, 0); F.loaf(c, 0.2, 0, 0.15, 0); },
      },
    },
    C: {
      h: { wood: P.woodD, grip: P.scarfD, knob: P.scarf, bands: [[P.furL, 0.62]] }, a: P.scarf, b: P.scarfD, edge: P.furL, mount: P.scarfD, bag: P.scarf, net: P.furL, band: P.scarf,
      motif: (p, r, x, y, z) => head(p, r * 0.85, x, y - r * 0.1, z, { hat: true, fy: -0.12, len: 0.7 }),
      axe: (g, cy) => head(g, 0.1, 0.14, cy - 0.02, 0, { both: true, sz: 0.62, hat: true, fy: -0.12, len: 0.75, ws: 16 }),
      water(g) {
        head(g, 0.13, 0.02, 0.14, 0, { sz: 0.95, hy: 1.0, fy: -0.02, hat: true, paws: true, tail: true, len: 0.6, sweep: 0.5 });
        spout(g, P.fur, P.scarf, 0.17, 0.17); canHandle(g, P.scarfD, -0.165, 0.13);
      },
      umb: {
        def: { N: 8, R: 1.0, th: 1.0, overlap: 1, shape: { w: () => 1, tip: 0.03 } },
        outer: k => k % 2 ? P.fur : P.scarf, inner: P.furL, rim: P.scarfD,
        deco: (h, k, onGore) => { if (k % 2) onGore(h, 0.62, 0, g => F.flakeAt(g, 0.08, 0, 0, 0.01, P.scarf)); else [0.4, 0.55, 0.7, 0.85].forEach(th => onGore(h, th, 0, g => F.tube(g, [-1, 0, 1].map(t => F.V3(t * 0.06, 0.02 * (1 - t * t), 0.008)), 0.01, P.scarfD, 6, false))); },
        finial: c => head(c, 0.16, 0, 0.12, 0, { hat: true, fy: -0.12, len: 0.6, ws: 16 }),
      },
    },
  };
}

export const SETS = Object.freeze({
  tools_snowbunny: {
    ico: '🐰', name: '눈토끼 세트', key: 'snowbunny', pal: SB, variants: bunnyVariants,
    refs: [['owl', '기존 🦉 부엉이', '라운드 9 기준'], ['kitty', '기존 🐱 고양이', '닮으면 안 되는 세트']],
    dirs: [
      ['A', '빨간 목도리 눈토끼', '긴 귀·분홍 속귀·분홍 코, 빨간 목도리 매듭, 우산은 눈꽃'],
      ['B', '눈뭉치 위 식빵 토끼', '귀를 뒤로 눕힌 식빵 자세 토끼가 눈뭉치 위에, 당근 하나'],
      ['C', '털모자 눈토끼', '빨간 털모자 구멍으로 귀가 쏙, 모자에 눈꽃 배지'],
    ],
  },
});
