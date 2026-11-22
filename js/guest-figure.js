import * as THREE from 'three';
export const GUEST_SHAPE = { head: 0.46, headY: 1.08, body: 0.34, bodyY: 0.48 };

function mergeGeos(geos) {
  const flat = geos.map(g => (g.index ? g.toNonIndexed() : g));
  const out = new THREE.BufferGeometry();
  for (const name of ['position', 'normal']) {
    const size = flat[0].attributes[name].itemSize;
    const arr = new Float32Array(flat.reduce((n, g) => n + g.attributes[name].count, 0) * size);
    let off = 0;
    for (const g of flat) { arr.set(g.attributes[name].array, off); off += g.attributes[name].count * size; }
    out.setAttribute(name, new THREE.BufferAttribute(arr, size));
  }
  return out;
}

const lighten = (hex, k) => new THREE.Color(hex).lerp(new THREE.Color(0xffffff), k).getHex();
const mat = (color, rough = 0.88) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0 });
const sph = (r, seg = r >= 0.2 ? 28 : r >= 0.06 ? 16 : 10) => new THREE.SphereGeometry(r, seg, Math.round(seg * 0.75));
const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
const place = (geo, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) =>
  geo.applyMatrix4(m4.compose(v.set(x, y, z), q.setFromEuler(e.set(rx, ry, rz)), sc.set(sx, sy, sz)));

function earGeos(kind, h) {
  const out = [];
  for (const s of [-1, 1]) {
    if (kind === 'point') out.push(['body', place(sph(0.3 * h), s * 0.62 * h, 0.92 * h, -0.08 * h, 0.85, 1.35, 0.45, 0, 0, -s * 0.35)], ['in', place(sph(0.2 * h), s * 0.62 * h, 0.9 * h, 0.02 * h, 0.6, 1.05, 0.3, 0, 0, -s * 0.35)]);
    else if (kind === 'round') out.push(['body', place(sph(0.3 * h), s * 0.72 * h, 0.78 * h, -0.05 * h, 1, 1, 0.5)], ['in', place(sph(0.18 * h), s * 0.72 * h, 0.78 * h, 0.07 * h, 1, 1, 0.35)]);
    else out.push(['body', place(sph(0.18 * h), s * 0.8 * h, 0.62 * h, 0, 1, 1, 0.6)]);
  }
  return out;
}

function accGeos(acc, h) {
  const out = [];
  const A = (k, geo) => out.push([k, geo]);
  if (acc === 'beanie') {
    A('acc', place(new THREE.SphereGeometry(1.04 * h, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), 0, 0.32 * h, 0, 1, 0.85, 1));
    A('acc', place(new THREE.TorusGeometry(0.98 * h, 0.13 * h, 8, 24), 0, 0.34 * h, 0, 1, 1, 1, Math.PI / 2));
    A('acc', place(sph(0.22 * h), 0, 1.22 * h, 0));
  } else if (acc === 'ribbon') {
    for (const s of [-1, 1]) A('acc', place(sph(0.3 * h), s * 0.42 * h, 0.98 * h, 0, 1, 0.72, 0.6));
    A('acc', place(sph(0.15 * h), 0, 0.98 * h, 0));
  } else if (acc === 'glasses') {
    for (const s of [-1, 1]) A('dark', place(new THREE.TorusGeometry(0.27 * h, 0.05 * h, 6, 18), s * 0.36 * h, 0.08 * h, 0.9 * h));
    A('dark', place(new THREE.BoxGeometry(0.2 * h, 0.05 * h, 0.05 * h), 0, 0.08 * h, 0.95 * h));
  } else if (acc === 'antler') {
    for (const s of [-1, 1]) {
      A('acc', place(new THREE.CapsuleGeometry(0.07 * h, 0.75 * h, 4, 8), s * 0.45 * h, 1.15 * h, -0.05 * h, 1, 1, 1, 0, 0, -s * 0.2));
      A('acc', place(new THREE.CapsuleGeometry(0.06 * h, 0.38 * h, 4, 8), s * 0.75 * h, 1.4 * h, -0.05 * h, 1, 1, 1, 0, 0, -s * 0.9));
    }
  } else if (acc === 'cap') {
    A('acc', place(new THREE.SphereGeometry(1.03 * h, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), 0, 0.36 * h, 0, 1, 0.8, 1));
    A('acc', place(sph(0.6 * h), 0, 0.4 * h, 0.82 * h, 1, 0.12, 0.8));
  } else if (acc === 'flower') {
    A('yellow', place(sph(0.17 * h), 0.55 * h, 0.82 * h, 0.35 * h));
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; A('acc', place(sph(0.14 * h), 0.55 * h + Math.cos(a) * 0.24 * h, 0.82 * h + Math.sin(a) * 0.24 * h, 0.3 * h)); }
  }
  return out;
}

function bodyAcc(acc, st) {
  const out = [], r = st.body, y = st.bodyY;
  if (acc === 'scarf') {
    out.push(['acc', place(new THREE.TorusGeometry(r * 0.72, r * 0.17, 8, 20), 0, y + r * 0.78, 0, 1, 1, 1, Math.PI / 2)]);
    out.push(['acc', place(new THREE.CapsuleGeometry(r * 0.14, r * 0.5, 4, 8), r * 0.3, y + r * 0.4, r * 0.62, 1, 1, 0.6, 0.2)]);
  } else if (acc === 'spike') {
    for (let i = 0; i < 9; i++) {
      const a = -1.1 + (i % 5) * 0.55, row = i < 5 ? 0 : 1;
      out.push(['dark', place(new THREE.ConeGeometry(r * 0.16, r * 0.5, 6), Math.sin(a) * r * 0.78, y + r * (0.25 + row * 0.45), -Math.cos(a) * r * 0.78, 1, 1, 1, -1.1, 0, -Math.sin(a) * 0.6)]);
    }
  }
  return out;
}

export function buildGuestFigure(def) {
  const st = GUEST_SHAPE;
  const h = st.head, hy = st.headY;
  const M = {
    body: mat(def.color), belly: mat(lighten(def.color, 0.6)), in: mat(lighten(def.color, 0.75)),
    acc: mat(def.hat), dark: mat(0x2b2220, 0.4), white: mat(0xffffff, 0.3), blush: mat(0xf4a7b5), yellow: mat(0xffd34d),
  };
  const parts = [];
  const P = (k, geo) => parts.push([k, geo]);
  P('body', place(sph(st.body), 0, st.bodyY, 0, 1, 0.95, 0.92));
  P('belly', place(sph(st.body * 0.72), 0, st.bodyY - st.body * 0.08, st.body * 0.38, 1, 1, 0.55));
  for (const s of [-1, 1]) P('body', place(sph(st.body * 0.3), s * st.body * 0.42, st.body * 0.22, st.body * 0.45, 1, 0.6, 1.2));
  for (const s of [-1, 1]) P('body', place(sph(st.body * 0.24), s * st.body * 0.5, st.bodyY + st.body * 0.05, st.body * 0.78));
  const head = [];
  const H = (k, geo) => head.push([k, geo]);
  H('body', sph(h));
  for (const s of [-1, 1]) {
    H('dark', place(sph(0.18 * h), s * 0.34 * h, 0.14 * h, 0.84 * h, 1, 1.15, 0.7));
    H('white', place(sph(0.07 * h), s * 0.34 * h + 0.06 * h, 0.24 * h, 0.96 * h));
    H('white', place(sph(0.035 * h), s * 0.34 * h - 0.06 * h, 0.06 * h, 0.98 * h));
    H('blush', place(sph(0.17 * h), s * 0.6 * h, -0.16 * h, 0.76 * h, 1, 0.6, 0.35, 0, s * 0.6));
  }
  H('belly', place(sph(0.3 * h), 0, -0.24 * h, 0.84 * h, 1.2, 0.75, 0.55));
  H('dark', place(sph(0.08 * h), 0, -0.12 * h, 1.0 * h, 1.3, 0.9, 0.9));
  head.push(...earGeos(def.ear, h), ...accGeos(def.acc, h));
  for (const [k, geo] of head) P(k, geo.translate(0, hy, 0));
  parts.push(...bodyAcc(def.acc, st));
  const g = new THREE.Group();
  const by = new Map();
  for (const [k, geo] of parts) (by.get(k) || by.set(k, []).get(k)).push(geo);
  for (const [k, geos] of by) {
    const mesh = new THREE.Mesh(geos.length > 1 ? mergeGeos(geos) : geos[0], M[k]);
    mesh.castShadow = k === 'body' || k === 'acc';
    g.add(mesh);
  }
  return g;
}
