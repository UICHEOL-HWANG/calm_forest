import { simKit, baseTools } from '../tool-set-pick/tool-art.mjs';
import { FG, frogKit } from './frog-kit.mjs';
export { simKit, baseTools, FG };

const H = (X, g, wood, grip, knob, bands = []) => X.handle(g, { wood, grip, knob, bands }, 0.52, 0.03);

export function frogThemes(THREE, K, X) {
  const { clay, M } = K;
  const F = frogKit(THREE, K, X);
  const knob = col => g => g.add(M(new THREE.SphereGeometry(0.042, 12, 9), clay(col, { smooth: true }), 0, -0.1, 0));
  const canHandle = (g, col, x = -0.155, y = 0.19) => {
    const t = M(new THREE.TorusGeometry(0.075, 0.016, 8, 16, Math.PI * 1.05), clay(col, { smooth: true }), x, y, 0).rotateZ(Math.PI / 2 + 0.25); g.add(t);
    [0, Math.PI * 1.05].forEach(a => { const c = M(new THREE.SphereGeometry(0.018, 10, 8), clay(col, { smooth: true }), Math.cos(a) * 0.075, Math.sin(a) * 0.075, 0); t.add(c); });
  };
  const spout = (g, col, tip, x = 0.17, y = 0.24) => {
    const sp = M(new THREE.CylinderGeometry(0.02, 0.032, 0.22, 10), clay(col, { smooth: true }), x, y, 0); sp.rotation.z = -0.9; g.add(sp);
    const t = M(new THREE.CylinderGeometry(0.034, 0.024, 0.03, 12), clay(tip, { smooth: true }), x + Math.sin(0.9) * 0.115, y + Math.cos(0.9) * 0.115, 0); t.rotation.z = -0.9; g.add(t);
  };
  const pole = (wood, band, fr = [0.3, 0.55, 0.8]) => (p, L) => {
    p.add(M(new THREE.CylinderGeometry(0.013, 0.026, L, 8), clay(wood), 0, L / 2, 0));
    fr.forEach(f => p.add(M(new THREE.CylinderGeometry(0.027 - f * 0.013, 0.027 - f * 0.013, 0.02, 10), clay(band, { smooth: true }), 0, L * f, 0)));
  };
  const rod = (g, P, bob) => X.rodFrame(g, { knobFn: knob(P.knob), rear: clay(P.rear), line: 0xd8dcd0, pole: pole(P.wood, P.band, P.fr) }, bob);
  const hat = (g, R) => F.sou(g, R);
  const kingly = (g, R) => F.crown(g, R);
  const canHat = (g, R) => F.sou(g, R, { x: 0.4, y: 0.8, z: -0.04, tilt: -0.1, rz: -0.35, s: 0.62 });

  return {
    A: {
      axe(g) {
        const top = H(X, g, FG.wood, FG.bodyD, FG.body, [[FG.body, 0.62]]), cy = top - 0.05;
        g.add(M(new THREE.CylinderGeometry(0.034, 0.034, 0.1, 12), clay(FG.bodyD, { smooth: true }), 0, cy, 0));
        F.frogHead(g, 0.1, 0.13, cy - 0.01, 0, { both: true, sz: 0.55 });
        g.scale.setScalar(1.18);
      },
      water(g) {
        F.frogHead(g, 0.125, 0.025, 0.15, 0, { sz: 0.95, my: -0.24, dip: 0.14, wx: 1.08, ws: 22, ez: 0.16 });
        [-1, 1].forEach(sx => F.foot(g, 0.04, 0.025 + sx * 0.075, 0.055, 0.075, sx * 0.25, FG.bodyD));
        spout(g, FG.body, FG.bodyD);
        canHandle(g, FG.bodyD);
        g.scale.setScalar(1.25);
      },
      rod(g) { rod(g, { knob: FG.body, rear: FG.bodyD, wood: FG.wood, band: FG.body }, b => F.frogHead(b, 0.05, 0, -0.04, 0, { sz: 0.9 })); },
    },
    B: {
      axe(g) {
        const top = H(X, g, FG.wood, FG.padD, FG.pad, [[FG.padV, 0.62]]), cy = top - 0.05;
        g.add(M(new THREE.CylinderGeometry(0.03, 0.03, 0.09, 12), clay(FG.padD, { smooth: true }), 0, cy, 0));
        F.lilyPad(g, 0.105, 0.125, cy - 0.01, 0, { th: 0.016 }).rotation.z = Math.PI;
        F.frogSit(g, 0.048, 0.14, cy + 0.075, 0.0);
        g.scale.setScalar(1.18);
      },
      water(g) {
        F.sph(g, 0.13, FG.pond, 0, 0.13, 0, [1, 0.78, 1], 22);
                const pad = F.lilyPad(g, 0.064, 0.075, 0.198, 0.05, { th: 0.012, both: false }); pad.rotation.set(-Math.PI / 2, 0, -Math.PI / 2 - 0.6);
        const sau = F.lilyPad(g, 0.16, 0, 0.03, 0, { th: 0.014, both: false, notch: 0.45 }); sau.rotation.set(-Math.PI / 2, 0, Math.PI / 2 + 0.5);
        F.frogSit(g, 0.052, 0.078, 0.206, 0.06);
        spout(g, FG.pond, FG.blue, 0.17, 0.2);
        canHandle(g, FG.blue, -0.17, 0.17);
        g.scale.setScalar(1.25);
      },
      rod(g) {
        rod(g, { knob: FG.pad, rear: FG.padD, wood: FG.wood, band: FG.padV }, b => {
          const pad = F.lilyPad(b, 0.06, 0, -0.04, 0, { th: 0.01, both: false }); pad.rotation.set(-Math.PI / 2, 0, -Math.PI / 2 - 0.5);
          F.frogSit(b, 0.03, 0, -0.035, 0.005);
        });
      },
    },
    C: {
      axe(g) {
        const top = H(X, g, FG.yellow, FG.blue, FG.blue, [[FG.blue, 0.62]]), cy = top - 0.05;
        g.add(M(new THREE.CylinderGeometry(0.034, 0.034, 0.1, 12), clay(FG.yellowD, { smooth: true }), 0, cy, 0));
        F.frogHead(g, 0.1, 0.13, cy - 0.02, 0, { sz: 0.6, hat });
        F.drop(g, 0.014, 0.25, cy + 0.02, 0.02);
        F.drop(g, 0.011, 0.27, cy - 0.05, 0.03);
        g.scale.setScalar(1.18);
      },
      water(g) {
        F.frogHead(g, 0.125, 0.025, 0.15, 0, { sz: 0.95, my: -0.24, dip: 0.14, wx: 1.08, ws: 22, ez: 0.16, hat: canHat });
        [-1, 1].forEach(sx => F.foot(g, 0.04, 0.025 + sx * 0.075, 0.055, 0.075, sx * 0.25, FG.bodyD));
        spout(g, FG.yellow, FG.blue);
        canHandle(g, FG.blue);
        F.drop(g, 0.016, 0.33, 0.24, 0);
        g.scale.setScalar(1.25);
      },
      rod(g) { rod(g, { knob: FG.blue, rear: FG.blue, wood: FG.yellow, band: FG.blue }, b => F.frogHead(b, 0.05, 0, -0.04, 0, { sz: 0.9, hat })); },
    },
    D: {
      axe(g) {
        const top = H(X, g, FG.woodD, FG.bodyD, FG.gold, [[FG.gold, 0.62]]), cy = top - 0.05;
        g.add(M(new THREE.CylinderGeometry(0.034, 0.034, 0.1, 12), clay(FG.goldD, { smooth: true }), 0, cy, 0));
        F.frogHead(g, 0.1, 0.13, cy - 0.02, 0, { both: true, sz: 0.55, hat: kingly });
        g.scale.setScalar(1.18);
      },
      water(g) {
        F.frogHead(g, 0.125, 0.025, 0.15, 0, { sz: 0.95, my: -0.24, dip: 0.14, wx: 1.08, ws: 22, ez: 0.16, hat: kingly });
        [-1, 1].forEach(sx => F.foot(g, 0.04, 0.025 + sx * 0.075, 0.055, 0.075, sx * 0.25, FG.bodyD));
        spout(g, FG.gold, FG.goldD);
        canHandle(g, FG.gold);
        g.scale.setScalar(1.25);
      },
      rod(g) { rod(g, { knob: FG.gold, rear: FG.bodyD, wood: FG.woodD, band: FG.gold }, b => F.frogHead(b, 0.05, 0, -0.04, 0, { sz: 0.9, hat: kingly })); },
    },
    E: {
      axe(g) {
        const top = H(X, g, FG.wood, FG.padD, FG.lotus, [[FG.lotus, 0.62]]), cy = top - 0.05;
        g.add(M(new THREE.CylinderGeometry(0.03, 0.03, 0.09, 12), clay(FG.padD, { smooth: true }), 0, cy, 0));
        F.lilyPad(g, 0.1, 0.12, cy - 0.03, 0, { th: 0.016 }).rotation.z = Math.PI;
        F.frogHead(g, 0.05, 0.12, cy + 0.07, 0, { both: true, sz: 0.62 });
        F.lotus(g, 0.085, 0.215, cy - 0.06, 0, { n1: 8, n2: 6, t1: 0.55, t2: 1.05 }).rotation.z = -0.25;
        g.scale.setScalar(1.18);
      },
      water(g) {
        F.sph(g, 0.125, FG.lotus, 0, 0.15, 0, [1, 0.9, 1], 26);
        F.lotus(g, 0.15, 0, 0.1, 0, { n1: 8, n2: 0, t1: -0.42 });
        const pad = F.lilyPad(g, 0.15, 0, 0.035, 0, { th: 0.014, both: false }); pad.rotation.set(-Math.PI / 2, 0, -Math.PI / 2);
        F.frogHead(g, 0.055, 0.075, 0.26, 0.07, { sz: 0.9 });
        spout(g, FG.pad, FG.lotusD);
        canHandle(g, FG.padD);
        g.scale.setScalar(1.25);
      },
      rod(g) { rod(g, { knob: FG.lotus, rear: FG.padD, wood: FG.wood, band: FG.lotus }, b => F.lotus(b, 0.05, 0, -0.04, 0, { t1: 0.75, t2: 1.15 })); },
    },
  };
}

export const SETS = Object.freeze({
  tools_frog: {
    ico: '🐸', name: '개구리 세트', themes: frogThemes, key: 'frog', pal: FG,
    refs: [['tangerine', '기존 🍊 귤', '웃는 귤·초록 잎'], ['peach', '기존 🍑 복숭아', '분홍 복숭아·웃는 얼굴'], ['watermelon', '기존 🍉 수박', '초록 줄무늬·빨간 속 (초록 겹침 확인)']],
    dirs: [
      ['A', '웃는 개구리', '통통한 개구리 얼굴, 위로 솟은 큰 눈과 분홍 볼, 날은 양면 얼굴'],
      ['B', '연잎 위 개구리', '연잎 날 위에 앉은 작은 개구리, 물통은 연잎 받침 위 연못색 통'],
      ['C', '노란 비모자 개구리', '노란 비모자를 쓴 개구리와 파란 빗방울'],
      ['D', '개구리 왕자', '작은 금관을 쓴 개구리, 금빛 띠 손잡이'],
      ['E', '연꽃 연못', '연잎과 분홍 연꽃, 작은 개구리가 빼꼼'],
    ],
  },
});

const MOTIF = {
  A: F => (p, r, x, y, z) => F.frogHead(p, r, x, y, z, { sz: 0.9 }),
  B: (F, THREE) => (p, r, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y - r * 0.55, z); p.add(g); const pad = F.lilyPad(g, r * 1.25, 0, 0, 0, { th: r * 0.16, both: false }); pad.rotation.set(-Math.PI / 2, 0, -Math.PI / 2 - 0.5); F.frogSit(g, r * 0.62, 0, r * 0.06, 0); return g; },
  C: F => (p, r, x, y, z) => F.frogHead(p, r, x, y, z, { sz: 0.9, hat: (g, R) => F.sou(g, R, { y: 0.84, z: -0.12, tilt: -0.15, s: 0.72 }) }),
  D: F => (p, r, x, y, z) => F.frogHead(p, r, x, y, z, { sz: 0.9, hat: (g, R) => F.crown(g, R) }),
  E: F => (p, r, x, y, z) => { F.lotus(p, r * 1.15, x, y - r * 0.45, z); return F.frogHead(p, r * 0.7, x, y + r * 0.05, z, { sz: 0.9 }); },
};
const SPEC = {
  A: { h: { wood: FG.wood, grip: FG.bodyD, knob: FG.body, bands: [[FG.body, 0.62]] }, a: FG.body, b: FG.bodyD, edge: FG.belly, mount: FG.bodyD, bag: FG.body, net: FG.belly },
  B: { h: { wood: FG.wood, grip: FG.padD, knob: FG.pad, bands: [[FG.padV, 0.62]] }, a: FG.pad, b: FG.padD, edge: FG.padV, mount: FG.padD, bag: FG.pond, net: FG.padV },
  C: { h: { wood: FG.yellow, grip: FG.blue, knob: FG.blue, bands: [[FG.blue, 0.62]] }, a: FG.yellow, b: FG.yellowD, edge: FG.blue, mount: FG.blue, bag: FG.yellow, net: FG.blueL },
  D: { h: { wood: FG.woodD, grip: FG.bodyD, knob: FG.gold, bands: [[FG.gold, 0.62]] }, a: FG.gold, b: FG.goldD, edge: FG.gold, mount: FG.bodyD, bag: FG.body, net: FG.belly },
  E: { h: { wood: FG.wood, grip: FG.padD, knob: FG.lotus, bands: [[FG.lotus, 0.62]] }, a: FG.pad, b: FG.padD, edge: FG.lotus, mount: FG.padD, bag: FG.lotus, net: FG.lotus },
};
export const DIR_KEYS = Object.keys(SPEC);

export function portThemes(THREE, K, X) {
  const { clay, M, ext } = K;
  const { roundBlade, pickArms, sickleBlade, netBag } = X;
  const F = frogKit(THREE, K, X), base = frogThemes(THREE, K, X), out = {};
  DIR_KEYS.forEach(L => {
    const D = SPEC[L], motif = MOTIF[L](F, THREE), src = base[L];
    const Hh = (g, l, r = 0.03) => X.handle(g, D.h, l, r);
    out['frog' + L] = {
      axe: src.axe, water: src.water, rod: src.rod,
      hoe(g) {
        const top = Hh(g, 0.52), hd = new THREE.Group(); hd.position.y = top + 0.01; g.add(hd);
        hd.add(M(new THREE.BoxGeometry(0.08, 0.08, 0.075), clay(D.mount)));
        pickArms(hd, [clay(D.a), clay(D.b)], clay(D.edge));
        motif(hd, 0.055, 0, 0.09, 0);
        g.scale.setScalar(1.18);
      },
      seed(g) {
        F.sph(g, 0.11, D.bag, 0, 0.09, 0, [1, 1.05, 1], 20);
        g.add(M(new THREE.CylinderGeometry(0.045, 0.065, 0.05, 12), clay(D.mount, { smooth: true }), 0, 0.2, 0));
        g.add(M(new THREE.TorusGeometry(0.05, 0.011, 6, 14), clay(D.edge, { smooth: true }), 0, 0.2, 0).rotateX(Math.PI / 2));
        motif(g, 0.06, 0, 0.1, 0.085);
        g.scale.setScalar(1.25);
      },
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
        motif(g, 0.05, 0, y + 0.075, 0.01);
        g.scale.setScalar(1.18);
      },
      net(g) {
        g.add(M(new THREE.CylinderGeometry(0.024, 0.028, 0.66, 7), clay(D.h.wood), 0, 0.27, 0));
        g.add(M(new THREE.SphereGeometry(0.04, 10, 8), clay(D.h.knob, { smooth: true }), 0, -0.08, 0));
        g.add(M(new THREE.TorusGeometry(0.17, 0.02, 8, 24), clay(D.a, { smooth: true }), 0, 0.6, 0).rotateX(Math.PI / 2));
        g.add(M(new THREE.ConeGeometry(0.16, 0.3, 14, 1, true), netBag(D.net, 0.5), 0, 0.75, 0));
        motif(g, 0.05, 0, 0.64, 0.17);
        g.scale.setScalar(1.25);
      },
    };
  });
  return out;
}

export const UMBRELLA_DEFS = Object.freeze({
  frogA: { N: 8, R: 1.0, th: 1.0, overlap: 1, shape: { w: () => 1, tip: 0.02 } },
  frogB: { N: 9, R: 1.0, th: 0.95, overlap: 1, shape: { w: () => 1, tip: 0 } },
  frogC: { N: 8, R: 0.98, th: 1.02, overlap: 1, shape: { w: () => 1, tip: 0.04 } },
  frogD: { N: 8, R: 1.0, th: 1.0, overlap: 1, shape: { w: () => 1, tip: 0.02 } },
  frogE: { N: 8, R: 1.0, th: 0.95, overlap: 1.05, shape: { w: () => 1, tip: 0.16 } },
});

export function buildUmbrellaSim(THREE, K, X, theme, L = 1.55) {
  const def = UMBRELLA_DEFS[theme], { clay, M, V } = K, F = frogKit(THREE, K, X), root = new THREE.Group();
  const D = SPEC[theme.slice(-1)];
  function goreGeo(R, thMax, halfW, shape) {
    const W = 8, Hh = 9, pos = [], idx = [];
    for (let j = 0; j <= Hh; j++) { const v = j / Hh; for (let i = 0; i <= W; i++) { const u = i / W * 2 - 1, phi = u * halfW * shape.w(v), th = thMax * v * (1 + shape.tip * (1 - u * u)); pos.push(-Math.cos(phi) * Math.sin(th) * R, (Math.cos(th) - 1) * R, Math.sin(phi) * Math.sin(th) * R); } }
    for (let j = 0; j < Hh; j++) for (let i = 0; i < W; i++) { const a = j * (W + 1) + i, b = a + 1, c = a + W + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals(); return geo;
  }
  const onGore = (h, th, ph, fn) => { const { p, n } = X.goreSurf(def.R * 1.004, th, ph); const g = new THREE.Group(); g.position.copy(p); g.quaternion.setFromUnitVectors(V(0, 0, 1), n); h.add(g); fn(g); };
  const rim = (c, col, r = 0.04) => c.add(M(new THREE.TorusGeometry(def.R * Math.sin(def.th) * 0.995, r, 6, 40), clay(col, { smooth: true }), 0, (Math.cos(def.th) - 1) * def.R, 0).rotateX(Math.PI / 2));
  const vein = h => { const pts = [0.2, 0.5, 0.85].map(t => X.goreSurf(def.R * 1.006, def.th * t, 0).p); F.tube(h, pts, 0.014, FG.padV, 8); };
  root.add(M(new THREE.CylinderGeometry(0.022, 0.027, L, 7), clay(D.h.wood), 0, L / 2, 0));
  const j = M(new THREE.TorusGeometry(0.07, 0.022, 6, 14, Math.PI), clay(D.h.knob), 0.07, 0, 0); j.rotation.z = Math.PI; root.add(j);
  const head = (c, o = {}) => F.frogHead(c, 0.17, 0, 0.12, 0, { sz: 0.92, ...o });
  const look = {
    frogA: { outer: k => k % 2 ? FG.belly : FG.body, inner: FG.belly, deco: () => {}, finial: c => { rim(c, FG.bodyD, 0.035); head(c); } },
    frogB: { outer: () => FG.pad, inner: FG.padD, deco: h => vein(h), finial: c => { rim(c, FG.padD, 0.03); F.frogSit(c, 0.14, 0, 0, 0.02); } },
    frogC: { outer: k => k % 2 ? FG.blueL : FG.yellow, inner: FG.yellowD, deco: (h, k) => { if (k % 2) onGore(h, 0.62, 0, g => F.drop(g, 0.06, 0, 0, 0.02)); }, finial: c => { rim(c, FG.blue, 0.035); head(c, { hat: (g, R) => F.sou(g, R) }); } },
    frogD: { outer: () => FG.body, inner: FG.belly, deco: h => onGore(h, 0.8, 0, g => F.dot(g, 0.035, FG.gold, 0, 0, 0.01)), finial: c => { rim(c, FG.gold, 0.04); head(c, { hat: (g, R) => F.crown(g, R) }); } },
    frogE: { outer: () => FG.lotus, inner: FG.lotusD, deco: () => {}, finial: c => { F.sph(c, 0.2, FG.pad, 0, 0.01, 0, [1, 0.25, 1], 16); head(c, { }).scale.setScalar(0.85); } },
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
