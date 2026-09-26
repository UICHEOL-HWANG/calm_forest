// =============================================================
//  calm forest · 🎚️ 미니게임 난이도 계수 (순수 모듈)
//  ------------------------------------------------------------
//  최종 계수 e = clamp(e_dda × e_probe). 클수록 쉽다.
//   · e_probe — 판마다 팔을 바꾸는 지터(측정용, 블록 셔플). 난이도별 성공률 곡선을 그리려면 값이 흩어져야 한다.
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

/** 팔 배정 방식 버전 — 결과 이벤트에 probe_v 로 싣는다. 1 = 고정 순회(~2026-09-26), 2 = 블록 셔플. */
export const PROBE_SCHEME = 2;

/** 32bit 시드 → [0,1) 난수열(mulberry32). 블록 순열을 상태 없이 다시 만들 수 있게 한다. */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 이 판에 쓸 probe 팔 — 블록 셔플.
 * 팔 수(K)만큼 판을 한 블록으로 묶고, 블록마다 (기기·게임·블록 번호)로 시드한 순열을 쓴다.
 *  · 블록 안에서 팔이 한 번씩 → 균등 추첨처럼 쏠리지 않는다(표본 70판 규모).
 *  · 순서는 블록마다 무작위 → 고정 순회처럼 "어려운 팔 다음엔 늘 같은 팔" 이 되지 않는다.
 *    고정 순서면 직전 판 실패로 오른 DDA·좌절이 특정 팔에만 몰려 팔 비교가 오염된다.
 *  · n 만으로 다시 계산된다 — 세이브에 순열을 저장할 필요가 없다.
 */
export function probeArm(game, id, n = 0) {
  const d = DIFFICULTY[game]; if (!d) return 0;
  const k = d.arms.length;
  const i = Math.max(0, Math.floor(n || 0));
  const next = rng(hashId(`${id}|${game}|${Math.floor(i / k)}`));
  const perm = Array.from({ length: k }, (_, j) => j);
  for (let j = k - 1; j > 0; j--) {                  // Fisher–Yates
    const r = Math.floor(next() * (j + 1));
    [perm[j], perm[r]] = [perm[r], perm[j]];
  }
  return perm[i % k];
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
