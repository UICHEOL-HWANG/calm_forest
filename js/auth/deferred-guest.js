// =============================================================
//  calm forest · 🧪 E2 처치 — 미뤄 둔 게스트 계정 (의존성은 인자로 — DOM·네트워크 없이 테스트)
//  ------------------------------------------------------------
//  ▶ 처치(skip_login) 첫 방문은 로그인 화면 없이 오프라인 게스트 상태로 바로 입장한다.
//    익명 Supabase 계정은 사람의 첫 실제 입력(이동·탭) 뒤에 만든다 — 페이지만 열고 가는 크롤러가 계정을 만들지 않게.
//  ▶ 계정이 생기면 세이브를 다시 읽어 저장 빗장(save-guard.js)을 새 계정 기준으로 맞춘다.
//  ▶ 테스트: tests/deferred-guest.test.mjs
// =============================================================
import { retryDelay } from '../save-guard.js';

export const FIRST_INPUT_EVENTS = ['pointerdown', 'touchstart', 'keydown'];
const RELOAD_TRIES = 12;   // 약 1분 — enterGame 의 failed_fresh 재시도와 같은 상한

/** 첫 실제 입력에 fn(type) 을 한 번 부른다. 스크립트가 만든 이벤트(isTrusted=false)는 무시. 떼는 함수를 돌려준다 */
export function onFirstInput(target, fn) {
  let done = false;
  const off = () => FIRST_INPUT_EVENTS.forEach(t => target.removeEventListener(t, handler, true));
  function handler(e) {
    if (done || e?.isTrusted === false) return;
    done = true; off(); fn(e?.type);
  }
  FIRST_INPUT_EVENTS.forEach(t => target.addEventListener(t, handler, { capture: true, passive: true }));
  return off;
}

/** 첫 입력마다 upgrade() — 계정이 안 생기면(오프라인·예외) 다음 입력에서 다시, maxTries 까지.
 *  한 번 실패로 세션 내내 저장 없이 놀게 두지 않는다(리뷰 2026-10-12). */
export function armDeferredGuest(target, upgrade, { maxTries = 3 } = {}) {
  let tries = 0;
  const arm = () => onFirstInput(target, async () => {
    tries++;
    let r = null;
    try { r = await upgrade(); } catch (e) { console.warn('[E2] 게스트 계정 만들기 실패 — 다음 입력에서 다시:', e?.message || e); }
    if (!r?.online && tries < maxTries) arm();
  });
  return arm();
}

/** 익명 계정을 만들고 세이브를 다시 읽는다. 읽기가 실패하면 잠시 뒤 다시(저장은 그동안 잠겨 있다) */
export async function upgradeGuest({ signInAsGuest, loadGame, track, wait = (ms) => new Promise(r => setTimeout(r, ms)) }) {
  const r = await signInAsGuest();
  track('deferred_guest', { result: r?.online ? 'ok' : 'offline' });   // [GA4] 사람 입력으로 계정이 생긴 기기(가드레일: 익명 계정 생성 속도)
  if (!r?.online) return r;
  for (let i = 0; i < RELOAD_TRIES; i++) {
    if ((await loadGame())?.canSave) break;
    if (i < RELOAD_TRIES - 1) await wait(retryDelay(i));
  }
  return r;
}
