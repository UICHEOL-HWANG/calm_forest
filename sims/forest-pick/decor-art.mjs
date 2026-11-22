import * as THREE from 'three';
import { bakeGroup, part } from '../../js/dream/art.js';

export const IDS = ['fp_owl_clock', 'fp_acorn_cupboard', 'fp_hedgehog_cushion', 'fp_deer_mailbox'];
export const VARIANTS = ['A', 'B', 'C'];

export const C = {
  cream: 0xe3d4b8, creamDk: 0xcfbd9c, berry: 0xb5363f, coal: 0x2a2624, gold: 0xd9a63a,
  wood: 0x9c6b40, woodLt: 0xc99a62, woodDk: 0x6b4a2e, bark: 0x5e4129, stump: 0x80593a,
  acorn: 0x8a5a32, acornLt: 0xa8703a, cap: 0x5e4129, capLt: 0x7a5a3a,
  moss: 0x6f8f4a, mossDk: 0x4f6b38, glass: 0x3f5a48,
  ochre: 0xc58a3e, ochreDk: 0x9c6a30, ochreLt: 0xd9a85a,
  squirrel: 0xb8662f, squirrelLt: 0xc9783a,
  quill: 0x7f6a5a, quillDk: 0x6a5648, hogFace: 0xdcc6a6, ear: 0xc4ab8a,
  fawn: 0xb7794a, fawnDk: 0x94603a, fawnLt: 0xc98a55, antler: 0xd2b98c, birch: 0xd6cdbd, stone: 0x8f887e,
};

export const META = {
  fp_owl_clock: {
    A: { name: '부엉이 괘종시계', note: '긴 시계장 + 부엉이 머리 덮개 + 날개 옆판 + 진자 창', foot: [0.65, 0.45] },
    B: { name: '그루터기 부엉이 시계', note: '그루터기 위에 앉은 부엉이 · 배가 시계판', foot: [0.7, 0.7] },
    C: { name: '횃대 부엉이 시계', note: '가지 횃대 위 부엉이 + 가지 끝에 매단 둥근 시계', foot: [0.75, 0.75] },
  },
  fp_acorn_cupboard: {
    A: { name: '도토리 지붕 찬장', note: '도토리 깍정이 지붕 + 둥근 창 문 두 짝 + 옆에 선 다람쥐', foot: [1.55, 0.6] },
    B: { name: '다람쥐 열린 선반', note: '낮은 2단 선반 + 도토리 병·더미 + 위에 앉은 다람쥐', foot: [1.3, 0.5] },
    C: { name: '큰 도토리 찬장', note: '도토리 모양 몸통 + 아치 문 + 옆에 기댄 다람쥐', foot: [1.4, 1.1] },
  },
  fp_hedgehog_cushion: {
    A: { name: '고슴도치 둥근 방석', note: '이어진 가시 껍질 돔 + 베이지 얼굴 · 기존 방문객 수치 재사용', foot: null },
    B: { name: '고슴도치 납작 방석', note: '이끼색 네모 방석 + 고슴도치 아플리케 + 모서리 술', foot: null },
    C: { name: '고슴도치 인형 쿠션', note: '서 있는 통통 인형 + 등 가시 + 산딸기 안기', foot: null },
  },
  fp_deer_mailbox: {
    A: { name: '사슴 얼굴 우체통', note: '자작나무 기둥 + 둥근 지붕 함 = 사슴 머리 + 뿔', foot: [0.6, 0.6] },
    B: { name: '서 있는 사슴 우체통', note: '네 다리 사슴 · 몸통이 우편함(옆 봉투 무늬) · 꼬리 깃발', foot: [0.7, 1.2] },
    C: { name: '엎드린 아기사슴 우체통', note: '엎드린 사슴 등에 초록 우편함 · 이끼 받침', foot: [1.1, 1.4] },
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
const disc = (p, r, t, col, x, y, z, seg = 16) => { const d = part(p, cyl(r, r, t, seg), col, x, y, z); d.rotation.x = Math.PI / 2; return d; };
const grp = (p, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); p.add(g); return g; };

function spikyShell(radius, spikeLen, keep) {
  const base = new THREE.IcosahedronGeometry(radius, 0).toNonIndexed();
  const pos = base.attributes.position, out = [];
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i); b.fromBufferAttribute(pos, i + 1); c.fromBufferAttribute(pos, i + 2);
    const cen = a.clone().add(b).add(c).multiplyScalar(1 / 3);
    if (!keep(cen)) continue;
    const apex = cen.clone().normalize().multiplyScalar(radius + spikeLen);
    for (const [p, q] of [[a, b], [b, c], [c, a]]) out.push(p.x, p.y, p.z, q.x, q.y, q.z, apex.x, apex.y, apex.z);
  }
  base.dispose();
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
  g.computeVertexNormals();
  return g;
}

function archShape(w, h) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h); s.absarc(0, h, w / 2, 0, Math.PI, false); s.closePath();
  return s;
}

function dial(s, x, y, z, r, rim = C.gold, hour = 2.1, min = -0.3) {
  const d = grp(s, x, y, z);
  disc(d, r, 0.03, C.cream, 0, 0, 0, 20);
  part(d, torus(r, r * 0.1, 5, 22), rim, 0, 0, 0.006);
  for (let i = 0; i < 4; i++) { const a = i / 4 * TAU, t = part(d, box(r * 0.1, r * 0.2, 0.01), C.coal, Math.sin(a) * r * 0.72, Math.cos(a) * r * 0.72, 0.02); t.rotation.z = -a; }
  [[hour, 0.48, 0.024], [min, 0.72, 0.03]].forEach(([a, l, zz]) => { const h = grp(d, 0, 0, zz); h.rotation.z = -a; part(h, box(r * 0.09, r * l, 0.01), C.coal, 0, r * l / 2, 0); });
  part(d, sph(r * 0.08, 8, 6), C.gold, 0, 0, 0.036);
  return d;
}

function owlHead(s, x, y, z, r, col = C.ochre) {
  const h = grp(s, x, y, z);
  part(h, sph(r, 16, 12), col).scale.set(1.08, 0.92, 1);
  [-1, 1].forEach(sx => {
    const e = grp(h, sx * r * 0.4, r * 0.06, r * 0.8);
    disc(e, r * 0.36, 0.04, C.ochreDk, 0, 0, 0, 14);
    disc(e, r * 0.3, 0.04, C.cream, 0, 0, 0.01, 14);
    part(e, sph(r * 0.15, 10, 8), C.coal, 0, 0, 0.03);
    part(e, sph(r * 0.05, 6, 4), 0xffffff, r * 0.05, r * 0.06, 0.03 + r * 0.13);
    const t = part(h, cone(r * 0.2, r * 0.55, 5), col, sx * r * 0.62, r * 0.8, -r * 0.05); t.rotation.z = -sx * 0.45;
  });
  part(h, cone(r * 0.1, r * 0.26, 5), C.gold, 0, -r * 0.2, r * 0.98).rotation.x = 2.5;
  return h;
}

function owlBody(s, x, y, z, k = 1, col = C.ochre) {
  const b = grp(s, x, y, z); b.scale.setScalar(k);
  part(b, lathe([[0, 0], [0.2, 0.02], [0.28, 0.14], [0.3, 0.32], [0.27, 0.5], [0.2, 0.6], [0, 0.64]], 16), col);
  [-1, 1].forEach(sx => { const w = part(b, sph(0.22, 10, 8), C.ochreDk, sx * 0.25, 0.32, -0.04); w.scale.set(0.3, 1, 0.75); w.rotation.z = sx * 0.12; });
  [-0.08, 0.08].forEach(dx => [-0.03, 0, 0.03].forEach(t => { const c = part(b, cone(0.018, 0.07, 4), C.gold, dx + t, 0.02, 0.2); c.rotation.x = Math.PI / 2; }));
  return b;
}

function acorn(s, x, y, z, r, rot = 0) {
  const a = grp(s, x, y, z); a.rotation.z = rot;
  part(a, sph(r, 10, 8), C.acornLt, 0, 0, 0).scale.set(1, 1.2, 1);
  part(a, sph(r * 1.08, 10, 5, 0, TAU, 0, Math.PI / 2), C.cap, 0, r * 0.3, 0).scale.set(1, 0.7, 1);
  part(a, cyl(r * 0.12, r * 0.15, r * 0.4, 5), C.cap, 0, r * 1.0, 0);
  return a;
}

function squirrel(s, x, y, z, k = 1, rotY = 0) {
  const q = grp(s, x, y, z); q.scale.setScalar(k); q.rotation.y = rotY;
  part(q, sph(0.17, 12, 9), C.squirrel, 0, 0.2, 0).scale.set(0.9, 1.2, 0.85);
  part(q, sph(0.12, 10, 8), C.cream, 0, 0.19, 0.08).scale.set(0.8, 1.05, 0.6);
  part(q, sph(0.13, 12, 9), C.squirrel, 0, 0.45, 0.04);
  part(q, sph(0.07, 8, 6), C.cream, 0, 0.42, 0.13).scale.set(1, 0.7, 0.6);
  [-1, 1].forEach(sx => {
    const e = part(q, cone(0.045, 0.11, 5), C.squirrel, sx * 0.075, 0.58, 0.01); e.rotation.z = -sx * 0.25;
    part(q, sph(0.022, 6, 5), C.coal, sx * 0.055, 0.48, 0.15);
    part(q, sph(0.05, 8, 6), C.squirrel, sx * 0.08, 0.03, 0.08).scale.set(1, 0.6, 1.4);
  });
  part(q, sph(0.018, 6, 4), C.coal, 0, 0.44, 0.18);
  [[0.12, -0.17, 0.1, 1.2], [0.32, -0.3, 0.15, 1.15], [0.55, -0.3, 0.16, 1.1], [0.71, -0.17, 0.12, 1.1]].forEach(([ty, tz, r, sy]) => part(q, sph(r, 12, 9), C.squirrelLt, 0, ty, tz).scale.set(0.8, sy, 1));
  acorn(q, 0, 0.3, 0.18, 0.05);
  return q;
}

function hogShells(s, k, col = C.quill) {
  const QR = 0.19 * k;
  [[[0, 0.24, 0.1], [-0.35, 0.3, 0], [1.05, 0.78, 1.0]], [[0, 0.27, -0.08], [-0.3, -0.5, 0.1], [1.2, 0.85, 1.05]], [[0, 0.22, -0.26], [-0.45, 0.9, 0], [1.0, 0.75, 1.0]]].forEach(([p, r, sc], i) => {
    const m = part(s, spikyShell(QR, QR * 0.75, c => c.y > -QR * 0.2), i === 1 ? col : C.quillDk, p[0] * k, p[1] * k, p[2] * k);
    m.rotation.set(...r); m.scale.set(...sc);
  });
}

function hogFace(s, x, y, z, k, tilt = 0.1) {
  const hg = grp(s, x, y, z); hg.rotation.x = tilt; hg.scale.setScalar(k);
  part(hg, sph(0.13, 14, 10), C.hogFace).scale.set(1, 0.9, 1);
  part(hg, cone(0.085, 0.16, 10), C.hogFace, 0, -0.02, 0.15).rotation.x = Math.PI / 2;
  part(hg, sph(0.032, 8, 6), C.coal, 0, -0.02, 0.23);
  [-1, 1].forEach(sx => {
    part(hg, sph(0.024, 8, 6), C.coal, sx * 0.075, 0.045, 0.095);
    part(hg, sph(0.008, 6, 4), 0xffffff, sx * 0.08, 0.055, 0.115);
    part(hg, sph(0.04, 8, 6), C.ear, sx * 0.1, 0.1, -0.02).scale.set(1, 1, 0.5);
    part(hg, sph(0.03, 8, 6), 0xd98a8f, sx * 0.09, -0.03, 0.09).scale.set(1, 0.6, 0.4);
  });
  return hg;
}

function antler(s, x, y, z, sx, k = 1) {
  const a = grp(s, x, y, z); a.scale.setScalar(k); a.rotation.z = -sx * 0.4;
  part(a, cyl(0.018, 0.026, 0.3, 5), C.antler, 0, 0.15, 0);
  const t1 = part(a, cyl(0.013, 0.017, 0.13, 5), C.antler, sx * 0.05, 0.16, 0.02); t1.rotation.z = -sx * 0.9;
  const t2 = part(a, cyl(0.012, 0.016, 0.12, 5), C.antler, -sx * 0.035, 0.3, 0); t2.rotation.z = sx * 0.6;
  const t3 = part(a, cyl(0.011, 0.015, 0.11, 5), C.antler, sx * 0.04, 0.33, 0); t3.rotation.z = -sx * 0.5;
  return a;
}

function deerHead(s, x, y, z, k = 1, antlerK = 1) {
  const h = grp(s, x, y, z); h.scale.setScalar(k);
  part(h, sph(0.16, 14, 10), C.fawn).scale.set(0.9, 0.95, 1.1);
  part(h, sph(0.1, 10, 8), C.cream, 0, -0.06, 0.14).scale.set(0.85, 0.75, 1);
  part(h, sph(0.035, 8, 6), C.coal, 0, -0.035, 0.235);
  [-1, 1].forEach(sx => {
    part(h, sph(0.028, 8, 6), C.coal, sx * 0.085, 0.03, 0.13);
    part(h, sph(0.009, 6, 4), 0xffffff, sx * 0.09, 0.04, 0.155);
    const e = part(h, cone(0.06, 0.17, 6), C.fawnDk, sx * 0.17, 0.08, -0.03); e.scale.set(1, 1, 0.4); e.rotation.z = -sx * 1.15;
    if (antlerK) antler(h, sx * 0.07, 0.12, -0.03, sx, antlerK);
  });
  return h;
}

function flag(s, x, y, z, sx = 1, col = C.berry) {
  const f = grp(s, x, y, z);
  part(f, box(0.03, 0.34, 0.03), C.woodDk, 0, 0.17, 0);
  part(f, box(0.025, 0.12, 0.16), col, 0, 0.28, 0.09);
  part(f, sph(0.03, 8, 6), C.gold, sx * 0.02, 0, 0);
  return f;
}

function tunnelBox(s, x, y, z, w, h, d, col) {
  const b = grp(s, x, y, z);
  part(b, box(w, h, d), col, 0, h / 2, 0);
  const r = part(b, cyl(w / 2, w / 2, d, 14, 1, false, Math.PI / 2, Math.PI), col, 0, h, 0); r.rotation.x = Math.PI / 2;
  return b;
}

function letter(s, x, y, z) {
  const l = grp(s, x, y, z);
  part(l, box(0.16, 0.1, 0.012), C.cream, 0, 0, 0);
  part(l, box(0.035, 0.035, 0.014), C.berry, 0.03, 0.005, 0.001);
  return l;
}

const BUILD = {
  fp_owl_clock: {
    A(s) {
      part(s, box(0.62, 0.1, 0.42), C.woodDk, 0, 0.05, 0);
      part(s, box(0.5, 1.0, 0.34), C.acorn, 0, 0.6, 0);
      part(s, box(0.56, 0.05, 0.38), C.woodDk, 0, 1.1, 0);
      part(s, box(0.32, 0.5, 0.04), C.woodDk, 0, 0.45, 0.18);
      part(s, box(0.26, 0.44, 0.02), C.glass, 0, 0.45, 0.193);
      part(s, box(0.015, 0.3, 0.01), C.gold, 0, 0.53, 0.207);
      disc(s, 0.06, 0.015, C.gold, 0, 0.36, 0.212, 12);
      dial(s, 0, 0.9, 0.187, 0.15);
      [-1, 1].forEach(sx => {
        const w = part(s, sph(0.3, 10, 8), C.ochreDk, sx * 0.26, 0.72, 0); w.scale.set(0.22, 1.25, 0.65);
        [0, 1].forEach(i => part(s, cone(0.022, 0.08, 4), C.gold, sx * (0.12 + i * 0.06), 0.1, 0.22).rotation.x = Math.PI / 2);
      });
      owlHead(s, 0, 1.36, 0.0, 0.29);
      return {};
    },
    B(s) {
      part(s, cyl(0.3, 0.34, 0.34, 10), C.stump, 0, 0.17, 0);
      part(s, cyl(0.295, 0.295, 0.03, 18), C.woodLt, 0, 0.35, 0);
      [0.2, 0.1].forEach(r => flatRing(s, r, 0.008, 0xb3824d, 0.367, 3, 20));
      [0.3, 2.0, 4.1].forEach(a => part(s, cyl(0.05, 0.1, 0.14, 5), C.bark, Math.cos(a) * 0.32, 0.08, Math.sin(a) * 0.32).rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9));
      owlBody(s, 0, 0.36, 0, 1.0);
      dial(s, 0, 0.68, 0.29, 0.16);
      owlHead(s, 0, 1.04, 0.02, 0.24);
      part(s, ico(0.06), C.moss, 0.22, 0.4, 0.12);
      part(s, ico(0.045), C.mossDk, -0.24, 0.39, 0.1);
      return {};
    },
    C(s) {
      part(s, cyl(0.3, 0.34, 0.08, 12), C.woodDk, 0, 0.04, 0);
      part(s, ico(0.09), C.moss, 0.14, 0.1, 0.12).scale.set(1, 0.5, 1);
      part(s, cyl(0.055, 0.085, 1.1, 7), C.bark, 0, 0.63, 0);
      const br = part(s, cyl(0.035, 0.05, 0.72, 6), C.bark, 0.13, 1.17, 0); br.rotation.z = Math.PI / 2 - 0.08;
      [[0.5, 1.22, 0.02, 0.09], [0.42, 1.27, -0.06, 0.07], [-0.2, 1.18, 0.03, 0.07]].forEach(([x, y, z, r], i) => part(s, ico(r), i % 2 ? C.mossDk : C.moss, x, y, z));
      owlBody(s, -0.04, 1.17, 0, 0.55);
      owlHead(s, -0.04, 1.62, 0.02, 0.15);
      part(s, cyl(0.007, 0.007, 0.16, 4), C.gold, 0.4, 1.09, 0.02);
      part(s, torus(0.03, 0.008, 4, 10), C.gold, 0.4, 0.99, 0.02);
      dial(s, 0.4, 0.78, 0.02, 0.19, C.ochreDk);
      return {};
    },
  },
  fp_acorn_cupboard: {
    A(s) {
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([x, z]) => part(s, box(0.08, 0.1, 0.08), C.woodDk, x * 0.38, 0.05, z * 0.16));
      part(s, box(0.9, 1.1, 0.45), C.acorn, 0, 0.65, 0);
      const cap = part(s, sph(0.6, 18, 8, 0, TAU, 0, Math.PI / 2), C.cap, 0, 1.18, 0); cap.scale.set(0.9, 0.5, 0.52);
      flatRing(s, 0.54, 0.045, C.capLt, 1.2, 5, 26).scale.set(1, 0.53, 1);
      [0.35, 0.2].forEach((r, i) => flatRing(s, r, 0.02, C.capLt, 1.28 + i * 0.06, 4, 20).scale.set(1, 0.58, 1));
      part(s, cyl(0.04, 0.06, 0.16, 6), C.cap, 0, 1.53, 0);
      [-1, 1].forEach(sx => {
        part(s, box(0.38, 0.62, 0.03), C.acornLt, sx * 0.205, 0.9, 0.24);
        disc(s, 0.12, 0.02, C.glass, sx * 0.205, 0.98, 0.26, 16);
        part(s, torus(0.12, 0.018, 4, 18), C.cream, sx * 0.205, 0.98, 0.268);
        acorn(s, sx * 0.205, 0.97, 0.285, 0.045, sx * 0.3);
        part(s, sph(0.025, 8, 6), C.gold, sx * 0.04, 0.8, 0.27);
      });
      part(s, box(0.8, 0.2, 0.03), C.acornLt, 0, 0.36, 0.24);
      acorn(s, 0, 0.35, 0.27, 0.035);
      squirrel(s, 0.62, 0, 0.12, 1.05, -1.0);
      return {};
    },
    B(s) {
      [-0.6, 0.6].forEach(x => part(s, box(0.05, 0.8, 0.42), C.wood, x, 0.4, 0));
      [[0.04, 1.2], [0.42, 1.2], [0.81, 1.28]].forEach(([y, w]) => part(s, box(w, 0.05, y > 0.8 ? 0.46 : 0.42), C.wood, 0, y, 0));
      part(s, box(1.2, 0.76, 0.03), C.woodDk, 0, 0.42, -0.195);
      part(s, box(1.2, 0.05, 0.02), C.berry, 0, 0.785, 0.215);
      const tilt = [-1.2, -0.3, 0.7, -0.7, 0.2, 1.4];
      [[-0.42, 0.11, 0.05], [-0.33, 0.11, -0.04], [-0.37, 0.18, 0.0], [-0.25, 0.11, 0.08], [-0.46, 0.11, -0.08], [-0.3, 0.18, 0.06]].forEach(([x, y, z], i) => acorn(s, x, y, z, 0.05, tilt[i]));
      const jar = (x, y, z, h, lid) => {
        const j = grp(s, x, y, z);
        part(j, lathe([[0, 0], [0.09, 0], [0.1, h * 0.85], [0.07, h], [0, h]], 12), 0xb9c4a2);
        part(j, cyl(0.075, 0.075, 0.04, 12), lid, 0, h + 0.02, 0);
        [[-0.035, h * 0.3], [0.035, h * 0.45], [0, h * 0.65]].forEach(([ax, ay], i) => acorn(j, ax, ay, 0.07, 0.03, i * 0.4));
      };
      jar(0.05, 0.065, 0, 0.26, C.berry);
      jar(0.32, 0.065, 0, 0.2, C.moss);
      jar(-0.3, 0.445, 0, 0.22, C.ochre);
      jar(0.0, 0.445, 0, 0.28, C.berry);
      part(s, cyl(0.12, 0.1, 0.1, 10), C.woodLt, 0.33, 0.495, 0);
      [[0.3, 0.57, 0.02], [0.37, 0.57, -0.02], [0.33, 0.62, 0.0]].forEach(([x, y, z]) => acorn(s, x, y, z, 0.04));
      squirrel(s, -0.25, 0.835, 0.02, 0.95, 0.9);
      part(s, cyl(0.13, 0.11, 0.08, 10), C.woodLt, 0.35, 0.875, 0.02);
      [[0.31, 0.95, 0.04], [0.39, 0.95, 0.0], [0.35, 0.99, 0.02]].forEach(([x, y, z]) => acorn(s, x, y, z, 0.04));
      return {};
    },
    C(s) {
      [0, 2.1, 4.2].forEach(a => part(s, cyl(0.05, 0.04, 0.16, 6), C.woodDk, Math.sin(a) * 0.26, 0.08, Math.cos(a) * 0.26));
      part(s, lathe([[0, 0], [0.12, 0.01], [0.3, 0.1], [0.42, 0.3], [0.46, 0.55], [0.45, 0.82], [0, 0.82]], 18), C.acornLt, 0, 0.14, 0);
      part(s, lathe([[0, 0], [0.5, 0], [0.53, 0.06], [0.49, 0.16], [0.37, 0.28], [0.18, 0.35], [0, 0.37]], 18), C.cap, 0, 0.92, 0);
      flatRing(s, 0.51, 0.04, C.capLt, 0.95, 5, 26);
      flatRing(s, 0.42, 0.02, C.capLt, 1.1, 4, 22);
      part(s, cyl(0.04, 0.06, 0.16, 6), C.cap, 0, 1.35, 0);
      const lf = part(s, sph(0.1, 8, 6), C.moss, 0.1, 1.37, 0.02); lf.scale.set(1.2, 0.2, 0.55); lf.rotation.z = -0.3;
      part(s, new THREE.ExtrudeGeometry(archShape(0.42, 0.34), { depth: 0.04, bevelEnabled: false }), C.acorn, 0, 0.26, 0.42);
      part(s, new THREE.ExtrudeGeometry(archShape(0.34, 0.3), { depth: 0.012, bevelEnabled: false }), C.wood, 0, 0.3, 0.462);
      disc(s, 0.08, 0.02, C.glass, 0, 0.66, 0.47, 14);
      part(s, torus(0.08, 0.015, 4, 16), C.cream, 0, 0.66, 0.48);
      part(s, sph(0.028, 8, 6), C.gold, 0.12, 0.45, 0.49);
      squirrel(s, 0.6, 0, 0.18, 1.0, -0.6);
      return {};
    },
  },
  fp_hedgehog_cushion: {
    A(s) {
      const h = grp(s, 0, 0, 0); h.scale.set(1.35, 1.05, 1.35);
      hogShells(h, 1);
      part(h, sph(0.24, 14, 10), C.hogFace, 0, 0.17, -0.04).scale.set(1, 0.45, 1.25);
      hogFace(h, 0, 0.19, 0.3, 1, 0.1);
      return {};
    },
    B(s) {
      part(s, box(0.8, 0.12, 0.8), C.moss, 0, 0.07, 0);
      const top = part(s, sph(0.5, 16, 6, 0, TAU, 0, Math.PI / 2), C.moss, 0, 0.12, 0); top.scale.set(0.8, 0.12, 0.8);
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([x, z]) => { part(s, sph(0.035, 6, 5), C.gold, x * 0.4, 0.07, z * 0.4); part(s, cone(0.03, 0.08, 5), C.gold, x * 0.43, 0.04, z * 0.43).rotation.set(z * 0.8, 0, -x * 0.8); });
      const pat = grp(s, 0, 0.175, 0);
      const body = part(pat, cyl(0.26, 0.26, 0.02, 18), C.quill, -0.04, 0, 0); body.scale.set(1.15, 1, 0.82);
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
        const sp = part(pat, cone(0.05, 0.1, 3), C.quillDk, -0.24 + c * 0.13 + (r % 2) * 0.06, 0.03, -0.12 + r * 0.12); sp.rotation.set(0, 0, Math.PI / 2); sp.scale.set(1, 1, 0.35);
      }
      const face = part(pat, cyl(0.12, 0.12, 0.024, 14), C.hogFace, 0.24, 0.004, 0); face.scale.set(1.3, 1, 0.9);
      part(pat, sph(0.025, 8, 6), C.coal, 0.4, 0.02, 0);
      part(pat, sph(0.016, 6, 5), C.coal, 0.27, 0.02, 0.05);
      part(pat, sph(0.03, 8, 6), C.ear, 0.18, 0.02, 0.09).scale.set(1, 0.4, 1);
      [[-0.12, 0.2], [0.08, 0.2], [-0.12, -0.2], [0.08, -0.2]].forEach(([x, z]) => part(pat, sph(0.035, 6, 5), C.stump, x, 0.004, z).scale.set(1, 0.4, 1));
      return {};
    },
    C(s) {
      s = grp(s); s.scale.setScalar(0.72);
      part(s, sph(0.3, 16, 12), C.quill, 0, 0.32, -0.02).scale.set(1, 1.1, 0.9);
      const sh = grp(s, 0, 0.08, -0.16); sh.scale.set(1.25, 1.35, 1.0); sh.rotation.x = -0.35;
      hogShells(sh, 1);
      part(s, sph(0.26, 14, 10), C.hogFace, 0, 0.3, 0.1).scale.set(0.85, 1.0, 0.6);
      hogFace(s, 0, 0.48, 0.12, 1.25, 0.05);
      [-1, 1].forEach(sx => {
        part(s, sph(0.07, 8, 6), C.stump, sx * 0.14, 0.05, 0.16).scale.set(1, 0.6, 1.3);
        const arm = part(s, sph(0.06, 8, 6), C.hogFace, sx * 0.13, 0.28, 0.25); arm.scale.set(0.8, 1.3, 0.8); arm.rotation.z = sx * 0.6;
      });
      part(s, sph(0.07, 10, 8), C.berry, 0, 0.26, 0.29);
      part(s, cone(0.03, 0.04, 5), C.moss, 0, 0.33, 0.29);
      return {};
    },
  },
  fp_deer_mailbox: {
    A(s) {
      part(s, cyl(0.24, 0.28, 0.08, 8), C.stone, 0, 0.04, 0);
      part(s, cyl(0.06, 0.07, 0.86, 8), C.birch, 0, 0.5, 0);
      [[0.3, 0.6], [0.55, 2.2], [0.75, 4.0]].forEach(([y, a]) => part(s, box(0.05, 0.02, 0.02), C.coal, Math.sin(a) * 0.066, y, Math.cos(a) * 0.066).rotation.y = a);
      const b = tunnelBox(s, 0, 0.9, 0, 0.36, 0.24, 0.48, C.fawn);
      [[-1, 0.1, 0.1], [-1, 0.06, -0.12], [1, 0.12, -0.06], [1, 0.05, 0.13]].forEach(([sx, y, z]) => { const d = part(b, cyl(0.035, 0.035, 0.012, 10), C.cream, sx * 0.183, y, z); d.rotation.z = Math.PI / 2; });
      part(b, new THREE.ExtrudeGeometry(archShape(0.38, 0.24), { depth: 0.03, bevelEnabled: false }), C.fawnLt, 0, -0.01, 0.24);
      [-1, 1].forEach(sx => {
        part(b, sph(0.032, 8, 6), C.coal, sx * 0.085, 0.27, 0.275);
        part(b, sph(0.01, 6, 4), 0xffffff, sx * 0.093, 0.285, 0.302);
        const e = part(b, cone(0.07, 0.19, 6), C.fawnDk, sx * 0.24, 0.36, 0.02); e.scale.set(1, 1, 0.4); e.rotation.z = -sx * 1.15;
        antler(b, sx * 0.08, 0.38, 0, sx, 1.05);
      });
      const mz = part(b, cyl(0.1, 0.1, 0.03, 14), C.cream, 0, 0.12, 0.28); mz.rotation.x = Math.PI / 2; mz.scale.set(1.25, 1, 0.85);
      part(b, sph(0.04, 8, 6), C.coal, 0, 0.16, 0.3);
      part(b, box(0.16, 0.025, 0.01), C.coal, 0, 0.06, 0.296);
      flag(b, 0.2, 0.08, -0.1, 1);
      return {};
    },
    B(s) {
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([x, z]) => {
        part(s, cyl(0.04, 0.03, 0.46, 6), C.fawnDk, x * 0.11, 0.27, z * 0.24);
        part(s, cyl(0.035, 0.04, 0.05, 6), C.coal, x * 0.11, 0.025, z * 0.24);
      });
      const b = tunnelBox(s, 0, 0.46, 0, 0.32, 0.22, 0.62, C.fawn);
      part(b, box(0.322, 0.08, 0.622), C.creamDk, 0, 0.03, 0);
      [[-1, 0.22, 0.2], [-1, 0.24, -0.2], [1, 0.22, -0.2], [1, 0.24, 0.2]].forEach(([sx, y, z]) => { const d = part(b, cyl(0.03, 0.03, 0.012, 10), C.cream, sx * 0.163, y, z); d.rotation.z = Math.PI / 2; });
      part(b, box(0.03, 0.02, 0.2), C.coal, 0, 0.381, -0.05);
      const lt = letter(b, 0, 0.43, -0.05); lt.rotation.set(0, Math.PI / 2, 0.3); lt.scale.setScalar(1.5);
      [-1, 1].forEach(sx => {
        part(b, box(0.012, 0.11, 0.17), C.cream, sx * 0.166, 0.14, 0);
        const fl = part(b, box(0.012, 0.085, 0.085), C.creamDk, sx * 0.168, 0.185, 0); fl.rotation.x = Math.PI / 4;
        part(b, sph(0.022, 8, 6), C.berry, sx * 0.172, 0.15, 0);
      });
      flag(b, 0, 0.28, -0.31, 1).rotation.x = -0.5;
      const n = part(s, cyl(0.07, 0.09, 0.36, 8), C.fawn, 0, 0.88, 0.26); n.rotation.x = 0.35;
      part(s, cyl(0.06, 0.07, 0.2, 8), C.cream, 0, 0.84, 0.31).rotation.x = 0.35;
      deerHead(s, 0, 1.1, 0.34, 1.05, 1.0);
      return { k: 1.1 };
    },
    C(s) {
      const base = part(s, cyl(0.5, 0.54, 0.06, 14), C.mossDk, 0, 0.03, 0); base.scale.set(0.9, 1, 1.15);
      [[0.32, 0.38], [-0.34, -0.3], [0.3, -0.45]].forEach(([x, z], i) => part(s, ico(0.06 + i * 0.01), C.moss, x, 0.08, z).scale.set(1, 0.6, 1));
      part(s, sph(0.3, 14, 10), C.fawn, 0, 0.27, -0.04).scale.set(0.78, 0.62, 1.25);
      [[-1, 0.25], [1, 0.25], [-1, -0.32], [1, -0.32]].forEach(([sx, z]) => part(s, sph(0.08, 8, 6), C.fawnDk, sx * 0.2, 0.12, z).scale.set(0.8, 0.6, 1.5));
      [[-1, 0.3, 0.12], [-1, 0.22, -0.18], [1, 0.32, -0.08], [1, 0.22, 0.16], [-1, 0.33, -0.36], [1, 0.3, -0.34]].forEach(([sx, y, z]) => { const d = part(s, cyl(0.03, 0.03, 0.012, 10), C.cream, sx * 0.226, y, z); d.rotation.z = Math.PI / 2; d.rotation.y = sx * 0.1; });
      part(s, sph(0.05, 8, 6), C.cream, 0, 0.36, -0.42);
      const n = part(s, cyl(0.07, 0.09, 0.3, 8), C.fawn, 0, 0.5, 0.26); n.rotation.x = 0.3;
      deerHead(s, 0, 0.72, 0.33, 1.0, 0.75);
      const mb = tunnelBox(s, 0, 0.4, -0.2, 0.36, 0.2, 0.42, C.moss);
      part(mb, box(0.37, 0.03, 0.43), C.berry, 0, 0.01, 0);
      part(mb, box(0.02, 0.012, 0.16), C.coal, 0, 0.381, 0);
      const lt = letter(mb, 0, 0.41, 0); lt.rotation.set(0, Math.PI / 2, 0.15); lt.scale.setScalar(1.4);
      [-1, 1].forEach(sx => { part(mb, box(0.012, 0.1, 0.16), C.cream, sx * 0.186, 0.12, 0); part(mb, sph(0.022, 8, 6), C.berry, sx * 0.192, 0.13, 0); });
      flag(mb, 0.195, 0.04, -0.1, 1);
      [-1, 1].forEach(sx => part(s, box(0.02, 0.2, 0.06), C.berry, sx * 0.21, 0.36, -0.2).rotation.z = sx * 0.25);
      return { k: 1.15 };
    },
  },
};

export function build(id, v) {
  const fn = BUILD[id]?.[v];
  if (!fn) throw new Error(`unknown forest pick decor: ${id}/${v}`);
  const solid = new THREE.Group(), glow = new THREE.Group();
  const { k = 1, flat = true, rough = 0.9 } = fn(solid, glow);
  const out = new THREE.Group();
  const body = new THREE.Mesh(bakeGroup(solid), new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: flat, roughness: rough, metalness: 0 }));
  body.castShadow = true; body.receiveShadow = true;
  out.add(body);
  if (glow.children.length) out.add(new THREE.Mesh(bakeGroup(glow), new THREE.MeshBasicMaterial({ vertexColors: true })));
  out.traverse(o => { if (o.isMesh && o !== body) o.userData.noShadow = true; });
  out.scale.setScalar(k);
  return out;
}
