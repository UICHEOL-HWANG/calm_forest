export const RIVER_W = 6.4;
export const RIVER_LEN = 620;
export const BOAT_RUNS_PER_DAY = 3;
export const BOAT_BASE_SPEED = 9.5;
export const BOAT_BOOST_CD = 3.2;
export const RIVER_OBS = {
  rock:  { r: 1.15, hit: true },
  log:   { r: 2.0,  hit: true },
  pile:  { r: 0.75, hit: true },
  whirl: { r: 1.7,  hit: false },
};
export const RIVER_PICKS = [
  { id: 'lotus',     name: '물 위 연꽃',    ico: '🪷', give: { seed: 2 }, color: 0xffb6d5 },
  { id: 'driftwood', name: '떠내려온 나무', ico: '🪵', give: { wood: 2 }, color: 0xc09068 },
  { id: 'shell',     name: '강 조개',       ico: '🐚', give: {},          color: 0xffe6c0 },
  { id: 'moon_fish', name: '달빛 물고기',   ico: '🌕', give: {},          color: 0xdfe9ff, night: true },
];
