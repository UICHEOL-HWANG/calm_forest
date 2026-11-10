import { gameState, refreshInventoryUI, requestSave, todayStr, ui } from '../game.js';
import { trackEvent } from '../analytics.js';
import { logEcon } from '../metrics.js';
import { UPGRADES } from '../data/catalog.js';
import { updateHouseSign } from '../spaces/house.js';
import { STAR_TOOLS, STAR_EFFECT, forgeCheck, forgeStart, forgeCancel, forgeScore, forgeComplete, starOf } from './rules.js';
import { FORGE_COPY, doneToast } from './copy.js';

const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\])$/;

function upgradeOf(tool) { return UPGRADES.find(u => u.id === tool); }

function commit(patch) {
  Object.assign(gameState, patch);
  refreshInventoryUI();
  requestSave();
}

export function forgeView() {
  const forge = gameState.forge ? { ...gameState.forge } : null;
  const tools = STAR_TOOLS.map(tool => {
    const u = upgradeOf(tool);
    return {
      tool, name: u?.name || tool, ico: u?.ico || '🔨', owned: !!gameState.upgrades?.[tool],
      star: starOf(gameState, tool), effects: [...STAR_EFFECT[tool]], check: forgeCheck(gameState, tool),
    };
  });
  return { forge, tools };
}

export function forgeBegin(tool) {
  const chk = forgeCheck(gameState, tool);
  if (chk.state === 'noTool') return { ok: false, msg: FORGE_COPY.noTool };
  if (chk.state === 'busy') return { ok: false, msg: FORGE_COPY.busy };
  if (chk.state === 'max') return { ok: false, msg: FORGE_COPY.max };
  if (chk.state === 'short') return { ok: false, msg: FORGE_COPY.short };
  const next = forgeStart(gameState, tool, todayStr());
  if (!next) return { ok: false };
  commit(next);
  trackEvent('forge_start', { tool, star: next.forge.star });
  logEcon('tool_star', tool + next.forge.star, -next.forge.coins, gameState.inventory.coins);
  return { ok: true, tool, star: next.forge.star, coins: next.forge.coins };
}

export function forgeAbort() {
  const f = gameState.forge;
  const next = forgeCancel(gameState);
  if (!next) return { ok: false };
  commit(next);
  logEcon('tool_star_cancel', f.tool + f.star, f.coins, gameState.inventory.coins);
  return { ok: true };
}

export function forgeFinish(score) {
  const next = forgeScore(gameState, score);
  if (!next) return { ok: false };
  const { refund, ...patch } = next;
  commit(patch);
  const f = gameState.forge;
  trackEvent('forge_result', { tool: f.tool, star: f.star, score: f.score, refund });
  if (refund > 0) logEcon('tool_star_refund', f.tool + f.star, refund, gameState.inventory.coins);
  return { ok: true, tool: f.tool, star: f.star, score: f.score, refund };
}

export function settleForge(slept = false) {
  const res = forgeComplete(gameState, todayStr(), slept);
  if (!res) return null;
  const { done, ...patch } = res;
  Object.assign(gameState, patch);
  if (done.tool === 'hammer') updateHouseSign();
  trackEvent('forge_done', { tool: done.tool, star: done.star });
  const u = upgradeOf(done.tool);
  ui.toast?.(doneToast(u?.ico || '🔨', u?.name || done.tool, done.star), 2800, { afterDialog: true });
  requestSave();
  return done;
}

if (typeof location !== 'undefined' && LOCAL_HOST.test(location.hostname)) {
  globalThis.__forge = {
    state: () => ({ toolStars: { ...gameState.toolStars }, forge: gameState.forge ? { ...gameState.forge } : null }),
    age: () => { if (gameState.forge) gameState.forge = { ...gameState.forge, day: todayStr(-1) }; return gameState.forge; },
    settle: (slept = false) => settleForge(slept),
  };
}
