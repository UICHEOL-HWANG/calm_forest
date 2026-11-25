import * as THREE from 'three';
import { plushMat } from '../animal-faces.js';

export const PEST_SCALE = 2.2;

export const mat = (c, extra = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, metalness: 0, ...extra });
export const glow = (c, k = 0.9) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: k, roughness: 0.35 });
export const plush = (c, extra = {}) => Object.assign(plushMat(c), extra);
export const gloss = (c, extra = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.3, metalness: 0, ...extra });
export const M = (geo, m, parent, p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1], shadow = true) => {
  const o = new THREE.Mesh(geo, m); o.position.set(...p); o.rotation.set(...r); o.scale.set(...s); o.castShadow = shadow; parent.add(o); return o;
};
export const put = (parent, geo, m, p = [0, 0, 0], s = [1, 1, 1], r = [0, 0, 0], shadow = true) => M(geo, m, parent, p, r, s, shadow);
export const G = (parent, p = [0, 0, 0], r = [0, 0, 0]) => { const g = new THREE.Group(); g.position.set(...p); g.rotation.set(...r); parent.add(g); return g; };
export const pair = fn => [-1, 1].map(fn);
export const MOVING = new Set(['approach', 'carry', 'flee', 'feint']);
export const BLUSH = 0xf6aab8;

export const S = (r, w = r >= 0.15 ? 18 : r >= 0.08 ? 14 : r >= 0.04 ? 10 : 7) => new THREE.SphereGeometry(r, w, Math.max(4, Math.round(w * 0.7)));

const sm = (a, b, u) => { const t = Math.min(1, Math.max(0, u)); return a + (b - a) * t * t * (3 - 2 * t); };
export const keys = (ks) => (u) => { for (let i = 1; i < ks.length; i++) if (u <= ks[i][0]) return sm(ks[i - 1][1], ks[i][1], (u - ks[i - 1][0]) / (ks[i][0] - ks[i - 1][0])); return ks[ks.length - 1][1]; };

export function taper(parent, pts, radFn, m, { segs = 10, radial = 8, caps = true } = {}) {
  const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)));
  const geo = new THREE.TubeGeometry(curve, segs, 1, radial, false);
  const pos = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i <= segs; i++) {
    const u = i / segs, c = curve.getPointAt(u), r = radFn(u);
    for (let j = 0; j <= radial; j++) {
      const k = i * (radial + 1) + j;
      v.fromBufferAttribute(pos, k).sub(c).multiplyScalar(r).add(c);
      pos.setXYZ(k, v.x, v.y, v.z);
    }
  }
  geo.computeVertexNormals();
  const o = put(parent, geo, m);
  if (caps) {
    const r0 = radFn(0), r1 = Math.max(0.004, radFn(1));
    put(parent, new THREE.SphereGeometry(r0, radial, Math.max(4, radial - 2)), m, curve.getPointAt(0).toArray());
    put(parent, new THREE.SphereGeometry(r1, radial, Math.max(4, radial - 2)), m, curve.getPointAt(1).toArray());
  }
  return o;
}

export const lathe = (profile, segs = 16) => new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), segs);

export function crystal(r, h) {
  const prism = new THREE.CylinderGeometry(r, r * 1.08, h, 6); prism.translate(0, h / 2, 0);
  const tip = new THREE.ConeGeometry(r, r * 1.7, 6); tip.translate(0, h + r * 0.85, 0);
  return [prism, tip];
}

export function crystalCluster(parent, p, list, k = 0.35) {
  const cl = G(parent, p);
  list.forEach(([x, y, z, r, h, rz, rx, c]) => {
    const part = G(cl, [x, y, z], [rx, 0, rz]);
    const m = glow(c, k);
    crystal(r, h).forEach(geo => M(geo, m, part));
  });
  return cl;
}

export const US = (r, w = r >= 0.5 ? 20 : r >= 0.2 ? 12 : 8) => new THREE.SphereGeometry(r, w, Math.max(4, Math.round(w * 0.72)));

export function uPatch(g, dx, dy, dz, w, h, color, roll = 0, sink = 0.94, thick = 0.12) {
  const d = new THREE.Vector3(dx, dy, dz).normalize();
  const m = new THREE.Mesh(US(1, 10), plush(color));
  m.position.copy(d).multiplyScalar(sink); m.lookAt(d.clone().multiplyScalar(3)); m.rotateZ(roll);
  m.scale.set(w, h, thick); g.add(m); return m;
}

export function uEyes(g, { x, y, z, r, color = 0x2a1e22, ring = false }) {
  const hi = gloss(0xffffff), pupil = gloss(color), shutM = gloss(0x3a2a30);
  const open = [], shut = [];
  pair(s => {
    const e = G(g, [s * x, y, z]);
    if (ring) put(e, US(r * 1.12, 10), plush(0xffffff), [0, 0, -r * 0.4], [1, 1, 1], [0, 0, 0], false);
    put(e, US(r, 10), pupil, [0, 0, 0], [1, 1, 1], [0, 0, 0], false);
    put(e, US(r * 0.36, 6), hi, [r * 0.34, r * 0.42, r * 0.78], [1, 1, 1], [0, 0, 0], false);
    put(e, US(r * 0.16, 5), hi, [-r * 0.3, -r * 0.3, r * 0.86], [1, 1, 1], [0, 0, 0], false);
    open.push(e);
    const d = new THREE.Vector3(s * x, y, z).normalize();
    const c = new THREE.Mesh(new THREE.TorusGeometry(r * 0.85, r * 0.2, 4, 10, Math.PI), shutM);
    c.position.copy(d).multiplyScalar(1.0); c.lookAt(d.clone().multiplyScalar(3)); c.rotateZ(Math.PI);
    g.add(c); shut.push(c);
  });
  return { open, shut };
}

export function look(f, mode) {
  const closed = mode === 'closed';
  f.open.forEach(e => { e.visible = !closed; const k = mode === 'wide' ? 1.2 : 1; e.scale.set(k, mode === 'half' ? 0.55 : k, k); });
  f.shut.forEach(c => { c.visible = closed; });
}

export function uEar(g, side, { x, y, z, outer, inner, w = 0.3, h = 1.35, tilt = 0.35, lean = 0 }) {
  const e = G(g, [side * x, y, z], [lean, 0, -side * tilt]);
  put(e, US(w, 12), plush(outer), [0, 0, 0], [0.9, h, 0.45]);
  put(e, US(w * 0.7, 12), plush(inner), [0, -0.02, w * 0.42], [0.65, h * 0.78, 0.32]);
  return e;
}

export function uSmile(g, x, y, z, r, color = 0x7a4a52) {
  return put(g, new THREE.TorusGeometry(r, r * 0.2, 4, 10, Math.PI), gloss(color, { roughness: 0.6 }), [x, y, z], [1, 1, 1], [0, 0, Math.PI], false);
}

export function unitHead(parent, at, R, build) {
  const pivot = G(parent, at);
  const u = new THREE.Group();
  const out = build(u);
  u.scale.setScalar(R);
  pivot.add(u);
  return { pivot, u, ...out };
}

export function wing(pv, sd, tilt, sweep, dihedral) {
  pv.rotation.order = 'ZYX';
  pv.rotation.set(tilt, sd * sweep, sd * dihedral);
}

export function oreChunkInto(g) {
  M(new THREE.IcosahedronGeometry(0.15, 0), mat(0x5a5854, { flatShading: true }), g);
  M(new THREE.IcosahedronGeometry(0.085, 0), glow(0x5ad0e0, 0.9), g, [0.07, 0.08, 0.05]);
  M(new THREE.IcosahedronGeometry(0.05, 0), glow(0x5ad0e0, 0.9), g, [-0.08, 0.07, 0.06]);
  return g;
}

export function baitInto(g) {
  M(new THREE.CylinderGeometry(0.06, 0.08, 0.16, 8), mat(0xeee3c8), g, [0, 0.08, 0]);
  M(new THREE.SphereGeometry(0.17, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xc4553c), g, [0, 0.15, 0], [0, 0, 0], [1, 0.7, 1]);
  return g;
}
