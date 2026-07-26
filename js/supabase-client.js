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

import { CONFIG, isSupabaseConfigured } from './config.js';

let supabase = null;   // Supabase 클라이언트 (오프라인이면 null)
export const state = {
  online: false,       // Supabase 세션 보유 여부
  userId: null,        // 로그인된 유저 UUID (오프라인이면 로컬 ID)
  email: null,         // 구글 계정 이메일/이름
  provider: null,      // 'google' | 'anonymous' | 'offline'
  sessionId: randId(), // 이번 플레이 세션 식별자(로그 그룹핑)
};

function randId() { return 'sess-' + Math.random().toString(36).slice(2) + Date.now().toString(36); }

let statusCb = null;
function emit() { statusCb?.({ ...state }); }

// 세션 객체 → state 반영
function applySession(session) {
  state.online = true;
  state.userId = session.user.id;
  state.email = session.user.email || session.user.user_metadata?.name || '익명';
  state.provider = session.user.app_metadata?.provider || 'anonymous';
  emit();
}

// =============================================================
//  초기화 — 페이지 로드시 호출.
//  반환: { needLogin } → true면 로그인 화면을 띄워야 함.
// =============================================================
export async function initAuth(onStatusChange) {
  statusCb = onStatusChange;

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

    // 로그인 상태 변화 감지(구글 리다이렉트 복귀 포함)
    supabase.auth.onAuthStateChange((_event, session) => {
      if (session) applySession(session);
    });

    // 기존 세션(리다이렉트 복귀 or 재방문) 확인
    const { data } = await supabase.auth.getSession();
    if (data?.session) {
      applySession(data.session);
      return { needLogin: false, offline: false };
    }
    // 세션 없음 → 로그인 화면 필요
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

// ── 게스트로 플레이 (설정됐으면 익명계정, 아니면 순수 오프라인) ──
export async function signInAsGuest() {
  if (supabase) {
    try {
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      applySession(data.session);
      return;
    } catch (err) {
      console.warn('[익명 로그인 실패 → 오프라인]', err?.message || err);
    }
  }
  // 순수 오프라인 게스트
  state.online = false;
  state.userId = 'local-' + state.sessionId;
  state.email = '게스트';
  state.provider = 'offline';
  emit();
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

export async function sendLogBatch(rows) {
  if (!rows || rows.length === 0) return;
  const enriched = rows.map(r => ({ user_id: state.userId, session_id: state.sessionId, ...r }));
  if (!state.online || !supabase) { console.log(`[Supabase 폴백] 로그 배치 ${enriched.length}건 (오프라인)`); return; }
  try {
    const { error } = await supabase.from(CONFIG.LOG_TABLE).insert(enriched);
    if (error) throw error;
  } catch (err) { console.warn('[Supabase 폴백] 로그 전송 실패:', err?.message || err); }
}
