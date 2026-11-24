import * as THREE from 'three';
import { mat, glow, M, crystalCluster, oreChunkInto, baitInto, PEST_SCALE } from './pest-art-kit.js';
import { axolotl, crab, bat, grub } from './pest-art-thieves.js';
import { moth, mole, dormouse, roller } from './pest-art-new.js';

export function makeOreChunk() {
  return oreChunkInto(new THREE.Group());
}

const BUILD = { axolotl, crab, bat, grub, moth, mole, dormouse, roller };

export function makePest(kind, opts = {}) {
  const p = BUILD[kind](opts);
  p.g.scale.setScalar(PEST_SCALE);
  p.pose('idle', 0);
  return p;
}

export function makeMoleHole() {
  const g = new THREE.Group();
  const dirt = mat(0x7a6048, { flatShading: true });
  M(new THREE.TorusGeometry(0.42, 0.14, 5, 14), dirt, g, [0, 0.05, 0], [-Math.PI / 2, 0, 0], [1, 1, 0.8]);
  M(new THREE.CircleGeometry(0.4, 14), new THREE.MeshBasicMaterial({ color: 0x080606 }), g, [0, 0.07, 0], [-Math.PI / 2, 0, 0], [1, 1, 1], false);
  [[0.62, 0.06, 0.2, 0.12], [-0.58, 0.05, 0.28, 0.1], [0.24, 0.05, -0.62, 0.11], [-0.4, 0.06, -0.5, 0.09]].forEach(([x, y, z, r], i) => M(new THREE.IcosahedronGeometry(r, 0), dirt, g, [x, y, z], [i, i * 2, 0], [1, 0.7, 1], false));
  return g;
}

export function makeGlowCrystal() {
  const g = new THREE.Group();
  M(new THREE.IcosahedronGeometry(0.4, 0), mat(0x4a4660, { flatShading: true }), g, [0, 0.12, -0.1], [0.3, 0.5, 0], [1.3, 0.5, 1]);
  crystalCluster(g, [0, 0.15, 0], [[0, 0, 0, 0.16, 0.8, 0, 0, 0x9be3ee], [0.28, 0, 0.08, 0.12, 0.55, -0.4, 0.1, 0xc7a6f0], [-0.24, 0, 0.06, 0.11, 0.45, 0.45, 0.1, 0x9be3ee], [0.08, 0, 0.22, 0.08, 0.3, -0.15, 0.5, 0xc7a6f0]], 1.4);
  return g;
}

export function makePuddle(r = 0.75) {
  const g = new THREE.Group();
  const water = new THREE.Mesh(new THREE.CircleGeometry(r, 28), new THREE.MeshStandardMaterial({ color: 0x2f6a80, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.97 }));
  water.rotation.x = -Math.PI / 2; water.position.y = 0.04; water.scale.set(1, 0.72, 1); g.add(water);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(r, 0.06, 6, 28), mat(0x4a4a50, { flatShading: true }));
  rim.rotation.x = -Math.PI / 2; rim.scale.set(1, 0.72, 1); rim.position.y = 0.04; g.add(rim);
  const ring = new THREE.Mesh(new THREE.RingGeometry(r * 0.3, r * 0.34, 24), new THREE.MeshBasicMaterial({ color: 0xbfe4ee, transparent: true, opacity: 0.6 }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05; g.add(ring);
  return g;
}

export function makeBurrow() {
  const g = new THREE.Group();
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.42, 18), new THREE.MeshBasicMaterial({ color: 0x050608 }));
  hole.rotation.x = -Math.PI / 2; hole.position.y = 0.02; g.add(hole);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.08, 6, 18), mat(0x4a4440, { flatShading: true }));
  rim.rotation.x = -Math.PI / 2; rim.position.y = 0.02; g.add(rim);
  return g;
}

export function makeTrail(points) {
  const g = new THREE.Group();
  points.forEach(([x, z], i) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: 0xd9f27a, transparent: true, opacity: 0.35 + 0.6 * (i / (points.length - 1)) }));
    m.position.set(x, 0.06, z); g.add(m);
  });
  return g;
}

export function makeRing(r = 0.5) {
  const m = new THREE.Mesh(new THREE.RingGeometry(r * 0.84, r, 32), new THREE.MeshBasicMaterial({ color: 0xffe48a, transparent: true, opacity: 0.95, side: THREE.DoubleSide }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.04;
  return m;
}

export function makeBait() {
  return baitInto(new THREE.Group());
}

export function emojiBubble(txt, size = 0.85) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = 'rgba(226,196,158,.96)';
  x.beginPath(); x.moveTo(36, 8); x.arcTo(118, 8, 118, 96, 26); x.arcTo(118, 96, 10, 96, 26); x.arcTo(10, 96, 10, 8, 26); x.arcTo(10, 8, 118, 8, 26); x.closePath(); x.fill();
  x.beginPath(); x.moveTo(52, 94); x.lineTo(64, 120); x.lineTo(76, 94); x.fill();
  x.font = '60px "Apple Color Emoji","Segoe UI Emoji",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(txt, 64, 54);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true, toneMapped: false, fog: false }));
  sp.scale.setScalar(size); sp.renderOrder = 10; return sp;
}

export function makeShaft() {
  const g = new THREE.Group();
  const wood = mat(0x7a5232, { flatShading: true });
  const hole = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.02, 1.3), new THREE.MeshBasicMaterial({ color: 0x050608 }));
  hole.position.y = 0.02; g.add(hole);
  for (const [x, z, w, d] of [[0, 0.7, 1.6, 0.14], [0, -0.7, 1.6, 0.14], [0.7, 0, 0.14, 1.6], [-0.7, 0, 0.14, 1.6]]) M(new THREE.BoxGeometry(w, 0.16, d), wood, g, [x, 0.08, z]);
  for (const x of [-0.6, 0.6]) M(new THREE.BoxGeometry(0.12, 1.3, 0.12), wood, g, [x, 0.65, -0.7]);
  M(new THREE.BoxGeometry(1.4, 0.12, 0.12), wood, g, [0, 1.3, -0.7]);
  const rail = mat(0x9a7a52, { flatShading: true });
  for (const x of [-0.25, 0.25]) M(new THREE.BoxGeometry(0.06, 0.06, 1.0), rail, g, [x, 0.1, 0], [-0.35, 0, 0]);
  for (let i = 0; i < 4; i++) M(new THREE.BoxGeometry(0.56, 0.05, 0.06), rail, g, [0, 0.12 - i * 0.02, 0.35 - i * 0.22]);
  return g;
}

export function makeLadderUp() {
  const g = new THREE.Group();
  const wood = mat(0x8a6038, { flatShading: true });
  for (const x of [-0.3, 0.3]) M(new THREE.BoxGeometry(0.08, 2.6, 0.08), wood, g, [x, 1.3, 0]);
  for (let i = 0; i < 6; i++) M(new THREE.BoxGeometry(0.6, 0.06, 0.08), wood, g, [0, 0.3 + i * 0.4, 0]);
  return g;
}

export function makeRock(vein, theme) {
  const g = new THREE.Group();
  const rock = mat(theme.rock, { flatShading: true });
  M(new THREE.IcosahedronGeometry(0.45, 0), rock, g, [0, 0.32, 0], [0.3, 0.6, 0], [1.1, 0.8, 1]);
  M(new THREE.IcosahedronGeometry(0.3, 0), rock, g, [0.28, 0.2, 0.15], [0.8, 0.2, 0.4]);
  if (vein) for (const [x, y, z] of [[0.1, 0.55, 0.25], [-0.25, 0.4, 0.2], [0.3, 0.35, -0.1]]) M(new THREE.IcosahedronGeometry(0.09, 0), glow(0xffd27a, 0.35), g, [x, y, z]);
  return g;
}

export function makeLift() {
  const g = new THREE.Group(), cage = new THREE.Group();
  g.add(cage);
  const wood = mat(0x8a6038, { flatShading: true }), rim = mat(0x5f4630, { flatShading: true }), rope = mat(0xc8b088);
  const hole = new THREE.Mesh(new THREE.CircleGeometry(1.05, 20), new THREE.MeshBasicMaterial({ color: 0x050608 }));
  hole.rotation.x = -Math.PI / 2; hole.position.y = 0.01; g.add(hole);
  for (const x of [-1.1, 1.1]) M(new THREE.BoxGeometry(0.2, 3.2, 0.2), wood, g, [x, 1.6, 0]);
  M(new THREE.BoxGeometry(2.6, 0.22, 0.22), wood, g, [0, 3.2, 0]);
  const crank = new THREE.Group(); crank.position.set(1.55, 0.95, 0); g.add(crank);
  M(new THREE.CylinderGeometry(0.28, 0.28, 0.5, 10), rim, crank, [0, 0, 0], [0, 0, Math.PI / 2]);
  M(new THREE.BoxGeometry(0.08, 0.7, 0.08), wood, crank, [0.3, 0.3, 0]);
  for (const z of [-0.3, 0.3]) M(new THREE.BoxGeometry(0.18, 1.0, 0.18), wood, g, [1.55, 0.5, z]);
  M(new THREE.CylinderGeometry(0.85, 0.72, 0.8, 12, 1, true), mat(0x9a7448, { flatShading: true, side: THREE.DoubleSide }), cage, [0, 0.42, 0]);
  M(new THREE.CylinderGeometry(0.72, 0.72, 0.08, 12), mat(0x7a5a38, { flatShading: true }), cage, [0, 0.06, 0]);
  for (const y of [0.2, 0.62]) M(new THREE.TorusGeometry(0.8 - (0.62 - y) * 0.15, 0.04, 6, 16), rim, cage, [0, y, 0], [Math.PI / 2, 0, 0]);
  for (const a of [0, 2.1, 4.2]) M(new THREE.BoxGeometry(0.03, 2.6, 0.03), rope, cage, [Math.cos(a) * 0.4, 2.1, Math.sin(a) * 0.4], [-Math.sin(a) * 0.15, 0, Math.cos(a) * 0.15]);
  const line = M(new THREE.CylinderGeometry(0.03, 0.03, 1, 6), rope, g, [0, 0, 0], [0, 0, 0], [1, 1, 1], false);
  M(new THREE.BoxGeometry(0.16, 0.22, 0.16), mat(0x3a3330), g, [-1.1, 2.6, 0.2]);
  M(new THREE.SphereGeometry(0.07, 8, 6), glow(0xffc66a, 2), g, [-1.1, 2.58, 0.2], [0, 0, 0], [1, 1, 1], false);
  const lamp = new THREE.PointLight(0xffc27a, 6, 9, 1.2); lamp.position.set(-1.1, 2.6, 0.6); g.add(lamp);
  const setRide = (k) => {
    const sink = Math.max(0, (k - 0.3) / 0.7);
    cage.position.y = -2.8 * sink * sink;
    const bot = cage.position.y + 3.4;
    line.scale.y = Math.max(0.01, 3.2 - bot); line.position.y = (3.2 + bot) / 2;
    crank.rotation.x = k * 9;
  };
  setRide(0);
  g.userData = { cage, setRide };
  return g;
}
