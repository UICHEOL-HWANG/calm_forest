import { BITE_BASE_SEC } from '../data/table.js';
import { EMOJI } from './rules.js';

export const DISH_COINS = 5;
export const DISH_HOSTS_PER_DAY = 3;
export const DISH_TABLE_MAX = 6;
export const DISH_KEEP_DAYS = 7;
export const STAR_CUTS = Object.freeze([88, 65]);
export const BITE_STAR_MULT = Object.freeze([1, 1.25, 1.5]);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const uuidOr = (v) => (typeof v === 'string' && UUID_RE.test(v) ? v : null);
const starsIn = (n) => Math.min(3, Math.max(1, Math.round(Number(n)) || 1));
const reasonOf = (r) => (r && typeof r === 'object' && typeof r.reason === 'string' && r.reason ? r.reason : 'offline');

export function dishStars(score) {
  const s = Number(score);
  if (score === null || !Number.isFinite(s)) return 1;
  return s >= STAR_CUTS[0] ? 3 : s >= STAR_CUTS[1] ? 2 : 1;
}

export const starLine = (n) => '⭐'.repeat(starsIn(n));

export const biteSecFor = (stars) => Math.round(BITE_BASE_SEC * BITE_STAR_MULT[starsIn(stars) - 1]);

export function giftable(pantry, recipes) {
  const byId = new Map(recipes.map(r => [r.id, r]));
  return (Array.isArray(pantry) ? pantry : [])
    .map((f, i) => ({ f, i, r: byId.get(f?.id) }))
    .filter(x => x.r)
    .map(({ f, i, r }) => ({ i, id: r.id, ico: r.ico, name: r.name, score: f.score }));
}

export function leaveOutcome(res) {
  if (res?.ok) return { reason: 'ok', stars: starsIn(res.stars), give: true, reward: !!res.rewarded };
  return { reason: reasonOf(res), stars: 0, give: false, reward: false };
}

export function inboxView(res, recipes, faceOf) {
  if (!res?.ok) return { ateToday: false, rows: [] };
  const byId = new Map(recipes.map(r => [r.id, r]));
  const rows = (Array.isArray(res.list) ? res.list : [])
    .filter(d => Number.isSafeInteger(d?.id) && byId.has(d.recipe))
    .slice(0, DISH_TABLE_MAX)
    .map(d => {
      const r = byId.get(d.recipe);
      return { id: d.id, recipe: r.id, ico: r.ico, name: r.name, buff: r.buff, stars: starsIn(d.stars),
        nick: String(d.nick || ''), face: faceOf(d.character), publicId: uuidOr(d.public_id) };
    });
  return { ateToday: !!res.ate_today, rows };
}

export function eatOutcome(res) {
  return res?.ok ? { reason: 'ok', ate: true } : { reason: reasonOf(res), ate: false };
}

export function rateOutcome(res) {
  if (res?.ok) return { reason: 'ok', done: true };
  const reason = reasonOf(res);
  return { reason, done: reason === 'dup' };
}

export function returnRows(res, faceOf, max) {
  if (!res?.ok) return [];
  const rows = new Map();
  for (const v of Array.isArray(res.list) ? res.list : []) {
    const id = uuidOr(v?.public_id);
    if (id && !rows.has(id)) rows.set(id, { publicId: id, nick: String(v.nick || ''), face: faceOf(v.character), dish: v.dish ? starsIn(v.dish) : null, reply: null });
  }
  for (const v of Array.isArray(res.replies) ? res.replies : []) {
    const id = uuidOr(v?.public_id), emoji = EMOJI[v?.emoji];
    if (!id || !emoji) continue;
    const row = rows.get(id) || { publicId: id, nick: String(v.nick || ''), face: faceOf(v.character), dish: null, reply: null };
    rows.set(id, { ...row, reply: row.reply || emoji });
  }
  return [...rows.values()].slice(0, max);
}
