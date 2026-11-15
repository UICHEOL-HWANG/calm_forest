import { gameState, player, dist2D, ui, scene, solidCircle, removeSolid, obstacles, giveReward, refreshInventoryUI, requestSave, mode, nightLevel, adPill } from '../game.js';
import { trackEvent } from '../analytics.js';
import { state as authState } from '../supabase-client.js';
import { modalQueue } from '../guide/modal-queue.js';
import { refreshQuestPanel } from '../spaces/npc.js';
import { PLAZA, PLAZA_R, PLAZA_FOUNTAIN, PLAZA_VIEW_R, WINTER_LAMP_REWARD } from '../data/plaza.js';
import { gateOpens, seasonPhase, nearPollDue } from './rules.js';
import { datePhase } from './seasons.js';
import { progress, give } from './net.js';
import { interpretDonate } from './donate.js';
import { buildPlaza } from './build.js';
import { buildPath } from './path.js';
import { buildFountain } from './fountain.js';
import { buildWinterPlaza, buildFireworks } from './winter-build.js';
import { winterPropSolids, plazaPathSolids } from './solids.js';
import { winterDefault, myStage, stageRows, todayLeft, recordGive, recordCap, syncToday, markFull, kstDay, villageStage, litLamps,
         lampClaims, lampPlan, decorPlan, settleOwed, fireworksDue, myTotal, FOUNTAIN_DONE, shortFill, doubleOpen, markDoubled, lampGrant } from './winter-rules.js';
import { WINTER_COPY, winterToast } from './winter-copy.js';
import { fill, stagePct } from './copy.js';
import { openPlazaModal, renderPlazaModal } from './ui.js';
import { guideArbiter } from '../guide/arbiter.js';
import { featureGuidesOpen } from '../guide/feature-rules.js';
import { YARD_STALL_SEC } from '../pond/yard-steps.js';
import { makeGuideEnv } from '../weekly/bridge.js';
import { bannerDue, arrowWanted, FOUNTAIN_SPOT_R, FOUNTAIN_ARROW_REACH } from './winter-guide.js';

const SPOT_R = FOUNTAIN_SPOT_R;
const VIEW_R = 12;
const FOUNTAIN_AT = { x: PLAZA.x + PLAZA_FOUNTAIN.x, z: PLAZA.z + PLAZA_FOUNTAIN.z };
const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
const QS = new URLSearchParams(location.search);
const DEBUG_TOTAL = LOCAL && /^\d{1,5}$/.test(QS.get('plazaTotal') || '') ? Number(QS.get('plazaTotal')) : null;
const DEBUG_FIREWORKS = LOCAL && QS.get('plazaFireworks') === '1';

let def = null, debugStage = null, saveRestored = false, lastProg = null, spot = null, busy = false, open = false;
let built = [], solids = [], obstacle = null, shown = '', fireworks = null, fireworksToasted = false;
let viewCheck = 0, lastNearPollAt = -Infinity;
const viewed = new Set();
let guideEnv = null, arrow = null, bannered = false, arrived = false, arrowSec = 0;

export function addStored(id) {
  const stored = gameState.outdoorStored || {};
  gameState.outdoorStored = { ...stored, [id]: (stored[id] || 0) + 1 };
}

const guest = () => authState.isGuest !== false;
const st = () => gameState.plaza.winter?.[def.id] || winterDefault();
const economy = () => debugStage === null && DEBUG_TOTAL === null;
const total = () => DEBUG_TOTAL ?? (Number.isInteger(lastProg?.total) ? lastProg.total : st().total);
const stageNow = () => (debugStage === null ? myStage(st()) : Math.max(1, debugStage));
const dayNow = () => kstDay(Date.now());

function commit(next) {
  gameState.plaza = { ...gameState.plaza, winter: { ...gameState.plaza.winter, [def.id]: next } };
  requestSave();
}

export const winterPhase = () => (lastProg?.starts_at ? seasonPhase(lastProg, Date.now()) : datePhase(def, Date.now()));

function clear() {
  for (const b of built) { scene.remove(b.group); b.dispose(); }
  built = [];
  for (const c of solids) removeSolid(c);
  solids = [];
  if (obstacle) { const i = obstacles.indexOf(obstacle); if (i >= 0) obstacles.splice(i, 1); obstacle = null; }
}

function rebuild() {
  const key = `${stageNow()}:${litLamps(total())}`;
  if (key === shown) return;
  shown = key;
  clear();
  built = [buildPlaza(4, 'after', { winter: true }), buildPath(4, 'after'), buildWinterPlaza(litLamps(total())), buildFountain(stageNow())];
  for (const b of built) scene.add(b.group);
  for (const [x, z, r] of [...winterPropSolids(), ...plazaPathSolids(4, 'after')]) solids.push(solidCircle(x, z, r));
  obstacle = { x: PLAZA.x, z: PLAZA.z, r: PLAZA_R };
  obstacles.push(obstacle);
}

function tickFireworks(dt) {
  const on = DEBUG_FIREWORKS || (fireworksDue(def, Date.now(), total()) && nightLevel > 0.3);
  if (on && !fireworks) {
    fireworks = buildFireworks();
    scene.add(fireworks.group);
    if (!fireworksToasted) { fireworksToasted = true; ui.toast?.(WINTER_COPY.fireworks, 4200); }
  }
  if (!on && fireworks) { scene.remove(fireworks.group); fireworks.dispose(); fireworks = null; }
  fireworks?.update(dt);
}

function settle() {
  if (!saveRestored || !economy()) return;
  const r = settleOwed(st(), guest());
  if (!r.grant.length) return;
  for (const id of r.grant) addStored(id);
  commit(r.st);
  ui.toast?.(WINTER_COPY.stored, 3600);
}

function claimLamps() {
  if (!saveRestored || !economy()) return;
  const t = total(), before = st(), vs = villageStage(t);
  const seen = Array.from({ length: Math.max(0, vs - before.seenLamp) }, (_, i) => before.seenLamp + 1 + i);
  const claims = lampClaims(before, t).filter(k => WINTER_LAMP_REWARD[k]);
  const moved = villageStage(before.total) !== vs;
  if (!seen.length && !claims.length && !moved) return;
  const plan = lampPlan({ ...before, seenLamp: Math.max(before.seenLamp, vs), total: t }, claims, guest());
  for (const id of plan.stored) addStored(id);
  for (const [k, g] of plan.gives) giveReward(g, 'plaza_lamp', `lamp${k}`);
  commit(plan.st);
  for (const k of seen) trackEvent('plaza_lamp_stage', { season: def.id, stage: k, via: 'seen' });
  for (const k of claims) {
    trackEvent('plaza_lamp_stage', { season: def.id, stage: k, via: 'reward' });
    modalQueue.request({ kind: 'result', key: `lamp-${def.id}-${k}`, show: () => ui.toast?.(fill(plan.owed.includes(k) ? WINTER_COPY.lampToastGuest : WINTER_COPY.lampToast, k * 3), 4200) });
  }
}

function afterGive(beforeStage) {
  const s = st(), now = myStage(s);
  if (now <= beforeStage) return;
  trackEvent('plaza_fountain_stage', { season: def.id, stage: now, guest: guest() ? 1 : 0 });
  if (now < FOUNTAIN_DONE) { commit({ ...s, seenStage: now }); return; }
  const d = decorPlan({ ...s, seenStage: now }, 'winterfountain', guest());
  if (d.grant) addStored('winterfountain');
  commit(d.st);
  ui.toast?.(d.grant ? WINTER_COPY.complete : WINTER_COPY.completeGuest, 4200);
}

export async function refreshWinter(force = false) {
  if (!def) return;
  const p = await progress.get(def.id, { force });
  if (p && p.per_user === true) lastProg = p;
  settle();
  claimLamps();
  rebuild();
}

async function onGive(item, qty) {
  if (!economy() || busy || qty <= 0 || winterPhase() !== 'active') return;
  const stage = myStage(st());
  busy = true;
  render();
  try {
    const raw = await give(def.id, stage, item, qty);
    const r = interpretDonate(qty, raw);
    const day = dayNow(), left = raw?.today_left;
    trackEvent(r.event, { season: def.id, item, ...r.params });
    if (r.spend > 0) {
      const row = stage === myStage(st()) ? stageRows(st()).find(x => x.item === item) : null;
      const n = Math.max(0, Math.min(r.spend, row ? row.need - row.have : 0));
      gameState.inventory[item] = Math.max(0, (gameState.inventory[item] || 0) - n);
      commit(syncToday(recordGive(st(), day, { stage, item, accepted: n, today_left: left, village_before: raw.village_before }), day, left));
      refreshInventoryUI();
      ui.toast?.(winterToast(r.toastKey, item, n));
      afterGive(stage);
      await refreshWinter(true);
    } else if (r.params.reason === 'need' && stage === myStage(st())) {
      commit(syncToday(markFull(st(), stage, item), day, left));
      ui.toast?.(winterToast(r.toastKey, item, 0));
      afterGive(stage);
      await refreshWinter(true);
    } else {
      const s = r.params.reason === 'cap' ? recordCap(st(), day) : st();
      const next = syncToday(s, day, left);
      if (next !== st()) commit(next);
      ui.toast?.(winterToast(r.toastKey, item, 0));
    }
  } finally {
    busy = false;
    render();
    refreshQuestPanel();
  }
}

function adShort() {
  if (!economy() || winterPhase() !== 'active' || myStage(st()) >= FOUNTAIN_DONE) return null;
  const stage = myStage(st());
  return adPill('fountain_short', () => {
    if (winterPhase() !== 'active') return;
    const give = shortFill(stageRows(st()), gameState.inventory);
    if (!Object.keys(give).length) return;
    giveReward(give, 'fountain_short', `stage${stage}`);
    requestSave();
  }, render);
}

function adDouble(k) {
  if (!economy() || !doubleOpen(st(), k)) return null;
  return adPill('fountain_double', () => {
    if (!doubleOpen(st(), k)) return;
    const g = lampGrant(k).give;
    if (!g) return;
    giveReward(g, 'fountain_double', `lamp${k}`);
    commit(markDoubled(st(), k));
  }, render);
}

const ctx = () => ({
  kind: 'fountain', stage: stageNow(), rows: stageRows(st()), todayLeft: todayLeft(st(), dayNow()),
  inv: gameState.inventory, busy, guest: guest(), phase: winterPhase(), total: total(), lamps: st().lamps,
  adShort, adDouble,
  onDonate: onGive, onClose: () => { open = false; },
});

function render() { if (open) renderPlazaModal(ctx()); }

export function openWinter() {
  if (spot !== 'fountain') return;
  open = true;
  openPlazaModal('fountain', ctx());
  trackEvent('plaza_modal_open', { season: def.id, stage: stageNow(), today_left: todayLeft(st(), dayNow()), ...(guest() ? { guest: true } : {}) });
}

function trackView() {
  const stage = stageNow();
  if (viewed.has(stage) || dist2D(PLAZA, player.position) > VIEW_R) return;
  viewed.add(stage);
  trackEvent('plaza_view', { season: def.id, stage, pct: stage >= FOUNTAIN_DONE ? 100 : stagePct(stageRows(st())), from: 'other' });
}

export const winterGuideActive = () => !!arrow?.active;

const reached = () => !!gameState.hintsSeen?.visitFountain || myTotal(st()) > 0;

function tickGuide(dt, inVillage) {
  if (!guideEnv || debugStage !== null || !saveRestored) return;
  const s = st();
  const base = { phase: winterPhase(), open: featureGuidesOpen(gameState), reached: reached() };
  const busy = guideEnv.uiBusy() || guideEnv.cine();
  if (!bannered && inVillage && bannerDue({ ...base, busy, tries: s.banner })) {
    bannered = true;
    commit({ ...s, banner: s.banner + 1 });
    ui.showHintBanner?.({ ico: '❄️', title: WINTER_COPY.banner.title, line: WINTER_COPY.banner.line, near: () => true, attention: true, slotQuest: true, kind: 'feature', key: `fountain-${def.id}` });
  }
  if (dist2D(FOUNTAIN_AT, player.position) < FOUNTAIN_ARROW_REACH) arrived = true;
  const want = bannered && !arrived && arrowSec < YARD_STALL_SEC
    && arrowWanted({ ...base, inVillage, busy, other: !guideArbiter.mayShow('fountain') || !guideEnv.cameraFree() });
  if (!want) { if (arrow?.active) arrow.cancel('gate'); return; }
  arrow ??= guideEnv.makeGuide('fountain', FOUNTAIN_AT, FOUNTAIN_ARROW_REACH);
  if (!arrow.active) arrow.start();
  arrowSec += dt;
  arrow.update(dt);
}

export function winterSpot(pos) {
  spot = dist2D(FOUNTAIN_AT, pos) < SPOT_R ? 'fountain' : null;
  return spot;
}

export const winterSpotNow = () => spot;
export const fountainSpotNow = () => spot === 'fountain' && debugStage === null && winterPhase() === 'active';

export function initWinter(seasonDef, ge, debug) {
  def = seasonDef;
  debugStage = debug;
  guideEnv = ge ? makeGuideEnv(ge) : null;
  guideArbiter.register({ name: 'fountain', active: winterGuideActive });
  rebuild();
  refreshWinter();
}

export function updateWinter(dt, inVillage) {
  if (!def) return;
  if (gateOpens(saveRestored, mode)) { saveRestored = true; refreshWinter(); }
  tickFireworks(dt);
  tickGuide(dt, inVillage);
  if (!inVillage) { spot = null; return; }
  viewCheck -= dt;
  if (viewCheck > 0) return;
  viewCheck = 1;
  trackView();
  if (dist2D(PLAZA, player.position) < PLAZA_VIEW_R && nearPollDue(lastProg, Date.now(), lastNearPollAt)) {
    lastNearPollAt = Date.now();
    refreshWinter();
  }
}
