// =============================================================
//  🔔 푸시 알림 — 게임 연결부(안드로이드·🍎 iOS 앱). 순수 흐름은 js/push-native.js
//  ------------------------------------------------------------
//  ▶ 안내 카드(시안 B, 2026-10-12 확정): 수확한 적 있는 사람에게 수확 직후 1회.
//    튜토리얼 중엔 소진하지 않고 졸업 뒤(endCoach)나 다음 수확 때 띄운다.
//  ▶ ⚙️ 설정 토글 #push-btn — localStorage cf_push('on'|'off') + 서버 enabled.
//  ▶ 앱을 켤 때 이미 허용한 사람은 조용히 재등록(토큰 교체·계정 변경 반영).
//  ▶ 트래킹: push_prompt{action} · push_permission{result, via} · push_toggle{on} · push_open{kind, send_id}
//  ⚠️ game.js 와 순환 import — 로딩 시점엔 game.js 값을 읽지 않는다(함수 안에서만).
// =============================================================
import { gameState, mgView, requestSave, ui } from './game.js';
import { duelActive } from './spaces/night-visit.js';
import { IS_ANDROID, IS_IOS, PLATFORM } from './platform.js';
import { capListen, capPlugin } from './cap-bridge.js';
import { disablePush, enablePush, onPushOpen, refreshPush } from './push-native.js';
import { getAccessToken } from './supabase-client.js';
import { CONFIG } from './config.js';
import { trackEvent } from './analytics.js';
import { LANG, t } from './i18n.js';
import { setIcon } from './icons/index.js';

const PREF_KEY = 'cf_push';
const TOKEN_KEY = 'cf_push_token';
const SHOW_DELAY_MS = 2600;      // 🎉 첫 수확 밀착 연출이 끝난 뒤
const RETRY_MS = 2500, MAX_RETRY = 20;

const $ = id => document.getElementById(id);
const store = {
  get: k => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* 사생활 모드 */ } },
};

async function post(body) {
  const token = await getAccessToken();
  if (!token) return false;
  try {
    const r = await fetch(CONFIG.PUSH_REGISTER_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...body, platform: PLATFORM }),
    });
    return r.ok;
  } catch { return false; }
}

const listen = (event, cb) => capListen('PushNotifications', event, cb);
const ctx = () => ({
  plugin: capPlugin('PushNotifications'), listen, post, lang: LANG,
  tz: (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return null; } })(),
  channelName: t('밭 소식'),
});
const available = () => (IS_ANDROID || IS_IOS) && !!capPlugin('PushNotifications');   // 🍎 iOS 는 AppDelegate 가 APNs → FCM 토큰으로 바꿔 넘긴다

function setPref(on, token) {
  store.set(PREF_KEY, on ? 'on' : 'off');
  if (token) store.set(TOKEN_KEY, token);
  const b = $('push-btn');
  if (b) { b.classList.toggle('off', !on); setIcon(b.querySelector('.uico'), on ? '🔔' : '🔕'); }
}

const report = (r, via) => post({ event: 'result', result: r.result, stage: r.stage || null, reason: r.reason || null, via }).catch(() => false);

async function askPush(via) {
  const r = await enablePush(ctx());
  trackEvent('push_permission', { result: r.result, via });
  report(r, via);
  if (r.result === 'granted') { setPref(true, r.token); ui.toast?.('🔔 꼭 필요한 날에만 밭 소식을 보내 드릴게요', 2800); }
  else if (r.result === 'denied') {
    setPref(false);
    ui.toast?.(via === 'settings' ? '휴대폰 설정에서 고요한 숲 알림을 허용해 주세요' : '⚙️ 설정에서 언제든 켤 수 있어요', 3200);
  } else if (r.result === 'error') ui.toast?.('알림 등록에 실패했어요. 잠시 후 다시 해 주세요', 2800);
  return r;
}

// ── 안내 카드(시안 B — 실제 알림 미리보기) ──
let offerTimer = null, retries = 0;
export function offerPush() {
  if (!available() || offerTimer) return;
  if (gameState.hintsSeen?.pushAsk || !gameState.hintsSeen?.harvestZoom) return;   // 한 번만 · 수확해 본 사람만
  offerTimer = setTimeout(showCard, SHOW_DELAY_MS);
}

function showCard() {
  offerTimer = null;
  if (gameState.hintsSeen.pushAsk) return;
  if (ui.coachActive?.()) return;              // 튜토리얼 중엔 소진 안 함 — 졸업 직후(endCoach) 다시 부른다
  if (mgView || duelActive || ui.anyModalOpen?.() || $('hint-modal')?.classList.contains('show')) {   // 🧪 E1 환영 모달 등 다른 창 위에 겹치지 않게
    if (++retries <= MAX_RETRY) offerTimer = setTimeout(showCard, RETRY_MS);
    return;
  }
  gameState.hintsSeen.pushAsk = true;
  requestSave();
  trackEvent('push_prompt', { action: 'shown' });
  ui.showHintModal?.({
    ico: '🔔',
    title: '밭 소식, 알려 드릴까요?',
    preview: { title: '🌙 밭이 조금 수상해요', body: '오늘 밤 누군가 찾아올지도 몰라요.' },
    body: '이렇게 하루 한 번만, 꼭 필요한 날에만 보내요.',
    ok: { label: '알려 주세요 🔔', onClick: () => { trackEvent('push_prompt', { action: 'accept' }); askPush('card'); } },
    alt: { label: '괜찮아요', onClick: () => { trackEvent('push_prompt', { action: 'later' }); report({ result: 'dismissed' }, 'card'); setPref(false); } },
  });
}

// ── ⚙️ 설정 토글 ──
function setupToggle() {
  const b = $('push-btn');
  if (!b) return;
  b.style.display = '';
  setPref(store.get(PREF_KEY) === 'on');
  b.addEventListener('click', async () => {
    if (store.get(PREF_KEY) === 'on') {
      trackEvent('push_toggle', { on: 0 });
      // 서버가 끄지 못했으면 켜진 채로 둔다 — "껐어요"라고 해 놓고 알림이 계속 오면 안 된다
      if (!(await disablePush({ token: store.get(TOKEN_KEY), post }))) { ui.toast?.('알림을 끄지 못했어요. 잠시 후 다시 해 주세요', 2800); return; }
      setPref(false);
      ui.toast?.('🔕 밭 소식 알림을 껐어요', 2000);
    } else {
      trackEvent('push_toggle', { on: 1 });
      gameState.hintsSeen.pushAsk = true;       // 설정에서 직접 켠 사람에게 카드를 다시 띄우지 않는다
      await askPush('settings');
    }
  });
}

/** 게임 입장 직후 1회(로그인 토큰이 있어야 등록이 된다) */
export function initPush() {
  if (!available()) return;
  onPushOpen(listen, d => trackEvent('push_open', { kind: String(d.kind || ''), send_id: String(d.send_id || '') }));
  setupToggle();
  if (store.get(PREF_KEY) === 'on') {
    refreshPush(ctx()).then(r => {
      if (r.result !== 'granted') report(r, 'refresh');
      if (r.result === 'granted') setPref(true, r.token); else if (r.result === 'skipped') setPref(false);
    });
  }
}
