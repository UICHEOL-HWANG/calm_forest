// =============================================================
//  calm forest · 🏛️ 박물관 증축 규칙 (순수 모듈 — THREE/DOM 의존 없음)
//  ------------------------------------------------------------
//  ▶ 층은 **코인이 아니라 수집률**로 열린다. 돈으로 건너뛰면 수집이 의미를 잃는다.
//  ▶ 층별 전시 목록의 단일 출처 — game.js 의 buildMuseumHall 이 여기서 가져간다.
//  ▶ 테스트: npm test   (dev/active/museum/)
//
//  ⚠️ 해금 상태를 세이브에 따로 저장하지 않는다 — 도감에서 **계산**한다.
//     저장하면 도감과 어긋날 수 있고(마이그레이션·복구), 계산하면 언제나 일치한다.
//     "증축 연출을 봤는가" 만 gameState.museum.seen 에 남긴다.
// =============================================================

/**
 * 층 구성. cats = 그 층에 전시되는 도감 카테고리, need = **아래층에서** 몇 종을 채워야 열리는가.
 * ⚠️ 모든 도감 카테고리가 어느 한 층에는 들어가야 한다 — 빠지면 그 종은 영영 전시되지 않는다(테스트로 잠금).
 */
export const MUSEUM_FLOORS = [
  { id: 1, name: '1층',   cats: ['crop', 'fish', 'ore'],                  need: 0 },
  { id: 2, name: '2층',   cats: ['forage', 'bug', 'dig', 'track'],        need: 9 },
  { id: 3, name: '3층',   cats: ['river', 'spirit', 'weather', 'npc'],    need: 9 },
  { id: 4, name: '특별전', cats: ['cook'],                                 need: 12 },
];

const floorDef = (floor) => MUSEUM_FLOORS.find(f => f.id === floor) || null;

/** 그 층에 전시되는 항목들 — 도감 원본에 카테고리를 붙여 돌려준다(명판·조회에 쓴다). */
export function floorEntries(floor, DEX) {
  const def = floorDef(floor);
  if (!def) return [];
  return def.cats.flatMap(cat => (DEX[cat] || []).map(e => ({ ...e, cat })));
}

/** 그 층의 보유/전체. */
export function floorProgress(floor, dex = {}, DEX) {
  const list = floorEntries(floor, DEX);
  return { have: list.filter(e => dex[e.cat]?.[e.id]).length, total: list.length };
}

/**
 * 지금 열려 있는 층 수. 아래층 기준을 넘겨야 다음이 열린다 —
 * ⚠️ 위층만 잔뜩 채웠다고 아래를 건너뛸 수는 없다(순서가 무너지면 증축 서사가 사라진다).
 */
export function openFloors(dex = {}, DEX) {
  let open = 1;
  for (let i = 1; i < MUSEUM_FLOORS.length; i++) {
    const below = MUSEUM_FLOORS[i - 1].id;
    if (floorProgress(below, dex, DEX).have < MUSEUM_FLOORS[i].need) break;
    open = MUSEUM_FLOORS[i].id;
  }
  return open;
}

/** 다음 층까지 얼마나 남았나 — 큐레이터 대사·안내에 쓴다. 다 열렸으면 null. */
export function nextFloorNeed(dex = {}, DEX) {
  const open = openFloors(dex, DEX);
  const next = MUSEUM_FLOORS.find(f => f.id === open + 1);
  if (!next) return null;
  const { have } = floorProgress(open, dex, DEX);
  return { floor: next.id, name: next.name, need: next.need, have, left: Math.max(0, next.need - have) };
}

// ── 🧑‍🦳 남은 종을 콕 집는 의뢰 ───────────────────────────────
//   베타 피드백 "미션이 없어지는 지점에서 뭘 해야 할지 모르겠다" 를 직접 푸는 자리다.
//   도감이 남아 있는 한 큐레이터의 의뢰가 마르지 않는다.

/** 하루 종일 같은 결과가 나오게 — 의뢰가 도중에 바뀌면 진행도가 증발한다(js/quests.js 와 같은 상수). */
function nextSeed(h) { return (h * 1103515245 + 12345) & 0x7fffffff; }

// ⚠️ 집으면 안 되는 카테고리
//   · river / sea(seafish) / mist — 잠긴 맵에서만 나온다. 잠긴 채로 집으면 "영원히 못 깨는 의뢰" 가 된다
//   · weather — "그 날씨인 날 접속" 이라 오늘 안에 맞출 수가 없다
const DEX_MAP_LOCK = { river: 'river', spirit: 'mist' };
const DEX_NEVER = ['weather'];

/**
 * 아직 도감에 없는 종 하나 — 날짜 시드로 고른다. 남은 게 없으면 null(호출부가 폴백한다).
 * @param {object} dex gameState.dex
 * @param {object} DEX 도감 정의(game.js)
 * @param {number} seed 날짜 시드
 * @param {{locked?:{river:boolean,sea:boolean,mist:boolean}}} ctx
 */
export function pickMissingDex(dex = {}, DEX = {}, seed = 0, ctx = {}) {
  const locked = ctx.locked || {};
  const pool = [];
  for (const cat of Object.keys(DEX)) {
    if (DEX_NEVER.includes(cat)) continue;
    const lock = DEX_MAP_LOCK[cat];
    if (lock && locked[lock]) continue;
    for (const e of DEX[cat]) if (!dex[cat]?.[e.id]) pool.push({ ...e, cat });
  }
  if (!pool.length) return null;
  const h = nextSeed(seed & 0x7fffffff);
  return pool[h % pool.length];
}
