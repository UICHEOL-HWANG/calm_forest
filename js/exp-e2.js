// =============================================================
//  calm forest · 🧪 E2 웹 로그인 화면 건너뛰기 실험 — 규칙 (순수 함수 — DOM·저장소 의존 없음)
//  ------------------------------------------------------------
//  ▶ 사전등록(고정 2026-10-12): analytics/metrics-framework 브랜치 f339846f
//    dev/active/metrics-framework/web-entry-experiment-prereg.md — 기준은 여기서 고치지 않는다
//  ▶ 대조(control) = 지금 그대로 · 처치(skip_login) = 로그인 화면 없이 바로 게스트로 시작,
//    익명 계정은 첫 실제 입력 뒤에(js/auth/deferred-guest.js) — 크롤러가 계정을 만들지 않게
//  ▶ 대상: 웹 첫 방문 기기 · 저장된 세션 없음 · 초대 링크 아님. 토스·안드로이드·iOS·itch 는 절대 배정하지 않는다.
//  ▶ 배정: 기기(client_id) 해시 50:50 — E1('e1:<platform>:')과 다른 솔트('e2:')로 독립(2×2).
//    등록 기록(localStorage cf_e2)으로 재방문에도 같은 무리. 처치 무리만 같은 기기의 게스트 세션을 이어 간다(2026-10-12 사용자 결정).
//  ▶ 기록: GA4 사용자 속성 exp_entry 하나 — 이벤트 파라미터는 늘리지 않는다(25개 한도, js/analytics.js)
//  ▶ 저장소·URL 바인딩은 js/exp-e2-boot.js · 테스트: tests/exp-e2.test.mjs, tests/e2-wiring.test.mjs
// =============================================================

export const E2_ARMS = ['control', 'skip_login'];
export const E2_PLATFORMS = ['web'];
export const E2_STORE_KEY = 'cf_e2';                  // localStorage — { arm }

const isArm = (a) => E2_ARMS.includes(a);

// FNV-1a 32bit + 마무리 섞기 — 'e2:<clientId>'. E1(exp-e1.js 'e1:')·assignVariant·aiBucket 과 섞이지 않는 별도 솔트
export function armForE2(clientId) {
  const s = `e2:${clientId || ''}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  h ^= h >>> 16; h = Math.imul(h, 0x7feb352d); h ^= h >>> 15;
  return E2_ARMS[(h >>> 0) & 1];
}

/**
 * 이번 부팅의 E2 판정 — 로그인 화면 판단보다 먼저, 동기로 한 번.
 *   ⚠️ 해시(hashed)는 어떤 분기보다 먼저 구한다 — 옛 variant 사고(배정 전에 return)를 구조로 막는다.
 *   순서: 강제(dev QA) → dev → 플랫폼 → 기기 기록(재방문) → 기존 기기 → 저장된 세션 → 초대 링크 → 신규
 * @returns {{ hashed: string, enrolled: boolean, arm: string|null, first: boolean, reason: string }}
 */
export function decideE2({ clientId, platform, newDevice = false, stored = null, hasSession = false, hasInvite = false, dev = false, forced = null } = {}) {
  const hashed = armForE2(clientId);
  const out = (enrolled, arm, first, reason) => ({ hashed, enrolled, arm: enrolled ? arm : null, first, reason });
  if (dev && isArm(forced)) return out(true, forced, false, 'forced');   // QA ?dbg&e2= — dev 세션이라 기록 없음
  if (dev) return out(false, null, false, 'dev');
  if (!E2_PLATFORMS.includes(platform)) return out(false, null, false, 'platform');
  if (isArm(stored?.arm)) return out(true, stored.arm, false, 'device');
  if (!newDevice) return out(false, null, false, 'returning');           // 이 배포 전부터 있던 기기 — 기존 유저
  if (hasSession) return out(false, null, false, 'session');
  if (hasInvite) return out(false, null, false, 'invite');               // 🤝 하트핀 흐름은 로그인 화면 배너 그대로(두 무리 모두)
  return out(true, hashed, true, 'new');
}

export function parseE2Stored(raw) {
  try {
    const v = JSON.parse(raw);
    return v && typeof v === 'object' && !Array.isArray(v) && isArm(v.arm) ? { arm: v.arm } : null;
  } catch { return null; }
}

// supabase-js 가 남기는 저장 세션 키 — 'sb-<ref>-auth-token' (code-verifier 같은 부속 키는 세션이 아니다)
export function hasStoredSession(keys) {
  return (keys || []).some(k => /^sb-.+-auth-token$/.test(k));
}

// 세션이 없어 로그인 화면을 띄울 자리에서 — 처치면 화면 없이 바로 게스트로.
//   오프라인(키 미설정·초기화 실패)·나가기 직후(메뉴의 로그인 화면 길)·초대 링크(하트핀 안내)는 기존 화면 그대로.
export function skipLoginNow({ decision, offline, justExited, hasInvite }) {
  return !!(decision?.enrolled && decision.arm === 'skip_login' && !offline && !justExited && !hasInvite);
}

// 재방문 시 남아 있는 익명(게스트) 세션을 지우지 않고 이어 갈까 — 처치 무리만. 초대 링크로 왔으면 기존대로(로그인 화면 하트핀 안내)
export function keepGuestSession(decision, { hasInvite = false } = {}) {
  return !!(decision?.enrolled && decision.arm === 'skip_login' && !hasInvite);
}

// GA4 사용자 속성 — 등록된 기기만
export function e2UserProps(decision) {
  return decision?.enrolled && isArm(decision.arm) ? { exp_entry: decision.arm } : {};
}
