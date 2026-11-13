import { Input } from '../game-lazy.js';
import { t } from '../i18n.js';
import { SELL_ICO_G } from '../data/sell-icons.js';
import { sellList, clampQty, itemName } from '../shop/sell-rules.js';
import { iconById } from '../icons/index.js';

let $, ui, lastInv;

// ── 상점 메뉴 (팔기 / 사기) ──
let shopTab = 'sell';
let sellSel = null, sellQ = 1;
const trendHtml = d => (d > 0 ? `<span class="up">▲${d}%</span>` : d < 0 ? `<span class="down">▼${-d}%</span>` : '');
function holdRepeat(btn, step) {
  let wait = null, rep = null;
  const stop = () => { clearTimeout(wait); clearInterval(rep); wait = rep = null; window.removeEventListener('pointerup', stop); };
  btn.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault(); stop();
    if (!step()) return;
    window.addEventListener('pointerup', stop);
    wait = setTimeout(() => { rep = setInterval(() => { if (!step()) stop(); }, 70); }, 380);
  });
  ['pointerleave', 'pointercancel'].forEach(ev => btn.addEventListener(ev, stop));
  btn.addEventListener('click', (e) => { if (e.detail === 0) step(); });
  btn.addEventListener('contextmenu', (e) => e.preventDefault());
}
function renderSellSheet(it) {
  const sheet = $('sell-sheet');
  if (!it || shopTab !== 'sell') { sheet.hidden = true; sheet.innerHTML = ''; return; }
  sellQ = clampQty(sellQ, it.have);
  sheet.hidden = false;
  sheet.innerHTML = `<div class="ss-top"><span class="ss-ico">${SELL_ICO_G[it.k] || '📦'}</span><span><div class="ss-nm">${it.name}</div><div class="ss-sub"><span>개당 🪙${it.price}</span>${trendHtml(it.rate)} · <span>${it.have}개 있어요</span></div></span></div>
    <div class="ss-row"><div class="ss-step"><button class="ss-dec" aria-label="-1">−</button><span class="ss-q"></span><button class="ss-inc" aria-label="+1">+</button></div>
    <button class="ss-max">전부</button><button class="ss-go"></button></div>`;
  const dec = sheet.querySelector('.ss-dec'), inc = sheet.querySelector('.ss-inc'), max = sheet.querySelector('.ss-max'), go = sheet.querySelector('.ss-go');
  const paint = () => {
    sheet.querySelector('.ss-q').textContent = sellQ;
    dec.disabled = sellQ <= 1;
    inc.disabled = sellQ >= it.have;
    max.classList.toggle('on', sellQ === it.have);
    go.textContent = `팔기 🪙${it.price * sellQ}`;
  };
  const bump = (n) => { if (!dec.isConnected) return false; const q = clampQty(sellQ + n, lastInv()[it.k] || 0); if (q === sellQ) return false; sellQ = q; paint(); return true; };
  holdRepeat(dec, () => bump(-1));
  holdRepeat(inc, () => bump(1));
  max.addEventListener('click', () => { sellQ = it.have; paint(); });
  go.addEventListener('click', () => {
    const r = Input.sellItem(it.k, sellQ);
    if (!r.ok) { ui.toast(r.msg); return; }
    ui.toast(r.qty === it.have ? `🪙 +${r.gain} (${r.qty}개 전부)` : `🪙 +${r.gain} (${r.qty}개)`);
    sellQ = 1;
    renderShop();
    showSellAd(it.k, r.gain);
  });
  paint();
}
function showSellAd(k, gain) {
  const box = $('sell-ad');
  box.replaceChildren();
  const b = Input.sellAdButton(k, gain, (ok) => { if (!ok) return; box.replaceChildren(); renderShop(); });
  if (b) box.appendChild(b);
}
function renderShop() {
  $('shop-coin').textContent = `🪙 ${lastInv().coins || 0}`;
  if (shopTab === 'sell') {
    const market = Input.getMarket().items; const box = $('sell-items'); const keepTop = box.scrollTop; box.innerHTML = '';
    const list = sellList(market, lastInv());
    const top = market[0];
    if (top && top.rate > 0) {
      const banner = document.createElement('div');
      banner.className = 'market-banner';
      banner.innerHTML = `📊 <span>오늘 가장 비싼 건</span> ${SELL_ICO_G[top.k] || '📦'} <b>${itemName(top.label)}</b> ${trendHtml(top.rate)}`;
      box.appendChild(banner);
    }
    if (!list.length) {
      sellSel = null;
      const empty = document.createElement('div');
      empty.className = 'sl-empty';
      empty.innerHTML = '<div>팔 수 있는 게 없어요</div><div>작물·목재·물고기를 모아 오세요</div>';
      box.appendChild(empty);
      renderSellSheet(null);
      return;
    }
    if (!list.some(i => i.k === sellSel)) { sellSel = list[0].k; sellQ = 1; }
    const grid = document.createElement('div');
    grid.className = 'sl-grid';
    list.forEach((it, n) => {
      const el = document.createElement('button');
      el.className = 'sl-cell' + (it.k === sellSel ? ' sel' : '') + (n === 0 && it.rate > 0 ? ' hot' : '');
      el.innerHTML = `<span class="sl-tr">${it.rate > 0 ? '<span class="up">▲</span>' : it.rate < 0 ? '<span class="down">▼</span>' : ''}</span><span class="sl-ico">${SELL_ICO_G[it.k] || '📦'}</span><span class="sl-nm">${it.name}</span><span class="sl-cnt">${it.have}</span>`;
      el.addEventListener('click', () => { if (sellSel !== it.k) { sellSel = it.k; sellQ = 1; } renderShop(); });
      grid.appendChild(el);
    });
    box.appendChild(grid);
    box.scrollTop = keepTop;
    renderSellSheet(list.find(i => i.k === sellSel));
  } else {
    const box = $('buy-items'); box.innerHTML = '';
    const owned = Input.ownedUpgrades(), homiTier = Input.homiTier();
    Input.getShopBuy().filter(it => !it.homi).forEach(it => {
      const isOwned = it.homi ? homiTier >= it.homi : it.upgrade && owned[it.upgrade];
      const locked = it.homi && homiTier < it.homi - 1;
      const can = !isOwned && !locked && (lastInv().coins || 0) >= it.coin;
      const el = document.createElement('div');
      el.className = 'ck-item' + (can || (it.homi && isOwned) ? '' : ' off');
      const costLabel = isOwned ? (it.homi ? '보유중 ✅ · 각인' : '보유중 ✅') : locked ? '🔒 앞 단계 먼저' : `🪙${it.coin}`;
      el.innerHTML = `<span class="ck-ico">${it.ico}</span><span class="ck-name">${it.name}</span><span class="ck-buff">${it.desc || '&nbsp;'}</span><span class="ck-cost">${costLabel}</span>`;
      el.addEventListener('click', () => {
        if (it.homi && isOwned) { openHomi(); return; }
        const r = Input.buyShop(it.id); if (!r.ok) { ui.toast(r.msg); return; }
        if (it.id.startsWith('sap_') && !Input.hintSeen('saplingPurchase')) pendingSaplingPurchaseSpotlight = true;
        ui.toast(`🛍️ ${r.name} 구매!`); renderShop();
      });
      box.appendChild(el);
    });
    const next = document.createElement('div');
    next.className = 'market-hint';
    next.textContent = '다음 목표: 🐔 닭장 60 · 🏡 넓은 집 80 · ✨ 정령 등불 60';
    box.appendChild(next);
  }
}
let homiSel = 0;
const RES_NAME = { mf_clam: '바지락', mf_cockle: '꼬막', mf_razor: '맛조개', mf_crab: '칠게' };
const costText = c => Object.entries(c).map(([k, n]) => `${t(RES_NAME[k] || k)} ${n}`).join(' · ');
function renderHomi() {
  const d = Input.homiInfo();
  $('homi-ico').innerHTML = iconById(d.ico);
  const base = $('homi-base');
  base.style.display = d.base.length ? 'flex' : 'none';
  base.innerHTML = d.base.map(e => iconById(e.ico)).join('') + t(`기본으로 들어 있어요: ${d.base.map(e => e.name).join(' · ')}`);
  if (homiSel >= d.slots.length) homiSel = 0;
  const slots = $('homi-slots'); slots.innerHTML = '';
  for (let i = 0; i < d.maxSlots; i++) {
    const el = document.createElement('div');
    const id = d.slots[i], e = d.engraves.find(x => x.id === id);
    el.className = 'hm-slot' + (i >= d.slots.length ? ' lock' : e ? ' on' : '') + (i === homiSel && i < d.slots.length ? ' sel' : '');
    el.innerHTML = i >= d.slots.length ? t('다음 호미에서 열려요') : e ? `${iconById(e.ico)}${t(e.name)}` : t('각인을 골라 주세요');
    if (i < d.slots.length) el.addEventListener('click', () => { homiSel = i; renderHomi(); });
    slots.appendChild(el);
  }
  const tiles = $('homi-tiles'); tiles.innerHTML = '';
  d.engraves.forEach(e => {
    const el = document.createElement('div');
    const label = e.base ? t('기본') : e.slot >= 0 ? t('끼움') : e.owned ? t('끼우기') : costText(e.cost);
    const usable = !e.base && d.slots.length > 0 && (e.owned || e.afford);
    el.className = 'hm-tile' + (e.slot >= 0 ? ' on' : '') + (usable || e.slot >= 0 ? '' : ' off');
    el.innerHTML = `${iconById(e.ico)}<span><b>${t(e.name)}</b><small>${label}</small></span>`;
    el.title = t(e.desc);
    el.addEventListener('click', () => onHomiTile(e, d));
    tiles.appendChild(el);
  });
}
function renderHomiTiers() {
  const box = $('homi-tiers'); box.innerHTML = '';
  Input.homiStallTiers().forEach(it => {
    const el = document.createElement('div');
    const can = !it.owned && !it.locked && it.afford;
    el.className = 'hm-tile' + (it.owned ? ' on' : can ? '' : ' off');
    const label = it.owned ? t('보유중') : it.locked ? t('🔒 앞 단계 먼저') : `🪙${it.coin}`;
    el.innerHTML = `${it.ico}<span><b>${t(it.name)}</b><small>${label}</small></span>`;
    el.title = t(it.desc || '');
    el.addEventListener('click', () => {
      if (it.owned) return;
      if (it.locked) { ui.toast('앞 단계 호미를 먼저 사 주세요'); return; }
      const r = Input.buyShop(it.id);
      if (!r.ok) { ui.toast(r.msg); return; }
      ui.toast(`🛍️ ${r.name} 구매!`); renderHomiStall();
    });
    box.appendChild(el);
  });
}
function renderHomiSkins() {
  const rows = Input.homiStallSkins(), box = $('homi-skins');
  $('homi-skin-wrap').style.display = rows.length ? 'flex' : 'none';
  box.innerHTML = '';
  rows.forEach(r => {
    const el = document.createElement('div');
    el.className = 'hm-tile' + (r.mode === 'owned' ? ' on' : '');
    el.innerHTML = `<i class="hm-emo">${r.ico}</i><span><b>${t(r.name)}</b><small>${r.mode === 'owned' ? t('보유중') : r.label}</small></span>`;
    el.addEventListener('click', openHomiSkins);
    box.appendChild(el);
  });
}
function openHomiSkins() {
  $('homi-menu').classList.remove('show');
  Input.setCosTab?.('homi');
  ui.openCosShop();
}
function renderHomiStall() { renderHomiTiers(); renderHomi(); renderHomiSkins(); }
function onHomiTile(e, d) {
  if (e.base) { ui.toast('이 호미에 이미 들어 있는 효과예요'); return; }
  if (!d.slots.length) { ui.toast('길쭉 자루 호미부터 각인 칸이 생겨요'); return; }
  if (e.slot >= 0) { const r = Input.equipHomiEngrave(e.slot, null); if (!r.ok) ui.toast(r.msg); renderHomi(); return; }
  if (!e.owned) {
    const r = Input.buyHomiEngrave(e.id);
    if (!r.ok) { ui.toast(r.msg); return; }
    ui.toast(t(`${e.name} 각인을 샀어요`));
  }
  const empty = d.slots.indexOf(null);
  const slot = d.slots[homiSel] == null ? homiSel : empty >= 0 ? empty : homiSel;
  const r = Input.equipHomiEngrave(slot, e.id);
  if (!r.ok) ui.toast(r.msg);
  renderHomi();
}
function openHomi() {
  homiSel = 0;
  renderHomiStall();
  $('homi-menu').classList.add('show');
  document.body.classList.add('menu-open');
}
function showShopTab(t) {
  shopTab = t;
  $('sell-ad').replaceChildren();
  [...document.querySelectorAll('#shop-menu .sh-tab')].forEach(b => b.classList.toggle('active', b.dataset.tab === t));   // 좌판 탭만 — .sh-tab 은 꾸미기 가게·캐릭터 창도 쓴다
  $('sell-items').style.display = t === 'sell' ? 'flex' : 'none';
  $('buy-items').style.display = t === 'buy' ? 'flex' : 'none';
  if (t !== 'sell') renderSellSheet(null);
  renderShop();
}
let pendingSaplingPurchaseSpotlight = false;

export function installShopMenu(ctx) {
  ({ $, ui, lastInv } = ctx);
  $('homi-skin-go').addEventListener('click', openHomiSkins);
  $('homi-close').addEventListener('click', () => { $('homi-menu').classList.remove('show'); document.body.classList.remove('menu-open'); });
  document.querySelectorAll('#shop-menu .sh-tab').forEach(b => b.addEventListener('click', () => showShopTab(b.dataset.tab)));
  $('shop-close').addEventListener('click', () => {
    $('shop-menu').classList.remove('show'); document.body.classList.remove('menu-open');
    if (pendingSaplingPurchaseSpotlight) {
      pendingSaplingPurchaseSpotlight = false;
      setTimeout(() => ui.startSaplingPurchaseSpotlight(), 80);
    }
  });
  return { renderShop, openHomi, showShopTab };
}

export const PANEL_IDS = ['buy-items', 'homi-base', 'homi-close', 'homi-ico', 'homi-menu', 'homi-skin-go', 'homi-skin-wrap', 'homi-skins', 'homi-slots', 'homi-tiers', 'homi-tiles', 'sell-ad', 'sell-items', 'sell-sheet', 'shop-close', 'shop-coin', 'shop-menu'];
