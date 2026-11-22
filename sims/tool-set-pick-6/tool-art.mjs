import { simKit, baseTools } from '../tool-set-pick/tool-art.mjs';
export { simKit, baseTools };

export const WM = Object.freeze({ rind: 0x3e9a48, rindD: 0x22602c, rindL: 0xb8dc98, flesh: 0xf0505a, fleshD: 0xc83a48, seed: 0x2a1c1c, wood: 0x9a6e48, stem: 0x6a7a3a, ink: 0x2a1c1c, blush: 0xff8a90 });
export const SF = Object.freeze({ petal: 0xf6c22a, petalD: 0xe0941a, core: 0x6a4222, coreD: 0x4a2c16, dot: 0x9a6a38, cream: 0xd8ccae, stem: 0x5a9a3a, leaf: 0x4a8a34, leafD: 0x2f6a2a, wood: 0xa87a52, ink: 0x2e1e12, blush: 0xf08a6a });

export function motifKit(THREE, K, X) {
  const { clay, M, ext } = K;
  const { small } = X;
  const TAU = Math.PI * 2;
  const sph = (p, r, col, x, y, z, s = [1, 1, 1], smooth = true, ws = 12) => { const m = M(new THREE.SphereGeometry(r, ws, Math.max(6, ws * 0.75 | 0)), clay(col, { smooth }), x, y, z); m.scale.set(...s); p.add(m); return m; };
  const leafShape = (w, l) => { const s = new THREE.Shape(); s.moveTo(0, 0); s.bezierCurveTo(l * 0.3, w, l * 0.75, w * 0.8, l, 0); s.bezierCurveTo(l * 0.75, -w * 0.8, l * 0.3, -w, 0, 0); return s; };
  function leaf(p, w, l, x, y, z, rz, ry = 0, col = SF.leaf) { const m = M(ext(leafShape(w, l), w * 0.18, w * 0.06, 6), clay(col, { smooth: true }), x, y, z); m.rotation.set(0, ry, rz); p.add(m); return m; }
  function sector(r0, r1, a0, a1) {
    const s = new THREE.Shape();
    s.moveTo(Math.cos(a0) * r0, Math.sin(a0) * r0); s.absarc(0, 0, r1, a0, a1, false);
    if (r0 > 0) s.absarc(0, 0, r0, a1, a0, true); else s.lineTo(0, 0);
    s.closePath(); return s;
  }
  function face(g, r, fz, s = 1, col = WM.ink, blush = WM.blush, eyeHi = SF.cream) {
    [-1, 1].forEach(sx => {
      g.add(small(M(new THREE.SphereGeometry(r * 0.13, 8, 6), clay(col, { smooth: true }), sx * r * 0.32, r * 0.1, fz)));
      g.add(small(M(new THREE.SphereGeometry(r * 0.04, 5, 4), clay(eyeHi), sx * r * 0.29, r * 0.14, fz + s * r * 0.1)));
      sph(g, r * 0.12, blush, sx * r * 0.56, -r * 0.12, fz - s * r * 0.04, [1, 0.7, 0.4], true, 8);
    });
    const sm = M(new THREE.TorusGeometry(r * 0.15, r * 0.04, 5, 10, Math.PI), clay(col), 0, -r * 0.08, fz); sm.rotation.z = Math.PI; if (s < 0) sm.rotation.y = Math.PI; g.add(sm);
  }
  function curl(p, r, x, y, z, col = WM.stem) {
    const c = M(new THREE.TorusGeometry(r, r * 0.28, 5, 10, Math.PI * 1.5), clay(col), x, y + r, z); c.rotation.y = Math.PI / 2; p.add(c);
    p.add(M(new THREE.CylinderGeometry(r * 0.3, r * 0.4, r * 1.2, 6), clay(col), x, y + r * 0.2, z));
  }
  function melon(p, R, x, y, z, o = {}) {
    const g = new THREE.Group(); g.position.set(x, y, z); p.add(g);
    const sz = o.sz ?? 1, sy = o.sy ?? 0.92, n = o.stripes ?? 8;
    sph(g, R, WM.rind, 0, 0, 0, [1, sy, sz], true, 18);
    for (let i = 0; i < n; i++) {
      const a = i * TAU / n + (o.rot ?? 0);
      if (o.skip && o.skip(a)) continue;
      const st = M(new THREE.SphereGeometry(R * 1.012, 2, 10, a, 0.24, 0.16, Math.PI - 0.32), clay(WM.rindD, { smooth: true }));
      st.scale.set(1, sy, sz); g.add(st);
    }
    if (o.stem !== false) curl(g, R * 0.1, 0, R * sy * 0.96, 0);
    const faces = o.face === 'both' ? [1, -1] : o.face ? [1] : [];
    faces.forEach(s => face(g, R, R * sz * 0.98 * s, s, WM.ink, WM.blush, WM.rindL));
    return g;
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
    seeds(g, pts, R * 0.045, zf, o.oneSide ? null : -zf);
    return g;
  }
  function halfMoon(p, R, x, y, z, o = {}) {
    const g = new THREE.Group(); g.position.set(x, y, z); p.add(g);
    const d = o.d ?? R * 0.32, a0 = o.a0 ?? -Math.PI / 2, a1 = o.a1 ?? Math.PI / 2;
    g.add(M(ext(sector(0, R, a0, a1), d, R * 0.04, 16), clay(WM.rind, { smooth: true })));
    g.add(M(ext(sector(0, R * 0.9, a0 + 0.02, a1 - 0.02), d + R * 0.05, 0, 16), clay(WM.rindL)));
    g.add(M(ext(sector(0, R * 0.82, a0 + 0.03, a1 - 0.03), d + R * 0.09, 0, 16), clay(WM.flesh, { smooth: true })));
    const zf = d / 2 + R * 0.045, mid = (a0 + a1) / 2, fr = R * 0.62, cx = Math.cos(mid) * R * 0.42, cy = Math.sin(mid) * R * 0.42;
    const sides = o.both === false ? [1] : [1, -1];
    sides.forEach(s => {
      const f = new THREE.Group(); f.position.set(cx, cy, 0); g.add(f);
      face(f, fr, s * zf, s, WM.ink, WM.blush, WM.rindL);
    });
    const pts = [[0.72, 0.62], [0.72, -0.62], [0.62, 0.95], [0.62, -0.95]].map(([rr, da]) => [Math.cos(mid + da) * R * rr, Math.sin(mid + da) * R * rr, mid + da - Math.PI / 2]);
    seeds(g, pts, R * 0.04, zf, sides.length > 1 ? -zf : null);
    return g;
  }
  function bowl(p, R, x, y, z, o = {}) {
    const g = new THREE.Group(); g.position.set(x, y, z); p.add(g);
    const sy = o.sy ?? 1.12;
    const b = M(new THREE.SphereGeometry(R, 18, 9, 0, TAU, Math.PI / 2, Math.PI / 2), clay(WM.rind, { smooth: true })); b.scale.y = sy; g.add(b);
    const n = o.stripes ?? 8;
    for (let i = 0; i < n; i++) {
      const a = i * TAU / n + (o.rot ?? 0);
      if (o.skip && o.skip(a)) continue;
      const st = M(new THREE.SphereGeometry(R * 1.012, 2, 5, a, 0.24, Math.PI / 2 + 0.02, Math.PI / 2 - 0.2), clay(WM.rindD, { smooth: true })); st.scale.y = sy; g.add(st);
    }
    g.add(M(new THREE.CylinderGeometry(R * 0.995, R * 0.995, R * 0.06, 20), clay(WM.rindL), 0, R * 0.02, 0));
    g.add(M(new THREE.CylinderGeometry(R * 0.9, R * 0.9, R * 0.08, 20), clay(WM.flesh, { smooth: true }), 0, R * 0.05, 0));
    for (let i = 0; i < (o.seeds ?? 7); i++) {
      const a = i * 2.39996 + 0.4, rr = R * (0.3 + 0.45 * ((i * 0.618) % 1));
      const sd = sph(g, R * 0.05, WM.seed, Math.cos(a) * rr, R * 0.095, Math.sin(a) * rr, [0.6, 0.35, 1], true, 6); sd.rotation.y = -a;
    }
    if (o.face) { const f = new THREE.Group(); f.position.set(0, -R * sy * 0.4, 0); g.add(f); face(f, R * 0.72, R * 0.93, 1, WM.ink, WM.blush, WM.rindL); }
    return g;
  }
  function flower(p, R, x, y, z, o = {}) {
    const g = new THREE.Group(); g.position.set(x, y, z); p.add(g);
    const n = o.n ?? 12, pl = R * 0.62, pw = R * 0.22, d = o.d ?? R * 0.12, c = R * 0.48;
    for (let i = 0; i < n; i++) {
      const a = i * TAU / n;
      if (o.skip && o.skip(a)) continue;
      const pt = M(ext(leafShape(pw, pl), d, 0, 5), clay(i % 2 ? SF.petalD : SF.petal, { smooth: true }), Math.cos(a) * c * 0.8, Math.sin(a) * c * 0.8, i % 2 ? -d * 0.25 : d * 0.25); pt.rotation.z = a; g.add(pt);
    }
    const cz = o.cz ?? 0.55;
    sph(g, c, SF.core, 0, 0, 0, [1, 1, cz], true, 16);
    const faces = o.face === 'both' ? [1, -1] : o.face ? [1] : [];
    const dotSides = o.dots === false || o.face === 'both' ? [] : o.oneSide || o.face ? [o.face ? -1 : 1] : [1, -1];
    dotSides.forEach(s => {
      for (let i = 0; i < 14; i++) {
        const a = i * 2.39996, rr = c * 0.78 * Math.sqrt((i + 0.5) / 14);
        const zz = s * c * cz * Math.sqrt(Math.max(0, 1 - (rr / c) ** 2)) * 0.99;
        g.add(small(M(new THREE.SphereGeometry(c * 0.07, 5, 3), clay(i % 3 ? SF.coreD : SF.dot), Math.cos(a) * rr, Math.sin(a) * rr, zz)));
      }
    });
    faces.forEach(s => face(g, c, s * c * cz * 0.97, s, SF.ink, SF.blush, SF.cream));
    return { g };
  }
  function seed(p, s, x, y, z, o = {}) {
    const g = new THREE.Group(); g.position.set(x, y, z); p.add(g);
    const sc = o.sc ?? [0.62, 1, 0.42];
    sph(g, s, SF.coreD, 0, 0, 0, sc, true, 14);
    [-0.5, 0, 0.5].forEach(a => [0, Math.PI].forEach(ry => { const st = M(new THREE.SphereGeometry(s * 1.015, 2, 10, a - 0.07 + Math.PI / 2, 0.14, 0.2, Math.PI - 0.4), clay(SF.cream, { smooth: true })); st.scale.set(...sc); st.rotation.y = ry; g.add(st); }));
    sph(g, s * 0.2, SF.coreD, 0, s * 0.95, 0, [0.7, 1, 0.7], true, 6);
    if (o.sprout) [-1, 1].forEach(sx => leaf(g, s * 0.22, s * 0.6, 0, s * 0.98, 0, Math.PI / 2 - sx * 0.85, 0, sx > 0 ? SF.leaf : SF.stem));
    if (o.face) face(g, s * 0.62, s * sc[2] * 0.97, 1, SF.ink, SF.blush, SF.cream);
    return g;
  }
  return { sph, leaf, sector, face, curl, melon, wedge, halfMoon, bowl, flower, seed };
}

const H = (X, g, wood, grip, knob, bands = []) => X.handle(g, { wood, grip, knob, bands }, 0.52, 0.03);
const canHandleK = (THREE, K) => (g, col, x = -0.17) => g.add(K.M(new THREE.TorusGeometry(0.075, 0.015, 5, 12, Math.PI * 1.05), K.clay(col), x, 0.2, 0).rotateZ(Math.PI / 2 + 0.25));
const spoutK = (THREE, K) => (g, col, x = 0.17) => { const sp = K.M(new THREE.CylinderGeometry(0.02, 0.032, 0.22, 8), K.clay(col), x, 0.25, 0); sp.rotation.z = -0.9; g.add(sp); };
const backArc = a => Math.cos(a) < -0.55;

export function watermelonThemes(THREE, K, X) {
  const { clay, M } = K;
  const T = motifKit(THREE, K, X), canHandle = canHandleK(THREE, K), spout = spoutK(THREE, K);
  const knob = col => g => g.add(M(new THREE.SphereGeometry(0.042, 8, 6), clay(col, { smooth: true }), 0, -0.1, 0));
  return {
    A: {
      axe(g) {
        const top = H(X, g, WM.wood, WM.rindD, WM.rind, [[WM.rind, 0.62]]), cy = top - 0.05;
        g.add(M(new THREE.BoxGeometry(0.06, 0.1, 0.07), clay(WM.rindD), 0, cy, 0));
        T.melon(g, 0.108, 0.118, cy - 0.01, 0, { sz: 0.42, stripes: 10, rot: 0.15 });
        g.scale.setScalar(1.18);
      },
      water(g) {
        T.melon(g, 0.135, 0, 0.15, 0, { stripes: 10, rot: 0.1, skip: backArc, stem: false });
        T.curl(g, 0.016, 0.02, 0.27, 0);
        spout(g, WM.rindD);
        canHandle(g, WM.rindD);
        g.scale.setScalar(1.25);
      },
      rod(g) {
        X.rodFrame(g, { knobFn: knob(WM.rind), rear: clay(WM.rindD), line: 0xe8dcd0, pole: (p, L) => {
          p.add(M(new THREE.CylinderGeometry(0.013, 0.026, L, 7), clay(WM.rind), 0, L / 2, 0));
          [0.3, 0.55, 0.8].forEach(f => p.add(M(new THREE.CylinderGeometry(0.027 - f * 0.013, 0.027 - f * 0.013, 0.02, 8), clay(WM.rindD), 0, L * f, 0)));
        } }, b => T.melon(b, 0.058, 0, -0.04, 0, { stripes: 6 }));
      },
    },
    B: {
      axe(g) {
        const top = H(X, g, WM.rindL, WM.rind, WM.flesh, [[WM.flesh, 0.62]]), cy = top - 0.05;
        g.add(M(new THREE.BoxGeometry(0.06, 0.1, 0.07), clay(WM.rind), 0, cy, 0));
        T.wedge(g, 0.2, 0.01, cy, 0, { a0: -0.6, a1: 0.6, d: 0.036, seeds: 6 });
        g.scale.setScalar(1.18);
      },
      water(g) {
        g.add(M(new THREE.CylinderGeometry(0.118, 0.122, 0.2, 18), clay(WM.flesh, { smooth: true }), 0, 0.18, 0));
        g.add(M(new THREE.CylinderGeometry(0.126, 0.128, 0.05, 18), clay(WM.rind, { smooth: true }), 0, 0.085, 0));
        g.add(M(new THREE.CylinderGeometry(0.124, 0.124, 0.014, 18), clay(WM.rindL), 0, 0.117, 0));
        for (let i = 0; i < 9; i++) {
          const a = i * 0.7 - 1.2, yy = 0.16 + (i % 3) * 0.045;
          if (backArc(a)) continue;
          const sd = T.sph(g, 0.012, WM.seed, Math.cos(a) * 0.12, yy, Math.sin(a) * 0.12, [0.6, 1, 0.35], true, 6); sd.rotation.y = Math.PI / 2 - a;
        }
        T.wedge(g, 0.11, 0, 0.27, 0, { a0: Math.PI / 2 - 0.5, a1: Math.PI / 2 + 0.5, d: 0.03, seeds: 4 });
        spout(g, WM.rind);
        canHandle(g, WM.rind);
        g.scale.setScalar(1.25);
      },
      rod(g) {
        X.rodFrame(g, { knobFn: knob(WM.flesh), rear: clay(WM.rind), line: 0xe8dcd0, pole: (p, L) => {
          p.add(M(new THREE.CylinderGeometry(0.013, 0.026, L, 7), clay(WM.rindL), 0, L / 2, 0));
          [0.25, 0.45, 0.65, 0.85].forEach(f => p.add(M(new THREE.CylinderGeometry(0.027 - f * 0.013, 0.027 - f * 0.013, 0.02, 8), clay(WM.flesh), 0, L * f, 0)));
        } }, b => T.wedge(b, 0.085, 0, 0.03, 0, { a0: -Math.PI / 2 - 0.5, a1: -Math.PI / 2 + 0.5, d: 0.022, seeds: 3 }));
      },
    },
    C: {
      axe(g) {
        const top = H(X, g, WM.wood, WM.rindD, WM.flesh, [[WM.rindL, 0.62]]), cy = top - 0.05;
        g.add(M(new THREE.BoxGeometry(0.06, 0.1, 0.07), clay(WM.rindD), 0, cy, 0));
        T.halfMoon(g, 0.15, 0.015, cy, 0, { d: 0.04 });
        g.scale.setScalar(1.18);
      },
      water(g) {
        T.bowl(g, 0.138, 0, 0.2, 0, { stripes: 10, rot: 0.1, skip: backArc, face: true });
        spout(g, WM.rind);
        canHandle(g, WM.rindD);
        g.scale.setScalar(1.25);
      },
      rod(g) {
        X.rodFrame(g, { knobFn: knob(WM.flesh), rear: clay(WM.rindD), line: 0xe8dcd0, pole: (p, L) => {
          p.add(M(new THREE.CylinderGeometry(0.013, 0.026, L, 7), clay(WM.wood), 0, L / 2, 0));
          p.add(M(new THREE.CylinderGeometry(0.02, 0.02, 0.03, 8), clay(WM.rind), 0, L * 0.5, 0));
        } }, b => T.bowl(b, 0.06, 0, -0.02, 0, { stripes: 6, seeds: 4, face: true }));
      },
    },
  };
}

export function sunflowerThemes(THREE, K, X) {
  const { clay, M } = K;
  const T = motifKit(THREE, K, X), canHandle = canHandleK(THREE, K), spout = spoutK(THREE, K);
  const knob = col => g => g.add(M(new THREE.SphereGeometry(0.042, 8, 6), clay(col, { smooth: true }), 0, -0.1, 0));
  return {
    A: {
      axe(g) {
        const top = H(X, g, SF.stem, SF.leafD, SF.petal, [[SF.petal, 0.62]]), cy = top - 0.05;
        g.add(M(new THREE.BoxGeometry(0.06, 0.1, 0.07), clay(SF.leafD), 0, cy, 0));
        T.flower(g, 0.17, 0.115, cy, 0, { d: 0.022, cz: 0.32 });
        g.scale.setScalar(1.18);
      },
      water(g) {
        g.add(M(new THREE.CylinderGeometry(0.11, 0.118, 0.19, 16), clay(SF.stem, { smooth: true }), 0, 0.15, 0));
        const { g: f } = T.flower(g, 0.28, 0, 0.255, 0, { d: 0.022, cz: 0.45, skip: a => Math.cos(a) < -0.35, oneSide: true });
        f.rotation.x = -Math.PI / 2;
        T.leaf(g, 0.035, 0.1, 0.06, 0.1, 0.1, 0.25, -0.5, SF.leaf);
        spout(g, SF.leafD, 0.18);
        canHandle(g, SF.leafD);
        g.scale.setScalar(1.25);
      },
      rod(g) {
        X.rodFrame(g, { knobFn: knob(SF.petal), rear: clay(SF.leafD), line: 0xe8dcd0, pole: (p, L) => {
          p.add(M(new THREE.CylinderGeometry(0.013, 0.026, L, 7), clay(SF.stem), 0, L / 2, 0));
          [0.35, 0.65].forEach((f, i) => T.leaf(p, 0.016, 0.05, 0, L * f, 0, i ? 2.6 : 0.5, 0, SF.leaf));
        } }, b => T.flower(b, 0.1, 0, -0.03, 0, { d: 0.014, cz: 0.4, n: 10 }));
      },
    },
    B: {
      axe(g) {
        const top = H(X, g, SF.wood, SF.coreD, SF.cream, [[SF.cream, 0.62]]), cy = top - 0.05;
        g.add(M(new THREE.BoxGeometry(0.06, 0.1, 0.07), clay(SF.coreD), 0, cy, 0));
        const s = T.seed(g, 0.125, 0.115, cy, 0, { sc: [0.62, 1, 0.24] }); s.rotation.z = -Math.PI / 2;
        T.leaf(g, 0.028, 0.08, 0.11, cy + 0.07, 0, 1.2, 0, SF.leaf);
        T.leaf(g, 0.024, 0.07, 0.11, cy + 0.07, 0, 2.0, 0, SF.stem);
        g.scale.setScalar(1.18);
      },
      water(g) {
        const s = T.seed(g, 0.17, 0, 0.16, 0, { sc: [0.78, 0.86, 0.74], face: true }); s.rotation.z = -0.15;
        [-1, 1].forEach(sx => T.leaf(g, 0.032, 0.095, 0.0, 0.3, 0, Math.PI / 2 - sx * 0.8, Math.PI / 2, sx > 0 ? SF.leaf : SF.stem));
        spout(g, SF.coreD);
        canHandle(g, SF.coreD);
        g.scale.setScalar(1.25);
      },
      rod(g) {
        X.rodFrame(g, { knobFn: knob(SF.cream), rear: clay(SF.coreD), line: 0xe8dcd0, pole: (p, L) => {
          p.add(M(new THREE.CylinderGeometry(0.013, 0.026, L, 7), clay(SF.wood), 0, L / 2, 0));
          [0.25, 0.45, 0.65, 0.85].forEach(f => p.add(M(new THREE.CylinderGeometry(0.027 - f * 0.013, 0.027 - f * 0.013, 0.02, 8), clay(SF.coreD), 0, L * f, 0)));
        } }, b => T.seed(b, 0.065, 0, -0.04, 0, { sprout: true }));
      },
    },
    C: {
      axe(g) {
        const top = H(X, g, SF.stem, SF.leafD, SF.petal, [[SF.leaf, 0.62]]), cy = top - 0.05;
        g.add(M(new THREE.BoxGeometry(0.06, 0.1, 0.07), clay(SF.leafD), 0, cy, 0));
        T.flower(g, 0.17, 0.115, cy, 0, { d: 0.022, cz: 0.4, face: 'both' });
        g.scale.setScalar(1.18);
      },
      water(g) {
        g.add(M(new THREE.CylinderGeometry(0.1, 0.112, 0.17, 16), clay(SF.stem, { smooth: true }), 0, 0.1, 0));
        const { g: f } = T.flower(g, 0.25, 0.01, 0.24, 0.0, { d: 0.022, cz: 0.6, face: true, skip: a => Math.cos(a) < -0.4 });
        f.rotation.y = 0.35;
        spout(g, SF.leafD, 0.17);
        canHandle(g, SF.leafD);
        g.scale.setScalar(1.25);
      },
      rod(g) {
        X.rodFrame(g, { knobFn: knob(SF.petal), rear: clay(SF.leafD), line: 0xe8dcd0, pole: (p, L) => {
          p.add(M(new THREE.CylinderGeometry(0.013, 0.026, L, 7), clay(SF.stem), 0, L / 2, 0));
          T.leaf(p, 0.018, 0.055, 0, L * 0.5, 0, 0.5, 0, SF.leaf);
        } }, b => T.flower(b, 0.11, 0, -0.03, 0, { d: 0.014, cz: 0.5, n: 10, face: true }));
      },
    },
  };
}

export const SETS = Object.freeze({
  tools_watermelon: {
    ico: '🍉', name: '수박 세트', pal: WM, themes: watermelonThemes, key: 'watermelon',
    refs: [['strawberry', '기존 🍓 딸기', '빨강 딸기·노랑 씨·초록 꼭지'], ['tangerine', '기존 🍊 귤', '주황 귤·초록 잎']],
    dirs: [
      ['A', '수박 한 통', '날이 납작한 초록 줄무늬 수박, 물통은 통통한 수박 한 통, 꼭지는 꼬불 줄기'],
      ['B', '삼각 수박 조각', '날이 빨간 삼각 조각(초록 껍질이 날끝, 까만 씨), 물통 뚜껑에도 조각'],
      ['C', '웃는 반달 수박', '날이 양면 웃는 반달 수박, 물통은 웃는 반 통 수박(빨간 속 위 씨)'],
    ],
  },
  tools_sunflower: {
    ico: '🌻', name: '해바라기 세트', pal: SF, themes: sunflowerThemes, key: 'sunflower',
    refs: [['bloom', '기존 🌸 꽃정원', '분홍 꽃잎·초록 덩굴'], ['honey', '기존 🍯 꿀', '노랑 벌집 날·꿀방울']],
    dirs: [
      ['A', '해바라기 꽃', '날이 노란 꽃잎 고리와 갈색 씨 가운데, 물통 위에 하늘 보는 해바라기'],
      ['B', '해바라기 씨', '날이 줄무늬 씨앗과 새싹 두 장, 물통은 웃는 통통한 씨앗'],
      ['C', '웃는 해바라기', '날이 양면 웃는 해바라기, 물통도 앞을 보는 웃는 꽃'],
    ],
  },
});

const DIR_SPEC = {
  watermelonA: T => ({ h: { wood: WM.wood, grip: WM.rindD, knob: WM.rind, bands: [[WM.rind, 0.62]] }, a: WM.rind, b: WM.rindD, edge: WM.rindL, mount: WM.rindD, bag: WM.rind, net: WM.rindL,
    motif: (p, r, x, y, z) => T.melon(p, r, x, y, z, { stripes: 6 }) }),
  watermelonB: T => ({ h: { wood: WM.rindL, grip: WM.rind, knob: WM.flesh, bands: [[WM.flesh, 0.62]] }, a: WM.flesh, b: WM.fleshD, edge: WM.rind, mount: WM.rind, bag: WM.flesh, net: WM.rindL,
    motif: (p, r, x, y, z) => T.wedge(p, r * 1.6, x, y - r * 0.7, z, { a0: Math.PI / 2 - 0.5, a1: Math.PI / 2 + 0.5, d: r * 0.4, seeds: 3 }) }),
  watermelonC: T => ({ h: { wood: WM.wood, grip: WM.rindD, knob: WM.flesh, bands: [[WM.rindL, 0.62]] }, a: WM.rind, b: WM.flesh, edge: WM.rindL, mount: WM.rindD, bag: WM.rind, net: WM.rindL,
    motif: (p, r, x, y, z) => T.bowl(p, r * 1.1, x, y, z, { stripes: 6, seeds: 4, face: true }) }),
  sunflowerA: T => ({ h: { wood: SF.stem, grip: SF.leafD, knob: SF.petal, bands: [[SF.petal, 0.62]] }, a: SF.petal, b: SF.petalD, edge: SF.core, mount: SF.leafD, bag: SF.petal, net: SF.leaf,
    motif: (p, r, x, y, z) => T.flower(p, r * 2.1, x, y, z, { d: r * 0.2, cz: 0.45, n: 10 }).g }),
  sunflowerB: T => ({ h: { wood: SF.wood, grip: SF.coreD, knob: SF.cream, bands: [[SF.cream, 0.62]] }, a: SF.core, b: SF.coreD, edge: SF.cream, mount: SF.coreD, bag: SF.cream, net: SF.core,
    motif: (p, r, x, y, z) => T.seed(p, r * 1.1, x, y, z, { sprout: true }) }),
  sunflowerC: T => ({ h: { wood: SF.stem, grip: SF.leafD, knob: SF.petal, bands: [[SF.leaf, 0.62]] }, a: SF.petal, b: SF.petalD, edge: SF.core, mount: SF.leafD, bag: SF.petal, net: SF.leaf,
    motif: (p, r, x, y, z) => T.flower(p, r * 2.1, x, y, z, { d: r * 0.2, cz: 0.5, n: 10, face: true }).g }),
};

export function portThemes(THREE, K, X) {
  const { clay, M, ext } = K;
  const { roundBlade, pickArms, sickleBlade, netBag } = X;
  const T = motifKit(THREE, K, X), out = {};
  const base = { watermelon: watermelonThemes(THREE, K, X), sunflower: sunflowerThemes(THREE, K, X) };
  Object.entries(DIR_SPEC).forEach(([key, spec]) => {
    const D = spec(T), src = base[key.slice(0, -1)][key.slice(-1)];
    const Hh = (g, l, r = 0.03) => X.handle(g, D.h, l, r);
    out[key] = {
      axe: src.axe, water: src.water, rod: src.rod,
      hoe(g) {
        const top = Hh(g, 0.52), hd = new THREE.Group(); hd.position.y = top + 0.01; g.add(hd);
        hd.add(M(new THREE.BoxGeometry(0.08, 0.08, 0.075), clay(D.mount)));
        pickArms(hd, [clay(D.a), clay(D.b)], clay(D.edge));
        D.motif(hd, 0.05, 0, 0.085, 0);
        g.scale.setScalar(1.18);
      },
      seed(g) {
        T.sph(g, 0.11, D.bag, 0, 0.09, 0, [1, 1.05, 1], true, 14);
        g.add(M(new THREE.CylinderGeometry(0.045, 0.065, 0.05, 10), clay(D.mount), 0, 0.2, 0));
        g.add(M(new THREE.TorusGeometry(0.05, 0.011, 5, 12), clay(D.edge), 0, 0.2, 0).rotateX(Math.PI / 2));
        D.motif(g, 0.065, 0, 0.09, 0.075);
        g.scale.setScalar(1.25);
      },
      sickle(g) {
        const top = Hh(g, 0.30, 0.034);
        const { bl, tip } = sickleBlade(g, top, [clay(D.a), clay(D.a), clay(D.b)], clay(D.edge), 1.2);
        D.motif(bl, 0.04, tip.x, tip.y + 0.01, 0);
        g.add(M(new THREE.CylinderGeometry(0.032, 0.04, 0.05, 9), clay(D.mount), 0, top - 0.01, 0));
        g.scale.setScalar(1.18);
      },
      shovel(g) {
        const top = Hh(g, 0.58), by = top + 0.03;
        g.add(M(new THREE.CylinderGeometry(0.036, 0.044, 0.07, 9), clay(D.mount), 0, top + 0.01, 0));
        g.add(M(ext(roundBlade(0.105, 0.13), 0.03, 0.01, 14), clay(D.a, { smooth: true }), 0, by, 0));
        D.motif(g, 0.06, 0, by + 0.12, 0.03);
        g.scale.setScalar(1.18);
      },
      hammer(g) {
        const top = Hh(g, 0.50), y = top - 0.04;
        const head = M(new THREE.CylinderGeometry(0.05, 0.05, 0.15, 12), clay(D.b, { smooth: true }), 0, y, 0); head.rotation.z = Math.PI / 2; g.add(head);
        [-1, 1].forEach(sx => D.motif(g, 0.058, sx * 0.1, y, 0));
        g.scale.setScalar(1.18);
      },
      net(g) {
        g.add(M(new THREE.CylinderGeometry(0.024, 0.028, 0.66, 7), clay(D.h.wood), 0, 0.27, 0));
        g.add(M(new THREE.SphereGeometry(0.04, 8, 6), clay(D.h.knob, { smooth: true }), 0, -0.08, 0));
        g.add(M(new THREE.TorusGeometry(0.17, 0.02, 6, 20), clay(D.a), 0, 0.6, 0).rotateX(Math.PI / 2));
        g.add(M(new THREE.ConeGeometry(0.16, 0.3, 12, 1, true), netBag(D.net, 0.5), 0, 0.75, 0));
        D.motif(g, 0.05, 0, 0.62, 0.17);
        g.scale.setScalar(1.25);
      },
    };
  });
  return out;
}

export const UMBRELLA_DEFS = Object.freeze({
  watermelonA: { N: 10, R: 0.95, th: 1.05, overlap: 1, shape: { w: () => 1, tip: 0 } },
  watermelonB: { N: 8, R: 1.0, th: 0.95, overlap: 1, shape: { w: () => 1, tip: 0.02 } },
  watermelonC: { N: 8, R: 1.0, th: 0.95, overlap: 1, shape: { w: () => 1, tip: 0.02 } },
  sunflowerA: { N: 12, R: 1.0, th: 0.95, overlap: 1.05, shape: { w: () => 1, tip: 0.12 } },
  sunflowerB: { N: 10, R: 0.98, th: 1.0, overlap: 1, shape: { w: () => 1, tip: 0 } },
  sunflowerC: { N: 12, R: 1.0, th: 0.95, overlap: 1.05, shape: { w: () => 1, tip: 0.12 } },
});

export function buildUmbrellaSim(THREE, K, X, theme, L = 1.55) {
  const def = UMBRELLA_DEFS[theme], { clay, M, V } = K, T = motifKit(THREE, K, X), root = new THREE.Group();
  const D = DIR_SPEC[theme](T);
  function goreGeo(R, thMax, halfW, shape) {
    const W = 8, Hh = 9, pos = [], idx = [];
    for (let j = 0; j <= Hh; j++) { const v = j / Hh; for (let i = 0; i <= W; i++) { const u = i / W * 2 - 1, phi = u * halfW * shape.w(v), th = thMax * v * (1 + shape.tip * (1 - u * u)); pos.push(-Math.cos(phi) * Math.sin(th) * R, (Math.cos(th) - 1) * R, Math.sin(phi) * Math.sin(th) * R); } }
    for (let j = 0; j < Hh; j++) for (let i = 0; i < W; i++) { const a = j * (W + 1) + i, b = a + 1, c = a + W + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals(); return geo;
  }
  const onGore = (h, th, ph, fn) => { const { p, n } = X.goreSurf(def.R * 1.004, th, ph); const g = new THREE.Group(); g.position.copy(p); g.quaternion.setFromUnitVectors(V(0, 0, 1), n); h.add(g); fn(g); };
  const dot = (h, th, ph, r, col, s = [1, 1, 0.4]) => onGore(h, th, ph, g => T.sph(g, r, col, 0, 0, 0, s, true, 8));
  const seedDot = (h, th, ph) => dot(h, th, ph, 0.035, WM.seed, [0.6, 1, 0.35]);
  const rim = (c, col, r = 0.04) => c.add(M(new THREE.TorusGeometry(def.R * Math.sin(def.th) * 0.995, r, 6, 40), clay(col), 0, (Math.cos(def.th) - 1) * def.R, 0).rotateX(Math.PI / 2));
  const cap = (c, r, col, sy = 0.5) => T.sph(c, r, col, 0, 0.0, 0, [1, sy, 1], true, 14);
  root.add(M(new THREE.CylinderGeometry(0.022, 0.027, L, 7), clay(D.h.wood), 0, L / 2, 0));
  const j = M(new THREE.TorusGeometry(0.07, 0.022, 6, 14, Math.PI), clay(D.h.knob), 0.07, 0, 0); j.rotation.z = Math.PI; root.add(j);
  const coreDots = (c, R, h) => { for (let i = 0; i < 18; i++) { const a = i * 2.39996, rr = R * 0.84 * Math.sqrt((i + 0.5) / 18); T.sph(c, R * 0.07, i % 3 ? SF.coreD : SF.dot, Math.cos(a) * rr, h * Math.sqrt(Math.max(0, 1 - (rr / R) ** 2)), Math.sin(a) * rr, [1, 0.5, 1], true, 6); } };
  const look = {
    watermelonA: { outer: k => k % 2 ? WM.rindD : WM.rind, inner: WM.flesh, deco: () => {}, finial: c => { rim(c, WM.rindL, 0.03); T.curl(c, 0.06, 0, 0.0, 0); T.leaf(c, 0.07, 0.22, 0.02, 0.02, 0, 0.3, 0.3, SF.leaf); } },
    watermelonB: { outer: () => WM.flesh, inner: WM.rindL, deco: (h, k) => [[0.4, 0.1 * (k % 2 ? 1 : -1)], [0.72, -0.12], [0.72, 0.12]].forEach(([t, p]) => seedDot(h, t, p)), finial: c => { rim(c, WM.rind, 0.05); rim(c, WM.rindL, 0.025); cap(c, 0.08, WM.rind); } },
    watermelonC: { outer: () => WM.flesh, inner: WM.rindL, deco: (h, k) => { if (k % 2) seedDot(h, 0.55, 0); }, finial: c => { rim(c, WM.rind, 0.05); T.bowl(c, 0.17, 0, 0.1, 0, { stripes: 8, seeds: 5, face: true }); } },
    sunflowerA: { outer: k => k % 2 ? SF.petalD : SF.petal, inner: SF.petal, deco: () => {}, finial: c => { cap(c, 0.36, SF.core, 0.28); coreDots(c, 0.36, 0.1); } },
    sunflowerB: { outer: k => k % 2 ? SF.cream : SF.coreD, inner: SF.core, deco: () => {}, finial: c => { cap(c, 0.08, SF.coreD); [-1, 1].forEach(sx => T.leaf(c, 0.06, 0.2, 0, 0.03, 0, Math.PI / 2 - sx * 0.9, 0, sx > 0 ? SF.leaf : SF.stem)); } },
    sunflowerC: { outer: k => k % 2 ? SF.petalD : SF.petal, inner: SF.petal, deco: () => {}, finial: c => { cap(c, 0.3, SF.core, 0.25); const f = T.flower(c, 0.3, 0, 0.16, 0, { d: 0.03, cz: 0.6, n: 10, face: true }).g; f.rotation.y = 0.2; } },
  }[theme];
  const canopy = new THREE.Group(); canopy.position.y = L; root.add(canopy);
  const og = goreGeo(def.R, def.th, Math.PI / def.N * def.overlap, def.shape), ig = goreGeo(def.R * 0.985, def.th, Math.PI / def.N * def.overlap, def.shape);
  for (let k = 0; k < def.N; k++) {
    const piv = new THREE.Group(); piv.rotation.y = k * Math.PI * 2 / def.N; canopy.add(piv);
    piv.add(new THREE.Mesh(og.clone(), clay(look.outer(k), { smooth: true })), new THREE.Mesh(ig.clone(), clay(look.inner, { side: THREE.BackSide })));
    look.deco(piv, k);
  }
  look.finial(canopy);
  return root;
}
