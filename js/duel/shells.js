// =============================================================
//  calm forest · 🦝 너구리 그릇 섞기 — 시퀀스·추적 (순수)
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-09-21-night-duel-design.md
//  ▶ 관찰·추적 게임이다. 🐗 가위바위보(운·배짱)와 축을 갈라둔다.
//  ▶ 난이도는 **섞기 속도(ms)로만** 조절한다. 횟수와 속도를 같이 흔들면
//    어느 쪽이 어려웠는지 지표로 가를 수 없다(fireScore·COURSE_MULT 와 같은 규칙).
//  ▶ 테스트: node --test tests/duel.test.mjs
// =============================================================

/** 그릇 개수 */
export const SHELL_COUNT = 3;

/** 판별 섞기 횟수·한 번에 걸리는 시간(ms). 3판 전승이어야 이긴다 */
export const SHELL_ROUNDS = [
  { swaps: 4, ms: 450 },
  { swaps: 6, ms: 380 },
  { swaps: 8, ms: 320 },
];

/** 3개짜리에서 가능한 자리 맞바꿈 전부 */
const PAIRS = [[0, 1], [1, 2], [0, 2]];

/**
 * 섞기 순서를 만든다.
 * rolls[i] 는 0 이상 1 미만. 같은 rolls 면 같은 시퀀스가 나온다(재현 가능).
 * ⚠️ 직전과 **같은 쌍을 연달아 내지 않는다** — 같은 둘이 두 번 자리를 바꾸면
 *    제자리로 돌아와, 보는 사람에겐 아무 일도 없던 것처럼 보인다.
 */
export function makeSwaps(n, rolls = []) {
  const out = [];
  let prev = -1;
  for (let i = 0; i < n; i++) {
    const others = PAIRS.map((_, k) => k).filter(k => k !== prev);
    const r = Number(rolls[i]) || 0;
    const k = others[Math.min(others.length - 1, Math.floor(r * others.length))];
    out.push(PAIRS[k]);
    prev = k;
  }
  return out;
}

/** 시작 자리에서 스왑을 차례로 맞으면 어디에 있나 — 판정의 근간 */
export function finalPos(start, swaps = []) {
  let p = start;
  for (const [a, b] of swaps) {
    if (p === a) p = b;
    else if (p === b) p = a;
  }
  return p;
}

export function initMatch() {
  return { round: 0, done: false, won: false };
}

/** 한 판 반영 — 틀리면 그 자리에서 끝. 새 객체를 돌려준다 */
export function applyRound(m, correct) {
  if (m.done) return { ...m };
  const round = m.round + 1;
  if (!correct) return { round, done: true, won: false };
  const done = round >= SHELL_ROUNDS.length;
  return { round, done, won: done };
}
