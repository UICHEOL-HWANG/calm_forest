import { simKit, baseTools } from '../tool-set-pick/tool-art.mjs';
export { simKit, baseTools };

export const DC = Object.freeze({ mint: 0x9de3cc, teal: 0x5bb3a4, tealD: 0x3d8a80, belly: 0xe8d2a0, coral: 0xf29a7a, coralD: 0xd8735a, yellow: 0xf2c15c, egg: 0xf0d4bc, eggD: 0xd4b496, speck: 0xa88a68, lilac: 0xb4a0dc, lilacD: 0x8f7cc0, plum: 0x6c5a9c, wood: 0xa87a52, ink: 0x2e2a2a, hi: 0xe0d4c4, blush: 0xf08a90 });

const TAU = Math.PI * 2;

export function motifKit(THREE, K, X) {
  const { clay, M, ext } = K;
  const { small } = X;
  const sph = (p, r, col, x, y, z, s = [1, 1, 1], ws = 14) => { const m = M(new THREE.SphereGeometry(r, ws, Math.max(8, ws * 0.75 | 0)), clay(col, { smooth: true }), x, y, z); m.scale.set(...s); p.add(m); return m; };
  const plateShape = (w, h) => { const s = new THREE.Shape(); s.moveTo(-w, 0); s.bezierCurveTo(-w * 1.05, h * 0.55, -w * 0.35, h * 0.98, 0, h); s.bezierCurveTo(w * 0.35, h * 0.98, w * 1.05, h * 0.55, w, 0); s.lineTo(-w, 0); return s; };
  function plate(p, w, h, col, x, y, z, rz = 0, ry = 0) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.set(0, ry, rz); p.add(g);
    g.add(M(ext(plateShape(w, h), w * 0.32, w * 0.22, 8), clay(col, { smooth: true })));
    return g;
  }
  function eyeDot(g, R, x, y, z, nx, nz) {
    sph(g, R * 0.2, DC.ink, x, y, z, [1, 1.12, 0.75], 12);
    g.add(small(M(new THREE.SphereGeometry(R * 0.075, 8, 6), clay(DC.hi, { smooth: true }), x + nx * R * 0.14, y + R * 0.08, z + nz * R * 0.14)));
    g.add(small(M(new THREE.SphereGeometry(R * 0.035, 6, 5), clay(DC.hi, { smooth: true }), x + nx * R * 0.16, y - R * 0.07, z + nz * R * 0.16)));
  }
  function dinoHead(p, R, x, y, z, o = {}) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = o.ry ?? 0; p.add(g);
    const body = o.body ?? DC.mint, under = o.under ?? DC.belly, spike = o.spike ?? DC.coral;
    sph(g, R, body, 0, 0, 0, [0.96, 0.94, 0.96], 20);
    sph(g, R * 0.72, body, 0, -R * 0.3, R * 0.5, [1.0, 0.76, 1.0], 18);
    sph(g, R * 0.6, under, 0, -R * 0.5, R * 0.52, [1.0, 0.42, 0.96], 16);
    [-1, 1].forEach(sx => {
      eyeDot(g, R, sx * R * 0.4, R * 0.16, R * 0.74, sx * 0.25, 1);
      g.add(small(M(new THREE.SphereGeometry(R * 0.045, 6, 5), clay(DC.tealD, { smooth: true }), sx * R * 0.16, -R * 0.12, R * 1.18)));
      sph(g, R * 0.13, DC.blush, sx * R * 0.6, -R * 0.2, R * 0.7, [1, 0.7, 0.45], 10);
    });
    const sm = M(new THREE.TorusGeometry(R * 0.16, R * 0.035, 6, 12, Math.PI), clay(DC.ink, { smooth: true }), 0, -R * 0.3, R * 1.14); sm.rotation.z = Math.PI; g.add(sm);
    if (o.spikes !== false) (o.spikeAngles ?? [0.15, 0.7, 1.25, 1.8]).forEach((a, i, arr) => {
      const s = 1 - Math.abs(i - (arr.length - 1) * 0.35) * 0.18;
      const pg = new THREE.Group(); pg.position.set(0, Math.cos(a) * R * 0.86, -Math.sin(a) * R * 0.9); pg.rotation.x = -a; g.add(pg);
      plate(pg, R * 0.26 * s, R * 0.42 * s, spike, 0, 0, 0, 0, Math.PI / 2);
    });
    return g;
  }
  function eggShell(p, R, x, y, z, o = {}) {
    const g = new THREE.Group(); g.position.set(x, y, z); p.add(g);
    const sy = o.sy ?? 1.22, th0 = o.th0 ?? 0.42 * Math.PI, N = o.teeth ?? 9;
    const geo = new THREE.SphereGeometry(R, 22, 14, 0, TAU, th0, Math.PI - th0);
    const out = M(geo, clay(o.col ?? DC.egg, { smooth: true })); out.scale.set(1, sy, 1); g.add(out);
    const inn = M(geo.clone(), clay(DC.eggD, { smooth: true, side: THREE.BackSide })); inn.scale.set(0.985, sy * 0.985, 0.985); g.add(inn);
    const ry = Math.cos(th0) * R * sy, rr = Math.sin(th0) * R;
    for (let i = 0; i < N; i++) {
      const a = i * TAU / N + (o.rot ?? 0), t = M(ext(plateShape(R * 0.17, R * 0.24), R * 0.03, R * 0.02, 4), clay(o.col ?? DC.egg, { smooth: true }), Math.sin(a) * rr * 0.99, ry - R * 0.03, Math.cos(a) * rr * 0.99);
      t.rotation.y = a; g.add(t);
    }
    (o.specks ?? [[0.62, 0.3, DC.speck], [0.7, 1.9, DC.tealD], [0.78, 3.4, DC.speck], [0.6, 4.6, DC.tealD], [0.85, 5.5, DC.speck], [0.9, 0.9, DC.tealD], [0.66, 2.7, DC.speck]]).forEach(([t, ph, col]) => {
      const th = t * Math.PI, n = new THREE.Vector3(Math.sin(th) * Math.sin(ph), Math.cos(th), Math.sin(th) * Math.cos(ph));
      const m = sph(g, R * 0.11, col, n.x * R, n.y * R * sy, n.z * R, [1, 1, 0.35], 8);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
    });
    return { g, rimY: ry, rimR: rr };
  }
  function egg(p, R, x, y, z, o = {}) {
    const { g, rimY } = eggShell(p, R, x, y, z, o);
    const bR = R * (o.babyR ?? 0.62);
    const h = dinoHead(g, bR, 0, rimY + R * (o.lift ?? 0.22), R * 0.04, { ry: o.ry ?? 0, spikeAngles: [0.9, 1.5] });
    if (o.cap !== false) {
      const cap = new THREE.Group(); cap.position.set(-bR * 0.12, bR * 0.68, -bR * 0.1); cap.rotation.set(-0.2, 0, 0.3); h.add(cap);
      const cg = new THREE.SphereGeometry(bR * 0.95, 18, 8, 0, TAU, 0, 0.36 * Math.PI);
      const cm = M(cg, clay(DC.egg, { smooth: true }), 0, -Math.cos(0.36 * Math.PI) * bR * 0.95, 0); cap.add(cm);
      const ci = M(cg.clone(), clay(DC.eggD, { smooth: true, side: THREE.BackSide }), 0, -Math.cos(0.36 * Math.PI) * bR * 0.95, 0); ci.scale.setScalar(0.98); cap.add(ci);
      for (let i = 0; i < 7; i++) {
        const a = i * TAU / 7, rr = Math.sin(0.36 * Math.PI) * bR * 0.95;
        const t = M(ext(plateShape(bR * 0.15, bR * 0.2), bR * 0.03, bR * 0.02, 4), clay(DC.egg, { smooth: true }), Math.sin(a) * rr, 0.0, Math.cos(a) * rr);
        t.rotation.set(Math.PI, a, 0); cap.add(t);
      }
      sph(cap, bR * 0.12, DC.tealD, bR * 0.3, bR * 0.22, bR * 0.3, [1, 0.5, 1], 8);
    }
    return g;
  }
  function tube(p, pts, col, rf) {
    const c = new THREE.CatmullRomCurve3(pts.map(v => new THREE.Vector3(...v)));
    const m = new THREE.Mesh(X.taper(c, rf, 14, 8), clay(col, { smooth: true })); p.add(m); return m;
  }
  function stego(p, R, x, y, z, o = {}) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = o.ry ?? 0; p.add(g);
    const body = o.body ?? DC.lilac, under = o.under ?? DC.belly;
    sph(g, R, body, 0, 0, 0, [1.35, 0.88, 0.86], 20);
    sph(g, R * 0.8, under, R * 0.1, -R * 0.32, 0, [1.3, 0.5, 0.88], 16);
    const hg = new THREE.Group(); hg.position.set(R * 1.3, -R * 0.02, 0); g.add(hg);
    const HR = R * 0.5;
    sph(hg, HR, body, 0, 0, 0, [1.12, 0.94, 0.94], 16);
    sph(hg, HR * 0.72, under, HR * 0.42, -HR * 0.4, 0, [1.0, 0.5, 0.86], 12);
    [-1, 1].forEach(sx => {
      eyeDot(hg, HR * 1.45, HR * 0.3, HR * 0.22, sx * HR * 0.72, 0.4, sx);
      sph(hg, HR * 0.18, DC.blush, HR * 0.62, -HR * 0.22, sx * HR * 0.62, [0.6, 0.6, 0.3], 8).rotation.y = sx * 0.9;
    });
    const sm = M(new THREE.TorusGeometry(HR * 0.2, HR * 0.045, 6, 10, Math.PI), clay(DC.ink, { smooth: true }), HR * 1.1, -HR * 0.25, 0); sm.rotation.set(0, Math.PI / 2, Math.PI); hg.add(sm);
    if (o.legs !== false) [[-0.7, 1], [-0.7, -1], [0.7, 1], [0.7, -1]].forEach(([lx, lz]) => sph(g, R * 0.26, o.leg ?? DC.lilacD, lx * R, -R * 0.72, lz * R * 0.48, [1, 1.1, 1], 10));
    tube(g, [[-R * 1.1, R * 0.05, 0], [-R * 1.7, R * 0.12, 0], [-R * 2.2, R * 0.4, 0]], body, t => R * (0.36 - t * 0.27));
    [-1, 1].forEach(sz => { const s = plate(g, R * 0.08, R * 0.3, o.tail ?? DC.yellow, -R * 2.05, R * 0.4, sz * R * 0.04, 0.9, 0); s.rotation.x = sz * 0.9; });
    const pl = o.plates ?? [-0.95, -0.48, 0, 0.48, 0.95];
    pl.forEach((u, i) => {
      const k = u / 1.35, ang = Math.asin(Math.max(-0.95, Math.min(0.95, k))), px = u * R, py = Math.sqrt(Math.max(0, 1 - k * k)) * R * 0.88 - R * 0.08;
      const s = 1 - Math.abs(u) * 0.25;
      plate(g, R * 0.3 * s, R * 0.62 * s, i % 2 ? (o.plate2 ?? DC.coral) : (o.plate ?? DC.yellow), px, py, 0, -ang * 0.8, 0);
    });
    return g;
  }
  return { sph, plate, plateShape, dinoHead, eggShell, egg, stego, tube };
}

const H = (X, g, wood, grip, knob, bands = []) => X.handle(g, { wood, grip, knob, bands }, 0.52, 0.03);
const canHandleK = (THREE, K) => (g, col, x = -0.17) => g.add(K.M(new THREE.TorusGeometry(0.075, 0.015, 5, 12, Math.PI * 1.05), K.clay(col), x, 0.2, 0).rotateZ(Math.PI / 2 + 0.25));
const spoutK = (THREE, K) => (g, col, x = 0.17, y = 0.25) => { const sp = K.M(new THREE.CylinderGeometry(0.02, 0.032, 0.22, 8), K.clay(col), x, y, 0); sp.rotation.z = -0.9; g.add(sp); };

export function dinoThemes(THREE, K, X) {
  const { clay, M } = K;
  const T = motifKit(THREE, K, X), canHandle = canHandleK(THREE, K), spout = spoutK(THREE, K);
  const knob = col => g => g.add(M(new THREE.SphereGeometry(0.042, 10, 8), clay(col, { smooth: true }), 0, -0.1, 0));
  return {
    A: {
      axe(g) {
        const top = H(X, g, DC.wood, DC.tealD, DC.coral, [[DC.teal, 0.62]]), cy = top - 0.05;
        g.add(M(new THREE.BoxGeometry(0.06, 0.1, 0.07), clay(DC.tealD), 0, cy, 0));
        T.dinoHead(g, 0.1, 0.1, cy + 0.005, 0, { ry: Math.PI / 2 });
        g.scale.setScalar(1.18);
      },
      water(g) {
        T.dinoHead(g, 0.13, -0.01, 0.17, 0, { ry: Math.PI / 2, spikeAngles: [0.25, 0.8, 1.35, 1.9] });
        spout(g, DC.teal, 0.23, 0.2);
        canHandle(g, DC.tealD);
        g.scale.setScalar(1.25);
      },
      rod(g) {
        X.rodFrame(g, { knobFn: knob(DC.coral), rear: clay(DC.tealD), line: 0xe8dcd0, pole: (p, L) => {
          p.add(M(new THREE.CylinderGeometry(0.013, 0.026, L, 8), clay(DC.teal, { smooth: true }), 0, L / 2, 0));
          [0.3, 0.55, 0.8].forEach(f => p.add(M(new THREE.CylinderGeometry(0.027 - f * 0.013, 0.027 - f * 0.013, 0.02, 10), clay(DC.coral, { smooth: true }), 0, L * f, 0)));
        } }, b => T.dinoHead(b, 0.058, 0, -0.04, 0, { ry: 0.5 }));
      },
    },
    B: {
      axe(g) {
        const top = H(X, g, DC.eggD, DC.teal, DC.coral, [[DC.mint, 0.62]]), cy = top - 0.05;
        g.add(M(new THREE.BoxGeometry(0.06, 0.1, 0.07), clay(DC.teal), 0, cy, 0));
        T.egg(g, 0.085, 0.11, cy - 0.045, 0, { ry: 0.9, babyR: 0.7 });
        g.scale.setScalar(1.18);
      },
      water(g) {
        T.egg(g, 0.12, 0, 0.11, 0, { ry: 0.5, babyR: 0.58, lift: 0.04, sy: 1.12, th0: 0.4 * Math.PI, teeth: 11 });
        spout(g, DC.teal, 0.18, 0.2);
        canHandle(g, DC.teal);
        g.scale.setScalar(1.25);
      },
      rod(g) {
        X.rodFrame(g, { knobFn: knob(DC.coral), rear: clay(DC.teal), line: 0xe8dcd0, pole: (p, L) => {
          p.add(M(new THREE.CylinderGeometry(0.013, 0.026, L, 8), clay(DC.eggD, { smooth: true }), 0, L / 2, 0));
          [0.25, 0.45, 0.65, 0.85].forEach(f => p.add(M(new THREE.CylinderGeometry(0.027 - f * 0.013, 0.027 - f * 0.013, 0.02, 10), clay(DC.mint, { smooth: true }), 0, L * f, 0)));
        } }, b => T.egg(b, 0.052, 0, -0.07, 0, { ry: 0.5, cap: false, teeth: 7 }));
      },
    },
    C: {
      axe(g) {
        const top = H(X, g, DC.lilacD, DC.plum, DC.yellow, [[DC.yellow, 0.62]]), cy = top - 0.05;
        g.add(M(new THREE.BoxGeometry(0.06, 0.1, 0.07), clay(DC.plum), 0, cy, 0));
        T.stego(g, 0.075, 0.06, cy - 0.01, 0, { legs: false });
        g.scale.setScalar(1.18);
      },
      water(g) {
        T.stego(g, 0.12, -0.01, 0.15, 0, { plates: [-0.9, -0.42, 0.06, 0.52] });
        spout(g, DC.lilacD, 0.29, 0.2);
        g.scale.setScalar(1.25);
      },
      rod(g) {
        X.rodFrame(g, { knobFn: knob(DC.yellow), rear: clay(DC.plum), line: 0xe8dcd0, pole: (p, L) => {
          p.add(M(new THREE.CylinderGeometry(0.013, 0.026, L, 8), clay(DC.lilacD, { smooth: true }), 0, L / 2, 0));
          [0.36, 0.5, 0.64, 0.78].forEach((f, i) => T.plate(p, 0.022 - f * 0.01, 0.05 - f * 0.02, i % 2 ? DC.coral : DC.yellow, -0.012 + f * 0.004, L * f, 0, Math.PI / 2 + 0.2));
        } }, b => T.stego(b, 0.04, 0.02, -0.03, 0, { ry: 0.4 }));
      },
    },
  };
}

export const SETS = Object.freeze({
  tools_dino: {
    ico: '🦕', name: '공룡 세트', pal: DC, themes: dinoThemes, key: 'dino',
    refs: [['octopus', '기존 🐙 문어', '분홍 문어 머리·다리'], ['penguin', '기존 🐧 펭귄', '남색 펭귄 머리·노랑 부리'], ['watermelon', '기존 🍉 수박', '초록 계열 겹침 확인']],
    dirs: [
      ['A', '아기 공룡 얼굴', '민트 둥근 머리에 큰 눈과 볼터치, 뒤통수 산호색 가시'],
      ['B', '공룡 알', '점박이 크림 알이 깨지고 아기 공룡이 껍데기 모자를 쓰고 빼꼼'],
      ['C', '스테고 등판', '라일락 스테고사우루스, 노랑·산호 등판과 꼬리 가시'],
    ],
  },
});

const DIR_SPEC = {
  dinoA: T => ({ h: { wood: DC.wood, grip: DC.tealD, knob: DC.coral, bands: [[DC.teal, 0.62]] }, a: DC.mint, b: DC.teal, edge: DC.coral, mount: DC.tealD, bag: DC.mint, net: DC.teal,
    motif: (p, r, x, y, z, ry = 0) => T.dinoHead(p, r, x, y, z, { ry }) }),
  dinoB: T => ({ h: { wood: DC.eggD, grip: DC.teal, knob: DC.coral, bands: [[DC.mint, 0.62]] }, a: DC.egg, b: DC.mint, edge: DC.coral, mount: DC.teal, bag: DC.egg, net: DC.mint,
    motif: (p, r, x, y, z, ry = 0) => T.egg(p, r * 0.9, x, y - r * 0.3, z, { ry, teeth: 8 }) }),
  dinoC: T => ({ h: { wood: DC.lilacD, grip: DC.plum, knob: DC.yellow, bands: [[DC.yellow, 0.62]] }, a: DC.lilac, b: DC.lilacD, edge: DC.yellow, mount: DC.plum, bag: DC.lilac, net: DC.lilacD,
    motif: (p, r, x, y, z, ry = 0) => T.stego(p, r * 0.76, x, y, z, { ry: ry - 0.4, legs: false }) }),
};

export function portThemes(THREE, K, X) {
  const { clay, M, ext } = K;
  const { roundBlade, pickArms, sickleBlade, netBag } = X;
  const T = motifKit(THREE, K, X), out = {};
  const base = { dino: dinoThemes(THREE, K, X) };
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
        T.sph(g, 0.11, D.bag, 0, 0.09, 0, [1, 1.05, 1], 16);
        g.add(M(new THREE.CylinderGeometry(0.045, 0.065, 0.05, 12), clay(D.mount, { smooth: true }), 0, 0.2, 0));
        g.add(M(new THREE.TorusGeometry(0.05, 0.011, 6, 14), clay(D.edge, { smooth: true }), 0, 0.2, 0).rotateX(Math.PI / 2));
        D.motif(g, 0.06, 0, 0.1, 0.085);
        g.scale.setScalar(1.25);
      },
      sickle(g) {
        const top = Hh(g, 0.30, 0.034);
        const { bl, tip } = sickleBlade(g, top, [clay(D.a), clay(D.a), clay(D.b)], clay(D.edge), 1.2);
        D.motif(bl, 0.04, tip.x, tip.y + 0.012, 0);
        g.add(M(new THREE.CylinderGeometry(0.032, 0.04, 0.05, 9), clay(D.mount), 0, top - 0.01, 0));
        g.scale.setScalar(1.18);
      },
      shovel(g) {
        const top = Hh(g, 0.58), by = top + 0.03;
        g.add(M(new THREE.CylinderGeometry(0.036, 0.044, 0.07, 9), clay(D.mount), 0, top + 0.01, 0));
        g.add(M(ext(roundBlade(0.105, 0.13), 0.03, 0.01, 14), clay(D.a, { smooth: true }), 0, by, 0));
        D.motif(g, 0.058, 0, by + 0.12, 0.035);
        g.scale.setScalar(1.18);
      },
      hammer(g) {
        const top = Hh(g, 0.50), y = top - 0.04;
        const head = M(new THREE.CylinderGeometry(0.05, 0.05, 0.15, 14), clay(D.b, { smooth: true }), 0, y, 0); head.rotation.z = Math.PI / 2; g.add(head);
        [-1, 1].forEach(sx => D.motif(g, 0.056, sx * 0.1, y, 0, sx * Math.PI / 2));
        g.scale.setScalar(1.18);
      },
      net(g) {
        g.add(M(new THREE.CylinderGeometry(0.024, 0.028, 0.66, 7), clay(D.h.wood), 0, 0.27, 0));
        g.add(M(new THREE.SphereGeometry(0.04, 10, 8), clay(D.h.knob, { smooth: true }), 0, -0.08, 0));
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
  dinoA: { N: 8, R: 1.0, th: 1.0, overlap: 1, shape: { w: () => 1, tip: 0.04 } },
  dinoB: { N: 10, R: 0.95, th: 1.05, overlap: 1, shape: { w: () => 1, tip: 0 } },
  dinoC: { N: 8, R: 1.0, th: 0.98, overlap: 1, shape: { w: () => 1, tip: 0.06 } },
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
  const rim = (c, col, r = 0.04) => c.add(M(new THREE.TorusGeometry(def.R * Math.sin(def.th) * 0.995, r, 6, 40), clay(col, { smooth: true }), 0, (Math.cos(def.th) - 1) * def.R, 0).rotateX(Math.PI / 2));
  root.add(M(new THREE.CylinderGeometry(0.022, 0.027, L, 7), clay(D.h.wood), 0, L / 2, 0));
  const j = M(new THREE.TorusGeometry(0.07, 0.022, 6, 14, Math.PI), clay(D.h.knob), 0.07, 0, 0); j.rotation.z = Math.PI; root.add(j);
  const ridge = (c, ths, w, h, cols, ry = 0) => { const rg = new THREE.Group(); rg.rotation.y = ry; c.add(rg); ths.forEach((t, i) => {
    const s = 1 - Math.abs(t) * 0.35;
    T.plate(rg, w * s, h * s, cols[i % cols.length], -Math.sin(t) * def.R * 0.99, (Math.cos(t) - 1) * def.R * 0.99, 0, t);
  }); };
  const look = {
    dinoA: { outer: k => k % 2 ? DC.teal : DC.mint, inner: DC.teal,
      deco: (h, k) => { if (k % 2 === 0) onGore(h, 0.7, 0, g => T.sph(g, 0.06, DC.belly, 0, 0, 0.005, [1, 1, 0.3], 10)); },
      finial: c => { rim(c, DC.coral, 0.035); ridge(c, [-0.32, -0.56, -0.8], 0.11, 0.2, [DC.coral], Math.PI / 2); T.dinoHead(c, 0.2, 0, 0.12, 0, { spikeAngles: [0.3, 0.9, 1.5] }); } },
    dinoB: { outer: () => DC.egg, inner: DC.eggD,
      deco: (h, k) => { [[0.35, 0.1, DC.speck], [0.68, -0.12, DC.tealD], [0.9, 0.15, DC.speck]].forEach(([th, ph, col], i) => { if ((k + i) % 2 === 0) onGore(h, th, ph, g => T.sph(g, 0.065 + th * 0.03, col, 0, 0, 0.004, [1, 1, 0.25], 10)); }); },
      finial: c => { rim(c, DC.mint, 0.04); T.egg(c, 0.2, 0, -0.02, 0, { ry: 0.3, teeth: 9 }); } },
    dinoC: { outer: k => k % 2 ? DC.lilacD : DC.lilac, inner: DC.lilacD,
      deco: () => {},
      finial: c => { rim(c, DC.yellow, 0.035); ridge(c, [-0.9, -0.6, -0.3, 0, 0.3, 0.6, 0.9], 0.1, 0.2, [DC.yellow, DC.coral]); } },
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
