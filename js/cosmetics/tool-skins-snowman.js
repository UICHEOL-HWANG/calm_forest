export const SM = Object.freeze({ snow: 0xcfd6de, snowS: 0xb3bfcb, coal: 0x34343e, carrot: 0xe07a2a, carrotD: 0xb95f1f, knitG: 0x3e8a68, knitC: 0xe0cfae, wood: 0xb08a62 });

const BLADE = [[0.02, -0.045], [0.14, -0.095], [0.19, -0.105], [0.205, 0], [0.19, 0.105], [0.14, 0.095], [0.02, 0.045]];
const EDGE = [[0.18, -0.108], [0.205, -0.112], [0.222, 0], [0.205, 0.112], [0.18, 0.108], [0.198, 0]];

export function snowmanKit(THREE, K, X) {
  const { clay, M } = K, { small } = X;
  const ball = (p, r, x, y, z, c = SM.snow) => { const m = M(new THREE.SphereGeometry(r, 14, 10), clay(c, { smooth: true }), x, y, z); p.add(m); return m; };
  const coal = (p, r, x, y, z) => p.add(small(M(new THREE.IcosahedronGeometry(r, 0), clay(SM.coal), x, y, z)));
  const bands = (p, y0, y1, r, n) => {
    const h = (y1 - y0) / n;
    for (let i = 0; i < n; i++) p.add(M(new THREE.CylinderGeometry(r, r, h, 9), clay(i % 2 ? SM.knitC : SM.knitG), 0, y0 + h * (i + 0.5), 0));
  };
  function scarfTail(p, x, y, z, len, w, rz, ry = 0) {
    const t = new THREE.Group(); t.position.set(x, y, z); t.rotation.set(0, ry, rz); p.add(t);
    const n = 4, h = len / n;
    for (let i = 0; i < n; i++) t.add(M(new THREE.BoxGeometry(w, h, w * 0.32), clay(i % 2 ? SM.knitC : SM.knitG), 0, -h * (i + 0.5), 0));
    [-1, 0, 1].forEach(k => t.add(small(M(new THREE.BoxGeometry(w * 0.18, h * 0.5, w * 0.22), clay(SM.knitG), k * w * 0.33, -len - h * 0.22, 0))));
    return t;
  }
  function scarf(p, y, r = 0.044) {
    p.add(M(new THREE.SphereGeometry(r, 8, 6), clay(SM.knitG), 0, y, 0.01));
    scarfTail(p, 0.01, y, 0.035, 0.15, 0.036, 0.75, -0.5);
    scarfTail(p, 0.02, y, 0.01, 0.1, 0.03, 1.15, 0.3);
  }
  function carrot(len, r) {
    const c = new THREE.Group();
    const body = M(new THREE.ConeGeometry(r, len, 7), clay(SM.carrot), 0, -len / 2, 0); body.rotation.x = Math.PI; c.add(body);
    [0.25, 0.5].forEach(f => { const t = M(new THREE.TorusGeometry(r * (1 - f), r * 0.13, 3, 8), clay(SM.carrotD), 0, -len * f, 0); t.rotation.x = Math.PI / 2; c.add(t); });
    return c;
  }
  function face(p, r, x, y, z, ry = 0) {
    const f = new THREE.Group(); f.position.set(x, y, z); f.rotation.y = ry; p.add(f);
    [-1, 1].forEach(s => coal(f, r * 0.14, s * r * 0.36, r * 0.25, r * 0.9));
    const n = carrot(r * 0.9, r * 0.17); n.rotation.x = -Math.PI / 2; n.position.set(0, 0, r * 0.9); f.add(n);
  }
  const knob = (g, r) => ball(g, r * 1.55, 0, -0.085, 0);
  const handle = (g, l, r = 0.031) => { const top = X.handle(g, { wood: SM.wood, grip: SM.knitG, knobFn: knob }, l, r); bands(g, -0.055, l * 0.5 - 0.08, r * 1.24, 7); return top; };
  return { ball, coal, bands, scarfTail, scarf, carrot, face, handle };
}

export function snowmanThemes(THREE, K, X) {
  const { clay, M, ext } = K;
  const { polyShape, hemi, roundBlade, pickArms, sickleBlade, rodFrame, netBag } = X;
  const { ball, coal, bands, scarfTail, scarf, face, handle } = snowmanKit(THREE, K, X);
  const rivets = (g, pts, z, r = 0.012) => [-1, 1].forEach(sz => pts.forEach(([x, y]) => coal(g, r, x, y, sz * z)));
  return { snowman: {
    axe(g) {
      const top = handle(g, 0.52), cy = top - 0.05;
      scarf(g, top - 0.15);
      g.add(M(new THREE.BoxGeometry(0.06, 0.12, 0.07), clay(SM.snowS), 0, cy, 0));
      g.add(M(ext(polyShape(BLADE), 0.04, 0.01, 2), clay(SM.snow, { smooth: true }), 0, cy, 0));
      g.add(M(ext(polyShape(EDGE), 0.034, 0.006, 2), clay(SM.carrot), 0, cy, 0));
      ball(g, 0.048, -0.055, cy, 0);
      rivets(g, [[0.07, cy + 0.03], [0.11, cy - 0.02], [0.15, cy + 0.045]], 0.032);
      g.scale.setScalar(1.18);
    },
    hoe(g) {
      const top = handle(g, 0.52), hd = new THREE.Group(); hd.position.y = top + 0.01; g.add(hd);
      scarf(g, top - 0.12);
      hd.add(M(new THREE.BoxGeometry(0.08, 0.08, 0.075), clay(SM.knitG)));
      hd.add(M(new THREE.BoxGeometry(0.084, 0.026, 0.079), clay(SM.knitC)));
      pickArms(hd, [clay(SM.snow), clay(SM.snowS)], clay(SM.carrot));
      ball(hd, 0.034, 0, 0.06, 0);
      rivets(hd, [[0.09, 0.0], [-0.09, 0.0]], 0.027, 0.01);
      g.scale.setScalar(1.18);
    },
    seed(g) {
      const body = ball(g, 0.11, 0, 0.09, 0, SM.knitG); body.scale.y = 0.95;
      [0.05, 0.12].forEach((y, i) => { const t = M(new THREE.TorusGeometry(i ? 0.095 : 0.104, 0.016, 5, 16), clay(SM.knitC), 0, y, 0); t.rotation.x = Math.PI / 2; g.add(t); });
      g.add(M(new THREE.CylinderGeometry(0.05, 0.07, 0.05, 10), clay(SM.knitC), 0, 0.19, 0));
      const tie = M(new THREE.TorusGeometry(0.05, 0.012, 5, 12), clay(SM.carrot), 0, 0.2, 0); tie.rotation.x = Math.PI / 2; g.add(tie);
      g.add(hemi(0.06, clay(SM.snow, { smooth: true }), 0, 0.215, 0, 0.55));
      ball(g, 0.03, 0, 0.255, 0);
      scarfTail(g, 0.05, 0.19, 0.04, 0.09, 0.028, 0.5, -0.6);
      g.scale.setScalar(1.25);
    },
    water(g) {
      g.add(M(new THREE.CylinderGeometry(0.108, 0.118, 0.2, 12), clay(SM.snow), 0, 0.18, 0));
      [[0.135, SM.knitG], [0.175, SM.knitC], [0.215, SM.knitG]].forEach(([y, c]) => g.add(M(new THREE.CylinderGeometry(0.121, 0.123, 0.04, 12), clay(c), 0, y, 0)));
      const cuff = M(new THREE.TorusGeometry(0.118, 0.014, 5, 16), clay(SM.knitC), 0, 0.24, 0); cuff.rotation.x = Math.PI / 2; g.add(cuff);
      g.add(hemi(0.105, clay(SM.snow, { smooth: true }), 0, 0.28, 0, 0.45));
      ball(g, 0.036, 0, 0.33, 0);
      const sp = M(new THREE.CylinderGeometry(0.02, 0.032, 0.22, 8), clay(SM.snow), 0.15, 0.22, 0); sp.rotation.z = -0.9; g.add(sp);
      const rose = M(new THREE.ConeGeometry(0.042, 0.055, 9), clay(SM.carrot), 0.243, 0.32, 0); rose.rotation.z = Math.PI - 0.9; g.add(rose);
      const hd = M(new THREE.TorusGeometry(0.075, 0.015, 5, 12, Math.PI * 1.05), clay(SM.knitG), -0.14, 0.18, 0); hd.rotation.z = Math.PI / 2 + 0.25; g.add(hd);
      scarfTail(g, 0.03, 0.24, 0.12, 0.13, 0.04, 0.35, 0.2);
      [0.5, 1.1].forEach(a => coal(g, 0.012, Math.cos(a) * 0.112, 0.095, Math.sin(a) * 0.112));
      g.scale.setScalar(1.25);
    },
    sickle(g) {
      const top = X.handle(g, { wood: SM.wood, grip: SM.knitG, knobFn: (g, r) => ball(g, r * 1.45, 0, -0.085, 0) }, 0.30, 0.034);
      bands(g, -0.055, top - 0.04, 0.042, 5);
      const { bl, tip } = sickleBlade(g, top, [clay(SM.snow), clay(SM.snow), clay(SM.snowS)], clay(SM.carrot), 1.25);
      bl.add(M(new THREE.SphereGeometry(0.022, 8, 6), clay(SM.snow, { smooth: true }), tip.x, tip.y, 0));
      coal(bl, 0.011, 0.01, 0.08, 0.012); coal(bl, 0.011, 0.04, 0.2, 0.012);
      g.add(M(new THREE.CylinderGeometry(0.032, 0.04, 0.05, 9), clay(SM.knitC), 0, top - 0.01, 0));
      g.scale.setScalar(1.18);
    },
    shovel(g) {
      const top = handle(g, 0.58), by = top + 0.03;
      scarf(g, top - 0.16);
      g.add(M(new THREE.CylinderGeometry(0.036, 0.044, 0.07, 9), clay(SM.knitG), 0, top + 0.01, 0));
      g.add(M(ext(roundBlade(0.112, 0.13), 0.026, 0.008, 14), clay(SM.carrot), 0, by, 0));
      g.add(M(ext(roundBlade(0.1, 0.125), 0.034, 0.012, 14), clay(SM.snow, { smooth: true }), 0, by + 0.004, 0));
      g.add(M(new THREE.BoxGeometry(0.2, 0.025, 0.044), clay(SM.knitC), 0, by + 0.012, 0));
      rivets(g, [[-0.05, by + 0.1], [0.05, by + 0.1], [0, by + 0.17]], 0.024);
      g.scale.setScalar(1.18);
    },
    hammer(g) {
      const top = handle(g, 0.50), y = top - 0.04;
      scarf(g, top - 0.15);
      const head = M(new THREE.CylinderGeometry(0.058, 0.058, 0.17, 10), clay(SM.snow, { smooth: true }), 0, y, 0); head.rotation.z = Math.PI / 2; g.add(head);
      [-1, 1].forEach(sx => {
        const cap = M(new THREE.CylinderGeometry(0.052, 0.058, 0.03, 10), clay(SM.carrot), sx * 0.098, y, 0); cap.rotation.z = Math.PI / 2; g.add(cap);
        const st = M(new THREE.CylinderGeometry(0.06, 0.06, 0.026, 10), clay(sx > 0 ? SM.knitG : SM.knitC), sx * 0.035, y, 0); st.rotation.z = Math.PI / 2; g.add(st);
      });
      rivets(g, [[0, y + 0.02]], 0.056, 0.011);
      g.scale.setScalar(1.18);
    },
    rod(g) {
      rodFrame(g, { knobFn: g => { ball(g, 0.046, 0, -0.1, 0); bands(g, -0.08, 0.085, 0.033, 5); }, rear: clay(SM.knitG), line: 0xd8dde2, pole: (p, L) => {
        p.add(M(new THREE.CylinderGeometry(0.013, 0.026, L, 7), clay(SM.wood), 0, L / 2, 0));
        for (let i = 0; i < 5; i++) { const f = 0.3 + i * 0.12, r = 0.027 - f * 0.012; p.add(M(new THREE.CylinderGeometry(r, r, 0.05, 8), clay(i % 2 ? SM.knitC : SM.knitG), 0, L * f, 0)); }
        scarfTail(p, -0.01, L * 0.3, 0.02, 0.2, 0.04, -1.05);
      } }, b => {
        ball(b, 0.046, 0, -0.02, 0); ball(b, 0.033, 0, 0.046, 0);
        const sc = M(new THREE.TorusGeometry(0.03, 0.009, 5, 12), clay(SM.knitG), 0, 0.02, 0); sc.rotation.x = Math.PI / 2; b.add(sc);
        face(b, 0.033, 0, 0.046, 0, 0.3);
        coal(b, 0.007, 0.014, -0.005, 0.042);
      });
    },
    net(g) {
      g.add(M(new THREE.CylinderGeometry(0.028, 0.03, 0.72, 7), clay(SM.wood), 0, 0.25, 0));
      bands(g, -0.06, 0.22, 0.036, 7);
      ball(g, 0.045, 0, -0.1, 0);
      const ring = M(new THREE.TorusGeometry(0.17, 0.024, 6, 18), clay(SM.snow, { smooth: true }), 0, 0.6, 0); ring.rotation.x = Math.PI / 2; g.add(ring);
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; coal(g, 0.012, Math.cos(a) * 0.17, 0.625, Math.sin(a) * 0.17); }
      g.add(M(new THREE.ConeGeometry(0.16, 0.3, 12, 1, true), netBag(SM.knitC, 0.55), 0, 0.75, 0));
      scarf(g, 0.5, 0.036);
      g.scale.setScalar(1.25);
    },
  } };
}

export const SNOWMAN_UMBRELLA = Object.freeze({ N: 8, R: 1.05, th: 0.9, overlap: 1, shape: { w: () => 1, tip: 0 } });

export function snowmanUmbrellaLook(THREE, K, X, { root, L, def, jHook }) {
  const { clay, M } = K, { ball, coal, carrot } = snowmanKit(THREE, K, X);
  return {
    outer: k => clay(k % 2 ? SM.knitC : SM.knitG), inner: () => clay(SM.snow, { side: THREE.BackSide, lift: 0.3 }),
    shaft() {
      root.add(M(new THREE.CylinderGeometry(0.022, 0.027, L, 7), clay(SM.wood), 0, L / 2, 0));
      [0, 0.04, 0.08].forEach((d, i) => root.add(M(new THREE.CylinderGeometry(0.031, 0.031, 0.04, 8), clay(i % 2 ? SM.knitC : SM.knitG), 0, L - 0.6 + d, 0)));
      jHook(clay(SM.knitG), 0.07);
    },
    deco(h) {
      const p = X.goreSurf(def.R, def.th * 0.97, 0).p;
      h.add(M(new THREE.SphereGeometry(0.03, 8, 6), clay(SM.snow, { smooth: true }), p.x, p.y, p.z));
      const q = X.goreSurf(def.R * 1.01, def.th * 0.5, 0).p; coal(h, 0.022, q.x, q.y, q.z);
    },
    finial(c) { ball(c, 0.06, 0, 0.05, 0); const n = carrot(0.09, 0.022); n.position.set(0, 0.06, 0.05); n.rotation.x = -Math.PI / 2; c.add(n); },
  };
}
