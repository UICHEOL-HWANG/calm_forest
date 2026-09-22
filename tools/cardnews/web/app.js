// =============================================================
//  calm forest · 소재 인박스 웹 (app.js)
//  ------------------------------------------------------------
//  ⚠️ supabase-js 를 쓰는 곳은 로그인 하나뿐이다. 소재·묶음 읽기와 쓰기는
//     전부 Worker(functions/api/cards-*.js) 를 거친다 — service key 가
//     브라우저에 내려오지 않게 하기 위해서다.
//  📚 레이아웃(A안: 좌우 분할 + sticky 트레이)은 style.css 에서 처리한다.
//     이 파일은 렌더 함수(순수)와 앱 상태/이벤트 배선을 나눈다 —
//     순수 렌더 함수는 export 해서 눈으로 검증할 때 목데이터로 재사용한다.
// =============================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

// ── 출처 라벨·정렬 순서 (source 값은 DB 원문, 화면엔 한국어로) ──
export const SOURCE_LABELS = { jobplanet: '잡플래닛', blind: '블라인드', dc: '디시', mlb: '엠팍', news: '뉴스' };
export const SOURCE_ORDER = ['jobplanet', 'blind', 'dc', 'mlb', 'news'];
const STATUS_LABELS = { draft: '초안 전', ready: '초안 요청됨' };

// ── 순수 헬퍼 ──
export function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function cssEscape(id) {
  return typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(id) : String(id).replace(/["\\]/g, '\\$&');
}

/** 긁어온 데이터라 렌더 직전에 한 번 더 막는다 — escapeHtml 은 속성 탈출만
 *  막지 javascript: 스킴은 막지 못한다. 수집 단계(cleanUrl)에도 같은 규칙이
 *  있지만, 안전을 상류 한 겹에만 기대지 않는다. */
export function safeHref(u) {
  return typeof u === 'string' && /^https?:\/\//i.test(u) ? u : null;
}

export function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

function todayStr() {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

// 소재를 출처별로 묶는다. 알려진 출처는 고정 순서, 모르는 값은 뒤에 붙인다
// (수집기가 새 출처를 추가해도 화면이 깨지지 않게).
export function groupTopicsBySource(topics) {
  const bySource = new Map();
  for (const t of topics) {
    const key = t.source || 'news';
    if (!bySource.has(key)) bySource.set(key, []);
    bySource.get(key).push(t);
  }
  const known = SOURCE_ORDER.filter((s) => bySource.has(s));
  const unknown = [...bySource.keys()].filter((s) => !SOURCE_ORDER.includes(s));
  return [...known, ...unknown].map((source) => ({ source, items: bySource.get(source) }));
}

// 카드 하단 버튼 영역 — 상태 3갈래(숨김 / 묶음에 담김 / 그 외)
export function renderTopicActionsHtml(topic, inTray) {
  if (topic.dismissed) {
    return `<span class="state dim">숨김</span><button type="button" class="btn ghost sm" data-action="revive">되살리기</button>`;
  }
  if (topic.bundle_id) {
    return `<span class="state done">묶음에 담김</span><button type="button" class="btn ghost sm" data-action="dismiss">숨기기</button>`;
  }
  if (inTray) {
    return `<button type="button" class="btn sm" disabled>담음</button><button type="button" class="btn ghost sm" data-action="dismiss">숨기기</button>`;
  }
  return `<button type="button" class="btn pri sm" data-action="add">담기</button><button type="button" class="btn ghost sm" data-action="dismiss">숨기기</button>`;
}

// 소재 카드 하나. 제목은 120자까지 오므로 줄바꿈을 그대로 두고(word-break은 CSS),
// excerpt 가 빈 문자열이면 <p> 자체를 만들지 않는다 — 빈 자리표시자를 남기지 않기 위해서다.
export function renderTopicCardHtml(topic, inTray) {
  const title = escapeHtml(topic.title || '');
  const excerpt = (topic.excerpt || '').trim();
  const category = topic.category ? escapeHtml(topic.category) : '';
  const source = topic.source || 'news';
  const sourceLabel = escapeHtml(SOURCE_LABELS[source] || source);
  const href = safeHref(topic.url);
  const urlLink = href
    ? `<a class="src-link" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">원문 보기 ↗</a>`
    : '';
  return `
    <article class="topic-card${topic.dismissed ? ' is-dismissed' : ''}" data-id="${escapeHtml(topic.id)}">
      <h3 class="topic-title">${title}</h3>
      ${excerpt ? `<p class="topic-excerpt">${escapeHtml(excerpt)}</p>` : ''}
      <div class="topic-meta">
        <div class="badges">
          <span class="badge src-${escapeHtml(source)}">${sourceLabel}</span>
          ${category ? `<span class="badge cat">${category}</span>` : ''}
          ${urlLink}
        </div>
        <div class="actions">${renderTopicActionsHtml(topic, inTray)}</div>
      </div>
    </article>`;
}

export function renderBundleCardHtml(bundle) {
  const title = escapeHtml(bundle.title || '(제목 없음)');
  const memo = (bundle.memo || '').trim();
  const status = bundle.status === 'ready' ? 'ready' : 'draft';
  return `
    <article class="bundle-card">
      <div class="bundle-main">
        <h3 class="bundle-title">${title}</h3>
        ${memo ? `<p class="bundle-memo">${escapeHtml(memo)}</p>` : ''}
        <div class="bundle-meta">
          <span class="badge status-${status}">${STATUS_LABELS[status]}</span>
          <span class="count">${Number(bundle.topic_count) || 0}건</span>
          <span class="date">${fmtDate(bundle.created_at)}</span>
        </div>
      </div>
      ${status === 'draft'
        ? `<div class="bundle-actions"><button type="button" class="btn pri sm" data-ready="${escapeHtml(bundle.id)}">초안 요청</button></div>`
        : ''}
    </article>`;
}

// ── 로그인 게이트 + API 헬퍼 (브리프 스켈레톤 그대로) ──
async function token() {
  const { data } = await sb.auth.getSession();
  return data.session?.access_token || null;
}

async function api(path, init = {}) {
  const t = await token();
  if (!t) { showLogin(); throw new Error('no session'); }
  const res = await fetch(path, {
    ...init,
    headers: { ...(init.headers || {}), 'content-type': 'application/json', Authorization: `Bearer ${t}` },
  });
  if (res.status === 401) { showLogin(); throw new Error('unauthorized'); }
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

const loadTopics = (date, showDismissed) =>
  api(`/api/cards-topics?date=${date}${showDismissed ? '&showDismissed=1' : ''}`);

const setDismissed = (id, dismissed) =>
  api('/api/cards-topics', { method: 'PATCH', body: JSON.stringify({ id, dismissed }) });

const createBundle = (title, memo, topic_ids) =>
  api('/api/cards-bundles', { method: 'POST', body: JSON.stringify({ title, memo, topic_ids }) });

const loadBundles = () => api('/api/cards-bundles');

const setBundleStatus = (id, status) =>
  api('/api/cards-bundles', { method: 'PATCH', body: JSON.stringify({ id, status }) });

// ── DOM 참조 ──
const $ = (id) => document.getElementById(id);
const loginEl = $('login');
const appEl = $('app');
const tabInboxBtn = $('tab-inbox');
const tabBundlesBtn = $('tab-bundles');
const screenInbox = $('screen-inbox');
const screenBundles = $('screen-bundles');
const dateInput = $('date-picker');
const showDismissedCheckbox = $('show-dismissed');
const inboxStatusEl = $('inbox-status');
const topicListEl = $('topic-list');
const topicEmptyEl = $('topic-empty');
const trayCountEl = $('tray-count');
const trayListEl = $('tray-list');
const trayEmptyEl = $('tray-empty');
const titleInput = $('bundle-title');
const memoInput = $('bundle-memo');
const saveBundleBtn = $('btn-save-bundle');
const trayMsgEl = $('tray-msg');
const bundleListEl = $('bundle-list');
const bundleEmptyEl = $('bundle-empty');
const toastEl = $('toast');

// ── 앱 상태 ──
let topics = [];
let topicsById = new Map();
const trayIds = new Map(); // id -> topic (제목 표시용) — 서버에는 저장 시점에만 보낸다

let toastTimer = 0;
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('on'), 2600);
}

function showLogin() {
  loginEl.classList.remove('hide');
  appEl.classList.add('hide');
}

function showApp() {
  loginEl.classList.add('hide');
  appEl.classList.remove('hide');
}

// ── 인박스 렌더 ──
function setStatus(text) { inboxStatusEl.textContent = text; }

function renderTopicList() {
  const groups = groupTopicsBySource(topics);
  if (!groups.length) {
    topicListEl.innerHTML = '';
    topicEmptyEl.style.display = '';
    return;
  }
  topicEmptyEl.style.display = 'none';
  topicListEl.innerHTML = groups.map(({ source, items }) => `
    <section class="source-section">
      <h2 class="source-heading">${escapeHtml(SOURCE_LABELS[source] || source)} <span class="count">${items.length}</span></h2>
      <div class="card-stack">
        ${items.map((t) => renderTopicCardHtml(t, trayIds.has(t.id))).join('')}
      </div>
    </section>`).join('');
}

function updateCardActions(id) {
  const card = topicListEl.querySelector(`.topic-card[data-id="${cssEscape(id)}"]`);
  const topic = topicsById.get(id);
  if (!card || !topic) return;
  card.classList.toggle('is-dismissed', !!topic.dismissed);
  const actionsEl = card.querySelector('.actions');
  actionsEl.innerHTML = renderTopicActionsHtml(topic, trayIds.has(id));
}

function removeCardFromDom(id) {
  const card = topicListEl.querySelector(`.topic-card[data-id="${cssEscape(id)}"]`);
  if (!card) return;
  const section = card.closest('.source-section');
  card.remove();
  if (section && !section.querySelector('.topic-card')) section.remove();
  if (!topicListEl.querySelector('.topic-card')) topicEmptyEl.style.display = '';
}

// 트레이(담기) — 서버 호출 없이 메모리에만 모은다. 목록 전체를 다시 그리지 않고
// 해당 카드의 버튼과 트레이만 갱신해서 스크롤이 튀지 않게 한다.
function renderTray() {
  trayCountEl.textContent = String(trayIds.size);
  trayListEl.innerHTML = [...trayIds.values()].map((t) => `
    <li data-id="${escapeHtml(t.id)}">
      <span class="tray-item-title" title="${escapeHtml(t.title)}">${escapeHtml(t.title)}</span>
      <button type="button" class="btn ghost xs" data-action="remove">빼기</button>
    </li>`).join('');
  trayEmptyEl.style.display = trayIds.size ? 'none' : '';
  saveBundleBtn.disabled = trayIds.size === 0 || !titleInput.value.trim();
}

function addToTray(id) {
  const topic = topicsById.get(id);
  if (!topic || topic.bundle_id || topic.dismissed || trayIds.has(id)) return;
  trayIds.set(id, topic);
  updateCardActions(id);
  renderTray();
}

function removeFromTray(id) {
  if (!trayIds.has(id)) return;
  trayIds.delete(id);
  renderTray();
  if (topicsById.has(id)) updateCardActions(id);
}

async function handleDismiss(id, btn) {
  const topic = topicsById.get(id);
  if (!topic) return;
  btn.disabled = true;
  try {
    await setDismissed(id, true);
    topic.dismissed = true;
    if (trayIds.has(id)) { trayIds.delete(id); renderTray(); }
    if (!showDismissedCheckbox.checked) removeCardFromDom(id);
    else updateCardActions(id);
  } catch (err) {
    btn.disabled = false;
    toast('숨기기 실패: ' + err.message);
  }
}

async function handleRevive(id, btn) {
  const topic = topicsById.get(id);
  if (!topic) return;
  btn.disabled = true;
  try {
    await setDismissed(id, false);
    topic.dismissed = false;
    updateCardActions(id);
  } catch (err) {
    btn.disabled = false;
    toast('되살리기 실패: ' + err.message);
  }
}

topicListEl.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const card = e.target.closest('.topic-card');
  const id = card?.dataset.id;
  if (!id) return;
  const action = btn.dataset.action;
  if (action === 'add') addToTray(id);
  else if (action === 'dismiss') handleDismiss(id, btn);
  else if (action === 'revive') handleRevive(id, btn);
});

trayListEl.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-action="remove"]');
  if (!btn) return;
  const li = btn.closest('li');
  if (li?.dataset.id) removeFromTray(li.dataset.id);
});

titleInput.addEventListener('input', () => {
  saveBundleBtn.disabled = trayIds.size === 0 || !titleInput.value.trim();
});

saveBundleBtn.addEventListener('click', async () => {
  const title = titleInput.value.trim();
  if (!title || trayIds.size === 0) return;
  saveBundleBtn.disabled = true;
  trayMsgEl.textContent = '저장하는 중…';
  try {
    await createBundle(title, memoInput.value.trim(), [...trayIds.keys()]);
    trayIds.clear();
    titleInput.value = '';
    memoInput.value = '';
    trayMsgEl.textContent = '';
    toast('묶음으로 저장했어요');
    await loadInbox(); // 브리프대로: 성공하면 목록을 다시 불러 bundle_id 를 맞춘다
  } catch (err) {
    trayMsgEl.textContent = '저장 실패: ' + err.message;
    saveBundleBtn.disabled = trayIds.size === 0 || !titleInput.value.trim();
  }
});

async function loadInbox() {
  const date = dateInput.value || todayStr();
  setStatus('불러오는 중…');
  try {
    const res = await loadTopics(date, showDismissedCheckbox.checked);
    topics = res.topics || [];
    topicsById = new Map(topics.map((t) => [t.id, t]));
    // 화면에서 사라졌거나(다른 날짜로 이동) 이미 묶인 소재는 트레이에서도 뺀다
    for (const id of [...trayIds.keys()]) {
      const t = topicsById.get(id);
      if (!t || t.bundle_id || t.dismissed) trayIds.delete(id);
    }
    renderTopicList();
    renderTray();
    setStatus(topics.length ? `${topics.length}건` : '');
  } catch (err) {
    if (err.message !== 'no session' && err.message !== 'unauthorized') {
      setStatus('불러오지 못했어요: ' + err.message);
    }
  }
}

dateInput.addEventListener('change', loadInbox);
showDismissedCheckbox.addEventListener('change', loadInbox);

// ── 묶음 목록 화면 ──
function renderBundleList(bundles) {
  if (!bundles.length) {
    bundleListEl.innerHTML = '';
    bundleEmptyEl.style.display = '';
    return;
  }
  bundleEmptyEl.style.display = 'none';
  bundleListEl.innerHTML = bundles.map(renderBundleCardHtml).join('');
}

async function loadBundlesScreen() {
  bundleListEl.innerHTML = '<div class="empty">불러오는 중…</div>';
  bundleEmptyEl.style.display = 'none';
  try {
    const res = await loadBundles();
    renderBundleList(res.bundles || []);
  } catch (err) {
    if (err.message !== 'no session' && err.message !== 'unauthorized') {
      bundleListEl.innerHTML = `<div class="empty">불러오지 못했어요: ${escapeHtml(err.message)}</div>`;
    }
  }
}

bundleListEl.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-ready]');
  if (!btn) return;
  const id = btn.dataset.ready;
  const original = btn.textContent;
  btn.disabled = true;
  btn.textContent = '요청 중…';
  try {
    await setBundleStatus(id, 'ready');
    toast('초안을 요청했어요');
    await loadBundlesScreen();
  } catch (err) {
    toast('요청 실패: ' + err.message);
    btn.disabled = false;
    btn.textContent = original;
  }
});

// ── 탭 전환 ──
function showScreen(name) {
  const isInbox = name === 'inbox';
  screenInbox.classList.toggle('hide', !isInbox);
  screenBundles.classList.toggle('hide', isInbox);
  tabInboxBtn.classList.toggle('on', isInbox);
  tabBundlesBtn.classList.toggle('on', !isInbox);
  if (!isInbox) loadBundlesScreen();
}

tabInboxBtn.addEventListener('click', () => showScreen('inbox'));
tabBundlesBtn.addEventListener('click', () => showScreen('bundles'));

// ── 로그인 ──
$('btn-login').addEventListener('click', () => {
  sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname } });
});

// ── 부팅 ──
dateInput.value = todayStr();

async function boot() {
  const { data } = await sb.auth.getSession();
  if (data.session) {
    showApp();
    await loadInbox();
  } else {
    showLogin();
  }
}

sb.auth.onAuthStateChange((_event, session) => {
  if (session) {
    showApp();
    loadInbox();
  } else {
    showLogin();
  }
});

boot();
