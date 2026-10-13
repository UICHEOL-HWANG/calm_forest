// =============================================================
//  calm forest · 📲 Play Install Referrer → 설치 채널 귀속 — 규칙 (순수 함수 — DOM·저장소 의존 없음)
//  ------------------------------------------------------------
//  ▶ 홍보 링크: play.google.com/store/apps/details?id=…&referrer=utm_source%3Dinstagram%26utm_medium%3Dsocial%26utm_campaign%3Dplay_launch
//    → 설치 후 첫 실행에 네이티브(InstallReferrerPlugin.java)가 referrer 원문을 한 번 돌려준다.
//  ▶ 비었거나 구글 기본값(utm_source=google-play&utm_medium=organic)이면 'organic'.
//    utm_source 가 없는 다른 referrer(gclid 만 등)는 organic 으로 뭉개지 않고 'unknown'.
//  ▶ 이 기능 전에 설치한 사용자는 업데이트 후 첫 실행에 처음 읽힌다 → 설치가 첫 읽기보다 24시간 이상 앞서고
//    referrer 에 채널이 없으면(organic·unknown) 'preexisting' 으로 따로 둔다(organic 에 섞이면 비교가 오염된다).
//    utm_source 가 있으면 오래된 설치라도 그 채널 — Play 는 referrer 를 90일 보관하므로, 이 기능이 프로덕션에
//    나가기 전에 홍보 링크로 설치한 사람도 업데이트 후 첫 실행에 소급 귀속된다.
//  ▶ 기록: GA4 사용자 속성 install_source·install_campaign + install_attribution 이벤트 1회(새 파라미터 3개),
//    Supabase install_attribution(계정마다 1행 — 게스트 → 정식 계정으로 바뀌어도 새 계정에 다시 붙는다)
//  ▶ 저장소·네이티브 바인딩은 js/install-referrer-boot.js · 테스트: tests/install-referrer.test.mjs
// =============================================================

export const INSTALL_STORE_KEY = 'cf_install_attr';   // localStorage — { source, medium, campaign, raw, clickTs, installTs, status, synced[] }

const NONE = '(none)';
const ORGANIC = Object.freeze({ source: 'organic', medium: 'organic', campaign: NONE });
const GOOGLE_DEFAULT_SOURCES = ['google-play', '(not set)', 'not_set'];
const VALUE_MAX = 36;   // GA4 사용자 속성 값 한도
const RAW_MAX = 500;
const PREEXISTING_AFTER_MS = 24 * 3600 * 1000;   // 설치 → 첫 읽기 간격이 이보다 길면 기존 설치

// 소문자 · [a-z0-9_.-] 외는 '_' · 36자
function clean(v) {
  return String(v || '').toLowerCase().replace(/[^a-z0-9_.-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, VALUE_MAX);
}

// referrer= 값이 한 번 더 인코딩돼 오면('utm_source%3D…') 한 번 푼다
function decodeOnce(raw) {
  if (raw.includes('=') || !/%3d/i.test(raw)) return raw;
  try { return decodeURIComponent(raw); } catch { return raw; }
}

/** referrer 원문 → { source, medium, campaign } */
export function parseInstallReferrer(raw) {
  const text = decodeOnce(String(raw || '').trim());
  if (!text) return { ...ORGANIC };
  const q = new URLSearchParams(text);
  const rawSource = (q.get('utm_source') || '').trim().toLowerCase();
  if (GOOGLE_DEFAULT_SOURCES.includes(rawSource)) return { ...ORGANIC };
  const source = clean(rawSource);
  if (!source) return { source: 'unknown', medium: NONE, campaign: NONE };
  return { source, medium: clean(q.get('utm_medium')) || NONE, campaign: clean(q.get('utm_campaign')) || NONE };
}

/**
 * 📲 웹 앱 유도 배너(js/app-banner.js playReferrer)가 붙이는 값 — 광고 소재 팔(utm_content)·웹 여정 ID(jid).
 *   jid 로 웹의 app_banner_click 과 이 설치를 사람 단위로 잇는다. 채널(source)과 별개라 preexisting 이어도 남긴다.
 */
export function parseReferrerExtras(raw) {
  const q = new URLSearchParams(decodeOnce(String(raw || '').trim()));
  return {
    content: clean(q.get('utm_content')) || NONE,
    jid: String(q.get('jid') || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 32),
  };
}

/**
 * 네이티브 응답 → 저장할 귀속. null 이면 '아직 모른다'(일시 장애 — 다음 실행에서 다시 읽는다).
 *   status: ok | unsupported(FEATURE_NOT_SUPPORTED — Play 스토어 없는 기기, 확정) | unavailable | error
 */
export function attributionFromNative(res, now = Date.now()) {
  if (res?.status === 'ok') {
    const raw = String(res.referrer || '').slice(0, RAW_MAX);
    const firstInstallMs = Number(res.firstInstallMs) || 0;   // 0 = 모름(디버그 테스트 referrer)
    const parsed = parseInstallReferrer(raw);
    const noChannel = parsed.source === 'organic' || parsed.source === 'unknown';
    const preexisting = noChannel && firstInstallMs > 0 && now - firstInstallMs > PREEXISTING_AFTER_MS;
    return { ...(preexisting ? { source: 'preexisting', medium: NONE, campaign: NONE } : parsed), ...parseReferrerExtras(raw), raw, clickTs: Number(res.clickTs) || 0, installTs: Number(res.installTs) || 0, status: 'ok' };
  }
  if (res?.status === 'unsupported') return { source: 'unknown', medium: NONE, campaign: NONE, content: NONE, jid: '', raw: '', clickTs: 0, installTs: 0, status: 'unsupported' };
  return null;
}

// GA4 사용자 속성 — 채널별 리텐션은 install_source 로 가른다(medium 은 이벤트 파라미터로만)
export function installUserProps(attr) {
  return attr?.source ? { install_source: attr.source, install_campaign: attr.campaign || NONE } : {};
}

export function parseStoredAttribution(raw) {
  try {
    const v = JSON.parse(raw);
    return v && typeof v === 'object' && !Array.isArray(v) && typeof v.source === 'string' && v.source ? v : null;
  } catch { return null; }
}
