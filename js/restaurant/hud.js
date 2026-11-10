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
#rest-card{position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:rgba(20,28,20,.35);z-index:60}
#rest-card.show{display:flex}
#rest-card .box{background:#fff8e8;border-radius:22px;padding:20px 22px 16px;min-width:260px;max-width:min(360px,86vw);box-shadow:0 12px 30px rgba(0,0,0,.25);border:3px solid #2f5e47;text-align:center;color:#2f3a2c}
#rest-card h3{margin:0 0 8px;font-size:20px}
#rest-card p{margin:4px 0;font-size:15px}
#rest-card .goal{margin-top:10px;text-align:left;font-size:13.5px;background:#f1e7d2;border-radius:12px;padding:8px 10px}
#rest-card .goal div{display:flex;justify-content:space-between;gap:10px}
#rest-card button{margin-top:12px;border:0;border-radius:14px;padding:10px 26px;font-size:16px;font-weight:800;background:#2f6b4f;color:#fff8e8;pointer-events:auto}
`;

const LABEL = { take: '✋ 꺼내기', put: '🫳 내려놓기', chop: '🔪 썰기', flip: '🍳 뒤집기', pick: '✋ 들기', pickCook: '✋ 꺼내기', plate: '🍽️ 담기', trash: '🗑️ 버리기', serve: '🍽️ 내가기' };
export const contextLabel = c => (c ? LABEL[c.do] : null);

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
  card.innerHTML = '<div class="box"><h3></h3><div class="body"></div><button type="button">확인</button></div>';
  doc.body.appendChild(card);
  const clock = root.querySelector('.clock'), tks = root.querySelector('.tks'), sts = root.querySelector('.sts');
  let onClose = null;
  card.querySelector('button').addEventListener('click', () => { card.classList.remove('show'); const f = onClose; onClose = null; f?.(); });
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
    result({ title, lines, goals, onDone }) {
      card.querySelector('h3').textContent = title;
      const g = goals.length ? `<div class="goal">${goals.map(([k, v, n]) => `<div><span>${k}</span><b>${v} / ${n}</b></div>`).join('')}</div>` : '';
      card.querySelector('.body').innerHTML = lines.map(l => `<p>${l}</p>`).join('') + g;
      onClose = onDone;
      card.classList.add('show');
    },
    destroy() { root.remove(); card.remove(); },
  };
}
