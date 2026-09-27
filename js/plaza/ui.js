// js/plaza/ui.js
// =============================================================
//  🌾 광장 모달(기부함·좌판·명판). DOM 은 전부 textContent — 영어는 i18n 옵저버가 번역한다.
//  🎨 디자인 게이트 C(2026-09-27 확정: 시안 c) — 위에 단계 전체 진행 바 + 아래 간소화 목록.
//     품목마다 버튼 2개: +5 · 'N개 보태기'(N = 지금 실제로 낼 수 있는 수, 0 이면 '보태기' 꺼짐)
//  모달 루트 id 가 '-modal' 로 끝나야 index.html anyModalOpen() 이 잡는다.
//  🍂 좌판·🌾 명판(게이트 D, 2026-09-27) — 명판 이름은 서버가 준 닉네임이라 반드시 textContent(innerHTML 금지)
// =============================================================
import { Input } from '../game.js';
import { PLAZA_ITEMS, PLAZA_STALL } from '../data/plaza.js';
import { OUTDOOR } from '../data/catalog.js';
import { buyPlan } from './rewards.js';
import { currentItems, nextTier } from './rules.js';
import { donateButtons } from './donate.js';
import { PLAZA_COPY, fill, subtitleText, nextTierText, tierLabel, stagePct } from './copy.js';


const CSS = `
#plaza-modal { position: fixed; inset: 0; z-index: 33; display: none; place-items: center; background: rgba(20,40,30,0.55); }
#plaza-modal.show { display: grid; }
#plaza-modal .tut-card { display: flex; flex-direction: column; text-align: left; width: min(440px, 92vw); box-sizing: border-box;
  max-height: calc(100dvh - 24px - var(--top-inset, 0px)); overflow: hidden; padding: 20px 18px 16px; }
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
/* 단계 바 + 간소화 목록 */
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
/* 🍂 좌판 · 🌾 명판 */
.pz-c.pz-shop { grid-template-columns: 26px minmax(0, 1fr) auto; }
.pz-desc { font-size: 12px; opacity: .7; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pz-btns button.off { background: #efe9dc; color: #8a7a5c; }
.pz-names { display: flex; flex-wrap: wrap; gap: 5px; align-content: flex-start; max-height: 180px; overflow-y: auto; padding: 8px; border-radius: 12px; background: #f7f3ea; margin-bottom: 10px; }
.pz-names span { font-size: 12px; font-weight: 700; padding: 3px 8px; border-radius: 999px; background: #fff; }
.pz-claim { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.pz-claim button { border: 0; border-radius: 12px; padding: 10px 18px; font-weight: 800; font-size: 14px; cursor: pointer; background: #f0b44c; color: #4a2a08; }
.pz-claim button[disabled] { background: #e4e7e3; color: #8f978e; cursor: default; }
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
  root = el('div'); root.id = 'plaza-modal';
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

function buttons(ctx, row) {
  const wrap = el('div', 'pz-btns');
  for (const d of donateButtons(ctx.inv, ctx.mine, row)) {
    const b = el('button', d.cls, d.label);
    b.disabled = !!ctx.busy || !d.on;
    b.onclick = () => ctx.onDonate?.(row.item, d.qty);
    wrap.appendChild(b);
  }
  return wrap;
}

const haveText = (ctx, item) => `🎒 ${ctx.inv?.[item] || 0}`;
const rowClass = (base, row) => base + (row.have >= row.need ? ' pz-done' : '');

function itemRow(ctx, row, it) {
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
  if (items.length) card.append(el('p', 'pz-sub', subtitleText(ctx.prog.stage, items)), stageBlock(items));
  card.appendChild(meLine(ctx));
  const list = el('div', 'pz-list');
  for (const r of items) {
    const it = PLAZA_ITEMS[r.item];
    if (it) list.appendChild(itemRow(ctx, r, it));
  }
  card.appendChild(list);
}

// 🍂 좌판 — 품목 이름·아이콘은 OUTDOOR(작업대 장식 목록) 한 곳에서. 모자라도 버튼은 눌린다(흐리게) → 누르면 이유 토스트
function renderStall(ctx) {
  const leaf = ctx.inv?.leaf || 0;
  card.appendChild(el('p', 'pz-sub', fill(PLAZA_COPY.stall.sub, leaf)));
  const list = el('div', 'pz-list');
  for (const s of PLAZA_STALL) {
    const def = OUTDOOR.find(o => o.id === s.id);
    if (!def) continue;
    const plan = buyPlan(ctx.inv || {}, s.id);
    const r = el('div', 'pz-c pz-shop'), info = el('div', 'pz-info');
    info.append(el('span', 'pz-name', def.name), el('span', 'pz-desc', def.desc));
    const btns = el('div', 'pz-btns'), b = el('button', plan.ok ? 'max' : 'off', fill(PLAZA_COPY.stall.buy, s.price));
    b.disabled = !!ctx.busy;
    b.onclick = () => ctx.onBuy?.(s.id);
    btns.appendChild(b);
    r.append(el('div', 'pz-ico', def.ico), info, btns);
    list.appendChild(r);
  }
  card.appendChild(list);
}

// 🌾 명판 — 함께 지은 이웃 이름(최대 500, 서버가 자른다) + 내 등급 + 보상 받기
function renderPlaque(ctx) {
  const names = Array.isArray(ctx.prog?.names) ? ctx.prog.names.slice(0, 500) : [];
  card.appendChild(el('p', 'pz-sub', fill(PLAZA_COPY.plaque.sub, names.length)));
  const box = el('div', 'pz-names');
  for (const n of names) box.appendChild(el('span', '', String(n)));   // ⚠️ 서버 닉네임 — textContent 만
  card.appendChild(box);
  const claim = el('div', 'pz-claim');
  if (!ctx.mine) {
    claim.appendChild(el('div', 'pz-note', ctx.mineReason === 'auth' ? PLAZA_COPY.toast.auth : PLAZA_COPY.toast.offline));
  } else if (ctx.mine.tier) {
    claim.appendChild(el('span', 'pz-chip', fill(PLAZA_COPY.plaque.mine, tierLabel(ctx.mine.tier))));
  }
  const c = ctx.claim || { none: true };
  const done = !!c.already;
  const btn = el('button', '', done ? PLAZA_COPY.plaque.claimedBtn : PLAZA_COPY.plaque.claim);
  btn.disabled = !ctx.mine || done || !!c.none || !!ctx.busy;
  btn.onclick = () => ctx.onClaim?.();
  claim.appendChild(btn);
  if (ctx.mine && c.none && !done) claim.appendChild(el('div', 'pz-desc', PLAZA_COPY.plaque.none));
  card.appendChild(claim);
}

const TITLE = { box: () => PLAZA_COPY.title, stall: () => PLAZA_COPY.stall.title, plaque: () => PLAZA_COPY.plaque.title };

export function renderPlazaModal(ctx) {
  if (!card || !ctx) return;
  card.replaceChildren(el('h2', '', (TITLE[ctx.kind] || TITLE.box)()));
  if (ctx.kind === 'box') renderBox(ctx);
  else if (ctx.kind === 'stall') renderStall(ctx);
  else if (ctx.kind === 'plaque') renderPlaque(ctx);
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
