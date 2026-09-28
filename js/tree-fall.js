// =============================================================
//  calm forest · 🌳 나무 쓰러짐 포즈 (순수 모듈)
//  ------------------------------------------------------------
//  B안 '기우뚱 쿵 바운스'(2026-09-28, sims/tree-fall-sim.html 에서 3안 비교 후 채택)
//   0.00~0.15  뜸 — 반대쪽으로 살짝 기우뚱
//   0.15~0.60  가속 낙하(easeInQuad) — 중력처럼 보이게 하는 핵심
//   0.60       쿵 — 잎·흙먼지(호출부가 impact 로 한 번 터뜨린다)
//   0.60~      감쇠 튕김 한 번 + 잎 눌림
//   1.20~1.60  땅속으로 가라앉으며 작아짐 → done
//  treeFallPose(t) 는 t 의 순수 함수라 node 테스트가 잠근다(tests/tree-fall.test.mjs).
// =============================================================

export const TREE_FALL_DUR = 1.6;                      // 쓰러지기 시작~완전히 사라짐(초)
export const TREE_FALL_IMPACT = 0.6;                   // 땅에 닿는 순간(초)
export const TREE_FALL_LIE = 80 * Math.PI / 180;       // 누운 각 — 90° 면 잎 덩이가 땅을 깊이 파고든다
export const TREE_FALL_PIVOT = 0.45;                   // 회전축: 넘어지는 쪽 밑동 가장자리(줄기 밑 반지름 0.5)

const PRE_END = 0.15;
const PRE_LEAN = 4 * Math.PI / 180;
const BOUNCE = 9 * Math.PI / 180;
const OUT_START = 1.2;
const SINK_DEPTH = 1.3;

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const seg = (t, a, b) => clamp01((t - a) / (b - a));

/**
 * 쓰러지기 시작한 뒤 t 초의 자세.
 * @returns {{ angle:number, sink:number, scale:number, squash:number, done:boolean }}
 *   angle  넘어간 각(rad, 0=서 있음 · 음수=반대쪽 기우뚱)
 *   sink   땅속으로 내려간 깊이 · scale 전체 크기 · squash 잎 눌림(0~)
 */
export function treeFallPose(t) {
  if (t >= TREE_FALL_DUR) return { angle: TREE_FALL_LIE, sink: SINK_DEPTH, scale: 0.65, squash: 0, done: true };
  const since = t - TREE_FALL_IMPACT;
  let angle;
  if (t < PRE_END) {
    angle = -PRE_LEAN * Math.sin(seg(t, 0, PRE_END) * Math.PI) + 0;   // +0: t=0 에서 -0 이 아니라 0
  } else {
    const f = seg(t, PRE_END, TREE_FALL_IMPACT);
    const bounce = since > 0 ? Math.max(0, Math.exp(-since * 7) * Math.sin(since * 18)) : 0;
    angle = TREE_FALL_LIE * f * f - BOUNCE * bounce;
  }
  const out = seg(t, OUT_START, TREE_FALL_DUR);
  return {
    angle,
    sink: out * out * SINK_DEPTH,
    scale: 1 - out * 0.35,
    squash: since > 0 ? Math.exp(-since * 8) * 0.22 : 0,
    done: false,
  };
}

/** 나무에서 플레이어 반대쪽 수평 단위 벡터. 겹쳐 서 있으면 화면 안쪽(-z)으로. */
export function fallDirAway(treePos, playerPos) {
  const dx = treePos.x - playerPos.x, dz = treePos.z - playerPos.z;
  const len = Math.hypot(dx, dz);
  return len < 1e-6 ? { x: 0, z: -1 } : { x: dx / len, z: dz / len };
}
