// =============================================================
//  🧰 나룻배 보물상자 — 하루 한 번, 코스 후반(3구간)에 떠내려온다
//  ------------------------------------------------------------
//  ▶ 나룻배는 코인을 주지 않는다(인플레 방지). ⭐별조각도 뺐다 — 쓰는 곳이 뱃사공 창고뿐이고
//    전부 사도 68개라 한 판 평균(57개, boat_runs 30일 실측)과 비슷해 보물 느낌이 없다.
//    → 과수원 묘목·비료·미끼·보석·집 색. 기대가치 ≈ 50코인어치/일(2026-09-29 확정안).
//  ▶ 코스가 날짜 시드라 상자 위치·내용물도 시드에서 파생 — 그날은 모두 같다.
//  ▶ name 은 게임 인벤 표기(RES_LABEL)와 같게 — i18n 사전이 이미 번역을 갖고 있다.
//  ▶ id 는 GA4(loot·chest_loot)·boat_runs.chest_loot 에 같은 문자열로 쓴다.
//    (econ_logs 는 코인 전용이라 상자 지급은 거기 안 남는다 — 원장은 boat_runs.)
//  ▶ 순수 모듈(Three·game.js 의존 없음) — 테스트가 Node 에서 읽는다.
// =============================================================
export const CHEST_LOOT = [
  { id: 'sap_apple',    name: '사과나무 묘목', w: 20, give: { sap_apple: 1 } },
  { id: 'sap_peach',    name: '복숭아나무 묘목', w: 10, give: { sap_peach: 1 } },
  { id: 'sap_chestnut', name: '밤나무 묘목', w: 5,  give: { sap_chestnut: 1 } },   // 가장 귀한 묘목 — "대박" 몫
  { id: 'fert',         name: '비료 3개',  w: 20, give: { fert: 3 } },
  { id: 'bait',         name: '미끼 5개',  w: 20, give: { bait: 5 } },
  { id: 'gem',          name: '보석 1개',  w: 10, give: { gem: 1 } },
  { id: 'color',        name: '집 색 하나', w: 15, give: null },                   // tryUnlockDrop — 다 열렸으면 보석 1
];
export const CHEST_ZONE = [0.70, 0.85];   // 코스 진행도 — 3구간(가장 빠른 구간). 실측 77%의 판이 70% 지점까지 간다
export const CHEST_RULE = 'always';        // 난파·그만두기에도 지급(기존 🪷 수집물과 같은 규칙)

export const chestToday = (st, today) => st?.chestDate !== today;

export function placeChest(rnd, { len, width }) {
  const d = len * (CHEST_ZONE[0] + rnd() * (CHEST_ZONE[1] - CHEST_ZONE[0]));
  const x = (rnd() * 2 - 1) * (width - 1.3);
  return { d, x };
}

function mulberry32(a) {
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export function rollChest(seed) {
  let r = mulberry32(seed ^ 0xC4E57)() * 100;
  for (const l of CHEST_LOOT) { if ((r -= l.w) < 0) return l; }
  return CHEST_LOOT[CHEST_LOOT.length - 1];
}

// 실제 지급 기준 { id, name, give } — 화면(개봉·결과 카드)과 원장(boat_end·boat_runs.chest_loot)이 이걸 쓴다.
//   🎨 집 색은 해금에 성공하면 give 없음, 이미 다 열렸으면 보석 1 — 이때 id 를 color_gem 으로 둬서
//   진짜 보석(gem)과 구분하고, 화면에도 "집 색 하나"가 아니라 받은 그대로("보석 1개")를 보여 준다.
export function chestGive(loot, { unlocked } = {}) {
  if (loot.give) return { id: loot.id, name: loot.name, give: { ...loot.give } };
  return unlocked ? { id: loot.id, name: loot.name, give: {} } : { id: 'color_gem', name: '보석 1개', give: { gem: 1 } };
}

// boat_end.chest / boat_runs.chest — 0 없음 · 1 보고 놓침 · 2 건짐 · 3 거기까지 못 감
//   3 을 1 과 나누는 이유: 상자 전에 난파·그만두기한 판을 "놓침"에 넣으면 건짐률(2/(1+2))이 부풀려진다
export const chestOutcome = ({ offered, seen, taken }) => (!offered ? 0 : taken ? 2 : seen ? 1 : 3);
export const chestPaid = (result, rule = CHEST_RULE) => rule === 'always' || result === 'clear';
