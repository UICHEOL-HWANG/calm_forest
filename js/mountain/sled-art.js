import { mergeColored } from './merge-colored.js';
import { sledOf } from './sled-lineup.js';
import { DECK_TOP, modelParts } from './sled-models.js';

export function deckTopOf(id) {
  return DECK_TOP[sledOf(id).model] ?? DECK_TOP.davos;
}

export const SLED_DECK_TOP = deckTopOf('basic');

export function buildSledGeometry(THREE, id = 'basic') {
  const sled = sledOf(id);
  return mergeColored(THREE, modelParts(THREE, sled.model, sled.palette));
}

export function buildSledMesh(THREE, id = 'basic') {
  const mesh = new THREE.Mesh(buildSledGeometry(THREE, id), new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  mesh.rotation.order = 'YXZ';
  mesh.visible = false;
  return mesh;
}

export function setSledSkin(mesh, THREE, id) {
  const old = mesh.geometry;
  mesh.geometry = buildSledGeometry(THREE, id);
  old.dispose();
}
