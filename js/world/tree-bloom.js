import { BRANCH_IDS, TREE_DECOR, branchRatio, bundlesDone, canAfford, habitatDone, tagTotals } from './tree-board.js';
import { meets, whenOk } from '../habitat.js';

export const BLOOM_V = 1;
export const STAGE_COUNT = 3;
export const CARE_DAYS = 7;
export const GUEST_COUNT = 5;
export const BLOOM_REWARD = { gem: 1 };

export const STAGES = {
  water: [
    { need: { fish: 12, stone: 20 }, reward: { bait: 5 } },
    { need: { fish: 20, wood: 40 }, reward: { fert: 3 } },
    { need: { fish: 30, brick: 4 }, reward: { bait: 10 } },
  ],
  farm: [
    { need: { crop: 30, seed: 10 }, reward: { fert: 3 } },
    { need: { crop: 45, wood: 30 }, reward: { seed: 15 } },
    { need: { crop: 60, charcoal: 4 }, reward: { fert: 5 } },
  ],
  kitchen: [
    { need: { crop: 20, fish: 10, coal: 10 }, reward: { bait: 5 } },
    { need: { charcoal: 4, stone: 30 }, reward: { fert: 3 } },
    { need: { brick: 5, fish: 20, crop: 20 }, reward: { seed: 20 } },
  ],
  forest: [
    { need: { wood: 60, stone: 20 }, reward: { fert: 3 } },
    { need: { forage: 15, wood: 40 }, reward: { bait: 10 } },
    { need: { forage: 25, gem: 1 }, reward: { fert: 5 } },
  ],
  snow: [
    { need: { wood: 50, coal: 15 }, reward: { bait: 5 } },
    { need: { forage: 15, stone: 30 }, reward: { fert: 3 } },
    { need: { charcoal: 4, crop: 30 }, reward: { seed: 15 } },
  ],
  mine: [
    { need: { coal: 20, stone: 30 }, reward: { bait: 5 } },
    { need: { gem: 2, coal: 20 }, reward: { fert: 3 } },
    { need: { brick: 5, stone: 40 }, reward: { seed: 15 } },
  ],
};

export const CARE_NEEDS = {
  water: [{ fish: 3 }, { stone: 8 }],
  farm: [{ crop: 5 }, { seed: 4 }],
  kitchen: [{ coal: 4 }, { crop: 4, fish: 1 }],
  forest: [{ wood: 10 }, { forage: 3 }],
  snow: [{ coal: 4 }, { wood: 10 }],
  mine: [{ coal: 4 }, { stone: 8 }],
};

export const GUESTS = {
  water: [
    { id: 'frog', ico: '🐸', name: '개구리', need: { damp: 3 }, when: 'day' },
    { id: 'turtle', ico: '🐢', name: '남생이', need: { damp: 6 }, when: 'day' },
    { id: 'swan', ico: '🦢', name: '백조', need: { damp: 4, nectar: 2 }, when: 'day' },
    { id: 'otter', ico: '🦦', name: '수달', need: { damp: 6, shade: 2 }, when: 'night' },
    { id: 'snail', ico: '🐌', name: '달팽이', need: { damp: 3, shade: 4 }, when: 'night' },
  ],
  farm: [
    { id: 'ladybug', ico: '🐞', name: '무당벌레', need: { food: 2 }, when: 'day' },
    { id: 'bee', ico: '🐝', name: '꿀벌', need: { nectar: 2, food: 2 }, when: 'day' },
    { id: 'hare', ico: '🐇', name: '산토끼', need: { food: 4, shade: 2 }, when: 'day' },
    { id: 'cricket', ico: '🦗', name: '귀뚜라미', need: { food: 2, damp: 3 }, when: 'night' },
    { id: 'fieldmouse', ico: '🐁', name: '들쥐', need: { food: 4, shelter: 3 }, when: 'night' },
  ],
  kitchen: [
    { id: 'squirrel', ico: '🐿️', name: '다람쥐', need: { food: 2, shade: 2 }, when: 'day' },
    { id: 'yellowfly', ico: '🦋', name: '노랑나비', need: { nectar: 3 }, when: 'day' },
    { id: 'cat', ico: '🐈', name: '고양이', need: { food: 2, shelter: 3 }, when: 'day' },
    { id: 'bat', ico: '🦇', name: '박쥐', need: { light: 2, shade: 2 }, when: 'night' },
    { id: 'skunk', ico: '🦨', name: '스컹크', need: { food: 3, light: 2 }, when: 'night' },
  ],
  forest: [
    { id: 'deer', ico: '🦌', name: '사슴', need: { shade: 4 }, when: 'day' },
    { id: 'caterpillar', ico: '🐛', name: '애벌레', need: { shade: 2, nectar: 2 }, when: 'day' },
    { id: 'lizard', ico: '🦎', name: '도마뱀', need: { light: 2, shade: 2 }, when: 'day' },
    { id: 'fox', ico: '🦊', name: '여우', need: { shelter: 3, shade: 2 }, when: 'night' },
    { id: 'beaver', ico: '🦫', name: '비버', need: { shade: 2, damp: 3 }, when: 'night' },
  ],
  snow: [
    { id: 'penguin', ico: '🐧', name: '펭귄', need: { shelter: 3 }, when: 'day' },
    { id: 'seal', ico: '🦭', name: '물범', need: { shelter: 2, light: 2 }, when: 'day' },
    { id: 'snowhare', ico: '🐰', name: '눈토끼', need: { shade: 2, shelter: 2 }, when: 'day' },
    { id: 'wolf', ico: '🐺', name: '늑대', need: { shelter: 4 }, when: 'night' },
    { id: 'moonbear', ico: '🐻', name: '반달곰', need: { shelter: 3, light: 2 }, when: 'night' },
  ],
  mine: [
    { id: 'hedgehog', ico: '🦔', name: '고슴도치', need: { shelter: 3 }, when: 'day' },
    { id: 'ant', ico: '🐜', name: '개미', need: { food: 2, shelter: 3 }, when: 'day' },
    { id: 'beetle', ico: '🪲', name: '딱정벌레', need: { light: 2, shade: 2 }, when: 'day' },
    { id: 'scops', ico: '🦉', name: '소쩍새', need: { light: 3, shade: 2 }, when: 'night' },
    { id: 'earthworm', ico: '🪱', name: '지렁이', need: { damp: 3, shade: 2 }, when: 'night' },
  ],
};

export const BLOOM_DECOR = Object.fromEntries(TREE_DECOR.filter(d => d.bloom).map(d => [d.bloom, d.id]));
const BLOOM_DECOR_OF = new Map(TREE_DECOR.filter(d => d.bloom).map(d => [d.id, d.bloom]));
const GUEST_IDS = Object.fromEntries(BRANCH_IDS.map(id => [id, new Set(GUESTS[id].map(g => g.id))]));
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const isDate = (v) => typeof v === 'string' && DATE_RE.test(v);
const clampInt = (v, lo, hi) => (Number.isInteger(v) ? Math.max(lo, Math.min(hi, v)) : lo);

function hash(str) {
  let x = 2166136261;
  for (let i = 0; i < str.length; i++) { x ^= str.charCodeAt(i); x = Math.imul(x, 16777619); }
  return x >>> 0;
}

function emptyBranch() {
  return { stage: 0, given: {}, care: { days: 0, last: null }, seen: {}, slots: { day: null, night: null }, bloomed: false };
}

export function defaultBloom() {
  return { v: BLOOM_V, branches: Object.fromEntries(BRANCH_IDS.map(id => [id, emptyBranch()])) };
}

export function restoreBloom(saved) {
  const out = defaultBloom();
  if (!isObj(saved) || !isObj(saved.branches)) return out;
  for (const id of BRANCH_IDS) {
    const s = saved.branches[id];
    if (!isObj(s)) continue;
    const b = out.branches[id];
    b.stage = clampInt(s.stage, 0, STAGE_COUNT);
    const need = STAGES[id][b.stage]?.need || {};
    if (isObj(s.given)) {
      for (const [k, n] of Object.entries(need)) {
        const v = s.given[k];
        if (Number.isInteger(v) && v > 0) b.given[k] = Math.min(v, n);
      }
    }
    if (isObj(s.care)) b.care = { days: clampInt(s.care.days, 0, CARE_DAYS), last: isDate(s.care.last) ? s.care.last : null };
    if (isObj(s.seen)) for (const g of Object.keys(s.seen)) if (s.seen[g] === true && GUEST_IDS[id].has(g)) b.seen[g] = true;
    if (isObj(s.slots)) b.slots = { day: isDate(s.slots.day) ? s.slots.day : null, night: isDate(s.slots.night) ? s.slots.night : null };
    b.bloomed = s.bloomed === true;
  }
  return out;
}

function cloneBranch(b) {
  return { stage: b.stage, given: { ...b.given }, care: { ...b.care }, seen: { ...b.seen }, slots: { ...b.slots }, bloomed: b.bloomed };
}

function withBranch(bloom, id, b) {
  return { v: BLOOM_V, branches: { ...bloom.branches, [id]: b } };
}

const fail = (bloom, reason) => ({ ok: false, reason, bloom, events: [] });
const seenCount = (b) => Object.keys(b.seen).length;

function settle(bloom, tree, id, b, events) {
  if (!b.bloomed && habitatDone(tree, id) && bundlesDone(tree, id) && b.stage >= STAGE_COUNT
    && b.care.days >= CARE_DAYS && seenCount(b) >= GUEST_COUNT) {
    b.bloomed = true;
    events.push({ type: 'bloom', branch: id, reward: { ...BLOOM_REWARD }, decor: BLOOM_DECOR[id] });
  }
  return withBranch(bloom, id, b);
}

export function careNeed(id, date) {
  const list = CARE_NEEDS[id] || [];
  return list.length ? { ...list[hash(`${date}:${id}`) % list.length] } : {};
}

export function careToday(bloom, tree, id, date, inv) {
  const cur = bloom?.branches?.[id];
  if (!cur) return fail(bloom, 'branch');
  if (!habitatDone(tree, id)) return fail(bloom, 'habitat');
  if (cur.care.days >= CARE_DAYS) return fail(bloom, 'complete');
  if (cur.care.last === date) return fail(bloom, 'done');
  const need = careNeed(id, date);
  if (!canAfford(inv, need)) return fail(bloom, 'afford');
  const b = cloneBranch(cur);
  b.care = { days: b.care.days + 1, last: date };
  const events = [{ type: 'care', branch: id, days: b.care.days }];
  return { ok: true, bloom: settle(bloom, tree, id, b, events), take: need, events };
}

export function offerStage(bloom, tree, id, inv) {
  const cur = bloom?.branches?.[id];
  if (!cur) return fail(bloom, 'branch');
  if (!bundlesDone(tree, id)) return fail(bloom, 'bundles');
  if (cur.stage >= STAGE_COUNT) return fail(bloom, 'complete');
  const stage = STAGES[id][cur.stage];
  const take = {};
  for (const [k, need] of Object.entries(stage.need)) {
    const n = Math.min(need - (cur.given[k] || 0), Math.max(0, Math.floor(inv?.[k] || 0)));
    if (n > 0) take[k] = n;
  }
  if (!Object.keys(take).length) return fail(bloom, 'empty');
  const b = cloneBranch(cur);
  for (const [k, n] of Object.entries(take)) b.given[k] = (b.given[k] || 0) + n;
  const events = [];
  if (Object.entries(stage.need).every(([k, n]) => (b.given[k] || 0) >= n)) {
    b.stage += 1;
    b.given = {};
    events.push({ type: 'stage', branch: id, stage: b.stage, reward: { ...stage.reward } });
  }
  return { ok: true, bloom: settle(bloom, tree, id, b, events), take, events };
}

export function guestFor(bloom, tree, id, date, ctx = {}) {
  const phase = ctx.night ? 'night' : 'day';
  const b = bloom?.branches?.[id];
  if (!b || !habitatDone(tree, id) || b.slots[phase] === date) return { guest: null, phase };
  const env = tagTotals(tree, id);
  const eligible = (GUESTS[id] || []).filter(g => g.when === phase && whenOk(g.when, ctx) && meets(g, env));
  if (!eligible.length) return { guest: null, phase };
  return { guest: eligible[hash(`${date}:${phase}:${id}`) % eligible.length], phase };
}

export function observeGuest(bloom, tree, id, date, ctx = {}) {
  const { guest, phase } = guestFor(bloom, tree, id, date, ctx);
  if (!guest) return fail(bloom, 'gone');
  const b = cloneBranch(bloom.branches[id]);
  const fresh = !b.seen[guest.id];
  b.seen[guest.id] = true;
  b.slots[phase] = date;
  const events = [{ type: 'guest', branch: id, guest: guest.id, fresh }];
  return { ok: true, bloom: settle(bloom, tree, id, b, events), guest, events };
}

export function bloomRows(bloom, tree, id) {
  const b = bloom?.branches?.[id] || emptyBranch();
  return {
    stage: { have: b.stage, need: STAGE_COUNT },
    care: { have: b.care.days, need: CARE_DAYS },
    guests: { have: seenCount(b), need: GUEST_COUNT },
  };
}

export function bloomed(bloom, id) { return !!bloom?.branches?.[id]?.bloomed; }

export function decorLocked(bloom, decoId) {
  const owner = BLOOM_DECOR_OF.get(decoId);
  return !!owner && !bloomed(bloom, owner);
}

function deepRatio(bloom, id) {
  const b = bloom?.branches?.[id];
  if (!b) return 0;
  if (b.bloomed) return 1;
  return (b.stage / STAGE_COUNT + b.care.days / CARE_DAYS + seenCount(b) / GUEST_COUNT) / 3;
}

export function growthOf(bloom, tree, id) {
  if (bloomed(bloom, id)) return { leaves: 1, bloom: true };
  const r = branchRatio(tree, id);
  return { leaves: (habitatDone(tree, id) ? 0.3 : 0) + 0.3 * r.bundles + 0.4 * deepRatio(bloom, id), bloom: false };
}

export function lifeOf(bloom, tree) {
  let t = 0;
  for (const id of BRANCH_IDS) {
    const r = branchRatio(tree, id);
    t += (r.habitat + r.bundles + deepRatio(bloom, id)) / 3;
  }
  return Math.round((t / BRANCH_IDS.length) * 100);
}
