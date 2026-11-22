import * as THREE from 'three';
import { bakeGroup, part } from '../../js/dream/art.js';
import { crescentShape, starShape } from './cos-art.mjs';

export const IDS = ['ns_constellation_lamp', 'ns_telescope', 'ns_moon_sofa', 'ns_starlight_arch'];
export const VARIANTS = ['A', 'B', 'C'];

export const C = {
  navy: 0x2c3a66, navyDk: 0x202a4c, indigo: 0x46468a, lavender: 0x8f88c8, lilac: 0xb4aedc,
  moon: 0xe6d488, moonDk: 0xc9b46a, gold: 0xd9a838, goldDk: 0xa87a24, silver: 0xb9bfd0,
  wood: 0x9c6b40, woodLt: 0xc99a62, woodDk: 0x6b4a2e, stone: 0x8f887e,
  lamp: 0xf2cd72, lampBlue: 0xb8c8f0,
};

export const META = {
  ns_constellation_lamp: {
    A: { name: '별 구멍 돔 등', note: '남색 반구 갓에 별자리 점 불빛 · 나무 받침 · 꼭대기 초승달', foot: [0.6, 0.6] },
    B: { name: '별자리 액자 등', note: '남색 판에 국자 별자리 불빛 + 금선 · 나무 틀 받침', foot: [0.8, 0.35] },
    C: { name: '초승달 모빌 등', note: '받침 위 세운 초승달 + 휜 팔에 매달린 별 셋', foot: [0.6, 0.5] },
  },
  ns_telescope: {
    A: { name: '삼각대 망원경', note: '나무 삼각대 + 남색 경통·금빛 띠 · 하늘로 비스듬히', foot: [0.8, 0.8] },
    B: { name: '통통 장난감 망원경', note: '연보라 둥근 받침 + 짧고 굵은 경통 · 금별 무늬', foot: [0.65, 0.65] },
    C: { name: '별지도 탁자 망원경', note: '낮은 북 탁자 위 별지도 + 작은 놋쇠 망원경 · 두루마리', foot: [0.85, 0.85] },
  },
  ns_moon_sofa: {
    A: { name: '초승달 요람 소파', note: '누운 초승달 안에 연보라 방석 · 별 쿠션 둘', foot: [1.75, 0.75] },
    B: { name: '보름달 등받이 소파', note: '남색 낮은 소파 + 둥근 보름달 등받이 · 분화구 무늬', foot: [1.35, 0.7] },
    C: { name: '구름 위 달 소파', note: '연보라 구름 방석 + 뒤에 세운 초승달 등받이', foot: [1.35, 0.75] },
  },
  ns_starlight_arch: {
    A: { name: '초승달 아치', note: '두 기둥 위에 엎은 초승달 · 아래로 별 셋이 대롱대롱', foot: [2.1, 0.4], posts: [[-0.78, 0, 0.15], [0.78, 0, 0.15]] },
    B: { name: '별 전구 아치', note: '반원 철사에 별 전구 · 꼭대기 큰 금별 · 기둥에 연보라 리본', foot: [2.0, 0.4], posts: [[-0.9, 0, 0.15], [0.9, 0, 0.15]] },
    C: { name: '은하수 리본 아치', note: '남색·연보라 리본이 꼬여 뾰족 아치 · 반짝 점 · 꼭대기 작은 달', foot: [2.0, 0.4], posts: [[-0.85, 0, 0.15], [0.85, 0, 0.15]] },
  },
};

const TAU = Math.PI * 2;
const sph = (r, w = 12, h = 9, ...rest) => new THREE.SphereGeometry(r, w, h, ...rest);
const cyl = (a, b, h, s = 12, ...rest) => new THREE.CylinderGeometry(a, b, h, s, ...rest);
const box = (x, y, z) => new THREE.BoxGeometry(x, y, z);
const torus = (r, t, rs = 6, ts = 18, arc = TAU) => new THREE.TorusGeometry(r, t, rs, ts, arc);
const grp = (p, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); p.add(g); return g; };
const pathPoints = (fn, n) => Array.from({ length: n + 1 }, (_, i) => fn(i / n));

function extrude(shape, depth, bevel = depth * 0.3) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 8 });
  g.translate(0, 0, -depth / 2);
  return g;
}
const crescent = (r, depth, d = 0.42, r2 = 0.82) => extrude(crescentShape(THREE, r, d, r2), depth);
const star = (r, depth, pts = 5) => extrude(starShape(THREE, r, r * 0.48, pts), depth, depth * 0.25);
const tube = (pts, r, seg = 40, rad = 6) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))), seg, r, rad, false);
const stick = (p, a, b, r, col) => {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const m = part(p, cyl(r, r, A.distanceTo(B), 5), col, (A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.sub(A).normalize());
  return m;
};

function hangStar(s, g, x, yTop, z, len, r, col = C.goldDk) {
  part(s, cyl(0.006, 0.006, len, 4), col, x, yTop - len / 2, z);
  part(g, star(r, r * 0.45), C.lamp, x, yTop - len - r * 0.9, z);
}

function craters(p, r, z, pts) {
  pts.forEach(([x, y, k]) => part(p, cyl(r * k, r * k, 0.02, 10), C.moonDk, x * r, y * r, z).rotation.x = Math.PI / 2);
}

const BUILD = {
  ns_constellation_lamp: {
    A(s, g) {
      part(s, cyl(0.22, 0.25, 0.07, 16), C.woodDk, 0, 0.035, 0);
      part(s, cyl(0.035, 0.05, 0.16, 8), C.wood, 0, 0.15, 0);
      const R = 0.3, cy = 0.23;
      part(s, sph(R, 20, 10, 0, TAU, 0, Math.PI / 2), C.navy, 0, cy, 0);
      part(s, torus(R, 0.02, 5, 28), C.goldDk, 0, cy, 0).rotation.x = Math.PI / 2;
      part(g, cyl(R * 0.92, R * 0.92, 0.01, 20), C.lamp, 0, cy + 0.004, 0);
      const dots = [[0.3, 0.5], [0.9, 0.35], [1.5, 0.6], [2.1, 0.3], [2.7, 0.5], [3.3, 0.75], [3.9, 0.4], [4.5, 0.62], [5.1, 0.28], [5.7, 0.55], [0.6, 1.0], [2.4, 0.95], [4.2, 1.0]];
      dots.forEach(([a, t], i) => {
        const el = t * Math.PI / 2 * 0.9, d = new THREE.Vector3(Math.cos(el) * Math.sin(a), Math.sin(el), Math.cos(el) * Math.cos(a));
        const m = part(g, i % 3 ? sph(0.018, 6, 5) : star(0.034, 0.012), C.lamp, d.x * R * 1.01, cy + d.y * R * 1.01, d.z * R * 1.01);
        m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), d);
      });
      part(s, cyl(0.012, 0.012, 0.08, 5), C.goldDk, 0, cy + R + 0.04, 0);
      part(s, crescent(0.07, 0.025), C.moon, 0, cy + R + 0.14, 0).rotation.z = -0.4;
      return {};
    },
    B(s, g) {
      const W = 0.62, Hh = 0.48, y0 = 0.16;
      [-1, 1].forEach(sx => {
        part(s, box(0.06, 0.06, 0.32), C.woodDk, sx * (W / 2 - 0.02), 0.03, 0);
        part(s, box(0.05, y0 + Hh + 0.04, 0.05), C.wood, sx * (W / 2 + 0.02), (y0 + Hh + 0.04) / 2, 0);
      });
      part(s, box(W + 0.09, 0.05, 0.06), C.wood, 0, y0 + Hh + 0.04, 0);
      part(s, box(W + 0.09, 0.04, 0.06), C.wood, 0, y0 - 0.02, 0);
      part(s, box(W, Hh, 0.04), C.navyDk, 0, y0 + Hh / 2, 0);
      const pts = [[-0.24, 0.36], [-0.12, 0.38], [-0.02, 0.32], [0.08, 0.26], [0.10, 0.12], [0.24, 0.10], [0.25, 0.25]];
      for (let i = 0; i < pts.length - 1; i++) stick(s, [pts[i][0], y0 + pts[i][1], 0.024], [pts[i + 1][0], y0 + pts[i + 1][1], 0.024], 0.005, C.goldDk);
      stick(s, [pts[3][0], y0 + pts[3][1], 0.024], [pts[6][0], y0 + pts[6][1], 0.024], 0.005, C.goldDk);
      pts.forEach(([x, y], i) => part(g, i % 2 ? sph(0.02, 8, 6) : star(0.034, 0.014), C.lamp, x, y0 + y, 0.03));
      [[-0.2, 0.12], [-0.08, 0.06], [0.2, 0.42], [-0.26, 0.2]].forEach(([x, y]) => part(g, sph(0.009, 5, 4), C.lampBlue, x, y0 + y, 0.024));
      return {};
    },
    C(s, g) {
      part(s, cyl(0.24, 0.26, 0.06, 18), C.woodDk, 0, 0.03, 0);
      part(s, cyl(0.2, 0.2, 0.012, 18), C.navy, 0, 0.066, 0);
      const m = part(g, crescent(0.26, 0.09), C.moon, -0.06, 0.33, 0); m.rotation.z = 0.25;
      part(s, cyl(0.04, 0.05, 0.08, 8), C.goldDk, -0.06, 0.08, 0);
      const arm = [[0.12, 0.06, -0.05], [0.16, 0.5, -0.05], [0.1, 0.78, -0.03], [-0.08, 0.86, 0], [-0.26, 0.8, 0]];
      part(s, tube(arm, 0.014, 30, 5), C.goldDk);
      part(s, cyl(0.03, 0.04, 0.03, 8), C.goldDk, 0.12, 0.075, -0.05);
      hangStar(s, g, 0.12, 0.76, -0.03, 0.08, 0.045);
      hangStar(s, g, -0.08, 0.86, 0, 0.10, 0.055);
      hangStar(s, g, -0.26, 0.8, 0, 0.05, 0.04);
      part(s, star(0.03, 0.02), C.gold, 0.02, 0.35, 0.05);
      return {};
    },
  },
  ns_telescope: {
    A(s) {
      const hy = 0.9;
      [0, 1, 2].forEach(i => {
        const a = i / 3 * TAU + 0.3;
        stick(s, [Math.sin(a) * 0.36, 0, Math.cos(a) * 0.36], [0, hy, 0], 0.025, C.wood);
        part(s, cyl(0.032, 0.035, 0.03, 6), C.woodDk, Math.sin(a) * 0.36, 0.015, Math.cos(a) * 0.36);
      });
      part(s, cyl(0.06, 0.07, 0.08, 10), C.goldDk, 0, hy + 0.02, 0);
      const t = grp(s, 0, hy + 0.1, 0); t.rotation.set(0, -0.5, 0);
      const tt = grp(t); tt.rotation.x = -0.62;
      const tb = part(tt, cyl(0.075, 0.055, 0.9, 14), C.navy, 0, 0, 0.05); tb.rotation.x = Math.PI / 2;
      [-0.38, -0.05, 0.3].forEach(z => part(tt, torus(z > 0 ? 0.072 : 0.066, 0.012, 5, 16), C.gold, 0, 0, 0.05 - z));
      part(tt, cyl(0.09, 0.08, 0.1, 14), C.gold, 0, 0, 0.53).rotation.x = Math.PI / 2;
      part(tt, cyl(0.07, 0.07, 0.01, 14), C.lampBlue, 0, 0, 0.585).rotation.x = Math.PI / 2;
      part(tt, cyl(0.025, 0.03, 0.14, 8), C.goldDk, 0, 0, -0.45).rotation.x = Math.PI / 2;
      part(tt, cyl(0.02, 0.02, 0.16, 6), C.navyDk, 0, 0.09, 0.2).rotation.x = Math.PI / 2;
      return {};
    },
    B(s) {
      part(s, sph(0.28, 18, 10, 0, TAU, 0, Math.PI / 2), C.lavender, 0, 0, 0).scale.y = 0.55;
      part(s, torus(0.28, 0.03, 5, 24), C.indigo, 0, 0.02, 0).rotation.x = Math.PI / 2;
      part(s, cyl(0.06, 0.08, 0.22, 10), C.indigo, 0, 0.24, 0);
      part(s, sph(0.08, 12, 8), C.gold, 0, 0.36, 0);
      const t = grp(s, 0, 0.42, 0); t.rotation.set(-0.85, -0.5, 0, 'YXZ');
      part(t, cyl(0.16, 0.13, 0.5, 18), C.lilac, 0, 0, 0.04).rotation.x = Math.PI / 2;
      part(t, torus(0.165, 0.04, 6, 20), C.indigo, 0, 0, 0.3);
      part(t, cyl(0.15, 0.15, 0.01, 18), C.lampBlue, 0, 0, 0.29).rotation.x = Math.PI / 2;
      part(t, cyl(0.05, 0.06, 0.1, 10), C.indigo, 0, 0, -0.26).rotation.x = Math.PI / 2;
      part(t, torus(0.135, 0.02, 5, 20), C.gold, 0, 0, -0.12);
      [[0, 0.1, 0.05], [0.9, -0.08, 0.04], [-0.9, 0.16, 0.04], [2.2, 0.02, 0.035], [-2.2, -0.1, 0.035]].forEach(([a, z, r]) => {
        const rr = 0.145 - z * 0.06, m = part(t, star(r, 0.015), C.gold, Math.sin(a) * rr, Math.cos(a) * rr, z);
        m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(Math.sin(a), Math.cos(a), 0));
      });
      return {};
    },
    C(s) {
      part(s, cyl(0.38, 0.36, 0.42, 20), C.wood, 0, 0.21, 0);
      [0.08, 0.34].forEach(y => part(s, torus(0.375, 0.015, 4, 28), C.woodDk, 0, y, 0).rotation.x = Math.PI / 2);
      part(s, cyl(0.4, 0.4, 0.04, 20), C.woodDk, 0, 0.44, 0);
      part(s, cyl(0.34, 0.34, 0.012, 20), C.navy, 0, 0.466, 0);
      part(s, torus(0.3, 0.006, 4, 30), C.goldDk, 0, 0.474, 0).rotation.x = Math.PI / 2;
      [[0.15, 0.1], [-0.18, 0.05], [0.05, -0.2], [-0.08, 0.18], [0.22, -0.08], [-0.2, -0.15]].forEach(([x, z], i) => part(s, i % 2 ? sph(0.012, 5, 4) : star(0.025, 0.008), C.gold, x, 0.476, z).rotation.x = -Math.PI / 2);
      const scroll = part(s, cyl(0.035, 0.035, 0.3, 10), C.moon, 0.18, 0.505, 0.18); scroll.rotation.set(0, 0.6, Math.PI / 2);
      const base = grp(s, -0.08, 0.47, -0.06); base.scale.setScalar(1.35);
      [0, 1, 2].forEach(i => { const a = i / 3 * TAU; stick(base, [Math.sin(a) * 0.1, 0, Math.cos(a) * 0.1], [0, 0.22, 0], 0.01, C.goldDk); });
      const t = grp(base, 0, 0.24, 0); t.rotation.set(-0.7, 0.8, 0);
      part(t, cyl(0.05, 0.04, 0.46, 12), C.gold, 0, 0, 0.05).rotation.x = Math.PI / 2;
      [-0.12, 0.12].forEach(z => part(t, torus(0.05, 0.008, 4, 14), C.goldDk, 0, 0, 0.05 + z));
      part(t, cyl(0.06, 0.055, 0.06, 12), C.goldDk, 0, 0, 0.3).rotation.x = Math.PI / 2;
      part(t, cyl(0.05, 0.05, 0.008, 12), C.lampBlue, 0, 0, 0.334).rotation.x = Math.PI / 2;
      return {};
    },
  },
  ns_moon_sofa: {
    A(s) {
      const r = 0.7, D = 0.66;
      const m = part(s, crescent(r, D * 0.82, 0.36, 0.78), C.moon, 0, 0.47, 0); m.rotation.z = Math.PI / 2; m.scale.x = 0.72;
      [-1, 1].forEach(sx => part(s, cyl(0.04, 0.05, 0.08, 8), C.goldDk, sx * 0.32, 0.04, 0));
      const cu = part(s, new THREE.CapsuleGeometry(0.17, 0.5, 4, 12), C.lavender, 0, 0.37, 0.02); cu.rotation.z = Math.PI / 2; cu.scale.set(0.7, 1, 1.4);
      [[-0.3, 0.62, 0.02, 0.5, C.indigo], [0.3, 0.62, 0.0, -0.4, C.lilac]].forEach(([x, y, z, rz, col]) => {
        const p = part(s, star(0.17, 0.1), col, x, y, z); p.rotation.set(-0.35, 0, rz);
      });
      return {};
    },
    B(s) {
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => part(s, cyl(0.03, 0.04, 0.1, 8), C.goldDk, sx * 0.55, 0.05, sz * 0.24));
      part(s, box(1.3, 0.2, 0.62), C.navy, 0, 0.2, 0);
      const cu = part(s, new THREE.CapsuleGeometry(0.1, 1.06, 4, 12), C.indigo, 0, 0.35, 0.06); cu.rotation.z = Math.PI / 2; cu.scale.set(0.8, 1, 2.4);
      [-1, 1].forEach(sx => part(s, new THREE.CapsuleGeometry(0.09, 0.4, 4, 10), C.navyDk, sx * 0.6, 0.4, 0.02).rotation.x = Math.PI / 2);
      const back = grp(s, 0, 0.8, -0.24);
      part(back, cyl(0.55, 0.55, 0.14, 28), C.moon).rotation.x = Math.PI / 2;
      part(back, torus(0.55, 0.035, 6, 32), C.moonDk);
      craters(back, 0.55, 0.075, [[-0.3, 0.35, 0.16], [0.35, 0.1, 0.12], [0.05, 0.55, 0.09], [-0.45, -0.05, 0.08], [0.2, 0.62, 0.06]]);
      return {};
    },
    C(s) {
      const pf = [[0, 0.22, 0.05, 0.3], [-0.38, 0.2, 0.08, 0.26], [0.38, 0.2, 0.08, 0.26], [-0.58, 0.16, 0.12, 0.18], [0.58, 0.16, 0.12, 0.18], [-0.2, 0.2, 0.22, 0.2], [0.2, 0.2, 0.22, 0.2], [0, 0.12, 0.28, 0.16]];
      pf.forEach(([x, y, z, r], i) => { const m = part(s, sph(r, 14, 10), i % 2 ? C.lilac : C.lavender, x, y, z); m.scale.y = 0.72; });
      const m = part(s, crescent(0.66, 0.16, 0.44, 0.8), C.moon, 0, 0.74, -0.24); m.rotation.z = Math.PI / 2;
      [-0.52, 0.5].forEach((x, i) => part(s, star(0.07, 0.03), C.gold, x, 1.24 + i * 0.04, -0.24).rotation.z = i);
      return {};
    },
  },
  ns_starlight_arch: {
    A(s, g) {
      const px = 0.78, r = 1.0, ky = 0.62, cy = 1.3 + 0.65 * r * ky;
      [-1, 1].forEach(sx => {
        part(s, cyl(0.12, 0.14, 0.1, 10), C.stone, sx * px, 0.05, 0);
        part(s, cyl(0.05, 0.06, 1.28, 8), C.navy, sx * px, 0.74, 0);
        part(s, sph(0.08, 10, 8), C.gold, sx * px, 1.36, 0);
      });
      const m = part(s, crescent(r, 0.14, 0.42, 0.82), C.moon, 0, cy, 0); m.rotation.z = -Math.PI / 2; m.scale.set(ky, 1, 1);
      hangStar(s, g, -0.32, cy - 0.32, 0, 0.26, 0.07);
      hangStar(s, g, 0, cy - 0.40, 0, 0.36, 0.09);
      hangStar(s, g, 0.32, cy - 0.32, 0, 0.18, 0.06);
      return {};
    },
    B(s, g) {
      const px = 0.9, cy = 1.2;
      [-1, 1].forEach(sx => {
        part(s, cyl(0.12, 0.14, 0.1, 10), C.stone, sx * px, 0.05, 0);
        part(s, cyl(0.04, 0.05, cy, 8), C.navyDk, sx * px, cy / 2 + 0.05, 0);
        part(s, tube(pathPoints(t => [sx * px + Math.cos(t * 18) * 0.06, 0.12 + t * (cy - 0.15), Math.sin(t * 18) * 0.06], 60), 0.022, 80, 5), C.lilac);
      });
      part(s, torus(px, 0.025, 5, 32, Math.PI), C.navyDk, 0, cy + 0.05, 0);
      pathPoints(t => t, 10).forEach((t, i) => {
        const a = t * Math.PI, m = part(g, star(0.05, 0.03), i % 2 ? C.lamp : C.lampBlue, Math.cos(a) * px, cy + 0.05 + Math.sin(a) * px, 0.04);
        m.rotation.z = a;
      });
      part(s, star(0.22, 0.08), C.gold, 0, cy + px + 0.28, 0);
      part(g, star(0.1, 0.1), C.lamp, 0, cy + px + 0.28, 0.01);
      return {};
    },
    C(s, g) {
      const px = 0.85, top = 2.25;
      const path = t => { const sx = t < 0.5 ? -1 : 1, u = t < 0.5 ? t * 2 : (1 - t) * 2; return [sx * px * (1 - Math.pow(u, 3)), 0.1 + (top - 0.1) * Math.sin(u * Math.PI / 2), 0]; };
      [-1, 1].forEach(sx => {
        part(s, cyl(0.12, 0.14, 0.1, 10), C.stone, sx * px, 0.05, 0);
        part(s, cyl(0.045, 0.05, 1.0, 8), C.woodDk, sx * px, 0.55, 0);
      });
      [0, Math.PI].forEach((ph, k) => {
        const pts = pathPoints(t => { const [x, y] = path(t); const a = t * TAU * 5 + ph; return [x + Math.cos(a) * 0.07 * Math.abs(Math.cos(t * Math.PI)), y + Math.sin(a) * 0.03, Math.sin(a) * 0.07]; }, 160);
        part(s, tube(pts, 0.04, 220, 6), k ? C.lavender : C.navy);
      });
      pathPoints(t => t, 14).slice(1, -1).forEach((t, i) => {
        const [x, y] = path(t);
        part(g, sph(0.022, 6, 5), i % 3 ? C.lamp : C.lampBlue, x + (i % 2 ? 0.09 : -0.09) * Math.abs(Math.cos(t * Math.PI)), y + 0.02, i % 2 ? 0.09 : -0.09);
      });
      part(s, crescent(0.16, 0.06), C.moon, 0, top + 0.18, 0).rotation.z = -0.5;
      return {};
    },
  },
};

export function build(id, v) {
  const fn = BUILD[id]?.[v];
  if (!fn) throw new Error(`unknown night pick decor: ${id}/${v}`);
  const solid = new THREE.Group(), glow = new THREE.Group();
  const { k = 1, flat = true, rough = 0.9 } = fn(solid, glow);
  const out = new THREE.Group();
  const body = new THREE.Mesh(bakeGroup(solid), new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: flat, roughness: rough, metalness: 0 }));
  body.castShadow = true; body.receiveShadow = true;
  out.add(body);
  if (glow.children.length) { const gm = new THREE.Mesh(bakeGroup(glow), new THREE.MeshBasicMaterial({ vertexColors: true })); gm.userData.flicker = true; out.add(gm); }
  out.traverse(o => { if (o.isMesh && o !== body) o.userData.noShadow = true; });
  out.scale.setScalar(k);
  return out;
}
