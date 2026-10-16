import { colored, mergeColored } from './merge-colored.js';
import { SLED_SKINS } from './sled-skins.js';

export const SLED_DECK_TOP = 0.22;

const PARTS = [
  [[0.86, 0.07, 1.36], [0, 0.185, -0.05], 0, 'wood'],
  [[0.06, 0.08, 1.2], [-0.4, 0.25, -0.1], 0, 'woodDark'],
  [[0.06, 0.08, 1.2], [0.4, 0.25, -0.1], 0, 'woodDark'],
  [[0.06, 0.05, 1.5], [-0.34, 0.025, 0], 0, 'runner'],
  [[0.06, 0.05, 1.5], [0.34, 0.025, 0], 0, 'runner'],
  [[0.05, 0.13, 0.05], [-0.34, 0.09, -0.5], 0, 'woodDark'],
  [[0.05, 0.13, 0.05], [0.34, 0.09, -0.5], 0, 'woodDark'],
  [[0.05, 0.13, 0.05], [-0.34, 0.09, 0.45], 0, 'woodDark'],
  [[0.05, 0.13, 0.05], [0.34, 0.09, 0.45], 0, 'woodDark'],
  [[0.06, 0.05, 0.42], [-0.34, 0.15, 0.86], -0.9, 'runner'],
  [[0.06, 0.05, 0.42], [0.34, 0.15, 0.86], -0.9, 'runner'],
  [[0.74, 0.05, 0.05], [0, 0.29, 0.98], 0, 'runner'],
];

const STARS = [[-0.22, -0.4], [0.18, -0.15], [-0.08, 0.2], [0.24, 0.42], [-0.26, 0.5]];

function part(THREE, [size, at, tilt, hex]) {
  const g = colored(THREE, new THREE.BoxGeometry(...size), hex);
  return g.applyMatrix4(new THREE.Matrix4().compose(
    new THREE.Vector3(...at),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt, 0, 0)),
    new THREE.Vector3(1, 1, 1),
  ));
}

export function buildSledGeometry(THREE, skin = 'basic') {
  const pal = SLED_SKINS[skin] || SLED_SKINS.basic;
  const parts = PARTS.map(([s, a, t, key]) => part(THREE, [s, a, t, pal[key]]));
  const stars = pal.stars ? STARS.map(([x, z]) => part(THREE, [[0.07, 0.012, 0.07], [x, 0.226, z], 0, pal.runner])) : [];
  return mergeColored(THREE, [...parts, ...stars]);
}

export function buildSledMesh(THREE, skin = 'basic') {
  const mesh = new THREE.Mesh(buildSledGeometry(THREE, skin), new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  mesh.rotation.order = 'YXZ';
  mesh.visible = false;
  return mesh;
}

export function setSledSkin(mesh, THREE, skin) {
  const old = mesh.geometry;
  mesh.geometry = buildSledGeometry(THREE, skin);
  old.dispose();
}
