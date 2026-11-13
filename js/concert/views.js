import { INSTRUMENTS, CONCERT_DECOR, SONG_IDS } from '../data/concert.js';
import { CONCERT_COPY as C } from './copy.js';
import { starsFor, paidLeft, buyPlan } from './rules.js';

const fill = (line, n) => line.replace('{0}', n);

export const LANE_COLORS = Object.freeze({
  drum: ['#e9c48c', '#d9574a'],
  guitar: ['#f4dcaa', '#e2a55a'],
  bass: ['#6aa6d8', '#f2c14e'],
  bells: ['#6aa6d8', '#d9574a'],
  maracas: ['#5c9a68', '#d9574a'],
});

const shopStatus = (state, item, flags) => {
  const plan = buyPlan(state, item, flags);
  return plan.ok ? { status: 'buy', lack: 0 } : { status: plan.reason, lack: plan.lack || 0 };
};

export function hallView(state, { today, isGuest, ownsDecor, hasArt, thumbs }) {
  const left = paidLeft(state, today);
  return {
    notes: state.notes,
    sub: left > 0 ? fill(C.sub, left) : C.subDone,
    songs: SONG_IDS.map(id => ({ id, name: C.song[id], level: C.level[id], stars: starsFor(id, state.best[id] || 0) })),
    instruments: INSTRUMENTS.map(item => {
      const owned = state.owned.includes(item.id);
      const s = owned
        ? { status: state.equipped === item.id ? 'equipped' : 'owned', lack: 0 }
        : shopStatus(state, item, { isGuest, owned: false, hasArt: true });
      return { id: item.id, name: C.inst[item.id], cost: item.cost, ...s };
    }),
    decor: CONCERT_DECOR.map(item => ({
      id: item.id, cost: item.cost, thumb: thumbs[item.id] || null,
      ...shopStatus(state, item, { isGuest, owned: ownsDecor(item.id), hasArt: hasArt(item.id) }),
    })),
  };
}

export function resultView({ stars, earned, bestUp, summary }) {
  const lines = [earned > 0 ? fill(C.earned, earned) : C.noPay];
  if (bestUp) lines.push(C.best);
  return { title: C.resultTitle, stars, lines, perfect: summary.perfect, good: summary.good, miss: summary.miss };
}

export const noteY = (noteT, nowMs, leadMs, hitY) => hitY * (1 - (noteT - nowMs) / leadMs);
