// js/plaza/ui.js
// =============================================================
//  🌾 광장 모달(기부함·좌판·명판). DOM 은 전부 textContent — 영어는 i18n 옵저버가 번역한다.
//  🎨 디자인 게이트 C(검수 대기): ?plazaUi=a|b|c 로 레이아웃 3안 전환
//    a: 세로 목록(한 줄 = 아이콘·이름·진행 바·보유·버튼 3개)
//    b: 품목 카드 2열 그리드(큰 진행 바 + 버튼)
//    c: 위에 단계 전체 진행 바 + 아래 간소화 목록(버튼 +5 · 있는 만큼)
//  모달 루트 id 가 '-modal' 로 끝나야 index.html anyModalOpen() 이 잡는다.
// =============================================================
import { Input } from '../game.js';
import { PLAZA_ITEMS } from '../data/plaza.js';
import { currentItems, donateMax, nextTier } from './rules.js';
import { PLAZA_COPY, fill, subtitleText, nextTierText, tierLabel, stagePct } from './copy.js';

const LAYOUT = (() => {
  const v = new URLSearchParams(location.search).get('plazaUi');
  return v && /^[abc]$/.test(v) ? v : 'a';
})();
const STEPS = LAYOUT === 'c' ? [5, 0] : [1, 5, 0];   // 0 = 있는 만큼
const BTN_LABEL = { 1: PLAZA_COPY.buttons[0], 5: PLAZA_COPY.buttons[1], 0: PLAZA_COPY.buttons[2] };

const CSS = `
#plaza-modal { position: fixed; inset: 0; z-index: 33; display: none; place-items: center; background: rgba(20,40,30,0.55); }
#plaza-modal.show { display: grid; }
#plaza-modal .tut-card { display: flex; flex-direction: column; text-align: left; width: min(440px, 92vw); box-sizing: border-box;
  max-height: calc(100dvh - 24px - var(--top-inset, 0px)); overflow: hidden; padding: 20px 18px 16px; }
#plaza-modal[data-layout="b"] .tut-card { width: min(520px, 94vw); }
#plaza-modal .tut-card > * { flex: 0 0 auto; }
#plaza-modal h2 { text-align: center; margin: 2px 0 4px; font-size: 19px; }
.pz-sub { text-align: center; font-size: 13px; opacity: .75; margin: 0 0 10px; }
.pz-me { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; margin-bottom: 10px; }
.pz-chip { font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 999px; background: #f2f6f0; }
.pz-chip.warm { background: #fdf0d8; color: #7a4a14; }
.pz-note { text-align: center; font-size: 13px; font-weight: 700; padding: 8px 10px; border-radius: 10px; background: #fdf0d8; color: #7a4a14; margin-bottom: 10px; }
.pz-list { flex: 1 1 auto !important; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; }
.pz-bar { height: 8px; border-radius: 999px; background: #e3e9e1; overflow: hidden; }
.pz-bar > i { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #f0b44c, #e07a36); }
.pz-done .pz-bar > i { background: #7fc98a; }
.pz-num { font-size: 12px; font-weight: 700; font-variant-numeric: tabular-nums; opacity: .8; white-space: nowrap; }
.pz-have { font-size: 12px; opacity: .7; font-variant-numeric: tabular-nums; white-space: nowrap; }
.pz-btns { display: flex; gap: 5px; }
.pz-btns button { border: 0; border-radius: 10px; padding: 7px 10px; font-weight: 700; font-size: 13px; cursor: pointer; background: #e6efe4; color: #22412c; white-space: nowrap; }
.pz-btns button.max { background: #7fc98a; color: #15321f; }
.pz-btns button[disabled] { background: #e4e7e3; color: #a3aaa2; cursor: default; }
.pz-name { font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
/* a — 세로 목록 */
.pz-a { display: grid; grid-template-columns: 30px minmax(0, 1fr) auto; grid-template-areas: "ico info btns"; align-items: center; gap: 4px 8px; padding: 8px 10px; border-radius: 12px; background: #f2f6f0; }
.pz-a .pz-ico { grid-area: ico; font-size: 22px; text-align: center; }
.pz-a .pz-info { grid-area: info; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.pz-a .pz-top { display: flex; justify-content: space-between; gap: 6px; align-items: center; }
.pz-a .pz-top > .pz-bar { flex: 1 1 auto; }
.pz-a .pz-btns { grid-area: btns; }
@media (max-width: 460px) {
  .pz-a { grid-template-areas: "ico info" "btns btns"; grid-template-columns: 30px minmax(0, 1fr); }
  .pz-a .pz-btns button { flex: 1 1 0; }
}
/* b — 카드 2열 */
.pz-list.pz-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; align-content: start; }
.pz-b { display: flex; flex-direction: column; gap: 6px; padding: 10px; border-radius: 14px; background: #f2f6f0; min-width: 0; }
.pz-b .pz-head { display: flex; align-items: center; gap: 6px; min-width: 0; }
.pz-b .pz-ico { font-size: 26px; }
.pz-b .pz-bar { height: 14px; }
.pz-b .pz-foot { display: flex; justify-content: space-between; gap: 4px; }
.pz-b .pz-btns { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; }
.pz-b .pz-btns button { padding: 7px 4px; }
.pz-b .pz-btns button.max { grid-column: 1 / -1; }
/* c — 단계 바 + 간소화 목록 */
.pz-stage { padding: 10px 12px; border-radius: 14px; background: #fdf6e3; margin-bottom: 10px; }
.pz-stage .pz-bar { height: 18px; }
.pz-stage .pz-top { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px; font-weight: 800; }
.pz-stage .pz-pct { font-size: 20px; color: #b85a1f; font-variant-numeric: tabular-nums; }
.pz-c { display: grid; grid-template-columns: 26px minmax(0, 1fr) auto; align-items: center; gap: 2px 8px; padding: 6px 10px; border-radius: 12px; background: #f2f6f0; }
.pz-c .pz-ico { font-size: 20px; text-align: center; }
.pz-c .pz-info { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.pz-c .pz-top { display: flex; gap: 6px; align-items: baseline; justify-content: space-between; }
.pz-c .pz-bar { height: 5px; }
#plaza-modal .dm-actions { justify-content: center; margin-top: 12px; }
@media (max-height: 640px) {
  #plaza-modal .tut-card { padding: 12px 14px 10px; }
  #plaza-modal h2 { font-size: 16px; margin: 0 0 2px; }
  .pz-sub { margin-bottom: 6px; }
}
`;

let root = null, card = null;

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

function ensureRoot() {
  if (root) return;
  if (!document.getElementById('plaza-style')) {
    const s = el('style'); s.id = 'plaza-style'; s.textContent = CSS; document.head.appendChild(s);
  }
  root = el('div'); root.id = 'plaza-modal'; root.dataset.layout = LAYOUT;
  card = el('div', 'tut-card');
  root.appendChild(card);
  root.addEventListener('click', (e) => { if (e.target === root) closePlazaModal(); });
  document.body.appendChild(root);
}

function bar(have, need) {
  const b = el('div', 'pz-bar'), i = el('i');
  i.style.width = `${need > 0 ? Math.min(100, (have / need) * 100) : 0}%`;
  b.appendChild(i);
  return b;
}

// 버튼 활성 = donateMax(보유, 오늘 남은 수, 품목 남은 수) ≥ 수량('있는 만큼'은 ≥1). busy·내 기록 없음이면 전부 비활성
function buttons(ctx, row) {
  const wrap = el('div', 'pz-btns');
  const max = ctx.mine ? donateMax(ctx.inv?.[row.item] || 0, ctx.mine.today_left ?? 0, row.need - row.have) : 0;
  for (const q of STEPS) {
    const b = el('button', q === 0 ? 'max' : '', BTN_LABEL[q]);
    b.disabled = !!ctx.busy || max < (q || 1);
    b.onclick = () => ctx.onDonate?.(row.item, q || max);
    wrap.appendChild(b);
  }
  return wrap;
}

const haveText = (ctx, item) => `🎒 ${ctx.inv?.[item] || 0}`;
const rowClass = (base, row) => base + (row.have >= row.need ? ' pz-done' : '');

function rowA(ctx, row, it) {
  const r = el('div', rowClass('pz-a', row));
  const info = el('div', 'pz-info'), top = el('div', 'pz-top'), bottom = el('div', 'pz-top');
  top.append(el('span', 'pz-name', it.name), el('span', 'pz-num', `${row.have}/${row.need}`));
  bottom.append(bar(row.have, row.need), el('span', 'pz-have', haveText(ctx, row.item)));
  info.append(top, bottom);
  r.append(el('div', 'pz-ico', it.ico), info, buttons(ctx, row));
  return r;
}

function rowB(ctx, row, it) {
  const r = el('div', rowClass('pz-b', row));
  const head = el('div', 'pz-head'), foot = el('div', 'pz-foot');
  head.append(el('span', 'pz-ico', it.ico), el('span', 'pz-name', it.name));
  foot.append(el('span', 'pz-num', `${row.have}/${row.need}`), el('span', 'pz-have', haveText(ctx, row.item)));
  r.append(head, bar(row.have, row.need), foot, buttons(ctx, row));
  return r;
}

function rowC(ctx, row, it) {
  const r = el('div', rowClass('pz-c', row));
  const info = el('div', 'pz-info'), top = el('div', 'pz-top');
  top.append(el('span', 'pz-name', it.name), el('span', 'pz-num', `${row.have}/${row.need} · ${haveText(ctx, row.item)}`));
  info.append(top, bar(row.have, row.need));
  r.append(el('div', 'pz-ico', it.ico), info, buttons(ctx, row));
  return r;
}

function stageBlock(items) {
  const s = el('div', 'pz-stage'), top = el('div', 'pz-top');
  const have = items.reduce((a, i) => a + Math.min(i.have, i.need), 0);
  const need = items.reduce((a, i) => a + i.need, 0);
  top.append(el('span', 'pz-num', `${have}/${need}`), el('span', 'pz-pct', `${stagePct(items)}%`));
  s.append(top, bar(have, need));
  return s;
}

// 내 기록 줄 — 없으면(비로그인·오프라인) 버튼은 전부 꺼지고 이유 한 줄
function meLine(ctx) {
  if (!ctx.mine) return el('div', 'pz-note', ctx.mineReason === 'auth' ? PLAZA_COPY.toast.auth : PLAZA_COPY.toast.offline);
  const me = el('div', 'pz-me');
  me.appendChild(el('span', 'pz-chip warm', fill(PLAZA_COPY.todayLeft, ctx.mine.today_left ?? 0)));
  if (ctx.mine.tier) me.appendChild(el('span', 'pz-chip', tierLabel(ctx.mine.tier)));
  const nt = nextTierText(nextTier(ctx.mine.my_total || 0));
  if (nt) me.appendChild(el('span', 'pz-chip', nt));
  return me;
}

function renderBox(ctx) {
  const items = currentItems(ctx.prog);
  if (items.length) card.appendChild(el('p', 'pz-sub', subtitleText(ctx.prog.stage, items)));
  if (LAYOUT === 'c' && items.length) card.appendChild(stageBlock(items));
  card.appendChild(meLine(ctx));
  const list = el('div', 'pz-list' + (LAYOUT === 'b' ? ' pz-grid' : ''));
  const row = LAYOUT === 'b' ? rowB : LAYOUT === 'c' ? rowC : rowA;
  for (const r of items) {
    const it = PLAZA_ITEMS[r.item];
    if (it) list.appendChild(row(ctx, r, it));
  }
  card.appendChild(list);
}

export function renderPlazaModal(ctx) {
  if (!card || !ctx) return;
  card.replaceChildren(el('h2', '', ctx.kind === 'box' ? PLAZA_COPY.title : PLAZA_COPY.prompt[ctx.kind] || PLAZA_COPY.title));
  if (ctx.kind === 'box') renderBox(ctx);
  // stall·plaque 화면은 Task 9 에서 채운다
  const act = el('div', 'dm-actions'), close = el('button', '', '닫기');
  close.onclick = closePlazaModal;
  act.appendChild(close);
  card.appendChild(act);
}

export function openPlazaModal(kind, ctx) {
  ensureRoot();
  Input.setAnalog(0, 0);
  renderPlazaModal({ ...ctx, kind });
  root.classList.add('show');
}

export function closePlazaModal() {
  root?.classList.remove('show');
}
