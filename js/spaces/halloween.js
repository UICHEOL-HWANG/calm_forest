import { $w, gameState, giveReward, houseWindows, obstacles, player, refreshInventoryUI, requestSave, scene, setSpaceVisible, snapCamera, solidCircle, todayStr, ui, firstHintBanner } from '../game.js';
import * as THREE from 'three';
import { t } from '../i18n.js';
import { trackEvent } from '../analytics.js';
import { Sound } from '../sound.js';
import { HALLOWEEN, HALLOWEEN_GATE } from '../data/places.js';
import { SALE_WINDOWS, saleOpen } from '../shop/sale-window.js';
import { ARRIVE, EXIT, EXIT_R, GHOST_FIND_R, GHOST_HINT_R, GHOST_SPOTS, GHOSTS_PER_DAY, STALL, STALL_R, clampToGarden } from '../halloween/layout.js';
import { cashoutCoins, findGhost, ghostsLeft, normalizeHalloween, takeFirstGift } from '../halloween/state.js';
import { applyExchange, normalizeBundles, rewardOf, REWARDS } from '../halloween/exchange.js';
import { buildGarden, buildGate, buildGhost } from '../halloween/garden-art.js';
import { closeStall, isStallOpen, openStall, showArriveCard } from '../halloween/ui.js';
import { inVillage2 } from './doors.js';

export const GATE_PROMPT = Object.freeze({ x: HALLOWEEN_GATE.x + 0.5, z: HALLOWEEN_GATE.z + 1.9, r: 2.0 });
const GATE_ROT = 0.35, GATE_SCALE = 0.85, GATE_EXIT_DZ = 4.2, GHOST_SCALE = 1.25;

let world = null, gate = null, arrivedAt = 0, busy = false, syncedDay = null;
const ghosts = new Map();

const DEV_OPEN = typeof location !== 'undefined' && ['localhost', '127.0.0.1'].includes(location.hostname) && new URLSearchParams(location.search).has('hw');
export const halloweenOpen = (now = Date.now()) => DEV_OPEN || saleOpen({ sale: 'halloweenGarden' }, now);

export function hwState() {
  const today = todayStr(), h = gameState.halloween;
  if (h && h.day === today && Array.isArray(h.found)) return h;
  gameState.halloween = normalizeHalloween(h, today);
  return gameState.halloween;
}

const candy = () => gameState.inventory.candy || 0;
const elapsed = () => Math.round((performance.now() - arrivedAt) / 100) / 10;
const worldX = (gh) => HALLOWEEN.x + gh.position.x;
const worldZ = (gh) => HALLOWEEN.z + gh.position.z;

function ensureWorld() {
  if (world) return world;
  const g = buildGarden(THREE, m => { m.emissiveIntensity = m.userData.k ?? 1; });
  g.position.copy(HALLOWEEN);
  g.visible = false;
  for (const s of GHOST_SPOTS) {
    const gh = buildGhost(THREE, null);
    gh.scale.setScalar(GHOST_SCALE);
    gh.position.set(s.x, 0.3, s.z);
    gh.rotation.y = Math.atan2(-s.x, -s.z) + Math.PI;
    gh.userData = { id: s.id, base: 0.3, phase: Math.random() * 6.28, fly: 0 };
    g.add(gh);
    ghosts.set(s.id, gh);
  }
  scene.add(g);
  solidCircle(HALLOWEEN.x + STALL.x, HALLOWEEN.z + STALL.z, 0.95);
  world = g;
  return world;
}

function syncGhosts() {
  syncedDay = todayStr();
  const left = new Set(ghostsLeft(hwState(), todayStr()));
  for (const [id, gh] of ghosts) { gh.visible = left.has(id); gh.userData.fly = 0; gh.scale.setScalar(GHOST_SCALE); }
}

export function setHalloweenVisible(on) { if (world) world.visible = on; }

export function spawnHalloweenGate() {
  if (gate || !halloweenOpen()) return gate;
  gate = buildGate(THREE, m => { m.userData.nightScale = (m.userData.k ?? 1) / 2.1; houseWindows.push(m); }, { title: t('달빛 유령 정원'), sub: t('🎃 11/2까지') });
  gate.position.copy(HALLOWEEN_GATE);
  gate.rotation.y = GATE_ROT;
  gate.scale.setScalar(GATE_SCALE);
  scene.add(gate);
  solidCircle(HALLOWEEN_GATE.x, HALLOWEEN_GATE.z, 1.55);
  obstacles.push({ x: HALLOWEEN_GATE.x, z: HALLOWEEN_GATE.z, r: 2.4 });
  return gate;
}

function fadeThen(fn) {
  if (busy) return;
  busy = true; $w.sleeping = true;
  ui.sleepFade?.(1, 'dream');
  setTimeout(() => {
    try { fn(); } catch (e) { console.error('[halloween] transition failed', e); } finally {
      ui.sleepFade?.(0, 'dream');
      setTimeout(() => { $w.sleeping = false; busy = false; }, 700);
    }
  }, 650);
}

function clearPrompts() { $w.nearDoor = null; ui.setDoorPrompt?.(null); ui.setZoneHint?.(null); $w.lastZoneHint = null; $w.lastDoorPrompt = null; }

export function enterHalloween() {
  if (busy || !inVillage2() || !halloweenOpen()) return;
  ensureWorld();
  fadeThen(() => {
    const h = hwState();
    gameState.halloween = { ...h, visits: h.visits + 1 };
    syncGhosts();
    $w.atHalloween = true;
    player.position.set(HALLOWEEN.x + ARRIVE.x, 0, HALLOWEEN.z + ARRIVE.z);
    player.rotation.y = Math.PI;
    clearPrompts(); snapCamera(); setSpaceVisible();
    arrivedAt = performance.now();
    Sound.blip();
    trackEvent('hw_enter', { visit_n: gameState.halloween.visits, left_today: ghostsLeft(gameState.halloween, todayStr()).length, candy: candy() });
    if (!gameState.halloween.gifted) showArriveCard(() => {
      const r = takeFirstGift(hwState());
      gameState.halloween = r.hw;
      if (r.candy) giveReward({ candy: r.candy }, 'hw_gift');
      requestSave();
    });
  });
}

export function exitHalloween(via = 'gate') {
  if (busy) return;
  closeStall();
  fadeThen(() => {
    $w.atHalloween = false;
    const p = halloweenReturnPos();
    player.position.set(p.x, 0, p.z);
    player.rotation.y = GATE_ROT;
    clearPrompts(); snapCamera(); setSpaceVisible();
    Sound.blip();
    trackEvent('hw_exit', { found_today: hwState().found.length, elapsed_s: elapsed(), via });
    requestSave();
  });
}

export function halloweenReturnPos() {
  return { x: HALLOWEEN_GATE.x + Math.sin(GATE_ROT) * GATE_EXIT_DZ, z: HALLOWEEN_GATE.z + Math.cos(GATE_ROT) * GATE_EXIT_DZ };
}

export function clampToHalloween(p) {
  const c = clampToGarden(p.x - HALLOWEEN.x, p.z - HALLOWEEN.z);
  p.x = HALLOWEEN.x + c.x; p.z = HALLOWEEN.z + c.z;
}

function nearestGhost(p) {
  let best = null, bd = Infinity;
  for (const id of ghostsLeft(hwState(), todayStr())) {
    const gh = ghosts.get(id); if (!gh || gh.userData.fly) continue;
    const d = Math.hypot(p.x - worldX(gh), p.z - worldZ(gh));
    if (d < bd) { bd = d; best = id; }
  }
  return { id: best, d: bd };
}

export function halloweenVillagePrompt(p) {
  if (!gate || !halloweenOpen()) return null;
  if (Math.hypot(p.x - GATE_PROMPT.x, p.z - GATE_PROMPT.z) >= GATE_PROMPT.r) return null;
  firstHintBanner('hwGate', '🎃', '할로윈 한정', '마을에 유령 정원이 열렸어요');
  return { nd: 'halloween', prompt: '🎃 달빛 유령 정원으로 가기' };
}

export function halloweenPrompt(p) {
  const lx = p.x - HALLOWEEN.x, lz = p.z - HALLOWEEN.z;
  if (Math.hypot(lx - EXIT.x, lz - EXIT.z) < EXIT_R) return { nd: 'hwexit', prompt: '🚪 마을로 돌아가기' };
  const g = nearestGhost(p);
  if (g.id && g.d < GHOST_FIND_R) { $w.hwGhostId = g.id; return { nd: 'hwghost', prompt: '👻 유령 찾기' }; }
  if (Math.hypot(lx - STALL.x, lz - STALL.z) < STALL_R) return { nd: 'hwstall', prompt: '🍬 사탕 좌판 보기' };
  return { nd: null, prompt: null };
}

function catchGhost(id) {
  const r = findGhost(hwState(), id, todayStr());
  if (!r.candy) return;
  gameState.halloween = r.hw;
  giveReward({ candy: r.candy }, 'hw_ghost');
  const gh = ghosts.get(id); if (gh) gh.userData.fly = 0.0001;
  Sound.blip();
  ui.toast?.(t('찾았다! 🍬 +2'), 1600);
  if (r.bonus) setTimeout(() => ui.toast?.(t('3일 연속! 🍬 +5'), 2200), 1700);
  if (r.allFound) setTimeout(() => ui.toast?.(t('오늘 유령을 다 찾았어요. 내일 다른 곳에 또 숨어요'), 2600), r.bonus ? 4000 : 1700);
  trackEvent('hw_ghost', { spot: id, n_today: r.hw.found.length, elapsed_s: elapsed(), candy: candy() });
  requestSave();
}

function exchange(id) {
  const r = applyExchange({ candy: candy(), bundles: gameState.hwBundles, open: halloweenOpen() }, id, todayStr());
  if (!r.ok) {
    if (r.reason === 'candy') ui.toast?.(t(`사탕이 ${r.need}개 더 필요해요`), 1600);
    else if (r.reason === 'limit') ui.toast?.(t('오늘은 2번까지 바꿀 수 있어요'), 1600);
    return false;
  }
  const def = rewardOf(id);
  gameState.inventory.candy = r.candy;
  gameState.hwBundles = r.bundles;
  if (r.decor) {
    const stored = gameState.house.stored || (gameState.house.stored = {});
    stored[id] = (stored[id] || 0) + 1;
    refreshInventoryUI();
    ui.toast?.(t(`${def.name}을 받았어요! 집 꾸미기에서 놓아 보세요`), 2400);
  } else {
    giveReward({ ...r.give }, 'hw_exchange', id);
  }
  Sound.blip();
  trackEvent('hw_exchange', { item: id, cost: def.cost, candy_left: r.candy, owned_n: gameState.house.stored?.[id] || 0, tab: def.tab });
  requestSave();
  return true;
}

function stallView() {
  const stored = gameState.house.stored || {};
  const used = normalizeBundles(gameState.hwBundles, todayStr()).used;
  return { candy: candy(), items: REWARDS.map(r => ({ ...r, owned: stored[r.id] || 0, usedToday: used[r.id] || 0 })) };
}

export function halloweenAction(nd) {
  if (nd === 'halloween') return enterHalloween();
  if (nd === 'hwexit') return exitHalloween('gate');
  if (nd === 'hwghost') return catchGhost($w.hwGhostId);
  if (nd === 'hwstall') return openStall(stallView(), (id) => ({ ok: exchange(id), view: stallView() }));
}

export function updateHalloween(dt, time) {
  if (!world || !world.visible) return;
  if (syncedDay !== todayStr()) syncGhosts();
  const p = player.position;
  for (const gh of ghosts.values()) {
    if (!gh.visible) continue;
    const u = gh.userData;
    if (u.fly) {
      u.fly += dt;
      gh.position.y = u.base + u.fly * 4;
      gh.scale.setScalar(GHOST_SCALE * Math.max(0, 1 - u.fly / 0.6));
      if (u.fly > 0.6) { gh.visible = false; gh.scale.setScalar(GHOST_SCALE); }
      continue;
    }
    const near = Math.hypot(p.x - worldX(gh), p.z - worldZ(gh)) < GHOST_HINT_R ? 1 : 0;
    gh.position.y = u.base + Math.sin(time * (1.6 + near * 2.4) + u.phase) * (0.12 + near * 0.08);
    gh.rotation.z = Math.sin(time * 0.9 + u.phase) * 0.25;
  }
  const h = hwState();
  const hint = `🎃 달빛 유령 정원 · 👻 ${h.found.length}/${GHOSTS_PER_DAY} · 🍬 ${candy()}`;
  if (hint !== $w.lastZoneHint) { $w.lastZoneHint = hint; ui.setZoneHint?.(hint); }
}

export function halloweenMinimapMarks(marks) {
  marks.push({ x: HALLOWEEN.x + EXIT.x, z: HALLOWEEN.z + EXIT.z + 0.8, c: '#c8905a', kind: 'exit' });
  marks.push({ x: HALLOWEEN.x + STALL.x, z: HALLOWEEN.z + STALL.z, c: '#e8822e', r: 3.2 });
}

export function settleHalloween() {
  const today = todayStr();
  gameState.halloween = normalizeHalloween(gameState.halloween, today);
  gameState.hwBundles = normalizeBundles(gameState.hwBundles, today);
  const left = gameState.inventory.candy || 0;
  if (left > 0 && today > SALE_WINDOWS.halloweenGarden.to) {
    const coins = cashoutCoins(left);
    gameState.inventory.candy = 0;
    giveReward({ coins }, 'hw_candy_cashout');
    trackEvent('hw_cashout', { candy: left, coins });
    setTimeout(() => ui.toast?.(t(`남은 사탕 ${left}개를 🪙 ${coins}로 바꿨어요`), 3200), 2500);
  }
}

export const halloweenStallOpen = () => isStallOpen();
