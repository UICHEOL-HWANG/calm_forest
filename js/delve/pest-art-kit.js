import * as THREE from 'three';

export const PEST_SCALE = 2.2;

export const mat = (c, extra = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, metalness: 0, ...extra });
export const flat = (c, extra = {}) => mat(c, { flatShading: true, ...extra });
export const glow = (c, k = 0.9) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: k, roughness: 0.35 });
export const M = (geo, m, parent, p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1], shadow = true) => {
  const o = new THREE.Mesh(geo, m); o.position.set(...p); o.rotation.set(...r); o.scale.set(...s); o.castShadow = shadow; parent.add(o); return o;
};
export const G = (parent, p = [0, 0, 0], r = [0, 0, 0]) => { const g = new THREE.Group(); g.position.set(...p); g.rotation.set(...r); parent.add(g); return g; };
export const pair = fn => [-1, 1].map(fn);

export function teardrop(r, len, tip = 0.3, flatBottom = 0.3) {
  const g = new THREE.SphereGeometry(r, 14, 10);
  const p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const zN = v.z / r, back = Math.max(0, -zN);
    const k = 1 - (1 - tip) * Math.pow(back, 1.4);
    v.x *= k; v.y *= k;
    if (v.y < 0) v.y *= 1 - flatBottom;
    v.z = zN * len / 2;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

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

export function eye(parent, p, r) {
  const g = G(parent, p);
  M(new THREE.SphereGeometry(r, 10, 8), mat(0x1c1816, { roughness: 0.4 }), g, [0, 0, 0], [0, 0, 0], [1, 1, 0.8], false);
  g.userData.hi = M(new THREE.SphereGeometry(r * 0.34, 6, 5), new THREE.MeshBasicMaterial({ color: 0xffffff }), g, [r * 0.3, r * 0.38, r * 0.62], [0, 0, 0], [1, 1, 1], false);
  return g;
}

export function lid(e, r, color) {
  e.userData.lid = M(new THREE.SphereGeometry(r * 1.12, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat(color), e, [0, 0, 0], [-1.1, 0, 0], [1, 1, 0.85], false);
}

export function face(parent, sd, p, r, skin, browColor) {
  const e = eye(parent, p, r);
  lid(e, r, skin);
  const y = p[1] + r * 1.5;
  const b = M(new THREE.BoxGeometry(r * 1.9, r * 0.53, r * 0.57), mat(browColor), parent, [p[0], y, p[2] + r * 0.2], [0, 0, 0], [1, 1, 1], false);
  return { e, brow: { b, sd, y } };
}

export function setEyes(eyes, mode) {
  eyes.forEach(e => {
    e.scale.set(1, 1, 1);
    e.userData.hi.visible = true;
    const l = e.userData.lid;
    if (l) l.rotation.x = -1.1;
    if (mode === 'closed') {
      if (l) l.rotation.x = 1.45; else { e.scale.y = 0.14; e.userData.hi.visible = false; }
    } else if (mode === 'half') {
      if (l) l.rotation.x = 0.05; else e.scale.y = 0.6;
    } else if (mode === 'wide') {
      e.scale.setScalar(1.3);
      if (l) l.rotation.x = -1.4;
    }
  });
}

export function browPose(brows, mood) {
  brows.forEach(({ b, sd, y }) => {
    b.position.y = y; b.rotation.z = 0;
    if (mood === 'scheme') b.rotation.z = sd * 0.45;
    if (mood === 'shock') { b.position.y = y + 0.025; b.rotation.z = -sd * 0.25; }
    if (mood === 'sad') b.rotation.z = -sd * 0.4;
  });
}

export function wing(pv, sd, tilt, sweep, dihedral) {
  pv.rotation.order = 'ZYX';
  pv.rotation.set(tilt, sd * sweep, sd * dihedral);
}

export function oreChunkInto(g) {
  M(new THREE.IcosahedronGeometry(0.15, 0), flat(0x5a5854), g);
  M(new THREE.IcosahedronGeometry(0.085, 0), glow(0x5ad0e0, 0.9), g, [0.07, 0.08, 0.05]);
  M(new THREE.IcosahedronGeometry(0.05, 0), glow(0x5ad0e0, 0.9), g, [-0.08, 0.07, 0.06]);
  return g;
}

export function baitInto(g) {
  M(new THREE.CylinderGeometry(0.06, 0.08, 0.16, 8), mat(0xeee3c8), g, [0, 0.08, 0]);
  M(new THREE.SphereGeometry(0.17, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xc4553c), g, [0, 0.15, 0], [0, 0, 0], [1, 0.7, 1]);
  return g;
}

export const MOVING = new Set(['approach', 'carry', 'flee']);
