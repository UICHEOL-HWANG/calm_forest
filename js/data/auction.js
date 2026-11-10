export const AUCTION_STAGE = { x: 10.5, z: -18 };
export const AUCTION_STAGE_R = 4.2;
export const AUCTION_SPOTS = {
  merchant: [1.75, -0.25],
  curator: [-2.9, 3.3],
  stargazer: [-1.6, 4.9],
  builder: [2.9, 3.5],
  me: [0.4, 5.9],
};
export const AUCTION_POOL = [
  { id: 'moonswing', appraisal: 400 },
  { id: 'lanternarch', appraisal: 300 },
  { id: 'starvane', appraisal: 220 },
];
export const AUCTION_BIDDERS = [
  ['curator', 'big', 50],
  ['stargazer', 'eager', 10],
  ['builder', 'sniper', 30],
].map(([id, style, inc]) => ({ id, style, inc }));
export const BID_INCS = [10, 30, 50];
export const OPEN_FROM = 0.72;
export const OPEN_TO = 0.96;
export const COUNT_START = 8;
export const COUNT_RESET = 4;
export const RUN_CAP = 45;
export const TICK = 0.1;
