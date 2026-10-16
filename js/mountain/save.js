import { COURSE, minTimeMs } from './course.js';
import { SLED_IDS } from './sled-lineup.js';

export const DAILY_REWARD_CAP = 3;

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const BEST_FLOOR_MS = minTimeMs(COURSE);

export const MOUNTAIN_DEFAULT = Object.freeze({
  sled: Object.freeze({ best: null, plays: 0, daily: Object.freeze({ date: null, rewarded: 0 }), perfect: false }),
  hut: Object.freeze({ sleds: Object.freeze(['basic']), sled: 'basic' }),
});

const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);

export const SLED_SKIN_IDS = SLED_IDS;

function restoreHut(h, finished) {
  const list = [...(isObj(h) && Array.isArray(h.sleds) ? h.sleds : []), ...(finished ? ['toboggan'] : [])];
  const sleds = ['basic', ...SLED_SKIN_IDS.filter(id => id !== 'basic' && list.includes(id))];
  const sled = isObj(h) && sleds.includes(h.sled) ? h.sled : 'basic';
  return { sleds, sled };
}

function restoreDaily(d) {
  if (!isObj(d) || typeof d.date !== 'string' || !DAY_RE.test(d.date)) return { date: null, rewarded: 0 };
  if (!Number.isInteger(d.rewarded) || d.rewarded < 0 || d.rewarded > DAILY_REWARD_CAP) return { date: null, rewarded: 0 };
  return { date: d.date, rewarded: d.rewarded };
}

export function restoreMountain(saved) {
  const s = isObj(saved) && isObj(saved.sled) ? saved.sled : {};
  const best = Number.isInteger(s.best) && s.best >= BEST_FLOOR_MS ? s.best : null;
  return {
    sled: {
      best,
      plays: Number.isInteger(s.plays) && s.plays >= 0 ? s.plays : 0,
      daily: restoreDaily(s.daily),
      perfect: s.perfect === true,
    },
    hut: restoreHut(isObj(saved) ? saved.hut : null, Number.isInteger(s.best)),
  };
}
