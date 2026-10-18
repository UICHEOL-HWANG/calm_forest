(() => {
  const box = document.querySelector('.wk-search');
  if (!box) return;
  const input = box.querySelector('input');
  const list = box.querySelector('.wk-results');
  let data = null;
  let hits = [];
  let on = 0;
  const load = () => data || (data = fetch('/wiki/search.json').then(r => r.json()).catch(() => { data = null; return []; }));
  const norm = (s) => s.toLowerCase().replace(/\s+/g, '');
  const esc = (s) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const draw = () => {
    list.hidden = !hits.length;
    list.innerHTML = hits.map((h, i) => `<li><a href="${h.p}"${i === on ? ' class="on"' : ''}>${h.i} ${esc(h.n)}<small>${esc(h.c)}</small></a></li>`).join('');
  };
  input.addEventListener('focus', load);
  input.addEventListener('input', async () => {
    const typed = input.value;
    const q = norm(typed);
    const all = await load();
    if (typed !== input.value) return;
    hits = q ? all.filter(h => norm(h.n + h.e + h.c).includes(q)).slice(0, 8) : [];
    on = 0;
    draw();
  });
  input.addEventListener('keydown', (ev) => {
    if (ev.isComposing || ev.keyCode === 229 || !hits.length) return;
    if (ev.key === 'ArrowDown') { on = (on + 1) % hits.length; draw(); ev.preventDefault(); }
    else if (ev.key === 'ArrowUp') { on = (on - 1 + hits.length) % hits.length; draw(); ev.preventDefault(); }
    else if (ev.key === 'Enter') location.href = hits[on].p;
    else if (ev.key === 'Escape') { hits = []; draw(); }
  });
  document.addEventListener('click', (ev) => { if (!box.contains(ev.target)) { hits = []; draw(); } });
})();
