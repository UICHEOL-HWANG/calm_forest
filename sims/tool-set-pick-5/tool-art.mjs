import { simKit, baseTools } from '../tool-set-pick/tool-art.mjs';
export { simKit, baseTools };

export const PG = Object.freeze({ navy: 0x2a3348, navyL: 0x45537a, belly: 0xd0d6de, beak: 0xf0a030, feet: 0xe88a34, blush: 0xf0a0b0, ink: 0x1c1f28, ice: 0x8ccde0, iceD: 0x4a98b8, snow: 0xc8d6e2, chick: 0x9aa2ae, chickD: 0x737b88, scarf: 0xe8606a });
export const TG = Object.freeze({ peel: 0xff9a2a, peelD: 0xe2741c, flesh: 0xffc458, pith: 0xe8d2b4, leaf: 0x4a9a48, leafD: 0x2f6e34, wood: 0xa87a52, ink: 0x3a2618, blush: 0xf07a6a, stem: 0x6a7a3a });

const BLADE = [[0.02, -0.045], [0.14, -0.095], [0.19, -0.105], [0.205, 0], [0.19, 0.105], [0.14, 0.095], [0.02, 0.045]];
const EDGE = [[0.18, -0.108], [0.205, -0.112], [0.222, 0], [0.205, 0.112], [0.18, 0.108], [0.198, 0]];

export function motifKit(THREE, K, X) {
  const { clay, M, ext } = K;
  const { small } = X;
  const sph = (p, r, col, x, y, z, s = [1, 1, 1], smooth = true, ws = 12) => { const m = M(new THREE.SphereGeometry(r, ws, Math.max(6, ws * 0.75 | 0)), clay(col, { smooth }), x, y, z); m.scale.set(...s); p.add(m); return m; };
  function beak(p, r, x, y, z, s = 1) { const b = M(new THREE.ConeGeometry(r, r * 2, 8), clay(PG.beak), x, y, z); b.rotation.x = s * Math.PI / 2; p.add(b); return b; }
  function pHead(p, R, x, y, z, o = {}) {
    const g = new THREE.Group(); g.position.set(x, y, z); p.add(g);
    sph(g, R, o.chick ? PG.ink : PG.navy, 0, 0, 0, [1, 1, 1], true, 16);
    [-1, 1].forEach(sx => sph(g, R * 0.62, PG.belly, sx * R * 0.27, 0, R * 0.42, [1, 1, 1], true, 12));
    [-1, 1].forEach(sx => {
      g.add(small(M(new THREE.SphereGeometry(R * 0.12, 8, 6), clay(PG.ink, { smooth: true }), sx * R * 0.28, R * 0.08, R)));
      g.add(small(M(new THREE.SphereGeometry(R * 0.04, 5, 4), clay(PG.belly), sx * R * 0.25, R * 0.13, R * 1.1)));
      sph(g, R * 0.11, PG.blush, sx * R * 0.5, -R * 0.2, R * 0.92, [1, 0.7, 0.4], true, 8);
    });
    beak(g, R * 0.15, 0, -R * 0.13, R * 1.08);
    return g;
  }
  function pBody(p, s, x, y, z, o = {}) {
    const g = new THREE.Group(); g.position.set(x, y, z); p.add(g);
    sph(g, s * 0.42, PG.navy, 0, s * 0.5, 0, [1, 1.2, 0.95], true, 14);
    sph(g, s * 0.34, PG.belly, 0, s * 0.45, s * 0.14, [1, 1.2, 0.9], true, 12);
    [-1, 1].forEach(sx => {
      const f = sph(g, s * 0.2, PG.navy, sx * s * 0.4, s * 0.55, 0, [0.35, 1, 0.7], true, 8); f.rotation.z = sx * 0.45;
      sph(g, s * 0.11, PG.feet, sx * s * 0.15, s * 0.04, s * 0.12, [1, 0.4, 1.5], true, 8);
    });
    if (o.scarf) { const sc = M(new THREE.TorusGeometry(s * 0.3, s * 0.08, 6, 14), clay(PG.scarf), 0, s * 0.92, 0); sc.rotation.x = Math.PI / 2; g.add(sc); }
    pHead(g, s * 0.34, 0, s * 1.12, 0, o);
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
  const leafShape = (w, l) => { const s = new THREE.Shape(); s.moveTo(0, 0); s.bezierCurveTo(l * 0.3, w, l * 0.75, w * 0.8, l, 0); s.bezierCurveTo(l * 0.75, -w * 0.8, l * 0.3, -w, 0, 0); return s; };
  function leaf(p, w, l, x, y, z, rz, ry = 0, col = TG.leaf) { const m = M(ext(leafShape(w, l), w * 0.18, w * 0.06, 6), clay(col, { smooth: true }), x, y, z); m.rotation.set(0, ry, rz); p.add(m); return m; }
  function tFruit(p, R, x, y, z, o = {}) {
    const g = new THREE.Group(); g.position.set(x, y, z); p.add(g);
    const sz = o.sz ?? 1, sy = 0.84;
    sph(g, R, TG.peel, 0, 0, 0, [1, sy, sz], true, 18);
    const top = R * sy;
    const cx = M(ext(X.starShape(R * 0.22, 0.45, 5), R * 0.05, R * 0.02, 2), clay(TG.leafD), 0, top - R * 0.01, 0); cx.rotation.x = -Math.PI / 2; g.add(cx);
    g.add(M(new THREE.CylinderGeometry(R * 0.04, R * 0.06, R * 0.16, 6), clay(TG.stem), 0, top + R * 0.06, 0));
    const nl = o.leaves ?? 2;
    if (nl > 0) leaf(g, R * 0.32, R * 0.95, 0.0, top + R * 0.08, 0, 0.45, 0.2);
    if (nl > 1) leaf(g, R * 0.26, R * 0.75, 0.0, top + R * 0.08, 0, Math.PI - 0.55, -0.3, TG.leafD);
    for (let i = 0; i < (o.pores ?? 10); i++) {
      const a = i * 2.39996, t = 0.25 + 0.5 * ((i * 0.618) % 1), ph = (t - 0.5) * Math.PI * 0.85, cz = Math.cos(ph);
      g.add(small(M(new THREE.SphereGeometry(R * 0.045, 5, 3), clay(TG.peelD), Math.cos(a) * cz * R * 0.99, Math.sin(ph) * R * sy * 0.99, Math.sin(a) * cz * R * sz * 0.99)));
    }
    const faces = o.face === 'both' ? [1, -1] : o.face ? [1] : [];
    faces.forEach(s => {
      const fz = R * sz * 0.95 * s;
      [-1, 1].forEach(sx => {
        g.add(small(M(new THREE.SphereGeometry(R * 0.125, 8, 6), clay(TG.ink, { smooth: true }), sx * R * 0.3, R * 0.08, fz * 0.97)));
        g.add(small(M(new THREE.SphereGeometry(R * 0.035, 5, 4), clay(TG.pith), sx * R * 0.27, R * 0.12, fz * 0.97 + s * R * 0.09)));
        sph(g, R * 0.12, TG.blush, sx * R * 0.52, -R * 0.12, fz * 0.88, [1, 0.7, 0.4], true, 8);
      });
      const sm = M(new THREE.TorusGeometry(R * 0.15, R * 0.038, 5, 10, Math.PI), clay(TG.ink), 0, -R * 0.1, fz * 0.98); sm.rotation.z = Math.PI; if (s < 0) sm.rotation.y = Math.PI; g.add(sm);
    });
    return g;
  }
  const disc = r => { const s = new THREE.Shape(); s.absarc(0, 0, r, 0, Math.PI * 2, false); return s; };
  function sector(r0, r1, a0, a1) {
    const s = new THREE.Shape();
    s.moveTo(Math.cos(a0) * r0, Math.sin(a0) * r0); s.absarc(0, 0, r1, a0, a1, false);
    if (r0 > 0) s.absarc(0, 0, r0, a1, a0, true); else s.lineTo(0, 0);
    s.closePath(); return s;
  }
  function slice(p, R, x, y, z, o = {}) {
    const g = new THREE.Group(); g.position.set(x, y, z); p.add(g);
    const a0 = o.a0 ?? 0, a1 = o.a1 ?? Math.PI * 2, d = o.d ?? R * 0.3, full = a1 - a0 > 6;
    g.add(M(ext(full ? disc(R) : sector(0, R, a0, a1), d, R * 0.04, 14), clay(TG.peel, { smooth: true })));
    g.add(M(ext(full ? disc(R * 0.88) : sector(0, R * 0.88, a0 + 0.02, a1 - 0.02), d + R * 0.06, 0, 14), clay(TG.pith)));
    const n = o.n ?? (full ? 9 : 5), step = (a1 - a0) / n, gap = 0.07;
    for (let i = 0; i < n; i++) g.add(M(ext(sector(R * 0.1, R * 0.8, a0 + i * step + gap, a0 + (i + 1) * step - gap), d + R * 0.12, 0, 3), clay(TG.flesh, { smooth: true })));
    return g;
  }
  function cloud(p, s, col, x, y, z) {
    const g = new THREE.Group(); g.position.set(x, y, z); p.add(g);
    [[0, 0, 1], [-0.9, -0.2, 0.75], [0.9, -0.2, 0.8], [-0.45, 0.45, 0.7], [0.45, 0.4, 0.72], [0, -0.5, 0.75]].forEach(([cx, cy, r]) => {
      const b = M(new THREE.SphereGeometry(s * r, 12, 9), clay(col, { smooth: true }), cx * s, cy * s, 0); b.scale.z = 0.6; g.add(b);
    });
    return g;
  }
  return { sph, beak, pHead, pBody, flatFace, leaf, tFruit, slice, cloud };
}

export function penguinThemes(THREE, K, X) {
  const { clay, M, ext } = K;
  const { polyShape, hemi } = X;
  const T = motifKit(THREE, K, X);
  const H = (g, wood, grip, knob, bands = []) => X.handle(g, { wood, grip, knob, bands }, 0.52, 0.03);
  const canHandle = (g, col, x = -0.16) => g.add(M(new THREE.TorusGeometry(0.075, 0.015, 5, 12, Math.PI * 1.05), clay(col), x, 0.2, 0).rotateZ(Math.PI / 2 + 0.25));
  const spout = (g, col, tip) => { const sp = M(new THREE.CylinderGeometry(0.02, 0.032, 0.22, 8), clay(col), 0.16, 0.25, 0); sp.rotation.z = -0.9; g.add(sp); if (tip) tip(g, 0.25, 0.32); };
  return {
    A: {
      axe(g) {
        const top = H(g, PG.navy, PG.ink, PG.beak, [[PG.belly, 0.62]]), cy = top - 0.05;
        g.add(M(new THREE.BoxGeometry(0.06, 0.11, 0.07), clay(PG.ink), 0, cy, 0));
        g.add(M(ext(polyShape(BLADE), 0.04, 0.01, 2), clay(PG.navy, { smooth: true }), 0, cy, 0));
        g.add(M(ext(polyShape(EDGE), 0.034, 0.006, 2), clay(PG.ice), 0, cy, 0));
        [-1, 1].forEach(s => T.flatFace(g, 0.1, 0.112, cy, s * 0.03, s));
        g.scale.setScalar(1.18);
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
      rod(g) {
        X.rodFrame(g, { knobFn: g => g.add(M(new THREE.SphereGeometry(0.042, 8, 6), clay(PG.beak, { smooth: true }), 0, -0.1, 0)), rear: clay(PG.navy), line: 0xd0d6de, pole: (p, L) => {
          p.add(M(new THREE.CylinderGeometry(0.013, 0.026, L, 7), clay(PG.navy), 0, L / 2, 0));
          [0.3, 0.55, 0.8].forEach(f => p.add(M(new THREE.CylinderGeometry(0.027 - f * 0.013, 0.027 - f * 0.013, 0.02, 8), clay(PG.belly), 0, L * f, 0)));
        } }, b => T.pHead(b, 0.06, 0, -0.02, 0));
      },
    },
    B: {
      axe(g) {
        const top = H(g, PG.iceD, PG.navy, PG.ice, [[PG.snow, 0.62]]), cy = top - 0.05;
        g.add(M(new THREE.BoxGeometry(0.06, 0.11, 0.07), clay(PG.navy), 0, cy, 0));
        g.add(M(ext(polyShape(BLADE), 0.04, 0.01, 2), clay(PG.ice, { smooth: true }), 0, cy, 0));
        g.add(M(ext(polyShape(EDGE), 0.034, 0.006, 2), clay(PG.iceD), 0, cy, 0));
        [[0.05, 0.05, 0.03], [0.1, 0.085, 0.034], [0.155, 0.09, 0.03], [0.19, 0.07, 0.024]].forEach(([x, y, r]) => T.sph(g, r, PG.snow, x, cy + y, 0, [1, 0.6, 1.3], true, 10));
        T.pBody(g, 0.12, 0.11, cy + 0.1, 0.0, { scarf: true });
        g.scale.setScalar(1.18);
      },
      water(g) {
        g.add(M(new THREE.CylinderGeometry(0.11, 0.12, 0.2, 14), clay(PG.ice, { smooth: true }), 0, 0.18, 0));
        [0.12, 0.2].forEach(y => g.add(M(new THREE.TorusGeometry(0.117, 0.008, 4, 18), clay(PG.iceD), 0, y, 0).rotateX(Math.PI / 2)));
        g.add(hemi(0.115, clay(PG.snow, { smooth: true }), 0, 0.275, 0, 0.45));
        T.pBody(g, 0.14, 0, 0.3, 0.0, { scarf: true });
        spout(g, PG.iceD, (g, x, y) => T.sph(g, 0.03, PG.snow, x, y, 0, [1, 1, 1], true, 8));
        canHandle(g, PG.iceD);
        g.scale.setScalar(1.25);
      },
      rod(g) {
        X.rodFrame(g, { knobFn: g => g.add(M(new THREE.SphereGeometry(0.042, 8, 6), clay(PG.ice, { smooth: true }), 0, -0.1, 0)), rear: clay(PG.navy), line: 0xd0d6de, pole: (p, L) => {
          p.add(M(new THREE.CylinderGeometry(0.013, 0.026, L, 7), clay(PG.iceD), 0, L / 2, 0));
          [0.35, 0.7].forEach(f => T.sph(p, 0.03 - f * 0.012, PG.snow, 0, L * f, 0, [1, 0.6, 1], true, 8));
        } }, b => { b.add(M(new THREE.CylinderGeometry(0.04, 0.05, 0.02, 8), clay(PG.ice), 0, -0.06, 0)); T.pBody(b, 0.1, 0, -0.05, 0, { scarf: true }); });
      },
    },
    C: {
      axe(g) {
        const top = H(g, PG.chickD, PG.ink, PG.chick, [[PG.belly, 0.62]]), cy = top - 0.05;
        g.add(M(new THREE.BoxGeometry(0.06, 0.1, 0.07), clay(PG.ink), 0, cy, 0));
        T.cloud(g, 0.062, PG.chick, 0.12, cy - 0.03, 0);
        T.pHead(g, 0.066, 0.12, cy + 0.06, 0.012, { chick: true });
        [-1, 1].forEach(sx => T.sph(g, 0.022, PG.feet, 0.12 + sx * 0.03, cy - 0.1, 0.02, [1, 0.4, 1.5], true, 8));
        g.scale.setScalar(1.18);
      },
      water(g) {
        T.cloud(g, 0.1, PG.chick, 0, 0.16, 0).scale.z = 2;
        T.pHead(g, 0.09, 0, 0.3, 0.02, { chick: true });
        [-1, 1].forEach(sx => T.sph(g, 0.034, PG.feet, sx * 0.05, 0.06, 0.08, [1, 0.35, 1.5], true, 8));
        spout(g, PG.chickD, (g, x, y) => T.sph(g, 0.026, PG.belly, x, y, 0, [1, 1, 1], true, 8));
        canHandle(g, PG.chickD, -0.17);
        g.scale.setScalar(1.25);
      },
      rod(g) {
        X.rodFrame(g, { knobFn: g => g.add(M(new THREE.SphereGeometry(0.042, 8, 6), clay(PG.chick, { smooth: true }), 0, -0.1, 0)), rear: clay(PG.ink), line: 0xd0d6de, pole: (p, L) => {
          p.add(M(new THREE.CylinderGeometry(0.013, 0.026, L, 7), clay(PG.chickD), 0, L / 2, 0));
          T.cloud(p, 0.022, PG.chick, 0, L * 0.5, 0);
        } }, b => { T.cloud(b, 0.036, PG.chick, 0, -0.06, 0); T.pHead(b, 0.056, 0, 0.0, 0.012, { chick: true }); });
      },
    },
  };
}

export function tangerineThemes(THREE, K, X) {
  const { clay, M } = K;
  const T = motifKit(THREE, K, X);
  const H = (g, wood, grip, knob, bands = []) => X.handle(g, { wood, grip, knob, bands }, 0.52, 0.03);
  const canHandle = (g, col, x = -0.17) => g.add(M(new THREE.TorusGeometry(0.075, 0.015, 5, 12, Math.PI * 1.05), clay(col), x, 0.2, 0).rotateZ(Math.PI / 2 + 0.25));
  const spout = (g, col) => { const sp = M(new THREE.CylinderGeometry(0.02, 0.032, 0.22, 8), clay(col), 0.17, 0.25, 0); sp.rotation.z = -0.9; g.add(sp); };
  return {
    A: {
      axe(g) {
        const top = H(g, TG.wood, TG.leafD, TG.peel), cy = top - 0.05;
        g.add(M(new THREE.BoxGeometry(0.06, 0.1, 0.07), clay(TG.leafD), 0, cy, 0));
        T.tFruit(g, 0.105, 0.115, cy - 0.01, 0, { sz: 0.42, pores: 14 });
        g.scale.setScalar(1.18);
      },
      water(g) {
        T.tFruit(g, 0.132, 0, 0.15, 0, { pores: 18 });
        spout(g, TG.peelD);
        T.leaf(g, 0.022, 0.06, 0.25, 0.32, 0, 0.5);
        canHandle(g, TG.leafD);
        g.scale.setScalar(1.25);
      },
      rod(g) {
        X.rodFrame(g, { knobFn: g => g.add(M(new THREE.SphereGeometry(0.042, 8, 6), clay(TG.peel, { smooth: true }), 0, -0.1, 0)), rear: clay(TG.leafD), line: 0xe8dcd0, pole: (p, L) => {
          p.add(M(new THREE.CylinderGeometry(0.013, 0.026, L, 7), clay(TG.wood), 0, L / 2, 0));
          [0.35, 0.65].forEach((f, i) => T.leaf(p, 0.016, 0.05, 0, L * f, 0, i ? 2.6 : 0.5));
        } }, b => T.tFruit(b, 0.058, 0, -0.04, 0, { pores: 6, leaves: 1 }));
      },
    },
    B: {
      axe(g) {
        const top = H(g, TG.pith, TG.peelD, TG.peel, [[TG.peel, 0.62]]), cy = top - 0.05;
        g.add(M(new THREE.BoxGeometry(0.06, 0.1, 0.07), clay(TG.peelD), 0, cy, 0));
        T.slice(g, 0.135, 0.02, cy, 0, { a0: -Math.PI / 2, a1: Math.PI / 2, d: 0.036 });
        g.scale.setScalar(1.18);
      },
      water(g) {
        g.add(M(new THREE.CylinderGeometry(0.115, 0.12, 0.2, 16), clay(TG.peel, { smooth: true }), 0, 0.18, 0));
        T.slice(g, 0.075, 0, 0.17, 0.118, { d: 0.012 });
        T.slice(g, 0.125, 0, 0.29, 0, { d: 0.03 }).rotation.x = -Math.PI / 2;
        spout(g, TG.peelD);
        T.slice(g, 0.035, 0.255, 0.33, 0, { d: 0.012, n: 7 }).rotation.y = Math.PI / 2;
        canHandle(g, TG.leafD);
        g.scale.setScalar(1.25);
      },
      rod(g) {
        X.rodFrame(g, { knobFn: g => g.add(M(new THREE.SphereGeometry(0.042, 8, 6), clay(TG.peel, { smooth: true }), 0, -0.1, 0)), rear: clay(TG.peelD), line: 0xe8dcd0, pole: (p, L) => {
          p.add(M(new THREE.CylinderGeometry(0.013, 0.026, L, 7), clay(TG.pith), 0, L / 2, 0));
          [0.25, 0.45, 0.65, 0.85].forEach(f => p.add(M(new THREE.CylinderGeometry(0.027 - f * 0.013, 0.027 - f * 0.013, 0.02, 8), clay(TG.peel), 0, L * f, 0)));
        } }, b => T.slice(b, 0.062, 0, -0.03, 0, { d: 0.018, n: 7 }));
      },
    },
    C: {
      axe(g) {
        const top = H(g, TG.wood, TG.leafD, TG.peel, [[TG.leaf, 0.62]]), cy = top - 0.05;
        g.add(M(new THREE.BoxGeometry(0.06, 0.1, 0.07), clay(TG.leafD), 0, cy, 0));
        T.tFruit(g, 0.1, 0.115, cy - 0.005, 0, { sz: 0.62, face: 'both', pores: 0 });
        g.scale.setScalar(1.18);
      },
      water(g) {
        T.tFruit(g, 0.132, 0, 0.15, 0, { face: true, pores: 0 });
        spout(g, TG.leaf);
        T.leaf(g, 0.024, 0.065, 0.26, 0.32, 0, 0.4);
        canHandle(g, TG.leafD);
        g.scale.setScalar(1.25);
      },
      rod(g) {
        X.rodFrame(g, { knobFn: g => g.add(M(new THREE.SphereGeometry(0.042, 8, 6), clay(TG.peel, { smooth: true }), 0, -0.1, 0)), rear: clay(TG.leafD), line: 0xe8dcd0, pole: (p, L) => {
          p.add(M(new THREE.CylinderGeometry(0.013, 0.026, L, 7), clay(TG.wood), 0, L / 2, 0));
          T.leaf(p, 0.018, 0.055, 0, L * 0.5, 0, 0.5);
        } }, b => T.tFruit(b, 0.062, 0, -0.04, 0, { face: true, pores: 0, leaves: 1 }));
      },
    },
  };
}

export const SETS = Object.freeze({
  tools_penguin: {
    ico: '🐧', name: '펭귄 세트', pal: PG, themes: penguinThemes, key: 'penguin',
    refs: [['snowman', '기존 ⛄ 눈사람', '흰 눈덩이·초록 목도리·당근'], ['frost', '기존 ❄️ 서리', '하늘색 얼음 날·빨강 털모자']],
    dirs: [
      ['A', '펭귄 얼굴', '남색 날 양면에 흰 하트 얼굴·주황 부리·볼터치, 물통은 통통한 펭귄 몸'],
      ['B', '빙산 위 꼬마 펭귄', '얼음 날 위 눈덩이에 빨간 목도리 꼬마 펭귄이 서 있음, 물통 뚜껑에도'],
      ['C', '솜털 아기 펭귄', '회색 솜털 뭉치 날 위에 흰 얼굴 아기 펭귄, 물통은 솜털 몸통'],
    ],
  },
  tools_tangerine: {
    ico: '🍊', name: '귤 세트', pal: TG, themes: tangerineThemes, key: 'tangerine',
    refs: [['honey', '기존 🍯 꿀', '노랑 벌집 날·꿀방울'], ['maple', '기존 🍁 단풍', '빨강·주황 단풍잎']],
    dirs: [
      ['A', '귤 한 알', '날이 납작한 귤(껍질 점 + 꼭지 잎 두 장), 물통은 통통한 귤, 찌는 꼬마 귤'],
      ['B', '귤 단면', '날이 반달 귤 단면(알맹이 칸), 물통 뚜껑과 옆면에 동그란 귤 조각'],
      ['C', '웃는 귤', '날이 양면 웃는 얼굴 귤(볼터치), 물통도 웃는 귤, 꼭지 잎이 모자'],
    ],
  },
});

const DIR_SPEC = {
  penguinA: T => ({ h: { wood: PG.navy, grip: PG.ink, knob: PG.beak, bands: [[PG.belly, 0.62]] }, a: PG.navy, b: PG.navyL, edge: PG.ice, mount: PG.ink, bag: PG.belly, net: PG.navyL,
    motif: (p, r, x, y, z) => T.pHead(p, r, x, y, z) }),
  penguinB: T => ({ h: { wood: PG.iceD, grip: PG.navy, knob: PG.ice, bands: [[PG.snow, 0.62]] }, a: PG.ice, b: PG.iceD, edge: PG.snow, mount: PG.navy, bag: PG.ice, net: PG.iceD,
    motif: (p, r, x, y, z) => T.pBody(p, r * 2, x, y - r * 0.9, z, { scarf: true }) }),
  penguinC: T => ({ h: { wood: PG.chickD, grip: PG.ink, knob: PG.chick, bands: [[PG.belly, 0.62]] }, a: PG.chick, b: PG.chickD, edge: PG.belly, mount: PG.ink, bag: PG.chick, net: PG.chickD,
    motif: (p, r, x, y, z) => T.pHead(p, r, x, y, z, { chick: true }) }),
  tangerineA: T => ({ h: { wood: TG.wood, grip: TG.leafD, knob: TG.peel }, a: TG.peel, b: TG.peelD, edge: TG.leaf, mount: TG.leafD, bag: TG.peel, net: TG.flesh,
    motif: (p, r, x, y, z) => T.tFruit(p, r, x, y, z, { pores: 6 }) }),
  tangerineB: T => ({ h: { wood: TG.pith, grip: TG.peelD, knob: TG.peel, bands: [[TG.peel, 0.62]] }, a: TG.peel, b: TG.flesh, edge: TG.pith, mount: TG.peelD, bag: TG.flesh, net: TG.peel,
    motif: (p, r, x, y, z) => T.slice(p, r * 1.1, x, y, z, { d: r * 0.35, n: 7 }) }),
  tangerineC: T => ({ h: { wood: TG.wood, grip: TG.leafD, knob: TG.peel, bands: [[TG.leaf, 0.62]] }, a: TG.peel, b: TG.peelD, edge: TG.leaf, mount: TG.leafD, bag: TG.peel, net: TG.flesh,
    motif: (p, r, x, y, z) => T.tFruit(p, r, x, y, z, { face: true, pores: 0, leaves: 1 }) }),
};

export function portThemes(THREE, K, X) {
  const { clay, M, ext } = K;
  const { roundBlade, pickArms, sickleBlade, netBag } = X;
  const T = motifKit(THREE, K, X), out = {};
  const base = { penguin: penguinThemes(THREE, K, X), tangerine: tangerineThemes(THREE, K, X) };
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
  penguinA: { N: 8, R: 1.0, th: 0.95, overlap: 1, shape: { w: () => 1, tip: 0.03 } },
  penguinB: { N: 8, R: 1.0, th: 0.95, overlap: 1, shape: { w: () => 1, tip: 0.03 } },
  penguinC: { N: 10, R: 0.95, th: 1.02, overlap: 1, shape: { w: () => 1, tip: 0 } },
  tangerineA: { N: 10, R: 0.95, th: 1.05, overlap: 1, shape: { w: () => 1, tip: 0 } },
  tangerineB: { N: 9, R: 1.0, th: 0.92, overlap: 0.86, shape: { w: () => 1, tip: 0.02 } },
  tangerineC: { N: 10, R: 0.95, th: 1.05, overlap: 1, shape: { w: () => 1, tip: 0 } },
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
  root.add(M(new THREE.CylinderGeometry(0.022, 0.027, L, 7), clay(D.h.wood), 0, L / 2, 0));
  const j = M(new THREE.TorusGeometry(0.07, 0.022, 6, 14, Math.PI), clay(D.h.knob), 0.07, 0, 0); j.rotation.z = Math.PI; root.add(j);
  const look = {
    penguinA: { outer: k => k % 2 ? PG.belly : PG.navy, inner: PG.navyL, deco: (h, k) => { if (k % 2 === 0) dot(h, 0.6, 0, 0.05, PG.beak); }, finial: c => T.pHead(c, 0.12, 0, 0.1, 0) },
    penguinB: { outer: k => k % 2 ? PG.iceD : PG.ice, inner: PG.snow, deco: h => [[0.35, 0.1], [0.7, -0.12]].forEach(([t, p]) => dot(h, t, p, 0.05, PG.snow)), finial: c => { T.sph(c, 0.1, PG.snow, 0, 0.02, 0, [1, 0.5, 1], true, 10); T.pBody(c, 0.22, 0, 0.04, 0, { scarf: true }); } },
    penguinC: { outer: k => k % 2 ? PG.chickD : PG.chick, inner: PG.belly, deco: h => dot(h, 0.85, 0.0, 0.06, PG.chick, [1, 1, 0.7]), finial: c => T.pHead(c, 0.13, 0, 0.1, 0, { chick: true }) },
    tangerineA: { outer: k => k % 2 ? TG.peelD : TG.peel, inner: TG.pith, deco: h => [[0.3, 0.1], [0.55, -0.12], [0.8, 0.08]].forEach(([t, p]) => dot(h, t, p, 0.022, TG.peelD, [1, 1, 0.5])), finial: c => { T.leaf(c, 0.08, 0.26, 0, 0.03, 0, 0.3, 0.3); T.leaf(c, 0.07, 0.22, 0, 0.03, 0, Math.PI - 0.3, -0.4, TG.leafD); c.add(M(new THREE.CylinderGeometry(0.02, 0.03, 0.08, 6), clay(TG.stem), 0, 0.04, 0)); } },
    tangerineB: { outer: () => TG.flesh, inner: TG.pith, deco: () => {}, finial: c => { T.sph(c, 0.09, TG.pith, 0, 0.0, 0, [1, 0.5, 1], true, 12); c.add(M(new THREE.TorusGeometry(def.R * Math.sin(def.th) * 0.99, 0.035, 6, 36), clay(TG.peel), 0, (Math.cos(def.th) - 1) * def.R, 0).rotateX(Math.PI / 2)); } },
    tangerineC: { outer: k => k % 2 ? TG.peelD : TG.peel, inner: TG.pith, deco: (h, k) => { if (k % 5 === 0) onGore(h, 0.62, 0, g => T.leaf(g, 0.05, 0.16, -0.08, 0, 0.01, 0)); }, finial: c => T.tFruit(c, 0.16, 0, 0.12, 0, { face: true, pores: 0, leaves: 2 }) },
  }[theme];
  const canopy = new THREE.Group(); canopy.position.y = L; root.add(canopy);
  if (theme === 'tangerineB') canopy.add(M(new THREE.SphereGeometry(def.R * 0.985, 24, 12, 0, Math.PI * 2, 0, def.th), clay(TG.pith, { side: THREE.DoubleSide }), 0, -def.R, 0));
  const og = goreGeo(def.R, def.th, Math.PI / def.N * def.overlap, def.shape), ig = goreGeo(def.R * 0.985, def.th, Math.PI / def.N * def.overlap, def.shape);
  for (let k = 0; k < def.N; k++) {
    const piv = new THREE.Group(); piv.rotation.y = k * Math.PI * 2 / def.N; canopy.add(piv);
    piv.add(new THREE.Mesh(og.clone(), clay(look.outer(k), { smooth: true })), new THREE.Mesh(ig.clone(), clay(look.inner, { side: THREE.BackSide })));
    look.deco(piv, k);
  }
  look.finial(canopy);
  return root;
}
