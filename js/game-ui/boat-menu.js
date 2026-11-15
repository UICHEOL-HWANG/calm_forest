import { Input } from '../game-lazy.js';
import { renderDock } from '../boat/dock-ui.js';

let $, ui;

// ── 🛶 나룻배: 결과 모달 · 🧰 창고(배 강화) · 런 조작 버튼 ──
function renderBoatShop(d) {
  renderDock($('bs-dock'), d, {
    select(id) { const r = Input.selectBoat(id); if (!r.ok) ui.toast(r.msg); renderBoatShop(Input.getDock()); },
    course(c) { const r = Input.selectCourse(c); if (!r.ok && r.msg) ui.toast(r.msg); renderBoatShop(Input.getDock()); },
    unlock(id) { const r = Input.unlockBoat(id); if (!r.ok) { ui.toast(r.msg); return; } ui.toast(`${r.ico} ${r.name} 완성!`, 2400); renderBoatShop(Input.getDock()); },
  });
}

export function installBoatMenu(ctx) {
  ({ $, ui } = ctx);
  $('bs-close').addEventListener('click', () => $('boat-shop').classList.remove('show'));
  $('boat-shop').addEventListener('click', (e) => { if (e.target === $('boat-shop')) $('boat-shop').classList.remove('show'); });
  $('boat-result-close').addEventListener('click', () => $('boat-result').classList.remove('show'));
  $('br-again').addEventListener('click', () => { $('boat-result').classList.remove('show'); Input.startBoatRun(); });
  $('boat-quit').addEventListener('click', () => Input.quitBoatRun());
  $('boat-skill').addEventListener('click', () => Input.boatSkill());
  $('boat-view').addEventListener('click', () => {
    const m = Input.toggleBoatView();
    $('boat-view').textContent = m === 'first' ? '👁️ 1인칭' : '👁️ 3인칭';
    ui.toast(m === 'first' ? '👁️ 1인칭 시점 (뱃머리)' : '👁️ 3인칭 시점 (멀미가 나면 이쪽으로)');
  });
  return { renderBoatShop };
}

export const PANEL_IDS = ['boat-quit', 'boat-result', 'boat-result-close', 'boat-shop', 'boat-skill', 'boat-view', 'br-again', 'bs-close', 'bs-dock'];
