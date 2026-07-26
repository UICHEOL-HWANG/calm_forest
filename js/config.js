// =============================================================
//  calm forest · 전역 설정 (CONFIG)
//  ------------------------------------------------------------
//  ▶ 실제 배포 시 아래 플레이스홀더 값만 교체하면 됩니다.
//  ▶ 값이 비어있거나(플레이스홀더 그대로) 연동에 실패해도
//    게임은 "오프라인 폴백" 으로 콘솔 로그만 남기고 정상 동작합니다.
// =============================================================

export const CONFIG = {
  // ── Supabase 연동 값 (BaaS: Auth + Postgres) ─────────────────
  //    Supabase 프로젝트 > Settings > API 에서 확인
  SUPABASE_URL: 'https://zuyxgjfihxtfdpolljzw.supabase.co', // 프로젝트 URL(공개, 안전)
  SUPABASE_ANON_KEY: 'sb_publishable_4ii948uQwLP2_W9eIW7Qcg_hWuFON9t',  // publishable key(브라우저 안전, RLS로 보호)

  // ── GA4 / GTM 트래킹 값 ──────────────────────────────────────
  GA4_MEASUREMENT_ID: 'G-ELBTR8BXBF',           // calm forest 웹 스트림
  GTM_CONTAINER_ID: 'YOUR_GTM_ID',              // 예: GTM-XXXXXXX (선택)

  // ── 센서/행동 데이터 로깅 설정 ───────────────────────────────
  //    마우스 좌표·캐릭터 위치·카메라 각도를 배치로 Supabase 전송
  LOG_FLUSH_INTERVAL_MS: 1500,  // 배치 전송 주기(1~2초)
  LOG_SAMPLE_THROTTLE_MS: 200,  // 센서 샘플 수집 throttle 간격
  LOG_TABLE: 'game_logs',       // Supabase 로그 테이블 이름

  // ── 게임 저장 테이블 ─────────────────────────────────────────
  SAVE_TABLE: 'game_saves',

  // ── 인증 방식: 로그인 화면에서 구글 로그인 / 게스트 선택 ───────
  AUTH_MODE: 'google',
};

// 플레이스홀더가 그대로면 "오프라인 모드" 로 간주하기 위한 헬퍼
export function isSupabaseConfigured() {
  return (
    CONFIG.SUPABASE_URL &&
    !CONFIG.SUPABASE_URL.startsWith('YOUR_') &&
    CONFIG.SUPABASE_ANON_KEY &&
    !CONFIG.SUPABASE_ANON_KEY.startsWith('YOUR_')
  );
}

export function isGaConfigured() {
  return CONFIG.GA4_MEASUREMENT_ID && !CONFIG.GA4_MEASUREMENT_ID.startsWith('YOUR_');
}
