const THEME = {
  mudflat: { accent: '#b0683a', deep: '#6b3f22', ink: '#3b3530' },
  dive: { accent: '#2f86a8', deep: '#164e66', ink: '#173847' },
};

const CSS = `
.fr{position:fixed;inset:0;z-index:60;display:grid;place-items:center;container-type:size;color:var(--fr-ink);
  background:radial-gradient(120% 90% at 50% 40%,rgba(255,250,240,.25),rgba(20,30,40,.55));animation:fr-fade .35s ease-out both;-webkit-font-smoothing:antialiased}
.fr *{box-sizing:border-box}
.fr button{font:inherit;cursor:pointer;border:0}
.fr .fr-hand{font-family:'Gaegu','Jua',-apple-system,"Apple SD Gothic Neo",sans-serif}
.fr .fr-round{font-family:'Jua',-apple-system,"Apple SD Gothic Neo",sans-serif}
.fr .fr-num{font-family:'Baloo 2','Jua',sans-serif;font-weight:800;font-variant-numeric:tabular-nums}
@keyframes fr-fade{from{opacity:0}to{opacity:1}}
@keyframes fr-rise{from{opacity:0;transform:translateY(40px) scale(.94)}to{opacity:1;transform:none}}
@keyframes fr-slap{0%{opacity:0;transform:translateY(-14px) rotate(calc(var(--r) - 12deg)) scale(1.35)}100%{opacity:1;transform:rotate(var(--r)) scale(1)}}
.fr-book{position:relative;width:min(90cqw,400px);border-radius:10px 22px 22px 10px;padding:40px 22px 20px 44px;
  background:linear-gradient(90deg,transparent 30px,#f2a3a3 30px 32px,transparent 32px),repeating-linear-gradient(#fdfbf4 0 31px,#d7e6ee 31px 32px);
  background-color:#fdfbf4;box-shadow:-8px 0 0 0 var(--fr-accent),0 26px 50px rgba(20,20,30,.38);animation:fr-rise .5s ease-out both}
.fr-rings{position:absolute;left:-18px;top:30px;bottom:30px;width:30px;background:radial-gradient(circle at 15px 15px,#888 0 5px,transparent 6px) 0 0/30px 44px repeat-y}
.fr-tape{position:absolute;top:-14px;left:50%;transform:translateX(-50%) rotate(-3deg);padding:6px 22px;white-space:nowrap;font-size:15px;color:var(--fr-deep);
  background:color-mix(in srgb,var(--fr-accent) 45%,#fff 55%);clip-path:polygon(3% 0,97% 4%,100% 100%,0 96%)}
.fr-title{margin:0;font-weight:700;font-size:34px;line-height:32px;color:var(--fr-deep)}
.fr-sub{font-size:21px;line-height:32px;opacity:.75;margin:0 0 6px}
.fr-stickers{display:flex;flex-wrap:wrap;gap:34px 16px;padding:24px 0 4px}
.fr-st{--r:0deg;position:relative;width:72px;height:72px;border-radius:50%;background:#fff;display:grid;place-items:center;font-size:36px;
  box-shadow:0 0 0 4px #fff,0 3px 8px rgba(0,0,0,.22);opacity:0;animation:fr-slap .3s cubic-bezier(.3,1.5,.5,1) forwards}
.fr-c{position:absolute;right:-10px;top:-8px;font-weight:700;font-size:24px;color:var(--fr-deep);transform:rotate(8deg)}
.fr-n{position:absolute;bottom:-26px;left:-12px;right:-12px;text-align:center;font-size:18px}
.fr-st.fr-rare{background:#fff4c8}
.fr-rare-tag{position:absolute;top:-24px;left:50%;transform:translateX(-50%) rotate(-4deg);white-space:nowrap;font-size:12px;background:#ffd36a;color:#6b4a00;padding:2px 8px;border-radius:4px}
.fr-empty{font-size:20px;opacity:.6;padding:10px 0}
.fr-foot{display:flex;align-items:center;justify-content:space-between;margin-top:34px;font-size:22px}
.fr-foot .fr-num{font-size:28px;color:var(--fr-deep)}
.fr-sell{font-size:17px;opacity:.7;text-align:right}
.fr-btns{display:flex;gap:10px;margin-top:12px}
.fr-btns button{flex:1;height:50px;border-radius:14px;font-size:18px}
.fr-again{background:var(--fr-deep);color:#fff;transform:rotate(-1deg)}
.fr-home{background:#fff;color:var(--fr-deep);box-shadow:inset 0 0 0 2px var(--fr-deep);transform:rotate(1deg)}
@container (max-height:520px){
  .fr-book{width:min(92cqw,640px);padding:26px 22px 16px 44px}
  .fr-title{font-size:30px}.fr-sub{margin:0}
  .fr-stickers{flex-wrap:nowrap;gap:18px;padding:22px 0 0;overflow:visible}
  .fr-st{width:62px;height:62px;font-size:30px;flex:none}
  .fr-foot{margin-top:30px}
}
`;

function injectCss(doc) {
  if (doc.getElementById('fr-css')) return;
  const s = doc.createElement('style');
  s.id = 'fr-css';
  s.textContent = CSS;
  doc.head.appendChild(s);
}

const ROT = [-7, 5, -3, 8, -5, 4];

function el(doc, tag, cls, text) {
  const e = doc.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

function today() {
  const d = new Date();
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

function countUp(node, to, delay) {
  const start = performance.now() + delay, dur = 700;
  const tick = now => {
    const k = Math.max(0, Math.min(1, (now - start) / dur));
    node.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))).toLocaleString();
    if (k < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

export const RESULT_COPY = {
  mudflatTape: '갯벌 일지', diveTape: '잠수 일지', rare: '오늘의 대물', earned: '오늘 번 돈',
  sell: '팔면 🪙{0}', empty: '빈 바구니', again: '다시 하기', home: '마을로',
};

export function showForageResult(o, doc = document) {
  injectCss(doc);
  const theme = THEME[o.mode] || THEME.mudflat;
  const root = el(doc, 'div', 'fr');
  root.style.setProperty('--fr-accent', theme.accent);
  root.style.setProperty('--fr-deep', theme.deep);
  root.style.setProperty('--fr-ink', theme.ink);
  const book = el(doc, 'div', 'fr-book');
  book.appendChild(el(doc, 'div', 'fr-rings'));
  book.appendChild(el(doc, 'div', 'fr-tape fr-round', `${today()} ${o.mode === 'dive' ? RESULT_COPY.diveTape : RESULT_COPY.mudflatTape}`));
  book.appendChild(el(doc, 'h2', 'fr-title fr-hand', o.title));
  book.appendChild(el(doc, 'p', 'fr-sub fr-hand', o.sub));
  const stickers = el(doc, 'div', 'fr-stickers');
  o.items.forEach((it, i) => {
    const st = el(doc, 'div', 'fr-st' + (it.rare ? ' fr-rare' : ''));
    st.style.setProperty('--r', ROT[i % ROT.length] + 'deg');
    st.style.animationDelay = (300 + i * 160) + 'ms';
    if (it.rare) st.appendChild(el(doc, 'span', 'fr-rare-tag fr-round', RESULT_COPY.rare));
    st.appendChild(doc.createTextNode(it.ico));
    st.appendChild(el(doc, 'span', 'fr-c fr-hand', `×${it.count}`));
    st.appendChild(el(doc, 'span', 'fr-n fr-hand', it.name));
    stickers.appendChild(st);
  });
  if (!o.items.length) stickers.appendChild(el(doc, 'div', 'fr-empty fr-hand', RESULT_COPY.empty));
  book.appendChild(stickers);
  const foot = el(doc, 'div', 'fr-foot fr-hand');
  foot.appendChild(el(doc, 'span', null, RESULT_COPY.earned));
  const right = el(doc, 'span');
  right.appendChild(doc.createTextNode('🪙 '));
  const num = el(doc, 'span', 'fr-num', '0');
  right.appendChild(num);
  if (o.sellValue > 0) right.appendChild(el(doc, 'div', 'fr-sell', RESULT_COPY.sell.replace('{0}', o.sellValue)));
  foot.appendChild(right);
  book.appendChild(foot);
  const btns = el(doc, 'div', 'fr-btns fr-round');
  const home = el(doc, 'button', 'fr-home', RESULT_COPY.home);
  const again = el(doc, 'button', 'fr-again', RESULT_COPY.again);
  btns.appendChild(home);
  btns.appendChild(again);
  book.appendChild(btns);
  root.appendChild(book);
  doc.body.appendChild(root);
  countUp(num, o.coins, 300 + o.items.length * 160);
  const close = () => root.remove();
  home.onclick = () => { close(); o.onHome?.(); };
  again.onclick = () => { close(); o.onAgain?.(); };
  return { root, close };
}
