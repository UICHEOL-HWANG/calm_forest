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
  pumpkin_glow: Object.freeze({ name: '꼬마 호박등 자국', desc: '걸음마다 작은 호박등이 톡 켜져요' }),
  bat_swirl: Object.freeze({ name: '박쥐 회오리 자국', desc: '걸을 때마다 박쥐가 빙글 날아올라요' }),
  ghost_nightcap: Object.freeze({ name: '나이트캡 유령', desc: '시트를 두르고 나이트캡을 쓴 포근한 유령이에요' }),
  ghost_cloud: Object.freeze({ name: '구름 유령', desc: '몽글몽글 구름이 된 유령이에요' }),
  witch_classic: Object.freeze({ name: '클래식 마녀', desc: '보랏빛 고깔모자와 별 브로치 망토예요' }),
  witch_starry: Object.freeze({ name: '별밤 견습 마녀', desc: '꼬마 고깔과 별이 반짝이는 망토, 등엔 빗자루예요' }),
  tools_batnight: Object.freeze({ name: '달밤 보라 세트', desc: '도구 9종이 박쥐 날개와 별빛으로, 비 오는 날엔 보랏빛 우산' }),
  tools_harvest: Object.freeze({ name: '수확제 세트', desc: '짚과 옥수수로 만든 도구 9종, 비 오는 날엔 짚 우산' }),
  bat_wing: Object.freeze({ name: '박쥐 날개', desc: '등에서 활짝 펼쳐지는 보랏빛 날개예요' }),
  bat_cape: Object.freeze({ name: '박쥐 망토', desc: '꼬마 박쥐가 달린 보랏빛 망토예요' }),
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

/** 칸이 정한 연출: 전신 스킨·도구 세트·등(망토) = B+C 상자 폭발(캐릭터가 입은 모습), 걷는 자국 = A 스포트라이트
 *  ※ 'spot' 은 buildTrailMark(itemId) 를 띄우는 자국 전용 — 등 꾸미기를 넣으면 빈 화면이다. */
export function revealModeOf(item) { return item?.slot === 'skin' || item?.slot === 'tools' || item?.slot === 'back' ? 'boxburst' : 'spot'; }

//  🪓 도구 세트·🦇 망토는 상자 연출을 같이 쓰되 카드 문구는 따로 — "전신 스킨" 이라 쓰면 거짓말이다
const TOOLS_CARD = Object.freeze({ tag: 'PREMIUM · 도구 세트', cta: '바로 들어보기' });
const BACK_CARD = Object.freeze({ tag: 'PREMIUM · 등 꾸미기', cta: '바로 입어보기' });
/** 카드 태그·버튼 — 칸이 정한다 */
export function revealCardOf(item) {
  if (item?.slot === 'tools') return TOOLS_CARD;
  if (item?.slot === 'back') return BACK_CARD;
  return REVEAL_CARD[revealModeOf(item)];
}

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
