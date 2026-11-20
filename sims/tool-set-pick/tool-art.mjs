export const SM = Object.freeze({ snow: 0xcfd6de, snowS: 0xb3bfcb, coal: 0x34343e, carrot: 0xe07a2a, carrotD: 0xb95f1f, sprout: 0x5f8f4a, knitG: 0x3e8a68, knitC: 0xe0cfae, twig: 0x6e4b33, twigD: 0x54382a, wood: 0xb08a62, hat: 0x2f3140 });
export const SQ = Object.freeze({ wood: 0xa8784c, woodD: 0x7a5232, fur: 0xb5622f, furD: 0x8a4624, cream: 0xe2cfae, nut: 0xc08648, nutD: 0x9a6636, cap: 0x6e4a2c, capL: 0x8c6440, pine: 0x80522f, pineL: 0xa8743f, ink: 0x2b221c });

const BLADE = [[0.02, -0.045], [0.14, -0.095], [0.19, -0.105], [0.205, 0], [0.19, 0.105], [0.14, 0.095], [0.02, 0.045]];
const EDGE = [[0.18, -0.108], [0.205, -0.112], [0.222, 0], [0.205, 0.112], [0.18, 0.108], [0.198, 0]];

export function simKit(THREE) {
  const clay = (color, o = {}) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0, flatShading: !o.smooth, side: o.side ?? THREE.FrontSide });
    if (o.opacity != null) { m.transparent = true; m.opacity = o.opacity; }
    return m;
  };
  const M = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); return m; };
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const ext = (shape, depth, bev = 0.01, seg = 12) => {
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bev > 0, bevelThickness: bev, bevelSize: bev, bevelSegments: 2, curveSegments: seg });
    g.translate(0, 0, -depth / 2); return g;
  };
  return { clay, M, V, ext };
}

function common(THREE, K) {
  const { M, V } = K;
  const seg = (p, a, b, r0, r1, mat) => {
    const d = b.clone().sub(a), m = M(new THREE.CylinderGeometry(r1, r0, d.length(), 6), mat, (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
    m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); p.add(m); return m;
  };
  const arcHandle = (g, mat, x, y, r = 0.075, t = 0.015) => { const h = M(new THREE.TorusGeometry(r, t, 5, 12, Math.PI * 1.05), mat, x, y, 0); h.rotation.z = Math.PI / 2 + 0.25; g.add(h); return h; };
  const spout = (g, mat, r0 = 0.032, r1 = 0.02) => { const s = M(new THREE.CylinderGeometry(r1, r0, 0.22, 8), mat, 0.15, 0.22, 0); s.rotation.z = -0.9; g.add(s); return s; };
  return { seg, arcHandle, spout };
}

export function baseTools(THREE, K, X) {
  const { clay, M } = K;
  const B = { wood: 0x8a5a3a, grip: 0x5f3d26, metal: 0x6d757c, edge: 0xd9dfe4, can: 0x8fd0ea, pole: 0x7a4a2a };
  return {
    axe(g) {
      const top = X.handle(g, B, 0.52);
      g.add(M(new THREE.BoxGeometry(0.17, 0.13, 0.06), clay(B.metal), 0.075, top - 0.05, 0));
      const bl = M(new THREE.BoxGeometry(0.07, 0.155, 0.028), clay(B.edge), 0.175, top - 0.05, 0); bl.rotation.z = 0.06; g.add(bl);
      g.add(M(new THREE.BoxGeometry(0.05, 0.09, 0.07), clay(B.metal), -0.035, top - 0.05, 0));
      g.scale.setScalar(1.18);
    },
    water(g) {
      g.add(M(new THREE.CylinderGeometry(0.11, 0.12, 0.2, 10), clay(B.can), 0, 0.18, 0));
      const sp = M(new THREE.CylinderGeometry(0.02, 0.035, 0.22, 6), clay(B.can), 0.15, 0.26, 0); sp.rotation.z = -0.9; g.add(sp);
      g.scale.setScalar(1.25);
    },
    rod(g) {
      X.rodFrame(g, { knobFn: g => g.add(M(new THREE.SphereGeometry(0.04, 7, 6), clay(B.grip), 0, -0.09, 0)), rear: clay(B.grip),
        pole: (p, L) => p.add(M(new THREE.CylinderGeometry(0.013, 0.026, L, 6), clay(B.pole), 0, L / 2, 0)) },
      b => { const s = M(new THREE.SphereGeometry(0.042, 8, 7), clay(0xd94f4f)); s.scale.set(1, 1.25, 1); b.add(s); b.add(M(new THREE.CylinderGeometry(0.04, 0.04, 0.022, 9), clay(0xf4efe6))); });
    },
  };
}

export function snowmanThemes(THREE, K, X) {
  const { clay, M, V, ext } = K;
  const { small, polyShape } = X;
  const { seg, arcHandle, spout } = common(THREE, K);
  const ball = (p, r, x, y, z, c = SM.snow) => { const m = M(new THREE.SphereGeometry(r, 14, 10), clay(c, { smooth: true }), x, y, z); p.add(m); return m; };
  const coal = (p, r, x, y, z) => p.add(small(M(new THREE.IcosahedronGeometry(r, 0), clay(SM.coal), x, y, z)));
  const lump = (p, r, x, y, z, sz = 0.5) => { const m = M(new THREE.IcosahedronGeometry(r, 1), clay(SM.snow), x, y, z); m.scale.z = sz; p.add(m); return m; };
  const bands = (p, y0, y1, r, n, cols = [SM.knitG, SM.knitC]) => {
    const h = (y1 - y0) / n;
    for (let i = 0; i < n; i++) p.add(M(new THREE.CylinderGeometry(r, r, h, 9), clay(cols[i % cols.length]), 0, y0 + h * (i + 0.5), 0));
  };
  function topHat(p, r, x, y, z) {
    p.add(M(new THREE.CylinderGeometry(r * 1.55, r * 1.55, r * 0.18, 12), clay(SM.hat), x, y, z));
    p.add(M(new THREE.CylinderGeometry(r, r * 1.04, r * 1.3, 12), clay(SM.hat), x, y + r * 0.72, z));
    p.add(M(new THREE.CylinderGeometry(r * 1.07, r * 1.07, r * 0.32, 12), clay(SM.knitG), x, y + r * 0.3, z));
  }
  function carrot(len, r, leaves = true) {
    const c = new THREE.Group();
    const body = M(new THREE.ConeGeometry(r, len, 7), clay(SM.carrot), 0, -len / 2, 0); body.rotation.x = Math.PI; c.add(body);
    [0.25, 0.5].forEach(f => { const t = M(new THREE.TorusGeometry(r * (1 - f), r * 0.13, 3, 8), clay(SM.carrotD), 0, -len * f, 0); t.rotation.x = Math.PI / 2; c.add(t); });
    if (leaves) [-0.5, 0, 0.5].forEach(a => { const l = M(new THREE.ConeGeometry(r * 0.38, len * 0.42, 4), clay(SM.sprout), Math.sin(a) * r * 0.6, len * 0.18, 0); l.rotation.z = -a; c.add(l); });
    return c;
  }
  function scarfTail(p, x, y, z, len, w, rz, ry = 0) {
    const t = new THREE.Group(); t.position.set(x, y, z); t.rotation.set(0, ry, rz); p.add(t);
    const n = 4, h = len / n;
    for (let i = 0; i < n; i++) t.add(M(new THREE.BoxGeometry(w, h, w * 0.32), clay(i % 2 ? SM.knitC : SM.knitG), 0, -h * (i + 0.5), 0));
    [-1, 0, 1].forEach(k => t.add(small(M(new THREE.BoxGeometry(w * 0.18, h * 0.5, w * 0.22), clay(SM.knitG), k * w * 0.33, -len - h * 0.22, 0))));
    return t;
  }
  function face(p, r, x, y, z, ry = 0, nose = 0.6) {
    const f = new THREE.Group(); f.position.set(x, y, z); f.rotation.y = ry; p.add(f);
    [-1, 1].forEach(s => coal(f, r * 0.14, s * r * 0.36, r * 0.25, r * 0.9));
    const n = carrot(r * nose, r * 0.17, false); n.rotation.x = -Math.PI / 2; n.position.set(0, 0, r * 0.9); f.add(n);
    return f;
  }
  const on = (r, cy, az, el) => V(Math.cos(el) * Math.cos(az) * r, cy + Math.sin(el) * r, Math.cos(el) * Math.sin(az) * r);
  const knob = (g, r) => ball(g, r * 1.55, 0, -0.085, 0);
  const handleA = (g, l, r = 0.031) => { const top = X.handle(g, { wood: SM.twig, grip: SM.knitG, knobFn: knob }, l, r); bands(g, -0.055, 0.015, r * 1.22, 3); return top; };
  const handleB = (g, l, r = 0.031) => { const top = X.handle(g, { wood: SM.wood, grip: SM.knitG, knobFn: knob }, l, r); bands(g, -0.055, l * 0.62 - 0.08, r * 1.24, 7); return top; };
  function handleC(g, l, r = 0.03) {
    const top = X.handle(g, { wood: SM.twig, grip: SM.twigD, knobFn: knob }, l, r);
    seg(g, V(0, l * 0.3, 0), V(-0.065, l * 0.3 + 0.075, 0.01), 0.011, 0.005, clay(SM.twig));
    seg(g, V(0, l * 0.52, 0), V(0.05, l * 0.52 + 0.055, -0.01), 0.009, 0.004, clay(SM.twig));
    [0.16, 0.42].forEach(f => g.add(M(new THREE.SphereGeometry(r * 1.15, 6, 4), clay(SM.twigD), 0, l * f - 0.05, 0)));
    return top;
  }
  return {
    A: {
      axe(g) {
        const top = handleA(g, 0.52), cy = top - 0.05;
        ball(g, 0.06, 0, cy + 0.01, 0);
        topHat(g, 0.034, 0, cy + 0.064, 0);
        face(g, 0.06, 0, cy + 0.01, 0, 0.35);
        [[0.05, SM.knitG], [0.068, SM.knitC]].forEach(([x, c]) => { const s = M(new THREE.TorusGeometry(0.046, 0.012, 5, 12), clay(c), x, cy, 0); s.rotation.y = Math.PI / 2; g.add(s); });
        scarfTail(g, 0.058, cy - 0.03, 0.045, 0.1, 0.03, 0.45);
        ball(g, 0.072, 0.115, cy, 0).scale.z = 0.55;
        ball(g, 0.1, 0.2, cy, 0).scale.set(0.8, 1.2, 0.45);
        [-1, 1].forEach(sz => [[0.115, 0.02, 0.04], [0.2, 0.045, 0.045], [0.2, -0.03, 0.045]].forEach(([x, y, z]) => coal(g, 0.012, x, cy + y, sz * z)));
        g.scale.setScalar(1.18);
      },
      water(g) {
        ball(g, 0.13, 0, 0.15, 0);
        topHat(g, 0.07, 0, 0.268, 0);
        [0.3, 0.9].forEach(a => { const p = on(0.13, 0.15, a, 0.38); coal(g, 0.015, p.x, p.y, p.z); });
        [0.28, 0.46, 0.64, 0.82].forEach((a, i) => { const p = on(0.13, 0.15, a, i % 3 ? -0.3 : -0.22); coal(g, 0.01, p.x, p.y, p.z); });
        const sp = carrot(0.26, 0.034, false); sp.position.copy(on(0.11, 0.15, 0.12, 0.12)); sp.rotation.z = Math.PI / 2 + 0.55; g.add(sp);
        [[0.05, 0.085, SM.knitG, 0.022], [0.075, 0.102, SM.knitC, 0.017]].forEach(([y, r, c, t]) => { const s = M(new THREE.TorusGeometry(r, t, 5, 16), clay(c), 0, y, 0); s.rotation.x = Math.PI / 2; g.add(s); });
        scarfTail(g, -0.03, 0.06, 0.09, 0.1, 0.034, 0.2, -0.4);
        arcHandle(g, clay(SM.twig), -0.15, 0.16, 0.075, 0.014);
        seg(g, V(-0.2, 0.22, 0), V(-0.26, 0.27, 0.01), 0.008, 0.004, clay(SM.twig));
        seg(g, V(-0.21, 0.2, 0), V(-0.27, 0.19, -0.01), 0.008, 0.004, clay(SM.twig));
        g.scale.setScalar(1.25);
      },
      rod(g) {
        X.rodFrame(g, { knobFn: g => { ball(g, 0.046, 0, -0.1, 0); bands(g, -0.07, 0.08, 0.033, 5); }, rear: clay(SM.knitG), line: 0xe8e4d8, pole: (p, L) => {
          p.add(M(new THREE.CylinderGeometry(0.013, 0.026, L, 7), clay(SM.twig), 0, L / 2, 0));
          [0.35, 0.62].forEach((f, i) => seg(p, V(0, L * f, 0), V(i ? 0.05 : -0.05, L * f + 0.065, 0), 0.007, 0.003, clay(SM.twig)));
        } }, b => {
          ball(b, 0.046, 0, -0.02, 0); ball(b, 0.033, 0, 0.046, 0);
          topHat(b, 0.021, 0, 0.075, 0);
          face(b, 0.033, 0, 0.046, 0, 0.3, 0.9);
          coal(b, 0.007, 0.014, -0.005, 0.042);
        });
      },
    },
    B: {
      axe(g) {
        const l = 0.52, top = handleB(g, l), cy = top - 0.05, ky = l * 0.62 - 0.08;
        g.add(M(new THREE.SphereGeometry(0.044, 8, 6), clay(SM.knitG), 0, ky + 0.01, 0));
        scarfTail(g, -0.02, ky, 0.03, 0.16, 0.038, -0.55, 0.2);
        scarfTail(g, -0.02, ky, -0.01, 0.11, 0.032, -0.25, -0.2);
        g.add(M(new THREE.BoxGeometry(0.06, 0.12, 0.07), clay(SM.snowS), 0, cy, 0));
        g.add(M(ext(polyShape(BLADE), 0.04, 0.01, 2), clay(SM.snow, { smooth: true }), 0, cy, 0));
        g.add(M(ext(polyShape(EDGE), 0.034, 0.006, 2), clay(SM.carrot), 0, cy, 0));
        ball(g, 0.048, -0.055, cy, 0);
        [-1, 1].forEach(sz => [[0.07, 0.03], [0.11, -0.02], [0.15, 0.045]].forEach(([x, y]) => coal(g, 0.012, x, cy + y, sz * 0.032)));
        g.scale.setScalar(1.18);
      },
      water(g) {
        g.add(M(new THREE.CylinderGeometry(0.108, 0.118, 0.2, 12), clay(SM.snow), 0, 0.18, 0));
        [[0.135, SM.knitG], [0.175, SM.knitC], [0.215, SM.knitG]].forEach(([y, c]) => g.add(M(new THREE.CylinderGeometry(0.121, 0.123, 0.04, 12), clay(c), 0, y, 0)));
        const cuff = M(new THREE.TorusGeometry(0.118, 0.014, 5, 16), clay(SM.knitC), 0, 0.24, 0); cuff.rotation.x = Math.PI / 2; g.add(cuff);
        g.add(X.hemi(0.105, clay(SM.snow, { smooth: true }), 0, 0.28, 0, 0.45));
        ball(g, 0.036, 0, 0.33, 0);
        spout(g, clay(SM.snow));
        const rose = M(new THREE.ConeGeometry(0.042, 0.055, 9), clay(SM.carrot), 0.243, 0.32, 0); rose.rotation.z = Math.PI - 0.9; g.add(rose);
        arcHandle(g, clay(SM.knitG), -0.14, 0.18);
        scarfTail(g, -0.17, 0.26, 0.03, 0.15, 0.04, -0.3);
        [0.5, 1.1].forEach(a => coal(g, 0.012, Math.cos(a) * 0.112, 0.095, Math.sin(a) * 0.112));
        g.scale.setScalar(1.25);
      },
      rod(g) {
        X.rodFrame(g, { knobFn: g => { ball(g, 0.046, 0, -0.1, 0); bands(g, -0.08, 0.085, 0.033, 5); }, rear: clay(SM.knitG), line: 0xe8e4d8, pole: (p, L) => {
          p.add(M(new THREE.CylinderGeometry(0.013, 0.026, L, 7), clay(SM.wood), 0, L / 2, 0));
          for (let i = 0; i < 6; i++) { const f = 0.08 + i * 0.12, r = 0.028 - f * 0.012; p.add(M(new THREE.CylinderGeometry(r, r, 0.05, 8), clay(i % 2 ? SM.knitC : SM.knitG), 0, L * f, 0)); }
          scarfTail(p, -0.01, L * 0.12, 0.02, 0.22, 0.042, -1.05);
        } }, b => {
          ball(b, 0.048, 0, 0, 0);
          const t = M(new THREE.TorusGeometry(0.047, 0.013, 5, 14), clay(SM.knitG)); t.rotation.x = Math.PI / 2; b.add(t);
          const c = carrot(0.055, 0.017, false); c.position.y = -0.042; b.add(c);
        });
      },
    },
    C: {
      axe(g) {
        const top = handleC(g, 0.52), cy = top - 0.05;
        ball(g, 0.055, 0, cy, 0);
        [[0.075, 0, 0.065], [0.12, 0.05, 0.056], [0.12, -0.05, 0.056], [0.155, 0.085, 0.042], [0.155, -0.085, 0.042], [0.158, 0, 0.06]].forEach(([x, y, r]) => lump(g, r, x, cy + y, 0));
        const c = carrot(0.27, 0.031); c.position.set(0.205, cy + 0.125, 0); g.add(c);
        [-1, 1].forEach(sz => [[0.08, 0.02], [0.125, -0.045], [0.13, 0.055]].forEach(([x, y]) => coal(g, 0.014, x, cy + y, sz * 0.03)));
        g.add(M(new THREE.IcosahedronGeometry(0.032, 0), clay(SM.coal), -0.06, cy, 0));
        g.scale.setScalar(1.18);
      },
      water(g) {
        g.add(M(new THREE.CylinderGeometry(0.105, 0.125, 0.19, 10), clay(SM.snow), 0, 0.165, 0));
        for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; lump(g, 0.042, Math.cos(a) * 0.095, 0.265, Math.sin(a) * 0.095, 0.8); }
        for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2 + 0.2; coal(g, 0.017, Math.cos(a) * 0.117, 0.15, Math.sin(a) * 0.117); }
        const sp = carrot(0.26, 0.036); sp.position.set(0.245, 0.335, 0); sp.rotation.z = -0.9; g.add(sp);
        arcHandle(g, clay(SM.twig), -0.14, 0.17);
        seg(g, V(-0.2, 0.235, 0), V(-0.265, 0.3, 0.01), 0.009, 0.004, clay(SM.twig));
        g.scale.setScalar(1.25);
      },
      rod(g) {
        X.rodFrame(g, { knobFn: g => ball(g, 0.046, 0, -0.1, 0), rear: clay(SM.twigD), line: 0xe8e4d8, pole: (p, L) => {
          p.add(M(new THREE.CylinderGeometry(0.012, 0.026, L, 6), clay(SM.twig), 0, L / 2, 0));
          [0.2, 0.45, 0.7].forEach(f => p.add(M(new THREE.SphereGeometry(0.028 - f * 0.013, 6, 4), clay(SM.twigD), 0, L * f, 0)));
          seg(p, V(0, L * 0.45, 0), V(-0.06, L * 0.45 + 0.085, 0), 0.008, 0.004, clay(SM.twig));
          seg(p, V(0, L * 0.7, 0), V(0.05, L * 0.7 + 0.065, 0), 0.007, 0.003, clay(SM.twig));
        } }, b => { const c = carrot(0.12, 0.03); c.position.y = 0.045; b.add(c); });
      },
    },
  };
}

export function squirrelThemes(THREE, K, X) {
  const { clay, M, V, ext } = K;
  const { small, polyShape, hemi } = X;
  const { seg, arcHandle, spout } = common(THREE, K);
  function puff(p, pts, rad, tip = 0.76, n = 14, base = SQ.fur) {
    const c = new THREE.CatmullRomCurve3(pts);
    for (let i = 0; i <= n; i++) { const t = i / n, q = c.getPointAt(t); p.add(M(new THREE.IcosahedronGeometry(rad(t), 1), clay(t > tip ? SQ.cream : base), q.x, q.y, q.z)); }
  }
  const fluff = (lo, hi) => t => lo + (hi - lo) * Math.sin(Math.PI * (0.15 + 0.7 * t));
  function acorn(p, s, x, y, z) {
    const a = new THREE.Group(); a.position.set(x, y, z); p.add(a);
    const n = M(new THREE.SphereGeometry(0.1 * s, 12, 10), clay(SQ.nut, { smooth: true }), 0, -0.02 * s, 0); n.scale.set(1, 1.2, 1); a.add(n);
    const tp = M(new THREE.ConeGeometry(0.028 * s, 0.05 * s, 6), clay(SQ.nutD), 0, -0.155 * s, 0); tp.rotation.x = Math.PI; a.add(tp);
    a.add(hemi(0.112 * s, clay(SQ.capL), 0, 0.03 * s, 0, 0.72, 12));
    const rim = M(new THREE.TorusGeometry(0.108 * s, 0.018 * s, 5, 16), clay(SQ.cap), 0, 0.03 * s, 0); rim.rotation.x = Math.PI / 2; a.add(rim);
    for (let i = 0; i < 10; i++) {
      const ang = i / 10 * Math.PI * 2, el = i % 2 ? 0.5 : 0.95;
      a.add(small(M(new THREE.SphereGeometry(0.02 * s, 5, 4), clay(SQ.cap), Math.cos(ang) * Math.cos(el) * 0.112 * s, 0.03 * s + Math.sin(el) * 0.08 * s, Math.sin(ang) * Math.cos(el) * 0.112 * s)));
    }
    a.add(M(new THREE.TorusGeometry(0.03 * s, 0.011 * s, 4, 8, Math.PI), clay(SQ.woodD), 0.03 * s, 0.108 * s, 0));
    return a;
  }
  function pinecone(p, s, x, y, z) {
    const g = new THREE.Group(); g.position.set(x, y, z); p.add(g);
    const core = M(new THREE.SphereGeometry(0.075 * s, 10, 8), clay(SQ.pine), 0, 0, 0); core.scale.set(1, 1.35, 1); g.add(core);
    const R = 6;
    for (let k = 0; k < R; k++) {
      const t = (k + 0.5) / R, yy = (0.5 - t) * 0.2 * s, rho = (0.035 + 0.05 * Math.sin(Math.PI * Math.pow(t, 0.8))) * s, n = 7;
      for (let i = 0; i < n; i++) {
        const a = (i + (k % 2) * 0.5) / n * Math.PI * 2;
        const sc = M(new THREE.ConeGeometry(0.03 * s, 0.055 * s, 4), clay(k % 2 ? SQ.pineL : SQ.pine), Math.cos(a) * rho, yy, Math.sin(a) * rho);
        sc.quaternion.setFromUnitVectors(V(0, 1, 0), V(Math.cos(a), -0.7, Math.sin(a)).normalize()); sc.scale.set(1, 1, 0.5); g.add(sc);
      }
    }
    g.add(M(new THREE.CylinderGeometry(0.008 * s, 0.012 * s, 0.04 * s, 5), clay(SQ.woodD), 0, 0.13 * s, 0));
    return g;
  }
  function sqHead(p, r, x, y, z, ry = 0) {
    const h = new THREE.Group(); h.position.set(x, y, z); h.rotation.y = ry; p.add(h);
    h.add(M(new THREE.SphereGeometry(r, 12, 10), clay(SQ.fur, { smooth: true })));
    const mz = M(new THREE.SphereGeometry(r * 0.52, 10, 8), clay(SQ.cream, { smooth: true }), 0, -r * 0.22, r * 0.66); mz.scale.set(1.1, 0.85, 0.75); h.add(mz);
    [-1, 1].forEach(s => {
      h.add(small(M(new THREE.SphereGeometry(r * 0.13, 6, 5), clay(SQ.ink), s * r * 0.4, r * 0.2, r * 0.84)));
      const e = M(new THREE.ConeGeometry(r * 0.3, r * 0.62, 6), clay(SQ.fur), s * r * 0.5, r * 0.95, -r * 0.05); e.rotation.z = -s * 0.3; h.add(e);
      const tf = M(new THREE.ConeGeometry(r * 0.13, r * 0.34, 5), clay(SQ.furD), s * r * 0.62, r * 1.33, -r * 0.05); tf.rotation.z = -s * 0.3; h.add(tf);
    });
    h.add(small(M(new THREE.SphereGeometry(r * 0.11, 6, 5), clay(SQ.ink), 0, -r * 0.05, r * 1.0)));
    h.add(small(M(new THREE.BoxGeometry(r * 0.22, r * 0.2, r * 0.06), clay(SQ.cream), 0, -r * 0.44, r * 0.96)));
    return h;
  }
  const handle = (g, l, P = {}, r = 0.031) => X.handle(g, { wood: SQ.wood, grip: SQ.woodD, knob: SQ.nutD, ...P }, l, r);
  return {
    A: {
      axe(g) {
        const top = handle(g, 0.52, { grip: SQ.cap, knobFn: (g, r) => { const c = hemi(r * 1.7, clay(SQ.capL), 0, -0.06, 0, 0.8, 10); c.rotation.x = Math.PI; g.add(c); } }), cy = top - 0.05;
        g.add(M(new THREE.BoxGeometry(0.06, 0.12, 0.07), clay(SQ.woodD), 0, cy, 0));
        const a = acorn(g, 0.95, 0.11, cy, 0); a.rotation.z = Math.PI / 2; a.scale.set(1.3, 0.8, 0.5);
        g.scale.setScalar(1.18);
      },
      water(g) {
        acorn(g, 1.3, 0, 0.22, 0);
        spout(g, clay(SQ.nut));
        const rose = hemi(0.045, clay(SQ.capL), 0, 0, 0, 0.7, 10); rose.position.set(0.24, 0.3, 0); rose.rotation.z = -0.9; g.add(rose);
        arcHandle(g, clay(SQ.woodD), -0.155, 0.2);
        g.scale.setScalar(1.25);
      },
      rod(g) {
        X.rodFrame(g, { knobFn: g => { acorn(g, 0.55, 0, -0.1, 0).rotation.x = Math.PI; }, rear: clay(SQ.cap), line: 0xeadcc4, pole: (p, L) => {
          p.add(M(new THREE.CylinderGeometry(0.013, 0.026, L, 7), clay(SQ.wood), 0, L / 2, 0));
          [0.25, 0.5, 0.75].forEach(f => p.add(M(new THREE.CylinderGeometry(0.026 - f * 0.011, 0.026 - f * 0.011, 0.022, 7), clay(SQ.capL), 0, L * f, 0)));
        } }, b => {
          seg(b, V(0, 0.07, 0), V(0, 0.02, 0), 0.005, 0.005, clay(SQ.woodD));
          [-1, 1].forEach(s => { seg(b, V(0, 0.022, 0), V(s * 0.036, -0.008, 0), 0.005, 0.005, clay(SQ.woodD)); acorn(b, 0.38, s * 0.04, -0.045, 0); });
        });
      },
    },
    B: {
      axe(g) {
        const top = handle(g, 0.52), cy = top - 0.05;
        puff(g, [V(0, -0.07, 0), V(-0.1, -0.04, 0), V(-0.15, 0.08, 0), V(-0.14, 0.22, 0), V(-0.08, 0.28, 0), V(-0.05, 0.21, 0)], fluff(0.03, 0.062), 0.72, 16);
        g.add(M(new THREE.BoxGeometry(0.06, 0.12, 0.07), clay(SQ.woodD), 0, cy, 0));
        g.add(M(ext(polyShape(BLADE), 0.04, 0.01, 2), clay(SQ.fur), 0, cy, 0));
        g.add(M(ext(polyShape(EDGE), 0.034, 0.006, 2), clay(SQ.cream), 0, cy, 0));
        acorn(g, 0.34, 0, cy + 0.09, 0);
        g.scale.setScalar(1.18);
      },
      water(g) {
        const body = M(new THREE.SphereGeometry(0.13, 14, 10), clay(SQ.fur, { smooth: true }), 0, 0.17, 0); body.scale.set(0.95, 0.88, 0.95); g.add(body);
        const n = V(Math.cos(0.75), 0, Math.sin(0.75)), belly = M(new THREE.SphereGeometry(0.058, 12, 8), clay(SQ.cream, { smooth: true }), n.x * 0.1, 0.15, n.z * 0.1);
        belly.quaternion.setFromUnitVectors(V(0, 0, 1), n); belly.scale.set(1, 1.3, 0.35); g.add(belly);
        g.add(hemi(0.075, clay(SQ.furD), 0, 0.265, 0, 0.5));
        acorn(g, 0.32, 0, 0.32, 0);
        spout(g, clay(SQ.cream));
        const rose = hemi(0.045, clay(SQ.capL), 0, 0, 0, 0.7, 10); rose.position.set(0.24, 0.3, 0); rose.rotation.z = -0.9; g.add(rose);
        puff(g, [V(-0.1, 0.08, 0), V(-0.19, 0.14, 0), V(-0.22, 0.27, 0), V(-0.17, 0.39, 0), V(-0.08, 0.42, 0), V(-0.05, 0.35, 0)], fluff(0.034, 0.07), 0.74, 16);
        g.scale.setScalar(1.25);
      },
      rod(g) {
        X.rodFrame(g, { knobFn: g => {
          g.add(M(new THREE.SphereGeometry(0.04, 7, 6), clay(SQ.woodD), 0, -0.09, 0));
          const pts = []; for (let i = 0; i <= 8; i++) { const t = i / 8, a = t * Math.PI * 2.4; pts.push(V(Math.cos(a) * 0.045, -0.1 + t * 0.2, Math.sin(a) * 0.045)); }
          puff(g, pts, fluff(0.024, 0.036), 0.8, 18);
        }, rear: clay(SQ.woodD), line: 0xeadcc4, pole: (p, L) => {
          p.add(M(new THREE.CylinderGeometry(0.013, 0.026, L, 7), clay(SQ.wood), 0, L / 2, 0));
          [0.3, 0.6].forEach(f => p.add(M(new THREE.CylinderGeometry(0.026 - f * 0.011, 0.026 - f * 0.011, 0.022, 7), clay(SQ.fur), 0, L * f, 0)));
        } }, b => puff(b, [V(0, 0.03, 0), V(0.035, -0.01, 0), V(0.012, -0.06, 0), V(-0.03, -0.05, 0), V(-0.022, -0.015, 0)], fluff(0.022, 0.038), 0.7, 9));
      },
    },
    C: {
      axe(g) {
        const top = handle(g, 0.52), cy = top - 0.05;
        g.add(M(ext(polyShape(BLADE), 0.036, 0.008, 2), clay(SQ.pine), 0, cy, 0));
        [-1, 1].forEach(sz => { for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) {
          const x = 0.07 + c * 0.045 + (r % 2) * 0.022, y = -0.07 + r * 0.047;
          if (x > 0.2 || Math.abs(y) > 0.035 + x * 0.35) continue;
          const s = M(new THREE.SphereGeometry(0.027, 6, 4), clay(r % 2 ? SQ.pineL : SQ.nutD), x, cy + y, sz * 0.022); s.scale.set(1, 0.7, 0.4); g.add(s);
        } });
        sqHead(g, 0.06, 0, cy + 0.02, 0, 0.35);
        g.scale.setScalar(1.18);
      },
      water(g) {
        pinecone(g, 1.45, 0, 0.18, 0);
        sqHead(g, 0.075, 0, 0.37, 0, 0.6);
        spout(g, clay(SQ.wood), 0.03, 0.018);
        pinecone(g, 0.42, 0.245, 0.315, 0).rotation.z = -0.9;
        arcHandle(g, clay(SQ.woodD), -0.16, 0.19);
        g.scale.setScalar(1.25);
      },
      rod(g) {
        X.rodFrame(g, { knobFn: g => pinecone(g, 0.55, 0, -0.1, 0), rear: clay(SQ.woodD), line: 0xeadcc4, pole: (p, L) => {
          p.add(M(new THREE.CylinderGeometry(0.013, 0.026, L, 7), clay(SQ.wood), 0, L / 2, 0));
          [0.25, 0.5, 0.75].forEach((f, i) => p.add(M(new THREE.CylinderGeometry(0.026 - f * 0.011, 0.026 - f * 0.011, 0.022, 7), clay(i % 2 ? SQ.pineL : SQ.pine), 0, L * f, 0)));
        } }, b => sqHead(b, 0.045, 0, 0, 0, 0.3));
      },
    },
  };
}

export const SETS = Object.freeze({
  tools_snowman: {
    ico: '⛄', name: '눈사람 세트', pal: SM, themes: snowmanThemes,
    refs: [['frost', '기존 ❄️ 눈꽃 겨울', '얼음 날·눈꽃 보석·빨간 니트 (물조리개는 이미 눈사람)']],
    dirs: [
      ['A', '꼬마 눈사람', '도구 머리 = 누운 눈사람. 실크햇·숯 눈·당근 코, 몸통 눈덩이가 도끼날'],
      ['B', '줄무늬 목도리', '자루·통을 초록/크림 줄무늬 니트로 감고 목도리 꼬리가 펄럭. 날은 눈 + 당근색 날끝'],
      ['C', '눈사람 재료', '나뭇가지 자루, 울퉁불퉁 눈덩이 날, 당근이 날끝·꼭지, 숯 조약돌 박기'],
    ],
  },
  tools_squirrel: {
    ico: '🐿️', name: '다람쥐 도토리 세트', pal: SQ, themes: squirrelThemes,
    refs: [['maple', '기존 🍁 단풍 숲', '단풍잎 날·작은 도토리 손잡이 끝'], ['shroom', '기존 🍄 버섯 숲', '빨간 갓·흰 점']],
    dirs: [
      ['A', '도토리 머리', '도끼날·물조리개 통이 통째로 도토리. 깍정이 비늘·꼭지 덩굴'],
      ['B', '복슬 꼬리 손잡이', '복슬한 다람쥐 꼬리가 자루·손잡이를 감아 오름. 적갈색 + 크림 끝'],
      ['C', '솔방울 다람쥐', '다람쥐 얼굴(귀 술)이 머리에, 솔방울 비늘 날·솔방울 통'],
    ],
  },
});
