export const LIVE_PHASE = 1;
export const MAT_IDS = ['lotus', 'driftwood', 'shell', 'moon_fish'];

const boat = (id, o) => ({ id, phase: 1, lamps: 3, steer: 1, hitR: 1, whirl: 'pull', logPush: false, crewSeats: 1, skill: null, unlock: null, ...o });
const cost = (star, coins, mat, need = {}) => ({ star, coins, mat, need });

export const BOATS = {
  ferry: boat('ferry', { name: '나룻배', ico: '🛶' }),
  lotus: boat('lotus', { name: '연잎배', ico: '🍃', lamps: 2, steer: 1.3, hitR: 0.6, whirl: 'ride', unlock: cost(500, 0, { lotus: 10 }, { clears: 3 }) }),
  raft: boat('raft', { name: '뗏목', ico: '🪵', lamps: 4, steer: 0.72, hitR: 1.4, logPush: true, crewSeats: 2, unlock: cost(1200, 3000, { driftwood: 25 }) }),
  koi: boat('koi', { name: '비단잉어', ico: '🐟', steer: 0.68, hitR: 1.3, skill: { id: 'dive', dur: 1.2, cd: 9 }, unlock: cost(1500, 0, { shell: 20 }, { rapidPerfect: 1 }) }),
  catamaran: boat('catamaran', { name: '쌍둥이 돛단배', ico: '⛵', phase: 2, unlock: cost(2500, 8000, { shell: 30 }) }),
  paper: boat('paper', { name: '종이배', ico: '📄', phase: 2, lamps: 2, skill: { id: 'fold', dur: 2, cd: 10 }, unlock: cost(2500, 0, { lotus: 40 }, { comboBest: 30 }) }),
  walnut: boat('walnut', { name: '호두 껍질 배', ico: '🌰', phase: 2, unlock: cost(3000, 0, { driftwood: 50 }, { raftClears: 15 }) }),
  lotuslamp: boat('lotuslamp', { name: '연꽃 등 배', ico: '🪷', phase: 3, unlock: cost(3500, 0, { moon_fish: 20 }, { nightClears: 15 }) }),
  gourd: boat('gourd', { name: '조롱박 등 배', ico: '🎃', phase: 3, skill: { id: 'lure', dur: 0.6, cd: 8 }, unlock: cost(5000, 15000, { moon_fish: 40 }, { rapidNightClears: 5 }) }),
};

export const BOAT_IDS = Object.keys(BOATS);
export const liveBoatIds = () => BOAT_IDS.filter(id => BOATS[id].phase <= LIVE_PHASE);
