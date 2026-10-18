import { renderRewardThumbs } from './thumbs.js';

const CSS = `
#hw-arrive-modal,#hw-stall-modal{position:fixed;inset:0;z-index:46;display:none;place-items:center;background:rgba(30,20,60,.55)}
#hw-arrive-modal.show,#hw-stall-modal.show{display:grid}
.hw-card{width:min(380px,92vw);max-height:calc(100dvh - 24px);overflow:auto;background:#fffaf2;border-radius:18px;padding:20px 16px 14px;box-shadow:0 10px 30px rgba(20,10,40,.35);color:#4a3f55}
.hw-card h2{margin:0 0 4px;font-size:19px;text-align:center}
.hw-sub{margin:0 0 10px;font-size:13px;opacity:.78;text-align:center;line-height:1.45}
.hw-list{list-style:none;margin:0 0 10px;padding:0;display:grid;gap:7px}
.hw-list li{background:#f3eefb;border-radius:12px;padding:8px 12px;font-size:14px}
.hw-gift{background:#fff1d6;border-radius:12px;padding:9px 12px;font-weight:700;text-align:center;margin-bottom:10px;color:#8a4a10}
.hw-btn{display:block;width:100%;border:0;border-radius:12px;padding:12px;font-weight:700;font-size:15px;background:#6b4a9a;color:#fff;cursor:pointer}
.hw-btn.buy{background:#e8822e}.hw-btn.off{background:#e7e0ec;color:#8a7f95}
.hw-bal{display:inline-block;background:#2e2440;color:#fff;border-radius:999px;padding:5px 12px;font-weight:700;font-size:13px}
.hw-tabs{display:flex;gap:6px;justify-content:center;margin:10px 0 2px}
.hw-tabs button{border:0;border-radius:999px;padding:6px 12px;font-size:13px;font-weight:700;background:#efe8f6;color:#6b4a9a;cursor:pointer}
.hw-tabs button.on{background:#6b4a9a;color:#fff}
.hw-tiles{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:10px 0}
.hw-tile{border-radius:14px;background:#f7f2fb;padding:9px 5px 7px;text-align:center;position:relative;border:2px solid transparent;cursor:pointer}
.hw-tile.sel{border-color:#e8822e;background:#fff3e6}
.hw-tile img,.hw-tile .ico{width:64px;height:64px;margin:0 auto 3px;display:grid;place-items:center;font-size:34px;border-radius:12px;background:radial-gradient(#fff,#ece3f6)}
.hw-tile b{display:block;font-size:12px}.hw-tile .c{font-size:13px;font-weight:700;color:#c4631b}
.hw-tile .own{position:absolute;top:5px;right:5px;font-size:10px;background:#6b4a9a;color:#fff;border-radius:999px;padding:1px 6px}
.hw-row{display:flex;gap:8px;margin-top:8px}.hw-row .hw-btn{flex:1}
.hw-row .hw-x{flex:0 0 auto;width:auto;padding:12px 14px;background:#eef2ee;color:#4a5a4f}
@media (max-height:420px){.hw-card{padding:12px 14px 10px}.hw-tile img,.hw-tile .ico{width:48px;height:48px;font-size:26px}.hw-sub{margin-bottom:4px}}
`;

const $ = (id) => document.getElementById(id);

function mount() {
  if ($('hw-arrive-modal')) return;
  const st = document.createElement('style'); st.textContent = CSS; document.head.append(st);
  const a = document.createElement('div'); a.id = 'hw-arrive-modal';
  a.innerHTML = `<div class="hw-card"><h2>👻 꼬마 유령 숨바꼭질</h2>
    <p class="hw-sub">정원 곳곳에 꼬마 유령 3마리가 숨었어요. 찾으면 🍬 사탕을 줘요. 숨는 자리는 매일 바뀌어요.</p>
    <ul class="hw-list"><li>🪦 묘비 뒤, 울타리 옆, 나무 밑을 살펴봐요</li><li>🍬 가운데 좌판에서 사탕을 장식으로 바꿔요</li><li>🎃 11/2까지 열려요</li></ul>
    <div class="hw-gift">🎁 첫 방문 선물 · 🍬 4</div><button class="hw-btn" id="hw-arrive-ok">알겠어요</button></div>`;
  const s = document.createElement('div'); s.id = 'hw-stall-modal';
  s.innerHTML = `<div class="hw-card"><h2>🍬 사탕 좌판</h2><p class="hw-sub">모은 사탕을 할로윈 장식으로 바꿔 가요. 11/2까지 열려요.</p>
    <div style="text-align:center"><span class="hw-bal" id="hw-bal"></span></div>
    <div class="hw-tabs"><button data-tab="decor" class="on">🎃 한정 장식</button><button data-tab="bundle">🧺 생활 꾸러미</button></div>
    <div class="hw-tiles" id="hw-tiles"></div>
    <div class="hw-row"><button class="hw-btn buy" id="hw-buy"></button><button class="hw-btn hw-x" id="hw-close">닫기</button></div></div>`;
  document.body.append(a, s);
}

export function showArriveCard(onOk) {
  mount();
  const m = $('hw-arrive-modal');
  $('hw-arrive-ok').onclick = () => { m.classList.remove('show'); onOk?.(); };
  m.classList.add('show');
}

let stall = null;

export function isStallOpen() { return !!$('hw-stall-modal')?.classList.contains('show'); }

export function closeStall() { $('hw-stall-modal')?.classList.remove('show'); stall = null; }

function render() {
  const { view, tab, sel } = stall, thumbs = renderRewardThumbs();
  $('hw-bal').textContent = `내 사탕 🍬 ${view.candy}`;
  document.querySelectorAll('#hw-stall-modal .hw-tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  const items = view.items.filter(r => r.tab === tab);
  $('hw-tiles').innerHTML = items.map(r => {
    const art = thumbs[r.id] ? `<img src="${thumbs[r.id]}" alt="">` : `<span class="ico">${r.ico}</span>`;
    const tag = r.tab === 'decor' ? (r.owned ? `<span class="own">${r.owned}개 있음</span>` : '') : `<span class="own">오늘 ${r.usedToday}/2</span>`;
    return `<div class="hw-tile ${r.id === sel ? 'sel' : ''}" data-id="${r.id}">${tag}${art}<b>${r.name}</b><span class="c">🍬 ${r.cost}</span></div>`;
  }).join('');
  $('hw-tiles').querySelectorAll('.hw-tile').forEach(el => { el.onclick = () => { stall.sel = el.dataset.id; render(); }; });
  const cur = items.find(r => r.id === sel);
  const buy = $('hw-buy');
  if (!cur) { buy.textContent = '장식을 골라 주세요'; buy.className = 'hw-btn off'; return; }
  const need = cur.cost - view.candy, capped = cur.tab === 'bundle' && cur.usedToday >= 2;
  buy.textContent = capped ? '오늘은 2번까지 바꿀 수 있어요' : need > 0 ? `사탕이 ${need}개 더 필요해요` : `${cur.ico} ${cur.name} · 🍬 ${cur.cost}개로 바꾸기`;
  buy.className = `hw-btn ${capped || need > 0 ? 'off' : 'buy'}`;
}

export function openStall(view, onExchange) {
  mount();
  stall = { view, tab: 'decor', sel: view.items.find(r => r.tab === 'decor')?.id, onExchange };
  document.querySelectorAll('#hw-stall-modal .hw-tabs button').forEach(b => {
    b.onclick = () => { stall.tab = b.dataset.tab; stall.sel = stall.view.items.find(r => r.tab === stall.tab)?.id; render(); };
  });
  $('hw-buy').onclick = () => {
    if (!stall?.sel || $('hw-buy').classList.contains('off')) return;
    const r = stall.onExchange(stall.sel);
    if (r?.view) stall.view = r.view;
    render();
  };
  $('hw-close').onclick = closeStall;
  render();
  $('hw-stall-modal').classList.add('show');
}
