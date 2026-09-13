// =============================================================
//  calm forest · 🔵 게스트 → 정식 계정 진행도 이관 규칙 (순수 모듈)
//  ------------------------------------------------------------
//  토스 식별키 연결이 안 돼 게스트(익명 계정)로 플레이한 사람이 나중에 정식 계정으로
//  붙을 때, 어느 저장을 남길지 정한다. 브라우저 전역에 의존하지 않아 node 테스트가 잠근다.
//
//  배경: 2026-09-05~13 콘솔 인증서 삭제로 신규 토스 기기 전원이 8일간 게스트로 빠졌다.
//  규칙:
//   · 정식 계정에 저장이 없으면 게스트 저장을 옮긴다(신규 유저의 일반적인 경우).
//   · 둘 다 있으면 더 많이 진행한 쪽을 남긴다. 동점이면 정식 계정(옛 진행을 지우지 않는다).
// =============================================================

const sum = obj => Object.values(obj || {}).reduce((a, v) => a + (Number.isFinite(v) ? v : 0), 0);
const count = v => Array.isArray(v) ? v.length : Object.keys(v || {}).length;

/** 저장 상태 → 진행도 점수. 집 단계·주민 체인·도감·배지·보유 자원을 섞는다(없으면 0). */
export function progressScore(state) {
  if (!state || typeof state !== 'object') return 0;
  const chain = Object.values(state.npcs || {}).reduce((a, n) => a + (n?.idx || 0), 0);
  return (state.houseStage || 0) * 500
       + chain * 100
       + count(state.dex) * 30
       + count(state.badges) * 100
       + sum(state.inventory);
}

/** { keep: 'toss'|'guest', migrate: boolean } — migrate 가 true 면 게스트 저장을 정식 계정에 쓴다 */
export function pickSave(tossSave, guestSave) {
  if (!guestSave) return { keep: 'toss', migrate: false };
  if (!tossSave) return { keep: 'guest', migrate: true };
  return progressScore(guestSave) > progressScore(tossSave)
    ? { keep: 'guest', migrate: true }
    : { keep: 'toss', migrate: false };
}
