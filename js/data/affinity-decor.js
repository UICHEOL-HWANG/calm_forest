import { NPCS } from './npcs.js';
import { BEST_ITEMS, frameDecorId } from './npc-letters.js';
import { AFFINITY_NPCS } from '../affinity/stages.js';

const nameOf = (id) => NPCS.find(n => n.id === id)?.name || id;

export const AFF_SOLID_K = 0.85;

export const AFF_BOX = Object.freeze({
  aff_chair: Object.freeze({ w: 1.9, d: 1.3 }),
  aff_mailbox: Object.freeze({ w: 0.9, d: 0.9 }),
  aff_lamp: Object.freeze({ w: 1.1, d: 1.1 }),
  aff_cart: Object.freeze({ w: 1.3, d: 0.9 }),
  aff_tent: Object.freeze({ w: 1.2, d: 1.0 }),
  aff_nook: Object.freeze({ w: 1.4, d: 1.0 }),
  aff_steamer: Object.freeze({ w: 1.3, d: 1.0 }),
  aff_telescope: Object.freeze({ w: 1.0, d: 1.0 }),
  aff_boat: Object.freeze({ w: 1.4, d: 1.0 }),
  aff_nest: Object.freeze({ w: 1.2, d: 1.0 }),
  aff_vitrine: Object.freeze({ w: 1.1, d: 1.1 }),
});

export const AFF_OUTDOOR = Object.freeze(AFFINITY_NPCS.map(npc => Object.freeze({
  id: BEST_ITEMS[npc].decor,
  name: BEST_ITEMS[npc].name,
  ico: BEST_ITEMS[npc].ico,
  cost: Object.freeze({ coins: 9999 }),
  desc: `${nameOf(npc)}의 단짝 선물`,
  hidden: true,
  quest: 'affinity',
  npc,
})));

export const AFF_FRAMES = Object.freeze(AFFINITY_NPCS.map(npc => Object.freeze({
  id: frameDecorId(npc),
  name: `${nameOf(npc)} 액자`,
  ico: '🖼️',
  cost: 0,
  pay: 'coins',
  hidden: true,
  foot: Object.freeze([0.45, 0.3]),
  sm: true,
  h: 0.42,
  npc,
})));

export const AFF_OUTDOOR_IDS = Object.freeze(AFF_OUTDOOR.map(d => d.id));
export const AFF_FRAME_IDS = Object.freeze(AFF_FRAMES.map(d => d.id));

export function affinityDecorOwner(id) {
  return [...AFF_OUTDOOR, ...AFF_FRAMES].find(d => d.id === id)?.npc ?? null;
}
