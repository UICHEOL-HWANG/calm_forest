// =============================================================
//  🏡 이웃 마을 화면 — 오늘의 이웃(A 엽서 카드) · 집주인 말풍선(C) · 다녀간 이웃 알림(A) · 상단 줄·나가기 · ⚙️ 토글
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
#nb-bubble { position: fixed; left: 50%; top: 28%; transform: translateX(-50%); z-index: 21; display: none; background: #fff; border-radius: 16px;
  padding: 9px 12px; font-size: 13px; font-weight: 700; box-shadow: var(--shadow); text-align: center; width: min(260px, calc(100vw - 32px)); }
#nb-bubble.show { display: block; }
#nb-bubble::after { content: ''; position: absolute; left: 50%; bottom: -8px; transform: translateX(-50%); border: 8px solid transparent; border-top-color: #fff; border-bottom: 0; }
.nb-react { display: flex; gap: 6px; justify-content: center; margin-top: 7px; }
.nb-react button { border: none; background: #f4faf5; border-radius: 10px; width: 44px; height: 44px; font-size: 20px; cursor: pointer; }
.nb-visits { text-align: left; font-size: 12.5px; margin: 6px 0 12px; }
.nb-visits div span { overflow-wrap: anywhere; min-width: 0; }
.nb-visits div { display: flex; gap: 8px; justify-content: space-between; padding: 6px 2px; border-bottom: 1px solid #f0f4f0; }
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
export function openPickerModal(rows, rewardedToday, onGo) {
  pickerBusy = false;
  const { root, card } = modal('nb-pick-modal');
  card.append(el('div', 'nb-ico', '🏡'), el('h2', null, '오늘의 이웃'), el('p', 'nb-sub', '같은 잎사귀를 받고 온 이웃들이에요 · 내일 또 바뀌어요'));
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
    row.append(el('div', 'nb-ava', r.face), info, go);
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
  document.querySelectorAll('#nb-pick-modal .nb-go, #nb-pick-modal .nb-close').forEach(b => { b.disabled = !!on; });   // 요청 중엔 닫기도 잠근다
}

export function isPickerOpen() { return !!document.getElementById('nb-pick-modal')?.classList.contains('show'); }
export function closePickerModal() { pickerBusy = false; closeModal('nb-pick-modal'); }

// ── 구경 중 상단 줄 · 🚪 내 마을로 ──
export function showNeighborHud(nickname, onExit) {
  ensureStyle();
  let top = document.getElementById('nb-hud-top');
  if (!top) {
    top = el('div'); top.id = 'nb-hud-top';
    const exit = el('button', 'nb-btn', '🚪 내 마을로'); exit.id = 'nb-exit';
    top.append(exit, el('div', 'nb-title'));
    document.body.appendChild(top);
  }
  top.querySelector('.nb-title').textContent = `🏡 ${nickname} 의 마을`;
  document.getElementById('nb-exit').onclick = () => onExit();
  document.body.classList.add('neighbor-visit');
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
