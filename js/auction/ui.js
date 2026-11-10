import { BID_INCS, COUNT_START } from '../data/auction.js';

export const AUCTION_COPY = Object.freeze({
  title: '🔨 오늘의 경매', ready: '오늘의 경매품이 나왔어요',
  join: '🔔 경매 참가하기', watch: '👀 구경만 하기', startsAt: '시작가 🪙{0}',
  first: '시작가예요', leadMe: '🙋 지금 1등', leadOther: '{0} 1등', mine: '🙋 내 입찰',
  win: '{0} 낙찰!', stored: '🧺 보관함에 넣었어요', lose: '{0}에게 낙찰', unsold: '유찰됐어요',
  closed: '🔨 경매는 저녁에 열려요', over: '🔨 오늘 경매 끝', close: '닫기',
});

const fill = (s, v) => s.replace('{0}', v);

export function whoLine(leader, names, t) {
  if (!leader) return t(AUCTION_COPY.first);
  if (leader === 'me') return t(AUCTION_COPY.leadMe);
  return fill(t(AUCTION_COPY.leadOther), t(names[leader]));
}

export function feedLine(f, names, t) {
  const who = f.who === 'me' ? t(AUCTION_COPY.mine) : t(names[f.who]);
  return `${who} +${f.inc} → 🪙${f.price}`;
}

export function resultLine(r, itemName, names, t) {
  if (r.outcome === 'win') return { title: fill(t(AUCTION_COPY.win), t(itemName)), sub: t(AUCTION_COPY.stored) };
  if (r.outcome === 'none' || !r.leader) return { title: t(AUCTION_COPY.unsold), sub: '' };
  return { title: fill(t(AUCTION_COPY.lose), t(names[r.leader])), sub: `🪙${r.price}` };
}

export function barColor(t) { return t > 4 ? '#8fd3a0' : t > 2 ? '#f2c14e' : '#e8774a'; }

const CSS = `#auction-modal{position:fixed;z-index:40;display:none;left:10px;right:10px;bottom:calc(12px + env(safe-area-inset-bottom));flex-direction:column;gap:9px;background:#fffaf2;border-radius:20px;box-shadow:0 -8px 40px rgba(30,25,20,.35);padding:12px 14px;color:#2b2b30;user-select:none;-webkit-tap-highlight-color:transparent;font-family:inherit}
#auction-modal.show{display:flex}
#auction-modal .au-head{font-weight:800;font-size:15px}
#auction-modal .au-item{display:flex;align-items:center;gap:10px;padding:6px 10px;border-radius:14px;background:#fff}
#auction-modal .au-item img{width:46px;height:46px;border-radius:10px;background:#f4ead6;flex:none}
#auction-modal .au-item .nm{font-weight:800;font-size:14px;min-width:0}
#auction-modal .au-big{text-align:center}
#auction-modal .au-p{font-size:30px;font-weight:900;letter-spacing:-.02em;color:#2d4a3a;display:inline-block}
#auction-modal .au-p.bump{animation:au-bump .18s}
@keyframes au-bump{50%{transform:scale(1.15)}}
#auction-modal .au-who{font-size:13px;font-weight:700;color:#4a4e57;min-height:1.3em}
#auction-modal .au-tbar{height:9px;border-radius:6px;background:#ece6dc;overflow:hidden}
#auction-modal .au-tbar i{display:block;height:100%;width:100%;background:#8fd3a0;transition:background .25s}
#auction-modal .au-call{text-align:center;font-size:14px;font-weight:900;min-height:1.3em;color:#a0521f}
#auction-modal .au-call.flash{animation:au-flash .5s}
@keyframes au-flash{0%{transform:scale(1.3)}100%{transform:none}}
#auction-modal .au-feed{display:flex;flex-direction:column;gap:3px;min-height:38px}
#auction-modal .au-feed div{font-size:12px;font-weight:700;padding:3px 8px;border-radius:8px;background:#fff}
#auction-modal .au-feed div.new{animation:au-in .25s}
#auction-modal .au-feed div.me{background:#e5f6e9}
#auction-modal .au-feed div:nth-child(n+3){display:none}
@keyframes au-in{from{transform:translateY(-6px);opacity:0}}
#auction-modal .au-btns{display:flex;gap:8px}
#auction-modal .au-btn{flex:1;min-height:46px;border:0;border-radius:12px;padding:10px;font-family:inherit;font-weight:800;font-size:15px;color:#2b2b30;background:#efe6d8;cursor:pointer;white-space:nowrap}
#auction-modal .au-btn.main{background:#e2b23c}
#auction-modal .au-btn:disabled{background:#e6e1d8;color:#8a8f99;cursor:default}
#auction-modal .au-btn:active:not(:disabled){transform:scale(.96)}
#auction-modal .au-hint{font-size:13px;font-weight:700;color:#4a4e57;text-align:center}
#auction-modal .au-res{text-align:center}
#auction-modal .au-res img{width:54px;height:54px;border-radius:12px}
#auction-modal .au-res .t{font-size:17px;font-weight:900;margin:4px 0}
#auction-modal .au-res .d{font-size:13px;color:#4a4e57;min-height:1.2em}
@media (min-width:768px){#auction-modal{left:auto;right:14px;top:calc(14px + var(--top-inset,0px));bottom:14px;width:300px;justify-content:center;border-radius:20px;box-shadow:0 8px 32px rgba(30,25,20,.25)}#auction-modal .au-feed{min-height:58px}#auction-modal .au-feed div:nth-child(n+3){display:block;opacity:.55}}`;

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function createAuctionUi({ t, names, itemName, itemThumb, onJoin, onBid, onClose }) {
  let root = null, body = null, mode = 'bid', view = null, itemId = '', layout = '', lastPrice = null, lastSig = '', lastCall = '';

  const ensure = () => {
    if (root) return;
    if (!document.getElementById('auction-style')) {
      const style = document.createElement('style');
      style.id = 'auction-style';
      style.textContent = CSS;
      document.head.appendChild(style);
    }
    root = document.createElement('div');
    root.id = 'auction-modal';
    root.innerHTML = '<div class="au-head"></div><div class="au-item"></div><div class="au-body"></div>';
    body = root.querySelector('.au-body');
    root.addEventListener('click', e => {
      const el = e.target.closest('[data-act],[data-inc]');
      if (!el || el.disabled) return;
      if (el.dataset.inc) { onBid(+el.dataset.inc); return; }
      if (el.dataset.act === 'close') { close(); onClose(); return; }
      if (el.dataset.act === 'bid' || el.dataset.act === 'watch') { mode = el.dataset.act; onJoin(mode); }
    });
    document.body.appendChild(root);
  };

  const btn = (act, label, main) => `<button class="au-btn${main ? ' main' : ''}" data-act="${act}">${esc(t(label))}</button>`;
  const setBody = (name, html) => { layout = name; body.innerHTML = html; lastPrice = null; lastSig = ''; lastCall = ''; };
  const setItem = id => {
    itemId = id;
    root.querySelector('.au-item').innerHTML = `<img src="${esc(itemThumb(id))}" alt=""><div class="nm">${esc(t(itemName(id)))}</div>`;
  };

  const drawWaiting = v => {
    const hint = v.mode === 'watch' ? fill(t(AUCTION_COPY.startsAt), v.start) : t(AUCTION_COPY.ready);
    const btns = v.mode === 'watch' ? btn('watch', AUCTION_COPY.watch, true) : btn('bid', AUCTION_COPY.join, true) + btn('watch', AUCTION_COPY.watch, false);
    setBody('wait', `<div class="au-hint">${esc(hint)}</div><div class="au-btns">${btns}</div>`);
  };
  const drawRun = () => {
    const incs = mode === 'watch' ? '' : `<div class="au-btns">${BID_INCS.map((n, i) => `<button class="au-btn${i === BID_INCS.length - 1 ? ' main' : ''}" data-inc="${n}">+${n}</button>`).join('')}</div>`;
    setBody('run', `<div class="au-big"><div class="au-p"></div><div class="au-who"></div></div><div class="au-tbar"><i></i></div><div class="au-call"></div><div class="au-feed"></div>${incs}`);
  };
  const drawResult = r => {
    const line = resultLine(r, itemName(itemId), names, t);
    const img = r.outcome === 'win' ? `<img src="${esc(itemThumb(itemId))}" alt="">` : '';
    setBody('done', `<div class="au-res">${img}<div class="t">${esc(line.title)}</div><div class="d">${esc(line.sub)}</div></div><div class="au-btns">${btn('close', AUCTION_COPY.close, true)}</div>`);
  };

  const syncFeed = feed => {
    const sig = feed.map(f => `${f.who}${f.inc}${f.price}`).join('|');
    if (sig === lastSig) return;
    const fresh = lastSig === '' ? 0 : 1;
    lastSig = sig;
    body.querySelector('.au-feed').innerHTML = feed.map((f, i) => `<div class="${f.who === 'me' ? 'me' : ''}${i < fresh ? ' new' : ''}">${esc(feedLine(f, names, t))}</div>`).join('');
  };

  function open(v) {
    ensure();
    view = v;
    mode = v.mode;
    setItem(v.itemId);
    root.querySelector('.au-head').textContent = t(AUCTION_COPY.title);
    if (v.mode === 'closed') setBody('closed', `<div class="au-hint">${esc(t(AUCTION_COPY.closed))}</div><div class="au-btns">${btn('close', AUCTION_COPY.close, true)}</div>`);
    else if (v.mode === 'done') setBody('over', `<div class="au-hint">${esc(t(AUCTION_COPY.over))}</div><div class="au-btns">${btn('close', AUCTION_COPY.close, true)}</div>`);
    else drawWaiting(v);
    root.classList.add('show');
    document.body.classList.add('menu-open', 'mg-open');
  }

  function render(state) {
    if (!root || !view) return;
    if (state.itemId && state.itemId !== itemId) setItem(state.itemId);
    if (state.phase === 'done') {
      if (layout !== 'done') drawResult(state.result);
      return;
    }
    if (layout !== 'run') drawRun();
    const p = body.querySelector('.au-p');
    if (lastPrice !== state.price) {
      p.textContent = `🪙${state.price}`;
      if (lastPrice !== null) { p.classList.remove('bump'); void p.offsetWidth; p.classList.add('bump'); }
      lastPrice = state.price;
    }
    body.querySelector('.au-who').textContent = whoLine(state.leader, names, t);
    const bar = body.querySelector('.au-tbar i');
    bar.style.width = `${Math.max(0, Math.min(1, state.t / COUNT_START)) * 100}%`;
    bar.style.background = barColor(state.t);
    const call = body.querySelector('.au-call');
    if (state.call !== lastCall) {
      lastCall = state.call;
      call.textContent = state.call;
      if (state.call.startsWith('⏱️')) { call.classList.remove('flash'); void call.offsetWidth; call.classList.add('flash'); }
    }
    syncFeed(state.feed);
    body.querySelectorAll('[data-inc]').forEach(b => { b.disabled = !state.canBid[b.dataset.inc]; });
  }

  function close() {
    if (!root) return;
    root.classList.remove('show');
    document.body.classList.remove('menu-open', 'mg-open');
  }

  return { open, render, close, isOpen: () => !!root && root.classList.contains('show') };
}
