const CSS = `
#mq-mock{position:fixed;inset:0;z-index:40;pointer-events:none;font-family:inherit}
#mq-mock *{box-sizing:border-box}
.mq-a{position:absolute;transform:translate(-50%,0);display:flex;flex-direction:column;align-items:center;gap:6px}
.mq-a .card{background:rgba(255,253,246,.97);border-radius:16px;box-shadow:0 4px 14px rgba(30,60,40,.28);padding:8px 12px;min-width:190px;max-width:260px}
.mq-a .t{font-weight:800;color:#2f5a3a;font-size:14px;display:flex;gap:6px;align-items:center}
.mq-a .d{font-size:13px;color:#4a5a4f;margin-top:2px}
.mq-a .s{margin-top:6px;padding-top:6px;border-top:1px dashed #e3dccb;font-size:12.5px;color:#7a5a20;display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.mq-ad{pointer-events:auto;border:none;border-radius:999px;padding:4px 10px;font-weight:800;font-size:12px;background:#ece7ff;color:#4b3fa0;box-shadow:inset 0 0 0 1.5px #b9adf2;white-space:nowrap}
@property --mq-a{syntax:'<angle>';initial-value:0deg;inherits:false}
.mq-ad.shine{position:relative;border:2px solid transparent;padding:3px 11px;box-shadow:0 0 10px rgba(167,150,255,.55);background:linear-gradient(#f3f0ff,#f3f0ff) padding-box,conic-gradient(from var(--mq-a),#b9adf2,#fff7c2,#8fd8ff,#ffd1f0,#b9adf2) border-box;animation:mq-spin 2.4s linear infinite,mq-glow 1.6s ease-in-out infinite}
.mq-ad.shine::before,.mq-ad.shine::after{content:'✦';position:absolute;font-size:10px;color:#fff;text-shadow:0 0 4px #c9b8ff,0 0 8px #8fd8ff;animation:mq-twinkle 1.4s ease-in-out infinite}
.mq-ad.shine::before{left:-6px;top:-7px}
.mq-ad.shine::after{right:-5px;bottom:-7px;animation-delay:.7s}
@keyframes mq-spin{to{--mq-a:360deg}}
@keyframes mq-glow{50%{box-shadow:0 0 16px rgba(167,150,255,.85)}}
@keyframes mq-twinkle{0%,100%{opacity:0;transform:scale(.4) rotate(0)}50%{opacity:1;transform:scale(1.1) rotate(45deg)}}
@media(prefers-reduced-motion:reduce){.mq-ad.shine,.mq-ad.shine::before,.mq-ad.shine::after{animation:none}}
.mq-b{position:absolute;left:14px;top:var(--top,150px);width:min(300px,calc(100vw - 28px));background:rgba(255,253,246,.96);border-radius:18px;box-shadow:0 4px 16px rgba(30,60,40,.22);padding:10px 12px}
.mq-b .h{font-size:12px;color:#6b7a70;font-weight:700}
.mq-b .h b{color:#2f5a3a}
.mq-b ul{list-style:none;margin:6px 0 0;padding:0}
.mq-b li{font-size:13px;color:#4a5a4f;display:flex;gap:8px;align-items:flex-start;padding:3px 0}
.mq-b li i{font-style:normal;width:18px;height:18px;border-radius:50%;flex:none;display:grid;place-items:center;font-size:11px;background:#e9e4d6;color:#8a8a7a;margin-top:1px}
.mq-b li.done{color:#9aa59c;text-decoration:line-through}
.mq-b li.done i{background:#bfe8c9;color:#2f5a3a}
.mq-b li.now{color:#2f3b33;font-weight:800}
.mq-b li.now i{background:#88d7a0;color:#1d3a26}
.mq-b .s{margin-top:6px;background:#fff4dd;border-radius:12px;padding:7px 9px;font-size:12.5px;color:#7a5a20;display:flex;align-items:center;justify-content:space-between;gap:6px}
.mq-c{position:absolute;left:50%;transform:translateX(-50%);bottom:var(--bot,110px);display:flex;align-items:center;gap:10px;background:rgba(47,59,51,.92);color:#fff7ec;border-radius:999px;padding:7px 8px 7px 14px;box-shadow:0 4px 16px rgba(0,0,0,.3);max-width:calc(100vw - 24px)}
.mq-c .i{font-size:18px}
.mq-c .t{font-size:13.5px;font-weight:700;white-space:nowrap}
.mq-c .t small{display:block;font-weight:500;font-size:12px;color:#cfe9d6}
.mq-c .mq-ad{background:#7a6bd1;color:#fff;box-shadow:none}
.mq-hl{position:absolute;border-radius:14px;pointer-events:none}
.mq-hl.a{box-shadow:0 0 0 3px #88d7a0,0 0 0 7px rgba(136,215,160,.35)}
.mq-hl.b{box-shadow:0 0 0 3px #fff7ec,0 0 0 9999px rgba(20,30,24,.45)}
.mq-hl.c{box-shadow:0 0 0 3px #f2c14e}
.mq-tag{position:absolute;transform:translate(-50%,-100%);background:#f2c14e;color:#3d2c05;font-weight:800;font-size:12px;border-radius:10px;padding:3px 8px;white-space:nowrap}
.mq-tag::after{content:'';position:absolute;left:50%;bottom:-5px;margin-left:-5px;border:5px solid transparent;border-top-color:#f2c14e;border-bottom:0}
.mq-hand{position:absolute;font-size:26px}
`;

function root() {
  let r = document.getElementById('mq-mock');
  if (!r) {
    const st = document.createElement('style'); st.id = 'mq-css'; st.textContent = CSS; document.head.appendChild(st);
    r = document.createElement('div'); r.id = 'mq-mock'; document.body.appendChild(r);
  }
  return r;
}

export function clear() { const r = document.getElementById('mq-mock'); if (r) r.innerHTML = ''; }

function boxOf(el, pad = 4) {
  const b = el.getBoundingClientRect();
  return { left: b.left - pad, top: b.top - pad, width: b.width + pad * 2, height: b.height + pad * 2 };
}

function place(el, b) { Object.assign(el.style, { left: b.left + 'px', top: b.top + 'px', width: b.width + 'px', height: b.height + 'px' }); }

export function hint(v, s) {
  const r = root();
  const ad = s.ad ? `<button class="mq-ad${s.shine ? ' shine' : ''}">🎬 ${s.ad}</button>` : '';
  if (v === 'a') {
    const el = document.createElement('div');
    el.className = 'mq-a';
    el.style.left = s.x + 'px'; el.style.top = s.y + 'px';
    el.innerHTML = `<div class="card"><div class="t">${s.ico} ${s.title}</div><div class="d">${s.doNow}</div>${s.short ? `<div class="s">${s.short} ${ad}</div>` : ''}</div>`;
    r.appendChild(el);
  } else if (v === 'b') {
    const el = document.createElement('div');
    el.className = 'mq-b';
    el.style.setProperty('--top', (s.top || 150) + 'px');
    const items = s.steps.map((t, i) => `<li class="${i < s.at ? 'done' : i === s.at ? 'now' : ''}"><i>${i < s.at ? '✓' : i + 1}</i><span>${t}</span></li>`).join('');
    el.innerHTML = `<div class="h">${s.chapter} · <b>${s.at}/${s.steps.length}</b></div><ul>${items}</ul>${s.short ? `<div class="s"><span>${s.short}</span>${ad}</div>` : ''}`;
    r.appendChild(el);
  } else {
    const el = document.createElement('div');
    el.className = 'mq-c';
    el.style.setProperty('--bot', (s.bot || 110) + 'px');
    el.innerHTML = `<span class="i">${s.ico}</span><span class="t">${s.doNow}${s.short ? `<small>${s.short}</small>` : ''}</span>${ad}`;
    r.appendChild(el);
  }
}

export function highlight(v, el, label) {
  if (!el) return;
  const r = root();
  const b = boxOf(el);
  const hl = document.createElement('div');
  hl.className = 'mq-hl ' + v;
  place(hl, b);
  r.appendChild(hl);
  if (v === 'a') {
    const hand = document.createElement('div');
    hand.className = 'mq-hand'; hand.textContent = '👆';
    hand.style.left = (b.left + b.width * 0.55) + 'px'; hand.style.top = (b.top + b.height * 0.55) + 'px';
    r.appendChild(hand);
  }
  if (v === 'c' && label) {
    const tag = document.createElement('div');
    tag.className = 'mq-tag'; tag.textContent = label;
    tag.style.left = (b.left + b.width / 2) + 'px'; tag.style.top = (b.top - 6) + 'px';
    r.appendChild(tag);
  }
}
