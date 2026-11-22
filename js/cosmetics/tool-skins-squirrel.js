export const SQ = Object.freeze({ wood: 0xa8784c, woodD: 0x7a5232, fur: 0xb5622f, furD: 0x8a4624, cream: 0xe2cfae, nut: 0xc08648, nutD: 0x9a6636, cap: 0x6e4a2c, capL: 0x8c6440 });

const BLADE = [[0.02, -0.045], [0.14, -0.095], [0.19, -0.105], [0.205, 0], [0.19, 0.105], [0.14, 0.095], [0.02, 0.045]];
const EDGE = [[0.18, -0.108], [0.205, -0.112], [0.222, 0], [0.205, 0.112], [0.18, 0.108], [0.198, 0]];

export function squirrelKit(THREE, K, X) {
  const { clay, M } = K, { small, hemi } = X;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  function puff(p, pts, rad, tip = 0.76, n = 14) {
    const c = new THREE.CatmullRomCurve3(pts.map(([x, y, z]) => V(x, y, z)));
    for (let i = 0; i <= n; i++) { const t = i / n, q = c.getPointAt(t); p.add(M(new THREE.IcosahedronGeometry(rad(t), 1), clay(t > tip ? SQ.cream : SQ.fur), q.x, q.y, q.z)); }
  }
  const fluff = (lo, hi) => t => lo + (hi - lo) * Math.sin(Math.PI * (0.15 + 0.7 * t));
  const tail = (p, y0, h, z = 0.035) => puff(p, [[0.0, y0, z], [-0.06, y0 + h * 0.18, z], [-0.11, y0 + h * 0.5, z], [-0.1, y0 + h * 0.85, z * 0.6], [-0.05, y0 + h, 0], [-0.03, y0 + h * 0.8, 0]], fluff(0.026, 0.056), 0.72, 14);
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
  const handle = (g, l, r = 0.031) => X.handle(g, { wood: SQ.wood, grip: SQ.woodD, knob: SQ.nutD }, l, r);
  return { V, puff, fluff, tail, acorn, handle };
}

export function squirrelThemes(THREE, K, X) {
  const { clay, M, ext } = K;
  const { polyShape, hemi, roundBlade, pickArms, sickleBlade, rodFrame, netBag } = X;
  const { V, puff, fluff, tail, acorn, handle } = squirrelKit(THREE, K, X);
  return { squirrel: {
    axe(g) {
      const top = handle(g, 0.52), cy = top - 0.05;
      tail(g, 0.2, 0.3);
      g.add(M(new THREE.BoxGeometry(0.06, 0.12, 0.07), clay(SQ.woodD), 0, cy, 0));
      g.add(M(ext(polyShape(BLADE), 0.04, 0.01, 2), clay(SQ.fur), 0, cy, 0));
      g.add(M(ext(polyShape(EDGE), 0.034, 0.006, 2), clay(SQ.cream), 0, cy, 0));
      acorn(g, 0.34, 0, cy + 0.09, 0);
      g.scale.setScalar(1.18);
    },
    hoe(g) {
      const top = handle(g, 0.52), hd = new THREE.Group(); hd.position.y = top + 0.01; g.add(hd);
      tail(g, 0.2, 0.26);
      hd.add(M(new THREE.BoxGeometry(0.08, 0.08, 0.075), clay(SQ.woodD)));
      pickArms(hd, [clay(SQ.fur), clay(SQ.furD)], clay(SQ.cream));
      acorn(hd, 0.36, 0, 0.08, 0);
      g.scale.setScalar(1.18);
    },
    seed(g) {
      const body = M(new THREE.SphereGeometry(0.105, 14, 10), clay(SQ.fur, { smooth: true }), 0, 0.09, 0); body.scale.set(1, 0.95, 1); g.add(body);
      const n = V(Math.cos(0.75), 0, Math.sin(0.75)), belly = M(new THREE.SphereGeometry(0.05, 12, 8), clay(SQ.cream, { smooth: true }), n.x * 0.085, 0.08, n.z * 0.085);
      belly.quaternion.setFromUnitVectors(V(0, 0, 1), n); belly.scale.set(1, 1.3, 0.35); g.add(belly);
      g.add(M(new THREE.CylinderGeometry(0.045, 0.065, 0.05, 10), clay(SQ.furD), 0, 0.19, 0));
      acorn(g, 0.42, 0, 0.245, 0);
      puff(g, [[0.06, 0.02, 0.08], [0.12, 0.08, 0.06], [0.13, 0.18, 0.05], [0.09, 0.23, 0.04], [0.07, 0.18, 0.05]], fluff(0.022, 0.044), 0.7, 11);
      g.scale.setScalar(1.25);
    },
    water(g) {
      const body = M(new THREE.SphereGeometry(0.13, 14, 10), clay(SQ.fur, { smooth: true }), 0, 0.17, 0); body.scale.set(0.95, 0.88, 0.95); g.add(body);
      const n = V(Math.cos(0.75), 0, Math.sin(0.75)), belly = M(new THREE.SphereGeometry(0.058, 12, 8), clay(SQ.cream, { smooth: true }), n.x * 0.1, 0.15, n.z * 0.1);
      belly.quaternion.setFromUnitVectors(V(0, 0, 1), n); belly.scale.set(1, 1.3, 0.35); g.add(belly);
      g.add(hemi(0.075, clay(SQ.furD), 0, 0.265, 0, 0.5));
      acorn(g, 0.32, 0, 0.32, 0);
      const sp = M(new THREE.CylinderGeometry(0.02, 0.032, 0.22, 8), clay(SQ.cream), 0.15, 0.22, 0); sp.rotation.z = -0.9; g.add(sp);
      const rose = hemi(0.045, clay(SQ.capL), 0, 0, 0, 0.7, 10); rose.position.set(0.24, 0.3, 0); rose.rotation.z = -0.9; g.add(rose);
      const hd = M(new THREE.TorusGeometry(0.075, 0.015, 5, 12, Math.PI * 1.05), clay(SQ.woodD), -0.14, 0.18, 0); hd.rotation.z = Math.PI / 2 + 0.25; g.add(hd);
      puff(g, [[-0.02, 0.07, 0.11], [0.02, 0.13, 0.15], [0.0, 0.25, 0.16], [-0.04, 0.33, 0.13], [-0.03, 0.38, 0.08], [0.0, 0.33, 0.07]], fluff(0.03, 0.06), 0.74, 15);
      g.scale.setScalar(1.25);
    },
    sickle(g) {
      const top = handle(g, 0.30, 0.034);
      const { bl, tip } = sickleBlade(g, top, [clay(SQ.fur), clay(SQ.furD), clay(SQ.fur)], clay(SQ.cream), 1.25);
      acorn(bl, 0.22, tip.x, tip.y + 0.01, 0);
      g.add(M(new THREE.CylinderGeometry(0.030, 0.036, 0.06, 7), clay(SQ.woodD), 0, top - 0.01, 0));
      puff(g, [[-0.02, top + 0.04, 0.03], [-0.08, top + 0.08, 0.03], [-0.1, top + 0.16, 0.02], [-0.06, top + 0.21, 0], [-0.03, top + 0.17, 0]], fluff(0.022, 0.046), 0.7, 11);
      g.scale.setScalar(1.18);
    },
    shovel(g) {
      const top = handle(g, 0.58), by = top + 0.03;
      tail(g, 0.2, 0.26);
      g.add(M(new THREE.CylinderGeometry(0.036, 0.044, 0.07, 8), clay(SQ.woodD), 0, top + 0.01, 0));
      g.add(M(ext(roundBlade(0.112, 0.133), 0.026, 0.008, 14), clay(SQ.cream), 0, by, 0));
      g.add(M(ext(roundBlade(0.1, 0.125), 0.034, 0.012, 14), clay(SQ.fur, { smooth: true }), 0, by + 0.004, 0));
      acorn(g, 0.3, 0, by + 0.12, 0.03);
      g.scale.setScalar(1.18);
    },
    hammer(g) {
      const top = handle(g, 0.50), y = top - 0.04;
      tail(g, 0.18, 0.16);
      const head = M(new THREE.CylinderGeometry(0.058, 0.058, 0.17, 10), clay(SQ.fur), 0, y, 0); head.rotation.z = Math.PI / 2; g.add(head);
      [-1, 1].forEach(sx => { const cap = M(new THREE.CylinderGeometry(0.052, 0.058, 0.03, 10), clay(SQ.cream), sx * 0.098, y, 0); cap.rotation.z = Math.PI / 2; g.add(cap); });
      acorn(g, 0.3, 0.02, y + 0.085, 0);
      g.scale.setScalar(1.18);
    },
    rod(g) {
      rodFrame(g, { knobFn: g => g.add(M(new THREE.SphereGeometry(0.04, 7, 6), clay(SQ.woodD), 0, -0.09, 0)), rear: clay(SQ.woodD), line: 0xd8ccb4, pole: (p, L) => {
        p.add(M(new THREE.CylinderGeometry(0.013, 0.026, L, 7), clay(SQ.wood), 0, L / 2, 0));
        const pts = []; for (let i = 0; i <= 8; i++) { const t = i / 8, a = t * Math.PI * 2.2; pts.push([Math.cos(a) * 0.036, L * (0.2 + t * 0.26), Math.sin(a) * 0.036]); }
        puff(p, pts, fluff(0.022, 0.034), 0.8, 16);
        p.add(M(new THREE.CylinderGeometry(0.018, 0.018, 0.022, 7), clay(SQ.fur), 0, L * 0.75, 0));
      } }, b => puff(b, [[0, 0.03, 0], [0.035, -0.01, 0], [0.012, -0.06, 0], [-0.03, -0.05, 0], [-0.022, -0.015, 0]], fluff(0.022, 0.038), 0.7, 9));
    },
    net(g) {
      g.add(M(new THREE.CylinderGeometry(0.028, 0.03, 0.72, 7), clay(SQ.wood), 0, 0.25, 0));
      g.add(M(new THREE.SphereGeometry(0.045, 8, 6), clay(SQ.nutD), 0, -0.1, 0));
      tail(g, 0.18, 0.3, 0.03);
      const ring = M(new THREE.TorusGeometry(0.17, 0.024, 6, 18), clay(SQ.fur), 0, 0.6, 0); ring.rotation.x = Math.PI / 2; g.add(ring);
      g.add(M(new THREE.ConeGeometry(0.16, 0.3, 12, 1, true), netBag(SQ.cream, 0.55), 0, 0.75, 0));
      acorn(g, 0.32, 0, 0.6, 0.18);
      g.scale.setScalar(1.25);
    },
  } };
}

export const SQUIRREL_UMBRELLA = Object.freeze({ N: 8, R: 1.0, th: 0.95, overlap: 1, shape: { w: () => 1, tip: 0.06 } });

export function squirrelUmbrellaLook(THREE, K, X, { root, L, def, jHook }) {
  const { clay, M } = K, { acorn, puff, fluff } = squirrelKit(THREE, K, X);
  return {
    outer: k => clay(k % 2 ? SQ.furD : SQ.fur), inner: () => clay(SQ.cream, { side: THREE.BackSide, lift: 0.3 }),
    shaft() {
      root.add(M(new THREE.CylinderGeometry(0.022, 0.027, L, 7), clay(SQ.wood), 0, L / 2, 0));
      jHook(clay(SQ.woodD), 0.07);
      puff(root, [[0, L * 0.45, 0.03], [-0.06, L * 0.5, 0.03], [-0.09, L * 0.6, 0.02], [-0.05, L * 0.66, 0], [-0.025, L * 0.6, 0]], fluff(0.024, 0.05), 0.7, 11);
    },
    deco(h) {
      const p = X.goreSurf(def.R, def.th * 0.97, 0).p;
      h.add(M(new THREE.IcosahedronGeometry(0.032, 1), clay(SQ.cream), p.x, p.y, p.z));
    },
    finial(c) { acorn(c, 0.55, 0, 0.07, 0); },
  };
}
