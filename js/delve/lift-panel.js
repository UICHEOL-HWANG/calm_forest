const CSS = `
#lift-modal{position:fixed;inset:0;z-index:60;display:flex;align-items:flex-end;justify-content:center;padding:0 16px calc(env(safe-area-inset-bottom,0px) + 112px);background:rgba(8,6,12,.35)}
#lift-modal .lp-box{background:linear-gradient(#5a4632,#3e2f22);border-radius:18px;padding:14px 14px 16px;color:#f5e6c8;width:100%;max-width:300px;box-sizing:border-box;box-shadow:0 10px 30px rgba(0,0,0,.55)}
#lift-modal h3{margin:0 0 12px;font-size:15px;text-align:center}
#lift-modal .lp-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;justify-items:center}
#lift-modal button{width:64px;height:64px;border:0;border-radius:50%;font:inherit;font-weight:800;font-size:15px;cursor:pointer;color:#3a2a14;background:radial-gradient(circle at 40% 35%,#f6dc9a,#c89a48);box-shadow:inset 0 -3px 0 rgba(0,0,0,.2);display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.1}
#lift-modal button.deep{box-shadow:0 0 0 3px #ffe48a,0 0 14px #ffd36a}
#lift-modal button:disabled{background:#5b5048;color:#8c8076;cursor:default}
#lift-modal button.lp-close{background:#4a3e34;color:#e6d6bc}
#lift-modal .lp-lbl{font-size:11px;font-weight:500;margin-top:2px}
`;

function ensureStyle() {
  if (document.getElementById('lift-panel-style')) return;
  const st = document.createElement('style'); st.id = 'lift-panel-style'; st.textContent = CSS; document.head.appendChild(st);
}

function button(big, lbl, cls, onClick, disabled = false) {
  const b = document.createElement('button');
  b.type = 'button'; b.className = cls; b.disabled = disabled;
  const top = document.createElement('span'); top.textContent = big;
  const sub = document.createElement('span'); sub.className = 'lp-lbl'; sub.textContent = lbl;
  b.append(top, sub);
  b.addEventListener('click', (e) => { e.stopPropagation(); onClick(); });
  return b;
}

function onKey(e) {
  if (e.key !== 'Escape') return;
  e.stopPropagation(); closeLiftPanel();
}

export function closeLiftPanel() {
  document.getElementById('lift-modal')?.remove();
  window.removeEventListener('keydown', onKey, true);
}

export function liftPanelOpen() { return !!document.getElementById('lift-modal'); }

export function openLiftPanel(rows, onPick) {
  if (liftPanelOpen()) return;
  ensureStyle();
  const root = document.createElement('div'); root.id = 'lift-modal'; root.className = 'show';
  root.addEventListener('click', closeLiftPanel);
  const box = document.createElement('div'); box.className = 'lp-box';
  box.addEventListener('click', (e) => e.stopPropagation());
  const h = document.createElement('h3'); h.textContent = '🛗 어디로 갈까요?';
  const grid = document.createElement('div'); grid.className = 'lp-grid';
  for (const r of rows) {
    const pick = () => { closeLiftPanel(); onPick(r.f); };
    grid.append(button(r.open ? `B${r.f}` : '🔒', `지하 ${r.f}층`, r.deep ? 'deep' : '', pick, !r.open));
  }
  grid.append(button('✕', '닫기', 'lp-close', closeLiftPanel));
  box.append(h, grid); root.append(box);
  document.body.append(root);
  window.addEventListener('keydown', onKey, true);
}
