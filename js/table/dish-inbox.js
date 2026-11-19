import { ANIMALS, ui } from '../game.js';
import { trackEvent } from '../analytics.js';
import { RECIPES } from '../data/catalog.js';
import { neighborBite } from '../spaces/cooking.js';
import { neighborApi } from '../neighbors/net.js';
import { biteSecFor, eatOutcome, inboxView, rateOutcome } from '../neighbors/dish-rules.js';
import { DISH_COPY as D, fill } from '../neighbors/dish-copy.js';
import { FAIL_TOAST } from '../neighbors/rules.js';
import { openInboxModal, openRateModal } from '../neighbors/ui.js';
import { evDishEat, evDishRate } from '../neighbors/track.js';
import { visitBack } from '../spaces/neighbor.js';

const faceOf = (id) => (ANIMALS.find(a => a.id === id) || ANIMALS[0]).emoji;
const EAT_TOAST = { limit: D.eatLimit, gone: D.eatGone };

export async function loadInbox() {
  return inboxView(await neighborApi.tableDishes().catch(() => null), RECIPES, faceOf);
}

export function showInbox(view) {
  openInboxModal(view, bite);
}

async function bite(r) {
  const out = eatOutcome(await neighborApi.dishEat(r.id).catch(() => null));
  trackEvent(...evDishEat(r.publicId, r.recipe, r.stars, out.reason));
  if (!out.ate) { ui.toast?.(EAT_TOAST[out.reason] || FAIL_TOAST, 2600); return; }
  const b = neighborBite(r.recipe, biteSecFor(r.stars));
  const parts = b ? [`${b.ico} ${b.name}`, fill(D.rateSec, b.sec)] : [];
  openRateModal(r, parts, (emoji) => rate(r, emoji), (row) => visitBack(row.publicId));
}

async function rate(r, emoji) {
  const out = rateOutcome(await neighborApi.dishRate(r.id, emoji).catch(() => null));
  trackEvent(...evDishRate(r.publicId, emoji, out.reason));
  ui.toast?.(out.done ? fill(D.rated, r.nick) : FAIL_TOAST, 2600);
  return out.done;
}
