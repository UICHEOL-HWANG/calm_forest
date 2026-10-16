import { gameState, scene, solidCircle, ui, player, dist2D, fishMesh, mergeGeos, paintGeo, requestSave } from '../game.js';
import { emojiSprite } from '../spaces/kitchen-stage.js';
import { trackEvent } from '../analytics.js';
import { FISH_KINDS } from '../data/catalog.js';
import { SEA_SPECIES, HOUSE_POS } from '../data/places.js';
import { POND_R, POND_SPOTS, POND_VIEW_R, POND_VIEW_SEC } from '../data/pond.js';
import { pondView, pondChanges, pickPondSpot, pondBlocks, pondToastDue } from './rules.js';
import { buildPond } from './build.js';
import { POND_COPY } from './copy.js';
import { e3Decision } from '../exp-e3-boot.js';
import { spaceLinkOn } from '../exp-e3.js';

const RIVER_IDS = FISH_KINDS.map(k => k.rarity);
const SEA_IDS = SEA_SPECIES.map(s => s.id);
const seaColorOf = (sp) => SEA_SPECIES.find(s => s.id === sp)?.color ?? 0x6f8fa8;

let pond = null, solid = null, last = null, nearSec = 0, viewedDay = null, toastPending = false, toastWait = 0;

const kstDay = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
const outdoorRel = () => (Array.isArray(gameState.outdoor) ? gameState.outdoor : [])
  .filter(o => Number.isFinite(o?.x) && Number.isFinite(o?.z))
  .map(o => ({ dx: o.x - HOUSE_POS.x, dz: o.z - HOUSE_POS.z }));

function ensureBuilt() {
  if (pond) return true;
  const spot = pickPondSpot(POND_SPOTS, outdoorRel(), POND_R);
  if (!spot) return false;
  pond = buildPond({ fishMesh, mergeGeos, paintGeo, emojiSprite });
  pond.group.position.set(HOUSE_POS.x + spot.dx, 0, HOUSE_POS.z + spot.dz);
  scene.add(pond.group);
  solid = solidCircle(pond.group.position.x, pond.group.position.z, POND_R + 0.1);
  return true;
}

export function refreshPond(trigger) {
  if (!spaceLinkOn(e3Decision())) return;
  const view = pondView({ dexFish: gameState.dex?.fish, seaBest: gameState.sea?.best }, { riverIds: RIVER_IDS, seaIds: SEA_IDS });
  if (!view.has || !ensureBuilt()) return;
  const changes = pondChanges(last, view);
  pond.setContents(view, seaColorOf);
  last = view;
  for (const c of changes) {
    if (c.type === 'created') {
      trackEvent('pond_created', { trigger: trigger === 'load' ? 'existing' : trigger, species: c.species });
      if (!gameState.hintsSeen.pond) { toastPending = true; toastWait = 0; }
    } else {
      trackEvent('pond_fish_added', { species: c.species, kind: c.type === 'sea' ? 'sea' : 'river', count: view.fish.length + (view.sea ? 1 : 0) });
      if (trigger !== 'load') pond.pop(c.type === 'sea' ? '🌊' : '🐟');
    }
  }
}

export function updatePond(dt, inVillage) {
  if (!pond) return;
  pond.group.visible = inVillage;
  if (solid) solid.off = !inVillage;
  if (!inVillage) { nearSec = 0; toastWait = 0; return; }
  toastWait += dt;
  if (pondToastDue({ pending: toastPending, seen: !!gameState.hintsSeen.pond, inVillage, waitedSec: toastWait })) {
    gameState.hintsSeen.pond = true;
    toastPending = false;
    ui.toast?.(POND_COPY.created, 4200);
    requestSave();
  }
  pond.update(dt);
  const near = dist2D(player.position, pond.group.position) < POND_VIEW_R;
  nearSec = near ? nearSec + dt : 0;
  if (nearSec >= POND_VIEW_SEC && viewedDay !== kstDay()) {
    viewedDay = kstDay();
    trackEvent('pond_view', { count: (last?.fish.length ?? 0) + (last?.sea ? 1 : 0) });
  }
}

export function pondScatterBlocks(x, z, pad = 0) {
  return pondBlocks(POND_SPOTS, HOUSE_POS, x, z, POND_R, pad);
}
