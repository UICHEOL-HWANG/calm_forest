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

  // ── 계측 테이블(경제 원장 / 세션 요약) ───────────────────────
  //    sql/migrate_metrics_tables.sql 실행으로 생성 (ML 피처의 원천)
  ECON_TABLE: 'econ_logs',       // 코인 증감 원장 {source,item,amount,balance}
  SESSION_TABLE: 'session_logs', // 세션 요약(세션당 1행 upsert)
  //    🛶 나룻배 런 기록 — sql/migrate_boat_runs.sql 실행으로 생성
  BOAT_TABLE: 'boat_runs',       // 런당 1행(코스 시드·충돌 지점·수집물·결과)

  // ── 인증 방식: 로그인 화면에서 구글 로그인 / 게스트 선택 ───────
  AUTH_MODE: 'google',

  // ── ☕ 카페 손님 동적 생성 엔드포인트 ─────────────────────────
  //    같은 오리진의 서버 함수(functions/api/cafe-guests.js)가 Gemini 를 대신 호출합니다.
  //    ⚠️ Gemini API 키는 절대 여기 두지 마세요 — 브라우저에 그대로 노출됩니다.
  //       키는 .env(로컬) / Cloudflare Pages 환경변수(운영)의 GEMINI_API_KEY 에만 둡니다.
  //    빈 문자열로 두면 기능이 꺼지고 게임 내장(날짜 시드) 손님이 나옵니다.
  CAFE_GUEST_API: '/api/cafe-guests',

  // ── 🦝 밤손님(부재중 습격) 판정/쪽지 엔드포인트 ───────────────
  //    판정은 서버가 결정적 시드(HMAC)로 계산 — 새로고침 리롤 불가.
  //    빈 문자열로 두면 밤손님 기능이 꺼집니다(아무 일도 일어나지 않음).
  NIGHT_VISIT_API: '/api/night-visit',
  NIGHT_NOTE_API: '/api/night-note',   // 사건 다음날 주민 쪽지(Gemini, 날짜 캐시)

  // ── 📸 사진첩(OCI Object Storage) 엔드포인트 ─────────────────
  //    사진 원본은 오라클 버킷에 — 서버 프록시(functions/api/photo*.js) 경유.
  //    OCI 는 버킷 CORS 를 지원하지 않아 브라우저 직접 업로드가 불가하고,
  //    ⚠️ OCI 키는 절대 여기 두지 마세요 — .env / Cloudflare 환경변수에만.
  PHOTO_API: '/api/photo',             // POST 업로드 · DELETE ?key= 삭제
  PHOTO_URLS_API: '/api/photo-urls',   // POST { keys } → presigned <img> URL 일괄 발급

  // ── A/B 실험 스위치 ─────────────────────────────────────────
  //    'off'  = 전원 control(변형 배정 안 함, variant 필드는 계속 기록)
  //    'map'  = 맵 크기 A/B (client_id 해시로 A/B 50:50 배정)
  //    실험을 켜기 전까지는 그냥 'control'만 쌓이고, 켜는 순간부터 배정됨.
  EXPERIMENT: 'off',
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
