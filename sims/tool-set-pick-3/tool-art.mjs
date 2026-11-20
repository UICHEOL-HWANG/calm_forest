import { simKit, baseTools } from '../tool-set-pick/tool-art.mjs';
export { simKit, baseTools };

export const CD = Object.freeze({ sugar: 0xded6d4, red: 0xd2343e, redD: 0xa02632, mint: 0x3f9a62, lemon: 0xf0c03e, grape: 0x8a62c8, pink: 0xe8709c });
export const OC = Object.freeze({ pink: 0xe87a96, pinkD: 0xc4567c, rose: 0xf2a8b8, vio: 0x8a5ab8, vioD: 0x5f3c8c, lav: 0xb69ad8, suck: 0xf0d2d6, ink: 0x2e2840, wood: 0x9a7a8e });

const BLADE = [[0.02, -0.045], [0.14, -0.095], [0.19, -0.105], [0.205, 0], [0.19, 0.105], [0.14, 0.095], [0.02, 0.045]];
const EDGE = [[0.18, -0.108], [0.205, -0.112], [0.222, 0], [0.205, 0.112], [0.18, 0.108], [0.198, 0]];

function tubeKit(THREE, K) {
  const { V } = K;
  const curve = pts => new THREE.CatmullRomCurve3(pts.map(p => p.isVector3 ? p : V(...p)));
  function taper(c, rf, segs = 28, rad = 8) {
    const geo = new THREE.TubeGeometry(c, segs, 1, rad, false), pos = geo.attributes.position, v = V();
    for (let i = 0; i <= segs; i++) {
      const ctr = c.getPointAt(i / segs), r = rf(i / segs);
      for (let j = 0; j <= rad; j++) { const k = i * (rad + 1) + j; v.fromBufferAttribute(pos, k).sub(ctr).multiplyScalar(r).add(ctr); pos.setXYZ(k, v.x, v.y, v.z); }
    }
    geo.computeVertexNormals(); return geo;
  }
  function stripes(p, c, r, turns, mats, w = 0.36, segs = 60) {
    const fr = c.computeFrenetFrames(segs, false);
    mats.forEach((mat, k) => {
      const pts = [];
      for (let i = 0; i <= segs; i++) {
        const t = i / segs, a = t * turns * Math.PI * 2 + k * Math.PI * 2 / mats.length, ctr = c.getPointAt(t);
        pts.push(ctr.clone().addScaledVector(fr.normals[i], Math.cos(a) * r * 0.9).addScaledVector(fr.binormals[i], Math.sin(a) * r * 0.9));
      }
      p.add(new THREE.Mesh(new THREE.TubeGeometry(curve(pts), segs * 2, r * w, 5, false), mat));
    });
  }
  const helix = (R, y0, y1, turns, n = 40, a0 = 0) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n, a = a0 + t * turns * Math.PI * 2; return V(Math.cos(a) * R(t), y0 + (y1 - y0) * t, Math.sin(a) * R(t)); });
  const curl = (cx, cy, R0, a0, turns, shrink = 0.75, n = 24, z = 0, dir = 1) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n, a = a0 + dir * t * turns * Math.PI * 2, r = R0 * (1 - shrink * t); return V(cx + Math.cos(a) * r, cy + Math.sin(a) * r, z); });
  return { curve, taper, stripes, helix, curl };
}

export function candyThemes(THREE, K, X) {
  const { clay, M, V, ext } = K;
  const { small, polyShape, hemi } = X;
  const { curve, taper, stripes, helix } = tubeKit(THREE, K);
  const tube = (p, c, r, col, segs = 40) => p.add(new THREE.Mesh(new THREE.TubeGeometry(c, segs, r, 8, false), clay(col)));
  function cane(p, pts, r, turns, base = CD.sugar, cols = [CD.red, CD.red]) {
    const c = curve(pts); tube(p, c, r, base, 48); stripes(p, c, r, turns, cols.map(x => clay(x)));
    [c.getPointAt(0), c.getPointAt(1)].forEach(q => p.add(M(new THREE.SphereGeometry(r, 8, 6), clay(base, { smooth: true }), q.x, q.y, q.z)));
    return c;
  }
  const crook = (x0, y0, R, side = 1, a1 = Math.PI * 1.05, n = 14) => Array.from({ length: n + 1 }, (_, i) => { const a = Math.PI - a1 * i / n; return V(x0 + side * (R + Math.cos(a) * R), y0 + Math.sin(a) * R, 0); });
  function swirlDisc(p, r, d, x, y, z, cols = [CD.red], n = 8) {
    const grp = new THREE.Group(); grp.position.set(x, y, z); p.add(grp);
    const base = M(new THREE.CylinderGeometry(r, r, d, 24), clay(CD.sugar, { smooth: true })); base.rotation.x = Math.PI / 2; grp.add(base);
    for (let i = 0; i < n; i += 2) {
      const a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2, s = new THREE.Shape(); s.moveTo(0, 0);
      s.quadraticCurveTo(Math.cos(a0 + 0.9) * r * 0.55, Math.sin(a0 + 0.9) * r * 0.55, Math.cos(a1) * r * 0.97, Math.sin(a1) * r * 0.97);
      s.absarc(0, 0, r * 0.97, a1, a1 + (a1 - a0) * 0.9, false);
      s.quadraticCurveTo(Math.cos(a0 + 1.2) * r * 0.3, Math.sin(a0 + 1.2) * r * 0.3, 0, 0);
      grp.add(M(ext(s, d * 1.08, 0, 10), clay(cols[(i / 2) % cols.length])));
    }
    return grp;
  }
  function twist(p, x, y, z, len, w, rz, col = CD.red) {
    const t = new THREE.Group(); t.position.set(x, y, z); t.rotation.z = rz; p.add(t);
    t.add(M(new THREE.CylinderGeometry(w * 0.18, w * 0.18, len * 0.3, 6), clay(col), 0, len * 0.15, 0));
    const fan = M(new THREE.ConeGeometry(w, len * 0.7, 6), clay(col), 0, len * 0.6, 0); fan.rotation.x = Math.PI; fan.scale.z = 0.35; t.add(fan);
    return t;
  }
  function gumdrop(p, r, col, x, y, z) {
    const g = new THREE.Group(); g.position.set(x, y, z); p.add(g);
    const pts = [new THREE.Vector2(0.001, 0), new THREE.Vector2(r, 0)];
    for (let i = 1; i <= 10; i++) { const t = i / 10; pts.push(new THREE.Vector2(r * (1 - 0.28 * t) * Math.cos(t * Math.PI / 2 * 0.98) + 0.001, r * 1.15 * Math.sin(t * Math.PI / 2))); }
    g.add(new THREE.Mesh(new THREE.LatheGeometry(pts, 12), clay(col)));
    [[0.5, 0.4], [2.2, 0.6], [3.9, 0.3], [5.3, 0.75], [1.4, 0.95]].forEach(([a, f]) => g.add(small(M(new THREE.BoxGeometry(r * 0.16, r * 0.16, r * 0.16), clay(CD.sugar), Math.cos(a) * r * (1 - 0.3 * f) * Math.cos(f), r * 1.15 * Math.sin(f * 1.2) + 0.002, Math.sin(a) * r * (1 - 0.3 * f) * Math.cos(f)))));
    return g;
  }
  function stickHandle(g, l, r, turns, cols, knob = CD.red) {
    const top = l - 0.08;
    cane(g, [[0, -0.06, 0], [0, top + 0.02, 0]], r, turns, CD.sugar, cols);
    g.add(M(new THREE.SphereGeometry(r * 1.4, 8, 6), clay(knob, { smooth: true }), 0, -0.085, 0));
    return top;
  }
  const helixCan = (g, R, y0, y1, turns, mats) => mats.forEach((mat, k) => g.add(new THREE.Mesh(new THREE.TubeGeometry(curve(helix(() => R, y0, y1, turns, 40, k * Math.PI)), 80, 0.017, 5), mat)));

  return {
    A: {
      axe(g) {
        const top = 0.44, r = 0.03, cy = top - 0.06;
        cane(g, [V(0, -0.06, 0), V(0, top - 0.04, 0), ...crook(0, top + 0.0, 0.06, -1, Math.PI * 1.15, 12).slice(1)], r, 7);
        g.add(M(new THREE.SphereGeometry(r * 1.4, 8, 6), clay(CD.redD, { smooth: true }), 0, -0.085, 0));
        g.add(M(ext(polyShape(BLADE), 0.04, 0.01, 2), clay(CD.sugar, { smooth: true }), 0, cy, 0));
        g.add(M(ext(polyShape(EDGE), 0.034, 0.006, 2), clay(CD.red), 0, cy, 0));
        [0.045, 0.095, 0.145].forEach(x => [-1, 1].forEach(sz => { const s = M(new THREE.BoxGeometry(0.024, 0.13 + x * 0.5, 0.006), clay(CD.red), x, cy, sz * 0.026); s.rotation.z = -0.55; g.add(s); }));
        g.add(M(new THREE.BoxGeometry(0.06, 0.1, 0.07), clay(CD.redD), 0, cy, 0));
        g.scale.setScalar(1.18);
      },
      water(g) {
        g.add(M(new THREE.CylinderGeometry(0.11, 0.12, 0.2, 14), clay(CD.sugar, { smooth: true }), 0, 0.18, 0));
        helixCan(g, 0.118, 0.085, 0.275, 1.1, [clay(CD.red), clay(CD.red)]);
        g.add(hemi(0.1, clay(CD.red, { smooth: true }), 0, 0.28, 0, 0.4));
        cane(g, [[0, 0.31, 0], [0, 0.35, 0], ...crook(0, 0.37, 0.025, 1, Math.PI * 1.1, 8).slice(1)], 0.012, 2);
        cane(g, [[0.09, 0.22, 0], [0.18, 0.29, 0], [0.25, 0.35, 0]], 0.022, 3);
        g.add(M(new THREE.CylinderGeometry(0.04, 0.026, 0.03, 10), clay(CD.red), 0.255, 0.36, 0).rotateZ(-0.9));
        cane(g, [[-0.1, 0.1, 0], [-0.2, 0.12, 0], [-0.22, 0.24, 0], [-0.16, 0.29, 0], [-0.1, 0.25, 0]], 0.018, 4);
        g.scale.setScalar(1.25);
      },
      rod(g) {
        X.rodFrame(g, { knobFn: g => g.add(M(new THREE.SphereGeometry(0.042, 8, 6), clay(CD.redD, { smooth: true }), 0, -0.1, 0)), rear: clay(CD.red), line: 0xe8e0dc, pole: (p, L) => {
          cane(p, [[0, 0, 0], [0, L, 0]], 0.02, 9);
        } }, b => cane(b, [[0, -0.07, 0], [0, 0.0, 0], ...crook(0, 0.02, 0.026, 1, Math.PI * 1.1, 8).slice(1)], 0.014, 2));
      },
    },
    B: {
      axe(g) {
        const l = 0.52, top = l - 0.08, cy = top - 0.05;
        X.handle(g, { wood: CD.sugar, grip: CD.mint, knob: CD.red, bands: [[CD.red, 0.38], [CD.red, 0.52], [CD.red, 0.66], [CD.red, 0.8]] }, l, 0.03);
        g.add(M(new THREE.BoxGeometry(0.06, 0.1, 0.07), clay(CD.mint), 0, cy, 0));
        swirlDisc(g, 0.11, 0.05, 0.12, cy, 0);
        twist(g, 0.12, cy + 0.11, 0, 0.09, 0.05, 0.25, CD.mint);
        twist(g, 0.12, cy - 0.11, 0, 0.09, 0.05, Math.PI - 0.25, CD.mint);
        swirlDisc(g, 0.045, 0.06, -0.045, cy, 0, [CD.red], 6);
        g.scale.setScalar(1.18);
      },
      water(g) {
        const cy = 0.17;
        swirlDisc(g, 0.14, 0.14, 0, cy, 0, [CD.red], 10);
        [-1, 1].forEach(s => g.add(M(new THREE.TorusGeometry(0.14, 0.012, 5, 24), clay(CD.mint), 0, cy, s * 0.07)));
        twist(g, 0, cy + 0.15, 0, 0.1, 0.06, 0, CD.mint);
        const sp = M(new THREE.CylinderGeometry(0.02, 0.032, 0.2, 8), clay(CD.sugar), 0.17, 0.25, 0); sp.rotation.z = -0.9; g.add(sp);
        [0.3, 0.6].forEach(f => { const b = M(new THREE.CylinderGeometry(0.029 - f * 0.012, 0.029 - f * 0.012, 0.025, 8), clay(CD.red), 0.17 + (f - 0.5) * 0.16, 0.25 + (f - 0.5) * 0.125, 0); b.rotation.z = -0.9; g.add(b); });
        swirlDisc(g, 0.04, 0.03, 0.255, 0.32, 0, [CD.red], 6).rotation.z = -0.9;
        const hd = M(new THREE.TorusGeometry(0.075, 0.016, 5, 12, Math.PI * 1.05), clay(CD.red), -0.15, cy + 0.02, 0); hd.rotation.z = Math.PI / 2 + 0.25; g.add(hd);
        g.scale.setScalar(1.25);
      },
      rod(g) {
        X.rodFrame(g, { knobFn: g => g.add(M(new THREE.SphereGeometry(0.042, 8, 6), clay(CD.red, { smooth: true }), 0, -0.1, 0)), rear: clay(CD.mint), line: 0xe8e0dc, pole: (p, L) => {
          p.add(M(new THREE.CylinderGeometry(0.013, 0.026, L, 7), clay(CD.sugar), 0, L / 2, 0));
          [0.2, 0.4, 0.6, 0.8].forEach(f => p.add(M(new THREE.CylinderGeometry(0.026 - f * 0.012, 0.026 - f * 0.012, 0.03, 8), clay(CD.red), 0, L * f, 0)));
        } }, b => {
          swirlDisc(b, 0.045, 0.025, 0, 0, 0);
          [-1, 1].forEach(s => twist(b, s * 0.045, 0, 0, 0.05, 0.03, -s * Math.PI / 2, CD.mint));
        });
      },
    },
    C: {
      axe(g) {
        const top = stickHandle(g, 0.52, 0.03, 5, [CD.mint, CD.mint], CD.lemon), cy = top - 0.05;
        g.add(M(ext(polyShape(BLADE), 0.042, 0.012, 2), clay(CD.pink, { smooth: true }), 0, cy, 0));
        g.add(M(ext(polyShape(EDGE), 0.036, 0.008, 2), clay(CD.sugar), 0, cy, 0));
        [[0.07, 0.03], [0.11, -0.04], [0.15, 0.04], [0.06, -0.03], [0.16, -0.01]].forEach(([x, y]) => [-1, 1].forEach(sz => g.add(small(M(new THREE.BoxGeometry(0.011, 0.011, 0.011), clay(CD.sugar), x, cy + y, sz * 0.034)))));
        gumdrop(g, 0.06, CD.mint, -0.03, cy, 0).rotation.z = Math.PI / 2;
        [[0.035, CD.lemon, 0.045], [0.1, CD.grape, 0.04], [0.16, CD.red, 0.034]].forEach(([x, c, r]) => gumdrop(g, r, c, x, cy + 0.085 - x * 0.1, 0));
        g.scale.setScalar(1.18);
      },
      water(g) {
        gumdrop(g, 0.15, CD.mint, 0, 0.03, 0);
        gumdrop(g, 0.04, CD.red, 0, 0.2, 0);
        [[0.4, CD.lemon], [2.4, CD.grape], [4.2, CD.pink]].forEach(([a, c]) => gumdrop(g, 0.028, c, Math.cos(a) * 0.1, 0.13, Math.sin(a) * 0.1));
        cane(g, [[0.1, 0.1, 0], [0.18, 0.18, 0], [0.25, 0.27, 0]], 0.02, 3, CD.sugar, [CD.mint, CD.mint]);
        gumdrop(g, 0.03, CD.lemon, 0.26, 0.28, 0).rotation.z = -0.6;
        g.add(new THREE.Mesh(taper(curve([[-0.12, 0.06, 0], [-0.22, 0.09, 0], [-0.21, 0.2, 0], [-0.1, 0.2, 0]]), () => 0.018), clay(CD.red)));
        g.scale.setScalar(1.25);
      },
      rod(g) {
        X.rodFrame(g, { knobFn: g => gumdrop(g, 0.045, CD.lemon, 0, -0.13, 0), rear: clay(CD.mint), line: 0xe8e0dc, pole: (p, L) => {
          cane(p, [[0, 0, 0], [0, L, 0]], 0.019, 7, CD.sugar, [CD.mint, CD.mint]);
          [[0.3, CD.red], [0.55, CD.grape], [0.78, CD.lemon]].forEach(([f, c]) => gumdrop(p, 0.03 - f * 0.01, c, 0, L * f - 0.01, 0));
        } }, b => gumdrop(b, 0.05, CD.red, 0, -0.04, 0));
      },
    },
  };
}

export function octopusThemes(THREE, K, X) {
  const { clay, M, V, ext } = K;
  const { small, polyShape, hemi } = X;
  const { curve, taper, helix, curl } = tubeKit(THREE, K);
  const faceCam = (q, tg) => tg.clone().cross(V(0, 0, 1)).normalize().add(V(0, 0, 0.8)).normalize();
  const outward = q => V(q.x, 0, q.z).normalize().add(V(0, 0, 0.35)).normalize();
  function tentacle(p, pts, r0, r1, col, o = {}) {
    const c = curve(pts), rf = t => r0 + (r1 - r0) * t;
    p.add(new THREE.Mesh(taper(c, rf), clay(col, { smooth: true })));
    const e = c.getPointAt(1); p.add(M(new THREE.SphereGeometry(r1, 6, 5), clay(col, { smooth: true }), e.x, e.y, e.z));
    const n = o.n ?? 6, t0 = o.t0 ?? 0.12, t1 = o.t1 ?? 0.85, side = o.side ?? faceCam;
    for (let i = 0; i < n; i++) {
      const t = t0 + (t1 - t0) * i / Math.max(1, n - 1), q = c.getPointAt(t), nr = side(q, c.getTangentAt(t)), rr = rf(t);
      const s = M(new THREE.SphereGeometry(rr * 0.5, 7, 4), clay(o.suck ?? OC.suck), q.x + nr.x * rr * 0.85, q.y + nr.y * rr * 0.85, q.z + nr.z * rr * 0.85);
      s.quaternion.setFromUnitVectors(V(0, 1, 0), nr); s.scale.set(1, 0.4, 1); p.add(small(s));
    }
    return c;
  }
  function eye(p, r, x, y, z, ry = 0) {
    const e = new THREE.Group(); e.position.set(x, y, z); e.rotation.y = ry; p.add(e);
    const w = M(new THREE.SphereGeometry(r, 10, 8), clay(OC.suck, { smooth: true })); w.scale.z = 0.5; e.add(w);
    const pu = M(new THREE.SphereGeometry(r * 0.62, 8, 6), clay(OC.ink, { smooth: true }), 0, -r * 0.05, r * 0.25); pu.scale.set(1, 1.15, 0.5); e.add(pu);
    return e;
  }
  function head(p, r, x, y, z, col = OC.pink, ry = 0.5) {
    const h = new THREE.Group(); h.position.set(x, y, z); p.add(h);
    const m = M(new THREE.SphereGeometry(r, 16, 12), clay(col, { smooth: true }), 0, r * 0.25, 0); m.scale.set(1, 1.25, 1); h.add(m);
    [-1, 1].forEach(s => eye(h, r * 0.26, Math.sin(ry + s * 0.42) * r * 0.86, -r * 0.05, Math.cos(ry + s * 0.42) * r * 0.86, ry + s * 0.42));
    [-1, 1].forEach(s => h.add(small(M(new THREE.SphereGeometry(r * 0.13, 6, 5), clay(OC.rose), Math.sin(ry + s * 0.8) * r * 0.9, -r * 0.35, Math.cos(ry + s * 0.8) * r * 0.9))));
    return h;
  }
  const oHandle = (g, l, r, wood, grip, knob) => X.handle(g, { wood, grip, knob }, l, r);
  function bob(b, s = 1, col = OC.pink) {
    head(b, 0.032 * s, 0, 0, 0, col, 0.4);
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * Math.PI * 2 + 0.3, d = (f, y) => V(Math.cos(a) * f * s, y * s, Math.sin(a) * f * s);
      tentacle(b, [d(0.02, -0.02), d(0.04, -0.045), d(0.058, -0.06), d(0.05, -0.075)], 0.011 * s, 0.004 * s, col, { n: 0 });
    }
  }

  return {
    A: {
      axe(g) {
        const top = oHandle(g, 0.52, 0.03, OC.wood, OC.pinkD, OC.vio), cy = top - 0.04;
        g.add(M(ext(polyShape([[0.0, -0.06], [0.12, -0.1], [0.17, -0.06], [0.18, 0.05], [0.12, 0.09], [0.0, 0.06]]), 0.022, 0.006, 2), clay(OC.rose), 0, cy, 0));
        tentacle(g, [[0.03, cy + 0.04, 0.01], [0.12, cy + 0.08, 0.012], [0.19, cy + 0.06, 0.012], [0.21, cy, 0.012], [0.18, cy - 0.02, 0.012]], 0.03, 0.012, OC.pink, { n: 5 });
        tentacle(g, [[0.03, cy - 0.03, 0], [0.12, cy - 0.09, 0], [0.2, cy - 0.08, 0], [0.22, cy - 0.03, 0], [0.195, cy - 0.005, 0]], 0.03, 0.012, OC.pink, { n: 5 });
        tentacle(g, [[0.03, cy, -0.012], [0.12, cy, -0.012], [0.2, cy + 0.01, -0.012], [0.235, cy + 0.035, -0.012]], 0.026, 0.01, OC.pinkD, { n: 0 });
        head(g, 0.07, -0.01, cy + 0.02, 0, OC.pink, 0.6);
        g.scale.setScalar(1.18);
      },
      water(g) {
        head(g, 0.135, 0, 0.13, 0, OC.pink, 0.75);
        for (let i = 1; i < 6; i++) {
          const a = i / 6 * Math.PI * 2 + 0.5, d = (f, y) => V(Math.cos(a) * f, y, Math.sin(a) * f);
          tentacle(g, [d(0.08, 0.06), d(0.15, 0.02), d(0.2, 0.025), d(0.19, 0.06), d(0.16, 0.05)], 0.032, 0.011, OC.pinkD, { n: 4, side: () => V(0, -1, 0) });
        }
        tentacle(g, [[0.1, 0.12, 0.03], [0.17, 0.18, 0.02], [0.22, 0.26, 0.01], [0.27, 0.32, 0], [0.31, 0.33, 0], [0.32, 0.3, 0]], 0.034, 0.016, OC.pink, { n: 5 });
        tentacle(g, [[-0.1, 0.1, 0], [-0.2, 0.13, 0], [-0.22, 0.24, 0], [-0.16, 0.3, 0], [-0.1, 0.28, 0]], 0.022, 0.014, OC.pinkD, { n: 4 });
        g.scale.setScalar(1.25);
      },
      rod(g) {
        X.rodFrame(g, { knobFn: g => g.add(M(new THREE.SphereGeometry(0.042, 8, 6), clay(OC.vio, { smooth: true }), 0, -0.1, 0)), rear: clay(OC.pinkD), line: 0xe8dce4, pole: (p, L) => {
          p.add(M(new THREE.CylinderGeometry(0.013, 0.026, L, 7), clay(OC.wood), 0, L / 2, 0));
          [0.3, 0.55, 0.8].forEach(f => p.add(M(new THREE.CylinderGeometry(0.026 - f * 0.012, 0.026 - f * 0.012, 0.02, 7), clay(OC.pink), 0, L * f, 0)));
        } }, b => bob(b, 1.5));
      },
    },
    B: {
      axe(g) {
        const top = oHandle(g, 0.52, 0.03, OC.lav, OC.vioD, OC.vioD), cy = top - 0.05;
        tentacle(g, helix(t => 0.036 - t * 0.004, 0.18, top - 0.02, 1.6, 40, 0.2).concat(curl(0, top + 0.06, 0.06, -Math.PI / 2, 0.75, 0.6, 10, 0.02, -1).slice(1)), 0.024, 0.009, OC.pinkD, { n: 9, t0: 0.05, t1: 0.8, side: outward });
        g.add(M(new THREE.BoxGeometry(0.06, 0.12, 0.07), clay(OC.vioD), 0, cy, 0));
        g.add(M(ext(polyShape(BLADE), 0.04, 0.01, 2), clay(OC.vio), 0, cy, 0));
        g.add(M(ext(polyShape(EDGE), 0.034, 0.006, 2), clay(OC.lav), 0, cy, 0));
        [-1, 1].forEach(sz => [[0.07, 0.035, 0.016], [0.11, -0.035, 0.018], [0.15, 0.04, 0.02], [0.16, -0.045, 0.016], [0.065, -0.03, 0.013], [0.12, 0.005, 0.014]].forEach(([x, y, r]) => {
          const s = M(new THREE.CylinderGeometry(r, r * 1.1, 0.008, 10), clay(OC.suck), x, cy + y, sz * 0.026); s.rotation.x = Math.PI / 2; g.add(small(s));
          const c = M(new THREE.CylinderGeometry(r * 0.45, r * 0.45, 0.01, 8), clay(OC.pinkD), x, cy + y, sz * 0.028); c.rotation.x = Math.PI / 2; g.add(small(c));
        }));
        g.scale.setScalar(1.18);
      },
      water(g) {
        g.add(M(new THREE.CylinderGeometry(0.11, 0.12, 0.2, 14), clay(OC.vio, { smooth: true }), 0, 0.18, 0));
        g.add(hemi(0.1, clay(OC.vioD, { smooth: true }), 0, 0.28, 0, 0.4));
        tentacle(g, helix(() => 0.128, 0.09, 0.27, 0.85, 30, 0.3).concat([V(-0.17, 0.3, 0), V(-0.22, 0.22, 0), V(-0.19, 0.12, 0), V(-0.13, 0.1, 0)]), 0.03, 0.014, OC.pinkD, { n: 9, t0: 0.05, t1: 0.75, side: outward });
        const sp = M(new THREE.CylinderGeometry(0.02, 0.032, 0.22, 8), clay(OC.vio), 0.15, 0.22, 0); sp.rotation.z = -0.9; g.add(sp);
        const rose = M(new THREE.CylinderGeometry(0.042, 0.03, 0.03, 10), clay(OC.suck), 0.245, 0.3, 0); rose.rotation.z = -0.9; g.add(rose);
        g.add(M(new THREE.SphereGeometry(0.018, 8, 6), clay(OC.pinkD), 0, 0.33, 0));
        g.scale.setScalar(1.25);
      },
      rod(g) {
        X.rodFrame(g, { knobFn: g => g.add(M(new THREE.SphereGeometry(0.042, 8, 6), clay(OC.vioD, { smooth: true }), 0, -0.1, 0)), rear: clay(OC.vioD), line: 0xe8dce4, pole: (p, L) => {
          p.add(M(new THREE.CylinderGeometry(0.013, 0.026, L, 7), clay(OC.lav), 0, L / 2, 0));
          tentacle(p, helix(t => 0.026 - t * 0.012, 0.12, L * 0.62, 2.2, 40), 0.015, 0.007, OC.pinkD, { n: 10, t0: 0.05, t1: 0.9, side: outward });
        } }, b => {
          b.add(M(new THREE.SphereGeometry(0.045, 10, 8), clay(OC.vio, { smooth: true })));
          for (let i = 0; i < 6; i++) {
            const a = i / 6 * Math.PI * 2, e = i % 2 ? 0.4 : -0.3, d = V(Math.cos(a) * Math.cos(e), Math.sin(e), Math.sin(a) * Math.cos(e));
            const s = M(new THREE.SphereGeometry(0.014, 7, 4), clay(OC.suck), d.x * 0.044, d.y * 0.044, d.z * 0.044); s.quaternion.setFromUnitVectors(V(0, 1, 0), d); s.scale.set(1, 0.4, 1); b.add(s);
          }
        });
      },
    },
    C: {
      axe(g) {
        const top = oHandle(g, 0.52, 0.03, OC.vioD, OC.vio, OC.pinkD), cy = top - 0.05;
        tentacle(g, [V(0, cy - 0.06, 0), V(0.08, cy - 0.11, 0), ...curl(0.13, cy, 0.11, -Math.PI / 2 + 0.2, 0.95, 0.72, 22, 0, 1)], 0.058, 0.016, OC.pink, { n: 10, t0: 0.1, t1: 0.92 });
        g.add(M(new THREE.BoxGeometry(0.06, 0.13, 0.07), clay(OC.vio), 0, cy, 0));
        const drop = M(new THREE.SphereGeometry(0.04, 10, 8), clay(OC.vioD, { smooth: true }), -0.05, cy - 0.01, 0); drop.scale.set(0.9, 1.1, 0.9); g.add(drop);
        g.scale.setScalar(1.18);
      },
      water(g) {
        const prof = t => 0.14 * Math.sin(Math.PI * (0.12 + 0.88 * t)) ** 0.8 + 0.01;
        const pts = []; for (let i = 0; i <= 20; i++) { const t = i / 20; pts.push(new THREE.Vector2(t > 0.86 ? 0.045 : prof(t), t * 0.3)); }
        g.add(M(new THREE.LatheGeometry(pts, 14), clay(OC.vioD), 0, 0.02, 0));
        g.add(M(new THREE.TorusGeometry(0.05, 0.014, 6, 14), clay(OC.vio), 0, 0.32, 0).rotateX(Math.PI / 2));
        tentacle(g, [V(0.1, 0.16, 0), V(0.18, 0.22, 0), ...curl(0.24, 0.33, 0.06, -Math.PI * 0.85, 0.9, 0.65, 14, 0, -1)], 0.034, 0.012, OC.pink, { n: 6 });
        tentacle(g, [V(-0.11, 0.1, 0), V(-0.18, 0.18, 0), ...curl(-0.15, 0.26, 0.05, Math.PI * 1.1, 0.85, 0.6, 12, 0, -1)], 0.026, 0.01, OC.pink, { n: 5 });
        [[0.6, 0.06], [2.0, 0.09], [3.6, 0.07]].forEach(([a, y]) => { const d = (f, dy) => V(Math.cos(a) * f, y + dy, Math.sin(a) * f); tentacle(g, [d(0.1, 0.05), d(0.15, 0), d(0.18, -0.04), d(0.16, -0.06)], 0.02, 0.008, OC.pinkD, { n: 0 }); });
        g.scale.setScalar(1.25);
      },
      rod(g) {
        X.rodFrame(g, { knobFn: g => g.add(M(new THREE.SphereGeometry(0.042, 8, 6), clay(OC.pinkD, { smooth: true }), 0, -0.1, 0)), rear: clay(OC.vio), line: 0xe8dce4, pole: (p, L) => {
          p.add(M(new THREE.CylinderGeometry(0.014, 0.026, L * 0.82, 7), clay(OC.vioD), 0, L * 0.41, 0));
          tentacle(p, [V(0, L * 0.6, 0), V(0, L * 0.82, 0), V(0.01, L * 0.95, 0), ...curl(0.06, L * 0.98, 0.06, Math.PI, 0.85, 0.6, 12, 0, -1)], 0.02, 0.007, OC.pink, { n: 6, t0: 0.2 });
        } }, b => { const d = M(new THREE.SphereGeometry(0.04, 10, 8), clay(OC.vioD, { smooth: true }), 0, -0.01, 0); d.scale.y = 1.1; b.add(d); b.add(M(new THREE.ConeGeometry(0.026, 0.05, 8), clay(OC.vioD), 0, 0.045, 0)); });
      },
    },
  };
}

export const SETS = Object.freeze({
  tools_candy: {
    ico: '🍬', name: '사탕 지팡이 세트', pal: CD, themes: candyThemes,
    refs: [['snowman', '기존 ⛄ 눈사람', '초록/크림 니트·숯·당근'], ['harvest', '기존 🌽 수확제', '짚·옥수수·빨간 끈']],
    dirs: [
      ['A', '지팡이 갈고리', '빨강/흰 줄무늬 지팡이 자루가 위에서 갈고리로 말리고, 날은 줄무늬 사탕판'],
      ['B', '페퍼민트 소용돌이', '도끼날·물통이 통째로 포장된 페퍼민트 사탕(소용돌이 + 민트 포장 꼬임)'],
      ['C', '젤리 검드롭', '민트 줄무늬 막대 + 설탕 묻은 검드롭 알 장식, 분홍 젤리 날'],
    ],
  },
  tools_octopus: {
    ico: '🐙', name: '문어 세트', pal: OC, themes: octopusThemes,
    refs: [['shell', '기존 🐚 바닷가 조개', '산호 가리비·청록·진주']],
    dirs: [
      ['A', '꼬마 문어 머리', '도구 머리에 눈 달린 문어 머리, 다리 셋이 말려 도끼날 · 물조리개는 문어가 통째로'],
      ['B', '빨판 촉수 감기', '보라 날에 빨판 무늬, 촉수가 자루를 감아 오르다 끝이 말림 (y ≥ 0.18부터)'],
      ['C', '말린 다리 날', '굵은 다리 하나가 돌돌 말려 도끼날 · 먹물 보라 항아리에서 다리가 넘침'],
    ],
  },
});
