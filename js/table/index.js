import {
  gameState, scene, solidBox, solidCircle, removeSolid, obstacles, trees, swayables, grassClumps, plots, ui, player, dist2D, mergeGeos, paintGeo,
  requestSave,
} from '../game.js';
import { trackEvent } from '../analytics.js';
import { RECIPES } from '../data/catalog.js';
import { HOUSE_POS } from '../data/places.js';
import { TABLE_SHAPES } from '../data/table.js';
import { COOK_TIERS } from '../spaces/cooking.js';
import { setOwlNoFly } from '../spaces/npc.js';
import { tableView, tableChanges } from './rules.js';
import { tableFootprint, tableKeepOut, tableSiteNext, segmentHitsKeepOut, tableClear, tableMapKey as siteKey } from './site.js';
import { buildTable } from './build.js';
import { TABLE_COPY } from './copy.js';
import { buildDashRing } from '../pond/sign-build.js';
import { signPulseDue, SIGN_PULSE_SEC } from '../pond/sign.js';
import { clearYard } from '../pond/yard-clear.js';
import { pondToastDue, shouldTrackCreated } from '../pond/rules.js';
import { pondRadius } from '../pond/stage.js';
import { pondPos, pondStage, pondMapKey, outdoorRel } from '../pond/index.js';
import { guideArbiter } from '../guide/arbiter.js';
import { e3Decision } from '../exp-e3-boot.js';
import { spaceLinkOn } from '../exp-e3.js';

const STYLE = 'picnic', GROW_SEC = 2, OWL_PAD = 0.8, VIEW_PAD = 3;

let table = null, ring = null, solid = null, blocks = [], site = '', shape = '', last = null, pondKey = '';
let pulse = 0, toast = '', toastWait = 0;

const rel = (p) => ({ dx: p.x - HOUSE_POS.x, dz: p.z - HOUSE_POS.z });

function yard() {
  const pond = pondPos();
  return {
    pond: pond ? { ...rel(pond), r: pondRadius(pondStage()) } : null,
    outdoorRel: outdoorRel(),
    plotsRel: plots.filter(p => Number.isFinite(p?.x) && Number.isFinite(p?.z)).map(rel),
  };
}

function teardown() {
  if (!table) return;
  scene.remove(table.group, ring.mesh);
  table.dispose();
  ring.dispose();
  removeSolid(solid);
  for (const b of blocks) {
    const i = obstacles.indexOf(b);
    if (i >= 0) obstacles.splice(i, 1);
  }
  setOwlNoFly(null);
  table = null; ring = null; solid = null; blocks = []; site = ''; shape = ''; pulse = 0;
}

function build(pick, view) {
  const f = tableFootprint(pick, view.shape, HOUSE_POS), clear = tableClear(view.shape);
  let model = null, hoop = null;
  try {
    model = buildTable({ style: STYLE, shape: view.shape, dishes: view.dishes, mergeGeos, paintGeo });
    hoop = buildDashRing({ mergeGeos, reach: TABLE_SHAPES[view.shape].reach });
  } catch (e) {
    model?.dispose();
    console.warn('[table] build failed', e);
    return false;
  }
  clearYard({ scene, trees, obstacles, swayables, grassClumps, removeSolid }, f.x, f.z, clear.r, clear.treeR, clear.south);
  model.group.position.set(f.x, 0, f.z);
  hoop.mesh.position.set(f.x, hoop.mesh.position.y, f.z);
  scene.add(model.group, hoop.mesh);
  table = model; ring = hoop; site = pick.id; shape = view.shape;
  solid = view.shape === 'long' ? solidBox(f.x - f.hx, f.z - f.hz, f.x + f.hx, f.z + f.hz) : solidCircle(f.x, f.z, f.hx);
  blocks = tableKeepOut(pick, view.shape, HOUSE_POS);
  obstacles.push(...blocks);
  setOwlNoFly((ax, az, bx, bz) => segmentHitsKeepOut({ x: ax, z: az }, { x: bx, z: bz }, blocks, OWL_PAD));
  return true;
}

function ensureBuilt(view) {
  const pick = tableSiteNext(yard(), table && shape === view.shape ? site : null);
  if (table && pick?.id === site && shape === view.shape) return 'kept';
  teardown();
  return pick && build(pick, view) ? 'built' : '';
}

export function refreshTable(trigger) {
  pondKey = pondMapKey();
  if (!spaceLinkOn(e3Decision())) return;
  const view = tableView(gameState.kitchen?.best, RECIPES, COOK_TIERS);
  if (!view.has) { teardown(); last = null; return; }
  const state = ensureBuilt(view);
  if (!state) return;
  if (state === 'kept') table.setDishes(view.dishes);
  else if (trigger !== 'load') table.grow(GROW_SEC);
  const hints = gameState.hintsSeen;
  for (const c of tableChanges(last, view)) {
    if (c.type === 'created') {
      if (shouldTrackCreated(trigger, !!hints.tableSeen)) trackEvent('table_created', { trigger: trigger === 'load' ? 'existing' : trigger, count: view.dishes.length });
      if (!hints.tableSeen) { toast = 'created'; toastWait = 0; }
    } else if (c.type === 'long' && !hints.tableLong) { toast = 'long'; toastWait = 0; }
  }
  last = view;
}

export function updateTable(dt, inVillage) {
  if (pondMapKey() !== pondKey) refreshTable('pond');
  if (!table) return;
  table.group.visible = inVillage;
  ring.mesh.visible = inVillage;
  solid.off = !inVillage;
  if (!inVillage) { toastWait = 0; return; }
  toastWait += dt;
  if (pondToastDue({ pending: toast, inVillage, waitedSec: toastWait })) {
    gameState.hintsSeen[toast === 'long' ? 'tableLong' : 'tableSeen'] = true;
    ui.toast?.(TABLE_COPY[toast], 4200);
    toast = ''; toastWait = 0;
    requestSave();
  }
  table.update(dt);
  const inView = dist2D(player.position, table.group.position) < TABLE_SHAPES[shape].reach + VIEW_PAD;
  if (signPulseDue({ seen: !!gameState.hintsSeen.tableRingSeen, inView, busy: guideArbiter.busy(), coach: !!ui.coachActive?.(), modal: !!ui.anyModalOpen?.() })) {
    gameState.hintsSeen.tableRingSeen = true;
    pulse = SIGN_PULSE_SEC;
    requestSave();
  }
  pulse = Math.max(0, pulse - dt);
  ring.update(dt, tableNear(), pulse);
}

export function tableExists() {
  return !!table;
}

export function tablePos() {
  return table ? { x: table.group.position.x, z: table.group.position.z } : null;
}

export function tableNear() {
  return !!table && table.group.visible && dist2D(player.position, table.group.position) < TABLE_SHAPES[shape].reach;
}

export function tableDishCount() {
  return last?.dishes.length ?? 0;
}

export function tableMapKey() {
  return table ? siteKey(site, shape) : '';
}

export function tableSettling() {
  return !!table?.growing();
}

export function markTableRingSeen() {
  pulse = 0;
  if (gameState.hintsSeen.tableRingSeen) return;
  gameState.hintsSeen.tableRingSeen = true;
  requestSave();
}
