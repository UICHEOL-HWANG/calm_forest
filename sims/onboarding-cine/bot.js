const g = await import('/js/game.js');
const V = g.camera.position.constructor;
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const right = new V(), fwd = new V();

function steer(to) {
  const p = g.player.position;
  const dx = to.x - p.x, dz = to.z - p.z, len = Math.hypot(dx, dz) || 1;
  right.set(1, 0, 0).applyQuaternion(g.camera.quaternion); right.y = 0; right.normalize();
  fwd.set(0, 0, -1).applyQuaternion(g.camera.quaternion); fwd.y = 0; fwd.normalize();
  const sx = (dx * right.x + dz * right.z) / len, sy = -(dx * fwd.x + dz * fwd.z) / len;
  g.Input.setAnalog(sx, sy);
}

export async function follow({ key, maxSec = 90, log = [] } = {}) {
  const t0 = performance.now();
  let lastMove = performance.now(), last = { x: g.player.position.x, z: g.player.position.z };
  while (performance.now() - t0 < maxSec * 1000) {
    if (window.__guide.cinematic) window.__guide.skip();
    if (window.__guide.cinematic || document.querySelector('[id$="-modal"].show')) { dismiss(); g.Input.setAnalog(0, 0); lastMove = performance.now(); await wait(200); continue; }
    const d = window.__guide.debug();
    if (!d.goal || (key && d.goal.key !== key)) { g.Input.setAnalog(0, 0); return { ok: false, why: 'goal', d }; }
    if (d.goal.near) { g.Input.setAnalog(0, 0); return { ok: true, sec: Math.round((performance.now() - t0) / 1000), at: d.at }; }
    if (!d.wp) { g.Input.setAnalog(0, 0); await wait(200); continue; }
    steer(d.wp);
    await wait(120);
    const p = g.player.position;
    if (Math.hypot(p.x - last.x, p.z - last.z) > 0.15) { last = { x: p.x, z: p.z }; lastMove = performance.now(); }
    else if (performance.now() - lastMove > 5000) { g.Input.setAnalog(0, 0); log.push({ stuck: [p.x, p.z], wp: d.wp, at: d.at }); return { ok: false, why: 'stuck', pos: [p.x, p.z], d }; }
  }
  g.Input.setAnalog(0, 0);
  return { ok: false, why: 'timeout', d: window.__guide.debug() };
}

export async function actUntil(pred, maxSec = 20) {
  const t0 = performance.now();
  while (performance.now() - t0 < maxSec * 1000) {
    if (pred()) return true;
    g.Input.doAction();
    await wait(450);
  }
  return pred();
}

export const state = () => ({ tut: g.Input.tutStep(), wood: g.gameState.inventory.wood, stone: g.gameState.inventory.stone, coal: g.gameState.inventory.coal, pos: [+g.player.position.x.toFixed(1), +g.player.position.z.toFixed(1)], atMine: g.$w.atMine, guide: window.__guide.debug() });
export { g };

export function dismiss() {
  const out = [];
  for (const m of document.querySelectorAll('[id$="-modal"].show')) {
    if (m.id === 'merchant-modal' || m.id === 'goal-cine-modal') continue;
    const b = [...m.querySelectorAll('button')].find(x => /나중에|닫기|확인|좋아요/.test(x.textContent));
    if (b) { b.click(); out.push(`${m.id}:${b.textContent.trim()}`); }
  }
  return out;
}

export async function chopToWood(target, maxSec = 35) {
  const t0 = performance.now(), log = [];
  while (g.gameState.inventory.wood < target && performance.now() - t0 < maxSec * 1000) {
    log.push(...dismiss());
    if (document.querySelector('#merchant-modal.show')) return { log, merchant: true };
    const d = window.__guide.debug();
    if (!d.goal || d.goal.key !== 'tree') return { log, why: 'goal', d };
    if (!d.goal.near) { const r = await follow({ key: 'tree', maxSec: 20 }); log.push(r.ok ? `walk${r.sec}` : r.why); if (!r.ok) return { log, r }; }
    const w0 = g.gameState.inventory.wood;
    await actUntil(() => g.gameState.inventory.wood > w0 || !!document.querySelector('[id$="-modal"].show'), 8);
    log.push(`wood${g.gameState.inventory.wood}`);
  }
  return { log, wood: g.gameState.inventory.wood };
}
