import * as THREE from 'three';

export const TRIM = 0xf0e8ff;
export const DOOR = 0x4a4060;

export function put(parent, geo, color, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color }));
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

export const shade = (hex, k) => new THREE.Color(hex).multiplyScalar(k).getHex();

function roundedRect(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + h - r); s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  s.lineTo(x + r, y + h); s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + r); s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}

export function rbox(parent, color, w, h, d, x, y, z, r = 0.07) {
  const b = Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3);
  const geo = new THREE.ExtrudeGeometry(roundedRect(w - 2 * b, h - 2 * b, b * 0.8), {
    depth: Math.max(d - 2 * b, 1e-3), bevelEnabled: true, bevelSize: b, bevelThickness: b, bevelSegments: 1, curveSegments: 3,
  });
  geo.translate(0, 0, -(d - 2 * b) / 2);
  return put(parent, geo, color, x, y, z);
}

export function arch(parent, color, w, h, d, x, y, z, bev = 0.03) {
  const r = w / 2, sh = new THREE.Shape();
  sh.moveTo(-r, 0); sh.lineTo(-r, h - r); sh.absarc(0, h - r, r, Math.PI, 0, true); sh.lineTo(r, 0); sh.lineTo(-r, 0);
  const geo = new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: true, bevelSize: bev, bevelThickness: bev, bevelSegments: 1, curveSegments: 6 });
  return put(parent, geo, color, x, y, z);
}

export function revolve(parent, color, profile, segments, x = 0, y = 0, z = 0) {
  const bottomUp = profile.map(([a, b]) => new THREE.Vector2(a, b)).reverse();
  return put(parent, new THREE.LatheGeometry(bottomUp, segments), color, x, y, z);
}

export function flaredRoof(parent, color, r, h, segments, x, y, z) {
  const profile = [[0.001, h], [0.26 * r, 0.7 * h], [0.6 * r, 0.34 * h], [0.9 * r, 0.1 * h], [r, 0.07 * h], [0.97 * r, -0.08 * h], [0.001, -0.08 * h]];
  return revolve(parent, color, profile, segments, x, y, z);
}

export function corners(parent, color, w, h, d, y) {
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) rbox(parent, color, 0.17, h, 0.17, sx * w / 2, y, sz * d / 2, 0.06);
}

export function facing(parent, ry) {
  const g = new THREE.Group();
  g.rotation.y = ry;
  parent.add(g);
  return g;
}
