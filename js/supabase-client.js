// =============================================================
//  calm forest · Supabase 연동 모듈 (Auth + DB, 백엔드 서버 없음)
//  ------------------------------------------------------------
//  ▶ [인증] 구글 OAuth 로그인 / 로그아웃 + 게스트(익명·오프라인) 폴백
//  ▶ [DB] 게임 상태 저장/불러오기(game_saves), 센서 로그 배치(game_logs)
//  ▶ 키 미설정 또는 실패 시 "오프라인 모드": 콘솔 폴백으로 정상 동작.
//
//  ─ Supabase 테이블 스키마는 supabase_setup.sql 참고 ─
//    (game_saves / game_logs + RLS + 분석 뷰)
// =============================================================

import { CONFIG, isSupabaseConfigured } from './config.js?v=30';

let supabase = null;   // Supabase 클라이언트 (오프라인이면 null)
export const state = {
  online: false,       // Supabase 세션 보유 여부
  userId: null,        // 로그인된 유저 UUID (오프라인이면 로컬 ID)
  email: null,         // 구글 계정 이메일/이름
  provider: null,      // 'google' | 'anonymous' | 'offline'
  sessionId: randId(), // 이번 플레이 세션 식별자(로그 그룹핑)
  clientId: clientId(),// 분석용 영구 기기 식별자(localStorage, 게스트 재방문 추적)
  isGuest: null,       // 게스트(익명/오프라인) 여부 — 세그먼트 분석용
  variant: 'control',  // A/B 변형(실험 off면 control)
};

function randId() { return 'sess-' + Math.random().toString(36).slice(2) + Date.now().toString(36); }

// ── 분석용 영구 client_id (게임 진행과 무관, 기기 단위 리텐션/중복제거용) ──
//   ※ 인증이 아니라 순수 집계용 식별자. 권한 판단에 쓰면 안 됨.
function clientId() {
  try {
    let id = localStorage.getItem('cf_client_id');
    if (!id) { id = 'c-' + (crypto.randomUUID?.() || (Math.random().toString(36).slice(2) + Date.now().toString(36))); localStorage.setItem('cf_client_id', id); }
    return id;
  } catch (e) { return 'c-' + Math.random().toString(36).slice(2); } // localStorage 차단 시 세션 한정
}

// ── A/B 변형 배정 — client_id 해시로 안정적 50:50(기기 단위) ──
//   실험 off면 무조건 'control'. 켜지면 해시 하위비트로 A/B.
function assignVariant() {
  if (!CONFIG.EXPERIMENT || CONFIG.EXPERIMENT === 'off') return 'control';
  let h = 0; const s = state.clientId;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0x7fffffff;
  return (h & 1) ? 'B' : 'A';
}

let statusCb = null;
function emit() { statusCb?.({ ...state }); }

// 익명(게스트) 세션인지 판별
function isAnon(session) {
  return session?.user?.is_anonymous === true
    || session?.user?.app_metadata?.provider === 'anonymous';
}

// 세션 객체 → state 반영
function applySession(session) {
  state.online = true;
  state.userId = session.user.id;
  state.isGuest = isAnon(session);   // 게스트(익명) 여부 — 세그먼트 분석용
  state.email = isAnon(session) ? '게스트' : (session.user.email || session.user.user_metadata?.name || '유저');
  state.provider = isAnon(session) ? 'anonymous' : (session.user.app_metadata?.provider || 'google');
  emit();
}

// =============================================================
//  초기화 — 페이지 로드시 호출.
//  반환: { needLogin } → true면 로그인 화면을 띄워야 함.
// =============================================================
export async function initAuth(onStatusChange) {
  statusCb = onStatusChange;
  state.variant = assignVariant();   // 실험 off면 'control', 켜지면 client_id 해시로 A/B

  // 키 미설정 → 오프라인. 로그인 화면에서 "게스트로 플레이"만 가능
  if (!isSupabaseConfigured()) {
    console.log('[Supabase 폴백] 키 미설정 → 오프라인 모드 가능.');
    state.provider = 'offline';
    return { needLogin: true, offline: true };
  }

  try {
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
      auth: { detectSessionInUrl: true, persistSession: true, autoRefreshToken: true },
    });

    // 로그인 상태 변화 감지(구글 리다이렉트 복귀 포함).
    //   ※ 익명(게스트) 세션은 여기서 자동 적용하지 않음 → 게스트는 휘발성.
    //     게스트 로그인은 signInAsGuest 가 직접 applySession 으로 처리.
    supabase.auth.onAuthStateChange((_event, session) => {
      if (session && !isAnon(session)) applySession(session);
    });

    // 기존 세션 확인: 구글 계정만 자동 복원. 게스트(익명)는 복원하지 않고 정리.
    const { data } = await supabase.auth.getSession();
    const s = data?.session;
    if (s && !isAnon(s)) {
      applySession(s);                       // 구글 재방문 → 예전 마을 이어서
      return { needLogin: false, offline: false };
    }
    if (s && isAnon(s)) {
      await supabase.auth.signOut();          // 게스트 재방문 → 이전 익명 세션 정리(매번 새로 시작)
    }
    return { needLogin: true, offline: false };
  } catch (err) {
    console.warn('[Supabase 폴백] 초기화 실패 → 오프라인:', err?.message || err);
    state.provider = 'offline';
    return { needLogin: true, offline: true };
  }
}

// ── 구글 로그인 (전체 페이지가 구글로 리다이렉트 → 복귀 시 세션 획득) ──
export async function signInWithGoogle() {
  if (!supabase) { alert('Supabase 키가 설정되지 않았습니다. 게스트로 플레이하세요.'); return; }
  // 쿼리(?error=...)·해시 제거한 깨끗한 주소로 복귀 (누적 방지)
  const redirectTo = window.location.origin + window.location.pathname;
  const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
  if (error) { console.warn('[구글 로그인 실패]', error.message); alert('구글 로그인 실패: ' + error.message); }
}

// ── 게스트로 플레이 (매번 새 익명계정 → 휘발성, 재방문 시 새 마을) ──
//   익명 로그인이 성공해야 game_logs/game_saves 에 실제로 쌓임(RLS·FK 때문).
//   실패하면 순수 오프라인(콘솔 폴백)으로만 동작.
export async function signInAsGuest() {
  if (supabase) {
    try {
      // 혹시 남아있는 익명 세션이 있으면 정리 → 항상 새 게스트로 시작(A안)
      const { data: cur } = await supabase.auth.getSession();
      if (cur?.session && isAnon(cur.session)) await supabase.auth.signOut();
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      applySession(data.session);          // state.online = true → DB 저장 활성화
      console.log('[게스트] 익명 로그인 성공 → DB 저장 활성화', state.userId);
      return { online: true };
    } catch (err) {
      // 조용히 넘기지 않고 원인을 명확히 노출(대부분 "Anonymous sign-ins 비활성화")
      console.error(
        '[게스트] 익명 로그인 실패 → 오프라인(콘솔 폴백)으로만 동작합니다.\n' +
        '  DB에 저장하려면 Supabase 대시보드에서 Authentication > Sign In / Providers >\n' +
        '  "Anonymous sign-ins" 를 켜주세요. (원인: ' + (err?.message || err) + ')'
      );
    }
  }
  // 순수 오프라인 게스트(익명 로그인 불가) — 진행은 되지만 DB 저장은 안 됨
  state.online = false;
  state.userId = 'local-' + state.sessionId;
  state.isGuest = true;
  state.email = '게스트';
  state.provider = 'offline';
  emit();
  return { online: false };
}

// ── 로그아웃 ──
export async function signOut() {
  if (supabase) { try { await supabase.auth.signOut(); } catch (e) {} }
  state.online = false; state.userId = null; state.email = null; state.provider = null;
  location.reload();
}

// =============================================================
//  게임 저장 / 불러오기 / 로그 전송  (오프라인이면 콘솔 폴백)
// =============================================================
export async function saveGame(gameState) {
  const row = { user_id: state.userId, state: gameState, updated_at: new Date().toISOString() };
  if (!state.online || !supabase) { console.log('[Supabase 폴백] 저장(오프라인):', row); return { ok: true, offline: true }; }
  try {
    const { error } = await supabase.from(CONFIG.SAVE_TABLE).upsert(row);
    if (error) throw error;
    console.log('[Supabase] 저장 완료'); return { ok: true, offline: false };
  } catch (err) { console.warn('[Supabase 폴백] 저장 실패:', err?.message || err); return { ok: false, offline: false, error: err }; }
}

export async function loadGame() {
  if (!state.online || !supabase) return null;
  try {
    const { data, error } = await supabase.from(CONFIG.SAVE_TABLE).select('state').eq('user_id', state.userId).maybeSingle();
    if (error) throw error;
    return data?.state ?? null;
  } catch (err) { console.warn('[Supabase 폴백] 불러오기 실패:', err?.message || err); return null; }
}

// ── 개발자 피드백 전송(feedback 테이블) — 오프라인이면 콘솔 폴백 ──
export async function submitFeedback({ category, message, meta }) {
  const row = { user_id: state.userId, category, message, meta: meta || {}, created_at: new Date().toISOString() };
  if (!state.online || !supabase) { console.log('[Supabase 폴백] 피드백(오프라인):', row); return { ok: true, offline: true }; }
  try {
    const { error } = await supabase.from('feedback').insert(row);
    if (error) throw error;
    console.log('[Supabase] 피드백 전송 완료');
    return { ok: true, offline: false };
  } catch (err) {
    console.warn('[Supabase 폴백] 피드백 전송 실패:', err?.message || err);
    return { ok: false, offline: false, error: err };
  }
}

export async function sendLogBatch(rows) {
  if (!rows || rows.length === 0) return;
  const enriched = rows.map(r => ({
    user_id: state.userId, session_id: state.sessionId,
    client_id: state.clientId, is_guest: state.isGuest, variant: state.variant, // [분석] 기기/게스트/실험 세그먼트
    ...r,
  }));
  if (!state.online || !supabase) { console.log(`[Supabase 폴백] 로그 배치 ${enriched.length}건 (오프라인)`); return; }
  try {
    const { error } = await supabase.from(CONFIG.LOG_TABLE).insert(enriched);
    if (error) throw error;
  } catch (err) { console.warn('[Supabase 폴백] 로그 전송 실패:', err?.message || err); }
}

// ── [계측] 경제 원장 배치 전송(econ_logs) — 코인 증감 {source,item,amount,balance} ──
//    metrics.js 가 버퍼링해 호출. 오프라인이면 콘솔 폴백(게임 진행 영향 없음).
export async function sendEconBatch(rows) {
  if (!rows || rows.length === 0) return;
  const enriched = rows.map(r => ({
    user_id: state.userId, session_id: state.sessionId,
    client_id: state.clientId, is_guest: state.isGuest, variant: state.variant, // [분석] 세그먼트 동일 적용
    ...r,
  }));
  if (!state.online || !supabase) { console.log(`[Supabase 폴백] 경제 원장 ${enriched.length}건 (오프라인)`, enriched); return; }
  try {
    const { error } = await supabase.from(CONFIG.ECON_TABLE).insert(enriched);
    if (error) throw error;
  } catch (err) { console.warn('[Supabase 폴백] 경제 원장 전송 실패:', err?.message || err); }
}

// ── [계측] ☕ 그날의 카페 손님 보관(cafe_guests) — Gemini 생성 콘텐츠 아카이브 ──
//    손님은 날짜 시드라 그날 접속한 전원이 똑같은 4명을 봅니다. 그래서 유저별이 아니라
//    (날짜, 날씨, 인원)당 1행만 남깁니다 — 먼저 들어온 한 명이 기록하고 나머지는
//    unique 제약(23505)에 걸려 조용히 무시됩니다. 그래서 user_id 도 붙이지 않습니다.
//    실패해도 게임엔 아무 영향이 없어야 하므로 전부 삼킵니다.
export async function sendCafeGuests({ date, weather, count, model, guests }) {
  if (!guests || !guests.length) return;
  if (!state.online || !supabase) { console.log('[Supabase 폴백] 카페 손님 기록 생략 (오프라인)'); return; }
  try {
    const { error } = await supabase.from('cafe_guests').insert({
      gen_date: date, weather, guest_count: count, model, guests,
    });
    if (error && error.code !== '23505') throw error;   // 23505 = 오늘 이미 기록됨(정상)
  } catch (err) { console.warn('[Supabase 폴백] 카페 손님 기록 실패:', err?.message || err); }
}

// ── [계측] 세션 요약 upsert(session_logs) — 세션당 1행, 주기/이탈 시 갱신 ──
export async function upsertSessionRow(row) {
  const full = {
    session_id: state.sessionId, user_id: state.userId,
    client_id: state.clientId, is_guest: state.isGuest, variant: state.variant,
    ...row, updated_at: new Date().toISOString(),
  };
  if (!state.online || !supabase) { console.log('[Supabase 폴백] 세션 요약(오프라인):', full); return; }
  try {
    const { error } = await supabase.from(CONFIG.SESSION_TABLE).upsert(full);
    if (error) throw error;
  } catch (err) { console.warn('[Supabase 폴백] 세션 요약 전송 실패:', err?.message || err); }
}
