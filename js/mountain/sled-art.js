import { colored, mergeColored } from './merge-colored.js';

export const SLED_DECK_TOP = 0.22;

const WOOD = 0xb5793f, WOOD_DARK = 0x8a5530, RUNNER = 0xc8463c;

const PARTS = [
  [[0.86, 0.07, 1.36], [0, 0.185, -0.05], 0, WOOD],
  [[0.06, 0.08, 1.2], [-0.4, 0.25, -0.1], 0, WOOD_DARK],
  [[0.06, 0.08, 1.2], [0.4, 0.25, -0.1], 0, WOOD_DARK],
  [[0.06, 0.05, 1.5], [-0.34, 0.025, 0], 0, RUNNER],
  [[0.06, 0.05, 1.5], [0.34, 0.025, 0], 0, RUNNER],
  [[0.05, 0.13, 0.05], [-0.34, 0.09, -0.5], 0, WOOD_DARK],
  [[0.05, 0.13, 0.05], [0.34, 0.09, -0.5], 0, WOOD_DARK],
  [[0.05, 0.13, 0.05], [-0.34, 0.09, 0.45], 0, WOOD_DARK],
  [[0.05, 0.13, 0.05], [0.34, 0.09, 0.45], 0, WOOD_DARK],
  [[0.06, 0.05, 0.42], [-0.34, 0.15, 0.86], -0.9, RUNNER],
  [[0.06, 0.05, 0.42], [0.34, 0.15, 0.86], -0.9, RUNNER],
  [[0.74, 0.05, 0.05], [0, 0.29, 0.98], 0, RUNNER],
];

function part(THREE, [size, at, tilt, hex]) {
  const g = colored(THREE, new THREE.BoxGeometry(...size), hex);
  return g.applyMatrix4(new THREE.Matrix4().compose(
    new THREE.Vector3(...at),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt, 0, 0)),
    new THREE.Vector3(1, 1, 1),
  ));
}

export function buildSledMesh(THREE) {
  const mesh = new THREE.Mesh(mergeColored(THREE, PARTS.map(p => part(THREE, p))), new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  mesh.rotation.order = 'YXZ';
  mesh.visible = false;
  return mesh;
}
