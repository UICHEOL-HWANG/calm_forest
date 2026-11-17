const CSS = `
#collection-book-modal{position:fixed;inset:0;z-index:40;display:none;place-items:center;background:rgba(30,40,50,.5)}
#collection-book-modal.show{display:grid}
.cb-card{width:min(400px,92vw);max-height:calc(100dvh - 24px);overflow:auto;background:#fffaf2;border-radius:18px;padding:16px 14px 12px;box-shadow:0 10px 30px rgba(0,0,0,.25);color:#2b2118}
.cb-card{--cb-r:12px;--cb-gap:5px}
.cb-title{display:flex;gap:8px;align-items:baseline;margin:0 0 8px;font-size:17px}
.cb-title small{font-size:12px;color:#6b5b4a;font-weight:500}
#cb-title{margin-right:auto}
#cb-coins{padding:3px 9px;border-radius:20px;background:#f3ead8;font-weight:700}
#cb-coins:empty,#cb-count:empty{display:none}
#cb-head:empty{display:none}
#cb-head{margin-bottom:10px}
.cb-head{display:flex;gap:8px;align-items:center;justify-content:space-between;flex-wrap:wrap;background:#e6eff2;border-radius:var(--cb-r);padding:8px 10px;font-size:13px}
.cb-head.no{background:#fbeee6}
.cb-rows{display:grid;gap:var(--cb-gap)}
.cb-picks{display:grid;grid-template-columns:1fr 1fr;gap:var(--cb-gap)}
.cb-pick{display:flex;flex-wrap:wrap;align-items:center;align-content:flex-start;justify-content:space-between;min-height:44px;padding:0;border:2.5px solid transparent;border-radius:var(--cb-r);background:#edeae3;color:inherit;font:inherit;cursor:pointer;overflow:hidden}
.cb-pick i{flex:0 0 100%;aspect-ratio:1;background:#8fb860 center/150% no-repeat}
.cb-pick b{margin:4px 0 2px 8px;font-size:12px}
.cb-pill{margin:6px 8px 7px;padding:2px 8px;border-radius:20px;background:#4a8a60;color:#fff;font-size:11px;font-weight:700;white-space:nowrap}
.cb-pick.using{border-color:#4e7f9a;background:#e2edf5;cursor:default}
.cb-pick.using .cb-pill{background:#4e7f9a}
.cb-pick.buy .cb-pill{background:#fff;color:#35627a;box-shadow:inset 0 0 0 1.5px #4e7f9a}
.cb-pick.short{cursor:default}
.cb-pick.short i{opacity:.6}
.cb-pick.short .cb-pill{background:#ddd6ca;color:#857a6c}
.cb-pick:focus-visible{outline:3px solid #2b2118;outline-offset:1px}
.cb-num b{margin-left:6px;color:#3f8f52}
#cb-foot:empty{display:none}
#cb-foot{margin-top:10px}
#cb-foot .cb-hint{margin-top:0}
.cb-sec{font-size:12px;color:#6b5b4a;margin:8px 0 5px}
.cb-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
.cb-slot{aspect-ratio:1;border-radius:12px;background:#eef3f5;border:2px solid #9cc3d6;display:grid;place-items:center;font-size:24px;position:relative;cursor:pointer;padding:0;color:inherit}
.cb-slot small{position:absolute;bottom:2px;left:2px;right:2px;font-size:9px;color:#6b5b4a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cb-slot.empty{background:#dde5e8;border-color:transparent;color:#8a9aa0;font-size:18px}
.cb-slot.sel{outline:3px solid #4e7f9a;outline-offset:1px}
.cb-hint{display:flex;gap:8px;align-items:center;justify-content:space-between;min-height:40px;margin-top:10px;padding:8px 10px;border-radius:12px;background:#f3ead8;font-size:13px}
.cb-btn{border:0;border-radius:10px;padding:8px 12px;font-weight:700;background:#4e7f9a;color:#fff;font-size:13px;white-space:nowrap;cursor:pointer}
.cb-btn.ghost{background:#e7dcc8;color:#2b2118}
.cb-btn:disabled{background:#c9c2b6;cursor:default}
.cb-hint span:empty{display:none}
.cb-hint span:empty+.cb-btn{flex:1}
.cb-close{display:block;width:100%;margin-top:10px}
@media (max-height:520px){.cb-card{padding:10px 12px 8px}.cb-grid{grid-template-columns:repeat(7,1fr)}.cb-slot{font-size:18px}.cb-title{margin-bottom:4px}.cb-head,.cb-hint{padding:3px 10px}.cb-sec{margin:4px 0 3px}#cb-head{margin-bottom:6px}#cb-foot,.cb-hint,.cb-close{margin-top:6px}#cb-foot .cb-hint{min-height:0;padding:5px 10px}#cb-foot .cb-rows{grid-template-columns:1fr 1fr}.cb-card.wide{width:min(560px,92vw)}.cb-picks{grid-template-columns:repeat(4,1fr)}.cb-pick{justify-content:center}.cb-pick i{aspect-ratio:4/3}.cb-pick b{flex:0 0 100%;margin:4px 0 0}.cb-pill{margin:3px 4px 5px}}
`;

const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const $ = (id) => document.getElementById(id);
let model = null;

export function bookHtml({ sections }) {
  return sections.map((sec, si) => `<div class="cb-sec">${esc(sec.title)}</div><div class="cb-grid">${sec.slots.map((s, i) => (s.got
    ? `<button class="cb-slot" data-k="${si}:${i}">${esc(s.ico)}<small>${esc(s.label)}</small></button>`
    : `<button class="cb-slot empty" data-k="${si}:${i}">❔</button>`)).join('')}</div>`).join('');
}

function mount() {
  if ($('collection-book-modal')) return;
  const st = document.createElement('style');
  st.textContent = CSS;
  document.head.append(st);
  const m = document.createElement('div');
  m.id = 'collection-book-modal';
  m.innerHTML = '<div class="cb-card"><h2 class="cb-title"><span id="cb-title"></span><small id="cb-count"></small><small id="cb-coins"></small></h2><div id="cb-head"></div><div id="cb-body"></div><div id="cb-foot"></div><div class="cb-hint" id="cb-hint"></div><button class="cb-btn ghost cb-close" id="cb-close"></button></div>';
  m.addEventListener('click', e => { if (e.target === m) closeBook(); });
  document.body.append(m);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && isBookOpen()) closeBook(); });
}

function setHint(info) {
  const box = $('cb-hint');
  box.textContent = '';
  const line = document.createElement('span');
  line.textContent = info?.line ?? model.hint;
  box.append(line);
  const go = info ? info.go : model.go;
  box.style.display = line.textContent || go ? '' : 'none';
  if (!go) return;
  const b = document.createElement('button');
  b.className = 'cb-btn';
  b.textContent = go.label;
  b.disabled = !!go.disabled;
  b.onclick = go.onClick;
  box.append(b);
}

export function isBookOpen() {
  return !!$('collection-book-modal')?.classList.contains('show');
}

export function closeBook() {
  $('collection-book-modal')?.classList.remove('show');
  model = null;
}

export function openBook(next) {
  mount();
  model = next;
  $('cb-title').textContent = next.title;
  $('cb-count').textContent = next.count;
  $('cb-coins').textContent = next.coins ?? '';
  $('cb-title').closest('.cb-card').classList.toggle('wide', !!next.wide);
  $('cb-close').textContent = next.closeLabel;
  $('cb-close').onclick = closeBook;
  const head = $('cb-head');
  head.textContent = '';
  if (next.head) head.append(next.head);
  const foot = $('cb-foot');
  foot.textContent = '';
  if (next.foot) foot.append(next.foot);
  const body = $('cb-body');
  body.innerHTML = bookHtml(next);
  for (const el of body.querySelectorAll('.cb-slot')) {
    el.onclick = () => {
      const [si, i] = el.dataset.k.split(':').map(Number);
      for (const o of body.querySelectorAll('.cb-slot.sel')) o.classList.remove('sel');
      el.classList.add('sel');
      setHint(next.onSlot?.(next.sections[si].slots[i]) ?? null);
    };
  }
  setHint(null);
  $('collection-book-modal').classList.add('show');
}
