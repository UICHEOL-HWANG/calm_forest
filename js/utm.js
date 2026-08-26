// =============================================================
//  calm forest · 유입 경로(UTM) 캡처
//  ------------------------------------------------------------
//  ▶ GA4 는 랜딩 URL 의 utm_* 를 "세션 소스"로 자동 수집하지만,
//    ① 인앱 웹뷰(토스 등)에선 리퍼러가 끊겨 (direct)/(none) 으로 뭉개지고
//    ② 우리 커스텀 이벤트(chop_tree·session_time…)를 소스별로 자르려면
//       유저 속성(user_property)으로 따로 심어야 합니다.
//  ▶ 그래서 여기서 직접 읽어 두 벌로 보관합니다.
//    - 이번 세션 유입 : sessionStorage (탭 닫으면 사라짐)
//    - 최초 유입      : localStorage  (기기에 남음 → "어디서 온 유저가 오래 하나")
//  ▶ 저장소가 막힌 웹뷰/시크릿 모드에서도 게임이 멈추지 않게 전부 try/catch.
// =============================================================

const SESSION_KEY = 'cf_utm_session';
const FIRST_KEY   = 'cf_utm_first';
const MAX_LEN     = 100;   // GA4 유저 속성 값 길이 제한(100자)

// utm_term 은 검색광고용이라 우리 유입엔 거의 안 쓰이지만 들어오면 같이 받습니다.
const UTM_FIELDS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];

const cut = v => (v == null ? undefined : String(v).slice(0, MAX_LEN));

function readStore(store, key) {
  try { return JSON.parse(store.getItem(key)) || null; } catch (e) { return null; }
}
function writeStore(store, key, val) {
  try { store.setItem(key, JSON.stringify(val)); } catch (e) {}
}

// [1순위] URL 쿼리의 utm_* — 하나라도 있으면 "캠페인 유입" 으로 확정
function fromQuery() {
  const q = new URLSearchParams(location.search);
  const hit = {};
  UTM_FIELDS.forEach(k => { const v = q.get(k); if (v) hit[k] = cut(v); });
  // 공유 링크가 utm 대신 ref=/from= 만 달고 오는 경우도 흡수 (토스·카카오 공유 등)
  const alias = q.get('ref') || q.get('from');
  if (!hit.utm_source && alias) { hit.utm_source = cut(alias); hit.utm_medium = hit.utm_medium || 'referral'; }
  return Object.keys(hit).length ? hit : null;
}

// [2순위] 리퍼러 도메인 — utm 이 없을 때 최소한 "어느 사이트에서 왔는지" 는 남김
function fromReferrer() {
  if (!document.referrer) return null;
  try {
    const host = new URL(document.referrer).hostname;
    if (!host || host === location.hostname) return null;   // 내부 이동은 유입이 아님
    return { utm_source: cut(host), utm_medium: 'referral' };
  } catch (e) { return null; }
}

// 이번 세션 유입 + 최초 유입을 확정해서 돌려줍니다(없으면 그 자리에서 저장).
export function getTrafficSource() {
  const fresh = fromQuery();
  let session = readStore(sessionStorage, SESSION_KEY);

  // 세션 도중 새 캠페인 링크로 다시 들어오면 그쪽이 이깁니다(GA4 세션 소스와 같은 규칙).
  if (fresh) { session = fresh; writeStore(sessionStorage, SESSION_KEY, session); }
  if (!session) {
    session = fromReferrer() || { utm_source: '(direct)', utm_medium: '(none)' };
    writeStore(sessionStorage, SESSION_KEY, session);
  }

  let first = readStore(localStorage, FIRST_KEY);
  if (!first) {
    first = { ...session, at: new Date().toISOString() };
    writeStore(localStorage, FIRST_KEY, first);
  }
  return { session, first };
}

// GA4 유저 속성 형태로 변환 — 값이 없는 키는 아예 빼서 (not set) 을 줄입니다.
export function utmUserProperties() {
  const { session, first } = getTrafficSource();
  const props = {
    utm_source:       session.utm_source,
    utm_medium:       session.utm_medium,
    utm_campaign:     session.utm_campaign,
    first_utm_source: first.utm_source,     // 최초 유입 — 리텐션을 소스별로 자를 때 씀
  };
  Object.keys(props).forEach(k => { if (props[k] == null) delete props[k]; });
  return props;
}
