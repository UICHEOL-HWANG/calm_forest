const CSS = `
#collection-book-modal{position:fixed;inset:0;z-index:40;display:none;place-items:center;background:rgba(30,40,50,.5)}
#collection-book-modal.show{display:grid}
.cb-card{width:min(400px,92vw);max-height:calc(100dvh - 24px);overflow:auto;background:#fffaf2;border-radius:18px;padding:16px 14px 12px;box-shadow:0 10px 30px rgba(0,0,0,.25);color:#2b2118}
.cb-title{display:flex;justify-content:space-between;align-items:baseline;margin:0 0 8px;font-size:17px}
.cb-title small{font-size:12px;color:#6b5b4a;font-weight:500}
#cb-head:empty{display:none}
#cb-head{margin-bottom:10px}
.cb-head{display:flex;gap:8px;align-items:center;justify-content:space-between;flex-wrap:wrap;background:#e6eff2;border-radius:12px;padding:8px 10px;font-size:13px}
.cb-sec{font-size:12px;color:#6b5b4a;margin:8px 0 5px}
.cb-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
.cb-slot{aspect-ratio:1;border-radius:12px;background:#eef3f5;border:2px solid #9cc3d6;display:grid;place-items:center;font-size:24px;position:relative;cursor:pointer;padding:0;color:inherit}
.cb-slot small{position:absolute;bottom:2px;left:2px;right:2px;font-size:9px;color:#6b5b4a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cb-slot.empty{background:#dde5e8;border-color:transparent;color:#8a9aa0;font-size:18px}
.cb-slot.sel{outline:3px solid #4e7f9a;outline-offset:1px}
.cb-hint{display:flex;gap:8px;align-items:center;justify-content:space-between;min-height:40px;margin-top:10px;padding:8px 10px;border-radius:12px;background:#f3ead8;font-size:13px}
.cb-btn{border:0;border-radius:10px;padding:8px 12px;font-weight:700;background:#4e7f9a;color:#fff;font-size:13px;white-space:nowrap;cursor:pointer}
.cb-btn.ghost{background:#e7dcc8;color:#2b2118}
.cb-close{display:block;width:100%;margin-top:10px}
@media (max-height:520px){.cb-card{padding:10px 12px 8px}.cb-grid{grid-template-columns:repeat(7,1fr)}.cb-slot{font-size:18px}}
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
  m.innerHTML = '<div class="cb-card"><h2 class="cb-title"><span id="cb-title"></span><small id="cb-count"></small></h2><div id="cb-head"></div><div id="cb-body"></div><div class="cb-hint" id="cb-hint"></div><button class="cb-btn ghost cb-close" id="cb-close"></button></div>';
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
  if (!info?.go) return;
  const b = document.createElement('button');
  b.className = 'cb-btn';
  b.textContent = info.go.label;
  b.onclick = info.go.onClick;
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
  $('cb-close').textContent = next.closeLabel;
  $('cb-close').onclick = closeBook;
  const head = $('cb-head');
  head.textContent = '';
  if (next.head) head.append(next.head);
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
