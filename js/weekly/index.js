import { weekIndex, marketOpen, themeFor, weeklyDefault, restoreWeekly, rollover, note, claim, buyPlan, spend, progressOf, questById, adTicketOpen, adTicket } from './rules.js';
import { MARKET_POS, BOARD_POS, MARKET_THEMES, MARKET_ITEM_IDS, TICKET_CAP } from '../data/weekly.js';
import { trackBoardOpen, trackQuestClaim, trackMarketOpen, trackMarketBuy, trackLoginPrompt } from './track.js';
import { showBoard, showMarket } from './ui.js';
import { WEEKLY_COPY } from './copy.js';
import { guideNeed, guideTarget, bannerDue, countTry, guideStalled } from './guide.js';
import { buildWeeklyMarket, disposeWeeklyMarket, WEEKLY_SOLIDS, MERCHANT_SOLID } from '../spaces/weekly-market-art.js';

export { weekIndex };

import { hasItemArt, weeklyDecorMesh } from './items.js';
import { makeThumbs } from './thumbs.js';
import { GUIDE_PRIORITY } from '../guide/arbiter.js';

export { weeklyDefault, restoreWeekly, weeklyDecorMesh };

const SPOT_R = 1.8;
let deps = null;
let spot = null;
let built = null;
let solidsAdded = false;
let merchantSolid = null;
const LAMP_DAY = 0.25, LAMP_NIGHT = 2.1;
const guides = {};
const reached = new Set();
const tried = new Set();
let live = null;
let placeGuide = null;
const PLACE_R = Object.freeze({ bench: SPOT_R, house: 3 });
let liveSec = 0;
const BANNER_KEY = 'cf_weekly_banner_week';
const SPOTS = { market: MARKET_POS, board: BOARD_POS };

let bannerRead = false;
let bannerMem = null;
let reachedWeek = null;

const lastBanner = () => {
  if (!bannerRead) {
    bannerRead = true;
    try { const v = localStorage.getItem(BANNER_KEY); bannerMem = v === null ? null : Number(v); } catch {}
  }
  return bannerMem;
};
const markBanner = (week) => {
  bannerRead = true;
  bannerMem = week;
  try { localStorage.setItem(BANNER_KEY, String(week)); } catch {}
};

const state = () => deps.getState();
const setIfChanged = (next) => { if (next !== state()) deps.setState(next); };
const saveCommit = (next) => { setIfChanged(next); deps.requestSave(); };
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const current = () => rollover(state(), weekIndex(deps.now()), deps.canDo);

export function weeklyScatterBlocks(x, z, pad = 1) {
  return WEEKLY_SOLIDS.some(([sx, sz, r]) => Math.hypot(x - sx, z - sz) < r + pad);
}

const sceneReady = () => !!(deps.scene && deps.THREE && deps.solidCircle);
const build = (open) => (deps.buildMarket || buildWeeklyMarket)(deps.THREE, { open });
const dispose = (group) => (deps.disposeMarket || disposeWeeklyMarket)(group);

function dropMarket() {
  if (!built) return;
  built.scene.remove(built.group);
  dispose(built.group);
  built = null;
}

function syncMarket() {
  if (!sceneReady()) return;
  const open = marketOpen(deps.now());
  if (merchantSolid) merchantSolid.off = !open;
  if (built && built.open === open) return;
  dropMarket();
  const group = build(open);
  deps.scene.add(group);
  built = { open, group, scene: deps.scene };
}

function lightMarket() {
  if (!built) return;
  const level = Math.max(0, Math.min(1, deps.night?.() || 0));
  const glow = LAMP_DAY + (LAMP_NIGHT - LAMP_DAY) * level;
  for (const mat of built.group.userData?.lamps || []) mat.emissiveIntensity = glow;
}

let thumbFn = null;

function thumbsOf(ids) {
  if (!ids.length) return {};
  thumbFn ??= deps.thumbs || (deps.THREE ? makeThumbs(deps.THREE, weeklyDecorMesh) : () => ({}));
  return thumbFn(ids);
}

export function initWeekly(d) {
  thumbFn = null;
  dropMarket();
  stopGuide();
  bannerRead = false;
  bannerMem = null;
  reachedWeek = null;
  placeGuide = null;
  reached.clear();
  tried.clear();
  for (const k of Object.keys(guides)) delete guides[k];
  deps = d;
  if (!sceneReady()) return;
  if (!solidsAdded) {
    WEEKLY_SOLIDS.forEach(([x, z, r]) => deps.solidCircle(x, z, r));
    merchantSolid = deps.solidCircle(...MERCHANT_SOLID) || null;
    solidsAdded = true;
  }
  syncMarket();
}

export { BOARD_POS, MARKET_POS };

export function weeklyNote(type, n = 1) {
  if (!deps) return;
  setIfChanged(note(current(), type, n));
}

export function updateWeekly(dt, inVillage, pos) {
  if (!deps) return;
  setIfChanged(current());
  syncMarket();
  lightMarket();
  tickGuide(dt, inVillage, pos);
  spot = !inVillage ? null : dist(pos, BOARD_POS) < SPOT_R ? 'board' : dist(pos, MARKET_POS) < SPOT_R ? 'market' : null;
}

function stopGuide() {
  if (live) { guides[live].cancel('gate'); live = null; }
}

function tickGuide(dt, inVillage, pos) {
  const env = deps.guideEnv;
  if (!env) return;
  const s = state();
  if (s.week !== reachedWeek) { reachedWeek = s.week; reached.clear(); }
  const now = deps.now();
  const gates = { need: guideNeed(s, now, tried), inVillage, pastOnboarding: env.pastOnboarding(), uiBusy: env.uiBusy() };
  if (placeGuide && !inVillage && !live) placeGuide = null;
  const free = { cameraFree: env.cameraFree(), otherGuide: env.otherGuide('weekly') };
  const asked = placeGuide && deps.placeSpots?.[placeGuide] ? guideTarget({ ...gates, ...free, need: placeGuide, pastOnboarding: true }) : null;
  const target = asked || guideTarget({ ...gates, ...free });
  if (live && (target !== live || !guides[live].active || guideStalled(liveSec))) {
    const was = live;
    const arrived = !guides[was].active && dist(pos, spotOf(was)) < reachOf(was);
    const stalled = guideStalled(liveSec);
    stopGuide();
    if (PLACE_R[was]) { if (arrived || stalled || !inVillage) placeGuide = null; } else if (arrived || stalled) reached.add(was);
  }
  if (target && !reached.has(target)) runGuide(env, target, dt);
  const gate = inVillage && gates.pastOnboarding && !gates.uiBusy;
  if (bannerDue({ open: marketOpen(now), seenMarket: s.seenMarket, arrow: live, gate, week: s.week, lastBannerWeek: lastBanner(), cine: env.cine() })) {
    env.showBanner(() => markBanner(s.week));
  }
}

function runGuide(env, target, dt) {
  if (!live) {
    guides[target] ??= env.makeGuide(`weekly-${target}`, spotOf(target), reachOf(target));
    guides[target].start();
    live = target;
    liveSec = 0;
    if (!tried.has(target)) { tried.add(target); saveCommit(countTry(state(), target)); }
  }
  liveSec += dt;
  guides[live].update(dt);
}

const spotOf = (name) => SPOTS[name] || deps.placeSpots?.[name];
const reachOf = (name) => PLACE_R[name] || SPOT_R;

export function weeklyHouseReady() {
  if (deps?.storedIndoor?.() > 0) deps.toast?.(WEEKLY_COPY.where.houseReady, 3600, { afterDialog: true });
}

export function weeklySpotNow() { return spot; }

export const weeklyPriority = () => (placeGuide ? GUIDE_PRIORITY.goal + 5 : GUIDE_PRIORITY.weekly);

export function weeklyGuideActive() { return !!live && !!guides[live]?.active; }

export function weeklyPrompt() {
  return spot === 'market' ? WEEKLY_COPY.prompt.market : WEEKLY_COPY.prompt.board;
}

function onClaim(questId) {
  const r = claim(state(), questId);
  if (!r.ok) return r;
  saveCommit(r.state);
  trackQuestClaim(r.state.week, questId, r.state.tickets);
  return r;
}

function onBuy(item) {
  if (!hasItemArt(item.id)) return { ok: false, reason: 'soon' };
  const s = state();
  const plan = buyPlan(s, item, { isGuest: deps.isGuest(), owned: deps.ownsDecor(item.id), open: marketOpen(deps.now()) });
  if (plan.reason === 'guest') trackLoginPrompt(s.week, s.tickets);
  if (!plan.ok) return plan;
  if (!deps.grantDecorItem(item)) return { ok: false, reason: 'grant_failed' };
  saveCommit(spend(state(), item.cost));
  trackMarketBuy(s.week, item.id, item.cost);
  return plan;
}

const marketItems = () => MARKET_THEMES.flatMap(t => [t.hero, ...t.props]);

export function weeklyDev() {
  if (!deps) return null;
  return {
    state: () => current(),
    tickets: (n) => {
      if (!Number.isInteger(n)) return state().tickets;
      setIfChanged({ ...current(), tickets: Math.max(0, Math.min(TICKET_CAP, n)) });
      return state().tickets;
    },
    fill: (questId) => {
      const s = current();
      const q = s.quests.includes(questId) ? questById(questId) : null;
      if (!q) return false;
      setIfChanged({ ...s, counts: { ...s.counts, [q.type]: Math.max(q.target, s.counts[q.type] || 0) } });
      return true;
    },
    grant: (id) => {
      const item = MARKET_ITEM_IDS.includes(id) ? marketItems().find(i => i.id === id) : null;
      return !!item && !!deps.grantDecorItem(item);
    },
    theme: () => {
      const t = themeFor(current().week);
      return { id: t.id, items: [t.hero.id, ...t.props.map(p => p.id)] };
    },
  };
}

function onLogin() {
  const s = state();
  trackLoginPrompt(s.week, s.tickets);
  deps.login?.();
}

export function openWeekly() {
  const s = state();
  if (spot === 'market') {
    trackMarketOpen(s.week, s.tickets, deps.isGuest());
    if (s.seenMarket !== s.week) saveCommit({ ...s, seenMarket: s.week });
    const theme = themeFor(s.week);
    const ids = [theme.hero, ...theme.props].map(i => i.id).filter(hasItemArt);
    return showMarket({ state, theme, isOpen: () => marketOpen(deps.now()), isGuest: deps.isGuest(), ownsDecor: deps.ownsDecor, hasArt: hasItemArt, thumbs: thumbsOf(ids), whereOf: deps.whereOf, onGuide: (g) => { placeGuide = g; tried.add(g); }, onBuy, onLogin, onOpen: deps.stopMove });
  }
  trackBoardOpen(s.week, s.quests.filter(id => progressOf(s, id).done).length);
  if (s.seenBoard !== s.week) saveCommit({ ...s, seenBoard: s.week });
  const adFor = (redraw) => (adTicketOpen(state()) ? deps.adButton?.(() => saveCommit(adTicket(state())), (ok) => { if (ok) redraw(); }) || null : null);
  return showBoard({ state, onClaim, onOpen: deps.stopMove, adFor });
}
