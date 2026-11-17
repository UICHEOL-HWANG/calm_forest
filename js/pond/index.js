import {
  gameState, scene, solidCircle, removeSolid, obstacles, trees, swayables, grassClumps, ui, player, dist2D, fishMesh, mergeGeos, paintGeo,
  requestSave,
} from '../game.js';
import { emojiSprite } from '../spaces/kitchen-stage.js';
import { trackEvent } from '../analytics.js';
import { FISH_KINDS } from '../data/catalog.js';
import { SEA_SPECIES, HOUSE_POS } from '../data/places.js';
import { POND_R, POND_SPOTS, POND_VIEW_SEC, POND_TREE_CLEAR, POND_SOUTH_CLEAR } from '../data/pond.js';
import { pondView, pondChanges, pickPondSpot, pondBlocks, pondToastDue, shouldTrackCreated } from './rules.js';
import { pondStageOf, pondRadius, pondSpotFor, pondActR, pondViewR, pondFishLimits, pondBigSpotBlocks, pondGrowTipDue } from './stage.js';
import { pondRimOf } from './rim.js';
import { pondBook } from './feed.js';
import { clearYard } from './yard-clear.js';
import { buildPond } from './build.js';
import { pondSignPos, signNear, signPulseDue, SIGN_SOLID_R, SIGN_PULSE_SEC, SIGN_REACH } from './sign.js';
import { buildPondSign } from './sign-build.js';
import { guideArbiter } from '../guide/arbiter.js';
import { POND_COPY } from './copy.js';
import { kstDate } from '../kst-date.js';
import { e3Decision } from '../exp-e3-boot.js';
import { spaceLinkOn } from '../exp-e3.js';

const RIVER_IDS = FISH_KINDS.map(k => k.rarity);
const SEA_IDS = SEA_SPECIES.map(s => s.id);
const seaColorOf = (sp) => SEA_SPECIES.find(s => s.id === sp)?.color ?? 0x6f8fa8;

const YARD_PAD = 0.6, PATCH_PAD = 0.3, GROW_SEC = 2;
const SIGN_PAD = 0.6, SIGN_TREE_CLEAR = SIGN_REACH + 0.2, SIGN_SOUTH_CLEAR = 2.5;

let sign = null, signSolid = null, pulse = 0;
let pond = null, solid = null, block = null, built = 0, rim = '', last = null, nearSec = 0, viewedDay = null, toastPending = false, toastWait = 0, tip = 0;

const kstDay = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
export const outdoorRel = () => (Array.isArray(gameState.outdoor) ? gameState.outdoor : [])
  .filter(o => Number.isFinite(o?.x) && Number.isFinite(o?.z))
  .map(o => ({ dx: o.x - HOUSE_POS.x, dz: o.z - HOUSE_POS.z }));

export function pondStage() {
  return pondStageOf(gameState.hintsSeen);
}

function teardown() {
  if (!pond) return;
  scene.remove(pond.group);
  pond.dispose();
  removeSolid(solid);
  const i = obstacles.indexOf(block);
  if (i >= 0) obstacles.splice(i, 1);
  scene.remove(sign.group);
  sign.dispose();
  removeSolid(signSolid);
  sign = null; signSolid = null; pulse = 0;
  pond = null; solid = null; block = null; built = 0; rim = '';
}

function ensureBuilt() {
  const stage = pondStage();
  if (pond && built === stage) return true;
  const spot = pondSpotFor(stage, pickPondSpot(POND_SPOTS, outdoorRel(), POND_R));
  if (!spot) return false;
  teardown();
  const r = pondRadius(stage), x = HOUSE_POS.x + spot.dx, z = HOUSE_POS.z + spot.dz;
  if (stage >= 2) clearYard({ scene, trees, obstacles, swayables, grassClumps, removeSolid }, x, z, r + YARD_PAD, r + POND_TREE_CLEAR, POND_SOUTH_CLEAR);
  const at = pondSignPos({ x, z }, r, HOUSE_POS);
  clearYard({ scene, trees, obstacles, swayables, grassClumps, removeSolid }, at.x, at.z, SIGN_PAD, SIGN_TREE_CLEAR, SIGN_SOUTH_CLEAR);
  const post = buildPondSign({ mergeGeos, paintGeo });
  rim = pondRimOf(gameState.hintsSeen);
  pond = buildPond({ fishMesh, mergeGeos, paintGeo, emojiSprite, r, stage, rim });
  pond.group.position.set(x, 0, z);
  scene.add(pond.group);
  solid = solidCircle(x, z, r + 0.1);
  block = { x, z, r: r + 0.1 };
  obstacles.push(block);
  sign = post;
  sign.group.position.set(at.x, 0, at.z);
  scene.add(sign.group);
  signSolid = solidCircle(at.x, at.z, SIGN_SOLID_R);
  built = stage;
  return true;
}

export function refreshPond(trigger) {
  if (!spaceLinkOn(e3Decision())) return;
  const limits = pondFishLimits(pondStage());
  const view = pondView({ dexFish: gameState.dex?.fish, seaBest: gameState.sea?.best }, { riverIds: RIVER_IDS, seaIds: SEA_IDS }, limits);
  if (!view.has || !ensureBuilt()) return;
  const changes = pondChanges(last, view);
  pond.setContents(view, seaColorOf, limits);
  last = view;
  for (const c of changes) {
    if (c.type === 'created') {
      if (shouldTrackCreated(trigger, !!gameState.hintsSeen.pond)) {
        trackEvent('pond_created', { trigger: trigger === 'load' ? 'existing' : trigger, species: c.species });
      }
      if (!gameState.hintsSeen.pond) { toastPending = true; toastWait = 0; }
      if (trigger !== 'load' && !gameState.hintsSeen.pondDay) { gameState.hintsSeen.pondDay = kstDate(); requestSave(); }
    } else {
      trackEvent('pond_fish_added', { species: c.species, kind: c.type === 'sea' ? 'sea' : 'river', count: view.fish.length + (view.sea ? 1 : 0) });
      if (trigger !== 'load') pond.pop(c.type === 'sea' ? '🌊' : '🐟');
    }
  }
  const due = pondGrowTipDue(gameState.hintsSeen, pondBook().got);
  if (due !== tip) { tip = due; toastWait = 0; }
}

export function rebuildPond() {
  if (!spaceLinkOn(e3Decision())) return;
  teardown();
  refreshPond('expand');
  pond?.grow(GROW_SEC);
}

export function setPondRim() {
  if (!spaceLinkOn(e3Decision()) || !pond) return;
  const next = pondRimOf(gameState.hintsSeen);
  if (next === rim) return;
  pond.setRim(next);
  rim = next;
}

export function updatePond(dt, inVillage) {
  if (!pond) return;
  pond.group.visible = inVillage;
  sign.group.visible = inVillage;
  if (solid) solid.off = !inVillage;
  signSolid.off = !inVillage;
  if (!inVillage) { nearSec = 0; toastWait = 0; return; }
  toastWait += dt;
  if (pondToastDue({ pending: toastPending, seen: !!gameState.hintsSeen.pond, inVillage, waitedSec: toastWait })) {
    gameState.hintsSeen.pond = true;
    toastPending = false;
    toastWait = 0;
    ui.toast?.(POND_COPY.created, 4200);
    requestSave();
  } else if (pondToastDue({ pending: tip, inVillage, waitedSec: toastWait })) {
    gameState.hintsSeen.pondGrowTip = tip;
    tip = 0;
    ui.toast?.(POND_COPY.growTip.replace('{0}', pondBook().got), 4200);
    requestSave();
  }
  pond.update(dt);
  const near = dist2D(player.position, pond.group.position) < pondViewR(built);
  if (signPulseDue({ seen: !!gameState.hintsSeen.pondSignSeen, inView: near, busy: guideArbiter.busy(), coach: !!ui.coachActive?.(), modal: !!ui.anyModalOpen?.() })) {
    gameState.hintsSeen.pondSignSeen = true;
    pulse = SIGN_PULSE_SEC;
    requestSave();
  }
  pulse = Math.max(0, pulse - dt);
  sign.update(dt, pondSignNear(), pulse);
  nearSec = near ? nearSec + dt : 0;
  if (nearSec >= POND_VIEW_SEC) {
    const day = kstDay();
    if (viewedDay !== day) {
      viewedDay = day;
      trackEvent('pond_view', { count: (last?.fish.length ?? 0) + (last?.sea ? 1 : 0) });
    }
  }
}

export function pondScatterBlocks(x, z, pad = 0) {
  return pondBlocks(POND_SPOTS, HOUSE_POS, x, z, POND_R, pad);
}

export function pondPatchBlocks(x, z, patchR) {
  return pondBigSpotBlocks(HOUSE_POS, x, z, patchR + PATCH_PAD);
}

export function pondMapKey() {
  return pondExists() ? `${built}${rim}@${pond.group.position.x.toFixed(1)},${pond.group.position.z.toFixed(1)}` : '';
}

export function pondSettling() {
  return !!pond?.growing();
}

export function pondExists() {
  return !!pond && !!last?.has;
}

export function pondPos() {
  return pondExists() ? { x: pond.group.position.x, z: pond.group.position.z } : null;
}

export function pondNear() {
  return pondExists() && pond.group.visible && dist2D(player.position, pond.group.position) < pondActR(built);
}

export function pondSignNear() {
  return pondExists() && sign.group.visible && signNear(sign.group.position, player.position);
}

export function markPondSignSeen() {
  pulse = 0;
  if (gameState.hintsSeen.pondSignSeen) return;
  gameState.hintsSeen.pondSignSeen = true;
  requestSave();
}

export function pondCount() {
  return (last?.fish.length ?? 0) + (last?.sea ? 1 : 0);
}

export function pondGather() {
  pond?.gather(2);
}
