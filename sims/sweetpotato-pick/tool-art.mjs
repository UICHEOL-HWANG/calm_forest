import { simKit, baseTools, critterKit, canParts, buildTools, buildUmbrella } from '../owl-pick/set-frame.mjs';
export { simKit, baseTools, buildTools, buildUmbrella };

export const SP = Object.freeze({
  skin: 0x8a3a5a, skinD: 0x6a2a44, skinL: 0xa45070, flesh: 0xf0b040, fleshD: 0xd8902c, caramel: 0xb8642a,
  steam: 0xd0d4d8, paper: 0xd8ccb0, paperD: 0xb8ac90, print: 0x6a665c, foil: 0xb8bcc4, foilD: 0x8e949e,
  ink: 0x2b2f36, hi: 0xd2d9de, cheek: 0xf09aa6, leaf: 0x6fae54, leafD: 0x4c8a3c, wood: 0xa87a52, woodD: 0x7a5636,
});

export function potatoKit(THREE, K, X) {
  const { clay, M, ext } = K;
  const C = critterKit(THREE, K, X), { V3, grp, sph, dot, stick, tube, eye } = C;
  const P = SP;
  const prof = (R, t) => R * Math.pow(Math.max(0, Math.sin(Math.PI * t)), 0.62) * (1 + 0.14 * (t - 0.5));

  function face(g, R, hit, t, s, up) {
    const a0 = s * Math.PI / 2;
    const at = up ? (dx, dy) => hit(t + dy * 0.28, a0 - dx * 1.5) : (dx, dy) => hit(t + dx * 0.28 * s, a0 - dy * 1.5 * s);
    [-1, 1].forEach(sx => {
      const h = at(sx * 0.3, 0.05);
      eye(g, 0.15 * R, { p: h.p.clone().addScaledVector(h.n, 0.02 * R), n: h.n }, P);
      const c = at(sx * 0.55, -0.2);
      stick(g, M(new THREE.SphereGeometry(0.12 * R, 10, 7), clay(P.cheek, { smooth: true })), c, -0.01 * R).scale.set(1, 0.66, 0.34);
    });
    const m = [-1, 0, 1].map(k => { const h = at(k * 0.15, -0.2 - 0.06 * (1 - k * k)); return h.p.clone().addScaledVector(h.n, 0.01 * R); });
    tube(g, m, 0.025 * R, P.ink, 6, false);
  }
  function potato(p, R, L, x, y, z, o = {}) {
    const g = grp(p, x, y, z), t1 = o.cut ?? 1, n = o.n ?? 12, seg = o.seg ?? (R < 0.05 ? 12 : 16);
    const pts = Array.from({ length: n + 1 }, (_, i) => { const t = (i / n) * t1; return new THREE.Vector2(Math.max(prof(R, t), 0.0005), (t - 0.5) * L); });
    const geo = new THREE.LatheGeometry(pts, seg); geo.rotateZ(-Math.PI / 2);
    g.add(new THREE.Mesh(geo, clay(o.col ?? P.skin, { smooth: true })));
    const hit = (t, a) => { const r = prof(R, t); return { p: V3((t - 0.5) * L, r * Math.cos(a), r * Math.sin(a)), n: V3(0, Math.cos(a), Math.sin(a)) }; };
    if (o.tail !== false) tube(g, [V3(-0.5 * L, 0, 0), V3(-0.5 * L - 0.1 * R, 0.05 * R, 0), V3(-0.5 * L - 0.25 * R, 0.18 * R, 0)], 0.05 * R, P.skinD, 5, false);
    (o.spots ?? [[0.3, 0.4], [0.62, -0.6], [0.45, 2.4], [0.72, 1.4], [0.22, -2.2]]).forEach(([t, a]) => { if (t < t1 - 0.05) stick(g, dot(g, 0.07 * R, P.skinD, 0, 0, 0, [1.6, 0.8, 0.35]), hit(t, a), 0); });
    if (o.cut != null) {
      const rc = prof(R, t1), cx = (t1 - 0.5) * L;
      sph(g, rc * 0.98, P.flesh, cx, 0, 0, [0.42, 1, 1], R < 0.05 ? 12 : 16, 0.12);
      [[0.4, 0.3], [-0.35, 0.5], [0.1, -0.5]].forEach(([u, v]) => dot(g, 0.12 * rc, P.caramel, cx + 0.38 * rc, u * rc, v * rc, [0.4, 1, 1]));
    }
    if (o.split) {
      sph(g, 1, P.flesh, 0, prof(R, 0.5) * 0.8, 0, [0.36 * L, 0.18 * R, 0.5 * R], 16, 0.12);
      [[-0.18, 0.15], [0.05, -0.2], [0.2, 0.12]].forEach(([u, v]) => dot(g, 0.1 * R, P.caramel, u * L, prof(R, 0.5) * 0.96, v * R, [1, 0.35, 1]));
      [-1, 1].forEach(s => tube(g, [-0.32, -0.1, 0.12, 0.32].map(u => V3(u * L, prof(R, 0.5 + u) * 0.86, s * 0.46 * R * Math.cos(u * 2.6))), 0.07 * R, P.skinL, 8, false));
    }
    if (o.face) (o.both ? [1, -1] : [1]).forEach(s => face(g, R, hit, o.faceT ?? 0.55, s, o.up));
    return { g, hit };
  }
  function steam(p, r, x, y, z, k = 1) {
    const g = grp(p, x, y, z);
    [[0, 0, 1], [0.6, 1.3, 0.8], [-0.1, 2.4, 0.62], [0.5, 3.3, 0.45]].slice(0, 2 + k).forEach(([dx, dy, s]) => sph(g, r * s, P.steam, dx * r, dy * r, 0, [1, 0.9, 0.9], 10, 0.35));
    return g;
  }
  function sleeve(p, R, r0, r1, h, x, y, z, mat = 'paper') {
    const g = grp(p, x, y, z), col = P[mat], dk = P[mat + 'D'];
    g.add(M(new THREE.CylinderGeometry(r1, r0, h, mat === 'foil' ? 10 : 14, 1, true), clay(col, { smooth: mat !== 'foil', side: THREE.DoubleSide })));
    if (mat === 'paper') {
      [0.25, -0.05].forEach(f => { const rr = r0 + (r1 - r0) * (f + 0.5) + 0.002; g.add(M(new THREE.CylinderGeometry(rr, rr, h * 0.07, 14, 1, true), clay(P.print, { side: THREE.DoubleSide }), 0, f * h, 0)); });
      [0, 1, 2].forEach(i => { const ang = 1.3 - i * 0.08, rr = (r0 + r1) / 2 + 0.003, b = M(new THREE.BoxGeometry(0.004, h * 0.06, (0.5 - i * 0.12) * h), clay(P.print), Math.cos(ang) * rr, (-0.25 - i * 0.12) * h, Math.sin(ang) * rr); b.rotation.y = -ang; g.add(b); });
    } else {
      for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2, t = M(new THREE.ConeGeometry(0.22 * R, 0.38 * R, 4), clay(i % 2 ? col : dk), Math.cos(a) * r1 * 0.96, h / 2 + 0.1 * R, Math.sin(a) * r1 * 0.96); t.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5); g.add(t); }
      g.add(M(new THREE.TorusGeometry(r1, 0.12 * R, 4, 10), clay(dk), 0, h / 2, 0).rotateX(Math.PI / 2));
    }
    return g;
  }
  function sprout(p, r, x, y, z) {
    const g = grp(p, x, y, z);
    tube(g, [V3(0, 0, 0), V3(0.05 * r, 0.5 * r, 0), V3(0, 0.9 * r, 0)], 0.08 * r, P.leafD, 5, false);
    C.leaf(g, 0.5 * r, P.leaf, null, 0, 0.85 * r, 0).rotation.z = -0.8;
    C.leaf(g, 0.42 * r, P.leafD, null, 0, 0.8 * r, 0).rotation.z = 0.9;
    return g;
  }
  function sliceShape(s = 1) {
    const sh = new THREE.Shape();
    sh.moveTo(0, -0.045 * s); sh.quadraticCurveTo(0.09 * s, -0.06 * s, 0.16 * s, -0.115 * s);
    sh.quadraticCurveTo(0.25 * s, 0, 0.16 * s, 0.115 * s); sh.quadraticCurveTo(0.09 * s, 0.06 * s, 0, 0.045 * s); sh.closePath();
    return sh;
  }
  function slice(p, x, y, z) {
    const g = grp(p, x, y, z);
    g.add(M(ext(sliceShape(1), 0.05, 0.012, 10), clay(P.skin, { smooth: true })));
    g.add(M(ext(sliceShape(0.86), 0.064, 0.006, 10), clay(P.flesh, { smooth: true, lift: 0.12 }), 0.022, 0, 0));
    [[0.1, 0.03], [0.15, -0.04], [0.18, 0.05], [0.07, -0.01]].forEach(([u, v]) => [-1, 1].forEach(s => dot(g, 0.012, P.caramel, u, v, s * 0.038, [1, 1, 0.35])));
    return g;
  }
  return { ...C, potato, steam, sleeve, sprout, slice, face };
}

export function potatoVariants(THREE, K, X) {
  const F = potatoKit(THREE, K, X), { canHandle, spout } = canParts(THREE, K), P = SP;
  const upright = (p, R, L, x, y, z, o = {}) => { const q = F.potato(p, R, L, x, y + L / 2, z, { ...o, up: true }); q.g.rotation.z = Math.PI / 2; return q; };
  const motifA = (p, r, x, y, z) => { F.potato(p, r * 0.62, r * 2.1, x, y, z, { split: true, seg: 12 }); F.steam(p, r * 0.22, x, y + r * 0.55, z, 1); };
  const motifB = (p, r, x, y, z) => { upright(p, r * 0.55, r * 1.9, x, y - r * 0.55, z, { cut: 0.86, face: true, faceT: 0.6, tail: false }); F.sleeve(p, r * 0.55, r * 0.42, r * 0.64, r * 0.75, x, y - r * 0.2, z); };
  const motifC = (p, r, x, y, z) => { F.potato(p, r * 0.6, r * 2.0, x, y, z, { face: true, faceT: 0.5 }); F.sprout(p, r * 0.5, x + r * 0.6, y + r * 0.45, z); };
  return {
    A: {
      h: { wood: P.wood, grip: P.skinD, knob: P.skin, bands: [[P.flesh, 0.62]] }, a: P.skin, b: P.skinD, edge: P.flesh, mount: P.skinD, bag: P.skin, net: P.paper, band: P.flesh,
      motif: motifA,
      axe(g, cy) { F.slice(g, 0.015, cy - 0.01, 0); F.steam(g, 0.025, 0.17, cy + 0.1, 0, 2); },
      water(g) {
        F.potato(g, 0.12, 0.36, 0.0, 0.13, 0, { split: true, spots: [[0.25, 1.4], [0.7, 1.8], [0.4, -1.2], [0.6, -1.6]] });
        F.steam(g, 0.028, 0.07, 0.25, 0, 2);
        spout(g, P.skin, P.flesh, 0.17, 0.17); canHandle(g, P.skinD, -0.18, 0.15);
      },
      umb: {
        def: { N: 8, R: 1.0, th: 1.0, overlap: 1, shape: { w: () => 1, tip: 0.04 } },
        outer: k => k % 2 ? P.flesh : P.skin, inner: P.flesh, rim: P.skinD,
        deco: (h, k, onGore) => { if (k % 2) [[0.4, 0.08], [0.6, -0.1], [0.8, 0.08]].forEach(([th, ph]) => onGore(h, th, ph, g => F.dot(g, 0.03, P.caramel, 0, 0, 0.004, [1, 1, 0.35]))); },
        finial: c => { F.potato(c, 0.1, 0.3, 0, 0.09, 0, { split: true }); F.steam(c, 0.03, 0, 0.2, 0, 1); },
      },
    },
    B: {
      h: { wood: P.wood, grip: P.skinD, knob: P.skin, bands: [[P.paperD, 0.62]] }, a: P.paper, b: P.paperD, edge: P.print, mount: P.skinD, bag: P.paper, net: P.paper, band: P.print,
      motif: motifB,
      axe(g, cy) {
        F.potato(g, 0.075, 0.26, 0.13, cy, 0, { cut: 0.86, face: true, both: true, faceT: 0.62, tail: false });
        F.sleeve(g, 0.075, 0.07, 0.088, 0.11, 0.055, cy, 0).rotation.z = Math.PI / 2;
        F.steam(g, 0.022, 0.24, cy + 0.06, 0, 2);
      },
      water(g) {
        upright(g, 0.115, 0.36, 0.0, 0.0, 0, { cut: 0.88, face: true, faceT: 0.6, tail: false });
        F.sleeve(g, 0.115, 0.1, 0.135, 0.16, 0, 0.085, 0);
        F.steam(g, 0.03, 0.02, 0.33, 0, 1);
        spout(g, P.paper, P.print, 0.16, 0.1); canHandle(g, P.paperD, -0.16, 0.1);
      },
      umb: {
        def: { N: 8, R: 1.0, th: 1.0, overlap: 1, shape: { w: () => 1, tip: 0.03 } },
        outer: k => k % 2 ? P.paperD : P.paper, inner: P.paper, rim: P.skin,
        deco: (h, k, onGore) => { if (k % 2 === 0) [0.4, 0.5, 0.6, 0.7].forEach((th, i) => onGore(h, th, 0, g => g.add(K.M(new THREE.BoxGeometry(i ? 0.14 : 0.2, i ? 0.016 : 0.03, 0.006), K.clay(P.print))))); },
        finial: c => { upright(c, 0.08, 0.26, 0, 0.0, 0, { cut: 0.88, face: true, faceT: 0.6, tail: false }); F.sleeve(c, 0.08, 0.07, 0.095, 0.12, 0, 0.06, 0); },
      },
    },
    C: {
      h: { wood: P.woodD, grip: P.foilD, knob: P.skin, bands: [[P.foil, 0.62]] }, a: P.foil, b: P.foilD, edge: P.flesh, mount: P.foilD, bag: P.skin, net: P.foil, band: P.foil,
      motif: motifC,
      axe(g, cy) {
        F.potato(g, 0.08, 0.27, 0.15, cy, 0, { face: true, both: true, faceT: 0.55 });
        F.sleeve(g, 0.08, 0.074, 0.095, 0.1, 0.06, cy, 0, 'foil').rotation.z = -Math.PI / 2;
        F.sprout(g, 0.05, 0.28, cy + 0.04, 0).rotation.z = -0.5;
      },
      water(g) {
        F.sleeve(g, 0.12, 0.11, 0.145, 0.1, 0, 0.05, 0, 'foil');
        F.potato(g, 0.1, 0.34, 0.0, 0.15, 0, { face: true, faceT: 0.5 });
        F.sprout(g, 0.06, 0.16, 0.19, 0).rotation.z = -0.5;
        F.steam(g, 0.026, -0.08, 0.26, 0, 1);
        spout(g, P.foil, P.flesh, 0.17, 0.09); canHandle(g, P.foilD, -0.17, 0.09);
      },
      umb: {
        def: { N: 8, R: 1.0, th: 1.0, overlap: 1, shape: { w: () => 1, tip: 0.04 } },
        outer: k => k % 2 ? P.foil : P.skin, inner: P.flesh, rim: P.foilD,
        deco: (h, k, onGore) => { if (k % 2 === 0) [[0.45, 0.1], [0.7, -0.1]].forEach(([th, ph]) => onGore(h, th, ph, g => F.dot(g, 0.035, P.skinD, 0, 0, 0.004, [1.6, 0.8, 0.35]))); },
        finial: c => { F.sleeve(c, 0.09, 0.08, 0.1, 0.07, 0, 0.04, 0, 'foil'); F.potato(c, 0.075, 0.26, 0, 0.11, 0, { face: true }); F.sprout(c, 0.05, 0.12, 0.14, 0); },
      },
    },
  };
}

export const SETS = Object.freeze({
  tools_sweetpotato: {
    ico: '🍠', name: '군고구마 세트', key: 'sweetpotato', pal: SP, variants: potatoVariants,
    refs: [['owl', '기존 🦉 부엉이', '라운드 9 기준'], ['tangerine', '기존 🍊 귤', '음식 세트 기준']],
    dirs: [
      ['A', '반 가른 군고구마', '자주 껍질·금빛 속살, 도끼 날은 고구마 단면, 김 모락모락'],
      ['B', '신문지 군고구마', '신문지 봉투에 꽂힌 군고구마 친구, 윗부분이 부러져 금빛 속'],
      ['C', '호일 고구마 친구', '은박 호일 받침에 앉은 고구마, 웃는 얼굴·새싹 두 잎'],
    ],
  },
});
