// js/shop/reveal-pose.js
// =============================================================
//  calm forest · 💎 획득 연출의 시간축·문구 — 순수(THREE 없음, node 테스트 대상)
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-10-01-premium-trails-design.md §4·§8 · 시안 sims/premium-reveal-sim.html (A)
// =============================================================

export const REVEAL_COPY = Object.freeze({
  firefly: Object.freeze({ name: '반딧불 자국', desc: '밤이 되면 발자국마다 반딧불이 떠올라요' }),
  rainbow: Object.freeze({ name: '무지개 자국', desc: '걸음마다 일곱 빛깔이 차례로 남아요' }),
  forest_spirit: Object.freeze({ name: '숲의 정령', desc: '밤이면 몸속에서 반딧불이 떠다녀요' }),
  plush_doll: Object.freeze({ name: '플러시 인형', desc: '꿰맨 자국과 단추 눈, 걸을 때마다 말랑말랑' }),
  tools_shroom: Object.freeze({ name: '버섯 숲 세트', desc: '도구 9종이 빨간 갓·흰 점으로, 비 오는 날엔 버섯 우산' }),
  tools_moon: Object.freeze({ name: '달밤 세트', desc: '초승달 날과 금별 — 밤이면 은은하게 빛나요, 비 오는 날엔 밤하늘 우산' }),
  tools_bloom: Object.freeze({ name: '꽃정원 세트', desc: '꽃잎 날과 덩굴 자루, 비 오는 날엔 꽃잎 우산' }),
});

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const easeOutBack = (t) => { const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

/** 경과 t 초의 모습 — 0~0.25 어두워짐 · 0.25~0.95 커짐(오버슈트) · 1.1 카드 */
export function revealPose(t) {
  const k = clamp01((t - 0.25) / 0.7);
  return { dim: clamp01(t / 0.25), scale: k === 0 ? 0 : easeOutBack(k), rays: k, card: t >= 1.1 };
}

/** 카드 태그·버튼 — 스킨은 "입어보기", 자국은 "걸어보기" */
export const REVEAL_CARD = Object.freeze({
  spot: Object.freeze({ tag: 'PREMIUM · 걷는 자국', cta: '바로 걸어보기' }),
  boxburst: Object.freeze({ tag: 'PREMIUM · 전신 스킨', cta: '바로 입어보기' }),
});

/** 가격대별 연출(메모리 확정): 전신 스킨·도구 세트 = B+C 상자 폭발, 나머지 = A 스포트라이트 */
export function revealModeOf(item) { return item?.slot === 'skin' || item?.slot === 'tools' ? 'boxburst' : 'spot'; }

//  🪓 도구 세트는 상자 연출을 같이 쓰되 카드 문구는 따로 — "전신 스킨" 이라 쓰면 거짓말이다
const TOOLS_CARD = Object.freeze({ tag: 'PREMIUM · 도구 세트', cta: '바로 들어보기' });
/** 카드 태그·버튼 — 칸이 정한다 */
export function revealCardOf(item) { return item?.slot === 'tools' ? TOOLS_CARD : REVEAL_CARD[revealModeOf(item)]; }

/** 🎁 B+C — sims/premium-reveal-sim.html mode D 와 같은 시간축 */
export const BOX_OPEN = 1.4;
export function boxburstPose(t) {
  const o = t - BOX_OPEN, open = o >= 0;
  const shake = t > 0.5 && t < BOX_OPEN ? Math.sin(t * 40) * 0.08 * (1 - Math.abs(t - 0.95) / 0.45) : 0;
  const rise = open ? clamp01(o / 0.8) : 0;
  return {
    dim: clamp01(t / 0.25),
    box: t > 0 ? easeOutBack(clamp01(t / 0.4)) : 0,
    shake, open,
    lid: open ? { x: o * 1.2, y: -0.25 + o * 3 - o * o * 3, z: o * 0.5, rz: -o * 4 } : { x: 0, y: -0.25, z: 0, rz: 0 },
    flash: open ? Math.max(0, 0.85 - o * 3) : 0,
    ring: { on: open && o < 1.2, scale: 0.5 + Math.max(0, o) * 4, opacity: open ? Math.max(0, 1 - o / 1.1) : 0 },
    rise: rise === 0 ? 0 : easeOutBack(rise), riseY: -0.9 + rise * 1.6,
    rays: rise, card: t >= 2.3,
  };
}
