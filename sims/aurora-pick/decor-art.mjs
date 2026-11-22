import * as THREE from 'three';
import { bakeGroup, part } from '../../js/dream/art.js';

export const IDS = ['au_igloo_lamp', 'au_ice_chair', 'au_polar_bear_plush', 'au_aurora_window'];
export const VARIANTS = ['A', 'B', 'C'];
export const REC = { au_igloo_lamp: 'A', au_ice_chair: 'C', au_polar_bear_plush: 'A', au_aurora_window: 'A' };

export const C = {
  navy: 0x26335e, navyDk: 0x1a2446,
  mint: 0x5cc4ac, mintDk: 0x3a9886,
  violet: 0x8c70cc, pink: 0xd47cac,
  ice: 0xa6d2e4, iceDk: 0x7cacc4, iceLt: 0xbcdcea,
  fur: 0xccdbe6, furDk: 0xaabccc,
  wood: 0x8a6242, woodDk: 0x5e402a, silver: 0xa9b3c2, ink: 0x2a2a36,
  gWarm: 0xf2cd72, gMint: 0x7ee6c6, gViolet: 0xb49cf0, gPink: 0xf0a2d0,
};

export const META = {
  au_igloo_lamp: {
    A: { name: '얼음 벽돌 이글루 등', note: '얼음 벽돌 줄눈 돔 · 아치 입구와 양옆 둥근 창이 따뜻하게 빛남', foot: [1.0, 1.0] },
    B: { name: '오로라 줄눈 돔 등', note: '남색 받침 위 얼음 돔 · 벽돌 줄눈이 민트·보라로 빛남', foot: [0.75, 0.75] },
    C: { name: '눈 언덕 이글루와 오로라 아치', note: '눈 언덕 위 작은 이글루 · 둥근 창 빛 · 뒤로 오로라 리본 아치', foot: [1.15, 0.8] },
  },
  au_ice_chair: {
    A: { name: '얼음 덩어리 의자', note: '각진 얼음 덩이를 쌓은 등받이 · 흰 털 깔개', foot: [0.65, 0.6] },
    B: { name: '둥근 얼음 안락의자', note: '통째로 깎은 둥근 얼음 의자 · 남색 방석 민트 테두리 · 털 쿠션', foot: [0.7, 0.65] },
    C: { name: '눈송이 등받이 의자', note: '고드름 다리 넷 · 눈송이 모양 등받이 · 분홍·보라 방석', foot: [0.55, 0.55] },
  },
  au_polar_bear_plush: {
    A: { name: '앉은 북극곰 인형', note: '앉은 흰 곰 · 남색 목도리 민트 줄 · 둥근 귀', foot: [0.6, 0.55] },
    B: { name: '엎드려 자는 북극곰', note: '납작 엎드린 곰 · 보라 담요 · 감은 눈', foot: [0.65, 1.05] },
    C: { name: '얼음 위 털모자 곰', note: '얼음 판 위에 선 곰 · 민트 털모자 분홍 방울', foot: [0.6, 0.6] },
  },
  au_aurora_window: {
    A: { name: '아치 오로라 창', note: '남색 나무 아치 창틀 · 네 칸 유리 속 오로라 리본과 별 · 창턱', foot: [0.9, 0.25] },
    B: { name: '둥근 얼음 창', note: '네모 얼음 벽판에 박힌 둥근 창 · 눈송이 창살 · 오로라 빛 유리', foot: [1.0, 0.25] },
    C: { name: '덧창 열린 겨울 창', note: '네모 창 · 하늘색 덧창 양쪽 · 창턱에 작은 눈사람과 초', foot: [1.1, 0.3] },
  },
};

const TAU = Math.PI * 2;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const sph = (r, w = 24, h = 18, ...rest) => new THREE.SphereGeometry(r, w, h, ...rest);
const cyl = (a, b, h, s = 24, ...rest) => new THREE.CylinderGeometry(a, b, h, s, ...rest);
const box = (x, y, z) => new THREE.BoxGeometry(x, y, z);
const torus = (r, t, rs = 8, ts = 28, arc = TAU) => new THREE.TorusGeometry(r, t, rs, ts, arc);
const lathe = (pr, seg = 28, a0 = 0, al = TAU) => new THREE.LatheGeometry(pr.map(([x, y]) => new THREE.Vector2(x, y)), seg, a0, al);
const grp = (p, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); p.add(g); return g; };
const tube = (pts, r, seg = 30, rad = 8) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => V(...p))), seg, r, rad, false);

function rod(p, a, b, r, col, seg = 12) {
  const A = V(...a), B = V(...b), d = B.clone().sub(A);
  const m = part(p, cyl(r, r, d.length(), seg), col, (A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
  m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize());
  return m;
}

function roundSlab(p, w, d, h, r, col, y) {
  const sh = new THREE.Shape(), x0 = -w / 2, z0 = -d / 2;
  sh.moveTo(x0 + r, z0); sh.lineTo(x0 + w - r, z0); sh.quadraticCurveTo(x0 + w, z0, x0 + w, z0 + r);
  sh.lineTo(x0 + w, z0 + d - r); sh.quadraticCurveTo(x0 + w, z0 + d, x0 + w - r, z0 + d);
  sh.lineTo(x0 + r, z0 + d); sh.quadraticCurveTo(x0, z0 + d, x0, z0 + d - r);
  sh.lineTo(x0, z0 + r); sh.quadraticCurveTo(x0, z0, x0 + r, z0);
  const bev = Math.min(h * 0.45, r * 0.8);
  const geo = new THREE.ExtrudeGeometry(sh, { depth: Math.max(0.001, h - bev * 2), bevelEnabled: true, bevelSize: bev, bevelThickness: bev, bevelSegments: 4, curveSegments: 12 });
  geo.rotateX(Math.PI / 2); geo.translate(0, h - bev, 0);
  return part(p, geo, col, 0, y, 0);
}

function dome(p, R, col, x = 0, y = 0, z = 0) {
  return part(p, sph(R, 32, 16, 0, TAU, 0, Math.PI / 2), col, x, y, z);
}

function seams(p, R, rows, col, r = 0.008, x = 0, y = 0, z = 0) {
  for (let i = 1; i <= rows; i++) {
    const a = i / (rows + 1) * Math.PI / 2;
    part(p, torus(R * Math.cos(a) + r * 0.3, r, 6, 40), col, x, y + R * Math.sin(a), z).rotation.x = Math.PI / 2;
  }
  for (let i = 0; i <= rows; i++) {
    const a0 = i / (rows + 1) * Math.PI / 2, a1 = (i + 1) / (rows + 1) * Math.PI / 2, n = Math.max(3, Math.round(10 * Math.cos(a0)));
    for (let j = 0; j < n; j++) {
      const b = (j + (i % 2) * 0.5) / n * TAU, pts = [a0, (a0 + a1) / 2, a1].map(a => [x + Math.sin(b) * R * Math.cos(a) * 1.004, y + R * Math.sin(a), z + Math.cos(b) * R * Math.cos(a) * 1.004]);
      part(p, tube(pts, r, 4, 4), col);
    }
  }
}

function archShape(w, hgt) {
  const sh = new THREE.Shape();
  sh.moveTo(-w / 2, 0); sh.lineTo(w / 2, 0); sh.lineTo(w / 2, hgt - w / 2); sh.absarc(0, hgt - w / 2, w / 2, 0, Math.PI, false); sh.closePath();
  return sh;
}

function doorway(p, g, R, w, hgt, col, glowCol, y0) {
  const depth = R * 0.5, z0 = R * 0.6;
  part(p, new THREE.ExtrudeGeometry(archShape(w + 0.06, hgt + 0.03), { depth, bevelEnabled: false, curveSegments: 16 }), col, 0, y0, z0);
  part(p, torus(w / 2 + 0.03, 0.012, 6, 20, Math.PI), C.iceDk, 0, y0 + hgt - w / 2, z0 + depth);
  part(g, new THREE.ShapeGeometry(archShape(w, hgt), 16), glowCol, 0, y0, z0 + depth + 0.002);
}

function ribbonPanel(g, pts, w, cols, z, parts = 6, sub = 6) {
  const curve = new THREE.CatmullRomCurve3(pts.map(p => V(...p)));
  for (let k = 0; k < parts; k++) {
    const pos = [], idx = [];
    for (let i = 0; i <= sub; i++) {
      const t = (k + i / sub) / parts, P = curve.getPointAt(t), T = curve.getTangentAt(t), hw = w * (0.35 + 0.65 * Math.sin(Math.PI * t)) / 2;
      pos.push(P.x + T.y * hw, P.y - T.x * hw, z, P.x - T.y * hw, P.y + T.x * hw, z);
      if (i) { const q = i * 2; idx.push(q - 2, q, q - 1, q - 1, q, q + 1); }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx); geo.computeVertexNormals();
    part(g, geo, new THREE.Color(cols[0]).lerp(new THREE.Color(cols[1]), (k + 0.5) / parts).getHex());
  }
}

function star(g, x, y, z, s, col) {
  [0, Math.PI / 4].forEach(r => part(g, box(s, s, 0.006), col, x, y, z).rotation.z = r);
}

function bear(p, s) {
  const head = grp(p, 0, 0, 0);
  part(head, sph(0.13 * s, 20, 16), C.fur).scale.set(1, 0.92, 0.95);
  [-1, 1].forEach(sx => {
    part(head, sph(0.04 * s, 12, 10), C.fur, sx * 0.09 * s, 0.09 * s, -0.01 * s);
    part(head, sph(0.022 * s, 10, 8), C.furDk, sx * 0.09 * s, 0.09 * s, 0.015 * s);
  });
  part(head, sph(0.06 * s, 14, 10), C.furDk, 0, -0.03 * s, 0.1 * s).scale.set(1, 0.75, 0.8);
  part(head, sph(0.02 * s, 10, 8), C.ink, 0, -0.015 * s, 0.15 * s);
  return head;
}

function eyes(head, s, closed = false) {
  [-1, 1].forEach(sx => {
    const e = part(head, closed ? torus(0.018 * s, 0.005 * s, 4, 10, Math.PI) : sph(0.017 * s, 10, 8), C.ink, sx * 0.05 * s, 0.03 * s, 0.115 * s);
    if (closed) e.rotation.z = Math.PI;
  });
}

function archWindow(s, g, w, hh, d, y0) {
  const outline = (ww, b) => {
    const sh = new THREE.Shape();
    sh.moveTo(-ww / 2, b); sh.lineTo(ww / 2, b); sh.lineTo(ww / 2, hh - w / 2); sh.absarc(0, hh - w / 2, ww / 2, 0, Math.PI, false); sh.closePath();
    return sh;
  };
  const iw = w - 0.12, frame = outline(w, 0);
  frame.holes.push(outline(iw, 0.06));
  part(s, new THREE.ExtrudeGeometry(frame, { depth: d, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, bevelSegments: 2, curveSegments: 24 }), C.navy, 0, y0, -d / 2);
  part(s, new THREE.ShapeGeometry(outline(iw, 0.06), 24), C.navyDk, 0, y0, -0.012);
  return iw;
}

const BUILD = {
  au_igloo_lamp: {
    A(s, g) {
      const R = 0.26, y0 = 0.03;
      part(s, cyl(R + 0.03, R + 0.04, 0.03, 32), C.iceDk, 0, 0.015, 0);
      dome(s, R, C.iceLt, 0, y0, 0);
      seams(s, R, 3, C.iceDk, 0.007, 0, y0, 0);
      doorway(s, g, R, 0.16, 0.18, C.iceLt, C.gWarm, y0);
      part(s, sph(0.03, 10, 8), C.iceDk, 0, y0 + R + 0.01, 0);
      [-1, 1].forEach(sx => {
        const w = grp(s, sx * Math.sin(1.1) * R * 0.86, y0 + R * 0.5, Math.cos(1.1) * R * 0.86); w.rotation.y = sx * 1.1;
        part(w, torus(0.035, 0.009, 6, 18), C.iceDk);
        const gw = grp(g, w.position.x, w.position.y, w.position.z); gw.rotation.y = sx * 1.1;
        part(gw, cyl(0.032, 0.032, 0.01, 18), C.gWarm).rotation.x = Math.PI / 2;
      });
      return { k: 1.7 };
    },
    B(s, g) {
      const R = 0.2, y0 = 0.1;
      part(s, cyl(0.2, 0.22, 0.1, 32), C.navy, 0, 0.05, 0);
      part(s, torus(0.21, 0.012, 6, 36), C.silver, 0, 0.1, 0).rotation.x = Math.PI / 2;
      dome(s, R, C.ice, 0, y0, 0);
      seams(g, R, 3, C.gMint, 0.008, 0, y0, 0);
      part(g, sph(0.03, 12, 10), C.gViolet, 0, y0 + R + 0.015, 0);
      return { k: 1.7 };
    },
    C(s, g) {
      part(s, sph(0.32, 32, 12, 0, TAU, 0, Math.PI / 2), C.fur, 0, 0, 0).scale.set(1, 0.3, 0.75);
      const R = 0.17, y0 = 0.07;
      dome(s, R, C.iceLt, 0, y0, 0);
      seams(s, R, 2, C.iceDk, 0.006, 0, y0, 0);
      part(s, torus(0.04, 0.01, 6, 20), C.iceDk, 0, y0 + 0.09, R * 0.85);
      part(g, cyl(0.037, 0.037, 0.01, 20), C.gWarm, 0, y0 + 0.09, R * 0.86).rotation.x = Math.PI / 2;
      [[0.27, C.gMint, 0.016, -0.13], [0.31, C.gViolet, 0.014, -0.16], [0.35, C.gPink, 0.012, -0.19]].forEach(([r, col, w, z]) =>
        part(g, tube([[-r, 0.05, z], [-r * 0.8, r * 0.75, z], [0, r * 1.05, z], [r * 0.8, r * 0.75, z], [r, 0.05, z]], w, 40, 8), col));
      return { k: 1.6 };
    },
  },
  au_ice_chair: {
    A(s) {
      const blk = (w, h, d, x, y, z, r = 0, c = C.ice) => { const m = part(s, box(w, h, d), c, x, y, z); m.rotation.y = r; return m; };
      blk(0.3, 0.22, 0.3, -0.15, 0.11, 0.06, 0.05);
      blk(0.3, 0.22, 0.3, 0.15, 0.11, 0.06, -0.04, C.iceLt);
      blk(0.3, 0.2, 0.3, -0.15, 0.31, 0.04, -0.03, C.iceLt);
      blk(0.3, 0.2, 0.3, 0.15, 0.31, 0.04, 0.06);
      blk(0.24, 0.32, 0.12, -0.16, 0.57, -0.06, 0.08);
      blk(0.24, 0.36, 0.12, 0.14, 0.59, -0.06, -0.06, C.iceLt);
      blk(0.18, 0.18, 0.12, 0.0, 0.83, -0.06, 0.4);
      roundSlab(s, 0.54, 0.3, 0.06, 0.06, C.fur, 0.41).position.z = 0.08;
      for (let i = 0; i < 7; i++) part(s, sph(0.035, 8, 6), C.furDk, -0.24 + i * 0.08, 0.44, 0.28);
      return { flat: true };
    },
    B(s) {
      part(s, cyl(0.34, 0.37, 0.4, 40), C.ice, 0, 0.2, 0);
      part(s, torus(0.345, 0.022, 6, 40), C.iceLt, 0, 0.4, 0).rotation.x = Math.PI / 2;
      const pr = [[0.38, 0], [0.4, 0.18], [0.38, 0.34], [0.33, 0.42], [0.27, 0.4], [0.29, 0.3], [0.3, 0.16], [0.3, 0]];
      part(s, lathe(pr, 40, Math.PI * 0.36, Math.PI * 1.28), C.ice, 0, 0.38, 0);
      part(s, cyl(0.31, 0.31, 0.09, 40), C.navy, 0, 0.445, 0.02);
      part(s, torus(0.31, 0.016, 6, 40), C.mint, 0, 0.49, 0.02).rotation.x = Math.PI / 2;
      const pil = part(s, sph(0.15, 18, 12), C.fur, 0, 0.62, -0.17); pil.scale.set(1.25, 0.85, 0.45); pil.rotation.x = -0.25;
      [-1, 1].forEach(sx => part(s, new THREE.OctahedronGeometry(0.05, 0), C.iceLt, sx * 0.3, 0.84, -0.12).scale.set(0.5, 1.4, 0.5));
      return {};
    },
    C(s) {
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => part(s, cyl(0.035, 0.012, 0.38, 6), C.iceDk, sx * 0.19, 0.19, sz * 0.17).rotation.x = Math.PI);
      roundSlab(s, 0.5, 0.46, 0.05, 0.05, C.ice, 0.38);
      roundSlab(s, 0.42, 0.38, 0.07, 0.06, C.pink, 0.43);
      const back = grp(s, 0, 0.78, -0.2); back.rotation.x = -0.1;
      for (let i = 0; i < 3; i++) {
        const a = grp(back); a.rotation.z = i * Math.PI / 3;
        part(a, box(0.56, 0.05, 0.04), C.iceLt);
        [-1, 1].forEach(sd => [-1, 1].forEach(e => part(a, box(0.12, 0.035, 0.035), C.iceLt, sd * 0.19, e * 0.04, 0).rotation.z = e * sd * 0.8));
      }
      part(back, sph(0.06, 14, 10), C.ice);
      rod(s, [-0.12, 0.41, -0.19], [-0.08, 0.6, -0.2], 0.02, C.iceDk);
      rod(s, [0.12, 0.41, -0.19], [0.08, 0.6, -0.2], 0.02, C.iceDk);
      part(s, sph(0.11, 16, 12), C.violet, 0.1, 0.52, -0.08).scale.set(1.2, 0.8, 0.5);
      return {};
    },
  },
  au_polar_bear_plush: {
    A(s) {
      part(s, sph(0.19, 24, 18), C.fur, 0, 0.19, 0).scale.set(1, 1.05, 0.95);
      part(s, sph(0.12, 18, 14), C.iceLt, 0, 0.17, 0.1).scale.set(1, 1.1, 0.6);
      [-1, 1].forEach(sx => {
        part(s, sph(0.07, 14, 10), C.fur, sx * 0.1, 0.06, 0.14).scale.set(1, 0.8, 1.3);
        part(s, sph(0.04, 10, 8), C.furDk, sx * 0.1, 0.06, 0.22).scale.set(1, 1, 0.4);
        part(s, sph(0.065, 14, 10), C.fur, sx * 0.17, 0.24, 0.05).scale.set(0.8, 1.3, 0.8);
      });
      eyes(bear(grp(s, 0, 0.47, 0.02), 1.1), 1.1);
      part(s, torus(0.12, 0.035, 8, 28), C.navy, 0, 0.35, 0.01).rotation.x = Math.PI / 2;
      part(s, torus(0.12, 0.012, 6, 28), C.mint, 0, 0.35, 0.01).rotation.x = Math.PI / 2;
      part(s, box(0.06, 0.15, 0.03), C.navy, 0.06, 0.27, 0.13).rotation.z = 0.2;
      part(s, box(0.065, 0.02, 0.035), C.mint, 0.05, 0.22, 0.134).rotation.z = 0.2;
      return { k: 1.3 };
    },
    B(s) {
      part(s, sph(0.22, 24, 18), C.fur, 0, 0.13, -0.04).scale.set(1, 0.6, 1.25);
      [-1, 1].forEach(sx => {
        part(s, sph(0.06, 12, 10), C.fur, sx * 0.13, 0.05, 0.22).scale.set(1, 0.6, 1.5);
        part(s, sph(0.06, 12, 10), C.fur, sx * 0.14, 0.05, -0.27).scale.set(1, 0.6, 1.3);
      });
      const h = bear(grp(s, 0, 0.15, 0.27), 1.05); h.rotation.x = 0.25; eyes(h, 1.05, true);
      const bl = grp(s, 0, 0.215, -0.1); bl.rotation.x = -0.05;
      part(bl, box(0.42, 0.025, 0.3), C.violet);
      [-1, 1].forEach(sx => part(bl, box(0.025, 0.1, 0.3), C.violet, sx * 0.21, -0.05, 0).rotation.z = -sx * 0.25);
      [-0.08, 0.02, 0.12].forEach(z => part(bl, box(0.43, 0.028, 0.012), C.pink, 0, 0, z));
      part(s, sph(0.045, 10, 8), C.fur, 0, 0.18, -0.33);
      return { k: 1.3 };
    },
    C(s) {
      roundSlab(s, 0.42, 0.38, 0.06, 0.05, C.ice, 0);
      part(s, sph(0.15, 22, 16), C.fur, 0, 0.27, 0).scale.set(1, 1.2, 0.9);
      [-1, 1].forEach(sx => {
        part(s, cyl(0.055, 0.06, 0.14, 14), C.fur, sx * 0.07, 0.12, 0);
        part(s, sph(0.05, 12, 10), C.fur, sx * 0.17, 0.33, 0.03).scale.set(0.8, 1.4, 0.8);
      });
      const hg = grp(s, 0, 0.5, 0.01); eyes(bear(hg, 1.0), 1.0);
      part(hg, sph(0.135, 24, 12, 0, TAU, 0, Math.PI / 2), C.mint, 0, 0.03, -0.005);
      part(hg, torus(0.13, 0.025, 8, 32), C.mintDk, 0, 0.035, -0.005).rotation.x = Math.PI / 2;
      part(hg, sph(0.05, 12, 10), C.pink, 0, 0.17, -0.005);
      return { k: 1.3 };
    },
  },
  au_aurora_window: {
    A(s, g) {
      const w = 0.7, hh = 0.95, y0 = 0.08, iw = archWindow(s, g, w, hh, 0.1, y0);
      ribbonPanel(g, [[-0.27, y0 + 0.35, 0], [-0.1, y0 + 0.55, 0], [0.08, y0 + 0.45, 0], [0.27, y0 + 0.72, 0]], 0.13, [C.gMint, C.gViolet], -0.004);
      ribbonPanel(g, [[-0.27, y0 + 0.6, 0], [-0.08, y0 + 0.75, 0], [0.1, y0 + 0.7, 0], [0.22, y0 + 0.88, 0]], 0.09, [C.gViolet, C.gPink], -0.003);
      [[-0.18, 0.86], [0.12, 0.92], [0.2, 0.3], [-0.2, 0.22]].forEach(([x, y]) => star(g, x, y0 + y, -0.002, 0.025, C.gWarm));
      part(s, box(0.025, hh - 0.1, 0.04), C.navy, 0, y0 + hh / 2 - 0.02, 0);
      part(s, box(iw, 0.025, 0.04), C.navy, 0, y0 + 0.45, 0);
      part(s, box(w + 0.14, 0.04, 0.2), C.wood, 0, y0 + 0.02, 0.04);
      part(s, box(w + 0.06, 0.08, 0.14), C.woodDk, 0, 0.04, 0);
      return {};
    },
    B(s, g) {
      const R = 0.36, cy = 0.5;
      part(s, torus(R, 0.055, 10, 48), C.iceLt, 0, cy, 0);
      for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; part(s, new THREE.OctahedronGeometry(0.035, 0), C.ice, Math.cos(a) * (R + 0.05), cy + Math.sin(a) * (R + 0.05), 0).scale.set(1, 1.6, 1); }
      part(s, cyl(R, R, 0.01, 40), C.navyDk, 0, cy, -0.02).rotation.x = Math.PI / 2;
      ribbonPanel(g, [[-0.3, cy - 0.05, 0], [-0.12, cy + 0.12, 0], [0.08, cy, 0], [0.28, cy + 0.15, 0]], 0.13, [C.gMint, C.gViolet], -0.013);
      ribbonPanel(g, [[-0.26, cy + 0.12, 0], [-0.05, cy + 0.25, 0], [0.12, cy + 0.2, 0], [0.24, cy + 0.27, 0]], 0.09, [C.gViolet, C.gPink], -0.012);
      [[-0.15, -0.2], [0.18, -0.18], [0.02, 0.3], [-0.2, 0.2]].forEach(([x, y]) => star(g, x, cy + y, -0.011, 0.022, C.gWarm));
      for (let i = 0; i < 3; i++) {
        const a = grp(s, 0, cy, 0); a.rotation.z = i * Math.PI / 3 + Math.PI / 2;
        part(a, box(R * 2, 0.025, 0.03), C.iceLt);
        [-1, 1].forEach(sd => [-1, 1].forEach(e => part(a, box(0.08, 0.02, 0.025), C.iceLt, sd * R * 0.55, e * 0.025, 0).rotation.z = e * sd * 0.8));
      }
      part(s, sph(0.035, 12, 10), C.iceLt, 0, cy, 0);
      part(s, box(0.92, 0.92, 0.08), C.iceDk, 0, cy, -0.07);
      [[-0.47, 0.42], [0.47, 0.42], [-0.47, -0.42], [0.47, -0.42]].forEach(([x, y]) => part(s, box(0.1, 0.1, 0.12), C.ice, x, cy + y, -0.05));
      part(s, box(1.0, 0.04, 0.2), C.ice, 0, cy - 0.48, 0.0);
      return {};
    },
    C(s, g) {
      const w = 0.56, hh = 0.72, y0 = 0.2, fw = 0.05;
      part(s, box(w, hh, 0.01), C.navyDk, 0, y0 + hh / 2, -0.02);
      ribbonPanel(g, [[-0.25, y0 + 0.3, 0], [-0.08, y0 + 0.48, 0], [0.1, y0 + 0.36, 0], [0.25, y0 + 0.56, 0]], 0.13, [C.gMint, C.gViolet], -0.013);
      ribbonPanel(g, [[-0.25, y0 + 0.5, 0], [-0.05, y0 + 0.62, 0], [0.12, y0 + 0.58, 0], [0.25, y0 + 0.66, 0]], 0.09, [C.gViolet, C.gPink], -0.012);
      [[-0.18, 0.62], [0.15, 0.2], [-0.1, 0.15], [0.2, 0.66]].forEach(([x, y]) => star(g, x, y0 + y, -0.011, 0.022, C.gWarm));
      [y0 + fw / 2, y0 + hh - fw / 2].forEach(y => part(s, box(w + fw, fw, 0.08), C.fur, 0, y, 0));
      [-1, 1].forEach(sx => part(s, box(fw, hh, 0.08), C.fur, sx * w / 2, y0 + hh / 2, 0));
      part(s, box(0.03, hh, 0.05), C.fur, 0, y0 + hh / 2, 0);
      part(s, box(w, 0.03, 0.05), C.fur, 0, y0 + hh / 2, 0);
      [-1, 1].forEach(sx => {
        const sh = grp(s, sx * (w / 2 + 0.02), y0 + hh / 2, 0.02); sh.rotation.y = sx * 0.5;
        part(sh, box(w / 2, hh, 0.03), C.ice, sx * w / 4, 0, 0);
        [-0.22, 0, 0.22].forEach(y => part(sh, box(w / 2 - 0.06, 0.02, 0.035), C.iceDk, sx * w / 4, y, 0.002));
      });
      part(s, box(w + 0.16, 0.04, 0.22), C.wood, 0, y0 - 0.02, 0.06);
      part(s, box(0.1, y0 - 0.04, 0.1), C.woodDk, 0, (y0 - 0.04) / 2, 0.02);
      roundSlab(s, 0.4, 0.26, 0.04, 0.05, C.woodDk, 0);
      part(s, sph(0.045, 14, 10), C.fur, -0.15, y0 + 0.04, 0.08);
      part(s, sph(0.032, 12, 10), C.fur, -0.15, y0 + 0.105, 0.08);
      part(s, cyl(0.022, 0.022, 0.07, 12), C.iceLt, 0.16, y0 + 0.035, 0.08);
      part(g, sph(0.014, 8, 6), C.gWarm, 0.16, y0 + 0.085, 0.08).scale.set(1, 1.6, 1);
      return {};
    },
  },
};

export function build(id, v) {
  const fn = BUILD[id]?.[v];
  if (!fn) throw new Error(`unknown aurora pick decor: ${id}/${v}`);
  const solid = new THREE.Group(), glow = new THREE.Group();
  const { k = 1, flat = false, rough = 0.9 } = fn(solid, glow) || {};
  const out = new THREE.Group();
  const body = new THREE.Mesh(bakeGroup(solid), new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: flat, roughness: rough, metalness: 0, side: THREE.DoubleSide }));
  body.castShadow = true; body.receiveShadow = true;
  out.add(body);
  if (glow.children.length) {
    const m = new THREE.Mesh(bakeGroup(glow), new THREE.MeshBasicMaterial({ vertexColors: true }));
    m.userData.noShadow = true;
    out.add(m);
  }
  out.scale.setScalar(k);
  return out;
}
