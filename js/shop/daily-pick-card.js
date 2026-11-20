const CSS = `
.dp-card{display:grid;grid-template-columns:auto 1fr;gap:4px 12px;align-items:center;padding:10px 12px;border-radius:16px;background:linear-gradient(160deg,#fff8e4,#fdeec8);box-shadow:0 8px 20px -10px rgba(160,110,30,.45),inset 0 0 0 1.5px #f0cf7a;cursor:pointer;flex:0 0 auto}
.dp-ico{grid-row:span 3;width:52px;height:52px;border-radius:14px;background:#fff;display:flex;align-items:center;justify-content:center;font-size:30px;box-shadow:inset 0 0 0 1.5px #f3dfa8}
.dp-top{display:flex;justify-content:space-between;align-items:baseline;gap:6px;min-width:0}
.dp-top em{font-style:normal;font-size:11px;font-weight:800;color:#a8641a;white-space:nowrap;flex:0 0 auto}
.dp-top small{font-size:10.5px;opacity:.6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.dp-half{font-size:10px;font-weight:800;color:#a8641a;background:#fff0c9;border-radius:6px;padding:2px 6px;margin-left:4px}
.dp-name{font-size:14px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.dp-buys{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.dp-buys .dp-buy{border:none;border-radius:10px;padding:6px 11px;font:inherit;font-size:12px;font-weight:800;cursor:pointer;background:var(--mint);color:var(--ink);white-space:nowrap}
.dp-buys .dp-buy:disabled{background:#dfe6e0;color:#8a9a8f;cursor:default}
.dp-buys .dp-buy s{opacity:.55;font-weight:600;margin-right:4px}
.dp-dots{display:flex;gap:4px;justify-content:center;margin:2px 0 2px}
.dp-dots i{width:6px;height:6px;border-radius:50%;background:#e4d6ac}
.dp-dots i.on{background:#d6a23a}
@media (max-width:760px),(max-height:500px){.dp-ico{width:44px;height:44px;font-size:26px}.dp-name{font-size:13px}.dp-buys .dp-buy{padding:6px 9px;font-size:11.5px}}
`;

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

function topRow(view) {
  const top = el('div', 'dp-top');
  const title = el('em', null);
  title.append(el('span', null, '📅 오늘의 꾸미기'));
  if (view.state === 'half') title.append(el('b', 'dp-half', '반값'));
  const right = view.state === 'owned' ? el('small', null, '내일 바뀌어요') : el('small', null, `⏳ ${view.left}`);
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

export function drawDailyPickCard(box, view, { onBuy, onTry, adButton }) {
  ensureStyle();
  const card = el('div', 'dp-card');
  card.append(el('div', 'dp-ico', view.ico), topRow(view), el('div', 'dp-name', view.name));
  const buys = el('div', 'dp-buys');
  buys.append(buyButton(view, onBuy));
  if (view.state === 'ad') {
    const ad = adButton();
    if (ad) buys.append(ad);
  }
  card.append(buys);
  if (onTry) card.addEventListener('click', onTry);
  const dots = el('div', 'dp-dots');
  for (let i = 0; i < view.count; i++) dots.append(el('i', i === view.index ? 'on' : null));
  box.append(card, dots);
}
