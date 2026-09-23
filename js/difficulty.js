// =============================================================
//  calm forest · 🎚️ 미니게임 난이도 계수 (순수 모듈)
//  ------------------------------------------------------------
//  최종 계수 e = clamp(e_dda × e_probe). 클수록 쉽다.
//   · e_probe — 판마다 팔을 순회하는 지터(측정용). 난이도별 성공률 곡선을 그리려면 값이 흩어져야 한다.
//   · e_dda   — 유저별로 한 판에 최대 DIFF_K 만큼만 움직이는 보정(경험용).
//  probe 를 DDA 출력 **위에** 곱한다. 이 순서여야 유저마다 e_dda 가 달라도 팔끼리의 비교가
//  순수한 probe 효과가 된다. 거꾸로 DDA 가 probe 결과를 보고 반응하면 둘이 얽혀 원인을 못 가린다.
//  브라우저 전역에 의존하지 않아 node 테스트가 잠근다.
// =============================================================
import { DIFFICULTY, DIFF_K, DIFF_DDA_CLAMP, DIFF_EASE_CLAMP } from './tuning.js';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** 문자열 id → 32bit 부호 없는 정수(FNV-1a). 유저마다 probe 시작 팔을 흩는다. */
export function hashId(id) {
  const s = String(id ?? '');
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** 이 판에 쓸 probe 팔. 균등 추첨이 아니라 순회 — 표본이 작을 때 팔별로 고르게 떨어진다. */
export function probeArm(game, id, n = 0) {
  const d = DIFFICULTY[game]; if (!d) return 0;
  return (hashId(id) + Math.max(0, Math.floor(n || 0))) % d.arms.length;
}

/** 이 판의 난이도. ease 는 게임이 쓰고, 셋 다 결과 이벤트에 싣는다. */
export function easeFor(game, id, n = 0, dda = 1) {
  const d = DIFFICULTY[game];
  if (!d) return { ease: 1, arm: null, dda: 1 };   // 표에 없는 게임은 난이도를 건드리지 않는다
  const arm = probeArm(game, id, n);
  return { ease: clamp(dda * d.arms[arm], ...DIFF_EASE_CLAMP), arm, dda };
}

/** 판이 끝난 뒤의 새 e_dda. outcome 은 0~1(이진은 성공 1 / 실패 0, 점수 게임은 점수/만점). */
export function nextDda(game, dda = 1, outcome = 0) {
  const d = DIFFICULTY[game];
  if (!d || !d.ddaOn) return dda;                  // ddaOn:false — probe 만 돌고 바닥은 안 움직인다
  const o = clamp(Number(outcome) || 0, 0, 1);
  return clamp(dda + DIFF_K * (d.target - o), ...DIFF_DDA_CLAMP);
}

/** 신규 세이브의 기본값 */
export function defaultDifficulty() {
  return Object.fromEntries(Object.keys(DIFFICULTY).map(g => [g, { dda: 1, n: 0 }]));
}

/** 옛 세이브 병합 — 필드가 없거나 망가져 있어도 기본값으로 뜬다 */
export function mergeDifficulty(saved) {
  const out = defaultDifficulty();
  for (const g of Object.keys(out)) {
    const s = saved?.[g]; if (!s) continue;
    if (Number.isFinite(s.dda)) out[g].dda = clamp(s.dda, ...DIFF_DDA_CLAMP);
    if (Number.isFinite(s.n) && s.n >= 0) out[g].n = Math.floor(s.n);
  }
  return out;
}
