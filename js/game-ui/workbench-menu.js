import { Input, requestSave } from '../game-lazy.js';
import { Sound } from '../sound.js';
import { SELL_ICO_G } from '../data/sell-icons.js';
import { createForgeGame } from '../workbench/forge-ui.js';
import { toolView, outView, giftView, carveView, pickSel, allItems, tourPick } from '../workbench/bench-view.js';
import { listHtml, sheetHtml } from '../workbench/bench-ui.js';
import { benchSteps } from '../onboarding/bench-steps.js';
import { FORGE_COPY } from '../workbench/copy.js';

let $, ui, TOUCH, spot, refreshActionIcon, openCarveHud, lastInv, setPlacingDecorItem;

// ── 작업대 메뉴 (도구 / 야외 / 선물 탭) — 요리는 🍳 자유주방으로 분리 ──
let cookTab = 'tool';
// 🌟 bug(반딧불이)가 빠져 있어 촘촘한 포충망·금빛 포충망 비용이 '🪵12 🪵2' 처럼 목재로 보였다(2026-09-24 리뷰)
const ico = (k) => ({ fish: '🐟', crop: '🥕', wood: '🪵', stone: '🪨', coal: '⚫', gem: '💎', seed: '🌰', coins: '🪙', bug: '🌟', star: '⭐', glow: '✨' })[k] || SELL_ICO_G[k] || '🪵';
const WB_INV = ['wood', 'crop', 'fish', 'stone', 'coal', 'gem'];
const WB_WIDE = '(min-width: 700px)';
const wbSel = { tool: null, out: null, gift: null, carve: null };
function updateCookInv() {
  $('cook-coin').textContent = `🪙 ${lastInv().coins || 0}`;
  $('cook-inv').innerHTML = WB_INV.map(k => `<span>${ico(k)} ${lastInv()[k] || 0}</span>`).join('');
}
let forgeGame = null;
function forgeGameOf() {
  forgeGame ||= createForgeGame($('forge-modal'), {
    onAbort: () => Input.forgeAbort(),
    onFinish: (score) => Input.forgeFinish(score),
    onHit: (pts) => (pts ? Sound.chop() : Sound.blip()),
    adButton: () => Input.forgeAdButton?.(),
    onClose: (tool) => { wbSel.tool = tool || wbSel.tool; ui.openCook('tool'); },
  });
  return forgeGame;
}
function startForge(tool) {
  const v = (Input.getForge?.()?.tools || []).find(x => x.tool === tool);
  if (!v || v.check.state === 'short') { ui.toast(FORGE_COPY.short); return; }
  const res = Input.forgeBegin(v.tool);
  if (!res.ok) { ui.toast(res.msg || FORGE_COPY.short); return; }
  closeCook();
  forgeGameOf().open({ tool: v.tool, star: res.star, ico: v.ico });
}
function benchView(t) {
  const inv = lastInv();
  if (t === 'tool') {
    const fv = Input.getForge?.() || {};
    return toolView({ upgrades: Input.getUpgrades(), owned: Input.ownedUpgrades(), stars: fv.tools || [], forge: fv.forge, tier2: Input.getTier2?.() || [], weather: Input.getWeatherPrep(), inv });
  }
  if (t === 'out') return outView({ outdoor: Input.getOutdoor(), stored: Input.getOutdoorStored?.() || {}, atFarm: !!Input.isAtFarm?.(), inv });
  if (t === 'gift') return giftView({ gifts: Input.getGifts(), owned: Input.ownedGifts(), kept: Input.keptGifts(), inv });
  return carveView({ workshop: Input.getWorkshop() });
}
function benchDone(msg) { ui.toast(msg); renderBench(); }
function benchGo(it) {
  const a = it.act;
  if (!a || it.btn.disabled) return;
  if (a.kind === 'forge') { startForge(a.tool); return; }
  if (a.kind === 'upgrade') {
    const res = Input.craftUpgrade(a.id);
    if (!res.ok) { ui.toast(res.msg || '만들 수 없어요'); return; }
    benchDone(`${it.ico} ${res.name} 제작 완료!`);
    return;
  }
  if (a.kind === 'cover') {
    const res = Input.craftCover();
    if (!res.ok) { ui.toast(res.msg || '만들 수 없어요'); return; }
    benchDone('🛡️ 덮개 설치 완료 — 내일 밭이 안전해요!');
    return;
  }
  if (a.kind === 'tier2') {
    const res = Input.craftTier2(a.tool);
    if (!res.ok) { ui.toast(res.msg || '만들 수 없어요'); return; }
    benchDone(`✨ ${res.name} 제작 완료!`);
    return;
  }
  if (a.kind === 'gift') {
    const res = Input.craftGift(a.id);
    if (!res.ok) { ui.toast(res.msg || '재료가 부족해요'); return; }
    benchDone(`${it.ico} ${res.name} 제작! 주민에게 대화 → 선물 주기`);
    return;
  }
  if (a.kind === 'place') {
    const o = Input.getOutdoor().find(x => x.id === a.id);
    if (!o) return;
    Input.selectOutdoor(o.id); closeCook();
    setPlacingDecorItem(o); refreshActionIcon();
    ui.toast(`${o.ico} ${o.name} · ${TOUCH ? '⭕' : 'Space'}로 놓기`, 2400, { chips: true });
    return;
  }
  if (a.kind === 'carve') {
    const st = Input.carveStart(a.id);
    if (!st.ok) { ui.toast(st.msg || '재료가 부족해요'); return; }
    closeCook();
    openCarveHud(st);
  }
}
function renderBench() {
  updateCookInv();
  const v = benchView(cookTab);
  const sel = wbSel[cookTab] = pickSel(v, wbSel[cookTab]);
  const banner = $('wb-banner');
  banner.hidden = !v.banner;
  banner.textContent = v.banner;
  const list = $('wb-list'), keep = list.scrollTop;
  list.innerHTML = listHtml(v, sel);
  list.scrollTop = keep;
  list.querySelectorAll('.wb-cell').forEach(b => b.addEventListener('click', () => { wbSel[cookTab] = b.dataset.id; renderBench(); }));
  const it = allItems(v).find(i => i.id === sel);
  const sheet = $('wb-sheet');
  sheet.innerHTML = it ? sheetHtml(it, ico) : '';
  sheet.querySelector('.wb-go')?.addEventListener('click', () => benchGo(it));
}
function showCookTab(t) {
  if (t !== cookTab) $('wb-list').scrollTop = 0;
  cookTab = t;
  document.querySelectorAll('#cook-menu .ck-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === t));
  renderBench();
}
function runBenchTour() {
  if (!spot || Input.hintSeen('spotBench') || spot.active()) return;
  const back = cookTab;
  wbSel.tool = tourPick(benchView('tool')) || wbSel.tool;
  showCookTab('tool');
  const hasStars = !!document.querySelector('#wb-list .wb-cell[data-star]');
  const open = () => $('cook-menu').classList.contains('show');
  let stepped = false;
  const markSeen = () => { Input.markHintsSeen(['spotBench']); requestSave(); };
  setTimeout(() => {
    if (!open() || spot.active()) return;
    spot.run(benchSteps({ wide: matchMedia(WB_WIDE).matches, hasStars }), {
      kind: 'bench', skip: 'all',
      blocked: () => !open(),
      pause: () => !!document.querySelector('[id$="-modal"].show, #boat-shop.show, #worldmap.show') || document.body.classList.contains('mg-open'),
      onStep: () => { stepped = true; },
    }).then(() => {
      if (stepped || open()) markSeen();
      if (back !== 'tool' && open()) showCookTab(back);
    });
  }, 60);
}
function closeCook() { $('cook-menu').classList.remove('show'); document.body.classList.remove('menu-open'); }

export function installWorkbenchMenu(ctx) {
  ({ $, ui, TOUCH, spot, refreshActionIcon, openCarveHud, lastInv, setPlacingDecorItem } = ctx);
  document.querySelectorAll('#cook-menu .ck-tab').forEach(b => b.addEventListener('click', () => showCookTab(b.dataset.tab)));
  $('cook-close').addEventListener('click', closeCook);
  return { renderBench, showCookTab, runBenchTour, closeCook };
}

export const PANEL_IDS = ['cook-close', 'cook-coin', 'cook-inv', 'cook-menu', 'forge-modal', 'wb-banner', 'wb-list', 'wb-sheet'];
