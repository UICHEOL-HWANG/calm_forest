import { simKit, baseTools } from '../tool-set-pick/tool-art.mjs';
export { simKit, baseTools };

export const ST = Object.freeze({ night: 0x2c2f6a, navy: 0x1f2350, indigo: 0x4a4a9a, vio: 0x6a5ab0, star: 0xf2d36a, pale: 0xc9d0f0, cloud: 0xc4c8ea, moon: 0xe8cf70, cap: 0x5a6ac8, blush: 0xe8a0b0, ink: 0x2a2440 });
export const SB = Object.freeze({ red: 0xd8404e, redD: 0xa82a3a, seed: 0xf0d070, leaf: 0x4f9a4a, leafD: 0x3a7a3a, cream: 0xe4d4c2, pink: 0xf0a0b0, pinkD: 0xd87890, sponge: 0xe0b070, wood: 0xb08068 });

const BLADE = [[0.02, -0.045], [0.14, -0.095], [0.19, -0.105], [0.205, 0], [0.19, 0.105], [0.14, 0.095], [0.02, 0.045]];
const EDGE = [[0.18, -0.108], [0.205, -0.112], [0.222, 0], [0.205, 0.112], [0.18, 0.108], [0.198, 0]];

function clipY(poly, y0, y1) {
  const cut = (pts, keep, yy) => {
    const out = [];
    pts.forEach((p, i) => {
      const q = pts[(i + 1) % pts.length], ip = keep(p[1]), iq = keep(q[1]);
      if (ip) out.push(p);
      if (ip !== iq) { const t = (yy - p[1]) / (q[1] - p[1]); out.push([p[0] + (q[0] - p[0]) * t, yy]); }
    });
    return out;
  };
  return cut(cut(poly, y => y >= y0, y0), y => y <= y1, y1);
}

export function sharedKit(THREE, K, X) {
  const { clay, M, ext } = K;
  const { curve, taper } = X;
  function crescentShape(R, d) {
    const th = Math.atan2(Math.sqrt(R * R - d * d / 4), d / 2), s = new THREE.Shape();
    s.absarc(0, 0, R, th, Math.PI * 2 - th, false);
    s.absarc(d, 0, R, Math.PI + th, Math.PI - th, true);
    return s;
  }
  const streak = (p, pts, r0, r1, col) => { const c = curve(pts); p.add(new THREE.Mesh(taper(c, t => r0 + (r1 - r0) * t, 24, 6), clay(col, { smooth: true }))); return c; };
  const star = (p, r, col, x, y, z, k = 0.5) => { const s = M(X.puffStar(r, k), clay(col), x, y, z); p.add(s); return s; };
  function cloud(p, s, col, x, y, z) {
    const g = new THREE.Group(); g.position.set(x, y, z); p.add(g);
    [[0, 0, 1], [-0.9, -0.2, 0.75], [0.9, -0.2, 0.8], [-0.45, 0.45, 0.7], [0.45, 0.4, 0.72]].forEach(([cx, cy, r]) => {
      const b = M(new THREE.SphereGeometry(s * r, 12, 9), clay(col, { smooth: true }), cx * s, cy * s, 0); b.scale.z = 0.55; g.add(b);
    });
    return g;
  }
  function sleepyMoon(p, R, x, y, z, rz = 0, col = ST.moon) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.z = rz; p.add(g);
    g.add(M(ext(crescentShape(R, R * 0.75), R * 0.35, R * 0.08, 16), clay(col, { smooth: true })));
    [-1, 1].forEach(sz => {
      const lid = M(new THREE.TorusGeometry(R * 0.13, R * 0.025, 4, 8, Math.PI), clay(ST.ink), -R * 0.62, R * 0.15, sz * R * 0.26); lid.rotation.z = Math.PI; g.add(X.small(lid));
      g.add(X.small(M(new THREE.SphereGeometry(R * 0.08, 6, 4), clay(ST.blush), -R * 0.66, -R * 0.12, sz * R * 0.25)));
    });
    const cap = M(new THREE.ConeGeometry(R * 0.36, R * 0.9, 8), clay(ST.cap), -R * 0.55, R * 0.92, 0); cap.rotation.z = 0.5; g.add(cap);
    g.add(M(new THREE.SphereGeometry(R * 0.12, 8, 6), clay(ST.pale, { smooth: true }), -R * 0.78, R * 1.32, 0));
    return g;
  }
  function leafCap(p, r, x, y, z, stem = true) {
    const c = M(ext(X.starShape(r, 0.38, 5), r * 0.12, r * 0.04, 2), clay(SB.leaf), x, y, z); c.rotation.x = -Math.PI / 2; p.add(c);
    if (stem) p.add(M(new THREE.CylinderGeometry(r * 0.1, r * 0.14, r * 0.5, 6), clay(SB.leafD), x, y + r * 0.25, z));
    return c;
  }
  function berry(p, R, h, x, y, z, o = {}) {
    const g = new THREE.Group(); g.position.set(x, y, z); p.add(g);
    const rf = t => R * Math.max(o.blunt ?? 0.04, Math.sin(t * Math.PI * 0.62) / Math.sin(Math.PI * 0.62)) ** 0.85;
    const pts = []; for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push(new THREE.Vector2(rf(t), t * h)); }
    pts.push(new THREE.Vector2(R * 0.5, h * 1.06), new THREE.Vector2(0.001, h * 1.08));
    g.add(new THREE.Mesh(new THREE.LatheGeometry(pts, 14), clay(o.col ?? SB.red, { smooth: true })));
    const n = o.seeds ?? 14;
    for (let i = 0; i < n; i++) {
      const t = 0.18 + 0.7 * ((i * 0.618) % 1), a = i * 2.4, r = rf(t);
      const sd = M(new THREE.SphereGeometry(R * 0.07, 5, 3), clay(SB.seed), Math.cos(a) * r, t * h, Math.sin(a) * r);
      sd.scale.set(1, 1.4, 1); g.add(X.small(sd));
    }
    if (o.cap !== false) leafCap(g, R * 0.95, 0, h * 1.04, 0, o.stem ?? true);
    return g;
  }
  const strawberryShape = (w, l) => {
    const s = new THREE.Shape();
    s.moveTo(0, -w * 0.55);
    s.bezierCurveTo(l * 0.35, -w * 1.15, l * 0.85, -w * 0.5, l, 0);
    s.bezierCurveTo(l * 0.85, w * 0.5, l * 0.35, w * 1.15, 0, w * 0.55);
    s.closePath(); return s;
  };
  function cream(p, r, h, x, y, z, col = SB.cream) {
    const g = new THREE.Group(); g.position.set(x, y, z); p.add(g);
    const pts = []; for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push(new THREE.Vector2(r * (1 - t) ** 0.8 * (1 + 0.1 * Math.sin(t * 18)) + 0.001, t * h)); }
    const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 8), clay(col)); m.rotation.y = 0.3; g.add(m);
    return g;
  }
  function macaron(p, r, x, y, z, col = SB.pink, fill = SB.cream) {
    const g = new THREE.Group(); g.position.set(x, y, z); p.add(g);
    [-1, 1].forEach(s => {
      const sh = M(new THREE.SphereGeometry(r, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), clay(col, { smooth: true }), 0, 0, s * r * 0.22); sh.scale.y = 0.42; sh.rotation.x = s * Math.PI / 2; g.add(sh);
      g.add(M(new THREE.TorusGeometry(r * 0.96, r * 0.08, 4, 18), clay(col), 0, 0, s * r * 0.2));
    });
    g.add(M(new THREE.CylinderGeometry(r * 0.9, r * 0.9, r * 0.3, 18), clay(fill), 0, 0, 0).rotateX(Math.PI / 2));
    return g;
  }
  return { crescentShape, streak, star, cloud, sleepyMoon, berry, leafCap, strawberryShape, cream, macaron };
}

export function starryThemes(THREE, K, X) {
  const { clay, M, V, ext } = K;
  const { small, polyShape, hemi } = X;
  const { streak, star, cloud, sleepyMoon } = sharedKit(THREE, K, X);
  const H = (g, wood, grip, knob, bands = []) => X.handle(g, { wood, grip, knob, bands }, 0.52, 0.03);
  const canHandle = (g, col) => g.add(M(new THREE.TorusGeometry(0.075, 0.015, 5, 12, Math.PI * 1.05), clay(col), -0.15, 0.19, 0).rotateZ(Math.PI / 2 + 0.25));
  function constellation(p, pts, z, r = 0.011) {
    pts.forEach(([x, y], i) => {
      p.add(small(M(X.puffStar(r * (i % 2 ? 1 : 1.35), 0.45), clay(ST.star), x, y, z)));
      if (i) {
        const [px, py] = pts[i - 1], dx = x - px, dy = y - py, L = Math.hypot(dx, dy);
        const ln = M(new THREE.BoxGeometry(L, 0.007, 0.004), clay(ST.pale), (x + px) / 2, (y + py) / 2, z); ln.rotation.z = Math.atan2(dy, dx); p.add(small(ln));
      }
    });
  }
  return {
    A: {
      axe(g) {
        const top = H(g, ST.night, ST.navy, ST.star, [[ST.star, 0.55], [ST.star, 0.72]]), cy = top - 0.05;
        g.add(M(new THREE.BoxGeometry(0.06, 0.11, 0.07), clay(ST.navy), 0, cy, 0));
        g.add(M(ext(polyShape(BLADE), 0.04, 0.01, 2), clay(ST.indigo, { smooth: true }), 0, cy, 0));
        g.add(M(ext(polyShape(EDGE), 0.034, 0.006, 2), clay(ST.pale), 0, cy, 0));
        [-1, 1].forEach(sz => constellation(g, [[0.05, cy + 0.03], [0.09, cy + 0.055], [0.135, cy + 0.035], [0.16, cy - 0.02], [0.115, cy - 0.06], [0.07, cy - 0.035]], sz * 0.027));
        g.scale.setScalar(1.18);
      },
      water(g) {
        g.add(M(new THREE.CylinderGeometry(0.11, 0.12, 0.2, 14), clay(ST.indigo, { smooth: true }), 0, 0.18, 0));
        g.add(M(new THREE.CylinderGeometry(0.115, 0.115, 0.022, 14), clay(ST.navy), 0, 0.282, 0));
        const dip = [[-0.07, 0.04], [-0.035, 0.05], [0, 0.035], [0.025, 0.005], [0.07, 0.0], [0.075, -0.05], [0.025, -0.045]];
        dip.forEach(([x, y], i) => { const a = x / 0.12, s = M(X.puffStar(i % 2 ? 0.012 : 0.016, 0.45), clay(ST.star), Math.sin(a) * 0.122, 0.18 + y, Math.cos(a) * 0.122); s.rotation.y = a; g.add(small(s)); });
        g.add(hemi(0.095, clay(ST.night, { smooth: true }), 0, 0.29, 0, 0.35));
        star(g, 0.04, ST.star, 0, 0.35, 0);
        const sp = M(new THREE.CylinderGeometry(0.02, 0.032, 0.22, 8), clay(ST.navy), 0.15, 0.26, 0); sp.rotation.z = -0.9; g.add(sp);
        star(g, 0.03, ST.star, 0.245, 0.335, 0);
        canHandle(g, ST.navy);
        g.scale.setScalar(1.25);
      },
      rod(g) {
        X.rodFrame(g, { knobFn: g => star(g, 0.04, ST.star, 0, -0.1, 0), rear: clay(ST.navy), line: 0xc9d0f0, pole: (p, L) => {
          p.add(M(new THREE.CylinderGeometry(0.013, 0.026, L, 7), clay(ST.night), 0, L / 2, 0));
          [0.25, 0.45, 0.65, 0.85].forEach((f, i) => p.add(small(M(X.puffStar(0.012 + (i % 2) * 0.004), clay(ST.star), 0, L * f, 0.024 - f * 0.012))));
        } }, b => star(b, 0.045, ST.star, 0, -0.01, 0));
      },
    },
    B: {
      axe(g) {
        const top = H(g, ST.vio, ST.night, ST.navy), cy = top - 0.04;
        streak(g, [[0.02, 0.2, 0.034], [-0.03, 0.27, 0], [0.0, 0.33, -0.034], [0.04, cy - 0.02, 0], [0.1, cy, 0]], 0.012, 0.03, ST.pale);
        streak(g, [[-0.02, cy - 0.06, 0.01], [0.03, cy - 0.04, 0.012], [0.1, cy - 0.01, 0.01]], 0.006, 0.022, ST.cloud);
        g.add(M(new THREE.BoxGeometry(0.06, 0.1, 0.07), clay(ST.night), 0, cy, 0));
        star(g, 0.11, ST.star, 0.12, cy, 0, 0.48).rotation.z = -0.25;
        g.scale.setScalar(1.18);
      },
      water(g) {
        g.add(M(new THREE.CylinderGeometry(0.11, 0.12, 0.2, 14), clay(ST.vio, { smooth: true }), 0, 0.18, 0));
        g.add(hemi(0.1, clay(ST.night, { smooth: true }), 0, 0.28, 0, 0.4));
        const pts = Array.from({ length: 26 }, (_, i) => { const t = i / 25, a = -1.2 + t * Math.PI * 2.1; return V(Math.cos(a) * 0.125, 0.09 + t * 0.19, Math.sin(a) * 0.125); });
        streak(g, pts, 0.004, 0.018, ST.pale);
        const e = pts[pts.length - 1]; star(g, 0.035, ST.star, e.x, e.y + 0.01, e.z);
        const sp = M(new THREE.CylinderGeometry(0.02, 0.032, 0.22, 8), clay(ST.night), 0.15, 0.26, 0); sp.rotation.z = -0.9; g.add(sp);
        star(g, 0.04, ST.star, 0.25, 0.335, 0).rotation.z = -0.4;
        canHandle(g, ST.night);
        g.scale.setScalar(1.25);
      },
      rod(g) {
        X.rodFrame(g, { knobFn: g => g.add(M(new THREE.SphereGeometry(0.042, 8, 6), clay(ST.navy, { smooth: true }), 0, -0.1, 0)), rear: clay(ST.night), line: 0xc9d0f0, pole: (p, L) => {
          p.add(M(new THREE.CylinderGeometry(0.013, 0.026, L, 7), clay(ST.vio), 0, L / 2, 0));
          streak(p, Array.from({ length: 30 }, (_, i) => { const t = i / 29, a = t * Math.PI * 5, r = 0.03 - t * 0.014; return V(Math.cos(a) * r, L * (0.12 + t * 0.55), Math.sin(a) * r); }), 0.004, 0.011, ST.pale);
        } }, b => { streak(b, [[0, 0.07, 0], [0.004, 0.035, 0], [0, 0.0, 0]], 0.003, 0.018, ST.pale); star(b, 0.04, ST.star, 0, -0.01, 0); });
      },
    },
    C: {
      axe(g) {
        const top = H(g, ST.night, ST.cap, ST.pale), cy = top - 0.05;
        g.add(M(new THREE.BoxGeometry(0.06, 0.1, 0.07), clay(ST.cap), 0, cy, 0));
        cloud(g, 0.07, ST.cloud, 0.12, cy - 0.02, 0);
        sleepyMoon(g, 0.07, 0.11, cy + 0.07, 0, -0.2);
        [[0.21, cy + 0.06, 0.012], [0.04, cy + 0.1, 0.009]].forEach(([x, y, r]) => star(g, r, ST.star, x, y, 0));
        g.scale.setScalar(1.18);
      },
      water(g) {
        cloud(g, 0.1, ST.cloud, 0, 0.17, 0).scale.z = 2;
        const cap = M(new THREE.ConeGeometry(0.09, 0.2, 10), clay(ST.cap), -0.02, 0.33, 0); cap.rotation.z = 0.45; g.add(cap);
        g.add(M(new THREE.TorusGeometry(0.085, 0.016, 5, 14), clay(ST.pale), 0, 0.255, 0).rotateX(Math.PI / 2));
        g.add(M(new THREE.SphereGeometry(0.025, 8, 6), clay(ST.pale, { smooth: true }), -0.11, 0.41, 0));
        const sp = M(new THREE.CylinderGeometry(0.02, 0.032, 0.2, 8), clay(ST.indigo), 0.17, 0.24, 0); sp.rotation.z = -0.9; g.add(sp);
        star(g, 0.032, ST.star, 0.255, 0.31, 0).rotation.z = -0.3;
        sleepyMoon(g, 0.075, -0.17, 0.2, 0, Math.PI * 0.05);
        g.scale.setScalar(1.25);
      },
      rod(g) {
        X.rodFrame(g, { knobFn: g => g.add(M(new THREE.SphereGeometry(0.042, 8, 6), clay(ST.cap, { smooth: true }), 0, -0.1, 0)), rear: clay(ST.night), line: 0xc9d0f0, pole: (p, L) => {
          p.add(M(new THREE.CylinderGeometry(0.013, 0.026, L, 7), clay(ST.indigo), 0, L / 2, 0));
          cloud(p, 0.03, ST.cloud, 0, L * 0.5, 0);
        } }, b => sleepyMoon(b, 0.06, 0.015, -0.03, 0, 0));
      },
    },
  };
}

export function strawberryThemes(THREE, K, X) {
  const { clay, M, ext } = K;
  const { small, polyShape } = X;
  const { berry, leafCap, strawberryShape, cream, macaron } = sharedKit(THREE, K, X);
  const H = (g, wood, grip, knob, bands = []) => X.handle(g, { wood, grip, knob, bands }, 0.52, 0.03);
  const canHandle = (g, col, x = -0.16) => g.add(M(new THREE.TorusGeometry(0.075, 0.015, 5, 12, Math.PI * 1.05), clay(col), x, 0.2, 0).rotateZ(Math.PI / 2 + 0.25));
  return {
    A: {
      axe(g) {
        const top = H(g, SB.wood, SB.leafD, SB.red), cy = top - 0.05;
        g.add(M(ext(strawberryShape(0.1, 0.22), 0.04, 0.012, 14), clay(SB.red, { smooth: true }), 0, cy, 0));
        [-1, 1].forEach(sz => [[0.05, 0.03], [0.09, -0.04], [0.12, 0.035], [0.16, -0.01], [0.06, -0.035], [0.1, 0.0], [0.18, 0.02], [0.14, -0.045]].forEach(([x, y]) => {
          const s = M(new THREE.SphereGeometry(0.0075, 5, 3), clay(SB.seed), x, cy + y, sz * 0.031); s.scale.z = 0.5; g.add(small(s));
        }));
        const c = M(ext(X.starShape(0.07, 0.4, 5), 0.012, 0.004, 2), clay(SB.leaf), 0.005, cy, 0); c.rotation.y = Math.PI / 2; g.add(c);
        g.add(M(new THREE.BoxGeometry(0.06, 0.1, 0.066), clay(SB.leafD), 0, cy, 0));
        g.scale.setScalar(1.18);
      },
      water(g) {
        berry(g, 0.14, 0.22, 0, 0.06, 0, { blunt: 0.35, seeds: 22, stem: false });
        g.add(M(new THREE.CylinderGeometry(0.012, 0.016, 0.07, 6), clay(SB.leafD), 0, 0.36, 0));
        g.add(M(new THREE.SphereGeometry(0.02, 6, 5), clay(SB.leafD), 0, 0.395, 0));
        const sp = M(new THREE.CylinderGeometry(0.02, 0.03, 0.22, 8), clay(SB.leaf), 0.16, 0.24, 0); sp.rotation.z = -0.9; g.add(sp);
        leafCap(g, 0.035, 0.25, 0.31, 0, false).rotation.set(0, 0, -0.9 - Math.PI / 2);
        canHandle(g, SB.leafD);
        g.scale.setScalar(1.25);
      },
      rod(g) {
        X.rodFrame(g, { knobFn: g => g.add(M(new THREE.SphereGeometry(0.042, 8, 6), clay(SB.red, { smooth: true }), 0, -0.1, 0)), rear: clay(SB.leafD), line: 0xe8dcd4, pole: (p, L) => {
          p.add(M(new THREE.CylinderGeometry(0.013, 0.026, L, 7), clay(SB.wood), 0, L / 2, 0));
          [0.3, 0.6].forEach(f => leafCap(p, 0.03 - f * 0.01, 0, L * f, 0, false));
        } }, b => berry(b, 0.042, 0.075, 0, -0.06, 0, { seeds: 8 }));
      },
    },
    B: {
      axe(g) {
        const top = H(g, SB.cream, SB.pinkD, SB.red, [[SB.pink, 0.5], [SB.pink, 0.66]]), cy = top - 0.05;
        g.add(M(new THREE.BoxGeometry(0.06, 0.1, 0.07), clay(SB.pinkD), 0, cy, 0));
        [[-0.12, -0.075, SB.sponge], [-0.075, -0.055, SB.cream], [-0.055, -0.03, SB.red], [-0.03, 0.03, SB.sponge], [0.03, 0.06, SB.cream], [0.06, 0.12, SB.cream]].forEach(([y0, y1, c]) => {
          const pl = clipY(BLADE, y0, y1); if (pl.length > 2) g.add(M(ext(polyShape(pl), 0.044, 0.004, 2), clay(c, { smooth: c === SB.cream }), 0, cy, 0));
        });
        [0.07, 0.12, 0.17].forEach(x => g.add(small(M(new THREE.SphereGeometry(0.012, 6, 4), clay(SB.red), x, cy - 0.042, 0.026))));
        cream(g, 0.035, 0.05, 0.08, cy + 0.075, 0);
        berry(g, 0.03, 0.05, 0.15, cy + 0.08, 0, { seeds: 6 }).rotation.z = 0.2;
        g.scale.setScalar(1.18);
      },
      water(g) {
        [[0.085, 0.13, SB.sponge], [0.13, 0.15, SB.cream], [0.15, 0.175, SB.red], [0.175, 0.24, SB.sponge], [0.24, 0.28, SB.cream]].forEach(([y0, y1, c]) =>
          g.add(M(new THREE.CylinderGeometry(0.12, 0.12, y1 - y0, 16), clay(c, { smooth: true }), 0, (y0 + y1) / 2, 0)));
        for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + 0.3; cream(g, 0.025, 0.035, Math.cos(a) * 0.088, 0.28, Math.sin(a) * 0.088); }
        berry(g, 0.045, 0.075, 0, 0.285, 0, { seeds: 8 });
        const sp = M(new THREE.CylinderGeometry(0.02, 0.034, 0.22, 8), clay(SB.cream), 0.16, 0.24, 0); sp.rotation.z = -0.9; g.add(sp);
        cream(g, 0.03, 0.045, 0.245, 0.31, 0, SB.pink).rotation.z = -0.9;
        canHandle(g, SB.pinkD);
        g.scale.setScalar(1.25);
      },
      rod(g) {
        X.rodFrame(g, { knobFn: g => g.add(M(new THREE.SphereGeometry(0.042, 8, 6), clay(SB.red, { smooth: true }), 0, -0.1, 0)), rear: clay(SB.pinkD), line: 0xe8dcd4, pole: (p, L) => {
          p.add(M(new THREE.CylinderGeometry(0.013, 0.026, L, 7), clay(SB.cream), 0, L / 2, 0));
          [0.25, 0.45, 0.65, 0.85].forEach(f => p.add(M(new THREE.CylinderGeometry(0.026 - f * 0.012, 0.026 - f * 0.012, 0.02, 8), clay(SB.pink), 0, L * f, 0)));
        } }, b => { b.add(M(new THREE.CylinderGeometry(0.034, 0.03, 0.03, 10), clay(SB.sponge), 0, -0.025, 0)); cream(b, 0.03, 0.03, 0, -0.01, 0); berry(b, 0.03, 0.05, 0, 0.012, 0, { seeds: 6 }); });
      },
    },
    C: {
      axe(g) {
        const top = H(g, SB.cream, SB.pink, SB.pinkD, [[SB.pink, 0.55]]), cy = top - 0.05;
        g.add(M(new THREE.BoxGeometry(0.06, 0.1, 0.07), clay(SB.pinkD), 0, cy, 0));
        macaron(g, 0.1, 0.11, cy, 0);
        [[0.06, 0.08], [0.17, -0.06]].forEach(([x, y]) => { const s = M(ext(strawberryShape(0.022, 0.05), 0.008, 0.002, 6), clay(SB.red), x, cy + y, 0.046); s.rotation.z = -Math.PI / 2; g.add(s); });
        berry(g, 0.03, 0.05, 0.14, cy + 0.085, 0, { seeds: 6 }).rotation.z = -0.3;
        g.scale.setScalar(1.18);
      },
      water(g) {
        macaron(g, 0.14, 0, 0.17, 0).rotation.x = Math.PI / 2;
        berry(g, 0.04, 0.065, 0, 0.225, 0, { seeds: 8 });
        const sp = M(new THREE.CylinderGeometry(0.02, 0.032, 0.2, 8), clay(SB.pinkD), 0.18, 0.22, 0); sp.rotation.z = -0.9; g.add(sp);
        macaron(g, 0.035, 0.265, 0.29, 0, SB.red).rotation.y = Math.PI / 2;
        canHandle(g, SB.pinkD, -0.17);
        g.scale.setScalar(1.25);
      },
      rod(g) {
        X.rodFrame(g, { knobFn: g => g.add(M(new THREE.SphereGeometry(0.042, 8, 6), clay(SB.pinkD, { smooth: true }), 0, -0.1, 0)), rear: clay(SB.pink), line: 0xe8dcd4, pole: (p, L) => {
          p.add(M(new THREE.CylinderGeometry(0.013, 0.026, L, 7), clay(SB.cream), 0, L / 2, 0));
          [0.35, 0.7].forEach(f => { macaron(p, 0.026, 0, L * f, 0, f > 0.5 ? SB.red : SB.pink).rotation.x = Math.PI / 2; });
        } }, b => macaron(b, 0.042, 0, -0.01, 0));
      },
    },
  };
}

export const SETS = Object.freeze({
  tools_starry: {
    ico: '🌙', name: '별밤 세트', pal: ST, themes: starryThemes,
    refs: [['moon', '기존 🌙 달밤', '남색·은 초승달 날·금별']],
    dirs: [
      ['A', '별자리 잇기', '남보라 날 양면에 작은 금별을 은선으로 이은 별자리, 물통엔 북두칠성'],
      ['B', '별똥별 꼬리', '통통한 금별이 날, 은빛 꼬리가 자루 위(y ≥ 0.18)를 감고 날아옴'],
      ['C', '졸린 달과 구름', '수면모자 쓴 초승달이 구름 날 위에서 졸고, 물통은 구름 + 모자 뚜껑'],
    ],
  },
  tools_strawberry: {
    ico: '🍓', name: '딸기 세트', pal: SB, themes: strawberryThemes,
    refs: [['bloom', '기존 🌸 꽃정원', '분홍 꽃잎·초록 줄기'], ['candy', '기존 🍬 사탕 지팡이', '빨강/흰 줄무늬']],
    dirs: [
      ['A', '딸기 통째', '날이 딸기 단면 모양(씨 + 꼭지 잎), 물통은 딸기 한 알, 찌는 꼬마 딸기'],
      ['B', '딸기 쇼트케이크', '날이 시트·크림·딸기잼 층 케이크, 위에 생크림과 딸기'],
      ['C', '딸기 마카롱', '분홍 마카롱이 둥근 날, 물통은 마카롱을 눕힌 몸통'],
    ],
  },
});

export const UMBRELLA_DEFS = Object.freeze({
  starry: { N: 8, R: 1.05, th: 0.88, overlap: 1, shape: { w: () => 1, tip: 0.04 } },
  strawberry: { N: 10, R: 0.95, th: 1.05, overlap: 1, shape: { w: () => 1, tip: 0 } },
});

export function portThemes(THREE, K, X) {
  const { clay, M, V, ext } = K;
  const { small, roundBlade, pickArms, sickleBlade, netBag } = X;
  const S = sharedKit(THREE, K, X), SA = starryThemes(THREE, K, X).B, BA = strawberryThemes(THREE, K, X).A;
  const sH = (g, l, r = 0.03) => X.handle(g, { wood: ST.vio, grip: ST.night, knob: ST.navy }, l, r);
  const bH = (g, l, r = 0.03) => X.handle(g, { wood: SB.wood, grip: SB.leafD, knob: SB.red }, l, r);
  const tail = (g, top, x1, y1) => S.streak(g, [[0.02, 0.2, 0.03], [-0.03, 0.26, 0], [0, (0.26 + top) / 2, -0.03], [x1 * 0.4, top - 0.02, 0], [x1, y1, 0]], 0.008, 0.022, ST.pale);
  const seeds = (p, pts, z, x0 = 0, y0 = 0) => [-1, 1].forEach(sz => pts.forEach(([x, y]) => { const s = M(new THREE.SphereGeometry(0.0075, 5, 3), clay(SB.seed), x0 + x, y0 + y, sz * z); s.scale.z = 0.5; p.add(small(s)); }));
  const starry = {
    axe: SA.axe, water: SA.water, rod: SA.rod,
    hoe(g) {
      const top = sH(g, 0.52), hd = new THREE.Group(); hd.position.y = top + 0.01; g.add(hd);
      tail(g, top, -0.02, top - 0.01);
      hd.add(M(new THREE.BoxGeometry(0.08, 0.08, 0.075), clay(ST.night)));
      pickArms(hd, [clay(ST.indigo), clay(ST.vio)], clay(ST.pale));
      S.star(hd, 0.05, ST.star, 0, 0.07, 0);
      g.scale.setScalar(1.18);
    },
    seed(g) {
      const bag = M(new THREE.SphereGeometry(0.11, 12, 10), clay(ST.vio, { smooth: true }), 0, 0.09, 0); bag.scale.set(1, 1.1, 1); g.add(bag);
      g.add(M(new THREE.CylinderGeometry(0.045, 0.065, 0.05, 10), clay(ST.night), 0, 0.2, 0));
      g.add(M(new THREE.TorusGeometry(0.05, 0.011, 5, 12), clay(ST.star), 0, 0.2, 0).rotateX(Math.PI / 2));
      S.streak(g, [[-0.1, 0.06, 0.06], [-0.05, 0.12, 0.1], [0.03, 0.13, 0.11]], 0.004, 0.014, ST.pale);
      S.star(g, 0.03, ST.star, 0.05, 0.13, 0.105);
      S.star(g, 0.04, ST.star, 0, 0.27, 0);
      g.scale.setScalar(1.25);
    },
    sickle(g) {
      const top = sH(g, 0.30, 0.034);
      const { bl, tip } = sickleBlade(g, top, [clay(ST.indigo), clay(ST.indigo), clay(ST.vio)], clay(ST.pale), 1.2);
      S.star(bl, 0.035, ST.star, tip.x, tip.y, 0);
      g.add(M(new THREE.CylinderGeometry(0.032, 0.04, 0.05, 9), clay(ST.night), 0, top - 0.01, 0));
      g.scale.setScalar(1.18);
    },
    shovel(g) {
      const top = sH(g, 0.58), by = top + 0.03;
      g.add(M(new THREE.CylinderGeometry(0.036, 0.044, 0.07, 9), clay(ST.night), 0, top + 0.01, 0));
      g.add(M(ext(roundBlade(0.105, 0.13), 0.03, 0.01, 14), clay(ST.indigo, { smooth: true }), 0, by, 0));
      [-1, 1].forEach(sz => {
        S.streak(g, [[-0.06, by + 0.04, sz * 0.024], [-0.01, by + 0.09, sz * 0.024], [0.03, by + 0.14, sz * 0.024]], 0.003, 0.012, ST.pale);
        S.star(g, 0.035, ST.star, 0.035, by + 0.15, sz * 0.022);
      });
      g.scale.setScalar(1.18);
    },
    hammer(g) {
      const top = sH(g, 0.50), y = top - 0.04;
      tail(g, top, -0.02, y - 0.03);
      const head = M(new THREE.CylinderGeometry(0.055, 0.055, 0.17, 12), clay(ST.night, { smooth: true }), 0, y, 0); head.rotation.z = Math.PI / 2; g.add(head);
      [-1, 1].forEach(sx => { S.star(g, 0.06, ST.star, sx * 0.095, y, 0).rotation.y = Math.PI / 2; });
      g.scale.setScalar(1.18);
    },
    net(g) {
      g.add(M(new THREE.CylinderGeometry(0.024, 0.028, 0.66, 7), clay(ST.vio), 0, 0.27, 0));
      g.add(M(new THREE.SphereGeometry(0.04, 8, 6), clay(ST.navy, { smooth: true }), 0, -0.08, 0));
      g.add(M(new THREE.TorusGeometry(0.17, 0.02, 6, 20), clay(ST.pale), 0, 0.6, 0).rotateX(Math.PI / 2));
      g.add(M(new THREE.ConeGeometry(0.16, 0.3, 12, 1, true), netBag(ST.indigo, 0.5), 0, 0.75, 0));
      S.streak(g, [[-0.12, 0.6, 0.12], [-0.02, 0.6, 0.17], [0.06, 0.6, 0.17]], 0.004, 0.016, ST.cloud);
      S.star(g, 0.045, ST.star, 0.09, 0.6, 0.17);
      g.scale.setScalar(1.25);
    },
  };
  const strawberry = {
    axe: BA.axe, water: BA.water, rod: BA.rod,
    hoe(g) {
      const top = bH(g, 0.52), hd = new THREE.Group(); hd.position.y = top + 0.01; g.add(hd);
      hd.add(M(new THREE.BoxGeometry(0.08, 0.08, 0.075), clay(SB.leafD)));
      pickArms(hd, [clay(SB.red), clay(SB.red)], clay(SB.leaf));
      S.berry(hd, 0.04, 0.07, 0, 0.11, 0, { seeds: 8 }).rotation.z = Math.PI;
      g.scale.setScalar(1.18);
    },
    seed(g) {
      S.berry(g, 0.11, 0.2, 0, 0.27, 0, { seeds: 18, cap: false }).rotation.z = Math.PI;
      S.leafCap(g, 0.1, 0, 0.27, 0, false);
      g.add(M(new THREE.CylinderGeometry(0.012, 0.018, 0.07, 6), clay(SB.leafD), 0, 0.31, 0));
      g.add(M(new THREE.TorusGeometry(0.02, 0.007, 4, 10), clay(SB.leafD), 0, 0.35, 0));
      g.scale.setScalar(1.25);
    },
    sickle(g) {
      const top = bH(g, 0.30, 0.034);
      const { bl, tip } = sickleBlade(g, top, [clay(SB.red), clay(SB.red), clay(SB.redD)], clay(SB.cream), 1.25);
      [[0.0, 0.05], [0.012, 0.1], [0.03, 0.17], [0.05, 0.22]].forEach(([x, y]) => [-1, 1].forEach(sz => { const s = M(new THREE.SphereGeometry(0.007, 5, 3), clay(SB.seed), x, y, sz * 0.009); s.scale.z = 0.5; bl.add(small(s)); }));
      S.leafCap(g, 0.05, 0, top - 0.005, 0, false);
      g.add(M(new THREE.CylinderGeometry(0.032, 0.04, 0.05, 9), clay(SB.leafD), 0, top - 0.03, 0));
      g.scale.setScalar(1.18);
    },
    shovel(g) {
      const top = bH(g, 0.58), by = top + 0.03;
      g.add(M(ext(S.strawberryShape(0.11, 0.2), 0.03, 0.01, 14), clay(SB.red, { smooth: true }), 0, by, 0).rotateZ(Math.PI / 2));
      seeds(g, [[0.04, 0.05], [-0.04, 0.07], [0.0, 0.1], [0.05, 0.13], [-0.05, 0.12], [0.02, 0.16], [-0.015, 0.04]], 0.026, 0, by);
      S.leafCap(g, 0.06, 0, by + 0.01, 0, false).rotation.x = 0;
      g.add(M(new THREE.CylinderGeometry(0.036, 0.044, 0.06, 9), clay(SB.leafD), 0, top + 0.0, 0));
      g.scale.setScalar(1.18);
    },
    hammer(g) {
      const top = bH(g, 0.50), y = top - 0.04;
      [-1, 1].forEach(sx => { const b = S.berry(g, 0.06, 0.1, sx * 0.005, y, 0, { seeds: 10, stem: false }); b.rotation.z = -sx * Math.PI / 2; });
      g.add(M(new THREE.BoxGeometry(0.05, 0.07, 0.07), clay(SB.leafD), 0, y, 0));
      g.scale.setScalar(1.18);
    },
    net(g) {
      g.add(M(new THREE.CylinderGeometry(0.024, 0.028, 0.66, 7), clay(SB.wood), 0, 0.27, 0));
      g.add(M(new THREE.SphereGeometry(0.04, 8, 6), clay(SB.red, { smooth: true }), 0, -0.08, 0));
      g.add(M(new THREE.TorusGeometry(0.17, 0.022, 6, 20), clay(SB.red), 0, 0.6, 0).rotateX(Math.PI / 2));
      g.add(M(new THREE.ConeGeometry(0.16, 0.3, 12, 1, true), netBag(SB.pink, 0.55), 0, 0.75, 0));
      S.leafCap(g, 0.06, 0, 0.62, 0.17, false);
      S.berry(g, 0.03, 0.05, 0.0, 0.585, 0.17, { seeds: 6, stem: false }).rotation.z = Math.PI;
      g.scale.setScalar(1.25);
    },
  };
  return { starry, strawberry };
}

export function buildUmbrellaSim(THREE, K, X, theme, L = 1.55) {
  const def = UMBRELLA_DEFS[theme], { clay, M, V } = K, S = sharedKit(THREE, K, X), root = new THREE.Group();
  function goreGeo(R, thMax, halfW, shape) {
    const W = 8, Hh = 9, pos = [], idx = [];
    for (let j = 0; j <= Hh; j++) { const v = j / Hh; for (let i = 0; i <= W; i++) { const u = i / W * 2 - 1, phi = u * halfW * shape.w(v), th = thMax * v * (1 + shape.tip * (1 - u * u)); pos.push(-Math.cos(phi) * Math.sin(th) * R, (Math.cos(th) - 1) * R, Math.sin(phi) * Math.sin(th) * R); } }
    for (let j = 0; j < Hh; j++) for (let i = 0; i < W; i++) { const a = j * (W + 1) + i, b = a + 1, c = a + W + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals(); return geo;
  }
  const jHook = (mat, r = 0.07) => { const j = M(new THREE.TorusGeometry(r, 0.022, 6, 14, Math.PI), mat, r, 0, 0); j.rotation.z = Math.PI; root.add(j); };
  const onGore = (h, th, ph, r, col) => { const { p, n } = X.goreSurf(def.R * 1.006, th, ph); const s = M(X.puffStar(r, 0.48), clay(col), p.x, p.y, p.z); s.quaternion.setFromUnitVectors(V(0, 0, 1), n); h.add(s); };
  const look = {
    starry: {
      outer: k => clay(k % 2 ? ST.vio : ST.night), inner: () => clay(ST.indigo, { side: THREE.BackSide }),
      shaft() {
        root.add(M(new THREE.CylinderGeometry(0.022, 0.027, L, 7), clay(ST.vio), 0, L / 2, 0));
        S.streak(root, Array.from({ length: 30 }, (_, i) => { const t = i / 29, a = t * Math.PI * 4; return V(Math.cos(a) * 0.04, L * (0.15 + t * 0.6), Math.sin(a) * 0.04); }), 0.005, 0.016, ST.pale);
        jHook(clay(ST.night));
      },
      deco(h, k) {
        onGore(h, [0.45, 0.65, 0.35, 0.55][k % 4], [0.1, -0.12, 0.0, 0.14][k % 4], [0.06, 0.04, 0.05, 0.035][k % 4], ST.star);
        const q = X.goreSurf(def.R, def.th * 0.98, 0).p; h.add(M(new THREE.SphereGeometry(0.024, 8, 6), clay(ST.pale), q.x, q.y, q.z));
      },
      finial(c) { S.star(c, 0.07, ST.star, 0, 0.09, 0); c.add(M(new THREE.CylinderGeometry(0.012, 0.02, 0.05, 6), clay(ST.night), 0, 0.02, 0)); },
    },
    strawberry: {
      outer: k => clay(k % 2 ? SB.redD : SB.red), inner: () => clay(SB.pink, { side: THREE.BackSide }),
      shaft() {
        root.add(M(new THREE.CylinderGeometry(0.022, 0.027, L, 7), clay(SB.wood), 0, L / 2, 0));
        jHook(clay(SB.leafD));
      },
      deco(h) {
        [[0.4, 0.1], [0.62, -0.12], [0.85, 0.06]].forEach(([th, ph]) => { const { p, n } = X.goreSurf(def.R * 1.004, th, ph); const s = M(new THREE.SphereGeometry(0.025, 6, 4), clay(SB.seed), p.x, p.y, p.z); s.quaternion.setFromUnitVectors(V(0, 1, 0), n); s.scale.set(0.8, 0.4, 1.3); h.add(s); });
      },
      finial(c) {
        const lc = M(K.ext(X.starShape(0.42, 0.42, 5), 0.03, 0.01, 2), clay(SB.leaf), 0, -0.05, 0); lc.rotation.x = -Math.PI / 2; c.add(lc);
        c.add(M(new THREE.CylinderGeometry(0.03, 0.045, 0.16, 7), clay(SB.leafD), 0, 0.06, 0));
      },
    },
  }[theme];
  look.shaft();
  const canopy = new THREE.Group(); canopy.position.y = L; root.add(canopy);
  const og = goreGeo(def.R, def.th, Math.PI / def.N * def.overlap, def.shape), ig = goreGeo(def.R * 0.985, def.th, Math.PI / def.N * def.overlap, def.shape);
  for (let k = 0; k < def.N; k++) {
    const piv = new THREE.Group(); piv.rotation.y = k * Math.PI * 2 / def.N; canopy.add(piv);
    piv.add(new THREE.Mesh(og.clone(), look.outer(k)), new THREE.Mesh(ig.clone(), look.inner(k)));
    look.deco(piv, k);
  }
  look.finial(canopy);
  return root;
}
