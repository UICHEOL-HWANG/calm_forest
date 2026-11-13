import { Input } from '../game-lazy.js';

let $, ui;

// ── 집 외관 꾸미기 ──
const hex = (c) => '#' + c.toString(16).padStart(6, '0');
function renderExt() {
  const { style, unlocked, roof, wall, door } = Input.getHouseStyle();
  const rows = { roof: { box: 'ext-roof', cols: roof }, wall: { box: 'ext-wall', cols: wall }, door: { box: 'ext-door', cols: door } };
  Object.entries(rows).forEach(([part, { box, cols }]) => {
    const el = $(box); el.innerHTML = '';
    cols.forEach((c, i) => {
      const has = unlocked[part].includes(i);
      const s = document.createElement('div');
      s.className = 'ext-sw' + (style[part] === i ? ' sel' : '') + (has ? '' : ' locked');
      s.style.background = has ? hex(c) : '#c8ccc8';
      if (!has) s.textContent = '🔒';
      s.addEventListener('click', () => {
        if (!has) { ui.toast('아직 잠긴 색이에요. 낚시·수확·퀘스트로 얻어요 🎨'); return; }
        Input.setHousePart(part, i); renderExt();
      });
      el.appendChild(s);
    });
  });
  renderExpand();
  renderAddons();
}
// 🧩 구성품 상점 — 지금 단계(+다음 단계는 🔒 예고)까지의 장식. 사면 코인이 빠지고 집에 바로 붙는다
function renderAddons() {
  const box = $('ext-addons'); const info = Input.getHouseAddons();
  const items = info.items.filter(i => i.stage <= info.stage + 1);
  if (!items.length) { box.innerHTML = ''; return; }
  const btn = (i) => i.owned ? '<button class="ad-btn done" disabled>✓ 설치됨</button>'
    : i.locked ? `<button class="ad-btn" disabled>🔒 ${i.stage}단계부터</button>`
    : `<button class="ad-btn" data-id="${i.id}" ${i.affordable ? '' : 'disabled'}>사기</button>`;
  box.innerHTML = `<div class="ad-head"><span>🧩 구성품</span><span class="ad-coins">🪙 ${info.coins}</span></div><div class="ad-list">` +
    items.map(i => `<div class="ad-row${i.owned ? ' owned' : ''}${i.locked ? ' locked' : ''}"><span class="ad-ico">${i.ico}</span>` +
      `<span class="ad-txt"><b>${i.name}</b><small>${i.desc}</small></span>` +
      `<span class="ad-price${!i.owned && !i.locked && !i.affordable ? ' lack' : ''}">${i.coins}🪙</span>${btn(i)}</div>`).join('') + '</div>';
  box.querySelectorAll('.ad-btn[data-id]').forEach(b => b.addEventListener('click', () => {
    const r = Input.buyHouseAddon(b.dataset.id);
    if (r.msg) ui.toast(r.msg, 2600);
    if (r.ok) renderAddons();   // 코인·설치 상태 갱신
  }));
}
// 🏗️ 증축 섹션 — 다음 단계 비용·보유량 표시, 충족 시 버튼 활성화
let xpStyle = null;   // 🏡 7단계(정원 저택) 증축에서 고른 스타일 'modern'|'hanok' — 고른 뒤엔 바꿀 수 없어 증축 전까지만 기억
function renderExpand() {
  const box = $('ext-expand'); const info = Input.getExpansion();
  if (info.maxed) { box.innerHTML = '🏡 <b>정원 저택 완성!</b> 마을에서 가장 근사한 집이에요.'; return; }
  if (!info.next) { box.innerHTML = ''; return; }
  const rows = info.items.map(i => `<span class="${i.have < i.need ? 'xp-lack' : ''}">${i.label} ${i.have}/${i.need}</span>`).join(' · ');
  const cards = info.needsStyle
    ? '<div class="xp-hint">🎨 스타일을 골라 주세요 — 한 번 고르면 바꿀 수 없어요</div><div class="xp-styles">' +
      Object.entries(info.next.styles).map(([id, st]) => `<button type="button" class="xp-style${xpStyle === id ? ' on' : ''}" data-style="${id}"><span class="xp-sico">${st.ico}</span><b>${st.name}</b><small>${st.desc}</small></button>`).join('') + '</div>'
    : '';
  const ready = info.affordable && (!info.needsStyle || xpStyle);
  box.innerHTML = `🏗️ 다음 증축: <b>${info.next.ico} ${info.next.name}</b> — 집이 커지고 모양이 바뀌어요!<br>` +
    `<span class="xp-cost">${rows}</span>` + cards +
    `<button id="xp-btn" class="xp-btn" ${ready ? '' : 'disabled'}>${!info.affordable ? '재료를 더 모아요' : (info.needsStyle && !xpStyle) ? '스타일을 골라요' : '🔨 증축하기'}</button>`;
  box.querySelectorAll('.xp-style').forEach(b => b.addEventListener('click', () => { xpStyle = b.dataset.style; renderExpand(); }));
  $('xp-btn').addEventListener('click', () => {
    const r = Input.expandHouse(xpStyle);
    ui.toast(r.msg, 3200);
    if (r.ok) { xpStyle = null; renderExt(); }   // 증축 후 정보 갱신(다음 단계 표시)
  });
}

export function installHouseExterior(ctx) {
  ({ $, ui } = ctx);
  // 🎨 집 외관 꾸미기 — 완성된 집 근처에서만 뜨는 버튼(공간 기반 동선)
  //    열린 동안엔 카메라가 집을 화면 위쪽(패널 위)에 두어 색이 바뀌는 게 가려지지 않게 한다
  $('ext-btn').addEventListener('click', () => {
    renderExt(); Input.setAnalog(0, 0); Input.setExtView(true);
    $('ext-menu').classList.add('show'); document.body.classList.add('menu-open');
  });
  $('ext-close').addEventListener('click', () => { $('ext-menu').classList.remove('show'); document.body.classList.remove('menu-open'); Input.setExtView(false); });
  return {};
}

export const PANEL_IDS = ['ext-addons', 'ext-btn', 'ext-close', 'ext-expand', 'ext-menu'];
