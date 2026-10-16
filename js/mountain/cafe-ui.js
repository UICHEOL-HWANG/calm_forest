import { CAFE_TABS, itemsOfTab } from './cafe-catalog.js';
import { rowOf } from './cafe-shop.js';
import { t } from '../i18n.js';

export const CAFE_COPY = Object.freeze({
  title: '☕ 산장 카페', drink: '☕ 몸이 따뜻해졌어요', sled: '🛷 다음 판부터 이 썰매를 타요',
  gift: '🧺 보관함에 넣어 뒀어요', poor: '코인이 모자라요', close: '닫기',
});

const bump = (bag, id) => ({ ...(bag || {}), [id]: ((bag || {})[id] || 0) + 1 });

export function applyCafeResult(gs, r) {
  if (!r.ok) return { toast: r.why === 'poor' ? CAFE_COPY.poor : null };
  gs.inventory.coins = r.st.coins;
  const g = r.grant;
  if (g.type === 'drink') return { toast: CAFE_COPY.drink, drink: { cup: g.cup } };
  if (g.type === 'sled') { gs.mountain = { ...(gs.mountain || {}), hut: r.st.hut }; return { toast: CAFE_COPY.sled }; }
  if (g.type === 'cos') { gs.cosmetics = r.st.cos; return { toast: null }; }
  if (g.type === 'house') { gs.house.stored = bump(gs.house.stored, g.id); return { toast: CAFE_COPY.gift }; }
  gs.outdoorStored = bump(gs.outdoorStored, g.id);
  return { toast: CAFE_COPY.gift };
}

const CSS = `#hut-cafe-modal{position:fixed;left:0;right:0;bottom:0;z-index:40;display:none;justify-content:center;padding:0 12px calc(14px + env(safe-area-inset-bottom))}
#hut-cafe-modal.show{display:flex}
#hut-cafe-modal .hc-sheet{width:min(520px,100%);max-height:62vh;display:flex;flex-direction:column;background:#fffaf2;border-radius:22px;box-shadow:0 -8px 40px rgba(30,25,20,.35);padding:16px 16px 12px;color:#2b2b30}
#hut-cafe-modal .hc-head{display:flex;justify-content:space-between;align-items:center;font-weight:800;font-size:17px;margin-bottom:10px}
#hut-cafe-modal .hc-tabs{display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap}
#hut-cafe-modal .hc-tab{border:0;border-radius:999px;padding:7px 12px;background:#efe6d8;font-weight:700;font-size:13px}
#hut-cafe-modal .hc-tab.on{background:#2f6fd6;color:#fff}
#hut-cafe-modal .hc-list{overflow:auto;display:flex;flex-direction:column;gap:8px}
#hut-cafe-modal .hc-row{display:flex;justify-content:space-between;align-items:center;gap:10px;background:#fff;border-radius:14px;padding:10px 12px;font-size:14px}
#hut-cafe-modal .hc-row button{border:0;border-radius:12px;padding:8px 12px;background:#e2b23c;font-weight:800;white-space:nowrap}
#hut-cafe-modal .hc-row button:disabled{background:#e6e1d8;color:#8a8f99}
#hut-cafe-modal .hc-close{margin-top:10px;border:0;border-radius:12px;padding:10px;background:#efe6d8;font-weight:700}`;

let root = null, tab = 'drink', hooks = null;

function ensure() {
  if (root) return root;
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  root = document.createElement('div');
  root.id = 'hut-cafe-modal';
  root.innerHTML = '<div class="hc-sheet"><div class="hc-head"><span class="hc-title"></span><span class="hc-coins"></span></div><div class="hc-tabs"></div><div class="hc-list"></div><button class="hc-close"></button></div>';
  document.body.appendChild(root);
  root.querySelector('.hc-close').onclick = () => closeCafeModal();
  return root;
}

function render() {
  const st = hooks.getState();
  root.querySelector('.hc-title').textContent = t(CAFE_COPY.title);
  root.querySelector('.hc-coins').textContent = `🪙 ${st.coins.toLocaleString()}`;
  root.querySelector('.hc-close').textContent = t(CAFE_COPY.close);
  const tabs = root.querySelector('.hc-tabs');
  tabs.innerHTML = '';
  for (const [id, label] of CAFE_TABS) {
    const b = document.createElement('button');
    b.className = 'hc-tab' + (tab === id ? ' on' : '');
    b.textContent = t(label);
    b.onclick = () => { tab = id; render(); };
    tabs.appendChild(b);
  }
  const list = root.querySelector('.hc-list');
  list.innerHTML = '';
  for (const it of itemsOfTab(tab)) {
    const row = rowOf(it, st);
    const el = document.createElement('div');
    el.className = 'hc-row';
    const name = document.createElement('span');
    name.textContent = `${it.ico} ${t(it.name)}`;
    const btn = document.createElement('button');
    btn.textContent = t(row.label);
    btn.disabled = row.disabled;
    btn.onclick = () => (row.kind === 'ride' ? hooks.onPick(it.id) : hooks.onBuy(it.id, tab));
    el.append(name, btn);
    list.appendChild(el);
  }
}

export function openCafeModal(h) {
  hooks = h;
  ensure().classList.add('show');
  render();
}

export function refreshCafeModal() {
  if (root?.classList.contains('show')) render();
}

export function closeCafeModal() {
  if (!root?.classList.contains('show')) return;
  root.classList.remove('show');
  hooks?.onClose?.();
}
