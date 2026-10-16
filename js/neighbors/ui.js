// =============================================================
//  🏡 이웃 마을 화면 — 오늘의 이웃(A 엽서 카드) · 집주인 말풍선(C) · 다녀간 이웃 알림(A) · 상단 줄·나가기 · ⚙️ 토글
//  🚩🚫 신고·차단(App Store 1.2, 시안 C 2026-10-11 dev/active/ugc-report-block/mockup.html): 목록 각 줄 ⋯ · 구경 중 상단 줄 ⋯
//  시안: dev/active/neighbor-village/mockup.html (확정 A+C+A, 2026-10-07)
//  DOM 은 전부 textContent — 닉네임은 남이 지은 문자열이다(HTML 문자열 주입 금지). 영어는 i18n 옵저버가 번역한다.
//  모달 루트 id 가 '-modal' 로 끝나야 index.html anyModalOpen() 이 잡는다(js/plaza/ui.js 와 같은 규칙).
// =============================================================
import { Input } from '../game.js';
import { EMOJI, EMOJI_IDS, rewardLine } from './rules.js';

const CSS = `
#nb-pick-modal, #nb-visitors-modal { position: fixed; inset: 0; z-index: 33; display: none; place-items: center; background: rgba(20,40,30,0.55); }
#nb-pick-modal.show, #nb-visitors-modal.show { display: grid; }
.nb-card { width: min(440px, calc(100vw - 28px)); box-sizing: border-box; background: #fff; border-radius: 22px;
  box-shadow: 0 20px 60px rgba(30,50,40,.4); padding: 18px 14px 14px; text-align: center;
  max-height: calc(100dvh - 24px - var(--top-inset, 0px)); overflow-y: auto; }
.nb-card h2 { margin: 2px 0 4px; font-size: 17px; }
.nb-ico { font-size: 30px; }
.nb-sub { font-size: 12px; opacity: .7; margin: 0 0 12px; }
.nb-list { display: flex; flex-direction: column; gap: 8px; }
.nb-row { display: flex; gap: 10px; align-items: center; background: #f4faf5; border-radius: 16px; padding: 10px; text-align: left; box-shadow: var(--shadow); }
.nb-row.done { opacity: .55; }
.nb-ava { width: 52px; height: 52px; border-radius: 50%; background: #fff3dd; display: grid; place-items: center; font-size: 30px; flex: 0 0 52px; }
.nb-row > div:nth-child(2) { min-width: 0; flex: 1; }
.nb-name { font-weight: 800; font-size: 13px; word-break: keep-all; overflow-wrap: anywhere; }
.nb-meta { font-size: 11.5px; opacity: .75; margin-top: 2px; }
.nb-badge { display: inline-block; font-size: 10.5px; background: #ffe9b8; border-radius: 8px; padding: 1px 6px; margin-left: 4px; }
.nb-btn { white-space: nowrap; border: none; border-radius: 12px; padding: 9px 14px; font-weight: 700; font-size: 13px;
  background: var(--mint); color: var(--ink); box-shadow: var(--shadow); cursor: pointer; font-family: inherit; }
.nb-btn[disabled] { opacity: .5; cursor: default; }
.nb-go { margin-left: auto; padding: 8px 10px; font-size: 12px; }
.nb-foot { margin-top: 12px; font-size: 11.5px; opacity: .7; }
.nb-empty { padding: 18px 8px; font-size: 13px; opacity: .8; }
.nb-close { margin-top: 10px; background: #eef2ee; box-shadow: none; }
@media (min-width: 720px) {
  #nb-pick-modal .nb-card { width: 560px; }
  #nb-pick-modal .nb-list { flex-direction: row; }
  #nb-pick-modal .nb-row { flex-direction: column; text-align: center; flex: 1; }
  #nb-pick-modal .nb-go { margin: 6px 0 0; }
}
#nb-hud-top { position: fixed; top: calc(10px + var(--top-inset, 0px)); left: 12px; right: 12px; z-index: 20; display: none; align-items: center; gap: 8px;
  background: rgba(255,255,255,.86); border-radius: 12px; padding: 5px 6px 5px 6px; font-weight: 700; font-size: 13px; box-shadow: var(--shadow); box-sizing: border-box; }
#nb-hud-top .nb-title { flex: 1; min-width: 0; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-right: 8px; }
#nb-exit { background: #eef2ee; padding: 7px 10px; font-size: 12px; box-shadow: none; }
body.neighbor-visit #nb-hud-top { display: flex; }
body.neighbor-visit #hotbar, body.neighbor-visit #quest-panel, body.neighbor-visit #story-chip { display: none !important; }
body.neighbor-visit #topleft, body.neighbor-visit #topright { display: none !important; }   /* 상단 줄(#nb-hud-top)과 겹침 */
#nb-bubble { position: fixed; left: 50%; top: auto; bottom: calc(222px + env(safe-area-inset-bottom)); transform: translateX(-50%); z-index: 21; display: none; background: #fff; border-radius: 16px;
  padding: 9px 12px; font-size: 13px; font-weight: 700; box-shadow: var(--shadow); text-align: center; width: min(260px, calc(100vw - 32px)); }
#nb-bubble.show { display: block; }
#nb-bubble::after { content: ''; position: absolute; left: 50%; bottom: auto; top: -8px; transform: translateX(-50%); border: 8px solid transparent; border-top: 0; border-bottom: 8px solid #fff; }   /* 💬 아래 자리(조이스틱 210·액션 184 위) — 꼬리는 위쪽 집주인을 가리킨다. 위 28% 는 집주인·집을 가렸다 */
.nb-react { display: flex; gap: 6px; justify-content: center; margin-top: 7px; }
.nb-react button { border: none; background: #f4faf5; border-radius: 10px; width: 44px; height: 44px; font-size: 20px; cursor: pointer; }
.nb-visits { text-align: left; font-size: 12.5px; margin: 6px 0 12px; }
.nb-visits div span { overflow-wrap: anywhere; min-width: 0; }
.nb-visits div { display: flex; gap: 8px; justify-content: space-between; padding: 6px 2px; border-bottom: 1px solid #f0f4f0; }
.nb-more { border: none; background: #eef2ee; border-radius: 10px; width: 32px; height: 32px; padding: 0; font-size: 16px; line-height: 1; color: #6a7a70; cursor: pointer; font-family: inherit; flex: 0 0 32px; margin-left: 2px; }
.nb-row .nb-meta { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#nb-more-btn { width: 34px; height: 30px; font-size: 18px; flex: 0 0 34px; }
#nb-menu { position: fixed; z-index: 35; display: none; background: #fff; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,.25); padding: 6px; min-width: 180px; }
#nb-menu.show { display: block; }
#nb-menu button { display: flex; align-items: center; gap: 10px; width: 100%; text-align: left; border: none; background: none; padding: 12px 12px; font-size: 14px; font-weight: 700; border-radius: 10px; color: #b3483e; cursor: pointer; font-family: inherit; }
#nb-menu button + button { border-top: 1px solid #f3e6e3; border-radius: 0 0 10px 10px; }
#nb-menu button .ico { width: 20px; text-align: center; flex: none; }
#nb-menu button:active { background: #fff1ef; }
#nb-report-modal, #nb-block-modal { position: fixed; inset: 0; z-index: 34; display: none; place-items: center; background: rgba(20,40,30,0.55); }
#nb-report-modal.show, #nb-block-modal.show { display: grid; }
.nb-reasons { display: flex; flex-direction: column; gap: 8px; margin: 6px 0 16px; text-align: left; }
.nb-reasons button { display: flex; align-items: center; gap: 10px; border: none; border-radius: 12px; background: #f4faf5; padding: 11px 12px; font-size: 13.5px; font-weight: 600; color: var(--ink); cursor: pointer; font-family: inherit; }
.nb-reasons button i { width: 18px; height: 18px; border-radius: 50%; border: 2px solid #9db8a6; box-sizing: border-box; flex: none; }
.nb-reasons button[aria-checked="true"] i { border: 6px solid #3e8f5c; }
.nb-acts { display: flex; gap: 10px; margin-top: 4px; } .nb-acts .nb-btn { flex: 1; margin-top: 0; padding: 12px 14px; }
#nb-report-modal .nb-sub, #nb-block-modal .nb-sub { margin-bottom: 14px; line-height: 1.5; word-break: keep-all; }
.nb-danger { background: #e4736f; color: #fff; }
`;

const REACT_LABEL = { wave: '손 흔들기', heart: '하트', flower: '꽃', star: '별' };
let styled = false;
let pickerBusy = false;
const onClose = {};

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

function ensureStyle() {
  if (styled) return;
  styled = true;
  const s = el('style'); s.id = 'nb-style'; s.textContent = CSS; document.head.appendChild(s);
}

function modal(id) {
  ensureStyle();
  let root = document.getElementById(id);
  if (!root) {
    root = el('div'); root.id = id;
    root.addEventListener('click', (e) => { if (e.target === root && !(id === 'nb-pick-modal' && pickerBusy)) closeModal(id); });
    document.body.appendChild(root);
  }
  root.replaceChildren();
  const card = el('div', 'nb-card');
  root.appendChild(card);
  return { root, card };
}

function closeModal(id) {
  document.getElementById(id)?.classList.remove('show');
  const f = onClose[id]; onClose[id] = null;
  f?.();
}

// ── 오늘의 이웃(A 엽서 카드) ──
export function openPickerModal(rows, rewardedToday, onGo, onMore) {
  pickerBusy = false;
  const { root, card } = modal('nb-pick-modal');
  card.append(el('div', 'nb-ico', '🏡'), el('h2', null, '오늘의 이웃'), el('p', 'nb-sub', '세계수가 틔운 다른 씨앗들의 숲이에요 · 내일 또 바뀌어요'));
  const list = el('div', 'nb-list');
  if (!rows.length) list.appendChild(el('div', 'nb-empty', '아직 놀러 갈 이웃이 없어요 · 내일 다시 와 보세요'));
  for (const r of rows) {
    const row = el('div', 'nb-row' + (r.done ? ' done' : ''));
    const name = el('div', 'nb-name', r.nick);
    if (r.done) name.appendChild(el('span', 'nb-badge', '❤️ 다녀옴'));
    const info = el('div');
    info.append(name, el('div', 'nb-meta', r.meta));
    const go = el('button', 'nb-btn nb-go', r.go);
    go.onclick = () => { setPickerBusy(true); onGo(r); };
    const more = el('button', 'nb-more', '⋯');
    more.setAttribute('aria-label', '더보기');
    more.onclick = (e) => { e.stopPropagation(); onMore?.(r, more); };   // 🚩🚫 신고·차단
    row.append(el('div', 'nb-ava', r.face), info, go, more);
    list.appendChild(row);
  }
  const close = el('button', 'nb-btn nb-close', '닫기');
  close.onclick = () => closeModal('nb-pick-modal');
  card.append(list, el('div', 'nb-foot', rewardLine(rewardedToday)), close);
  Input.setAnalog(0, 0);
  root.classList.add('show');
}

export function setPickerBusy(on) {
  pickerBusy = !!on;
  document.querySelectorAll('#nb-pick-modal .nb-go, #nb-pick-modal .nb-close, #nb-pick-modal .nb-more').forEach(b => { b.disabled = !!on; });   // 요청 중엔 닫기·⋯ 도 잠근다(가는 중인 집을 차단하는 경합 방지)
}

export function isPickerOpen() { return !!document.getElementById('nb-pick-modal')?.classList.contains('show'); }
export function closePickerModal() { pickerBusy = false; closeModal('nb-pick-modal'); }

// ── 구경 중 상단 줄 · 🚪 내 마을로 ──
export function showNeighborHud(nickname, onExit, onMore) {
  ensureStyle();
  let top = document.getElementById('nb-hud-top');
  if (!top) {
    top = el('div'); top.id = 'nb-hud-top';
    const exit = el('button', 'nb-btn', '🚪 내 마을로'); exit.id = 'nb-exit';
    const more = el('button', 'nb-more', '⋯'); more.id = 'nb-more-btn'; more.setAttribute('aria-label', '더보기');
    top.append(exit, el('div', 'nb-title'), more);
    document.body.appendChild(top);
  }
  top.querySelector('.nb-title').textContent = `🏡 ${nickname} 의 마을`;
  document.getElementById('nb-exit').onclick = () => onExit();
  const moreBtn = document.getElementById('nb-more-btn');
  moreBtn.onclick = () => onMore?.(moreBtn);
  document.body.classList.add('neighbor-visit');
}

/** 🏠 상단 제목만 바꾼다 — 마당 `🏡 {0} 의 마을` ↔ 실내 `🏡 {0} 의 집` */
export function setNeighborHudTitle(text) {
  const el2 = document.querySelector('#nb-hud-top .nb-title'); if (el2) el2.textContent = text;
}

export function hideNeighborHud() {
  document.body.classList.remove('neighbor-visit');
  setHostBubble(null);
}

// ── 집주인 말풍선(C) — ask: 반응 4종 버튼 · thanks: 재방문 인사(버튼 없음) ──
export function setHostBubble(b) {
  ensureStyle();
  let box = document.getElementById('nb-bubble');
  if (!box) { box = el('div'); box.id = 'nb-bubble'; document.body.appendChild(box); }
  if (!b) { box.classList.remove('show'); return; }
  box.replaceChildren();
  const line = el('div');
  line.append(el('span', null, `${b.face} `), el('span', null, b.state === 'ask' ? '"와 줘서 고마워요! 어땠어요?"' : '"또 와 줘서 기뻐요!"'));
  box.appendChild(line);
  if (b.state === 'ask') {
    const row = el('div', 'nb-react');
    for (const id of EMOJI_IDS) {
      const btn = el('button', null, EMOJI[id]);
      btn.setAttribute('aria-label', REACT_LABEL[id] || '');
      btn.onclick = () => b.onReact(id);
      row.appendChild(btn);
    }
    box.appendChild(row);
  }
  box.classList.add('show');
}

// ── 🚩🚫 ⋯ 메뉴 — 누른 버튼 바로 아래(화면 밖으로 안 나가게) ──
export function openNbMenu(anchor, { onReport, onBlock }) {
  ensureStyle();
  let menu = document.getElementById('nb-menu');
  if (!menu) {
    menu = el('div'); menu.id = 'nb-menu'; document.body.appendChild(menu);
    document.addEventListener('pointerdown', (e) => { if (!menu.contains(e.target)) menu.classList.remove('show'); }, true);
  }
  menu.replaceChildren();
  //  이모지와 글자를 따로 — 한 문자열이면 폰트마다 이모지 폭이 달라 붙어 보였다(2026-10-11 피드백)
  const item = (ico, label, fn) => { const b = el('button'); b.append(el('span', 'ico', ico), el('span', null, label)); b.onclick = () => { menu.classList.remove('show'); fn(); }; return b; };
  menu.append(item('🚩', '신고하기', onReport), item('🚫', '차단하기', onBlock));
  const r = anchor.getBoundingClientRect();
  menu.classList.add('show');
  const w = menu.offsetWidth, h = menu.offsetHeight;
  menu.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, r.right - w)) + 'px';
  menu.style.top = Math.max(8, Math.min(window.innerHeight - h - 8, r.bottom + 6)) + 'px';
}

export function openReportModal(onSubmit) {
  const { root, card } = modal('nb-report-modal');
  let reason = 'nick';
  const list = el('div', 'nb-reasons');
  const opts = [['nick', '부적절한 닉네임'], ['decor', '부적절한 꾸미기'], ['other', '기타']].map(([id, label]) => {
    const b = el('button'); b.setAttribute('role', 'radio');
    b.append(el('i'), el('span', null, label));
    b.onclick = () => { reason = id; opts.forEach(([, x]) => x.setAttribute('aria-checked', x === b ? 'true' : 'false')); };
    list.appendChild(b);
    return [id, b];
  });
  opts.forEach(([id, b]) => b.setAttribute('aria-checked', id === reason ? 'true' : 'false'));
  const cancel = el('button', 'nb-btn nb-close', '취소'); cancel.onclick = () => closeModal('nb-report-modal');
  const send = el('button', 'nb-btn nb-danger', '신고 보내기');
  send.onclick = async () => { send.disabled = true; try { await onSubmit(reason); } finally { closeModal('nb-report-modal'); } };
  const acts = el('div', 'nb-acts'); acts.append(cancel, send);
  card.append(el('h2', null, '🚩 신고하기'), el('p', 'nb-sub', '운영자가 확인 후 조치해요.'), list, acts);
  Input.setAnalog(0, 0);
  root.classList.add('show');
}

export function openBlockConfirm(onConfirm) {
  const { root, card } = modal('nb-block-modal');
  const cancel = el('button', 'nb-btn nb-close', '취소'); cancel.onclick = () => closeModal('nb-block-modal');
  const ok = el('button', 'nb-btn nb-danger', '차단');
  ok.onclick = async () => { ok.disabled = true; try { await onConfirm(); } finally { closeModal('nb-block-modal'); } };
  const acts = el('div', 'nb-acts'); acts.append(cancel, ok);
  card.append(el('h2', null, '🚫 이 이웃을 차단할까요?'), el('p', 'nb-sub', '오늘의 이웃 목록과 방문 기록에서 사라지고, 상대도 내 마을에 올 수 없어요.'), acts);
  Input.setAnalog(0, 0);
  root.classList.add('show');
}

// ── 다녀간 이웃 알림(A) ──
export function openVisitorsModal(view, onDone) {
  const { root, card } = modal('nb-visitors-modal');
  card.append(el('div', 'nb-ico', '🏡'), el('h2', null, view.title), el('p', 'nb-sub', '어제부터 지금까지'));
  const list = el('div', 'nb-visits');
  for (const r of view.rows) {
    const line = el('div');
    line.append(el('span', null, `${r.face} ${r.nick}`), el('span', null, r.emoji));
    list.appendChild(line);
  }
  if (view.more > 0) list.appendChild(el('div', null, `외 ${view.more}명`));
  const ok = el('button', 'nb-btn', '고마워요 🌱');
  ok.onclick = () => closeModal('nb-visitors-modal');
  onClose['nb-visitors-modal'] = onDone;
  card.append(list, ok);
  Input.setAnalog(0, 0);
  root.classList.add('show');
}

// ── ⚙️ 설정 토글(index.html #village-public-btn) — 게스트는 숨긴다(후보에 안 들어가므로) ──
export function bindVillagePublicToggle(onToggle) {
  const b = document.getElementById('village-public-btn');
  if (!b || b.dataset.bound) return;
  b.dataset.bound = '1';
  b.addEventListener('click', () => onToggle());
}

export function setVillagePublicUi(on, visible) {
  const b = document.getElementById('village-public-btn');
  if (!b) return;
  // ⚠️ #settings-list button { display:flex } 가 [hidden] 을 이긴다 — style.display 로 직접 끈다(logout-btn 과 같은 방식)
  b.style.display = visible ? '' : 'none';
  b.classList.toggle('off', !on);
  b.setAttribute('aria-pressed', on ? 'true' : 'false');
}
