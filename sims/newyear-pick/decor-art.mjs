import * as THREE from 'three';
import { bakeGroup, part } from '../../js/dream/art.js';

export const IDS = ['ny_folding_screen', 'ny_tteokguk_table', 'ny_bokjori_wall', 'ny_kite_stand'];
export const VARIANTS = ['A', 'B', 'C'];

export const C = {
  dahong: 0xe0705e, dahongDk: 0xc0564a, jjok: 0x5a78b0, jjokDk: 0x445e92,
  yeondu: 0xa8cc7a, yeonduDk: 0x86ad5c, norang: 0xeac25a, norangDk: 0xc99a3a, pink: 0xeea0a6,
  hanji: 0xe2d6bc, moon: 0xd8c47a, wood: 0xa87a4e, woodDk: 0x7a5636, woodLt: 0xc49a68,
  celadon: 0xa9c2ae, broth: 0xd7c39a, tteok: 0xdcd2c0, egg: 0xf0c850,
  straw: 0xc9a864, strawDk: 0xa88a4a, jar: 0x7a5a44, jarDk: 0x5e4434,
};

export const META = {
  ny_folding_screen: {
    A: { name: '일월오봉 병풍', note: '여섯 폭 지그재그 · 한지 위 연두 산 · 다홍 해와 달 · 쪽빛 물결', foot: [1.45, 0.4] },
    B: { name: '매화 병풍', note: '네 폭 · 나뭇가지 따라 분홍 매화 · 나무 틀', foot: [1.15, 0.35] },
    C: { name: '색동 낮은 병풍', note: '세 폭 낮은 병풍 · 아래 색동 띠 · 꼭대기 노랑 매듭', foot: [0.95, 0.3] },
  },
  ny_tteokguk_table: {
    A: { name: '둥근 소반 떡국', note: '나무 둥근 소반 · 청자 그릇 떡국 · 노랑 지단 · 놋숟가락과 젓가락', foot: [0.85, 0.85] },
    B: { name: '개다리소반 한 상', note: '네모 나무 소반 · 떡국 · 김치와 전 두 접시', foot: [0.85, 0.6] },
    C: { name: '다홍 칠소반 두 그릇', note: '다홍 둥근 상 · 노랑 테 · 떡국 두 그릇 · 가래떡 접시', foot: [0.9, 0.9] },
  },
  ny_bokjori_wall: {
    A: { name: '복조리 걸이대', note: '벽에 붙는 나무 기둥 · 엇갈린 복조리 한 쌍 · 다홍 끈과 노랑 술', foot: [0.5, 0.3] },
    B: { name: '복조리 횃대', note: '벽에 붙는 낮은 횃대 · 복조리 둘 사이 다홍 복주머니', foot: [0.8, 0.3] },
    C: { name: '장독 복조리', note: '작은 장독에 복조리 한 쌍 꽂음 · 다홍 리본', foot: [0.5, 0.5] },
  },
  ny_kite_stand: {
    A: { name: '얼레와 방패연', note: '높은 장대 끝 방패연 · 줄 따라 내려온 나무 얼레', foot: [0.9, 0.6], posts: [[0.15, 0, 0.12]] },
    B: { name: '연 세 줄', note: '두 기둥 사이 줄 · 쪽빛·다홍·연두 가오리연 셋', foot: [2.0, 0.4], posts: [[-0.9, 0, 0.12], [0.9, 0, 0.12]] },
    C: { name: '연 받침대', note: '나무 받침대에 기댄 큰 방패연 · 색동 꼬리 · 앞에 얼레', foot: [1.0, 0.7] },
  },
};

export const REC = { ny_folding_screen: 'A', ny_tteokguk_table: 'A', ny_bokjori_wall: 'B', ny_kite_stand: 'B' };

const TAU = Math.PI * 2;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const sph = (r, w = 12, h = 9, ...rest) => new THREE.SphereGeometry(r, w, h, ...rest);
const cyl = (a, b, h, s = 12, ...rest) => new THREE.CylinderGeometry(a, b, h, s, ...rest);
const box = (x, y, z) => new THREE.BoxGeometry(x, y, z);
const torus = (r, t, rs = 6, ts = 18, arc = TAU) => new THREE.TorusGeometry(r, t, rs, ts, arc);
const lathe = (pr, seg = 18) => new THREE.LatheGeometry(pr.map(([x, y]) => new THREE.Vector2(x, y)), seg);
const grp = (p, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); p.add(g); return g; };
const tube = (pts, r, seg = 30, rad = 6) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => V(...p))), seg, r, rad, false);

function rod(p, a, b, r, col, seg = 6, r2 = r) {
  const A = V(...a), B = V(...b), d = B.clone().sub(A);
  const m = part(p, cyl(r2, r, d.length(), seg), col, (A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
  m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize());
  return m;
}

function shapeGeo(pts, depth) {
  const sh = new THREE.Shape(); sh.moveTo(...pts[0]); pts.slice(1).forEach(p => sh.lineTo(...p));
  const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: false }); g.translate(0, 0, -depth / 2); return g;
}

function diamondGeo(w, h, depth) { return shapeGeo([[0, h / 2], [w / 2, 0], [0, -h / 2], [-w / 2, 0]], depth); }

function disc(p, r, col, x, y, z, t = 0.012, seg = 20) {
  const m = part(p, cyl(r, r, t, seg), col, x, y, z); m.rotation.x = Math.PI / 2; return m;
}

function panelRow(s, n, w, h, ang, paint) {
  const hinges = [V(0, 0, 0)];
  for (let i = 0; i < n; i++) { const a = i % 2 ? -ang : ang; hinges.push(hinges[i].clone().add(V(Math.cos(a) * w, 0, -Math.sin(a) * w))); }
  const cx = hinges[n].x / 2, cz = (Math.min(...hinges.map(p => p.z)) + Math.max(...hinges.map(p => p.z))) / 2;
  for (let i = 0; i < n; i++) {
    const a = i % 2 ? -ang : ang, m = hinges[i].clone().add(hinges[i + 1]).multiplyScalar(0.5);
    const g = grp(s, m.x - cx, 0, m.z - cz); g.rotation.y = a;
    const ft = 0.05;
    [-1, 1].forEach(sx => {
      part(g, box(0.03, h, 0.04), C.woodDk, sx * (w / 2 - 0.015), ft + h / 2, 0);
      part(g, box(0.05, ft, 0.07), C.woodDk, sx * (w / 2 - 0.02), ft / 2, 0);
    });
    [ft + 0.015, ft + h - 0.015].forEach(y => part(g, box(w, 0.03, 0.04), C.woodDk, 0, y, 0));
    part(g, box(w - 0.03, h - 0.03, 0.016), C.hanji, 0, ft + h / 2, 0);
    paint(g, i, w - 0.04, h - 0.04, ft + 0.02, 0.01);
  }
}

function mountain(p, x, y0, z, w, h, col) {
  part(p, shapeGeo([[-w / 2, 0], [-w * 0.34, h * 0.42], [-w * 0.16, h * 0.86], [0, h], [w * 0.16, h * 0.84], [w * 0.36, h * 0.4], [w / 2, 0]], 0.008), col, x, y0, z);
}

function blossom(p, x, y, z, r, col = C.pink) {
  for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; disc(p, r * 0.5, col, x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, z, 0.006, 10); }
  disc(p, r * 0.25, C.norang, x, y, z + 0.004, 0.006, 8);
}

function tassel(p, x, y, z, s, col = C.norang, knot = C.dahong) {
  part(p, sph(s * 0.35, 10, 8), knot, x, y, z).scale.set(1, 1, 0.6);
  part(p, cyl(s * 0.08, s * 0.08, s * 0.3, 6), knot, x, y - s * 0.4, z);
  part(p, cyl(s * 0.18, s * 0.34, s * 0.9, 10), col, x, y - s * 1.0, z);
}

function bowl(p, x, y, z, r, col = C.celadon, soup = true) {
  const g = grp(p, x, y, z);
  part(g, lathe([[0, 0], [r * 0.5, 0], [r * 0.52, r * 0.08], [r * 0.85, r * 0.4], [r, r * 0.72], [r * 0.94, r * 0.74], [0, r * 0.2]], 22), col);
  part(g, cyl(r * 0.5, r * 0.55, r * 0.1, 18), col, 0, -r * 0.03, 0);
  if (soup) {
    part(g, cyl(r * 0.9, r * 0.9, 0.01, 22), C.broth, 0, r * 0.62, 0);
    [[0.3, 0.2], [-0.35, 0.1], [0.05, -0.4], [-0.1, 0.42], [0.45, -0.2], [-0.42, -0.3]].forEach(([u, v], i) => {
      const t = part(g, sph(r * 0.2, 10, 6), C.tteok, u * r, r * 0.64, v * r); t.scale.set(1, 0.3, 0.7); t.rotation.y = i;
    });
    [[0.1, 0.05, 0.4], [-0.15, 0.15, -0.6], [0.2, -0.15, 1.2]].forEach(([u, v, a]) => part(g, box(r * 0.5, 0.008, r * 0.07), C.egg, u * r, r * 0.68, v * r).rotation.y = a);
    [[-0.2, -0.1], [0.25, 0.3], [0, 0.15]].forEach(([u, v]) => part(g, cyl(r * 0.05, r * 0.05, 0.012, 6), C.yeonduDk, u * r, r * 0.69, v * r));
  }
  return g;
}

function spoonSticks(p, x, y, z, rotY) {
  const g = grp(p, x, y, z); g.rotation.y = rotY;
  const sp = part(g, sph(0.035, 10, 6), C.norangDk, 0, 0.006, 0); sp.scale.set(1, 0.2, 0.75);
  part(g, box(0.012, 0.006, 0.16), C.norangDk, 0, 0.008, 0.1);
  [-1, 1].forEach(s => part(g, box(0.008, 0.008, 0.22), C.norangDk, 0.05 + s * 0.012, 0.006, 0.07));
}

function plate(p, x, y, z, r, col = C.celadon) {
  part(p, cyl(r, r * 0.7, r * 0.18, 18), col, x, y + r * 0.09, z);
  return y + r * 0.18;
}

function bokjori(p, x, y, z, s, rot = 0, tie = C.dahong) {
  const g = grp(p, x, y, z); g.rotation.z = rot;
  const hy = -0.14 * s, ex = 0.95, ey = 1.25;
  part(g, sph(0.15 * s, 16, 12), C.straw, 0, hy, -0.06 * s).scale.set(ex, ey, 0.42);
  const inner = part(g, cyl(0.13 * s, 0.13 * s, 0.006, 22), C.strawDk, 0, hy, 0.006 * s); inner.rotation.x = Math.PI / 2; inner.scale.set(ex, 1, ey);
  const rim = part(g, torus(0.135 * s, 0.014 * s, 5, 24), C.straw, 0, hy, 0.008 * s); rim.scale.set(ex, ey, 1);
  [-1, 1].forEach(d => [-0.045, 0.045].forEach(o => {
    const L = 0.2 * s, m = part(g, box(0.008 * s, L, 0.004), C.straw, o * s, hy, 0.012 * s); m.rotation.z = d * 0.6;
  }));
  part(g, cyl(0.022 * s, 0.03 * s, 0.24 * s, 8), C.strawDk, 0, 0.14 * s, -0.02 * s);
  part(g, torus(0.03 * s, 0.012 * s, 5, 12), tie, 0, 0.05 * s, -0.02 * s).rotation.x = Math.PI / 2;
  [-1, 1].forEach(sx => { const l = part(g, sph(0.03 * s, 8, 6), tie, sx * 0.035 * s, 0.05 * s, 0.01 * s); l.scale.set(1, 0.6, 0.4); l.rotation.z = sx * 0.5; });
  return g;
}

function kiteFace(p, w, h, top = C.dahong, depth = 0.02) {
  part(p, box(w, h, depth), C.hanji);
  const z = depth / 2 + 0.004, bw = w * 0.035;
  [[0, h / 2 - bw / 2, w, bw], [0, -h / 2 + bw / 2, w, bw], [-w / 2 + bw / 2, 0, bw, h], [w / 2 - bw / 2, 0, bw, h]].forEach(([x, y, a, b]) => part(p, box(a, b, depth + 0.006), C.jjok, x, y, 0));
  [[[-w * 0.45, h * 0.45], [w * 0.45, -h * 0.45]], [[w * 0.45, h * 0.45], [-w * 0.45, -h * 0.45]], [[0, h * 0.47], [0, -h * 0.47]], [[-w * 0.47, 0], [w * 0.47, 0]]]
    .forEach(([a, b]) => rod(p, [a[0], a[1], z], [b[0], b[1], z], 0.006 * w / 0.6, C.woodDk, 4));
  disc(p, w * 0.17, C.jjok, 0, 0, z + 0.002, 0.008);
  const t = part(p, cyl(w * 0.16, w * 0.16, 0.008, 18, 1, false, Math.PI / 2, Math.PI), top, 0, h / 2, z + 0.002); t.rotation.x = Math.PI / 2;
}

function eolle(p, x, y, z, s) {
  const g = grp(p, x, y, z);
  [-1, 1].forEach(sx => {
    part(g, torus(0.1 * s, 0.014 * s, 5, 6), C.wood, sx * 0.07 * s, 0, 0).rotation.y = Math.PI / 2;
  });
  for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; rod(g, [-0.07 * s, Math.cos(a) * 0.1 * s, Math.sin(a) * 0.1 * s], [0.07 * s, Math.cos(a) * 0.1 * s, Math.sin(a) * 0.1 * s], 0.01 * s, C.woodLt, 4); }
  part(g, cyl(0.06 * s, 0.06 * s, 0.13 * s, 12), C.hanji, 0, 0, 0).rotation.z = Math.PI / 2;
  part(g, cyl(0.012 * s, 0.012 * s, 0.34 * s, 6), C.woodDk, 0, 0, 0).rotation.z = Math.PI / 2;
  return g;
}

function gaori(p, x, y, z, s, col, tail) {
  const g = grp(p, x, y, z);
  part(g, diamondGeo(0.32 * s, 0.38 * s, 0.015), col);
  part(g, diamondGeo(0.16 * s, 0.19 * s, 0.02), C.hanji, 0, 0, 0.004);
  part(g, tube([[0, -0.19 * s, 0], [0.04 * s, -0.3 * s, 0], [-0.03 * s, -0.42 * s, 0], [0.02 * s, -0.54 * s, 0]], 0.012 * s, 16, 5), tail);
  return g;
}

const BUILD = {
  ny_folding_screen: {
    A(s) {
      const MT = [C.yeonduDk, C.yeondu, C.yeonduDk, C.yeondu, C.yeonduDk, C.yeondu];
      panelRow(s, 6, 0.26, 1.02, 0.42, (g, i, w, h, y0, z) => {
        part(g, box(w, h * 0.16, 0.006), C.jjok, 0, y0 + h * 0.08, z);
        for (let k = 0; k < 3; k++) part(g, torus(w * 0.1, 0.006, 4, 10, Math.PI), C.jjokDk, -w * 0.3 + k * w * 0.3, y0 + h * 0.16, z + 0.004);
        mountain(g, 0, y0 + h * 0.16, z + 0.002, w * 0.98, h * (i === 2 || i === 3 ? 0.46 : 0.34), MT[i]);
        if (i === 1) disc(g, w * 0.24, C.dahong, 0, y0 + h * 0.8, z + 0.004);
        if (i === 4) disc(g, w * 0.22, C.moon, 0, y0 + h * 0.8, z + 0.004);
      });
    },
    B(s) {
      panelRow(s, 4, 0.3, 0.94, 0.38, (g, i, w, h, y0, z) => {
        const pts = [[-w / 2, y0 + h * (0.35 + 0.1 * i), z], [-w * 0.1, y0 + h * (0.45 + 0.08 * i), z], [w * 0.2, y0 + h * (0.42 + 0.1 * i), z], [w / 2, y0 + h * (0.5 + 0.07 * i), z]];
        part(g, tube(pts, 0.012, 20, 5), C.woodDk);
        part(g, tube([pts[1], [w * 0.02, pts[1][1] + h * 0.18, z], [w * 0.14, pts[1][1] + h * 0.26, z]], 0.008, 12, 4), C.woodDk);
        [[pts[1][0], pts[1][1] + 0.03], [pts[2][0], pts[2][1] + 0.03], [w * 0.1, pts[1][1] + h * 0.24], [w * 0.36, pts[2][1] - 0.04], [-w * 0.32, pts[0][1] + 0.05]]
          .forEach(([x, y], k) => blossom(g, x, y, z + 0.006, k % 2 ? 0.03 : 0.04, k === 3 ? C.dahong : C.pink));
      });
    },
    C(s) {
      const SD = [C.dahong, C.norang, C.yeondu, C.jjok, C.pink];
      panelRow(s, 3, 0.32, 0.7, 0.3, (g, i, w, h, y0, z) => {
        SD.forEach((c, k) => part(g, box(w, h * 0.06, 0.006), c, 0, y0 + h * (0.05 + k * 0.06), z));
        disc(g, w * 0.14, i === 1 ? C.dahong : C.yeondu, 0, y0 + h * 0.66, z + 0.002, 0.006);
        tassel(g, 0, y0 + h - 0.01, 0.03, 0.06);
      });
    },
  },
  ny_tteokguk_table: {
    A(s) {
      const ty = 0.36;
      part(s, cyl(0.4, 0.4, 0.045, 28), C.wood, 0, ty, 0);
      part(s, torus(0.4, 0.018, 5, 32), C.woodDk, 0, ty + 0.022, 0).rotation.x = Math.PI / 2;
      for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + Math.PI / 4; rod(s, [Math.cos(a) * 0.3, ty, Math.sin(a) * 0.3], [Math.cos(a) * 0.34, 0.02, Math.sin(a) * 0.34], 0.03, C.woodDk, 8, 0.025); }
      part(s, torus(0.32, 0.012, 4, 28), C.woodDk, 0, 0.1, 0).rotation.x = Math.PI / 2;
      bowl(s, -0.04, ty + 0.03, 0.02, 0.18);
      spoonSticks(s, 0.24, ty + 0.025, 0.04, -0.2);
      plate(s, -0.2, ty + 0.025, -0.2, 0.08, C.hanji);
      part(s, cyl(0.05, 0.05, 0.02, 16), C.dahong, -0.2, ty + 0.05, -0.2);
    },
    B(s) {
      const ty = 0.36, W = 0.72, D = 0.5;
      part(s, box(W, 0.04, D), C.wood, 0, ty, 0);
      part(s, box(W + 0.03, 0.025, D + 0.03), C.woodDk, 0, ty + 0.03, 0);
      part(s, box(W - 0.02, 0.026, D - 0.02), C.wood, 0, ty + 0.034, 0);
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
        const x0 = sx * (W / 2 - 0.06), z0 = sz * (D / 2 - 0.06);
        rod(s, [x0, ty, z0], [x0 + sx * 0.04, ty * 0.55, z0 + sz * 0.02], 0.022, C.woodDk, 6);
        rod(s, [x0 + sx * 0.04, ty * 0.55, z0 + sz * 0.02], [x0 - sx * 0.01, 0.01, z0], 0.02, C.woodDk, 6);
      });
      [-1, 1].forEach(sz => part(s, box(W - 0.12, 0.08, 0.015), C.woodDk, 0, ty - 0.06, sz * (D / 2 - 0.06)));
      const y = ty + 0.047;
      bowl(s, 0, y, 0.06, 0.17);
      const p1 = plate(s, -0.24, y, -0.1, 0.075, C.hanji);
      [[0, 0], [0.025, 0.02], [-0.02, 0.025], [0.005, -0.03]].forEach(([u, v]) => part(s, sph(0.028, 8, 6), C.dahongDk, -0.24 + u, p1 + 0.012, -0.1 + v).scale.set(1, 0.6, 1));
      const p2 = plate(s, 0.24, y, -0.1, 0.075, C.hanji);
      [[0, 0, 0], [0.02, 0.012, 0.015]].forEach(([u, dy, v]) => part(s, cyl(0.045, 0.045, 0.012, 14), C.egg, 0.24 + u, p2 + 0.006 + dy, -0.1 + v));
      spoonSticks(s, 0.24, y, 0.08, 0);
    },
    C(s) {
      const ty = 0.34;
      part(s, cyl(0.44, 0.44, 0.04, 30), C.dahongDk, 0, ty, 0);
      part(s, torus(0.44, 0.02, 5, 34), C.norangDk, 0, ty + 0.02, 0).rotation.x = Math.PI / 2;
      part(s, cyl(0.42, 0.42, 0.012, 30), C.dahong, 0, ty + 0.022, 0);
      part(s, cyl(0.3, 0.36, 0.06, 30), C.dahongDk, 0, ty - 0.05, 0);
      for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; rod(s, [Math.cos(a) * 0.3, ty - 0.08, Math.sin(a) * 0.3], [Math.cos(a) * 0.36, 0.02, Math.sin(a) * 0.36], 0.024, C.dahongDk, 6); }
      part(s, torus(0.35, 0.014, 4, 30), C.norangDk, 0, 0.06, 0).rotation.x = Math.PI / 2;
      const y = ty + 0.028;
      bowl(s, -0.18, y, 0.08, 0.15);
      bowl(s, 0.18, y, 0.08, 0.15);
      const pt = plate(s, 0, y, -0.2, 0.1, C.hanji);
      [[-0.035, 0, 0], [0.035, 0, 0], [0, 0.018, 0], [0, 0, 0.035]].forEach(([u, dy, v], i) => {
        const t = part(s, cyl(0.03, 0.03, 0.016, 12), C.tteok, u, pt + 0.008 + dy, -0.2 + v); t.rotation.z = 0.3 * (i % 2 ? 1 : -1);
      });
    },
  },
  ny_bokjori_wall: {
    A(s) {
      part(s, cyl(0.17, 0.2, 0.06, 16), C.woodDk, 0, 0.03, 0);
      part(s, cyl(0.03, 0.035, 1.3, 8), C.wood, 0, 0.68, -0.06);
      part(s, box(0.24, 0.04, 0.05), C.woodDk, 0, 1.24, -0.03);
      part(s, cyl(0.016, 0.016, 0.08, 6), C.woodDk, 0, 1.2, 0.02).rotation.x = Math.PI / 2;
      bokjori(s, -0.1, 1.06, 0.06, 1.05, -0.3);
      bokjori(s, 0.1, 1.06, 0.09, 1.05, 0.3);
      part(s, tube([[0, 1.2, 0.06], [-0.04, 1.14, 0.09], [0, 1.11, 0.11], [0.04, 1.14, 0.09], [0, 1.2, 0.06]], 0.01, 16, 4), C.dahong);
      tassel(s, 0, 1.1, 0.13, 0.07);
    },
    B(s) {
      [-1, 1].forEach(sx => {
        part(s, box(0.08, 0.05, 0.22), C.woodDk, sx * 0.34, 0.025, 0);
        part(s, cyl(0.025, 0.03, 0.98, 8), C.wood, sx * 0.34, 0.52, -0.04);
        part(s, sph(0.035, 10, 8), C.woodDk, sx * 0.34, 1.02, -0.04);
      });
      part(s, cyl(0.022, 0.022, 0.74, 8), C.woodDk, 0, 0.92, -0.04).rotation.z = Math.PI / 2;
      [-0.2, 0.2].forEach((x, i) => {
        part(s, cyl(0.006, 0.006, 0.08, 4), C.dahong, x, 0.88, -0.02);
        bokjori(s, x, 0.66, -0.02, 1.0, i ? -0.12 : 0.12);
      });
      part(s, cyl(0.006, 0.006, 0.1, 4), C.dahong, 0, 0.87, -0.02);
      const p = grp(s, 0, 0.7, -0.01);
      part(p, lathe([[0, 0], [0.04, 0.01], [0.075, 0.04], [0.085, 0.08], [0.07, 0.12], [0.03, 0.14], [0.025, 0.15]], 16), C.dahong).scale.z = 0.8;
      part(p, cyl(0.05, 0.025, 0.04, 12), C.dahong, 0, 0.165, 0);
      part(p, torus(0.028, 0.008, 5, 12), C.norang, 0, 0.145, 0).rotation.x = Math.PI / 2;
      disc(p, 0.022, C.norang, 0, 0.07, 0.07, 0.006);
    },
    C(s) {
      part(s, lathe([[0, 0], [0.14, 0], [0.2, 0.08], [0.23, 0.2], [0.21, 0.32], [0.15, 0.4], [0.13, 0.42], [0.14, 0.44], [0.12, 0.45], [0.1, 0.42], [0, 0.4]], 22), C.jar);
      part(s, torus(0.135, 0.016, 5, 22), C.jarDk, 0, 0.44, 0).rotation.x = Math.PI / 2;
      part(s, torus(0.2, 0.022, 5, 26), C.dahong, 0, 0.34, 0).rotation.x = Math.PI / 2;
      const bw = grp(s, 0.1, 0.34, 0.18);
      [-1, 1].forEach(sx => { const l = part(bw, sph(0.05, 10, 8), C.dahong, sx * 0.05, 0.01, 0); l.scale.set(1, 0.6, 0.35); l.rotation.z = sx * 0.4; });
      [-1, 1].forEach(sx => part(bw, box(0.025, 0.1, 0.008), C.dahongDk, sx * 0.02, -0.06, 0).rotation.z = sx * 0.25);
      part(bw, sph(0.022, 8, 6), C.norang, 0, 0.005, 0.01);
      const b1 = bokjori(s, -0.05, 0.66, 0, 1.25, Math.PI + 0.25); b1.rotation.y = 0.3;
      const b2 = bokjori(s, 0.06, 0.66, 0.02, 1.25, Math.PI - 0.25); b2.rotation.y = -0.3;
    },
  },
  ny_kite_stand: {
    A(s) {
      part(s, cyl(0.16, 0.2, 0.08, 14), C.woodDk, 0.15, 0.04, 0);
      part(s, cyl(0.03, 0.04, 2.1, 8), C.wood, 0.15, 1.09, 0);
      const k = grp(s, 0.15, 1.95, 0.06); k.rotation.set(-0.15, 0, 0.18);
      kiteFace(k, 0.6, 0.76);
      [C.dahong, C.norang].forEach((c, i) => part(k, tube([[-0.12 + i * 0.24, -0.31, 0], [-0.1 + i * 0.24, -0.5, 0.02], [-0.14 + i * 0.24, -0.68, 0], [-0.1 + i * 0.24, -0.86, 0.02]], 0.018, 20, 5), c));
      const e = grp(s, -0.25, 0, 0.15);
      [-1, 1].forEach(sx => rod(e, [sx * 0.12, 0, 0], [0, 0.32, 0], 0.02, C.woodDk, 5));
      eolle(e, 0, 0.32, 0, 1.0);
      part(s, tube([[-0.25, 0.42, 0.15], [-0.2, 0.9, 0.12], [-0.05, 1.5, 0.1], [0.12, 1.78, 0.08]], 0.005, 30, 4), C.hanji);
    },
    B(s) {
      [-1, 1].forEach(sx => {
        part(s, cyl(0.12, 0.15, 0.08, 12), C.woodDk, sx * 0.9, 0.04, 0);
        part(s, cyl(0.03, 0.04, 1.7, 8), C.wood, sx * 0.9, 0.89, 0);
        part(s, sph(0.05, 10, 8), C.dahong, sx * 0.9, 1.76, 0);
      });
      const sag = t => [-0.9 + t * 1.8, 1.68 - Math.sin(t * Math.PI) * 0.18, 0];
      part(s, tube(Array.from({ length: 11 }, (_, i) => sag(i / 10)), 0.008, 30, 4), C.woodDk);
      [[0.22, C.jjok, C.norang], [0.5, C.dahong, C.jjok], [0.78, C.yeonduDk, C.dahong]].forEach(([t, col, tail], i) => {
        const [x, y] = sag(t), g = gaori(s, x, y - 0.3, 0.02, 1.5, col, tail);
        g.rotation.z = (i - 1) * 0.12;
        part(s, cyl(0.004, 0.004, 0.06, 4), C.woodDk, x, y - 0.03, 0.01);
      });
    },
    C(s) {
      [-1, 1].forEach(sx => rod(s, [sx * 0.38, 0, 0.18], [sx * 0.08, 1.25, -0.04], 0.03, C.wood, 6));
      rod(s, [0, 0, -0.42], [0, 1.22, -0.06], 0.028, C.woodDk, 6);
      part(s, box(0.8, 0.04, 0.06), C.woodDk, 0, 0.34, 0.12);
      const k = grp(s, 0, 0.88, 0.1); k.rotation.x = -0.12;
      kiteFace(k, 0.78, 0.96, C.dahong, 0.025);
      [C.dahong, C.norang, C.yeondu, C.jjok, C.pink].forEach((c, i) => part(k, box(0.7, 0.03, 0.006), c, 0, -0.44 + i * 0.03, 0.016));
      [-1, 1].forEach((sx, i) => part(s, tube([[sx * 0.3, 0.42, 0.18], [sx * 0.36, 0.26, 0.26], [sx * 0.3, 0.12, 0.34], [sx * 0.38, 0.02, 0.42]], 0.02, 16, 5), i ? C.norang : C.dahong));
      eolle(s, 0.32, 0.12, 0.38, 0.9).rotation.y = 0.5;
    },
  },
};

export function build(id, v) {
  const fn = BUILD[id]?.[v];
  if (!fn) throw new Error(`unknown new year decor: ${id}/${v}`);
  const solid = new THREE.Group();
  fn(solid);
  const out = new THREE.Group();
  const body = new THREE.Mesh(bakeGroup(solid), new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9, metalness: 0 }));
  body.castShadow = true; body.receiveShadow = true;
  out.add(body);
  return out;
}
