function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

function card(n, onPick) {
  const c = el('button', `nbk-card${n.idx < 0 ? ' fresh' : ''}`); c.type = 'button';
  c.append(el('span', 'nbk-face', n.face), el('b', 'nbk-name', n.name));
  if (n.idx >= 0) c.appendChild(el('span', 'nbk-stage', n.stage));
  if (n.next) c.appendChild(el('small', 'nbk-next', n.next));
  c.addEventListener('click', () => onPick(n.id));
  return c;
}

function detail(n, { t, onBack, onLetter, ad }) {
  const d = el('div', 'nbk-detail');
  const head = el('div', 'nbk-dhead');
  const back = el('button', 'nbk-back', '‹'); back.type = 'button'; back.setAttribute('aria-label', t('뒤로'));
  back.addEventListener('click', onBack);
  head.append(back, el('span', 'nbk-face big', n.face));
  const who = el('div', 'nbk-who'); who.append(el('b', null, n.name), el('span', 'nbk-chip', n.chip));
  if (n.favChip) who.appendChild(el('span', 'nbk-chip', n.favChip));
  head.appendChild(who);
  d.appendChild(head);
  d.appendChild(el('p', 'nbk-gift', `${t('오늘 선물 하트')} ${n.giftToday}/${n.giftCap}`));
  if (ad) { ad.style.margin = '0 0 10px'; d.appendChild(ad); }
  const list = el('ol', 'nbk-rows');
  n.rows.forEach((r, i) => {
    const li = el('li', i < n.idx ? 'done' : i === n.idx ? 'now' : '');
    li.append(el('span', 'nbk-rl', r.label), el('span', 'nbk-rr', `❤️${r.min} ${r.reward}`));
    list.appendChild(li);
  });
  d.appendChild(list);
  if (n.letters.length) {
    const box = el('div', 'nbk-letters');
    n.letters.forEach(l => {
      const b = el('button', `nbk-letter${l.read ? '' : ' unread'}`, `✉️ ${l.stage}`); b.type = 'button';
      b.addEventListener('click', () => onLetter(l.key));
      box.appendChild(b);
    });
    d.appendChild(box);
  }
  return d;
}

export function renderBook({ root, Input, t, focusId = null, onLetter }) {
  const draw = (id) => {
    root.innerHTML = '';
    const book = Input.npcBook();
    const pick = id && book.find(n => n.id === id);
    if (pick) {
      const ad = Input.affinityAdButton?.(id, (ok) => { if (ok) draw(id); }) || null;
      root.appendChild(detail(pick, { t, onBack: () => draw(null), onLetter, ad }));
      return;
    }
    const grid = el('div', 'nbk-grid');
    book.forEach(n => grid.appendChild(card(n, draw)));
    root.appendChild(grid);
  };
  draw(focusId);
}
