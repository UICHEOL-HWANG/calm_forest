// =============================================================
//  calm forest · 소재 인박스 — 공개 설정값
//  ------------------------------------------------------------
//  ⚠️ 공개되는 값만 둔다. service key 는 Worker(functions/api/*) 환경변수에만 있다.
//  값은 js/config.js 의 SUPABASE_URL·SUPABASE_ANON_KEY 와 같다(같은 Supabase 프로젝트).
// =============================================================
export const SUPABASE_URL = 'https://zuyxgjfihxtfdpolljzw.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_4ii948uQwLP2_W9eIW7Qcg_hWuFON9t';

// ⚠️ 이 저장소는 Pages 가 아니라 Workers 배포다(wrangler.jsonc). API 라우트는
//    게임 도메인에만 뜬다 — 프론트가 cards 서브도메인에 있어도 여기를 불러야 한다.
//    상대경로를 쓰면 cards 도메인에 functions/ 가 없어 전부 404 가 된다.
export const API_BASE = 'https://calmforest.cloud';
