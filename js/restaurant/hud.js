import { MENU, STAR, STAR_UP, SERVICE_SEC, CHOP_TAPS, PATIENCE } from './data.js';
import { RECIPE } from './next-step.js';

const CSS = `
#rest-hud{position:fixed;left:0;right:0;top:0;pointer-events:none;z-index:30;font-family:inherit}
#rest-hud .bar{display:flex;gap:8px;justify-content:center;align-items:flex-start;padding:calc(env(safe-area-inset-top) + 10px) 12px 0}
#rest-hud .clock{background:rgba(47,94,71,.92);color:#fff8e8;border-radius:14px;padding:6px 12px;font-weight:800;font-size:15px;box-shadow:0 4px 12px rgba(0,0,0,.18)}
#rest-hud .tk{position:relative;width:62px;background:#fff8e8;border-radius:12px;padding:4px 0 8px;text-align:center;box-shadow:0 4px 12px rgba(0,0,0,.18);border:2px solid #2f5e47}
#rest-hud .tk b{display:block;font-size:11px;color:#2f5e47}
#rest-hud .tk i{font-style:normal;font-size:24px;line-height:1.1}
#rest-hud .tk u{position:absolute;left:6px;right:6px;bottom:4px;height:4px;border-radius:2px;background:#e3d8c2;overflow:hidden;text-decoration:none}
#rest-hud .tk u s{display:block;height:100%;background:#6bb35a}
#rest-hud .tk.mid u s{background:#e9b949}
#rest-hud .tk.late u s{background:#d9604c}
html body.rest-hud-on #guide-card{top:calc(env(safe-area-inset-top) + 80px)}
#rest-hud .st{position:fixed;transform:translate(-50%,-100%);pointer-events:none}
#rest-hud .dots{display:flex;gap:3px}
#rest-hud .dots span{width:13px;height:13px;border-radius:3px;border:2px solid #fff8e8;background:rgba(47,94,71,.35)}
#rest-hud .dots span.on{background:#ffc94a}
#rest-hud .dots span.beat{box-shadow:0 0 0 2px #ffc94a}
#rest-hud .gauge{position:relative;width:74px;height:12px;border-radius:6px;background:rgba(43,43,43,.75);border:2px solid #fff8e8;overflow:hidden}
#rest-hud .gauge em{position:absolute;top:0;bottom:0;background:#6bd36a}
#rest-hud .gauge s{position:absolute;top:-2px;bottom:-2px;width:3px;background:#fff;border-radius:2px}
#rest-hud .gauge.done{background:rgba(201,138,74,.9)}
#rest-hud .gauge.burn{background:rgba(217,96,76,.9)}
#rest-hud .gauge.perfect{box-shadow:0 0 0 3px #6bd36a}
#rest-hud .num{width:26px;height:26px;border-radius:50%;background:#2f5e47;color:#fff8e8;font-weight:800;font-size:14px;display:grid;place-items:center;border:3px solid #6bd36a;box-shadow:0 2px 6px rgba(0,0,0,.25)}
#rest-hud .num.mid{border-color:#e9b949}
#rest-hud .num.late{border-color:#d9604c}
#rest-hud .tk.now{border-color:#e2b54a;box-shadow:0 0 0 3px rgba(226,181,74,.55),0 4px 12px rgba(0,0,0,.18)}
#rest-hud .arrow{position:fixed;transform:translate(-50%,-100%);filter:drop-shadow(0 3px 3px rgba(0,0,0,.3));animation:rh-bob 1s ease-in-out infinite}
#rest-hud .arrow:before{content:'';display:block;width:14px;height:20px;margin:0 auto;background:#ffc94a;border-radius:3px 3px 0 0}
#rest-hud .arrow:after{content:'';display:block;width:0;height:0;border-left:17px solid transparent;border-right:17px solid transparent;border-top:20px solid #ffc94a}
@keyframes rh-bob{50%{margin-top:-8px}}
#rest-hud .next{word-break:keep-all;position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom) + 18px);transform:translateX(-50%);display:flex;align-items:center;gap:14px;background:rgba(255,248,232,.96);border:2px solid #2f5e47;border-radius:20px;padding:7px 18px 7px 10px;font-weight:800;font-size:15px;letter-spacing:.04em;word-spacing:.12em;color:#3a3128;box-shadow:0 6px 14px rgba(0,0,0,.2);white-space:nowrap}
#rest-hud .next[hidden]{display:none}
#rest-hud .steps{display:flex;gap:6px;align-items:center;letter-spacing:0;word-spacing:0}
#rest-hud .steps i{font-style:normal;width:28px;height:28px;border-radius:50%;display:grid;place-items:center;background:#efe6d2;opacity:.5;font-size:15px}
#rest-hud .steps i.ok{background:#cfe9c4;opacity:1}
#rest-hud .steps i.on{background:#ffc94a;opacity:1;box-shadow:0 0 0 3px rgba(255,201,74,.4)}
#rest-hud .steps em{width:10px;height:2px;background:#c9b99f}
body.is-touch #rest-hud .next{font-size:13px;gap:10px;bottom:calc(env(safe-area-inset-bottom) + 10px);padding:5px 14px 5px 8px}
body.is-touch #rest-hud .steps{gap:4px}
body.is-touch #rest-hud .steps em{width:7px}
body.is-touch #rest-hud .steps i{width:24px;height:24px;font-size:13px}
#rest-card{position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:rgba(20,28,20,.42);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);z-index:60;color:#3a3128}
#rest-card.show{display:flex}
#rest-card .box{width:min(340px,90vw);background:#fffaf0;border-radius:22px;overflow:hidden;box-shadow:0 18px 40px rgba(0,0,0,.3);animation:rc-pop .38s cubic-bezier(.2,1.4,.4,1) both}
#rest-card .head{background:radial-gradient(circle at 30% 20%,#3d6b52,#24493a);color:#fff8e8;text-align:center;padding:16px 16px 18px;border-bottom:6px solid #a8794a}
#rest-card .kick{font-size:12px;opacity:.75;letter-spacing:2px}
#rest-card h3{margin:2px 0 6px;font-size:21px}
#rest-card .stars{font-size:26px;letter-spacing:2px;color:#ffd45e;filter:drop-shadow(0 2px 2px rgba(0,0,0,.3))}
#rest-card .stars em{font-style:normal;opacity:.28;color:#fff8e8}
#rest-card .avg{font-size:12.5px;opacity:.85;margin-top:2px}
#rest-card .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:14px 16px 6px}
#rest-card .grid div{background:#f3ece0;border-radius:12px;padding:8px 4px;text-align:center;font-size:11px;color:#7b6d5c}
#rest-card .grid b{display:block;font-size:17px;color:#3a3128}
#rest-card .bonus{margin:4px 16px 0;background:#ffe9a8;color:#8a5a00;border-radius:12px;text-align:center;font-weight:800;padding:7px;font-size:13.5px}
#rest-card .gwrap{padding:10px 16px 0}
#rest-card .gl{font-size:11.5px;color:#7b6d5c;font-weight:700;margin-bottom:6px}
#rest-card .goal{display:grid;grid-template-columns:1fr auto;gap:3px 10px;align-items:center;font-size:12.5px}
#rest-card .goal b{font-size:12px;color:#7b6d5c}
#rest-card .bar{grid-column:1/-1;height:8px;border-radius:4px;background:#e9dfcc;overflow:hidden;margin-bottom:6px}
#rest-card .bar i{display:block;height:100%;border-radius:4px;background:linear-gradient(90deg,#7cc56a,#4f9c5c);animation:rc-grow .9s .35s ease-out both}
#rest-card .bar.full i{background:linear-gradient(90deg,#ffd45e,#f2b632)}
#rest-card .foot{padding:8px 16px 16px}
#rest-card .menu{padding:10px 16px 2px}
#rest-card .mr{display:grid;grid-template-columns:104px 1fr;align-items:center;gap:12px;padding:8px 0;letter-spacing:.03em;border-bottom:1px dashed #e3d8c2;font-size:14px;font-weight:700}
#rest-card .mr:last-child{border:0}
#rest-card .mr .steps{display:flex;gap:6px;align-items:center;letter-spacing:0}
#rest-card .mr i{font-style:normal;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:#f3ece0;font-size:16px}
#rest-card .mr em{width:10px;height:2px;background:#c9b99f}
#rest-card .tip{margin:6px 16px 0;background:#f3ece0;border-radius:10px;padding:8px 12px;font-size:12.5px;line-height:1.6;letter-spacing:.03em;word-break:keep-all;word-spacing:.1em;color:#6b5d4c}
#rest-card button{display:block;width:100%;border:0;border-radius:14px;padding:12px;font:inherit;font-size:15.5px;font-weight:800;background:#2f5e47;color:#fff8e8;cursor:pointer;pointer-events:auto}
#rest-card button:active{transform:scale(.97)}
@keyframes rc-pop{from{transform:scale(.86) translateY(14px);opacity:0}}
@keyframes rc-grow{from{width:0}}
@media (max-height:480px){
#rest-card .box{width:min(560px,92vw);display:grid;grid-template-columns:200px 1fr}
#rest-card .head{border-bottom:0;border-right:6px solid #a8794a;display:flex;flex-direction:column;justify-content:center;padding:12px}
#rest-card .stars{font-size:22px}
#rest-card .grid{padding:12px 14px 4px}
#rest-card .gwrap{padding:8px 14px 0}
#rest-card .foot{padding:6px 14px 12px}
}
`;

const BUBBLE_H = 40;
const LABEL = { take: '✋ 꺼내기', put: '🫳 내려놓기', chop: '🔪 썰기', flip: '🍳 뒤집기', pick: '✋ 들기', pickCook: '✋ 꺼내기', plate: '🍽️ 담기', trash: '🗑️ 버리기', serve: '🍽️ 내가기' };
export const contextLabel = c => (c ? LABEL[c.do] : null);

export function resultView(r, out, goals, copy) {
  return {
    kicker: out.starUp ? '축하해요' : '오늘의 영업',
    title: out.starUp ? copy.starUp(out.rest.star) : copy.done,
    avg: r.avg,
    stats: [[`${r.served}명`, '손님'], [`${r.perfect}개`, '완벽한 요리'], [`🪙 ${r.coins}`, '번 코인']],
    bonus: out.bonus,
    goals,
  };
}

export function resultHtml(v) {
  const full = Math.max(0, Math.min(5, Math.round(v.avg)));
  const stars = `${'★'.repeat(full)}<em>${'★'.repeat(5 - full)}</em>`;
  const head = `<div class="head"><div class="kick">${v.kicker}</div><h3>${v.title}</h3><div class="stars">${stars}</div><div class="avg">평균 ★${v.avg.toFixed(1)}</div></div>`;
  const grid = `<div class="grid">${v.stats.map(([b, l]) => `<div><b>${b}</b>${l}</div>`).join('')}</div>`;
  const bonus = v.bonus ? `<div class="bonus">🎁 별 올리기 선물 🪙 ${v.bonus}</div>` : '';
  const goals = v.goals.length
    ? `<div class="gwrap"><div class="gl">다음 별까지</div><div class="goal">${v.goals.map(([k, a, n]) => `<span>${k}</span><b>${a} / ${n}</b><div class="bar${a >= n ? ' full' : ''}"><i style="width:${Math.round(Math.min(1, a / n) * 100)}%"></i></div>`).join('')}</div></div>`
    : '';
  return `${head}<div>${grid}${bonus}${goals}<div class="foot"><button type="button">확인</button></div></div>`;
}

export function nextHtml(v) {
  const steps = v.steps.map((ico, k) => `${k ? '<em></em>' : ''}<i class="${k < v.i ? 'ok' : k === v.i ? 'on' : ''}">${ico}</i>`).join('');
  return `${steps ? `<div class="steps">${steps}</div>` : ''}<span>${v.text}</span>`;
}

const DISH_NAME = { grilled: '🐟 생선구이', riceball: '🍙 주먹밥', soup: '🍲 생선국' };
export const MENU_COPY = { kicker: '칠판', title: '오늘의 메뉴', tips: ['🍳 막대가 초록 칸일 때 뒤집어요', '🔪 박자에 맞춰 네 번 눌러요'], start: '🔔 영업 시작' };

export function menuView(star, first = false) {
  const menus = first ? ['grilled'] : STAR[star].menus;
  return { rows: menus.map(k => [DISH_NAME[k], RECIPE[k].slice(0, -1)]) };
}

export function menuHtml(v) {
  const rows = v.rows.map(([name, icos]) => `<div class="mr"><span>${name}</span><div class="steps">${icos.map((ico, k) => `${k ? '<em></em>' : ''}<i>${ico}</i>`).join('')}</div></div>`).join('');
  return `<div class="head"><div class="kick">${MENU_COPY.kicker}</div><h3>${MENU_COPY.title}</h3></div><div><div class="menu">${rows}</div><div class="tip">${MENU_COPY.tips.map(t => `<div>${t}</div>`).join('')}</div><div class="foot"><button type="button">${MENU_COPY.start}</button></div></div>`;
}

export function goalRows(rest) {
  const c = STAR_UP[rest.star + 1];
  if (!c) return [];
  const rows = [['식당 평점', Math.min(rest.rating, c.rating), c.rating]];
  for (const [k, n] of Object.entries(c.served || {})) rows.push([`${MENU[k].ico} 내기`, Math.min(rest.served[k] || 0, n), n]);
  if (c.combo) rows.push(['별점 4 이상 연속', Math.min(rest.bestCombo, c.combo), c.combo]);
  return rows;
}

export function mountHud(doc) {
  if (!doc.getElementById('rest-hud-css')) {
    const st = doc.createElement('style'); st.id = 'rest-hud-css'; st.textContent = CSS; doc.head.appendChild(st);
  }
  const root = doc.createElement('div'); root.id = 'rest-hud'; root.style.display = 'none';
  root.innerHTML = '<div class="bar"><div class="clock"></div><div class="tks" style="display:flex;gap:8px"></div></div><div class="sts"></div><div class="arrow" style="display:none"></div><div class="next" hidden></div>';
  doc.body.appendChild(root);
  const card = doc.createElement('div'); card.id = 'rest-card';
  card.innerHTML = '<div class="box"></div>';
  doc.body.appendChild(card);
  const clock = root.querySelector('.clock'), tks = root.querySelector('.tks'), sts = root.querySelector('.sts');
  const arrowEl = root.querySelector('.arrow'), nextEl = root.querySelector('.next');
  let onClose = null, cardMode = null, openedAt = 0;
  const CONFIRM_GAP = 350;
  const closeCard = run => {
    card.classList.remove('show');
    const f = onClose; onClose = null; cardMode = null;
    if (run) f?.();
  };
  card.addEventListener('click', e => {
    if (e.target.closest('button')) closeCard(true);
    else if (cardMode === 'menu' && !e.target.closest('.box')) closeCard(false);
  });
  const stEls = new Map();
  let clockText = '', ticketHtml = '';

  const guideCard = doc.getElementById('guide-card');
  const bar = root.querySelector('.bar');
  let bubbleMin = 0, dirty = true;
  const markDirty = () => { dirty = true; };
  const measureTop = () => {
    if (!dirty) return;
    dirty = false;
    const el = guideCard && !guideCard.hidden ? guideCard : bar;
    bubbleMin = el.getBoundingClientRect().bottom + BUBBLE_H;
  };
  const watch = guideCard && typeof MutationObserver !== 'undefined' ? new MutationObserver(markDirty) : null;
  watch?.observe(guideCard, { attributes: true, attributeFilter: ['hidden'], childList: true, characterData: true, subtree: true });
  addEventListener('resize', markDirty);
  const setHtml = (el, html) => { if (el._html !== html) { el._html = html; el.innerHTML = html; } };

  function stEl(id) {
    let el = stEls.get(id);
    if (!el) { el = doc.createElement('div'); el.className = 'st'; sts.appendChild(el); stEls.set(id, el); }
    return el;
  }

  function place(el, x, y) {
    const l = `${Math.round(x)}px`, t = `${Math.round(y)}px`;
    if (el.style.left !== l) el.style.left = l;
    if (el.style.top !== t) el.style.top = t;
    if (el.style.display) el.style.display = '';
  }

  function gauge(el, view) {
    const [a, b] = view.zone || [0, 0];
    const cls = view.state === 'burnt' ? ' burn' : view.state === 'done' ? ' done' : view.perfect ? ' perfect' : '';
    const zone = view.zone ? `<em style="left:${(a * 100).toFixed(1)}%;width:${((b - a) * 100).toFixed(1)}%"></em>` : '';
    setHtml(el, `<div class="gauge${cls}">${zone}<s></s></div>`);
    const needle = el.querySelector('s');
    const left = `${Math.min(100, view.p * 100).toFixed(1)}%`;
    if (needle.style.left !== left) needle.style.left = left;
  }

  return {
    show(on) {
      root.style.display = on ? '' : 'none';
      doc.body.classList.toggle('rest-hud-on', on);
      dirty = true;
      if (!on) { sts.innerHTML = ''; stEls.clear(); clockText = ''; ticketHtml = ''; tks.innerHTML = ''; nextEl.hidden = true; nextEl._html = ''; arrowEl.style.display = 'none'; }
    },
    cardOpen: () => card.classList.contains('show'),
    clock(sec) {
      measureTop();
      const t = `🍽️ ${Math.max(0, Math.ceil(SERVICE_SEC - sec))}`;
      if (t !== clockText) { clockText = t; clock.textContent = t; }
    },
    tickets(list, now, pat, focus = null) {
      const html = list.map(t => {
        const w = now - t.t0, a = PATIENCE[0] * pat, b = PATIENCE[1] * pat;
        const cls = w < a ? '' : w < b ? ' mid' : ' late';
        const left = Math.round(Math.max(0, 1 - w / b) * 20) * 5;
        return `<div class="tk${cls}${t.id === focus ? ' now' : ''}"><b>${t.table + 1}</b><i>${MENU[t.menu].ico}</i><u><s style="width:${left}%"></s></u></div>`;
      }).join('');
      if (html !== ticketHtml) { ticketHtml = html; tks.innerHTML = html; }
    },
    station(id, view, x, y) {
      if (!view) { const el = stEls.get(id); if (el && el.style.display !== 'none') el.style.display = 'none'; return; }
      const el = stEl(id);
      place(el, x, view.kind === 'bubble' ? Math.max(y, bubbleMin) : y);
      if (view.kind === 'bubble') setHtml(el, `<div class="num${view.mood ? ` ${view.mood}` : ''}">${view.n}</div>`);
      else if (view.kind === 'chop') setHtml(el, `<div class="dots">${Array.from({ length: CHOP_TAPS }, (_, i) => `<span class="${i < view.taps ? 'on' : ''}${i === view.taps && view.beat ? ' beat' : ''}"></span>`).join('')}</div>`);
      else gauge(el, view);
    },
    next(view) {
      if (!view) { if (!nextEl.hidden) { nextEl.hidden = true; nextEl._html = ''; } return; }
      setHtml(nextEl, nextHtml(view));
      if (nextEl.hidden) nextEl.hidden = false;
    },
    arrow(x, y) {
      if (x == null) { if (arrowEl.style.display !== 'none') arrowEl.style.display = 'none'; return; }
      place(arrowEl, x, y);
    },
    remove(id) {
      const el = stEls.get(id);
      if (!el) return;
      el.remove();
      stEls.delete(id);
    },
    result(view, onDone) {
      card.querySelector('.box').innerHTML = resultHtml(view);
      onClose = onDone; cardMode = 'result';
      card.classList.add('show');
    },
    menu(view, onStart) {
      card.querySelector('.box').innerHTML = menuHtml(view);
      onClose = onStart; cardMode = 'menu'; openedAt = performance.now();
      card.classList.add('show');
    },
    confirmMenu() { if (cardMode === 'menu' && performance.now() - openedAt > CONFIRM_GAP) closeCard(true); },
    closeCard() { if (cardMode) closeCard(false); },
    destroy() { watch?.disconnect(); removeEventListener('resize', markDirty); root.remove(); card.remove(); },
  };
}
