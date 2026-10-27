export const CARD_NAMES = { 1: '바구니', 2: '영수증', 3: '수첩' };

const THEME = {
  mudflat: { accent: '#b0683a', deep: '#6b3f22', soft: '#f6e3cf', sky: '#f3d9b8', ink: '#4a2f1c' },
  dive: { accent: '#2f86a8', deep: '#164e66', soft: '#d8f0f6', sky: '#bfe6f2', ink: '#173847' },
};

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Jua&family=Gaegu:wght@400;700&family=Baloo+2:wght@600;800&display=swap');
.fr{position:fixed;inset:0;z-index:50;display:grid;place-items:center;font-family:'Jua',-apple-system,"Apple SD Gothic Neo",sans-serif;color:var(--ink);
  background:radial-gradient(120% 90% at 50% 40%,rgba(255,250,240,.25),rgba(20,30,40,.55));animation:fr-fade .35s ease-out both;-webkit-font-smoothing:antialiased}
.fr.inline{position:absolute}
.fr *{box-sizing:border-box}
.fr .num{font-family:'Baloo 2','Jua',sans-serif;font-weight:800;font-variant-numeric:tabular-nums}
.fr button{font:inherit;cursor:pointer;border:0}
@keyframes fr-fade{from{opacity:0}to{opacity:1}}
@keyframes fr-rise{from{opacity:0;transform:translateY(40px) scale(.94)}to{opacity:1;transform:none}}
@keyframes fr-drop{0%{opacity:0;transform:translateY(-60px) scale(.6)}60%{opacity:1;transform:translateY(6px) scale(1.06)}100%{opacity:1;transform:none}}
@keyframes fr-stamp{0%{opacity:0;transform:rotate(-14deg) scale(2.4)}70%{opacity:1;transform:rotate(-14deg) scale(.92)}100%{opacity:1;transform:rotate(-14deg) scale(1)}}
@keyframes fr-slap{0%{opacity:0;transform:translateY(-14px) rotate(calc(var(--r) - 12deg)) scale(1.35)}100%{opacity:1;transform:rotate(var(--r)) scale(1)}}
@keyframes fr-shine{0%,100%{box-shadow:0 0 0 3px #ffd36a,0 0 18px 4px rgba(255,211,106,.55)}50%{box-shadow:0 0 0 3px #fff2b8,0 0 30px 10px rgba(255,211,106,.8)}}
@keyframes fr-bob{0%,100%{transform:translateY(0) rotate(-4deg)}50%{transform:translateY(-6px) rotate(4deg)}}

.fr-d1 .card{position:relative;width:min(88vw,380px);background:#fffaf1;border-radius:30px;padding:76px 22px 20px;text-align:center;
  box-shadow:0 0 0 6px var(--soft),0 18px 0 -4px var(--accent),0 30px 60px rgba(30,20,10,.35);animation:fr-rise .5s cubic-bezier(.2,1.3,.4,1) both}
.fr-d1 .badge{position:absolute;left:50%;top:-52px;width:112px;height:112px;margin-left:-56px;border-radius:50%;background:var(--sky);
  display:grid;place-items:center;font-size:62px;box-shadow:0 0 0 6px #fffaf1,0 8px 0 0 var(--accent);animation:fr-bob 2.4s ease-in-out infinite}
.fr-d1 h2{margin:0;font-size:28px;font-weight:400;color:var(--deep);letter-spacing:-.5px}
.fr-d1 .sub{margin:4px 0 16px;font-size:15px;opacity:.7}
.fr-d1 .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(72px,1fr));gap:30px 10px;margin:0 0 26px}
.fr-d1 .tile{position:relative;aspect-ratio:1;border-radius:22px;background:var(--soft);display:grid;place-items:center;font-size:34px;
  box-shadow:inset 0 -5px 0 rgba(0,0,0,.07);animation:fr-drop .55s cubic-bezier(.3,1.4,.5,1) both}
.fr-d1 .tile.rare{background:#fff6d6;animation:fr-drop .55s cubic-bezier(.3,1.4,.5,1) both,fr-shine 1.6s ease-in-out infinite}
.fr-d1 .tile .cnt{position:absolute;right:-6px;bottom:-6px;min-width:30px;height:30px;padding:0 7px;border-radius:15px;background:var(--accent);color:#fff;
  font-size:16px;line-height:31px;box-shadow:0 0 0 3px #fffaf1}
.fr-d1 .tile .nm{position:absolute;bottom:-24px;left:-6px;right:-6px;font-size:13px;opacity:.75;white-space:nowrap}
.fr-d1 .coin{display:inline-flex;align-items:center;gap:8px;margin:0 0 18px;padding:6px 18px;border-radius:999px;background:#fff1c4;color:#7a5400;font-size:16px}
.fr-d1 .coin .num{font-size:24px}
.fr-d1 .btns{display:flex;gap:10px}
.fr-d1 .btns button{flex:1;height:52px;border-radius:18px;font-size:18px}
.fr-d1 .again{background:var(--accent);color:#fff;box-shadow:0 5px 0 var(--deep)}
.fr-d1 .again:active{transform:translateY(4px);box-shadow:0 1px 0 var(--deep)}
.fr-d1 .home{background:var(--soft);color:var(--deep);box-shadow:0 5px 0 rgba(0,0,0,.1)}
.fr-d1 .stats{margin-top:12px;font-family:-apple-system,sans-serif;font-size:11px;opacity:.4}

.fr-d2 .slip{position:relative;width:min(84vw,340px);background:#fffdf7;padding:30px 24px 26px;color:#3a332a;font-family:'Gaegu','Jua',sans-serif;
  animation:fr-rise .5s ease-out both;
  -webkit-mask:conic-gradient(from -45deg at bottom,#0000,#000 1deg 89deg,#0000 90deg) bottom/16px 51% repeat-x,conic-gradient(from 135deg at top,#0000,#000 1deg 89deg,#0000 90deg) top/16px 51% repeat-x;
  mask:conic-gradient(from -45deg at bottom,#0000,#000 1deg 89deg,#0000 90deg) bottom/16px 51% repeat-x,conic-gradient(from 135deg at top,#0000,#000 1deg 89deg,#0000 90deg) top/16px 51% repeat-x}
.fr-d2 .wrap{filter:drop-shadow(0 24px 30px rgba(20,20,10,.35))}
.fr-d2 .shop{text-align:center;font-family:'Jua',sans-serif;font-size:13px;letter-spacing:3px;color:var(--accent)}
.fr-d2 h2{margin:2px 0 0;text-align:center;font-family:'Jua',sans-serif;font-weight:400;font-size:26px;color:#2a241c}
.fr-d2 .date{text-align:center;font-size:16px;opacity:.55;margin-bottom:12px}
.fr-d2 .rule{border:0;border-top:2px dashed #cfc5b2;margin:10px 0}
.fr-d2 .row{display:grid;grid-template-columns:28px 1fr auto;align-items:center;gap:6px;font-size:21px;line-height:32px;height:32px;opacity:0;animation:fr-fade .25s ease-out forwards}
.fr-d2 .row .dots{display:flex;gap:6px;align-items:baseline}
.fr-d2 .row .dots::after{content:'';flex:1;border-bottom:2px dotted #d6ccb8;transform:translateY(-5px)}
.fr-d2 .row .x{font-size:16px;opacity:.6}
.fr-d2 .row.rare .nm{background:linear-gradient(transparent 55%,#ffe58a 55%)}
.fr-d2 .total{display:flex;justify-content:space-between;align-items:baseline;font-family:'Jua',sans-serif;font-size:20px}
.fr-d2 .total .num{font-size:30px;color:var(--deep)}
.fr-d2 .stamp{position:absolute;right:110px;bottom:118px;width:92px;height:92px;border-radius:50%;border:4px double #d84a3a;color:#d84a3a;display:grid;place-content:center;
  text-align:center;font-family:'Jua',sans-serif;font-size:17px;line-height:1.1;background:rgba(255,255,255,.4);mix-blend-mode:multiply;opacity:0;
  animation:fr-stamp .38s cubic-bezier(.5,1.6,.6,1) forwards}
.fr-d2 .stamp small{display:block;font-size:11px;letter-spacing:1px;margin-top:3px}
.fr-d2 .barcode{height:30px;margin:14px 20px 4px;background:repeating-linear-gradient(90deg,#2a241c 0 2px,transparent 2px 4px,#2a241c 4px 7px,transparent 7px 9px,#2a241c 9px 10px,transparent 10px 13px)}
.fr-d2 .thanks{text-align:center;font-size:17px;opacity:.6}
.fr-d2 .btns{display:flex;gap:8px;margin-top:14px}
.fr-d2 .btns button{flex:1;height:48px;border-radius:12px;font-family:'Jua',sans-serif;font-size:17px}
.fr-d2 .again{background:#2a241c;color:#fffdf7}
.fr-d2 .home{background:transparent;color:#2a241c;box-shadow:inset 0 0 0 2px #2a241c}
.fr-d2 .stats{margin-top:10px;text-align:center;font-family:-apple-system,sans-serif;font-size:11px;opacity:.4}

.fr-d3 .book{position:relative;width:min(90vw,400px);border-radius:10px 22px 22px 10px;padding:40px 22px 20px 44px;color:#3b3530;
  background:linear-gradient(90deg,transparent 30px,#f2a3a3 30px 32px,transparent 32px),repeating-linear-gradient(#fdfbf4 0 31px,#d7e6ee 31px 32px);
  background-color:#fdfbf4;box-shadow:-8px 0 0 0 var(--accent),0 26px 50px rgba(20,20,30,.38);animation:fr-rise .5s ease-out both}
.fr-d3 .rings{position:absolute;left:-18px;top:30px;bottom:30px;width:30px;background:radial-gradient(circle at 15px 15px,#888 0 5px,transparent 6px) 0 0/30px 44px repeat-y}
.fr-d3 .tape{position:absolute;top:-14px;left:50%;transform:translateX(-50%) rotate(-3deg);padding:6px 22px;background:color-mix(in srgb,var(--accent) 45%,#fff 55%);
  font-family:'Jua',sans-serif;font-size:15px;color:var(--deep);white-space:nowrap;clip-path:polygon(3% 0,97% 4%,100% 100%,0 96%)}
.fr-d3 h2{margin:0;font-family:'Gaegu',sans-serif;font-weight:700;font-size:34px;line-height:32px;color:var(--deep)}
.fr-d3 .sub{font-family:'Gaegu',sans-serif;font-size:21px;line-height:32px;opacity:.75;margin:0 0 6px}
.fr-d3 .stickers{display:flex;flex-wrap:wrap;gap:34px 16px;padding:24px 0 4px}
.fr-d3 .st{--r:0deg;position:relative;width:72px;height:72px;border-radius:50%;background:#fff;display:grid;place-items:center;font-size:36px;
  box-shadow:0 0 0 4px #fff,0 3px 8px rgba(0,0,0,.22);opacity:0;animation:fr-slap .3s cubic-bezier(.3,1.5,.5,1) forwards}
.fr-d3 .st .c{position:absolute;right:-10px;top:-8px;font-family:'Gaegu',sans-serif;font-weight:700;font-size:24px;color:var(--deep);transform:rotate(8deg)}
.fr-d3 .st .n{position:absolute;bottom:-26px;left:-12px;right:-12px;text-align:center;font-family:'Gaegu',sans-serif;font-size:18px}
.fr-d3 .st.rare{background:#fff4c8}
.fr-d3 .st.rare::before{content:'오늘의 대물';position:absolute;top:-24px;left:50%;transform:translateX(-50%) rotate(-4deg);white-space:nowrap;font-family:'Jua',sans-serif;font-size:12px;
  background:#ffd36a;color:#6b4a00;padding:2px 8px;border-radius:4px}
.fr-d3 .foot{display:flex;align-items:center;justify-content:space-between;margin-top:34px;font-family:'Gaegu',sans-serif;font-size:22px}
.fr-d3 .foot .num{font-size:28px;color:var(--deep)}
.fr-d3 .btns{display:flex;gap:10px;margin-top:12px}
.fr-d3 .btns button{flex:1;height:50px;border-radius:14px;font-family:'Jua',sans-serif;font-size:18px}
.fr-d3 .again{background:var(--deep);color:#fff;transform:rotate(-1deg)}
.fr-d3 .home{background:#fff;color:var(--deep);box-shadow:inset 0 0 0 2px var(--deep);transform:rotate(1deg)}
.fr-d3 .stats{margin-top:10px;font-family:-apple-system,sans-serif;font-size:11px;opacity:.4}
.fr{container-type:size}
@container (max-height:520px){
  .fr-d1 .card{width:min(92cqw,660px);padding:18px 22px 16px 150px;text-align:left}
  .fr-d1 .badge{left:22px;top:22px;margin:0;width:104px;height:104px;font-size:56px}
  .fr-d1 h2{font-size:24px}.fr-d1 .sub{margin:2px 0 10px}
  .fr-d1 .grid{grid-template-columns:repeat(6,62px);gap:26px 10px;margin:0 0 26px}
  .fr-d1 .tile{border-radius:18px;font-size:28px}
  .fr-d1 .coin{position:absolute;left:24px;top:140px;margin:0;padding:5px 14px}
  .fr-d1 .stats{display:none}
  .fr-d2 .slip{width:min(90cqw,600px);padding:16px 24px 18px}
  .fr-d2 .rows{display:grid;grid-template-columns:1fr 1fr;column-gap:26px}
  .fr-d2 .row{font-size:18px;line-height:26px;height:26px}
  .fr-d2 .stamp{bottom:62px;right:160px;width:74px;height:74px;font-size:14px}
  .fr-d2 .shop,.fr-d2 .barcode,.fr-d2 .thanks,.fr-d2 .stats{display:none}
  .fr-d2 h2{font-size:22px}
  .fr-d2 .date{font-size:14px;margin-bottom:0}
  .fr-d2 .rule{margin:6px 0}
  .fr-d2 .total{font-size:17px}.fr-d2 .total .num{font-size:24px}
  .fr-d2 .btns{margin-top:8px}.fr-d2 .btns button{height:42px}
  .fr-d3 .book{width:min(92cqw,640px);padding:26px 22px 16px 44px}
  .fr-d3 h2{font-size:30px}.fr-d3 .sub{margin:0}
  .fr-d3 .stickers{flex-wrap:nowrap;gap:18px;padding:22px 0 0}
  .fr-d3 .st{width:62px;height:62px;font-size:30px;flex:none}
  .fr-d3 .foot{margin-top:30px}
  .fr-d3 .stats{display:none}
}
@container (max-height:700px) and (min-height:521px){
  .fr-d1 .card{padding-top:62px}.fr-d1 .badge{width:92px;height:92px;top:-42px;margin-left:-46px;font-size:50px}
  .fr-d2 .slip{padding:22px 24px 20px}.fr-d2 .row{line-height:28px;height:28px;font-size:19px}.fr-d2 .barcode{height:20px;margin:10px 30px 2px}
  .fr-d2 .rule{margin:7px 0}.fr-d2 .date{margin-bottom:6px}.fr-d2 .stats{display:none}.fr-d2 .stamp{bottom:100px}
}
`;

function injectCss() {
  if (document.getElementById('fr-css')) return;
  const s = document.createElement('style'); s.id = 'fr-css'; s.textContent = CSS; document.head.appendChild(s);
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function countUp(el, to, delay) {
  if (!el) return;
  const start = performance.now() + delay, dur = 700;
  const tick = now => {
    const k = Math.max(0, Math.min(1, (now - start) / dur));
    el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))).toLocaleString();
    if (k < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
function today() { const d = new Date(); return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`; }
const stats = o => o.stats ? `<div class="stats">${esc(o.stats)}</div>` : '';
const btns = '<div class="btns"><button class="home">마을로</button><button class="again">다시 하기</button></div>';

function design1(o, coins) {
  const tiles = o.items.map((it, i) => `<div class="tile${it.rare ? ' rare' : ''}" style="animation-delay:${200 + i * 110}ms"><span>${it.ico}</span><span class="cnt num">${it.count}</span><span class="nm">${esc(it.name)}</span></div>`).join('');
  return `<div class="card"><div class="badge">${o.mode === 'dive' ? '🤿' : '🧺'}</div>
    <h2>${esc(o.title)}</h2><p class="sub">${esc(o.sub)}</p>
    <div class="grid">${tiles}</div>
    <div class="coin">🪙 <span class="num" data-count="${coins}">0</span></div>${btns}${stats(o)}</div>`;
}
function design2(o, coins, total) {
  const rows = o.items.map((it, i) => `<div class="row${it.rare ? ' rare' : ''}" style="animation-delay:${250 + i * 140}ms"><span>${it.ico}</span><span class="dots"><span class="nm">${esc(it.name)}</span></span><span><span class="x">×${it.count}</span> <span class="num">🪙${it.count * it.coin}</span></span></div>`).join('');
  const stampDelay = 500 + o.items.length * 140;
  return `<div class="wrap"><div class="slip"><div class="shop">${o.mode === 'dive' ? '고요한 숲 앞바다' : '고요한 숲 갯벌'}</div>
    <h2>${esc(o.title)}</h2><div class="date">${today()} · ${total}개</div>
    <hr class="rule"><div class="rows">${rows}</div><hr class="rule">
    <div class="total"><span>합계</span><span>🪙 <span class="num" data-count="${coins}">0</span></span></div>
    <div class="stamp" style="animation-delay:${stampDelay}ms">참 잘했<br>어요<small>${o.mode === 'dive' ? 'DIVE' : 'MUD'}</small></div>
    <div class="barcode"></div><div class="thanks">${esc(o.sub)}</div>${btns}${stats(o)}</div></div>`;
}
function design3(o, coins) {
  const rot = [-7, 5, -3, 8, -5, 4];
  const st = o.items.map((it, i) => `<div class="st${it.rare ? ' rare' : ''}" style="--r:${rot[i % rot.length]}deg;animation-delay:${300 + i * 160}ms">${it.ico}<span class="c">×${it.count}</span><span class="n">${esc(it.name)}</span></div>`).join('');
  return `<div class="book"><div class="rings"></div><div class="tape">${today()} ${o.mode === 'dive' ? '잠수 일지' : '갯벌 일지'}</div>
    <h2>${esc(o.title)}</h2><p class="sub">${esc(o.sub)}</p>
    <div class="stickers">${st}</div>
    <div class="foot"><span>오늘 번 돈</span><span>🪙 <span class="num" data-count="${coins}">0</span></span></div>${btns}${stats(o)}</div>`;
}

export function showResult(o) {
  injectCss();
  const items = [...(o.items || [])].sort((a, b) => (b.rare ? 1 : 0) - (a.rare ? 1 : 0) || b.coin - a.coin);
  const opts = { ...o, items };
  const coins = items.reduce((a, it) => a + it.count * (it.coin || 0), 0);
  const total = items.reduce((a, it) => a + it.count, 0);
  const d = [1, 2, 3].includes(o.design) ? o.design : 3;
  const root = document.createElement('div');
  root.className = `fr fr-d${d}` + (o.container ? ' inline' : '');
  Object.entries(THEME[o.mode] || THEME.mudflat).forEach(([k, v]) => root.style.setProperty('--' + k, v));
  root.innerHTML = (d === 1 ? design1 : d === 2 ? design2 : design3)(opts, coins, total);
  (o.container || document.body).appendChild(root);
  countUp(root.querySelector('[data-count]'), coins, 300 + items.length * 140);
  root.querySelector('.again').onclick = () => (o.onAgain ? o.onAgain() : root.remove());
  root.querySelector('.home').onclick = () => (o.onHome ? o.onHome() : root.remove());
  return root;
}
