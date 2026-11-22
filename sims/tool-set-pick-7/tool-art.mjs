import { simKit, baseTools } from '../tool-set-pick/tool-art.mjs';
export { simKit, baseTools };

export const PC = Object.freeze({ skin: 0xffc08c, mid: 0xf9a08a, rose: 0xee6f80, flush: 0xf2868a, crease: 0xc4505e, leaf: 0x5aa040, leafD: 0x3a7a34, stem: 0x7a5a3a, wood: 0xa87a52, twig: 0x6e4b33, petal: 0xf4a8bc, petalD: 0xe48aa4, heart: 0xd0587a, stamen: 0xe8c050, ink: 0x3a2618, blush: 0xec7c84, hi: 0xe0d4c4 });

const TAU = Math.PI * 2;
const sstep = t => { const c = Math.max(0, Math.min(1, t)); return c * c * (3 - 2 * c); };

export function motifKit(THREE, K, X) {
  const { clay, M, ext } = K;
  const { small } = X;
  const sph = (p, r, col, x, y, z, s = [1, 1, 1], smooth = true, ws = 12) => { const m = M(new THREE.SphereGeometry(r, ws, Math.max(6, ws * 0.75 | 0)), clay(col, { smooth }), x, y, z); m.scale.set(...s); p.add(m); return m; };
  const leafShape = (w, l) => { const s = new THREE.Shape(); s.moveTo(0, 0); s.bezierCurveTo(l * 0.3, w, l * 0.75, w * 0.8, l, 0); s.bezierCurveTo(l * 0.75, -w * 0.8, l * 0.3, -w, 0, 0); return s; };
  const petalShape = (w, l) => { const s = new THREE.Shape(); s.moveTo(0, 0); s.bezierCurveTo(l * 0.15, w * 0.95, l * 1.05, w * 1.15, l, 0); s.bezierCurveTo(l * 1.05, -w * 1.15, l * 0.15, -w * 0.95, 0, 0); return s; };
  function leaf(p, w, l, x, y, z, rz, ry = 0, col = PC.leaf) { const m = M(ext(leafShape(w, l), w * 0.18, w * 0.06, 6), clay(col, { smooth: true }), x, y, z); m.rotation.set(0, ry, rz); p.add(m); return m; }
  function face(g, r, fz, s = 1) {
    [-1, 1].forEach(sx => {
      g.add(small(M(new THREE.SphereGeometry(r * 0.13, 8, 6), clay(PC.ink, { smooth: true }), sx * r * 0.32, r * 0.1, fz)));
      g.add(small(M(new THREE.SphereGeometry(r * 0.04, 5, 4), clay(PC.hi), sx * r * 0.29, r * 0.14, fz + s * r * 0.1)));
      sph(g, r * 0.13, PC.blush, sx * r * 0.58, -r * 0.12, fz - s * r * 0.04, [1, 0.7, 0.4], true, 8);
    });
    const sm = M(new THREE.TorusGeometry(r * 0.15, r * 0.04, 5, 10, Math.PI), clay(PC.ink), 0, -r * 0.08, fz); sm.rotation.z = Math.PI; if (s < 0) sm.rotation.y = Math.PI; g.add(sm);
  }
  function peachPoint(R, t, ph, o) {
    const sy = o.sy ?? 0.95, tip = o.tip ?? 0.12, dep = o.depth ?? 0.22, w = o.w ?? 0.26, u = t * Math.PI;
    const y = -R * Math.cos(u) * sy + R * tip * sstep((t - 0.55) / 0.45) ** 2;
    let k = 0; (o.creases ?? [0]).forEach(c => { const d = Math.atan2(Math.sin(ph - c), Math.cos(ph - c)); k = Math.max(k, Math.exp(-((d / w) ** 2))); });
    const r = R * Math.sin(u) * (1 - dep * k * (0.35 + 0.65 * sstep((y / R + 1) / 2)));
    return new THREE.Vector3(Math.sin(ph) * r, y, Math.cos(ph) * r * (o.sz ?? 1));
  }
  function peachBand(R, a0, a1, bd, o) {
    const geo = new THREE.SphereGeometry(1, o.ws ?? 22, Math.max(2, Math.round((a1 - a0) * 7)), 0, TAU, a0, a1 - a0);
    geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), bd));
    const pos = geo.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).normalize();
      pos.setXYZ(i, ...peachPoint(R, Math.acos(Math.max(-1, Math.min(1, -v.y))) / Math.PI, Math.atan2(v.x, v.z), o).toArray());
    }
    geo.computeVertexNormals();
    return geo;
  }
  function peach(p, R, x, y, z, o = {}) {
    const g = new THREE.Group(); g.position.set(x, y, z); p.add(g);
    const bd = new THREE.Vector3(...(o.blushDir ?? [0.35, 0.8, 0.5])).normalize();
    const bands = o.bands ?? [[0, 0.6, PC.rose], [0.6, 0.92, PC.flush], [0.92, 1.3, PC.mid], [1.3, Math.PI, PC.skin]];
    bands.forEach(([a0, a1, col]) => g.add(new THREE.Mesh(peachBand(R, a0, a1, bd, o), clay(col, { smooth: true }))));
    (o.creases ?? [0]).forEach(cph => {
      const pts = [];
      for (let i = 4; i <= 17; i++) pts.push(peachPoint(R * 0.985, i / 18, cph, o).toArray());
      twig(g, pts, R * 0.028, PC.crease);
    });
    const topY = R * (o.sy ?? 0.95) + R * (o.tip ?? 0.12);
    if (o.stem !== false) {
      const st = M(new THREE.CylinderGeometry(R * 0.06, R * 0.08, R * 0.28, 6), clay(PC.stem), 0, topY - R * 0.02, 0); st.rotation.z = -0.25; g.add(st);
    }
    if (o.leaves !== false) {
      const ry = o.leafRy ?? 0, lw = R * 0.26, ll = R * 0.78;
      leaf(g, lw, ll, R * 0.04, topY - R * 0.02, 0, o.leafA ?? 0.35, ry, PC.leaf);
      leaf(g, lw * 0.85, ll * 0.85, R * 0.02, topY - R * 0.02, 0, o.leafB ?? 1.05, ry + (o.leafRy2 ?? 0.6), PC.leafD);
    }
    const faces = o.face === 'both' ? [1, -1] : o.face ? [1] : [];
    faces.forEach(s => { const f = new THREE.Group(); f.position.y = -R * (o.faceY ?? 0.12); g.add(f); face(f, R * 0.72, s * R * (o.sz ?? 1) * 0.97, s); });
    return g;
  }
  function blossom(p, R, x, y, z, o = {}) {
    const g = new THREE.Group(); g.position.set(x, y, z); p.add(g);
    const n = o.n ?? 5, d = o.d ?? R * 0.14, pl = R, pw = R * 0.42;
    for (let i = 0; i < n; i++) {
      const a = i * TAU / n + Math.PI / 2 + (o.rot ?? 0);
      const pt = M(ext(petalShape(pw, pl), d, d * 0.3, 5), clay(i % 2 && o.two ? PC.petalD : PC.petal, { smooth: true }), Math.cos(a) * R * 0.08, Math.sin(a) * R * 0.08, 0); pt.rotation.z = a; g.add(pt);
    }
    sph(g, R * 0.34, PC.heart, 0, 0, d * 0.4, [1, 1, 0.4], true, 12);
    if (o.face) face(g, R * 0.5, d * 0.4 + R * 0.12, 1);
    else for (let i = 0; i < 6; i++) { const a = i * TAU / 6; g.add(small(M(new THREE.SphereGeometry(R * 0.07, 5, 4), clay(PC.stamen), Math.cos(a) * R * 0.22, Math.sin(a) * R * 0.22, d * 0.4 + R * 0.12))); }
    return g;
  }
  function twig(p, pts, r, col = PC.twig) {
    const c = new THREE.CatmullRomCurve3(pts.map(v => new THREE.Vector3(...v)));
    const m = new THREE.Mesh(new THREE.TubeGeometry(c, 12, r, 6, false), clay(col, { smooth: true })); p.add(m); return m;
  }
  return { sph, leaf, face, peach, blossom, twig };
}

const H = (X, g, wood, grip, knob, bands = []) => X.handle(g, { wood, grip, knob, bands }, 0.52, 0.03);
const canHandleK = (THREE, K) => (g, col, x = -0.17) => g.add(K.M(new THREE.TorusGeometry(0.075, 0.015, 5, 12, Math.PI * 1.05), K.clay(col), x, 0.2, 0).rotateZ(Math.PI / 2 + 0.25));
const spoutK = (THREE, K) => (g, col, x = 0.17) => { const sp = K.M(new THREE.CylinderGeometry(0.02, 0.032, 0.22, 8), K.clay(col), x, 0.25, 0); sp.rotation.z = -0.9; g.add(sp); };

export function peachThemes(THREE, K, X) {
  const { clay, M } = K;
  const T = motifKit(THREE, K, X), canHandle = canHandleK(THREE, K), spout = spoutK(THREE, K);
  const knob = col => g => g.add(M(new THREE.SphereGeometry(0.042, 8, 6), clay(col, { smooth: true }), 0, -0.1, 0));
  return {
    A: {
      axe(g) {
        const top = H(X, g, PC.wood, PC.leafD, PC.rose, [[PC.mid, 0.62]]), cy = top - 0.05;
        g.add(M(new THREE.BoxGeometry(0.06, 0.1, 0.07), clay(PC.leafD), 0, cy, 0));
        T.peach(g, 0.11, 0.12, cy - 0.02, 0, { sz: 0.44, creases: [0, Math.PI], depth: 0.2, blushDir: [0.55, 0.85, 0], leafA: 0.25, leafB: 1.0, leafRy2: 0 });
        g.scale.setScalar(1.18);
      },
      water(g) {
        T.peach(g, 0.135, 0, 0.15, 0, { creases: [0.35], depth: 0.2, stem: false, leafA: 0.3, leafB: 0.9, leafRy: -0.6, leafRy2: -0.9 });
        g.add(M(new THREE.CylinderGeometry(0.03, 0.036, 0.03, 8), clay(PC.stem), 0, 0.31, 0));
        spout(g, PC.rose);
        canHandle(g, PC.leafD);
        g.scale.setScalar(1.25);
      },
      rod(g) {
        X.rodFrame(g, { knobFn: knob(PC.rose), rear: clay(PC.leafD), line: 0xe8dcd0, pole: (p, L) => {
          p.add(M(new THREE.CylinderGeometry(0.013, 0.026, L, 7), clay(PC.wood), 0, L / 2, 0));
          [0.3, 0.55, 0.8].forEach(f => p.add(M(new THREE.CylinderGeometry(0.027 - f * 0.013, 0.027 - f * 0.013, 0.02, 8), clay(PC.mid), 0, L * f, 0)));
        } }, b => T.peach(b, 0.058, 0, -0.05, 0, { creases: [0.3], leafA: 0.3, leafB: 1.0 }));
      },
    },
    B: {
      axe(g) {
        const top = H(X, g, PC.skin, PC.rose, PC.rose, [[PC.leaf, 0.62]]), cy = top - 0.05;
        g.add(M(new THREE.BoxGeometry(0.06, 0.1, 0.07), clay(PC.rose), 0, cy, 0));
        T.peach(g, 0.115, 0.125, cy - 0.02, 0, { sz: 0.46, creases: [], blushDir: [0.55, 0.85, 0], face: 'both', faceY: 0.18, leafA: 0.25, leafB: 1.0, leafRy2: 0 });
        g.scale.setScalar(1.18);
      },
      water(g) {
        T.peach(g, 0.14, 0, 0.15, 0, { creases: [], face: true, faceY: 0.16, stem: false, leafA: 0.3, leafB: 0.9, leafRy: -0.6, leafRy2: -0.9 });
        g.add(M(new THREE.CylinderGeometry(0.03, 0.036, 0.03, 8), clay(PC.stem), 0, 0.31, 0));
        spout(g, PC.rose);
        canHandle(g, PC.rose);
        g.scale.setScalar(1.25);
      },
      rod(g) {
        X.rodFrame(g, { knobFn: knob(PC.rose), rear: clay(PC.rose), line: 0xe8dcd0, pole: (p, L) => {
          p.add(M(new THREE.CylinderGeometry(0.013, 0.026, L, 7), clay(PC.skin), 0, L / 2, 0));
          [0.25, 0.45, 0.65, 0.85].forEach(f => p.add(M(new THREE.CylinderGeometry(0.027 - f * 0.013, 0.027 - f * 0.013, 0.02, 8), clay(PC.rose), 0, L * f, 0)));
        } }, b => T.peach(b, 0.064, 0, -0.05, 0, { creases: [], face: true, faceY: 0.16, leafA: 0.3, leafB: 1.0 }));
      },
    },
    C: {
      axe(g) {
        const top = H(X, g, PC.twig, PC.leafD, PC.petal, [[PC.petal, 0.62]]), cy = top - 0.05;
        g.add(M(new THREE.BoxGeometry(0.06, 0.1, 0.07), clay(PC.twig), 0, cy, 0));
        T.blossom(g, 0.1, 0.12, cy + 0.01, 0, { d: 0.022 });
        T.peach(g, 0.048, 0.2, cy - 0.085, 0.015, { creases: [0.2], leafA: 0.5, leafB: 1.4 });
        g.scale.setScalar(1.18);
      },
      water(g) {
        g.add(M(new THREE.CylinderGeometry(0.115, 0.122, 0.2, 18), clay(PC.petal, { smooth: true }), 0, 0.15, 0));
        g.add(M(new THREE.CylinderGeometry(0.126, 0.126, 0.03, 18), clay(PC.twig, { smooth: true }), 0, 0.06, 0));
        g.add(M(new THREE.CylinderGeometry(0.12, 0.12, 0.02, 18), clay(PC.petalD, { smooth: true }), 0, 0.255, 0));
        T.twig(g, [[0.09, 0.27, 0.06], [0.02, 0.3, 0.1], [-0.05, 0.27, 0.11]], 0.011);
        T.blossom(g, 0.055, 0.0, 0.3, 0.12, { d: 0.014, rot: 0.2 });
        T.blossom(g, 0.04, 0.09, 0.29, 0.06, { d: 0.012, rot: 0.6 }).rotation.y = 0.8;
        T.peach(g, 0.04, 0.05, 0.18, 0.13, { creases: [0], leafA: 0.4, leafB: 1.3 });
        spout(g, PC.twig);
        canHandle(g, PC.twig);
        g.scale.setScalar(1.25);
      },
      rod(g) {
        X.rodFrame(g, { knobFn: knob(PC.petal), rear: clay(PC.twig), line: 0xe8dcd0, pole: (p, L) => {
          p.add(M(new THREE.CylinderGeometry(0.013, 0.026, L, 7), clay(PC.twig), 0, L / 2, 0));
          T.blossom(p, 0.045, 0.03, L * 0.5, 0.014, { d: 0.01 });
          T.blossom(p, 0.036, -0.025, L * 0.72, 0.012, { d: 0.009, rot: 0.5 });
        } }, b => T.peach(b, 0.058, 0, -0.05, 0, { creases: [0.3], leafA: 0.3, leafB: 1.0 }));
      },
    },
  };
}

export const SETS = Object.freeze({
  tools_peach: {
    ico: '🍑', name: '복숭아 세트', pal: PC, themes: peachThemes, key: 'peach',
    refs: [['strawberry', '기존 🍓 딸기', '빨강 딸기·노랑 씨·초록 꼭지'], ['tangerine', '기존 🍊 귤', '주황 귤·초록 잎'], ['watermelon', '기존 🍉 수박', '초록 줄무늬·빨간 속']],
    dirs: [
      ['A', '복숭아 한 알', '노랑에서 분홍으로 물든 두 톤 복숭아, 가운데 골과 초록 잎 두 장'],
      ['B', '웃는 복숭아', '골 대신 웃는 얼굴과 볼터치, 날은 양면 얼굴'],
      ['C', '복사꽃 가지', '분홍 복사꽃 날 아래 작은 복숭아, 물통은 꽃가지 두른 분홍 통'],
    ],
  },
});

const DIR_SPEC = {
  peachA: T => ({ h: { wood: PC.wood, grip: PC.leafD, knob: PC.rose, bands: [[PC.mid, 0.62]] }, a: PC.skin, b: PC.rose, edge: PC.mid, mount: PC.leafD, bag: PC.skin, net: PC.mid,
    motif: (p, r, x, y, z) => T.peach(p, r, x, y, z, { creases: [0], leafA: 0.3, leafB: 1.0 }) }),
  peachB: T => ({ h: { wood: PC.skin, grip: PC.rose, knob: PC.rose, bands: [[PC.leaf, 0.62]] }, a: PC.mid, b: PC.rose, edge: PC.skin, mount: PC.rose, bag: PC.mid, net: PC.skin,
    motif: (p, r, x, y, z) => T.peach(p, r * 1.1, x, y, z, { creases: [], face: true, faceY: 0.16, leafA: 0.3, leafB: 1.0 }) }),
  peachC: T => ({ h: { wood: PC.twig, grip: PC.leafD, knob: PC.petal, bands: [[PC.petal, 0.62]] }, a: PC.petal, b: PC.petalD, edge: PC.heart, mount: PC.twig, bag: PC.skin, net: PC.petal,
    motif: (p, r, x, y, z) => T.blossom(p, r * 1.15, x, y, z, { d: r * 0.25 }) }),
};

export function portThemes(THREE, K, X) {
  const { clay, M, ext } = K;
  const { roundBlade, pickArms, sickleBlade, netBag } = X;
  const T = motifKit(THREE, K, X), out = {};
  const base = { peach: peachThemes(THREE, K, X) };
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
  peachA: { N: 10, R: 0.95, th: 1.05, overlap: 1, shape: { w: () => 1, tip: 0 } },
  peachB: { N: 8, R: 1.0, th: 0.95, overlap: 1, shape: { w: () => 1, tip: 0.02 } },
  peachC: { N: 5, R: 1.0, th: 0.95, overlap: 1.05, shape: { w: () => 1, tip: 0.14 } },
});

export function buildUmbrellaSim(THREE, K, X, theme, L = 1.55) {
  const def = UMBRELLA_DEFS[theme], { clay, M, V } = K, T = motifKit(THREE, K, X), root = new THREE.Group();
  const D = DIR_SPEC[theme](T);
  function goreGeo(R, thMax, halfW, shape, col) {
    const W = 8, Hh = 9, pos = [], idx = [];
    for (let j = 0; j <= Hh; j++) { const v = j / Hh; for (let i = 0; i <= W; i++) { const u = i / W * 2 - 1, phi = u * halfW * shape.w(v), th = thMax * v * (1 + shape.tip * (1 - u * u)); pos.push(-Math.cos(phi) * Math.sin(th) * R, (Math.cos(th) - 1) * R, Math.sin(phi) * Math.sin(th) * R); } }
    for (let j = 0; j < Hh; j++) for (let i = 0; i < W; i++) { const a = j * (W + 1) + i, b = a + 1, c = a + W + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals(); return geo;
  }
  const onGore = (h, th, ph, fn) => { const { p, n } = X.goreSurf(def.R * 1.004, th, ph); const g = new THREE.Group(); g.position.copy(p); g.quaternion.setFromUnitVectors(V(0, 0, 1), n); h.add(g); fn(g); };
  const rim = (c, col, r = 0.04) => c.add(M(new THREE.TorusGeometry(def.R * Math.sin(def.th) * 0.995, r, 6, 40), clay(col), 0, (Math.cos(def.th) - 1) * def.R, 0).rotateX(Math.PI / 2));
  root.add(M(new THREE.CylinderGeometry(0.022, 0.027, L, 7), clay(D.h.wood), 0, L / 2, 0));
  const j = M(new THREE.TorusGeometry(0.07, 0.022, 6, 14, Math.PI), clay(D.h.knob), 0.07, 0, 0); j.rotation.z = Math.PI; root.add(j);
  const look = {
    peachA: { outer: k => [PC.skin, PC.mid][k % 2], inner: PC.mid, deco: () => {}, finial: c => { rim(c, PC.rose, 0.035); T.peach(c, 0.17, 0, 0.12, 0, { creases: [0], leafA: 0.3, leafB: 1.0 }); } },
    peachB: { outer: k => k % 2 ? PC.mid : PC.rose, inner: PC.skin, deco: (h, k) => { if (k % 2 === 0) onGore(h, 0.6, 0, g => T.leaf(g, 0.05, 0.16, -0.08, 0, 0.01, 0, 0, PC.leaf)); }, finial: c => { rim(c, PC.skin, 0.04); T.peach(c, 0.18, 0, 0.13, 0, { creases: [], face: true, faceY: 0.16, leafA: 0.3, leafB: 1.0 }); } },
    peachC: { outer: () => PC.petal, inner: PC.petalD, deco: h => onGore(h, 0.75, 0, g => T.peach(g, 0.06, 0, 0, 0.03, { creases: [0], leaves: false, stem: false, sz: 0.6 })), finial: c => { T.sph(c, 0.22, PC.heart, 0, 0, 0, [1, 0.35, 1], true, 14); for (let i = 0; i < 8; i++) { const a = i * TAU / 8; T.sph(c, 0.035, PC.stamen, Math.cos(a) * 0.15, 0.07, Math.sin(a) * 0.15, [1, 1, 1], true, 6); } } },
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
