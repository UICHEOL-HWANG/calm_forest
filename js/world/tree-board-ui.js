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
    t.append(el('i', 'tb-dot'), el('span', null, b.ico), el('span', 'tb-tab-name', b.name));
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
    lead.append(el('span', null, '🔒'), el('span', null, '앞 가지의 빈터를 먼저 꾸며 주세요'), el('b', null, c.prevName));
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
  hab.appendChild(el('p', 'tb-hint', '장식을 누르면 빈칸에 놓여요 · 놓인 칸을 누르면 빼고 재료를 돌려받아요'));

  const decos = el('div', 'tb-decos');
  for (const d of c.decor) {
    const b = el('button', 'tb-deco');
    b.type = 'button';
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
  h2.append(el('span', null, '🎁 꾸러미 바치기'));
  if (c.bundlesDone) h2.append(el('span', 'tb-stamp pink', '🌸 다 바쳤어요'));
  bun.appendChild(h2);
  for (const bd of c.bundles) {
    const box = el('div', bd.done ? 'tb-bundle done' : 'tb-bundle');
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
      const go = el('button', 'tb-offer', '바치기');
      go.type = 'button';
      go.disabled = !bd.canOffer;
      go.addEventListener('click', () => actions?.offer?.(bd.id));
      row.appendChild(go);
    }
    box.appendChild(row);
    bun.appendChild(box);
  }
  body.appendChild(bun);
  body.scrollTop = keep;
}
