import { Input } from '../game-lazy.js';
import { FORAGE_KEYS, FORAGE_META } from '../forage/logic.js';

let $, ui, lastInv, shell;

// ── 가방 창 (분류별 아이템 보기) ──
const ITEM_META = {
  wood: { ico: '🪵', name: '목재' }, seed: { ico: '🌰', name: '씨앗' }, coins: { ico: '🪙', name: '코인' },
  crop: { ico: '🥕', name: '작물' }, fish: { ico: '🐟', name: '물고기' }, egg: { ico: '🥚', name: '달걀' },
  stone: { ico: '🪨', name: '돌' }, coal: { ico: '⚫', name: '석탄' }, gem: { ico: '💎', name: '보석' },
  bug: { ico: '🌟', name: '반딧불이' }, forage: { ico: '🍄', name: '채집물' },
  star: { ico: '⭐', name: '별조각' }, glow: { ico: '✨', name: '정령빛' },
  fert: { ico: '🌱', name: '비료' }, bait: { ico: '🪱', name: '미끼' },
  wheat: { ico: '🌾', name: '밀' }, corn: { ico: '🌽', name: '옥수수' }, grape: { ico: '🍇', name: '포도' },
  seed_wheat: { ico: '🌾', name: '밀 씨앗' }, seed_corn: { ico: '🌽', name: '옥수수 씨앗' }, seed_grape: { ico: '🍇', name: '포도 씨앗' },
  honey: { ico: '🍯', name: '꿀' }, candy: { ico: '🍬', name: '사탕' },
  apple: { ico: '🍎', name: '사과' }, pear: { ico: '🍐', name: '배' }, peach: { ico: '🍑', name: '복숭아' },
  persimmon: { ico: '🍊', name: '감' }, chestnut: { ico: '🌰', name: '밤' },
  sap_apple: { ico: '🍎', name: '사과나무 묘목' }, sap_pear: { ico: '🍐', name: '배나무 묘목' },
  sap_peach: { ico: '🍑', name: '복숭아나무 묘목' }, sap_persimmon: { ico: '🍊', name: '감나무 묘목' },
  sap_chestnut: { ico: '🌰', name: '밤나무 묘목' },
  ...FORAGE_META,
};
const BAG_CATS = [
  { name: '🌲 자원', keys: ['wood', 'seed', 'coins'] },
  { name: '🌱 농사·낚시·닭장', keys: ['crop', 'fish', 'egg', 'fert', 'bait'] },
  { name: '🌾 고급 작물', keys: ['wheat', 'corn', 'grape', 'honey', 'seed_wheat', 'seed_corn', 'seed_grape'] },
  { name: '🍎 과수원', keys: ['sap_apple', 'sap_pear', 'sap_peach', 'sap_persimmon', 'sap_chestnut', 'apple', 'pear', 'peach', 'persimmon', 'chestnut'] },
  { name: '⛏️ 광물', keys: ['stone', 'coal', 'gem'] },
  { name: '🌙 밤·숲', keys: ['bug', 'forage'] },
  { name: '🛶 강 · 🌫️ 숲', keys: ['star', 'glow'] },
  { name: '🎃 할로윈', keys: ['candy'] },
  { name: '🌊 바다', keys: FORAGE_KEYS },
];
function bagSection(title, items) {
  const sec = document.createElement('div'); sec.className = 'bag-sec';
  const h = document.createElement('div'); h.className = 'bag-h'; h.textContent = title; sec.appendChild(h);
  const grid = document.createElement('div'); grid.className = 'bag-grid';
  items.forEach(it => {
    const c = document.createElement('div'); c.className = 'bag-item' + (it.count > 0 ? '' : ' zero');
    c.innerHTML = `<span class="bag-ico">${it.ico}</span><span class="bag-name">${it.name}</span><span class="bag-cnt">×${it.count}</span>`;
    grid.appendChild(c);
  });
  sec.appendChild(grid); return sec;
}
// 🍱 찬장 — 보관해 둔 음식. 칸을 누르면 그 자리에서 먹어 버프가 켜진다.
//   재료와 달리 "등급"이 붙어 있어서 개수만 세는 bagSection 으로는 표현이 안 된다(칸마다 다른 물건).
function pantrySection(d) {
  const sec = document.createElement('div'); sec.className = 'bag-sec';
  const h = document.createElement('div'); h.className = 'bag-h';
  h.textContent = `🍱 찬장 ${d.items.length}/${d.max}`;
  sec.appendChild(h);
  if (!d.items.length) {
    const empty = document.createElement('div'); empty.className = 'bag-empty';
    empty.textContent = '🍳 자유주방에서 요리한 뒤 "🧺 보관하기"를 고르면 여기 담겨요';
    sec.appendChild(empty); return sec;
  }
  const grid = document.createElement('div'); grid.className = 'bag-grid';
  d.items.forEach(f => {
    const c = document.createElement('button'); c.className = 'bag-item food';
    c.innerHTML = `<span class="bag-ico">${f.ico}</span><span class="bag-name">${f.name}</span><span class="bag-tier">${f.tier.ico} ${f.buff.ico}${f.buff.dur}초</span>`;
    c.title = `${f.tier.name} · ${f.buff.name} 버프 ${f.buff.dur}초`;
    c.addEventListener('click', () => {
      const r = Input.pantryEat(f.i);
      if (r?.ok) ui.toast(`${r.ico} ${r.name} 먹었어요 — ${r.buff.ico} ${r.buff.name} 버프 ${r.buff.dur}초`, 2600);
      renderBag();
    });
    grid.appendChild(c);
  });
  sec.appendChild(grid); return sec;
}
function renderBag() {
  const box = $('bag-content'); box.innerHTML = '';
  if (shell()) {
    const keys = document.body.classList.contains('at-mine') ? ['coins', 'stone', 'coal', 'gem'] : ['coins', 'wood', 'seed', 'crop', 'stone'];
    const ICO = { coins: '🪙', wood: '🪵', seed: '🌰', crop: '🥕', stone: '🪨', coal: '⚫', gem: '💎' };
    const row = document.createElement('div'); row.className = 'bag-sum';
    keys.forEach(k => { const c = document.createElement('span'); c.className = 'bag-chip' + (k === 'coins' ? ' coin' : ''); c.textContent = `${ICO[k]} ${lastInv()[k] || 0}`; row.appendChild(c); });
    box.appendChild(row);
  }
  box.appendChild(pantrySection(Input.getPantry()));   // 🍱 찬장을 맨 위로 — 먹으러 여는 일이 가장 잦다
  BAG_CATS.forEach(cat => box.appendChild(bagSection(cat.name, cat.keys.map(k => ({ ...ITEM_META[k], count: lastInv()[k] || 0 })))));
  const owned = Input.ownedGifts();
  box.appendChild(bagSection('🎁 선물', [...Input.keptGifts().map(k => ({ ico: k.ico + (k.paper ? '🎀' : ''), name: k.name, count: k.n })), ...Input.getGifts().map(g => ({ ico: g.ico, name: g.name, count: owned[g.id] || 0 }))]));
}
function openBag() { renderBag(); Input.setAnalog(0, 0); $('bag-menu').classList.add('show'); $('bag-backdrop').classList.add('show'); document.body.classList.add('menu-open'); }
function closeBag() { $('bag-menu').classList.remove('show'); $('bag-backdrop').classList.remove('show'); document.body.classList.remove('menu-open'); }

export function installBag(ctx) {
  ({ $, ui, lastInv, shell } = ctx);
  $('inv-hud').addEventListener('click', openBag);   // 자원 숫자·가방 아무 데나 탭하면 열림
  $('bag-close').addEventListener('click', closeBag);
  $('bag-backdrop').addEventListener('click', closeBag);
  return { renderBag };
}
