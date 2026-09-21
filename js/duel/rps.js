// =============================================================
//  calm forest · 🐗 멧돼지 기싸움 — 가위바위보 판정 (순수)
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-09-21-night-duel-design.md
//  ▶ 순수 운이다. 버릇·힌트를 넣지 않는다 — 관찰로 이길 여지를 주면
//    🦝 그릇 섞기(관찰·추적)와 축이 겹친다. 멧돼지 쪽은 배짱이다.
//  ▶ 리롤 방지는 이 모듈의 일이 아니다. 대결 진입 때 흔적을 소모하므로
//    상대 수가 클라이언트 난수여도 다시 굴릴 기회 자체가 없다.
//  ▶ 테스트: node --test tests/duel.test.mjs
// =============================================================

/** 이기는 순서대로 — HANDS[i] 는 HANDS[i+1] 을 이긴다(순환) */
export const HANDS = ['rock', 'scissors', 'paper'];

/** 먼저 2승 */
export const RPS_WIN = 2;

/** 0 이상 1 미만 난수 → 손. 상한에서 배열 밖으로 나가지 않게 자른다 */
export function rollHand(r) {
  return HANDS[Math.min(HANDS.length - 1, Math.floor(r * HANDS.length))];
}

/** 내 손 기준 판정 */
export function judge(mine, theirs) {
  if (mine === theirs) return 'draw';
  // 바로 다음 칸을 이긴다: rock→scissors→paper→rock
  return HANDS[(HANDS.indexOf(mine) + 1) % HANDS.length] === theirs ? 'win' : 'lose';
}

export function initMatch() {
  return { wins: 0, losses: 0, rounds: 0, done: false, won: false };
}

/** 한 판 반영 — 새 객체를 돌려준다(원본 불변) */
export function applyRound(m, result) {
  if (m.done) return { ...m };
  if (result === 'draw') return { ...m };          // 비긴 판은 판수에 안 든다
  const wins = m.wins + (result === 'win' ? 1 : 0);
  const losses = m.losses + (result === 'lose' ? 1 : 0);
  const done = wins >= RPS_WIN || losses >= RPS_WIN;
  return { wins, losses, rounds: m.rounds + 1, done, won: done && wins >= RPS_WIN };
}
