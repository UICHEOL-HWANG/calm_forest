import * as THREE from 'three';
import { bakeGroup, part } from '../../js/dream/art.js';

export const IDS = ['wp_hearth', 'wp_fur_rug', 'wp_cocoa_table', 'wp_snowman'];
export const VARIANTS = ['A', 'B', 'C'];

export const C = {
  cream: 0xe3d4b8, creamDk: 0xcfbd9c, berry: 0xb5363f, berryDk: 0x8e2a33, green: 0x2f6b4f, greenDk: 0x24503c,
  mustard: 0xd9a63a, wood: 0x9c6b40, woodLt: 0xc99a62, woodDk: 0x6b4a2e, bark: 0x5e4129, coal: 0x2a2624,
  stone: 0x8f887e, stoneLt: 0xa39b8f, snow: 0xcdd8e2, snowDk: 0xb7c4d0, carrot: 0xe0782f, cocoa: 0x5a3422,
  fire: 0xff8a33, fireMid: 0xffb04a, fireCore: 0xffd27a, iron: 0x3b3a3a, tin: 0x7d8b99, pink: 0xe8b8bc,
};

export const META = {
  wp_hearth: {
    A: { name: '무쇠 난로', note: '둥근 녹색 법랑 난로 + 연통 + 주전자', foot: [0.85, 0.85] },
    B: { name: '크림 벽난로', note: '아치 화구 + 선반 위 솔가지 + 양말 두 짝', foot: [1.2, 0.6] },
    C: { name: '흙 화덕', note: '둥근 진흙 돔 + 작은 굴뚝 + 옆 장작더미', foot: [1.5, 1.3] },
  },
  wp_fur_rug: {
    A: { name: '양가죽 러그', note: '양 모양 둥근 윤곽 + 몽글 털뭉치', foot: null },
    B: { name: '동그란 털 러그', note: '가장자리 털 방울 + 동심원 + 별', foot: null },
    C: { name: '노르딕 뜨개 러그', note: '줄무늬·마름모 + 양끝 술', foot: null },
  },
  wp_cocoa_table: {
    A: { name: '그루터기 탁자', note: '나이테 상판 + 머그 둘 + 쿠키 접시', foot: [0.9, 0.9] },
    B: { name: '체크보 사이드 탁자', note: '체크 식탁보 + 코코아 주전자 + 머그 둘 + 마시멜로 병', foot: [0.85, 0.65] },
    C: { name: '왕머그 원탁', note: '외다리 원탁 + 큰 머그 + 마시멜로 산 + 지팡이 사탕', foot: [0.8, 0.8] },
  },
  wp_snowman: {
    A: { name: '방울모자 눈사람', note: '세 덩이 + 긴 줄무늬 목도리 + 방울 모자', foot: [0.9, 0.9] },
    B: { name: '통통 눈사람', note: '두 덩이 + 두꺼운 목도리 + 귀마개 + 볼터치', foot: [1.0, 1.0] },
    C: { name: '등불 눈사람', note: '양동이 모자 + 손에 든 등불 + 눈 둔덕', foot: [1.1, 1.1] },
  },
};

const TAU = Math.PI * 2;
const lathe = (pr, seg = 16) => new THREE.LatheGeometry(pr.map(([x, y]) => new THREE.Vector2(x, y)), seg);
const sph = (r, w = 12, h = 9, ...rest) => new THREE.SphereGeometry(r, w, h, ...rest);
const cyl = (a, b, h, s = 12, ...rest) => new THREE.CylinderGeometry(a, b, h, s, ...rest);
const box = (x, y, z) => new THREE.BoxGeometry(x, y, z);
const cone = (r, h, s = 8) => new THREE.ConeGeometry(r, h, s);
const ico = (r) => new THREE.IcosahedronGeometry(r, 0);
const torus = (r, t, rs = 6, ts = 18, arc = TAU) => new THREE.TorusGeometry(r, t, rs, ts, arc);
const flatRing = (p, r, tube, col, y, rs = 5, ts = 24) => { const t = part(p, torus(r, tube, rs, ts), col, 0, y, 0); t.rotation.x = Math.PI / 2; return t; };
const seeded = (seed) => { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
const basicBaked = (g) => new THREE.Mesh(bakeGroup(g), new THREE.MeshBasicMaterial({ vertexColors: true }));

function starGeo(r1, r2, depth) {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + Math.PI / 2, r = i % 2 ? r2 : r1; i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
  return new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false });
}

function flames(x, y, z, k = 1) {
  const fl = new THREE.Group();
  [[0, 0.3, C.fire, 0.09], [-0.1, 0.22, C.fireMid, 0.07], [0.1, 0.22, C.fireMid, 0.07], [0, 0.17, C.fireCore, 0.05]].forEach(([dx, h, c, r], i) => part(fl, cone(r, h, 6), c, dx, h / 2, i === 3 ? 0.04 : 0));
  const m = basicBaked(fl); m.position.set(x, y, z); m.scale.setScalar(k); m.userData = { anim: 'flame', amp: 0.25, speed: 7 };
  return m;
}

function logs(s, x, y, z, len = 0.42, r = 0.055) {
  [-0.5, 0.5].forEach((a, i) => { const l = part(s, cyl(r, r, len, 7), i ? C.woodDk : C.bark, x, y + r, z + (i ? -0.02 : 0.02)); l.rotation.z = Math.PI / 2; l.rotation.y = a; });
}

function mug(s, x, y, z, col, r = 0.075, h = 0.14, rotY = 0) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rotY; s.add(g);
  part(g, cyl(r, r * 0.92, h, 12), col, 0, h / 2, 0);
  part(g, cyl(r * 0.84, r * 0.84, 0.02, 12), C.cocoa, 0, h - 0.02, 0);
  const hd = part(g, torus(r * 0.5, r * 0.15, 5, 10, Math.PI), col, r * 1.02, h * 0.5, 0); hd.rotation.z = -Math.PI / 2;
  return g;
}

function marsh(s, pts, size = 0.035) {
  pts.forEach(([x, y, z, c = C.cream]) => { part(s, box(size, size * 0.85, size), c, x, y, z).rotation.set(0.25, x * 20, 0.15); });
}

function scarfTail(s, x, y, z, w, len, col, stripe, rotZ = 0, rotX = 0.15) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.set(rotX, 0, rotZ); s.add(g);
  part(g, box(w, len, 0.05), col, 0, -len / 2, 0);
  [0.3, 0.6].forEach(f => part(g, box(w + 0.006, 0.04, 0.056), stripe, 0, -len * f, 0));
  for (let i = 0; i < 4; i++) part(g, box(0.02, 0.07, 0.03), stripe, -w / 2 + w / 8 + i * w / 4, -len - 0.035, 0);
  return g;
}

function coalFace(s, cy, r, eyeDy = 0.08, eyeDx = 0.075) {
  [-eyeDx, eyeDx].forEach(dx => { const zz = Math.sqrt(r * r - dx * dx - eyeDy * eyeDy); part(s, sph(0.03, 8, 6), C.coal, dx, cy + eyeDy, zz - 0.012); });
}

function twigArm(s, x, y, z, rotZ, len = 0.55) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.z = rotZ; s.add(g);
  part(g, cyl(0.018, 0.024, len, 5), C.bark, 0, len / 2, 0);
  [0.6, -0.6].forEach((a, i) => { const t = part(g, cyl(0.01, 0.014, 0.16, 4), C.bark, -Math.sin(a) * 0.07, len * (0.72 + i * 0.12) + Math.cos(a) * 0.07, 0); t.rotation.z = a; });
  return g;
}

const BUILD = {
  wp_hearth: {
    A(s, g) {
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([x, z]) => part(s, cyl(0.045, 0.035, 0.18, 6), C.iron, x * 0.21, 0.09, z * 0.21));
      part(s, cyl(0.34, 0.34, 0.05, 14), C.iron, 0, 0.205, 0);
      part(s, lathe([[0, 0], [0.3, 0], [0.38, 0.12], [0.4, 0.3], [0.36, 0.5], [0.28, 0.6], [0, 0.6]], 18), C.green, 0, 0.23, 0);
      flatRing(s, 0.405, 0.018, C.mustard, 0.53, 5, 28);
      part(s, cyl(0.3, 0.29, 0.05, 16), C.iron, 0, 0.855, 0);
      part(s, box(0.32, 0.28, 0.08), C.coal, 0, 0.49, 0.36);
      part(g, box(0.22, 0.18, 0.02), C.fire, 0, 0.49, 0.405);
      part(g, box(0.12, 0.08, 0.02), C.fireCore, 0, 0.455, 0.41);
      [-0.05, 0.05].forEach(x => part(s, box(0.018, 0.2, 0.02), C.coal, x, 0.49, 0.42));
      part(s, sph(0.022, 6, 5), C.mustard, 0.13, 0.49, 0.41);
      part(s, cyl(0.07, 0.07, 0.72, 10), C.iron, -0.1, 1.24, -0.12);
      flatRing(s, 0.075, 0.015, C.mustard, 1.02, 4, 14).position.set(-0.1, 1.02, -0.12);
      part(s, cyl(0.11, 0.08, 0.07, 10), C.iron, -0.1, 1.635, -0.12);
      part(s, lathe([[0, 0], [0.1, 0], [0.12, 0.06], [0.1, 0.12], [0.04, 0.15], [0, 0.15]], 14), C.berry, 0.15, 0.88, 0.04);
      part(s, sph(0.022, 6, 5), C.coal, 0.15, 1.04, 0.04);
      const sp = part(s, cyl(0.015, 0.03, 0.12, 6), C.berry, 0.27, 0.96, 0.04); sp.rotation.z = -0.9;
      return {};
    },
    B(s, g) {
      part(s, box(1.2, 0.06, 0.62), C.stone, 0, 0.03, 0.04);
      [-0.41, 0.41].forEach(x => part(s, box(0.28, 0.82, 0.42), C.cream, x, 0.47, -0.04));
      part(s, box(1.1, 0.24, 0.42), C.cream, 0, 0.76, -0.04);
      part(s, box(0.56, 0.6, 0.04), C.coal, 0, 0.36, -0.22);
      part(s, box(0.56, 0.04, 0.4), C.coal, 0, 0.62, -0.04);
      [-0.27, 0.27].forEach(x => part(s, box(0.06, 0.6, 0.03), C.berry, x, 0.36, 0.18));
      part(s, box(0.6, 0.06, 0.03), C.berry, 0, 0.66, 0.18);
      part(s, box(1.32, 0.08, 0.56), C.wood, 0, 0.92, 0);
      logs(s, 0, 0.06, -0.04, 0.38, 0.05);
      const rnd = seeded(11);
      for (let i = 0; i < 9; i++) { const x = -0.56 + i * 0.14; part(s, ico(0.07), i % 2 ? C.green : C.greenDk, x, 0.99, 0.2 + (rnd() - 0.5) * 0.04).rotation.y = rnd() * 3; if (i % 2 === 0) part(s, sph(0.026, 6, 5), C.berry, x + 0.03, 1.02, 0.26); }
      [[-0.34, C.berry], [0.34, C.green]].forEach(([x, col], i) => {
        const st = new THREE.Group(); st.position.set(x, 0.86, 0.3); st.rotation.z = i ? -0.06 : 0.06; s.add(st);
        part(st, box(0.15, 0.06, 0.06), C.cream, 0, 0, 0);
        part(st, box(0.12, 0.2, 0.05), col, 0, -0.13, 0);
        part(st, box(0.17, 0.08, 0.05), col, (i ? -1 : 1) * 0.025, -0.25, 0);
        part(st, box(0.05, 0.05, 0.052), C.cream, (i ? -1 : 1) * 0.1, -0.25, 0);
      });
      part(s, cyl(0.035, 0.035, 0.12, 8), C.cream, 0.5, 1.02, -0.1);
      part(g, cone(0.022, 0.06, 6), C.fireCore, 0.5, 1.11, -0.1);
      return { anims: [flames(0, 0.12, -0.04, 0.95)] };
    },
    C(s) {
      part(s, cyl(0.64, 0.68, 0.12, 12), C.stone, 0, 0.06, 0);
      const d = part(s, sph(0.54, 18, 10, 0, TAU, 0, Math.PI / 2), 0xc47a52, 0, 0.12, 0); d.scale.set(1, 1.15, 1);
      flatRing(s, 0.55, 0.035, 0xa8603e, 0.14, 5, 24);
      part(s, box(0.36, 0.26, 0.14), C.coal, 0, 0.27, 0.48);
      const ar = part(s, cyl(0.18, 0.18, 0.14, 12, 1, false, 0, Math.PI), C.coal, 0, 0.4, 0.48); ar.rotation.set(Math.PI / 2, 0, Math.PI / 2);
      part(s, torus(0.21, 0.045, 5, 12, Math.PI), C.cream, 0, 0.4, 0.55);
      [-0.21, 0.21].forEach(x => part(s, box(0.09, 0.27, 0.09), C.cream, x, 0.27, 0.55));
      part(s, cyl(0.1, 0.12, 0.28, 10), 0xa8603e, 0.12, 0.8, -0.12);
      part(s, cyl(0.12, 0.12, 0.04, 10), C.stoneLt, 0.12, 0.96, -0.12);
      [[0.8, 0.07, 0.15], [0.8, 0.07, -0.05], [0.8, 0.19, 0.05]].forEach(([x, y, z], i) => {
        part(s, cyl(0.065, 0.065, 0.4, 7), i === 2 ? C.woodDk : C.bark, x, y, z).rotation.x = Math.PI / 2;
        part(s, cyl(0.05, 0.05, 0.405, 7), C.woodLt, x, y, z).rotation.x = Math.PI / 2;
      });
      return { anims: [flames(0, 0.15, 0.58, 0.8)] };
    },
  },
  wp_fur_rug: {
    A(s) {
      const sh = new THREE.Shape(), N = 64;
      for (let i = 0; i <= N; i++) {
        const a = i / N * TAU;
        const lobe = 0.11 * Math.max(0, Math.cos(4 * (a - Math.PI / 4))) ** 3;
        const wob = 0.03 * Math.sin(a * 11) + 0.015 * Math.sin(a * 17);
        const r = 1 + lobe + wob, x = Math.cos(a) * 0.8 * r, y = Math.sin(a) * 0.56 * r;
        i ? sh.lineTo(x, y) : sh.moveTo(x, y);
      }
      const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.02, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.05, bevelSegments: 2 });
      geo.rotateX(-Math.PI / 2); geo.translate(0, 0.02, 0);
      part(s, geo, C.cream);
      const rnd = seeded(5);
      [[0, 0], [-0.4, 0.15], [0.4, -0.12], [-0.25, -0.25], [0.3, 0.25], [0.6, 0.05], [-0.62, -0.05], [0.05, 0.32], [-0.05, -0.36]].forEach(([x, z]) => {
        const b = part(s, sph(0.14 + rnd() * 0.04, 9, 6), rnd() > 0.5 ? C.creamDk : 0xd9c9aa, x, 0.04, z); b.scale.set(1, 0.28, 0.85);
      });
      return {};
    },
    B(s) {
      part(s, cyl(0.82, 0.82, 0.04, 28), C.cream, 0, 0.02, 0);
      const n = 20;
      for (let i = 0; i < n; i++) { const a = i / n * TAU; const b = part(s, sph(0.13, 9, 6), i % 2 ? C.cream : C.creamDk, Math.cos(a) * 0.8, 0.045, Math.sin(a) * 0.8); b.scale.set(1, 0.42, 1); }
      part(s, cyl(0.6, 0.6, 0.05, 28), C.berry, 0, 0.025, 0);
      part(s, cyl(0.5, 0.5, 0.058, 28), C.cream, 0, 0.029, 0);
      part(s, cyl(0.26, 0.26, 0.064, 24), C.green, 0, 0.032, 0);
      const st = part(s, starGeo(0.2, 0.09, 0.015), C.mustard, 0, 0.064, 0); st.rotation.x = -Math.PI / 2;
      return {};
    },
    C(s) {
      const W = 1.6, D = 1.0;
      part(s, box(W, 0.04, D), C.cream, 0, 0.02, 0);
      [-0.36, 0.36].forEach(z => part(s, box(W, 0.012, 0.09), C.berry, 0, 0.046, z));
      [-0.24, 0.24].forEach(z => part(s, box(W, 0.008, 0.03), C.green, 0, 0.044, z));
      for (let i = 0; i < 7; i++) { const d = part(s, box(0.13, 0.012, 0.13), i % 2 ? C.green : C.berry, -0.6 + i * 0.2, 0.046, 0); d.rotation.y = Math.PI / 4; }
      for (let i = 0; i < 7; i++) { const d = part(s, box(0.05, 0.014, 0.05), C.cream, -0.6 + i * 0.2, 0.054, 0); d.rotation.y = Math.PI / 4; }
      [-1, 1].forEach(sx => { for (let i = 0; i < 8; i++) { const t = part(s, cyl(0.018, 0.012, 0.12, 5), i % 2 ? C.creamDk : C.cream, sx * (W / 2 + 0.06), 0.015, -0.42 + i * 0.12); t.rotation.z = Math.PI / 2; } });
      return {};
    },
  },
  wp_cocoa_table: {
    A(s) {
      part(s, cyl(0.4, 0.46, 0.56, 10), 0x80593a, 0, 0.28, 0);
      [0, 1.6, 3.4, 4.8].forEach(a => part(s, cyl(0.05, 0.1, 0.16, 5), C.bark, Math.cos(a) * 0.46, 0.06, Math.sin(a) * 0.46).rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9));
      part(s, cyl(0.43, 0.43, 0.06, 18), C.woodLt, 0, 0.59, 0);
      [0.3, 0.18, 0.07].forEach(r => flatRing(s, r, 0.008, 0xb3824d, 0.62, 3, 22));
      mug(s, -0.14, 0.62, 0.1, C.berry, 0.075, 0.14, 0.6);
      mug(s, 0.12, 0.62, 0.16, C.green, 0.075, 0.14, 2.2);
      marsh(s, [[-0.16, 0.76, 0.1], [-0.12, 0.765, 0.12, C.pink], [-0.13, 0.765, 0.07], [0.12, 0.76, 0.16], [0.14, 0.765, 0.13, C.pink]]);
      part(s, cyl(0.13, 0.11, 0.025, 16), C.cream, 0.05, 0.633, -0.18);
      [[0.0, -0.17], [0.09, -0.2], [0.05, -0.12]].forEach(([x, z], i) => part(s, cyl(0.045, 0.045, 0.02, 10), C.mustard, x, 0.655 + i * 0.012, z).rotation.x = i * 0.15);
      return {};
    },
    B(s) {
      part(s, box(0.78, 0.05, 0.58), C.cream, 0, 0.56, 0);
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([x, z]) => part(s, cyl(0.035, 0.025, 0.54, 6), C.wood, x * 0.33, 0.27, z * 0.23));
      for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) part(s, box(0.21, 0.012, 0.21), (i + j) % 2 ? C.cream : C.berry, -0.315 + i * 0.21, 0.591, -0.21 + j * 0.21);
      [0.32, -0.32].forEach(z => { for (let i = 0; i < 4; i++) part(s, box(0.21, 0.14, 0.012), (i + (z > 0 ? 0 : 1)) % 2 ? C.cream : C.berry, -0.315 + i * 0.21, 0.53, z); });
      [-0.425, 0.425].forEach(x => { for (let j = 0; j < 3; j++) part(s, box(0.012, 0.14, 0.21), j % 2 ? C.cream : C.berry, x, 0.53, -0.21 + j * 0.21); });
      const pot = new THREE.Group(); pot.position.set(-0.18, 0.597, -0.06); s.add(pot);
      part(pot, lathe([[0, 0], [0.11, 0], [0.13, 0.08], [0.12, 0.18], [0.07, 0.24], [0, 0.24]], 14), C.green);
      part(pot, sph(0.03, 8, 6), C.mustard, 0, 0.26, 0);
      part(pot, cyl(0.015, 0.03, 0.14, 6), C.green, 0.15, 0.16, 0).rotation.z = -0.8;
      const hd = part(pot, torus(0.07, 0.014, 5, 10, Math.PI), C.mustard, -0.13, 0.13, 0); hd.rotation.z = Math.PI / 2;
      mug(s, 0.1, 0.597, 0.1, C.cream, 0.07, 0.13, 2.4);
      mug(s, 0.24, 0.597, -0.08, C.cream, 0.07, 0.13, 1.8);
      [[0.1, 0.1], [0.24, -0.08]].forEach(([x, z]) => part(s, cyl(0.0715, 0.0705, 0.025, 12), C.berry, x, 0.68, z));
      const jar = new THREE.Group(); jar.position.set(-0.02, 0.597, 0.15); s.add(jar);
      part(jar, lathe([[0, 0], [0.06, 0], [0.065, 0.12], [0.05, 0.14], [0, 0.14]], 12), 0xe9e0d0);
      part(jar, cyl(0.055, 0.055, 0.03, 12), C.mustard, 0, 0.155, 0);
      marsh(jar, [[-0.025, 0.06, 0.055], [0.02, 0.09, 0.055, C.pink], [0.03, 0.04, 0.05]], 0.03);
      return {};
    },
    C(s) {
      part(s, cyl(0.24, 0.28, 0.05, 14), C.woodDk, 0, 0.025, 0);
      part(s, cyl(0.045, 0.06, 0.52, 8), C.wood, 0, 0.31, 0);
      part(s, cyl(0.38, 0.38, 0.05, 20), C.wood, 0, 0.595, 0);
      flatRing(s, 0.38, 0.018, C.woodDk, 0.595, 4, 28);
      part(s, cyl(0.2, 0.17, 0.025, 18), C.cream, 0, 0.632, 0);
      const m = mug(s, 0, 0.645, 0, C.berry, 0.14, 0.24, 0.5);
      part(m, cyl(0.1445, 0.141, 0.05, 16), C.cream, 0, 0.12, 0);
      marsh(m, [[-0.05, 0.25, 0.03], [0.05, 0.255, -0.02, C.pink], [0.0, 0.25, -0.07], [-0.07, 0.255, -0.05, C.pink], [0.07, 0.25, 0.06], [0.0, 0.29, 0.0], [-0.03, 0.285, 0.05, C.pink]], 0.055);
      const cane = new THREE.Group(); cane.position.set(0.07, 0.8, -0.04); cane.rotation.z = -0.25; s.add(cane);
      for (let i = 0; i < 6; i++) part(cane, cyl(0.018, 0.018, 0.04, 8), i % 2 ? C.cream : C.berry, 0, i * 0.04, 0);
      part(cane, torus(0.05, 0.018, 6, 10, Math.PI), C.berry, -0.05, 0.22, 0);
      part(s, cyl(0.05, 0.05, 0.018, 10), C.mustard, 0.25, 0.63, 0.12);
      part(s, cyl(0.05, 0.05, 0.018, 10), C.mustard, 0.24, 0.648, 0.17).rotation.x = 0.3;
      return {};
    },
  },
  wp_snowman: {
    A(s) {
      part(s, sph(0.42, 16, 12), C.snow, 0, 0.38, 0);
      part(s, sph(0.3, 16, 12), C.snow, 0, 0.94, 0);
      part(s, sph(0.22, 16, 12), C.snow, 0, 1.36, 0);
      coalFace(s, 1.36, 0.22, 0.05, 0.07);
      part(s, cone(0.04, 0.22, 8), C.carrot, 0, 1.33, 0.3).rotation.x = Math.PI / 2;
      [1.02, 0.88, 0.74].forEach(y => { const zz = Math.sqrt(Math.max(0, 0.3 * 0.3 - (y - 0.94) ** 2)); part(s, sph(0.03, 8, 6), C.coal, 0, y, zz - 0.005); });
      flatRing(s, 0.2, 0.065, C.berry, 1.17, 6, 18);
      scarfTail(s, 0.12, 1.15, 0.2, 0.13, 0.5, C.berry, C.cream, 0.18, 0.3);
      scarfTail(s, 0.2, 1.15, 0.12, 0.12, 0.36, C.berry, C.cream, 0.45, 0.2);
      part(s, sph(0.215, 14, 8, 0, TAU, 0, Math.PI / 2), C.green, 0, 1.43, 0).scale.set(1.04, 1.1, 1.04);
      flatRing(s, 0.21, 0.04, C.greenDk, 1.45, 5, 18);
      part(s, sph(0.08, 10, 8), C.mustard, 0, 1.69, 0);
      twigArm(s, -0.27, 1.0, 0, 1.0);
      twigArm(s, 0.27, 1.0, 0, -0.9);
      return { flat: false };
    },
    B(s) {
      const b = part(s, sph(0.5, 18, 12), C.snow, 0, 0.44, 0); b.scale.set(1.08, 0.9, 1.08);
      part(s, sph(0.38, 18, 12), C.snow, 0, 1.08, 0);
      coalFace(s, 1.08, 0.38, 0.06, 0.12);
      part(s, cone(0.045, 0.14, 8), C.carrot, 0, 1.04, 0.43).rotation.x = Math.PI / 2;
      [-0.2, 0.2].forEach(x => {
        const n = new THREE.Vector3(x, -0.06, 0).setZ(Math.sqrt(0.38 * 0.38 - x * x - 0.06 * 0.06)).normalize();
        const c = part(s, cyl(0.06, 0.06, 0.012, 12), 0xd98a8f, n.x * 0.381, 1.08 + n.y * 0.381, n.z * 0.381);
        c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
      });
      flatRing(s, 0.3, 0.1, C.green, 0.8, 7, 20);
      scarfTail(s, 0.16, 0.8, 0.32, 0.2, 0.42, C.green, C.cream, 0.12, 0.35);
      const band = part(s, torus(0.4, 0.035, 6, 18, Math.PI), C.mustard, 0, 1.08, 0);
      [-0.39, 0.39].forEach(x => { const e = part(s, sph(0.11, 12, 8), C.mustard, x, 1.1, 0); e.scale.set(0.6, 1, 1); });
      twigArm(s, -0.47, 0.6, 0, 0.6, 0.5);
      twigArm(s, 0.47, 0.6, 0, -1.9, 0.45);
      return { flat: false };
    },
    C(s, g) {
      const mound = part(s, sph(0.6, 16, 8, 0, TAU, 0, Math.PI / 2), C.snowDk, 0, 0, 0); mound.scale.set(1, 0.25, 1);
      part(s, sph(0.38, 16, 12), C.snow, 0, 0.42, 0);
      part(s, sph(0.28, 16, 12), C.snow, 0, 0.93, 0);
      part(s, sph(0.2, 16, 12), C.snow, 0, 1.32, 0);
      coalFace(s, 1.3, 0.2, 0.04, 0.065);
      part(s, cone(0.035, 0.16, 8), C.carrot, 0, 1.27, 0.26).rotation.x = Math.PI / 2;
      [1.0, 0.87].forEach(y => { const zz = Math.sqrt(Math.max(0, 0.28 * 0.28 - (y - 0.93) ** 2)); part(s, sph(0.028, 8, 6), C.coal, 0, y, zz - 0.005); });
      flatRing(s, 0.18, 0.06, C.mustard, 1.13, 6, 18);
      scarfTail(s, -0.1, 1.12, 0.17, 0.12, 0.38, C.mustard, C.berry, -0.15, 0.3);
      const hat = new THREE.Group(); hat.position.set(0, 1.44, 0); hat.rotation.z = 0.18; s.add(hat);
      part(hat, cyl(0.15, 0.19, 0.24, 14), C.tin, 0, 0.12, 0);
      flatRing(hat, 0.19, 0.018, 0x657380, 0.02, 4, 18);
      part(hat, torus(0.17, 0.008, 4, 14, Math.PI), 0x657380, 0, 0.08, 0).rotation.y = 0.2;
      twigArm(s, -0.25, 0.98, 0, 1.1);
      twigArm(s, 0.25, 0.98, 0, -1.25, 0.5);
      const lan = new THREE.Group(); lan.position.set(0.68, 1.05, 0.05); s.add(lan);
      part(lan, cyl(0.006, 0.006, 0.12, 4), C.coal, 0, 0.06, 0);
      part(lan, box(0.14, 0.02, 0.14), C.coal, 0, -0.02, 0);
      part(lan, cone(0.1, 0.08, 4), C.coal, 0, 0.03, 0).rotation.y = Math.PI / 4;
      part(lan, box(0.14, 0.02, 0.14), C.coal, 0, -0.24, 0);
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([x, z]) => part(lan, box(0.018, 0.2, 0.018), C.coal, x * 0.062, -0.13, z * 0.062));
      part(g, box(0.1, 0.17, 0.1), C.fireMid, 0.68, 0.92, 0.05);
      part(g, box(0.05, 0.08, 0.104), C.fireCore, 0.68, 0.9, 0.05);
      return { flat: false };
    },
  },
};

export function build(id, v) {
  const fn = BUILD[id]?.[v];
  if (!fn) throw new Error(`unknown winter pick decor: ${id}/${v}`);
  const solid = new THREE.Group(), glow = new THREE.Group();
  const { k = 1, flat = true, rough = 0.9, anims = [] } = fn(solid, glow);
  const out = new THREE.Group();
  const body = new THREE.Mesh(bakeGroup(solid), new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: flat, roughness: rough, metalness: 0 }));
  body.castShadow = true; body.receiveShadow = true;
  out.add(body);
  if (glow.children.length) out.add(basicBaked(glow));
  anims.forEach(a => out.add(a));
  out.traverse(o => { if (o.isMesh && o !== body) o.userData.noShadow = true; });
  out.scale.setScalar(k);
  return out;
}
