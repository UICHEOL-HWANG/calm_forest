import { STAGE_POS, SPOT_R, PAID_PLAYS } from '../data/concert.js';
import { concertDefault, restoreConcert, settle, buyPlan, spend, addInstrument, equip, markTutorial, paidLeft } from './rules.js';
import { windowsFor, makeJudge } from './judge.js';
import { chartOf, lengthMs, minGapMs, backingEvents, practiceChart, practiceEvents, PRACTICE_LENGTH_MS } from './songs.js';
import { createConcertAudio } from './audio.js';
import { CONCERT_COPY } from './copy.js';
import { resultView } from './views.js';
import { showHall, showResult } from './ui.js';
import { showLanes } from './lanes.js';
import { trackOpen, trackStart, trackEnd, trackExchange, trackLoginPrompt } from './track.js';
import { buildConcertStage, STAGE_SOLIDS, stageCheer, stageSway } from '../spaces/concert-stage-art.js';
import { hasConcertArt, concertDecorMesh } from './items.js';
import { guideNeed, guideTarget } from './guide.js';

export { concertDefault, restoreConcert, concertDecorMesh };

const SCATTER_R = 6;
const LAMP_DAY = 0;
const LAMP_NIGHT = 2.1;
const FILL_NIGHT = 3;
const CHEER_STREAK = 8;
const SWAY_BEAT_MS = 500;
const VIEW = Object.freeze({ half: 4, near: 1.9, far: 11 });
const WEEKLY_GUIDE = /\bweekly-\w+-guide\b/;

let deps = null;
let spot = false;
let show = null;
let stage = null;
let solidsAdded = false;
let onHidden = null;
let guide = null;
let guideOff = false;

const state = () => deps.getState();
const save = (next) => { deps.setState(next); deps.requestSave(); };

const inView = (x, z, pad = 0) => Math.abs(x - STAGE_POS.x) < VIEW.half + pad
  && z > STAGE_POS.z + VIEW.near - pad && z < STAGE_POS.z + VIEW.far + pad;

export function concertScatterBlocks(x, z, pad = 1) {
  return Math.hypot(x - STAGE_POS.x, z - STAGE_POS.z) < SCATTER_R + pad || inView(x, z, pad);
}

function hideView() {
  if (!deps.scene) return [];
  const hit = deps.scene.children.filter(o => o.visible && o !== stage && !o.isLight && inView(o.position.x, o.position.z));
  hit.forEach(o => { o.visible = false; });
  return hit;
}

const showView = (hidden) => hidden.forEach(o => { o.visible = true; });

export function initConcert(d) {
  if (show) closeShow();
  deps = d;
  spot = false;
  guide = null;
  guideOff = false;
  if (typeof document !== 'undefined' && !onHidden) {
    onHidden = () => { if (document.hidden) quitShow(); };
    document.addEventListener('visibilitychange', onHidden);
  }
  if (!(d.scene && d.THREE && d.solidCircle)) return;
  if (!solidsAdded) {
    STAGE_SOLIDS.forEach(([x, z, r]) => d.solidCircle(x, z, r));
    solidsAdded = true;
  }
  if (!stage) {
    stage = (d.buildStage || buildConcertStage)(d.THREE);
    d.scene.add(stage);
  }
}

function lightStage() {
  if (!stage) return;
  const level = Math.max(0, Math.min(1, deps.night?.() || 0));
  const glow = LAMP_DAY + (LAMP_NIGHT - LAMP_DAY) * level;
  for (const mat of stage.userData?.lamps || []) mat.emissiveIntensity = glow;
  if (stage.userData?.fill) stage.userData.fill.intensity = FILL_NIGHT * level;
}

const weeklyGuiding = () => typeof document !== 'undefined' && WEEKLY_GUIDE.test(document.body?.className || '');

function tickGuide(dt, inVillage) {
  const env = deps.guideEnv;
  if (!env || guideOff) return;
  if (spot) guideOff = true;
  const need = !guideOff && !show && guideNeed(state());
  const want = need && guideTarget({
    need, inVillage, pastOnboarding: env.pastOnboarding(),
    cameraFree: env.cameraFree(), uiBusy: env.uiBusy(), otherGuide: env.otherGuide() || weeklyGuiding(),
  });
  if (!want) {
    if (guide?.active) guide.cancel('gate');
    return;
  }
  guide ??= env.makeGuide('concert', STAGE_POS, SPOT_R);
  if (!guide.active) guide.start();
  guide.update(dt);
  if (!guide.active) guideOff = true;
}

export function updateConcert(dt, inVillage, pos) {
  if (!deps) return;
  lightStage();
  tickGuide(dt, inVillage);
  spot = inVillage && !show && Math.hypot(pos.x - STAGE_POS.x, pos.z - STAGE_POS.z) < SPOT_R;
  if (show) tickShow(dt);
}

export const concertSpotNow = () => spot;
export const concertPrompt = () => CONCERT_COPY.prompt;

function startShow(songId, practice = !state().tutorial) {
  if (show) closeShow();
  const s = state();
  const chart = practice ? practiceChart() : chartOf(songId);
  const diff = practice ? null : deps.roll();
  const judge = makeJudge(chart, windowsFor(diff ? diff.ease : 1, minGapMs(chart)));
  let audio = null;
  let view = null;
  try {
    deps.stage.enter(s.equipped);
    deps.bgm.pause();
    audio = (deps.createAudio || createConcertAudio)(deps.audio());
    view = (deps.showLanes || showLanes)({ chart, instrument: s.equipped, practice, onTap: tapLane, onQuit: quitShow });
    audio.start(practice ? practiceEvents() : backingEvents(songId));
  } catch (err) {
    audio?.stop();
    view?.close();
    deps.stage.exit();
    deps.bgm.resume();
    throw err;
  }
  show = {
    songId, practice, chart, diff, audio, view, judge, streak: 0, hidden: hideView(),
    endMs: practice ? PRACTICE_LENGTH_MS : lengthMs(songId),
  };
  if (!practice) trackStart(songId, s.equipped, PAID_PLAYS - paidLeft(s, deps.today()) + 1, deps.diffParams(diff));
}

function tapLane(lane) {
  if (!show) return;
  const hit = show.judge.tap(lane, show.audio.nowMs());
  show.view.flash(lane, hit ? hit.kind : null, hit ? hit.index : undefined);
  if (!hit) return;
  show.streak = hit.kind === 'perfect' ? show.streak + 1 : 0;
  show.audio.hit(state().equipped, lane);
  deps.stage.strike(lane);
}

function tickShow(dt) {
  const now = show.audio.nowMs();
  for (const index of show.judge.sweep(now)) {
    show.view.miss(index);
    show.streak = 0;
  }
  show.view.draw(now);
  deps.stage.update(dt);
  if (stage) {
    stageCheer(stage, Math.min(1, show.streak / CHEER_STREAK));
    stageSway(stage, (now / SWAY_BEAT_MS) % 1);
  }
  if (now >= show.endMs) finishShow();
}

function closeShow() {
  if (stage) stageCheer(stage, 0);
  showView(show.hidden);
  show.audio.stop();
  show.view.close();
  deps.stage.exit();
  deps.bgm.resume();
  show = null;
}

function quitShow() {
  if (!show) return;
  if (!show.practice) deps.abandon(show.diff, 'play', { song: show.songId });
  closeShow();
}

function finishShow() {
  const { songId, practice, judge, diff } = show;
  closeShow();
  if (practice) {
    save(markTutorial(state()));
    startShow(songId, false);
    return;
  }
  const summary = judge.summary();
  const r = settle(state(), { songId, ratio: summary.ratio, today: deps.today() });
  save(r.state);
  deps.settle(summary.ratio);
  trackEnd(songId, r.stars, Math.round(summary.ratio * 100), r.earned, summary.perfect, deps.diffParams(diff));
  (deps.showResult || showResult)({
    view: resultView({ stars: r.stars, earned: r.earned, bestUp: r.bestUp, summary }),
    onAgain: () => startShow(songId),
    onLeave: () => {},
  });
}

function onBuy(item) {
  const s = state();
  const isInstrument = item.type === 'instrument';
  const plan = buyPlan(s, item, {
    isGuest: deps.isGuest(),
    owned: isInstrument ? s.owned.includes(item.id) : deps.ownsDecor(item.id),
    hasArt: isInstrument || hasConcertArt(item.id),
  });
  if (plan.reason === 'guest') trackLoginPrompt(s.notes);
  if (!plan.ok) return plan;
  if (!isInstrument && !deps.grantDecorItem(item)) return { ok: false, reason: 'grant_failed' };
  const paid = spend(state(), item.cost);
  save(isInstrument ? addInstrument(paid, item.id) : paid);
  trackExchange(item.id, item.cost, paid.notes);
  return plan;
}

function onEquip(id) {
  const next = equip(state(), id);
  if (next !== state()) save(next);
}

export function openConcert() {
  if (!spot || show) return;
  guideOff = true;
  if (guide?.active) guide.cancel('gate');
  const s = state();
  trackOpen(s.notes, deps.isGuest());
  return (deps.showHall || showHall)({
    getState: state,
    env: () => ({ today: deps.today(), isGuest: deps.isGuest(), ownsDecor: deps.ownsDecor, hasArt: hasConcertArt, thumbs: {} }),
    onPlay: (songId) => startShow(songId),
    onEquip,
    onBuy,
    onLogin: () => deps.login?.(),
    onOpen: deps.stopMove,
  });
}

export function concertDev() {
  if (!deps) return null;
  return {
    state,
    notes: (n) => { if (Number.isInteger(n) && n >= 0) deps.setState({ ...state(), notes: n }); return state().notes; },
    own: (id) => { deps.setState(addInstrument(state(), id)); return state().owned; },
    use: (id) => { deps.setState(equip(state(), id)); return state().equipped; },
    play: (songId) => startShow(songId, false),
    quit: quitShow,
  };
}
