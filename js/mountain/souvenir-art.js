import { colored, mergeColored } from './merge-colored.js';

export const SOUVENIR_INDOOR_IDS = Object.freeze(['snowglobe', 'hutmodel']);

const lambert = (THREE, c, o = {}) => new THREE.MeshLambertMaterial({ color: c, flatShading: true, ...o });

function snowglobe(THREE) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.19, 0.1, 14), lambert(THREE, 0x5e3b22));
  base.position.y = 0.05;
  const peak = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.16, 8), lambert(THREE, 0xf7fafd));
  peak.position.y = 0.18;
  const glass = new THREE.Mesh(new THREE.SphereGeometry(0.17, 18, 14), lambert(THREE, 0xcfe8ff, { transparent: true, opacity: 0.35, depthWrite: false }));
  glass.position.y = 0.26;
  g.add(base, peak, glass);
  return g;
}

const HUT = { roof: 0x34465c, snow: 0xf7fafd, trim: 0x2f2119, deck: 0x5a4030, glow: 0xffd27a };

function hutPart(THREE, size, at, tilt, hex) {
  const geo = colored(THREE, new THREE.BoxGeometry(...size), hex);
  return geo.applyMatrix4(new THREE.Matrix4().compose(
    new THREE.Vector3(...at),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, tilt)),
    new THREE.Vector3(1, 1, 1),
  ));
}

function hutmodel(THREE) {
  const base = 0.04, run = 0.17, rise = 0.34, depth = 0.3;
  const len = Math.hypot(run, rise), th = Math.atan2(rise, run);
  const parts = [hutPart(THREE, [0.5, base, 0.5], [0, base / 2, 0], 0, HUT.snow)];
  [-1, 1].forEach(sd => {
    const mid = [sd * run / 2, base + rise / 2, 0];
    const out = [sd * Math.sin(th), Math.cos(th)];
    const tilt = -sd * th;
    parts.push(hutPart(THREE, [len, 0.03, depth], mid, tilt, HUT.roof));
    parts.push(hutPart(THREE, [len * 0.92, 0.024, depth + 0.02], [mid[0] + out[0] * 0.027, mid[1] + out[1] * 0.027, 0], tilt, HUT.snow));
    parts.push(hutPart(THREE, [len, 0.034, 0.02], [mid[0], mid[1], depth / 2 + 0.006], tilt, HUT.trim));
  });
  parts.push(hutPart(THREE, [0.06, 0.03, depth + 0.02], [0, base + rise + 0.01, 0], 0, HUT.snow));
  parts.push(hutPart(THREE, [0.24, 0.02, 0.1], [0, base + 0.01, depth / 2 + 0.05], 0, HUT.deck));
  const solid = new THREE.Mesh(mergeColored(THREE, parts), new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  const tri = new THREE.Shape();
  tri.moveTo(-0.11, base + 0.005);
  tri.lineTo(0.11, base + 0.005);
  tri.lineTo(0, base + 0.26);
  const glow = new THREE.Mesh(new THREE.ShapeGeometry(tri), new THREE.MeshBasicMaterial({ color: HUT.glow }));
  glow.position.z = depth / 2 + 0.004;
  const g = new THREE.Group();
  g.add(solid, glow);
  return g;
}

export function buildSouvenir(THREE, id) {
  return id === 'snowglobe' ? snowglobe(THREE) : hutmodel(THREE);
}

export function souvenirOutdoorMesh(THREE, id) {
  if (id !== 'summitflag') return null;
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 2.2, 8), lambert(THREE, 0x5e3b22));
  pole.position.y = 1.1;
  const flag = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.55, 0.04), lambert(THREE, 0xd2463a));
  flag.position.set(0.47, 1.85, 0);
  const cairn = new THREE.Mesh(new THREE.IcosahedronGeometry(0.35, 1), lambert(THREE, 0x8d95a3));
  cairn.scale.y = 0.6;
  cairn.position.y = 0.15;
  g.add(pole, flag, cairn);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}
