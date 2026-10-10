// =============================================================
//  🔑 로그인 수단(loginVia) — "어떤 계정이냐"(provider)와 "이번에 무엇으로 들어왔냐"를 가른다
//  ------------------------------------------------------------
//  Apple ID 이메일이 기존 구글 계정과 같으면 Supabase 가 그 계정에 apple 신원을 붙이고
//  app_metadata.provider 는 'google' 로 남는다(2026-10-11 실기기). provider 로 GA4 login{method} 를 찍으면
//  iOS Apple 로그인이 전부 google 로 섞인다 → 로그인 함수가 기기에 남긴 수단을, 그 신원이 계정에
//  실제로 붙어 있을 때만 믿는다(남이 localStorage 를 바꿔도 없는 신원은 못 만든다).
//  합성 계정(토스·PGS·게임센터)과 게스트는 계정 종류가 곧 수단이라 그대로 둔다.
// =============================================================

export const LOGIN_VIA_KEY = 'cf_login_via';
const OAUTH_KINDS = new Set(['google', 'email', 'apple']);

export function resolveLoginVia({ provider, user, stored }) {
  if (!stored || !OAUTH_KINDS.has(provider)) return provider;
  const linked = (user?.identities || []).some(i => i?.provider === stored);
  return linked ? stored : provider;
}
