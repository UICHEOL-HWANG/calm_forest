// =============================================================
//  calm forest · 🌳 세계수 판 화면 (DOM 만 — Three/게임 상태 없음)
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-10-16-world-tree-board-design.md §8
//  ▶ 뼈대(#tree-modal)와 CSS 는 index.html. 여기는 뷰(js/spaces/world-tree.js 의 boardView)를 받아 그린다.
//  ▶ 영어 모드는 MutationObserver 가 텍스트 노드 단위로 번역한다 — 한국어 문구와 숫자를 한 노드에 섞지 않는다.
// =============================================================

const $ = (id) => document.getElementById(id);

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

let actions = null;
let lastTab = null;   // 탭이 바뀌면 맨 위로, 같은 탭을 다시 그리면 스크롤 유지

/** 열려 있나 */
export function treeBoardOpen() { return !!$('tree-modal')?.classList.contains('show'); }

export function closeTreeBoard() {
  const m = $('tree-modal');
  if (!m || !m.classList.contains('show')) return;
  m.classList.remove('show');
  actions?.onClose?.();
}

/** 열기(또는 이미 열려 있으면 다시 그리기). acts: { tab, place, remove, offer, onClose } */
export function openTreeBoard(view, acts) {
  const m = $('tree-modal');
  if (!m) return;
  actions = acts;
  if (!m.dataset.wired) {
    m.dataset.wired = '1';
    $('tb-close')?.addEventListener('click', closeTreeBoard);
    m.addEventListener('click', (e) => { if (e.target === m) closeTreeBoard(); });
  }
  renderTreeBoard(view);
  m.classList.add('show');
}

export function renderTreeBoard(view) {
  if (!$('tree-modal')) return;
  $('tb-life-num').textContent = `${view.life}%`;
  $('tb-life-bar').style.width = `${view.life}%`;

  const tabs = $('tb-tabs'); tabs.innerHTML = '';
  for (const b of view.branches) {
    const t = el('button', `tb-tab tb-${b.status}${b.id === view.cur.id ? ' active' : ''}`);
    t.type = 'button';
    t.append(el('i', 'tb-dot'), el('span', null, b.ico), el('span', 'tb-tab-name', b.short || b.name));   // 짧은 이름 — 폰에서 '부엌의 가 / 지' 로 꺾였다
    t.title = b.name;
    t.addEventListener('click', () => actions?.tab?.(b.id));
    tabs.appendChild(t);
  }

  const body = $('tb-body');
  const keep = lastTab === view.cur.id ? body.scrollTop : 0;
  lastTab = view.cur.id;
  body.innerHTML = '';
  const c = view.cur;

  const lead = el('div', 'tb-lead');
  if (!c.usable) {
    lead.append(el('span', null, '🔒'), el('span', null, '앞 가지 빈터를 먼저 완성해요'), el('b', null, c.prevName));
    body.appendChild(lead);
    return;
  }
  lead.textContent = c.lead;
  body.appendChild(lead);

  // ── 🏡 빈터 꾸미기 ──
  const hab = el('section', 'tb-sec');
  const h1 = el('h3', 'tb-h');
  h1.append(el('span', null, '🏡 빈터 꾸미기'));
  if (c.habitatDone) h1.append(el('span', 'tb-stamp', '🍃 잎이 돋았어요'));
  hab.appendChild(h1);

  const plot = el('div', 'tb-plot');
  c.tiles.forEach((tile, i) => {
    const b = el('button', tile ? `tb-tile on${i === view.fresh ? ' fresh' : ''}` : 'tb-tile');
    b.type = 'button';
    if (tile) {
      b.append(el('span', 'tb-tile-ico', tile.ico), el('span', 'tb-tile-name', tile.name));
      b.title = '눌러서 빼기(재료 돌려받기)';
      b.addEventListener('click', () => actions?.remove?.(i));
    } else b.disabled = true;
    plot.appendChild(b);
  });
  const habRow = el('div', 'tb-habrow');
  habRow.appendChild(plot);
  hab.appendChild(habRow);

  const meters = el('div', 'tb-meters');
  for (const r of c.rows) {
    const row = el('div', r.ok ? 'tb-meter ok' : 'tb-meter');
    const bar = el('div', 'tb-mbar'); const fill = el('i'); fill.style.width = `${Math.min(100, Math.round(r.have / r.need * 100))}%`; bar.appendChild(fill);
    row.append(el('span', 'tb-mlabel', r.label), bar, el('span', 'tb-mnum', `${r.have}/${r.need}`));
    meters.appendChild(row);
  }
  habRow.appendChild(meters);
  hab.appendChild(el('p', 'tb-hint', '눌러서 놓기 · 놓인 칸을 누르면 빼기'));

  const decos = el('div', 'tb-decos');
  for (const d of c.decor) {
    const b = el('button', 'tb-deco');
    b.type = 'button';
    b.dataset.deco = d.id;
    b.disabled = !d.can;
    const txt = el('span', 'tb-deco-txt');
    txt.append(el('b', null, d.name), el('small', null, `${d.tagsText} · ${d.costText}`));
    b.append(el('span', 'tb-deco-ico', d.ico), txt);
    b.addEventListener('click', () => actions?.place?.(d.id));
    decos.appendChild(b);
  }
  hab.appendChild(decos);
  body.appendChild(hab);

  // ── 🎁 꾸러미 바치기 ──
  const bun = el('section', 'tb-sec');
  const h2 = el('h3', 'tb-h');
  h2.append(el('span', null, '🎁 꾸러미 채우기'));
  if (c.bundlesDone) h2.append(el('span', 'tb-stamp pink', '🌸 다 채웠어요'));
  bun.appendChild(h2);
  if (!c.habitatDone) bun.appendChild(el('p', 'tb-hint', '🔒 빈터를 먼저 완성해요'));
  for (const bd of c.bundles) {
    const box = el('div', bd.done ? 'tb-bundle done' : 'tb-bundle');
    box.dataset.bundle = bd.id;
    const head = el('div', 'tb-bhead');
    head.append(el('b', null, bd.name));
    const rw = el('span', 'tb-reward'); rw.append(el('span', null, '보상'), el('span', null, bd.rewardText));
    head.append(rw);
    box.appendChild(head);
    const row = el('div', 'tb-brow');
    const slots = el('div', 'tb-slots');
    for (const s of bd.slots) {
      const w = el('div', 'tb-slotw');
      const slot = el('div', s.have >= s.need ? 'tb-slot full' : 'tb-slot');
      slot.append(el('span', 'tb-slot-ico', s.ico), el('span', 'tb-badge', `${s.have}/${s.need}`));
      if (s.have < s.need) slot.append(el('span', 'tb-bag', `🎒${s.bag}`));
      w.append(slot, el('span', 'tb-slot-name', s.label));
      slots.appendChild(w);
    }
    row.appendChild(slots);
    if (bd.done) row.appendChild(el('span', 'tb-stamp', '✅ 완성'));
    else {
      const go = el('button', 'tb-offer', '채우기');
      go.type = 'button';
      go.disabled = !bd.canOffer;
      go.addEventListener('click', () => actions?.offer?.(bd.id));
      row.appendChild(go);
    }
    box.appendChild(row);
    bun.appendChild(box);
  }
  body.appendChild(bun);
  if (c.bloom?.open) body.appendChild(bloomSection(c.bloom));
  body.scrollTop = keep;
}

function slotRow(slots) {
  const wrap = el('div', 'tb-slots');
  for (const s of slots) {
    const w = el('div', 'tb-slotw');
    const slot = el('div', s.have >= s.need ? 'tb-slot full' : 'tb-slot');
    slot.append(el('span', 'tb-slot-ico', s.ico), el('span', 'tb-badge', s.have ? `${s.have}/${s.need}` : `${s.need}`));
    if (s.have < s.need) slot.append(el('span', 'tb-bag', `🎒${s.bag}`));
    w.append(slot, el('span', 'tb-slot-name', s.label));
    wrap.appendChild(w);
  }
  return wrap;
}

function actButton(label, disabled, onClick) {
  const b = el('button', 'tb-offer', label);
  b.type = 'button';
  b.disabled = disabled;
  b.addEventListener('click', onClick);
  return b;
}

function bloomSection(v) {
  const sec = el('section', 'tb-sec tb-bloomsec');
  const h = el('h3', 'tb-h');
  h.append(el('span', null, '🌸 꽃피우기'));
  if (v.done) h.append(el('span', 'tb-stamp pink', '🌸 꽃이 피었어요'));
  sec.appendChild(h);

  const meters = el('div', 'tb-meters');
  for (const [label, r] of [['🎁 꾸러미', v.rows.stage], ['💧 돌보기', v.rows.care], ['📖 손님', v.rows.guests]]) {
    const ok = r.have >= r.need;
    const row = el('div', ok ? 'tb-meter ok' : 'tb-meter');
    const bar = el('div', 'tb-mbar'); const fill = el('i'); fill.style.width = `${Math.round(r.have / r.need * 100)}%`; bar.appendChild(fill);
    row.append(el('span', 'tb-mlabel', label), bar, el('span', 'tb-mnum', `${r.have}/${r.need}`));
    meters.appendChild(row);
  }
  sec.appendChild(meters);
  if (v.done) return sec;

  const care = el('div', 'tb-bundle');
  const ch = el('div', 'tb-bhead'); ch.append(el('b', null, '💧 오늘 돌보기'));
  care.appendChild(ch);
  const crow = el('div', 'tb-brow');
  if (v.care.complete) crow.append(el('span', 'tb-hint', '돌보기를 다 채웠어요'));
  else if (v.care.doneToday) crow.append(el('span', 'tb-hint', '오늘은 돌봤어요. 내일 또 와요'));
  else crow.append(slotRow(v.care.slots), actButton('돌보기', !v.care.can, () => actions?.care?.()));
  care.appendChild(crow);
  sec.appendChild(care);

  const gb = el('div', 'tb-bundle');
  const gh = el('div', 'tb-bhead'); gh.append(el('b', null, '📖 빈터 손님'));
  gb.appendChild(gh);
  const grow = el('div', 'tb-brow');
  if (v.guest) {
    const who = el('span', 'tb-guest');
    who.append(el('span', 'tb-guest-ico', v.guest.ico), el('span', null, v.guest.name), el('span', 'tb-hint', v.guest.fresh ? '처음 보는 손님' : '또 왔어요'));
    grow.append(who, actButton('살펴보기', false, () => actions?.observe?.(v.guest.id)));
  } else {
    const line = v.visited
      ? (v.phase === 'night' ? '오늘 밤 손님은 다녀갔어요. 내일 또 와요' : '오늘 낮 손님은 다녀갔어요. 밤에 또 와요')
      : '조건에 맞는 손님이 없어요. 빈터 장식을 바꿔 보세요';
    grow.append(el('span', 'tb-hint', line));
  }
  gb.appendChild(grow);
  const book = el('div', 'tb-guestbook');
  for (const g of v.guests) {
    const cell = el('span', g.seen ? 'tb-gcell seen' : 'tb-gcell');
    cell.append(el('span', 'tb-gcell-ico', g.seen ? g.ico : '🔍'));
    if (g.seen) cell.append(el('small', null, g.name));
    else cell.append(el('small', null, g.hint), el('small', null, g.when));
    book.appendChild(cell);
  }
  gb.appendChild(book);
  sec.appendChild(gb);

  if (v.stage) {
    const st = el('div', 'tb-bundle');
    const sh = el('div', 'tb-bhead');
    const sn = el('b'); sn.append(el('span', null, '🌸 꽃 꾸러미'), el('span', null, ` ${v.stage.n}/${v.rows.stage.need}`)); sh.append(sn);
    const rw = el('span', 'tb-reward'); rw.append(el('span', null, '보상'), el('span', null, v.stage.rewardText));
    sh.append(rw);
    st.appendChild(sh);
    if (v.stage.locked) st.appendChild(el('p', 'tb-hint', '🔒 위 꾸러미를 먼저 다 채워요'));
    else {
      const srow = el('div', 'tb-brow');
      srow.append(slotRow(v.stage.slots), actButton('채우기', !v.stage.canOffer, () => actions?.stage?.()));
      st.appendChild(srow);
    }
    sec.appendChild(st);
  }
  return sec;
}
