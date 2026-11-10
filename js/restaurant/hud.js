import { MENU, STAR_UP, SERVICE_SEC, CHOP_TAPS, PATIENCE } from './data.js';

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
#rest-hud .bub{background:#fff8e8;border-radius:14px;padding:2px 7px;font-size:22px;box-shadow:0 3px 8px rgba(0,0,0,.2);border:2px solid #2f5e47}
#rest-hud .bub small{font-size:14px;margin-left:2px}
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
  root.innerHTML = '<div class="bar"><div class="clock"></div><div class="tks" style="display:flex;gap:8px"></div></div><div class="sts"></div>';
  doc.body.appendChild(root);
  const card = doc.createElement('div'); card.id = 'rest-card';
  card.innerHTML = '<div class="box"></div>';
  doc.body.appendChild(card);
  const clock = root.querySelector('.clock'), tks = root.querySelector('.tks'), sts = root.querySelector('.sts');
  let onClose = null;
  card.addEventListener('click', e => {
    if (!e.target.closest('button')) return;
    card.classList.remove('show');
    const f = onClose; onClose = null; f?.();
  });
  const stEls = new Map();
  let clockText = '', ticketHtml = '';

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
      if (!on) { sts.innerHTML = ''; stEls.clear(); clockText = ''; ticketHtml = ''; tks.innerHTML = ''; }
    },
    cardOpen: () => card.classList.contains('show'),
    clock(sec) {
      const t = `🍽️ ${Math.max(0, Math.ceil(SERVICE_SEC - sec))}`;
      if (t !== clockText) { clockText = t; clock.textContent = t; }
    },
    tickets(list, now, pat) {
      const html = list.map(t => {
        const w = now - t.t0, a = PATIENCE[0] * pat, b = PATIENCE[1] * pat;
        const cls = w < a ? '' : w < b ? ' mid' : ' late';
        const left = Math.round(Math.max(0, 1 - w / b) * 20) * 5;
        return `<div class="tk${cls}"><b>${t.table + 1}</b><i>${MENU[t.menu].ico}</i><u><s style="width:${left}%"></s></u></div>`;
      }).join('');
      if (html !== ticketHtml) { ticketHtml = html; tks.innerHTML = html; }
    },
    station(id, view, x, y) {
      if (!view) { const el = stEls.get(id); if (el && el.style.display !== 'none') el.style.display = 'none'; return; }
      const el = stEl(id);
      place(el, x, y);
      if (view.kind === 'bubble') setHtml(el, `<div class="bub">${view.ico}<small>${view.mood}</small></div>`);
      else if (view.kind === 'chop') setHtml(el, `<div class="dots">${Array.from({ length: CHOP_TAPS }, (_, i) => `<span class="${i < view.taps ? 'on' : ''}${i === view.taps && view.beat ? ' beat' : ''}"></span>`).join('')}</div>`);
      else gauge(el, view);
    },
    remove(id) {
      const el = stEls.get(id);
      if (!el) return;
      el.remove();
      stEls.delete(id);
    },
    result(view, onDone) {
      card.querySelector('.box').innerHTML = resultHtml(view);
      onClose = onDone;
      card.classList.add('show');
    },
    destroy() { root.remove(); card.remove(); },
  };
}
