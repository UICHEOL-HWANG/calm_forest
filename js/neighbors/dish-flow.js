import { gameState, giveReward, requestSave, ui } from '../game.js';
import { trackEvent } from '../analytics.js';
import { state as authState } from '../supabase-client.js';
import { RECIPES } from '../data/catalog.js';
import { COOK_TIERS, pantryGive } from '../spaces/cooking.js';
import { neighborApi } from './net.js';
import { DISH_COINS, gameOf, giftable, leaveOutcome, scoreOfStars } from './dish-rules.js';
import { DISH_COPY as D, fill } from './dish-copy.js';
import { FAIL_TOAST } from './rules.js';
import { openDishPicker } from './ui.js';
import { openDishGame } from './dish-game.js';
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
  openDishGame({ game: gameOf(r.stages[0]), ico: r.ico, onFinish: (stars) => deliver(it, r, stars, host), onClose: host.onEnd });
}

async function deliver(it, r, stars, host) {
  const score = scoreOfStars(stars);
  const out = leaveOutcome(await neighborApi.dishLeave(host.publicId, r.id, score).catch(() => null));
  trackEvent(...evDishLeave(host.publicId, r.id, out.give ? out.stars : stars, out.reason));
  if (!out.give) {
    if (!D.fail[out.reason]) trackEvent(...evFail('dish_leave', out.reason));
    ui.toast?.(D.fail[out.reason] || FAIL_TOAST, 2800);
    return null;
  }
  pantryGive(it.i, r.id);
  if (out.reward) giveReward({ coins: DISH_COINS }, 'neighbor_dish', host.publicId);
  requestSave();
  host.onPlate(out.stars, tierOf(score));
  return {
    stars: out.stars,
    line: out.stars === 3 ? fill(D.doneLine[2], host.nick) : D.doneLine[out.stars - 1],
    coin: out.reward ? D.coinTail : '',
  };
}
