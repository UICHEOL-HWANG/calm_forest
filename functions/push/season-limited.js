import { seasonInfo } from '../../js/season.js';

export const SEASON_LIMITED_IDS = {
  spring: [{ cat: 'fish', id: 'sakura_trout' }, { cat: 'bug', id: 'petal' }, { cat: 'forage', id: 'mugwort' }],
  summer: [{ cat: 'fish', id: 'puffer' }, { cat: 'bug', id: 'ember' }, { cat: 'forage', id: 'wildgrape' }],
  autumn: [{ cat: 'fish', id: 'maple_carp' }, { cat: 'bug', id: 'amber' }, { cat: 'forage', id: 'chestnut' }],
  winter: [{ cat: 'fish', id: 'ice_smelt' }, { cat: 'bug', id: 'frost' }, { cat: 'forage', id: 'pinecone' }],
};

export function seasonCtx(today) {
  const { season, left } = seasonInfo(today);
  return { id: season.id, name: season.name, ico: season.ico, left, limited: SEASON_LIMITED_IDS[season.id] || [] };
}
