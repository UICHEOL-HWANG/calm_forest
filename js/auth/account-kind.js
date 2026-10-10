// =============================================================
//  🔵📱 계정 종류 판정 — 토스 / 플레이 게임즈 / 🍎 게임센터 / 그 외
//  ------------------------------------------------------------
//  user_metadata 는 본인이 updateUser({ data }) 로 마음대로 바꿀 수 있다 → 판정 근거로 쓰지 않는다.
//  대신 Worker(toss-auth·pgs-auth)가 관리자 API 로 만든 **합성 이메일 도메인**을 본다.
//  이메일 변경은 새 주소로 확인 메일이 가야 끝나는데 .local 은 받을 수 없으니 흉내 낼 수 없다.
//  기존 유저(토스 54·PGS 1, 2026-09-30 확인)도 전부 이 도메인이라 그대로 인식된다.
// =============================================================

export const TOSS_EMAIL_DOMAIN = 'toss.calmforest.local';   // toss-auth/src/index.js 와 같게
export const PGS_EMAIL_DOMAIN = 'pgs.calmforest.local';     // pgs-auth/src/index.js 와 같게
export const GC_EMAIL_DOMAIN = 'gc.calmforest.local';       // 🍎 gc-auth/src/index.js 와 같게

// → 'toss' | 'pgs' | 'gc' | null
export function accountKind(user) {
  const email = String(user?.email || '').toLowerCase();
  if (email.endsWith('@' + TOSS_EMAIL_DOMAIN)) return 'toss';
  if (email.endsWith('@' + PGS_EMAIL_DOMAIN)) return 'pgs';
  if (email.endsWith('@' + GC_EMAIL_DOMAIN)) return 'gc';
  return null;
}
