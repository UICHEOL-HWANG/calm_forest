// =============================================================
//  calm forest · 🧭 첫 실행 "어디서 알게 되셨어요?" — 규칙(순수)
//  ------------------------------------------------------------
//  iOS 는 Play install referrer 같은 자동 귀속이 없고, 안드로이드도 링크 없이 온 사람은
//  organic·unknown 으로만 잡힌다 → 첫 실행 로딩 중에 직접 묻는다(시안 A, 2026-10-12 확정).
//  튜토리얼 뒤에 물으면 일찍 나간 사람이 빠져 채널별 리텐션이 부풀려진다(생존자 편향).
//  값(value)은 UTM Source 시트의 소스 이름과 같게 — 자동 귀속(install_source)과 한 표에서 합친다.
//  DOM·저장소·전송은 js/install-survey-ui.js 와 index.html 부팅부.
//  (테스트: node --test tests/install-survey.test.mjs)
// =============================================================
import { readInviteParam } from './referral/rules.js';

export const SURVEY_STORE_KEY = 'cf_survey';

// 순서 확정(사용자 검수) — 검색·스토어(링크 없이 온 사람의 주 경로)를 맨 앞에
export const SURVEY_OPTIONS = Object.freeze([
  { value: 'search', ico: '🔍', label: '구글·네이버 검색' },
  { value: 'store', ico: '🛒', label: '스토어 둘러보다가' },
  { value: 'instagram', ico: '📸', label: '인스타그램' },
  { value: 'threads', ico: '🧵', label: '스레드' },
  { value: 'youtube', ico: '▶️', label: '유튜브' },
  { value: 'x', ico: '𝕏', label: 'X(트위터)' },
  { value: '1km', ico: '📍', label: '1km' },
  { value: 'hithere', ico: '👋', label: '하이데어' },
  { value: 'community', ico: '📝', label: '블로그·커뮤니티' },
  { value: 'word_of_mouth', ico: '💬', label: '아는 사람이 알려 줌' },
  { value: 'friend', ico: '🤝', label: '친구 초대 받았어요', code: true },
  { value: 'other', ico: '✨', label: '기타' },
]);
const VALUES = new Set(SURVEY_OPTIONS.map(o => o.value));
const ANDROID_ASK = new Set(['organic', 'unknown']);   // 링크 없이 온 사람만 — 링크로 온 사람은 이미 안다

/**
 * 이번 실행에 물을까.
 * stored  : 이 기기의 기존 기록(readSurvey) — 있으면 끝(답·건너뛰기·늦음 모두)
 * referrer: 안드로이드 Play 귀속 결과 / fresh: 이번 실행에 새로 읽었나(캐시면 첫 실행이 아니다)
 * dev·force: dev 세션은 ?survey=1 일 때만 — QA 용으로 기록이 있어도 띄운다
 */
export function shouldAskSurvey({ platform, stored, referrer = null, fresh = false, dev = false, force = false }) {
  if (dev) return !!force;
  if (stored) return false;
  if (platform === 'ios') return true;   // 1.0.x 가 첫 공개 — 모든 기기가 신규
  if (platform === 'android') return !!(fresh && referrer && ANDROID_ASK.has(referrer.source));
  return false;                          // 웹·토스·itch
}

export function surveyRecord({ answer, skipped = null, code = false, now = Date.now() }) {
  if (answer) return { answer, code: !!code, ts: now, synced: [] };
  return { skipped: skipped || 'skip', ts: now, synced: [] };
}

/** 저장된 기록 — 형태가 깨졌거나 보기에 없는 값이면 null */
export function readSurvey(storage) {
  try {
    const v = JSON.parse(storage?.getItem(SURVEY_STORE_KEY) ?? 'null');
    if (!v || typeof v !== 'object') return null;
    if (v.answer != null && !VALUES.has(v.answer)) return null;
    if (v.answer == null && !v.skipped) return null;
    return v;
  } catch { return null; }
}

/** 🤝 친구 초대 코드 — 비우면 코드 없이 통과. 형식은 친구 초대 링크와 같은 규칙(js/referral/rules.js) */
export function checkInviteCode(input) {
  const s = String(input ?? '').trim();
  if (!s) return { ok: true, code: null };
  // 초대 링크를 통째로 붙여 넣은 경우 — 링크의 invite= 를 그대로 읽는다(같은 검증)
  const code = /[?&]invite=/i.test(s) ? readInviteParam(s) : readInviteParam('?invite=' + encodeURIComponent(s));
  return code ? { ok: true, code } : { ok: false, code: null };
}

/** GA4 사용자 속성 — 답한 사람만(건너뛴 사람은 비워 둔다) */
export function surveyUserProps(rec) {
  return rec?.answer ? { heard_from: rec.answer } : {};
}
