// =============================================================
//  🏛️ 박물관 전시물 도형 목록 — 순수 데이터(THREE 없음, Node 테스트)
//  ------------------------------------------------------------
//  ▶ 지금까지 작물·물고기·광물 말고는 전부 색만 다른 20면체 하나였다(사용자: "전부 원석으로 처리된다").
//    카테고리마다 대표 조형을 두고 종마다 색·소품으로 구분한다.
//  ▶ 시안: sims/museum-redesign-exhibits-sim.html — 모델을 여기로 옮긴다(도형 호출 → p(...) 한 줄).
//  ▶ 이 모듈은 "무엇을 그릴까" 만 안다. 그리는 쪽(exhibit-build.js)이 재질별로 정점색 병합해
//    **전시물 하나 = 메시 최대 3개**(solid·glow·glass)가 되게 한다 — 드로우콜이 이 게임의 병목이다.
//  ▶ 규약: 바닥 y≈0 · 높이 ≤0.5 · 폭 ≤0.5. glow 색 채널은 0xd9 이하(블룸 임계 0.85).
// =============================================================
export const SHAPES = ['sph', 'cyl', 'cone', 'box', 'ico', 'dod', 'torus', 'lathe', 'tube'];
export const MATS = ['solid', 'glow', 'glass'];

/** 도형 한 개. 호출할 때마다 새 객체·새 배열을 만든다(불변). */
const p = (shape, args, color, o = {}) => ({
  shape, args, color, mat: o.mat || 'solid',
  pos: [...(o.pos || [0, 0, 0])], scl: [...(o.scl || [1, 1, 1])], rot: [...(o.rot || [0, 0, 0])],
});

/** 문자열 → 안정적인 해시. 모르는 id 도 늘 같은 색·모양을 받는다. */
export const hash = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
export const pick = (arr, id) => arr[hash(id) % arr.length];

// ── ⛏️ 광물 — 원석 덩어리가 아니라 "표본" ──────────────────────────
const ORE = {
  stone: () => [
    p('dod', [0.2, 0], 0x9a9a92, { pos: [0, 0.17, 0], scl: [1, 0.8, 1.1] }),
    p('dod', [0.11, 0], 0xb0b0a6, { pos: [0.2, 0.09, 0.1] }),
    p('dod', [0.08, 0], 0x80807a, { pos: [-0.2, 0.07, 0.12] }),
  ],
  coal: () => [
    p('ico', [0.19, 0], 0x2d2d33, { pos: [0, 0.17, 0], scl: [1.1, 0.85, 1] }),
    p('ico', [0.11, 0], 0x1c1c22, { pos: [0.2, 0.1, 0.1] }),
    p('box', [0.1, 0.02, 0.06], 0x7a7a88, { pos: [-0.04, 0.3, 0.04], rot: [0.3, 0.5, 0] }),   // 석탄 결의 반짝임
  ],
  gem: () => [
    ...[[0, 0, 0.3, 0], [0.12, 0.1, 0.22, -0.35], [-0.12, 0.04, 0.2, 0.4], [0.04, -0.12, 0.17, 0.2], [-0.05, 0.13, 0.15, -0.2]]
      .map(([x, z, h, t], i) => p('cone', [0.075, h, 6], i % 2 ? 0x6fe0e8 : 0x4fc3f0, { pos: [x, h / 2 + 0.02, z], rot: [t, 0, t * 0.6] })),
    p('cyl', [0.2, 0.22, 0.04, 8], 0x7a6a5a, { pos: [0, 0.02, 0] }),   // 결정이 박힌 돌판
  ],
};

// ── 레지스트리 — 카테고리 → { 종 id → 도형 목록 함수 } ───────────────
const BUILDERS = { ore: ORE };

export const PARTS_CATS = Object.keys(BUILDERS);

/** 전시물 도형 목록. 모르는 카테고리·종이면 null(호출부가 폴백). meta 는 게임이 아는 추가 정보(예: 주민 색). */
export function exhibitParts(cat, id, meta = {}) {
  const b = BUILDERS[cat];
  const fn = b && (b[id] || b._default);
  return fn ? fn(id, meta) : null;
}
