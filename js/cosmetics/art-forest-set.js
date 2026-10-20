import { MP } from './tool-skins-maple.js';
import { HN } from './tool-skins-honey.js';
import { KT } from './tool-skins-kitty.js';
import { mapleLeafShape } from './tool-skins-extra-kit.js';

const TAU = Math.PI * 2;

function flattenInto(THREE, g, src) {
  src.updateMatrixWorld(true);
  const out = [];
  src.traverse(o => { if (o.isMesh) out.push(o); });
  out.forEach(o => {
    const m = new THREE.Mesh(o.geometry.clone().applyMatrix4(o.matrixWorld), o.material);
    o.geometry.dispose();
    m.castShadow = true; g.add(m);
  });
}

export function mapleLeafGeo(THREE, r, depth) {
  const geo = new THREE.ExtrudeGeometry(mapleLeafShape(THREE, r, 60), { depth, bevelEnabled: false, curveSegments: 2 });
  geo.translate(0, 0, -depth / 2); return geo;
}

export function buildAcornCap(THREE, g, k, h) {
  const r = k.HR, src = new THREE.Group();
  const tilt = new THREE.Group(); tilt.position.set(r * 0.12, r * 0.86, r * 0.1); tilt.rotation.set(0.25, 0, -0.28); src.add(tilt);
  const cap = new THREE.Mesh(new THREE.IcosahedronGeometry(r * 0.44, 1), h.clay(MP.cap)); cap.scale.set(1, 0.55, 1); tilt.add(cap);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(r * 0.42, r * 0.07, 5, 16), h.clay(0x6a462b)); rim.position.y = -r * 0.02; rim.rotation.x = Math.PI / 2; tilt.add(rim);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.04, r * 0.06, r * 0.2, 5), h.clay(MP.barkD)); stem.position.y = r * 0.3; tilt.add(stem);
  const lf = new THREE.Mesh(mapleLeafGeo(THREE, r * 0.22, r * 0.04), h.clay(MP.orange)); lf.position.set(r * 0.2, r * 0.26, r * 0.05); lf.rotation.set(-0.9, 0.3, -0.7); tilt.add(lf);
  flattenInto(THREE, g, src);
}

export function buildBeeBand(THREE, g, k, h) {
  const r = k.HR, src = new THREE.Group();
  const band = new THREE.Group(); band.rotation.x = 0.5; src.add(band);
  band.add(new THREE.Mesh(new THREE.TorusGeometry(r * 1.03, r * 0.055, 5, 26, Math.PI), h.clay(HN.choco)));
  [-1, 1].forEach(s => {
    const a = Math.PI / 2 + s * 0.42, bx = Math.cos(a) * r * 1.03, by = Math.sin(a) * r * 1.03;
    const pts = [new THREE.Vector3(bx, by, 0), new THREE.Vector3(bx - s * r * 0.12, by + r * 0.32, r * 0.05), new THREE.Vector3(bx - s * r * 0.32, by + r * 0.5, r * 0.02)];
    band.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, r * 0.025, 5), h.clay(HN.choco)));
    const e = pts[2];
    const ball = new THREE.Mesh(new THREE.SphereGeometry(r * 0.12, 10, 8), h.clay(HN.honey, false)); ball.position.copy(e); band.add(ball);
    const st = new THREE.Mesh(new THREE.TorusGeometry(r * 0.112, r * 0.025, 4, 12), h.clay(HN.choco)); st.position.copy(e); st.rotation.y = Math.PI / 2; band.add(st);
  });
  flattenInto(THREE, g, src);
}

export function buildKittyPack(THREE, g, k, h) {
  const R = k.R, s = R * 0.42, src = new THREE.Group(); src.position.y = -R * 0.08;
  const add = (geo, c, x, y, z, flat = true) => { const m = new THREE.Mesh(geo, h.clay(c, flat)); m.position.set(x, y, z); src.add(m); return m; };
  add(new THREE.SphereGeometry(s, 16, 12), KT.ginger, 0, 0, -s * 0.35, false).scale.set(1.05, 1, 0.62);
  [-1, 1].forEach(sx => {
    add(new THREE.ConeGeometry(s * 0.36, s * 0.55, 4), KT.ginger, sx * s * 0.55, s * 0.9, -s * 0.35).rotation.z = -sx * 0.3;
    add(new THREE.ConeGeometry(s * 0.2, s * 0.32, 4), KT.pink, sx * s * 0.53, s * 0.86, -s * 0.52).rotation.z = -sx * 0.3;
    add(new THREE.SphereGeometry(s * 0.09, 6, 5), KT.brown, sx * s * 0.34, s * 0.12, -s * 0.97);
    [0, 1].forEach(j => { add(new THREE.BoxGeometry(s * 0.45, s * 0.03, s * 0.03), KT.brown, sx * s * 0.5, -s * 0.12 + j * s * 0.1, -s * 0.9).rotation.z = sx * (j ? -0.15 : 0.15); });
  });
  add(new THREE.SphereGeometry(s * 0.3, 8, 6), KT.cream, 0, -s * 0.18, -s * 0.9).scale.set(1.3, 0.8, 0.5);
  add(new THREE.SphereGeometry(s * 0.08, 6, 5), KT.pink, 0, -s * 0.05, -s * 1.02);
  flattenInto(THREE, g, src);
}

export function buildNestPack(THREE, g, k, h) {
  const R = k.R, s = R * 0.45, src = new THREE.Group(); src.position.set(0, R * 0.32, -R * 0.05); src.rotation.x = -0.35;
  const add = (geo, c, x, y, z, flat = true) => { const m = new THREE.Mesh(geo, h.clay(c, flat)); m.position.set(x, y, z); src.add(m); return m; };
  add(new THREE.SphereGeometry(s, 12, 8), 0x9a6b3e, 0, -s * 0.18, -s * 0.4).scale.set(1, 0.5, 0.85);
  add(new THREE.CylinderGeometry(s * 0.88, s * 0.88, s * 0.04, 14), 0x5e3f22, 0, s * 0.02, -s * 0.4).scale.set(1, 1, 0.85);
  add(new THREE.TorusGeometry(s * 0.95, s * 0.16, 5, 16), 0x7d5530, 0, 0, -s * 0.4).rotation.x = Math.PI / 2;
  for (let i = 0; i < 7; i++) { const a = i * TAU / 7 + 0.2; add(new THREE.BoxGeometry(s * 0.5, s * 0.05, s * 0.05), 0xb08050, Math.cos(a) * s * 0.95, s * 0.06, -s * 0.4 + Math.sin(a) * s * 0.8).rotation.set(0.2, -a + Math.PI / 2 + 0.5, 0.3); }
  add(new THREE.SphereGeometry(s * 0.24, 10, 8), 0xa9d8e8, s * 0.42, s * 0.12, -s * 0.5, false).scale.y = 1.3;
  const by = s * 0.12, bz = -s * 0.45, bx = -s * 0.12;
  add(new THREE.SphereGeometry(s * 0.36, 12, 10), 0xf6d35a, bx, by, bz, false);
  add(new THREE.SphereGeometry(s * 0.28, 12, 10), 0xf6d35a, bx, by + s * 0.42, bz - s * 0.05, false);
  add(new THREE.ConeGeometry(s * 0.08, s * 0.16, 5), 0xf08a2c, bx, by + s * 0.4, bz - s * 0.36).rotation.x = -Math.PI / 2;
  [-1, 1].forEach(sx => add(new THREE.SphereGeometry(s * 0.045, 6, 5), 0x3a3a48, bx + sx * s * 0.12, by + s * 0.5, bz - s * 0.28));
  add(new THREE.ConeGeometry(s * 0.05, s * 0.14, 4), 0xf6d35a, bx + s * 0.04, by + s * 0.74, bz - s * 0.05);
  flattenInto(THREE, g, src);
}
