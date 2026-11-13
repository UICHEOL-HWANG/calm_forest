import { STAGE_POS } from '../data/concert.js';

export const DECK_H = 0.14;
export const STAGE_SOLIDS = Object.freeze([]);

export function buildConcertStage(T) {
  const g = new T.Group();
  g.name = 'concert-stage';
  const deck = new T.Mesh(
    new T.CylinderGeometry(1.9, 2.0, DECK_H, 20),
    new T.MeshStandardMaterial({ color: 0xa8683c, roughness: 0.95, flatShading: true }),
  );
  deck.position.set(STAGE_POS.x, DECK_H / 2, STAGE_POS.z);
  deck.receiveShadow = true;
  g.add(deck);
  g.userData.lamps = [];
  return g;
}

export function disposeConcertStage(group) {
  group.traverse(o => {
    if (!o.isMesh) return;
    o.geometry.dispose();
    o.material.dispose();
  });
}
