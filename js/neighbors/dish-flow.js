import { ANIMALS, gameState, giveReward, requestSave, ui } from '../game.js';
import { trackEvent } from '../analytics.js';
import { state as authState } from '../supabase-client.js';
import { RECIPES } from '../data/catalog.js';
import { SELL_ICO_G } from '../data/places.js';
import { COOK_TIERS, courseOf, pantryGive } from '../spaces/cooking.js';
import { grillKeyOf, stageKeys } from '../cook-ingredients.js';
import { setStageTheme } from '../spaces/kitchen-stage.js';
import { bodyROf } from './seat-rules.js';
import { neighborApi } from './net.js';
import { DISH_COINS, dishStars, giftable, leaveOutcome, starLine } from './dish-rules.js';
import { DISH_COPY as D, fill } from './dish-copy.js';
import { FAIL_TOAST } from './rules.js';
import { openDishPicker } from './ui.js';
import { evDishLeave, evFail } from './track.js';

const tierOf = (score) => (COOK_TIERS.find(t => score >= t.min) || COOK_TIERS[COOK_TIERS.length - 1]).id;

export function offerDish(host) {
  if (authState.isGuest) { ui.toast?.(D.fail.login, 2600); return false; }
  const items = giftable(gameState.pantry, RECIPES);
  if (!items.length) { ui.toast?.(D.pantryEmpty, 2800); return false; }
  openDishPicker(items, (it) => cookFor(it, host));
  return true;
}

function cookFor(it, host) {
  const r = RECIPES.find(x => x.id === it.id);
  setStageTheme({ character: host.character, equipped: host.equipped, bodyR: bodyROf(host.character, ANIMALS) });
  ui.startCookCourse?.({
    id: r.id, where: 'neighbor', name: r.name, ico: r.ico, course: [{ ...courseOf(r)[0], weight: 1 }],
    keys: stageKeys(r), grillKey: grillKeyOf(r), icos: Object.keys(r.cost).map(k => SELL_ICO_G[k] || '📦'),
    onDone: (payload) => deliver(it, r, payload, host),
    onClose: () => { setStageTheme(null); host.onEnd?.(); },
  });
}

const LEAVE_TIMEOUT_MS = 10000;
const withTimeout = (p) => Promise.race([p.catch(() => null), new Promise(res => setTimeout(() => res(null), LEAVE_TIMEOUT_MS))]);

async function deliver(it, r, payload, host) {
  if (payload?.abandoned) return null;
  const score = Math.max(0, Math.min(100, Math.round(Number(payload?.score) || 0)));
  const out = leaveOutcome(await withTimeout(neighborApi.dishLeave(host.publicId, r.id, score)));
  trackEvent(...evDishLeave(host.publicId, r.id, out.give ? out.stars : dishStars(score), out.reason));
  if (!out.give) {
    if (!D.fail[out.reason]) trackEvent(...evFail('dish_leave', out.reason));
    ui.toast?.(D.fail[out.reason] || FAIL_TOAST, 2800);
    return null;
  }
  const given = pantryGive(it.i, r.id);
  if (out.reward && given) giveReward({ coins: DISH_COINS }, 'neighbor_dish', host.publicId);
  requestSave();
  host.onPlate(out.stars, tierOf(score));
  return {
    ok: true, ico: starLine(out.stars), title: D.doneTitle,
    line: out.stars === 3 ? fill(D.doneLine[2], host.nick) : D.doneLine[out.stars - 1],
    coin: out.reward ? D.coinTail : '', okLabel: D.doneOk,
  };
}
