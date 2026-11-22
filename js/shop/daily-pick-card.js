import { themeBook, themeOf, dexLabel } from '../data/daily-pick.js';

const CSS = `
.dp-card{display:flex;flex-direction:column;gap:10px;padding:10px;border-radius:18px;background:#fffdf8;box-shadow:0 12px 26px -14px rgba(60,100,70,.55),inset 0 0 0 1px #e7efe8;flex:0 0 auto;min-width:0}
.dp-card button{transition:transform .2s ease,box-shadow .2s ease,background-color .2s ease;-webkit-tap-highlight-color:transparent}
.dp-card button:not(:disabled):active{transform:scale(.96)}
.dp-cn{display:inline-block;width:.85em;height:.85em;border-radius:50%;background:radial-gradient(circle at 35% 35%,#ffe48a,#e9a92c 70%);box-shadow:inset 0 0 0 1px rgba(160,100,20,.35);margin-right:3px;flex:0 0 auto;vertical-align:-.08em}
.dp-hero{position:relative;overflow:hidden;display:grid;grid-template-columns:auto minmax(0,1fr);gap:6px 12px;align-items:center;padding:10px;border-radius:14px;background:linear-gradient(160deg,#fff6dc,#fde9b9);cursor:pointer;min-width:0}
.dp-flag{position:absolute;right:0;top:0;font-size:10px;font-weight:900;color:#fff;background:#d98a2b;padding:3px 9px 3px 10px;border-radius:0 0 0 10px;z-index:2}
.dp-top{grid-column:1 / -1;grid-row:1;display:flex;flex-wrap:wrap;align-items:center;gap:2px 6px;min-width:0;padding-right:46px}
.dp-top em{font-style:normal;font-size:11.5px;font-weight:900;color:#a8641a;white-space:nowrap}
.dp-pill{display:inline-flex;align-items:center;font-size:10.5px;font-weight:800;color:#8a5a20;background:rgba(255,255,255,.8);padding:2px 7px;border-radius:99px;white-space:nowrap;font-variant-numeric:tabular-nums}
.dp-half{font-size:10px;font-weight:800;color:#fff;background:#e0952e;border-radius:6px;padding:2px 6px;margin-left:4px}
.dp-ico{grid-column:1;grid-row:2;position:relative;width:56px;height:56px;border-radius:16px;background:#fff;display:flex;align-items:center;justify-content:center;font-size:32px;box-shadow:0 6px 12px -6px rgba(160,110,30,.55)}
.dp-ok{position:absolute;right:-4px;bottom:-4px;width:18px;height:18px;border-radius:50%;background:#5bb37a;color:#fff;font-size:11px;font-weight:900;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 2px #fff}
.dp-name{grid-column:2;grid-row:2;font-size:15px;font-weight:900;color:#3e3524;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.dp-buys{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.dp-buys>*{flex:1 1 auto;white-space:nowrap}
.dp-hero>.dp-buys{grid-column:1 / -1;grid-row:3}
.dp-buys .dp-buy{display:inline-flex;align-items:center;justify-content:center;min-height:40px;border:none;border-radius:11px;padding:0 12px;font:inherit;font-size:12px;font-weight:800;cursor:pointer;background:var(--mint);color:#2f4a38;white-space:nowrap;font-variant-numeric:tabular-nums;box-shadow:0 5px 12px -7px rgba(47,110,70,.7)}
.dp-buys .rw-ad{min-height:40px;border-radius:11px;padding:8px 10px 8px 7px;line-height:24px;font-size:12px}
.dp-buys .dp-buy:not(:disabled):hover{background:#acdfb9}
.dp-g:hover{background:#fff}
.dp-chip:not(.on):hover{background:rgba(255,255,255,.6)}
.dp-card button:focus-visible{outline:2px solid #4f9d68;outline-offset:2px}
.dp-buys .dp-buy:disabled{background:#e3e8e3;color:#8a9a8f;cursor:default;box-shadow:none}
.dp-buys .dp-buy s{opacity:.55;font-weight:600;margin-right:4px}
.dp-tmr{display:flex;align-items:center;gap:8px;padding:0 2px;min-width:0}
.dp-sil{flex:0 0 auto;width:28px;height:28px;border-radius:9px;background:#f2f5f1;display:flex;align-items:center;justify-content:center;overflow:hidden}
.dp-sil i{font-style:normal;font-size:16px;filter:brightness(0) blur(1.2px);opacity:.26}
.dp-tz{flex:1 1 auto;display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:6px;min-width:0}
.dp-tz b{font-size:11px;font-weight:800;color:#6a7a6f;white-space:nowrap}
.dp-tz small{font-size:10.5px;font-weight:800;color:#7a8a7f;white-space:nowrap;font-variant-numeric:tabular-nums}
.dp-dex{display:flex;flex-direction:column;gap:6px;min-width:0}
.dp-dex-h{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:6px;min-height:40px;margin:-6px 0 -6px;padding:2px 2px 0;border:none;border-top:1px solid #edf1ec;background:none;font:inherit;color:inherit;cursor:pointer;text-align:left}
.dp-dex-h b{font-size:11.5px;font-weight:900;color:#4a5a4f;white-space:nowrap}
.dp-dex-h small{font-size:10.5px;font-weight:800;color:#8a9a8f;white-space:nowrap}
.dp-chips{display:flex;gap:2px;flex-wrap:nowrap;overflow:hidden;min-width:0;padding:3px;border-radius:14px;background:#eef3ee}
.dp-chips.all{flex-wrap:wrap}
.dp-chip{flex:1 1 0;min-width:0;min-height:40px;padding:0;border:none;border-radius:11px;background:transparent;display:flex;flex-direction:column;align-items:center;justify-content:center;font:inherit;color:inherit;cursor:pointer}
.dp-chips.all .dp-chip{flex:0 0 calc((100% - 10px) / 4)}
.dp-chip i{font-style:normal;font-size:14px;line-height:1.15}
.dp-chip>span{font-size:9.5px;font-weight:800;color:#7a8a7f;line-height:1.2;white-space:nowrap;font-variant-numeric:tabular-nums}
.dp-chip.full>span{color:#a8641a}
.dp-chip.on{background:#fff;box-shadow:0 3px 8px -4px rgba(60,100,70,.5)}
.dp-chip.on>span{color:#2f6e46}
.dp-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px}
.dp-grid-h{grid-column:1 / -1;display:flex;justify-content:space-between;gap:6px;font-size:11px;font-weight:900;color:#4a5a4f;padding:0 2px 1px;white-space:nowrap}
.dp-grid-h small{font-weight:800;color:#8a9a8f;font-size:10.5px}
.dp-g{position:relative;display:flex;flex-direction:column;align-items:center;gap:2px;min-height:60px;padding:7px 0 5px;border:none;border-radius:12px;background:#e9f4f3;min-width:0;font:inherit;color:inherit;cursor:pointer}
.dp-g>i{font-style:normal;font-size:19px;line-height:1.15}
.dp-g>b{display:flex;align-items:center;font-size:10.5px;font-weight:900;color:#3e4a44;white-space:nowrap;line-height:1.2;font-variant-numeric:tabular-nums;letter-spacing:-.01em}
.dp-g>span{font-size:9px;font-weight:800;color:#7a8a85;white-space:nowrap;line-height:1.2}
.dp-g.today{background:#fff1cf}
.dp-g.today::before{content:'';position:absolute;right:5px;top:5px;width:7px;height:7px;border-radius:50%;background:#e0952e;box-shadow:0 0 0 2px #fff1cf}
.dp-g.today>span{color:#a8641a}
.dp-g.own{background:#f1f2ef}
.dp-g.own>i{opacity:.45;filter:grayscale(.6)}
.dp-g.own>b{color:#9aa29c}
.dp-g.own>span{color:#3d8a57}
.dp-g.own::before{content:'✓';position:absolute;right:4px;top:4px;width:13px;height:13px;border-radius:50%;background:#5bb37a;color:#fff;font-size:8px;font-weight:900;display:flex;align-items:center;justify-content:center;box-shadow:none}
.dp-g.sel{background:#fff;box-shadow:0 0 0 2.5px #4f9d68,0 8px 14px -8px rgba(47,110,70,.7)}
.dp-row{grid-column:1 / -1;position:relative;display:grid;grid-template-columns:auto minmax(0,1fr);gap:8px 10px;align-items:center;margin-top:3px;padding:14px 10px 10px;border-radius:16px;background:#fff;box-shadow:0 10px 20px -10px rgba(60,100,70,.55),inset 0 0 0 1px #e5ede6;min-width:0}
.dp-row::before{content:'';position:absolute;top:5px;left:50%;width:28px;height:3px;margin-left:-14px;border-radius:2px;background:#dfe6e0}
.dp-row>i{font-style:normal;width:40px;height:40px;border-radius:12px;background:#e9f4f3;display:flex;align-items:center;justify-content:center;font-size:23px}
.dp-row-t{display:flex;flex-direction:column;gap:2px;min-width:0}
.dp-row-t b{font-size:13px;font-weight:900;color:#3e3524;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dp-row-t small{font-size:10.5px;font-weight:800;color:#7a8a7f;line-height:1.35;word-break:keep-all}
.dp-row-t small.own{color:#3d8a57}
.dp-row-t small.hot{color:#a8641a}
.dp-row .dp-buys{grid-column:1 / -1}
@media (max-width:760px),(max-height:500px){.dp-ico{width:48px;height:48px;font-size:28px;border-radius:14px}.dp-name{font-size:14px}.dp-buys .dp-buy{padding:0 9px;font-size:11.5px}}
@media (max-height:500px){.dp-hero{grid-template-columns:auto minmax(0,1fr) auto;padding-right:12px}.dp-flag{right:auto;left:0;border-radius:0 0 10px 0}.dp-top{grid-column:2;grid-row:1;padding-right:0}.dp-ico{grid-column:1;grid-row:1 / span 2}.dp-name{grid-column:2;grid-row:2}.dp-hero .dp-buys{grid-column:3;grid-row:1 / span 2;flex-wrap:nowrap}.dp-buys>*{flex:0 0 auto}.dp-grid{grid-template-columns:repeat(8,minmax(0,1fr))}.dp-g>i{font-size:17px}.dp-row{grid-template-columns:auto minmax(0,1fr) auto;padding:10px}.dp-row::before{display:none}.dp-row .dp-buys{grid-column:3;flex-wrap:nowrap}}
`;

const CHIP_W = 46;
const CHIP_GAP = 2;
const ui = { open: null, all: false, sel: null };
const HEADER = '다음 특가 일정';

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
  const right = el('span', 'dp-pill', view.state === 'owned' ? '자정에 바뀌어요' : `⏳ ${view.left}`);
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
  b.append(coinDot(), view.price.toLocaleString());
  b.addEventListener('click', (e) => { e.stopPropagation(); onBuy(); });
  return b;
}

function hero(view, { onBuy, onTry, adButton }) {
  const h = el('div', 'dp-hero');
  const ico = el('div', 'dp-ico', view.ico);
  if (view.state === 'owned') ico.append(el('b', 'dp-ok', '✓'));
  h.append(el('span', 'dp-flag', '특가'), ico, topRow(view), el('div', 'dp-name', view.name));
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
  const w = Math.max(0, row.clientWidth - 6);
  if (!w) requestAnimationFrame(() => { if (row.isConnected && row.clientWidth) redraw(); });
  const slots = w > 0 ? Math.max(2, Math.floor((w + CHIP_GAP) / (CHIP_W + CHIP_GAP))) : 4;
  if (book.length <= slots) { row.append(...book.map(t => chip(t, redraw))); return; }
  row.append(...book.slice(0, slots - 1).map(t => chip(t, redraw)), moreChip(`+${book.length - slots + 1}`, redraw));
}

const coinDot = () => el('span', 'dp-cn');

const coins = (n) => {
  const b = el('b');
  b.append(coinDot(), n.toLocaleString());
  return b;
};

function itemNote(it, view) {
  if (it.owned) return '보유 중';
  if (it.days === 0) return '오늘의 꾸미기예요';
  return view.deal ? `${dexLabel(it.days, true)} 광고 보고 반값에 할인받기` : '언제든 살 수 있어요';
}

function buyRow(it, view, { onBuy, onBuyItem, adButton }) {
  const row = el('div', 'dp-row');
  const t = el('div', 'dp-row-t');
  t.append(el('b', null, it.name), el('small', it.owned ? 'own' : it.days === 0 ? 'hot' : null, itemNote(it, view)));
  const buys = el('div', 'dp-buys');
  if (it.days === 0) {
    buys.append(buyButton(view, onBuy));
    const ad = view.state === 'ad' ? adButton() : null;
    if (ad) buys.append(ad);
  } else {
    const b = el('button', 'dp-buy', it.owned ? '이미 있어요' : null);
    if (!it.owned) b.append(coinDot(), `${it.price.toLocaleString()}에 사기`);
    b.type = 'button';
    b.disabled = it.owned;
    b.addEventListener('click', (e) => { e.stopPropagation(); onBuyItem(it.id); });
    buys.append(b);
  }
  row.append(el('i', null, it.ico), t, buys);
  return row;
}

function grid(t, view, handlers, redraw) {
  const g = el('div', 'dp-grid');
  const head = el('div', 'dp-grid-h');
  const title = el('span');
  title.append(el('span', null, t.emoji), ' ', el('span', null, t.name), ' ', el('span', null, `${t.got}/${t.total}`));
  head.append(title, el('small', null, view.deal ? HEADER : '오늘의 꾸미기 차례'));
  g.append(head);
  const sel = t.items.find(it => it.id === ui.sel) || null;
  for (const it of t.items) {
    const cell = button(`dp-g${it.owned ? ' own' : ''}${it.days === 0 ? ' today' : ''}${it === sel ? ' sel' : ''}`, () => {
      ui.sel = ui.sel === it.id ? null : it.id;
      redraw();
    });
    cell.setAttribute('aria-label', it.name);
    const price = it.days === 0 ? view.price : it.price;
    cell.append(el('i', null, it.ico), coins(price), el('span', null, it.owned ? '보유 중' : dexLabel(it.days, view.deal)));
    g.append(cell);
  }
  if (sel) g.append(buyRow(sel, view, handlers));
  return g;
}

function dexSection(view, handlers) {
  const wrap = el('div', 'dp-dex');
  const draw = (focus = false) => {
    const book = themeBook(view.dex, view.index);
    const got = book.reduce((s, t) => s + t.got, 0);
    const open = book.find(t => t.key === ui.open) || null;
    const head = button('dp-dex-h', () => {
      ui.open = open ? null : themeOf(view.id).key;
      draw(!open);
    });
    head.append(el('b', null, `📖 테마 도감 ${got}/${view.dex.length}`), el('small', null, open ? '접기' : '눌러서 고르기'));
    const row = el('div', 'dp-chips');
    wrap.replaceChildren(head, row);
    fillChips(row, book, draw);
    if (!open) return;
    const g = grid(open, view, handlers, () => draw());
    wrap.append(g);
    if (focus) g.scrollIntoView({ block: 'nearest' });
    else g.querySelector('.dp-row')?.scrollIntoView({ block: 'nearest' });
  };
  return { wrap, draw };
}

export function drawDailyPickCard(box, view, handlers) {
  ensureStyle();
  const card = el('div', 'dp-card');
  const dex = dexSection(view, handlers);
  card.append(hero(view, handlers), tomorrowLine(view), dex.wrap);
  box.append(card);
  dex.draw();
}
