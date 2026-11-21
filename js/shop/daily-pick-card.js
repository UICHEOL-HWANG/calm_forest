import { themeBook, themeOf, dexLabel } from '../data/daily-pick.js';

const CSS = `
.dp-card{display:flex;flex-direction:column;gap:8px;padding:10px 12px;border-radius:16px;background:linear-gradient(160deg,#fff8e4,#fdeec8);box-shadow:0 8px 20px -10px rgba(160,110,30,.45),inset 0 0 0 1.5px #f0cf7a;flex:0 0 auto;min-width:0}
.dp-hero{display:grid;grid-template-columns:auto minmax(0,1fr);gap:4px 12px;align-items:center;cursor:pointer;min-width:0}
.dp-ico{grid-row:span 3;position:relative;width:52px;height:52px;border-radius:14px;background:#fff;display:flex;align-items:center;justify-content:center;font-size:30px;box-shadow:inset 0 0 0 1.5px #f3dfa8}
.dp-ok{position:absolute;right:-4px;bottom:-4px;width:18px;height:18px;border-radius:50%;background:#5bb37a;color:#fff;font-size:11px;font-weight:900;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 2px #fff}
.dp-top{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:baseline;gap:0 6px;min-width:0}
.dp-top em{font-style:normal;font-size:11px;font-weight:800;color:#a8641a;white-space:nowrap;flex:0 0 auto}
.dp-top small{font-size:10.5px;opacity:.6;white-space:nowrap;flex:0 0 auto}
.dp-half{font-size:10px;font-weight:800;color:#a8641a;background:#fff0c9;border-radius:6px;padding:2px 6px;margin-left:4px}
.dp-name{font-size:14px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.dp-buys{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.dp-buys .dp-buy{border:none;border-radius:10px;padding:6px 11px;font:inherit;font-size:12px;font-weight:800;cursor:pointer;background:var(--mint);color:var(--ink);white-space:nowrap}
.dp-buys .dp-buy:disabled{background:#dfe6e0;color:#8a9a8f;cursor:default}
.dp-buys .dp-buy s{opacity:.55;font-weight:600;margin-right:4px}
.dp-tmr{display:flex;align-items:center;gap:8px;padding-top:7px;border-top:1.5px dashed #ecd498;min-width:0}
.dp-sil{flex:0 0 auto;width:34px;height:34px;border-radius:10px;background:repeating-linear-gradient(135deg,#fff6df 0 5px,#fdeec8 5px 10px);box-shadow:inset 0 0 0 1.5px #ecd498;display:flex;align-items:center;justify-content:center;overflow:hidden}
.dp-sil i{font-style:normal;font-size:22px;filter:brightness(0) blur(1.2px);opacity:.28}
.dp-tz{display:flex;flex-direction:column;gap:1px;min-width:0}
.dp-tz b{font-size:11.5px;font-weight:800;color:#a8641a;white-space:nowrap}
.dp-tz small{font-size:10.5px;opacity:.65;font-weight:700;white-space:nowrap}
.dp-dex{display:flex;flex-direction:column;gap:4px;min-width:0}
.dp-dex-h{display:flex;justify-content:space-between;align-items:center;gap:6px;min-height:40px;margin:-6px 0 -4px;padding:0;border:none;background:none;font:inherit;color:inherit;cursor:pointer;text-align:left}
.dp-dex-h b{font-size:11px;font-weight:800;color:#8a6a2a;white-space:nowrap}
.dp-dex-h small{font-size:10.5px;opacity:.65;font-weight:700;white-space:nowrap}
.dp-chips{display:flex;gap:5px;flex-wrap:nowrap;overflow:hidden;min-width:0}
.dp-chips.all{flex-wrap:wrap}
.dp-chip{flex:0 0 46px;width:46px;min-height:42px;padding:0;border:none;border-radius:12px;background:rgba(255,255,255,.8);display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:inset 0 0 0 1.5px #f0dfb2;font:inherit;color:inherit;cursor:pointer}
.dp-chip i{font-style:normal;font-size:15px;line-height:1.15}
.dp-chip>span{font-size:9.5px;font-weight:800;color:#8a6a2a;line-height:1.2;white-space:nowrap}
.dp-chip.full{background:linear-gradient(160deg,#ffe9a8,#ffd36b);box-shadow:inset 0 0 0 1.5px #e7b64b}
.dp-chip.on{background:#fff;box-shadow:inset 0 0 0 2px #d6a23a}
.dp-chip.full.on{background:linear-gradient(160deg,#ffe9a8,#ffd36b);box-shadow:inset 0 0 0 2px #c48a1e}
.dp-chip.more{background:rgba(255,255,255,.55)}
.dp-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px;padding:8px;border-radius:12px;background:rgba(255,255,255,.6)}
.dp-grid-h{grid-column:1 / -1;display:flex;justify-content:space-between;gap:6px;font-size:11px;font-weight:800;color:#8a6a2a;padding:0 2px 2px;white-space:nowrap}
.dp-grid-h small{font-weight:700;opacity:.65;font-size:10.5px}
.dp-g{display:flex;flex-direction:column;align-items:center;gap:1px;padding:4px 0 3px;border-radius:9px;background:#fff;min-width:0}
.dp-g i{font-style:normal;font-size:18px;line-height:1.15}
.dp-g>span{font-size:9px;font-weight:800;color:#8a7a5a;white-space:nowrap}
.dp-g.own>span{color:#3d8a57}
.dp-g.today{box-shadow:inset 0 0 0 2px #d6a23a}
.dp-g.today>span{color:#a8641a}
.dp-g.soon i{filter:grayscale(1);opacity:.38}
@media (max-width:760px),(max-height:500px){.dp-ico{width:44px;height:44px;font-size:26px}.dp-name{font-size:13px}.dp-buys .dp-buy{padding:6px 9px;font-size:11.5px}}
@media (max-height:500px){.dp-hero{grid-template-columns:auto minmax(0,1fr) auto}.dp-ico{grid-row:span 2}.dp-hero .dp-buys{grid-column:3;grid-row:1 / span 2;flex-wrap:nowrap}.dp-sil{width:28px;height:28px;border-radius:8px}.dp-sil i{font-size:17px}.dp-tz{flex-direction:row;align-items:baseline;gap:6px}.dp-grid{grid-template-columns:repeat(8,minmax(0,1fr));padding:6px}.dp-g i{font-size:16px}}
`;

const CHIP_W = 46;
const CHIP_GAP = 5;
const ui = { open: null, all: false };

function ensureStyle() {
  if (document.getElementById('dp-card-style')) return;
  const st = document.createElement('style');
  st.id = 'dp-card-style';
  st.textContent = CSS;
  document.head.appendChild(st);
}

const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};

const button = (cls, onClick) => {
  const b = el('button', cls);
  b.type = 'button';
  b.addEventListener('click', (e) => { e.stopPropagation(); onClick(); });
  return b;
};

function topRow(view) {
  const top = el('div', 'dp-top');
  const title = el('em', null);
  title.append(el('span', null, '📅 오늘의 꾸미기'));
  if (view.state === 'half') title.append(el('b', 'dp-half', '반값'));
  const right = view.state === 'owned' ? el('small', null, '자정에 바뀌어요') : el('small', null, `⏳ ${view.left}`);
  top.append(title, right);
  return top;
}

function buyButton(view, onBuy) {
  const b = el('button', 'dp-buy');
  b.type = 'button';
  if (view.state === 'owned') {
    b.textContent = '이미 있어요';
    b.disabled = true;
    return b;
  }
  if (view.state === 'half') b.append(el('s', null, view.full.toLocaleString()));
  b.append(document.createTextNode(`🪙 ${view.price.toLocaleString()}`));
  b.addEventListener('click', (e) => { e.stopPropagation(); onBuy(); });
  return b;
}

function hero(view, { onBuy, onTry, adButton }) {
  const h = el('div', 'dp-hero');
  const ico = el('div', 'dp-ico', view.ico);
  if (view.state === 'owned') ico.append(el('b', 'dp-ok', '✓'));
  h.append(ico, topRow(view), el('div', 'dp-name', view.name));
  const buys = el('div', 'dp-buys');
  buys.append(buyButton(view, onBuy));
  if (view.state === 'ad') {
    const ad = adButton();
    if (ad) buys.append(ad);
  }
  h.append(buys);
  if (onTry) h.addEventListener('click', onTry);
  return h;
}

function tomorrowLine(view) {
  const row = el('div', 'dp-tmr');
  const sil = el('div', 'dp-sil');
  sil.append(el('i', null, view.tomorrow));
  const tz = el('div', 'dp-tz');
  tz.append(el('b', null, '내일의 꾸미기'), el('small', null, `${view.left} 뒤 공개`));
  row.append(sil, tz);
  return row;
}

function chip(t, redraw) {
  const c = button(`dp-chip${t.full ? ' full' : ''}${ui.open === t.key ? ' on' : ''}`, () => {
    ui.open = ui.open === t.key ? null : t.key;
    redraw(!!ui.open);
  });
  c.setAttribute('aria-label', `${t.name} ${t.got}/${t.total}`);
  c.append(el('i', null, t.emoji), el('span', null, t.full ? '완성' : `${t.got}/${t.total}`));
  return c;
}

function moreChip(label, redraw) {
  const c = button('dp-chip more', () => { ui.all = !ui.all; redraw(); });
  c.append(el('i', null, '📖'), el('span', null, label));
  return c;
}

function fillChips(row, book, redraw) {
  if (ui.all) {
    row.classList.add('all');
    row.append(...book.map(t => chip(t, redraw)), moreChip('접기', redraw));
    return;
  }
  const w = row.clientWidth;
  if (!w) requestAnimationFrame(() => { if (row.isConnected && row.clientWidth) redraw(); });
  const slots = w > 0 ? Math.max(2, Math.floor((w + CHIP_GAP) / (CHIP_W + CHIP_GAP))) : 4;
  if (book.length <= slots) { row.append(...book.map(t => chip(t, redraw))); return; }
  row.append(...book.slice(0, slots - 1).map(t => chip(t, redraw)), moreChip(`+${book.length - slots + 1}`, redraw));
}

function grid(t) {
  const g = el('div', 'dp-grid');
  const head = el('div', 'dp-grid-h');
  const title = el('span');
  title.append(el('span', null, t.emoji), ' ', el('span', null, t.name), ' ', el('span', null, `${t.got}/${t.total}`));
  head.append(title, el('small', null, '다시 오는 날'));
  g.append(head);
  for (const it of t.items) {
    const cls = it.owned ? 'own' : it.days === 0 ? 'today' : 'soon';
    const cell = el('div', `dp-g ${cls}${it.owned && it.days === 0 ? ' today' : ''}`);
    cell.append(el('i', null, it.ico), el('span', null, dexLabel(it.owned, it.days)));
    g.append(cell);
  }
  return g;
}

function dexSection(view) {
  const wrap = el('div', 'dp-dex');
  const draw = (focus = false) => {
    const book = themeBook(view.dex, view.index);
    const got = book.reduce((s, t) => s + t.got, 0);
    const open = book.find(t => t.key === ui.open) || null;
    const head = button('dp-dex-h', () => {
      ui.open = open ? null : themeOf(view.id).key;
      draw(!open);
    });
    head.append(el('b', null, `📖 테마 도감 ${got}/${view.dex.length}`), el('small', null, open ? '접기' : '눌러서 보기'));
    const row = el('div', 'dp-chips');
    wrap.replaceChildren(head, row);
    fillChips(row, book, draw);
    if (!open) return;
    const g = grid(open);
    wrap.append(g);
    if (focus) g.scrollIntoView({ block: 'nearest' });
  };
  return { wrap, draw };
}

export function drawDailyPickCard(box, view, handlers) {
  ensureStyle();
  const card = el('div', 'dp-card');
  const dex = dexSection(view);
  card.append(hero(view, handlers), tomorrowLine(view), dex.wrap);
  box.append(card);
  dex.draw();
}
