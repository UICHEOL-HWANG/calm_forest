import * as THREE from 'three';
import { bakeGroup, part } from '../../js/dream/art.js';

export const IDS = ['cp_tent', 'cp_camp_chair', 'cp_lantern_hook', 'cp_marshmallow_fire'];
export const VARIANTS = ['A', 'B', 'C'];

export const C = {
  olive: 0x7f8c4f, oliveDk: 0x5f6c3a, mustard: 0xd6a640, mustardDk: 0xae8330,
  brick: 0xc8643c, brickDk: 0x9e4a2c, cream: 0xe2d3b6, creamDk: 0xc9b48f,
  navy: 0x3a4a6c, navyDk: 0x2b3854, wood: 0x9c6b40, woodLt: 0xc99a62, woodDk: 0x6b4a2e,
  stone: 0x8f887e, stoneLt: 0xa9a296, iron: 0x4a4a52, marsh: 0xe2d6c0, toast: 0xc08a4c,
  lamp: 0xf2cd72, flame: 0xe8803a, flameIn: 0xf2c25a,
};

export const META = {
  cp_tent: {
    A: { name: '머스터드 삼각 텐트', note: '머스터드 천 · 걷어 올린 크림 문 · 꼭대기 벽돌색 깃발 · 줄과 말뚝', foot: [1.7, 1.9] },
    B: { name: '올리브 돔 텐트', note: '둥근 올리브 텐트 · 머스터드 폴대 두 줄 · 남색 둥근 문', foot: [2.0, 2.0] },
    C: { name: '크림 벨 텐트', note: '크림 원뿔 텐트 · 벽돌색 지붕 띠 · 묶어 올린 문', foot: [1.7, 1.7] },
  },
  cp_camp_chair: {
    A: { name: '접이식 캔버스 의자', note: '나무 X자 다리 · 올리브 천 · 등받이 머스터드 줄 하나', foot: [0.6, 0.6] },
    B: { name: '줄무늬 기대 의자', note: '낮게 기댄 나무 의자 · 머스터드·크림 줄무늬 천', foot: [0.6, 0.75] },
    C: { name: '통나무 담요 의자', note: '통나무 자리 · 둥근 나무 등받이 · 걸쳐 둔 벽돌색 체크 담요 · 크림 방석', foot: [0.6, 0.65] },
  },
  cp_lantern_hook: {
    A: { name: '쇠 고리 랜턴', note: '남색 쇠기둥 끝 동그란 고리 · 머스터드 랜턴', foot: [0.5, 0.5] },
    B: { name: '삼각대 랜턴', note: '나무 막대 셋을 크림 끈으로 묶고 · 가운데 랜턴', foot: [0.7, 0.7] },
    C: { name: '그루터기 가지 랜턴', note: '통나무 받침 · 굽은 가지 고리 · 벽돌색 작은 랜턴 · 솔방울', foot: [0.55, 0.55] },
  },
  cp_marshmallow_fire: {
    A: { name: '돌 화로 + 꼬치 둘', note: '돌 둘레 · 세운 장작 불 · 땅에 꽂은 마시멜로 꼬치 둘', foot: [1.35, 1.3] },
    B: { name: '쇠 화로 그릇', note: '세 다리 남색 화로 · 걸쳐 둔 꼬치 · 마시멜로 봉지', foot: [1.4, 1.1] },
    C: { name: '꼬치 받침 화로', note: '돌 둘레 불 · 양쪽 가지 받침에 가로 꼬치 마시멜로 셋', foot: [1.8, 1.15] },
  },
};

const TAU = Math.PI * 2;
const sph = (r, w = 12, h = 9, ...rest) => new THREE.SphereGeometry(r, w, h, ...rest);
const cyl = (a, b, h, s = 12, ...rest) => new THREE.CylinderGeometry(a, b, h, s, ...rest);
const box = (x, y, z) => new THREE.BoxGeometry(x, y, z);
const torus = (r, t, rs = 6, ts = 18, arc = TAU) => new THREE.TorusGeometry(r, t, rs, ts, arc);
const cone = (r, h, s = 12) => new THREE.ConeGeometry(r, h, s);
const grp = (p, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); p.add(g); return g; };
const tube = (pts, r, seg = 40, rad = 6) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))), seg, r, rad, false);
const stick = (p, a, b, r, col, r2 = r) => {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const m = part(p, cyl(r2, r, A.distanceTo(B), 6), col, (A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.sub(A).normalize());
  return m;
};
function tri(w, h, depth) {
  const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, h); s.lineTo(-w / 2, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false }); g.translate(0, 0, -depth / 2); return g;
}

function flameAt(g, x, y, z, k = 1) {
  part(g, cone(0.15 * k, 0.42 * k, 7), C.flame, x, y + 0.21 * k, z);
  [[-0.08, 0.6, 0.3], [0.08, -0.5, 0.26]].forEach(([dx, rz, hh]) => part(g, cone(0.07 * k, hh * k, 6), C.flame, x + dx * k, y + hh * k / 2, z).rotation.z = rz * 0.3);
  part(g, cone(0.08 * k, 0.26 * k, 7), C.flameIn, x, y + 0.13 * k, z + 0.03 * k);
}

function stoneRing(s, r, n, y = 0.07) {
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU, m = part(s, sph(0.11, 8, 6), i % 3 ? C.stone : C.stoneLt, Math.cos(a) * r, y, Math.sin(a) * r);
    m.scale.set(1.15, 0.7, 0.95); m.rotation.y = -a;
  }
}

function logTeepee(s, n, r, h, y0 = 0.02) {
  for (let i = 0; i < n; i++) { const a = i / n * TAU + 0.3; stick(s, [Math.cos(a) * r, y0, Math.sin(a) * r], [Math.cos(a) * 0.03, y0 + h, Math.sin(a) * 0.03], 0.035, i % 2 ? C.wood : C.woodDk); }
}

function marshmallow(s, x, y, z, ax = 'y', k = 1) {
  const m = part(s, cyl(0.045 * k, 0.045 * k, 0.07 * k, 10), C.marsh, x, y, z);
  if (ax === 'x') m.rotation.z = Math.PI / 2;
  return m;
}

function skewer(s, a, b, n, k = 1) {
  stick(s, a, b, 0.008, C.woodDk);
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A).normalize();
  for (let i = 0; i < n; i++) {
    const p = B.clone().addScaledVector(d, -0.05 - i * 0.09 * k);
    const m = part(s, cyl(0.045 * k, 0.045 * k, 0.07 * k, 10), i ? C.marsh : C.toast, p.x, p.y, p.z);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
  }
}

function lantern(s, g, x, y, z, k, body, cap) {
  const L = grp(s, x, y, z), G = grp(g, x, y, z);
  L.scale.setScalar(k); G.scale.setScalar(k);
  part(L, cyl(0.09, 0.1, 0.05, 14), body, 0, 0.025, 0);
  part(G, cyl(0.062, 0.062, 0.15, 12), C.lamp, 0, 0.125, 0);
  for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + 0.4; part(L, cyl(0.009, 0.009, 0.16, 4), cap, Math.cos(a) * 0.075, 0.125, Math.sin(a) * 0.075); }
  part(L, cyl(0.055, 0.1, 0.06, 14), body, 0, 0.23, 0);
  part(L, cyl(0.025, 0.035, 0.03, 8), cap, 0, 0.275, 0);
  part(L, torus(0.06, 0.008, 4, 16, Math.PI), cap, 0, 0.29, 0);
  return L;
}

const BUILD = {
  cp_tent: {
    A(s) {
      const L = 1.35, hw = 0.62, H = 1.0, sl = Math.hypot(hw, H), ang = Math.atan2(hw, H);
      [-1, 1].forEach(sx => {
        const p = part(s, box(0.035, sl, L), C.mustard, sx * hw / 2, H / 2, 0); p.rotation.z = sx * ang;
        part(s, box(0.05, 0.05, L + 0.02), C.mustardDk, sx * hw, 0.03, 0);
      });
      part(s, tri(hw * 2, H, 0.03), C.mustard, 0, 0, -L / 2);
      part(s, tri(hw * 2, H, 0.02), C.mustardDk, 0, 0, L / 2 - 0.02);
      part(s, tri(hw * 1.0, H * 0.7, 0.02), C.creamDk, 0, 0, L / 2 - 0.005);
      [-1, 1].forEach(sx => stick(s, [sx * hw * 0.5, 0.02, L / 2 + 0.01], [0, H * 0.7, L / 2 + 0.01], 0.028, C.mustardDk));
      stick(s, [0, 0, L / 2 + 0.03], [0, H + 0.12, L / 2 + 0.03], 0.02, C.woodDk);
      stick(s, [0, 0, -L / 2 - 0.03], [0, H + 0.08, -L / 2 - 0.03], 0.02, C.woodDk);
      part(s, cyl(0.012, 0.012, L + 0.08, 6), C.woodDk, 0, H + 0.01, 0).rotation.x = Math.PI / 2;
      const fl = part(s, tri(0.16, 0.24, 0.012), C.brick, 0.09, H + 0.02, L / 2 + 0.03); fl.rotation.z = -Math.PI / 2;
      [-1, 1].forEach(sz => {
        const top = [0, H + 0.06, sz * (L / 2 + 0.03)], peg = [0, 0.02, sz * (L / 2 + 0.42)];
        stick(s, top, peg, 0.005, C.cream);
        part(s, cyl(0.02, 0.012, 0.1, 6), C.woodDk, peg[0], 0.03, peg[2]);
      });
      return { k: 1.3 };
    },
    B(s) {
      const R = 0.7;
      const d = part(s, sph(R, 28, 14, 0, TAU, 0, Math.PI / 2), C.olive, 0, 0, 0); d.scale.y = 1.05;
      part(s, cyl(R * 1.01, R * 1.01, 0.06, 28), C.oliveDk, 0, 0.03, 0);
      [0.785, -0.785].forEach(a => {
        const p = part(s, torus(R * 1.015, 0.022, 5, 32, Math.PI), C.mustard, 0, 0, 0); p.rotation.y = a; p.scale.y = 1.05;
      });
      const ds = new THREE.Shape(); ds.moveTo(-0.28, 0); ds.absellipse(0, 0, 0.28, 0.44, Math.PI, 0, true); ds.lineTo(-0.28, 0);
      const door = grp(s, 0, 0.02, R * 0.985); door.rotation.x = -0.36;
      part(door, new THREE.ExtrudeGeometry(ds, { depth: 0.02, bevelEnabled: false, curveSegments: 16 }), C.navyDk);
      const rs = new THREE.Shape(); rs.absellipse(0, 0, 0.31, 0.47, Math.PI, 0, true); rs.lineTo(-0.31, 0);
      const hole = new THREE.Path(); hole.absellipse(0, 0, 0.27, 0.43, 0, Math.PI, false); hole.lineTo(0.27, 0); rs.holes.push(hole);
      part(door, new THREE.ExtrudeGeometry(rs, { depth: 0.03, bevelEnabled: false, curveSegments: 16 }), C.mustardDk, 0, 0, -0.005);
      const zip = part(door, box(0.015, 0.4, 0.01), C.mustard, 0.0, 0.2, 0.025);
      part(s, cyl(0.03, 0.03, 0.04, 8), C.mustardDk, 0, R * 1.05 + 0.01, 0);
      [[0.95, 0.5], [-0.95, 0.5], [0.55, -0.85], [-0.55, -0.85]].forEach(([x, z]) => part(s, cyl(0.02, 0.012, 0.1, 6), C.woodDk, x * R * 1.1, 0.04, z * R * 1.1));
      return { k: 1.4 };
    },
    C(s) {
      const R = 0.78, wh = 0.42, H = 1.45;
      part(s, cyl(R, R, wh, 28, 1, true), C.cream, 0, wh / 2, 0).material.side = THREE.DoubleSide;
      part(s, cone(R * 1.04, H - wh, 28), C.cream, 0, wh + (H - wh) / 2, 0);
      const band = part(s, cyl(R * 0.62, R * 1.045, 0.18, 28, 1, true), C.brick, 0, wh + 0.09, 0); band.material.side = THREE.DoubleSide;
      part(s, cyl(R * 1.05, R * 1.05, 0.03, 28, 1, true), C.brickDk, 0, wh + 0.005, 0).material.side = THREE.DoubleSide;
      part(s, cyl(0.025, 0.025, 0.3, 6), C.woodDk, 0, H + 0.1, 0);
      part(s, sph(0.04, 8, 6), C.brick, 0, H + 0.26, 0);
      const door = grp(s, 0, 0, R * 0.99);
      part(door, tri(0.5, 0.78, 0.02), C.woodDk, 0, 0, 0.0);
      [-1, 1].forEach(sx => {
        const f = part(door, tri(0.26, 0.6, 0.02), C.creamDk, sx * 0.3, 0.12, 0.03); f.rotation.z = sx * 0.35;
        part(door, torus(0.035, 0.012, 4, 10), C.mustard, sx * 0.3, 0.34, 0.05).rotation.y = Math.PI / 2;
      });
      for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + 0.31; stick(s, [Math.cos(a) * R, wh, Math.sin(a) * R], [Math.cos(a) * (R + 0.32), 0.02, Math.sin(a) * (R + 0.32)], 0.005, C.creamDk); }
      return {};
    },
  },
  cp_camp_chair: {
    A(s) {
      const W = 0.5, sy = 0.4;
      [-1, 1].forEach(sx => {
        stick(s, [sx * W / 2, 0, 0.22], [sx * W / 2, sy, -0.2], 0.018, C.wood);
        stick(s, [sx * W / 2, 0, -0.22], [sx * W / 2, sy, 0.2], 0.018, C.wood);
        stick(s, [sx * W / 2, sy - 0.02, -0.2], [sx * W / 2, 0.86, -0.3], 0.018, C.wood);
        part(s, box(0.06, 0.03, 0.36), C.woodLt, sx * (W / 2 + 0.02), 0.58, -0.02);
        stick(s, [sx * W / 2, sy, 0.17], [sx * (W / 2 + 0.02), 0.57, 0.14], 0.014, C.wood);
      });
      const seat = part(s, cyl(0.6, 0.6, W, 20, 1, true, Math.PI * 1.5 - 0.36, 0.72), C.olive, 0, sy + 0.55, 0); seat.rotation.z = Math.PI / 2; seat.material.side = THREE.DoubleSide;
      part(s, box(W, 0.03, 0.03), C.woodDk, 0, sy, 0.2); part(s, box(W, 0.03, 0.03), C.woodDk, 0, sy, -0.2);
      const back = grp(s, 0, 0.66, -0.26); back.rotation.x = -0.2;
      part(back, box(W - 0.02, 0.34, 0.02), C.olive);
      part(back, box(W - 0.02, 0.06, 0.025), C.mustard, 0, 0.02, 0.003);
      return {};
    },
    B(s) {
      const W = 0.52;
      [-1, 1].forEach(sx => {
        stick(s, [sx * W / 2, 0, 0.3], [sx * W / 2, 0.9, -0.32], 0.02, C.wood);
        stick(s, [sx * W / 2, 0, -0.3], [sx * W / 2, 0.42, 0.12], 0.02, C.wood);
        part(s, box(0.06, 0.03, 0.3), C.woodLt, sx * (W / 2 + 0.03), 0.45, 0.02);
      });
      const pts = [[0, 0.32, 0.22], [0, 0.2, 0.05], [0, 0.25, -0.12], [0, 0.55, -0.2], [0, 0.85, -0.3]].map(([x, y, z]) => new THREE.Vector3(x, y, z));
      const curve = new THREE.CatmullRomCurve3(pts), N = 6;
      for (let i = 0; i < N; i++) {
        const x0 = -W / 2 + 0.02 + i * (W - 0.04) / N, w = (W - 0.04) / N;
        const sh = curve.getPoints(24).map(p => new THREE.Vector3(x0 + w / 2, p.y, p.z));
        for (let j = 0; j < 24; j++) {
          const a = sh[j], b = sh[j + 1];
          const sl = part(s, box(w, 0.012, a.distanceTo(b) * 1.05), i % 2 ? C.cream : C.mustard, (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
          sl.lookAt(s.localToWorld(b.clone()));
        }
      }
      part(s, box(W, 0.03, 0.03), C.woodDk, 0, 0.88, -0.31);
      part(s, box(W, 0.03, 0.03), C.woodDk, 0, 0.32, 0.22);
      return {};
    },
    C(s) {
      part(s, cyl(0.26, 0.28, 0.4, 18), C.wood, 0, 0.2, 0.04);
      part(s, cyl(0.25, 0.25, 0.012, 18), C.woodLt, 0, 0.402, 0.04);
      [0.12, 0.28].forEach(y => part(s, torus(0.268, 0.008, 4, 24), C.woodDk, 0, y, 0.04).rotation.x = Math.PI / 2);
      const cu = part(s, sph(0.22, 18, 10), C.cream, 0, 0.44, 0.06); cu.scale.y = 0.22;
      const back = grp(s, 0, 0, -0.21); back.rotation.x = -0.06;
      part(back, box(0.56, 0.77, 0.09), C.wood, 0, 0.385, 0);
      part(back, cyl(0.28, 0.28, 0.09, 22), C.wood, 0, 0.77, 0).rotation.x = Math.PI / 2;
      part(back, torus(0.2, 0.007, 4, 24, Math.PI), C.woodDk, 0, 0.77, 0.047);
      const bl = grp(back, 0.07, 0.94, 0.055); bl.rotation.z = -0.12;
      for (let i = 0; i < 5; i++) part(bl, box(0.07, 0.44, 0.014), i % 2 ? C.cream : C.brick, -0.14 + i * 0.07, -0.22, 0);
      [-0.12, -0.26, -0.4].forEach(y => part(bl, box(0.36, 0.035, 0.018), C.brickDk, 0, y, 0.002));
      part(bl, cyl(0.035, 0.035, 0.37, 10), C.brick, 0, 0.0, -0.03).rotation.z = Math.PI / 2;
      return {};
    },
  },
  cp_lantern_hook: {
    A(s, g) {
      part(s, cyl(0.16, 0.18, 0.04, 16), C.navyDk, 0, 0.02, 0);
      part(s, cyl(0.02, 0.022, 1.3, 8), C.navy, 0, 0.68, 0);
      const arc = Array.from({ length: 25 }, (_, i) => { const t = Math.PI * (1 - i / 24); return [0.17 + Math.cos(t) * 0.17, 1.33 + Math.sin(t) * 0.17, 0]; });
      part(s, tube(arc, 0.016, 40, 6), C.navy);
      part(s, sph(0.028, 8, 6), C.mustardDk, 0.34, 1.33, 0);
      stick(s, [0.34, 1.33, 0], [0.34, 1.27, 0], 0.006, C.navyDk);
      lantern(s, g, 0.34, 0.87, 0, 1.35, C.mustard, C.mustardDk);
      return {};
    },
    B(s, g) {
      const top = [0, 1.35, 0];
      [0, 1, 2].forEach(i => { const a = i / 3 * TAU + 0.5; stick(s, [Math.sin(a) * 0.36, 0, Math.cos(a) * 0.36], [Math.sin(a) * -0.05, 1.45, Math.cos(a) * -0.05], 0.022, i ? C.wood : C.woodDk); });
      [0, 0.04, 0.08].forEach(dy => part(s, torus(0.04, 0.012, 4, 12), C.cream, 0, 1.3 + dy, 0).rotation.x = Math.PI / 2);
      stick(s, top, [0, 1.08, 0], 0.006, C.cream);
      lantern(s, g, 0, 0.69, 0, 1.3, C.olive, C.oliveDk);
      return {};
    },
    C(s, g) {
      part(s, cyl(0.22, 0.24, 0.3, 16), C.wood, 0, 0.15, 0);
      part(s, cyl(0.2, 0.2, 0.01, 16), C.woodLt, 0, 0.305, 0);
      part(s, torus(0.13, 0.006, 3, 18), C.wood, 0, 0.311, 0).rotation.x = Math.PI / 2;
      const br = [[-0.06, 0.28, -0.04], [-0.04, 0.6, -0.02], [-0.08, 0.9, 0], [0.0, 1.08, 0], [0.14, 1.12, 0], [0.24, 1.06, 0]];
      part(s, tube(br, 0.025, 40, 6), C.woodDk);
      stick(s, [-0.05, 0.75, -0.01], [-0.18, 0.86, 0.02], 0.01, C.woodDk);
      part(s, sph(0.04, 8, 6), C.olive, -0.19, 0.88, 0.02).scale.set(1.4, 0.8, 1);
      stick(s, [0.23, 1.05, 0], [0.23, 0.92, 0], 0.005, C.iron);
      lantern(s, g, 0.23, 0.53, 0, 1.3, C.brick, C.brickDk);
      [[0.12, 0.34, 0.08, 0.3], [0.04, 0.34, 0.14, -0.5]].forEach(([x, y, z, r]) => {
        const pc = part(s, cone(0.04, 0.09, 7), C.woodDk, x, y, z); pc.rotation.set(Math.PI / 2, 0, r);
      });
      return {};
    },
  },
  cp_marshmallow_fire: {
    A(s, g) {
      stoneRing(s, 0.36, 11);
      part(s, cyl(0.3, 0.3, 0.02, 18), C.woodDk, 0, 0.01, 0);
      logTeepee(s, 5, 0.24, 0.36);
      flameAt(g, 0, 0.04, 0, 1.25);
      skewer(s, [0.5, 0, 0.32], [0.12, 0.42, 0.08], 2);
      skewer(s, [-0.48, 0, 0.36], [-0.1, 0.44, 0.1], 2);
      return { k: 1.35 };
    },
    B(s, g) {
      [0, 1, 2].forEach(i => { const a = i / 3 * TAU + 0.5; stick(s, [Math.sin(a) * 0.3, 0, Math.cos(a) * 0.3], [Math.sin(a) * 0.2, 0.26, Math.cos(a) * 0.2], 0.02, C.navyDk); });
      const bowl = part(s, sph(0.34, 22, 10, 0, TAU, Math.PI / 2, Math.PI / 2), C.navy, 0, 0.42, 0); bowl.scale.y = 0.5; bowl.material.side = THREE.DoubleSide;
      part(s, torus(0.34, 0.025, 6, 26), C.navyDk, 0, 0.42, 0).rotation.x = Math.PI / 2;
      part(s, cyl(0.3, 0.3, 0.02, 18), C.woodDk, 0, 0.36, 0);
      [0.4, -0.5, 1.6].forEach((a, i) => { const m = part(s, cyl(0.035, 0.035, 0.4, 8), i % 2 ? C.wood : C.woodDk, 0, 0.4 + i * 0.03, 0); m.rotation.set(Math.PI / 2, a, 0); });
      flameAt(g, 0, 0.4, 0, 0.9);
      skewer(s, [0.52, 0.3, -0.2], [0.05, 0.6, 0.05], 2);
      const bag = grp(s, -0.5, 0, 0.32); bag.rotation.y = 0.5;
      part(bag, box(0.2, 0.24, 0.1), C.cream, 0, 0.12, 0);
      part(bag, box(0.2, 0.06, 0.04), C.creamDk, 0, 0.27, 0);
      part(bag, box(0.14, 0.08, 0.005), C.brick, 0, 0.12, 0.052);
      [[-0.42, 0.04, 0.5], [-0.62, 0.04, 0.42]].forEach(([x, y, z]) => marshmallow(s, x, y, z));
      return { k: 1.25 };
    },
    C(s, g) {
      stoneRing(s, 0.34, 10);
      part(s, cyl(0.28, 0.28, 0.02, 18), C.woodDk, 0, 0.01, 0);
      [0, 1].forEach(i => { const m = part(s, cyl(0.04, 0.04, 0.46, 8), i ? C.wood : C.woodDk, 0, 0.06 + i * 0.06, 0); m.rotation.set(Math.PI / 2, i ? 0.8 : -0.8, 0); });
      flameAt(g, 0, 0.08, 0, 0.85);
      [-1, 1].forEach(sx => {
        stick(s, [sx * 0.55, 0, 0], [sx * 0.55, 0.52, 0], 0.02, C.woodDk);
        stick(s, [sx * 0.55, 0.44, 0], [sx * 0.62, 0.58, 0], 0.012, C.woodDk);
        stick(s, [sx * 0.55, 0.44, 0], [sx * 0.48, 0.58, 0], 0.012, C.woodDk);
      });
      part(s, cyl(0.009, 0.009, 1.3, 6), C.woodDk, 0, 0.53, 0).rotation.z = Math.PI / 2;
      [-0.11, 0, 0.11].forEach(x => marshmallow(s, x, 0.53, 0, 'x', 1.1));
      part(s, cyl(0.02, 0.02, 0.1, 8), C.wood, 0.7, 0.53, 0).rotation.z = Math.PI / 2;
      return { k: 1.3 };
    },
  },
};

export function build(id, v) {
  const fn = BUILD[id]?.[v];
  if (!fn) throw new Error(`unknown camp pick decor: ${id}/${v}`);
  const solid = new THREE.Group(), glow = new THREE.Group();
  const { k = 1, flat = true, rough = 0.9 } = fn(solid, glow);
  const out = new THREE.Group();
  const body = new THREE.Mesh(bakeGroup(solid), new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: flat, roughness: rough, metalness: 0, side: THREE.DoubleSide }));
  body.castShadow = true; body.receiveShadow = true;
  out.add(body);
  if (glow.children.length) { const gm = new THREE.Mesh(bakeGroup(glow), new THREE.MeshBasicMaterial({ vertexColors: true })); gm.userData.flicker = true; out.add(gm); }
  out.traverse(o => { if (o.isMesh && o !== body) o.userData.noShadow = true; });
  out.scale.setScalar(k);
  return out;
}
