// =============================================================
//  🌌 별자리 목록 — 천문대 해금 순서의 단일 출처
//  ------------------------------------------------------------
//  stars: 렌즈 좌표(y 위가 +). 실제 배치를 단순화했다 — 화면에서 모양이 읽히는 게 우선.
//  order: 혜성이 지나는 별 순서. 노트 수 = order.length - 1. 같은 선을 두 번 긋지 않게
//         (오리온·사자는 한붓그리기 경로) 짰다.
//  tempo: 별 사이 이동 시간 배율(작을수록 빠르다). ease(DDA) 와 곱해진다.
//  해금: 앞 별자리를 한 번 성공하면 다음이 열린다(저장하지 않고 cleared 로 계산).
// =============================================================

export const CONSTELLATIONS = [
  {
    id: 'big_dipper', level: 1, season: 'spring',
    stars: [[0, 0], [1.05, -0.15], [1.25, -0.95], [0.15, -0.8], [-0.75, 0.15], [-1.55, 0.45], [-2.45, 0.35]],
    order: [6, 5, 4, 0, 1, 2, 3, 0],
    tempo: 1,
  },
  {
    id: 'cassiopeia', level: 1, season: 'autumn',
    stars: [[-2, 0.35], [-1.05, -0.45], [0, 0.05], [0.95, -0.55], [1.9, 0.25]],
    order: [0, 1, 2, 3, 4],
    tempo: 0.8,
  },
  {
    id: 'pegasus', level: 2, season: 'autumn',
    //  대사각형(마르카브·셰아트·알페라츠·알게니브) + 안드로메다 사슬(미라크·알마크)
    stars: [[-1.2, -0.9], [-1.2, 0.35], [0.1, 0.4], [0.1, -0.85], [1.15, 0.8], [2.05, 1.2]],
    order: [5, 4, 2, 1, 0, 3, 2],
    tempo: 0.9,
  },
  {
    id: 'leo', level: 2, season: 'spring',
    //  낫(물음표 뒤집힌 모양) → 레굴루스 → 몸통 삼각형
    stars: [[-0.9, 1.0], [-0.5, 1.45], [0.15, 1.25], [0.35, 0.6], [0.05, 0.05], [0.15, -0.65], [1.7, -0.45], [2.6, -0.15], [1.75, 0.25]],
    order: [0, 1, 2, 3, 4, 5, 6, 7, 8, 3],
    tempo: 0.95,
  },
  {
    id: 'orion', level: 3, season: 'winter',
    //  0 메이사 1 벨라트릭스 2 벨트 오른쪽 3 벨트 가운데 4 벨트 왼쪽 5 베텔게우스 6 사이프 7 리겔
    stars: [[0, 1.7], [0.8, 1.0], [0.35, -0.2], [0, -0.1], [-0.35, 0], [-0.9, 1.2], [-0.7, -1.3], [0.9, -1.2]],
    order: [2, 1, 0, 5, 4, 6, 7, 2, 3, 4],
    tempo: 0.9,
  },
  {
    id: 'scorpius', level: 3, season: 'summer',
    //  집게 → 안타레스 → 몸통 → 꼬리 갈고리(샤울라)
    stars: [[-2.0, 1.3], [-2.2, 0.7], [-1.4, 0.6], [-1.0, 0.35], [-0.7, 0], [-0.5, -0.6], [-0.4, -1.2], [0.1, -1.6], [0.7, -1.5], [1.2, -1.1], [1.6, -0.6], [2.0, -0.05]],
    order: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    tempo: 0.85,
  },
];

export const BY_ID = Object.fromEntries(CONSTELLATIONS.map(c => [c.id, c]));
export const noteCount = c => c.order.length - 1;
export const maxScore = c => noteCount(c) * 2;

/** cleared: { [id]: 'YYYY-MM-DD' } → 열린 별자리 id 배열(앞에서부터 연속). 첫 별자리는 늘 열려 있다. */
export function unlockedIds(cleared = {}) {
  const out = [];
  for (const c of CONSTELLATIONS) {
    out.push(c.id);
    if (!cleared[c.id]) break;
  }
  return out;
}

/** 별자리 좌표를 bbox 중심 기준으로 맞추는 함수 — 렌즈 반지름 r 안에 들어가게(가로 1.6r · 세로 1.4r) */
export function fitter(c, r) {
  const xs = c.stars.map(s => s[0]), ys = c.stars.map(s => s[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const k = Math.min((1.6 * r) / Math.max(x1 - x0, 1e-6), (1.4 * r) / Math.max(y1 - y0, 1e-6), 0.43 * r);
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
  return i => [(c.stars[i][0] - mx) * k, -(c.stars[i][1] - my) * k];   // 화면 y 는 아래가 +
}
