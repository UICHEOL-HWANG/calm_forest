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

import { gateOf, weatherOpen } from './dex-gates.js';   // 📖 희귀종 게이트 — 획득 판정과 같은 표를 본다

/**
 * 층 구성. cats = 그 층에 전시되는 도감 카테고리, need = **아래층에서** 몇 종을 채워야 열리는가.
 * ⚠️ 모든 도감 카테고리가 어느 한 층에는 들어가야 한다 — 빠지면 그 종은 영영 전시되지 않는다(테스트로 잠금).
 */
export const MUSEUM_FLOORS = [
  { id: 1, name: '1층',   cats: ['crop', 'fish', 'ore'],                  need: 0 },
  { id: 2, name: '2층',   cats: ['forage', 'bug', 'dig', 'track', 'visitor'], need: 9 },
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
//   · 게이트가 걸린 희귀종 — 오늘 날씨에 닫혀 있으면 후보에서 뺀다(js/dex-gates.js).
//     카테고리가 아니라 **종 단위**라 DEX_NEVER 로는 못 막는다.
//   · visitor — 🦋텃밭 방문객. 장식을 사서 배치해야 하고 🐸청개구리는 비 오는 날(약 20%)에만 온다.
//     weather 와 정확히 같은 문제라 같이 막는다.
const DEX_MAP_LOCK = { river: 'river', spirit: 'mist' };
const DEX_NEVER = ['weather', 'visitor'];

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
    for (const e of DEX[cat]) {
      if (dex[cat]?.[e.id]) continue;
      // 📖 오늘 날씨에 닫힌 희귀종은 집지 않는다 — 그날 못 깨는 의뢰가 된다.
      //   ⚠️ night 은 보지 않는다. 의뢰는 하루치 시드로 고정되는데 밤낮은 하루 안에 바뀌므로,
      //      밤 종을 낮에 걸러내면 의뢰가 사라진다. 플레이어가 밤까지 기다리면 된다.
      if (ctx.weather && !weatherOpen(gateOf(cat, e.id), ctx.weather)) continue;
      pool.push({ ...e, cat });
    }
  }
  if (!pool.length) return null;
  const h = nextSeed(seed & 0x7fffffff);
  return pool[h % pool.length];
}

/**
 * 전시물의 **시각 중심 높이**를 받침(그룹) 기준 상대값으로.
 * Box3.setFromObject 는 월드 좌표를 주므로 그룹의 월드 높이를 빼야 한다 — 그대로 쓰면 카메라가
 * 그룹 높이를 두 번 더해 전시물 위 허공(벽)을 본다(2026-09-24 제보).
 * @param {number} worldCenterY  메시 바운딩 상자 중심의 월드 Y
 * @param {number} originY       받침(그룹)의 월드 Y
 */
export function exhibitCenterY(worldCenterY, originY) {
  return worldCenterY - originY;
}

/**
 * 🔍 확대 관람 프레이밍 — 전시물 크기와 **UI 가 덮지 않는 빈 영역**에서 카메라 거리·시선 높이를 낸다.
 * 순수 함수(픽셀·각도·월드 길이만 받는다). DOM 측정과 THREE 는 game.js 몫.
 *
 * 화면 세로 절반 = dist·tan(fov/2) 이므로
 *   · dist  : 전시물이 빈 영역의 fill 만큼 차지하는 거리(가로도 같이 보고 더 먼 쪽을 고른다)
 *   · dy    : 시선을 이만큼 **올리면** 전시물이 그만큼 화면 아래로 내려온다(핀홀 투영 그대로)
 *
 * ⚠️ 크기는 바운딩 **구**가 아니라 상자의 반치수로 받는다 — 구 반지름은 대각선의 절반이라
 *    정육면체에 가까운 전시물을 √3 배로 부풀려, 맞춘다고 한 것보다 한참 작게 그린다.
 * ⚠️ 밴드가 최소치(0.3)로 벌어지면 중심도 그 밴드 안으로 되민다 — 안 그러면 두 값이
 *    서로 다른 레이아웃을 가리켜 전시물이 명판 줄과 겹친다(폰 가로 + 토스 여백).
 *
 * @param {number} h      화면 높이(px)
 * @param {number} top    위에서 UI 가 덮는 높이(px)
 * @param {number} bot    아래에서 UI 가 덮는 높이(px)
 * @param {number} fov    카메라 **수직** 화각(도)
 * @param {number} aspect 가로/세로 비
 * @param {number} halfH  전시물 세로 반높이(월드)
 * @param {number} halfW  전시물 가로 반폭(월드) — Y 축으로 도니 max(x, z)
 */
export function viewFrame({ h, top, bot, fov, aspect, halfH, halfW, fill = 0.76, wide = 0.8, min = 1.6, max = 5 }) {
  const t = Math.tan(fov * Math.PI / 360);
  const usable = Math.min(1, Math.max(0.3, (h - top - bot) / h));
  const raw = (top + (h - bot)) / 2 / h;
  const center = Math.min(1 - usable / 2, Math.max(usable / 2, raw));   // 밴드 밖으로 나가지 않게
  const dist = Math.min(max, Math.max(min,
    halfH / (t * usable * fill),        // 세로: 빈 영역의 fill 만큼
    halfW / (t * aspect * wide)));      // 가로: 폭의 wide 만큼(폰 세로는 여기가 조인다)
  return { dist, dy: (center - 0.5) * 2 * t * dist };
}

// ── ✨ 조건부 전시 — "비 오는 날 낚은 물고기" (2026-09-24) ─────────────────────────
//   같은 물고기라도 **그날의 조건**이 전시 사유가 된다. 처음 그 조건에서 얻은 것 하나만 남긴다.
//   ▶ 동사를 셋으로 나눴다(낚시·수확·채집) — 같은 동사가 둘이면 한 번에 둘이 열려 '발견'이 약해진다.
//   ▶ 맑은 날(55%)은 조건이 아니다. 비 20% · 눈 12% · 안개 13% → 한 주 안에 비를 만날 확률 약 79%.
//   ▶ 플레이어가 직접 한 것만 — 일꾼이 거둔 작물은 game.js 호출부에서 빠진다.
export const SPECIAL_EXHIBITS = [
  { id: 'rain_fish',  cat: 'fish',   weather: 'rain', ico: '🌧️', name: '비 오는 날 낚은 물고기' },
  { id: 'snow_crop',  cat: 'crop',   weather: 'snow', ico: '❄️', name: '눈 오는 날 수확한 작물' },
  { id: 'fog_forage', cat: 'forage', weather: 'fog',  ico: '🌫️', name: '안개 낀 날 주운 채집물' },
];

/** 이 카테고리를 이 날씨에 얻으면 열리는 전시 — 없으면 null. */
export function specialFor(cat, weather) {
  return SPECIAL_EXHIBITS.find(s => s.cat === cat && s.weather === weather) || null;
}

/** 조건에 맞고 아직 없으면 새 객체로 기록해 돌려준다. 아니면 **같은 객체**(호출부가 === 로 변화를 안다). */
export function noteSpecial(records, cat, id, weather, at) {
  const def = specialFor(cat, weather);
  if (!def || records?.[def.id]) return records;
  return { ...records, [def.id]: { id, at } };
}

/** 세이브에서 온 기록 정제 — 모르는 전시·깨진 값은 버린다. */
export function sanitizeSpecial(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const s of SPECIAL_EXHIBITS) {
    const r = raw[s.id];
    if (r && typeof r.id === 'string' && Number.isFinite(r.at)) out[s.id] = { id: r.id, at: r.at };
  }
  return out;
}

// ── 🌊 최대어 명판 — 어종별 개인 최고 무게 ─────────────────────────────────
//   무게는 원래 sea_records(Supabase)에만 남았다. 이제 세이브에도 최댓값을 두고,
//   이 기능 전의 기록은 박물관에 처음 들어갈 때 sea_records 에서 한 번 합친다(mergeBest).

/** 이번 어획으로 최고 기록이 바뀌면 새 객체, 아니면 같은 객체. */
export function bestAfterCatch(best, species, weight) {
  if (!Number.isFinite(weight) || weight <= 0) return best;
  if ((best?.[species] ?? 0) >= weight) return best;
  return { ...best, [species]: weight };
}

/** sea_records 행 [{species, weight}] 를 합쳐 어종별 최댓값. */
export function mergeBest(best, rows = []) {
  let out = best || {};
  for (const r of rows) out = bestAfterCatch(out, String(r?.species || ''), Number(r?.weight));
  return out;
}

/** 세이브에서 온 최고 기록 정제 — 아는 어종의 양수만. */
export function sanitizeBest(raw, speciesIds = []) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const id of speciesIds) if (Number.isFinite(raw[id]) && raw[id] > 0) out[id] = raw[id];
  return out;
}
