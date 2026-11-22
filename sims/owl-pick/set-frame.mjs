import { simKit as baseSimKit, baseTools } from '../tool-set-pick/tool-art.mjs';
export { baseTools };

const TAU = Math.PI * 2;

export function simKit(THREE) {
  const K = baseSimKit(THREE);
  const clay = (c, o = {}) => {
    const m = K.clay(c, o);
    if (o.lift) { m.emissive.setHex(c); m.emissiveIntensity = o.lift; }
    return m;
  };
  return { ...K, clay };
}

export function critterKit(THREE, K, X) {
  const { clay, M } = K;
  const { small } = X;
  const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const grp = (p, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); p.add(g); return g; };
  const sph = (p, r, col, x, y, z, s = [1, 1, 1], ws = 18, lift = 0) => { const m = M(new THREE.SphereGeometry(r, ws, Math.max(6, ws * 0.75 | 0)), clay(col, { smooth: true, lift }), x, y, z); m.scale.set(...s); p.add(m); return m; };
  const dot = (p, r, col, x, y, z, s = [1, 1, 1], lift = 0) => { const m = small(M(new THREE.SphereGeometry(r, 8, 6), clay(col, { smooth: true, lift }), x, y, z)); m.scale.set(...s); p.add(m); return m; };
  const surf = ax => (x, y, s = 1) => {
    const q = 1 - (x / ax[0]) ** 2 - (y / ax[1]) ** 2;
    if (q <= 0) return null;
    const z = s * ax[2] * Math.sqrt(q);
    return { p: V3(x, y, z), n: V3(x / ax[0] ** 2, y / ax[1] ** 2, z / ax[2] ** 2).normalize() };
  };
  const dirSurf = (ax, c = V3()) => d => {
    const k = 1 / Math.sqrt((d.x / ax[0]) ** 2 + (d.y / ax[1]) ** 2 + (d.z / ax[2]) ** 2), p = d.clone().multiplyScalar(k);
    return { p: p.clone().add(c), n: V3(p.x / ax[0] ** 2, p.y / ax[1] ** 2, p.z / ax[2] ** 2).normalize() };
  };
  function stick(g, m, hit, lift = 0) { m.position.copy(hit.p).addScaledVector(hit.n, lift); m.quaternion.setFromUnitVectors(V3(0, 0, 1), hit.n); g.add(m); return m; }
  function tube(p, pts, r, col, seg = 12, caps = true) {
    const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), seg, r, 6, false), clay(col, { smooth: true })); p.add(m);
    if (caps) [pts[0], pts[pts.length - 1]].forEach(q => p.add(small(M(new THREE.SphereGeometry(r, 6, 5), clay(col, { smooth: true }), q.x, q.y, q.z))));
    return m;
  }
  function eye(g, r, hit, P, o = {}) {
    const e = new THREE.Group(); stick(g, e, hit, o.out ?? 0);
    const lift = o.lift ?? 0.3;
    if (o.ring) {
      sph(e, r, o.ring, 0, 0, 0, [1, 1, 0.42], 16, lift);
      sph(e, r * 0.62, P.ink, 0, 0, r * 0.2, [1, 1, 0.5], 14);
      dot(e, r * 0.26, P.hi, r * 0.22, r * 0.26, r * 0.46, [1, 1, 0.6], lift);
      dot(e, r * 0.12, P.hi, -r * 0.2, -r * 0.2, r * 0.44, [1, 1, 0.6], lift);
    } else {
      sph(e, r, P.ink, 0, 0, 0, [1, 1.12, 0.6], 14);
      dot(e, r * 0.36, P.hi, r * 0.3, r * 0.36, r * 0.5, [1, 1, 0.6], lift);
      dot(e, r * 0.16, P.hi, -r * 0.3, -r * 0.3, r * 0.48, [1, 1, 0.6], lift);
    }
    return e;
  }
  function fib(N, keep) {
    const out = [];
    for (let i = 0; i < N; i++) {
      const y = 1 - 2 * (i + 0.5) / N, rr = Math.sqrt(1 - y * y), ph = i * 2.39996;
      const d = V3(rr * Math.cos(ph), y, rr * Math.sin(ph));
      if (keep(d)) out.push(d);
    }
    return out;
  }
  function spikes(g, ax, c, N, keep, h, r, cols, sweep = V3(0, 0.1, -0.5)) {
    const on = dirSurf(ax, c);
    fib(N, keep).forEach((d, i) => {
      const hit = on(d), n = hit.n.clone().add(sweep).normalize();
      const m = M(new THREE.ConeGeometry(r, h, 4), clay(cols[i % cols.length]));
      m.position.copy(hit.p).addScaledVector(n, h * 0.32);
      m.quaternion.setFromUnitVectors(V3(0, 1, 0), n);
      m.rotateY(i * 0.7);
      g.add(m);
    });
  }
  function leaf(p, r, col, vein, x, y, z) {
    const s = new THREE.Shape(); s.moveTo(0, 0); s.quadraticCurveTo(r * 0.55, r * 0.5, 0, r * 1.5); s.quadraticCurveTo(-r * 0.55, r * 0.5, 0, 0);
    const m = M(K.ext(s, r * 0.12, r * 0.05, 8), clay(col, { smooth: true }), x, y, z); p.add(m);
    if (vein) m.add(M(new THREE.BoxGeometry(r * 0.05, r * 1.2, r * 0.2), clay(vein), 0, r * 0.7, 0));
    return m;
  }
  return { V3, grp, sph, dot, surf, dirSurf, stick, tube, eye, fib, spikes, leaf, TAU };
}

export function canParts(THREE, K) {
  const { clay, M } = K;
  const canHandle = (g, col, x = -0.155, y = 0.19) => {
    const t = M(new THREE.TorusGeometry(0.075, 0.016, 8, 16, Math.PI * 1.05), clay(col, { smooth: true }), x, y, 0).rotateZ(Math.PI / 2 + 0.25); g.add(t);
    [0, Math.PI * 1.05].forEach(a => t.add(M(new THREE.SphereGeometry(0.018, 10, 8), clay(col, { smooth: true }), Math.cos(a) * 0.075, Math.sin(a) * 0.075, 0)));
  };
  const spout = (g, col, tip, x = 0.17, y = 0.24) => {
    const sp = M(new THREE.CylinderGeometry(0.02, 0.032, 0.22, 10), clay(col, { smooth: true }), x, y, 0); sp.rotation.z = -0.9; g.add(sp);
    const t = M(new THREE.CylinderGeometry(0.034, 0.024, 0.03, 12), clay(tip, { smooth: true }), x + Math.sin(0.9) * 0.115, y + Math.cos(0.9) * 0.115, 0); t.rotation.z = -0.9; g.add(t);
  };
  return { canHandle, spout };
}

export function buildTools(THREE, K, X, D, C) {
  const { clay, M, ext } = K;
  const { roundBlade, pickArms, sickleBlade, netBag } = X;
  const motif = D.motif;
  const Hh = (g, l, r = 0.03) => X.handle(g, D.h, l, r);
  const knob = col => g => g.add(M(new THREE.SphereGeometry(0.042, 12, 9), clay(col, { smooth: true }), 0, -0.1, 0));
  const pole = (p, L) => {
    p.add(M(new THREE.CylinderGeometry(0.013, 0.026, L, 8), clay(D.h.wood), 0, L / 2, 0));
    [0.3, 0.55, 0.8].forEach(f => p.add(M(new THREE.CylinderGeometry(0.027 - f * 0.013, 0.027 - f * 0.013, 0.02, 10), clay(D.band ?? D.edge, { smooth: true }), 0, L * f, 0)));
  };
  return {
    axe(g) {
      const top = Hh(g, 0.52), cy = top - 0.05;
      g.add(M(new THREE.CylinderGeometry(0.034, 0.034, 0.1, 12), clay(D.mount, { smooth: true }), 0, cy, 0));
      D.axe(g, cy);
      g.scale.setScalar(1.18);
    },
    hoe(g) {
      const top = Hh(g, 0.52), hd = new THREE.Group(); hd.position.y = top + 0.01; g.add(hd);
      hd.add(M(new THREE.BoxGeometry(0.08, 0.08, 0.075), clay(D.mount)));
      pickArms(hd, [clay(D.a), clay(D.b)], clay(D.edge));
      motif(hd, 0.055, 0, 0.09, 0);
      g.scale.setScalar(1.18);
    },
    seed(g) {
      C.sph(g, 0.11, D.bag, 0, 0.09, 0, [1, 1.05, 1], 20);
      g.add(M(new THREE.CylinderGeometry(0.045, 0.065, 0.05, 12), clay(D.mount, { smooth: true }), 0, 0.2, 0));
      g.add(M(new THREE.TorusGeometry(0.05, 0.011, 6, 14), clay(D.edge, { smooth: true }), 0, 0.2, 0).rotateX(Math.PI / 2));
      motif(g, 0.062, 0, 0.28, 0.01);
      g.scale.setScalar(1.25);
    },
    water(g) { D.water(g); g.scale.setScalar(1.25); },
    sickle(g) {
      const top = Hh(g, 0.30, 0.034);
      const { bl, tip } = sickleBlade(g, top, [clay(D.a), clay(D.a), clay(D.b)], clay(D.edge), 1.2);
      motif(bl, 0.042, tip.x, tip.y + 0.015, 0);
      g.add(M(new THREE.CylinderGeometry(0.032, 0.04, 0.05, 9), clay(D.mount), 0, top - 0.01, 0));
      g.scale.setScalar(1.18);
    },
    shovel(g) {
      const top = Hh(g, 0.58), by = top + 0.03;
      g.add(M(new THREE.CylinderGeometry(0.036, 0.044, 0.07, 9), clay(D.mount), 0, top + 0.01, 0));
      g.add(M(ext(roundBlade(0.105, 0.13), 0.03, 0.01, 14), clay(D.a, { smooth: true }), 0, by, 0));
      motif(g, 0.058, 0, by + 0.11, 0.035);
      g.scale.setScalar(1.18);
    },
    hammer(g) {
      const top = Hh(g, 0.50), y = top - 0.04;
      const head = M(new THREE.CylinderGeometry(0.05, 0.05, 0.15, 14), clay(D.b, { smooth: true }), 0, y, 0); head.rotation.z = Math.PI / 2; g.add(head);
      [-1, 1].forEach(sx => g.add(M(new THREE.CylinderGeometry(0.054, 0.054, 0.02, 14), clay(D.edge, { smooth: true }), sx * 0.075, y, 0).rotateZ(Math.PI / 2)));
      motif(g, 0.05, 0, y + 0.08, 0.01);
      g.scale.setScalar(1.18);
    },
    rod(g) { X.rodFrame(g, { knobFn: knob(D.h.knob), rear: clay(D.h.grip), line: 0xd8dcd0, pole }, b => motif(b, 0.05, 0, -0.04, 0)); },
    net(g) {
      g.add(M(new THREE.CylinderGeometry(0.024, 0.028, 0.66, 7), clay(D.h.wood), 0, 0.27, 0));
      g.add(M(new THREE.SphereGeometry(0.04, 10, 8), clay(D.h.knob, { smooth: true }), 0, -0.08, 0));
      g.add(M(new THREE.TorusGeometry(0.17, 0.02, 8, 24), clay(D.a, { smooth: true }), 0, 0.6, 0).rotateX(Math.PI / 2));
      g.add(M(new THREE.ConeGeometry(0.16, 0.3, 14, 1, true), netBag(D.net, 0.5), 0, 0.75, 0));
      motif(g, 0.05, 0, 0.64, 0.17);
      g.scale.setScalar(1.25);
    },
  };
}

export function buildUmbrella(THREE, K, X, D, L = 1.55) {
  const U = D.umb, def = U.def, { clay, M, V } = K, root = new THREE.Group();
  function goreGeo(R, thMax, halfW, shape) {
    const W = 8, Hh = 9, pos = [], idx = [];
    for (let j = 0; j <= Hh; j++) { const v = j / Hh; for (let i = 0; i <= W; i++) { const u = i / W * 2 - 1, phi = u * halfW * shape.w(v), th = thMax * v * (1 + shape.tip * (1 - u * u)); pos.push(-Math.cos(phi) * Math.sin(th) * R, (Math.cos(th) - 1) * R, Math.sin(phi) * Math.sin(th) * R); } }
    for (let j = 0; j < Hh; j++) for (let i = 0; i < W; i++) { const a = j * (W + 1) + i, b = a + 1, c = a + W + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals(); return geo;
  }
  const onGore = (h, th, ph, fn) => { const { p, n } = X.goreSurf(def.R * 1.004, th, ph); const g = new THREE.Group(); g.position.copy(p); g.quaternion.setFromUnitVectors(V(0, 0, 1), n); h.add(g); fn(g); };
  const rim = (c, col, r = 0.04) => c.add(M(new THREE.TorusGeometry(def.R * Math.sin(def.th) * 0.995, r, 6, 40), clay(col, { smooth: true }), 0, (Math.cos(def.th) - 1) * def.R, 0).rotateX(Math.PI / 2));
  root.add(M(new THREE.CylinderGeometry(0.022, 0.027, L, 7), clay(D.h.wood), 0, L / 2, 0));
  const j = M(new THREE.TorusGeometry(0.07, 0.022, 6, 14, Math.PI), clay(D.h.knob), 0.07, 0, 0); j.rotation.z = Math.PI; root.add(j);
  const canopy = new THREE.Group(); canopy.position.y = L; root.add(canopy);
  const og = goreGeo(def.R, def.th, Math.PI / def.N * def.overlap, def.shape), ig = goreGeo(def.R * 0.985, def.th, Math.PI / def.N * def.overlap, def.shape);
  for (let k = 0; k < def.N; k++) {
    const piv = new THREE.Group(); piv.rotation.y = k * TAU / def.N; canopy.add(piv);
    piv.add(new THREE.Mesh(og.clone(), clay(U.outer(k), { smooth: true })), new THREE.Mesh(ig.clone(), clay(U.inner, { side: THREE.BackSide, lift: 0.3 })));
    if (U.deco) U.deco(piv, k, onGore);
  }
  rim(canopy, U.rim, 0.035);
  U.finial(canopy);
  return root;
}
