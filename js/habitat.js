// =============================================================
//  calm forest · 🦋 텃밭 방문객 서식 규칙 (순수 함수 — DOM/Three 의존 없음)
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-09-17-habitat-design.md
//  ▶ 레시피를 짜지 않는다. 태그 점수를 합산해 **하한선**으로 판정한다.
//    "정확히 이 배치" 를 요구하면 체크리스트가 된다 — 대충 꽃밭이면 나비가 온다.
//  ▶ ⚠️ 태그 소스는 **세이브에 남는 것만** 쓴다.
//    밭칸의 물 준 상태는 런타임 전용이고 흙은 9초만 촉촉하다(game.js 의 WET_TIME).
//    스폰 지연이 6~14초라 그걸 damp 소스로 쓰면 🐸 는 뜨기도 전에 조건이 사라진다.
//    (tests/habitat.test.mjs 가 이 파일에 해당 이름이 등장하는지로 잠근다)
//  ▶ 좌표는 전부 **월드**. perimeterTrees() 는 밭 로컬이라 호출부가 FARM 을 더해서 넘긴다.
//  ▶ 테스트: npm test (tests/habitat.test.mjs)
// =============================================================

export const TAGS = ['nectar', 'light', 'shelter', 'damp', 'shade', 'food', 'fear'];

/** 미터·힌트에 쓰는 한국어 라벨 — 사용자 노출 문구의 단일 출처(index.html 이 가져다 쓴다) */
export const TAG_LABEL = {
  nectar:  '🌷 꽃',
  light:   '🏮 빛',
  shelter: '🧱 은신처',
  damp:    '💧 물기',
  shade:   '🌑 그늘',
  food:    '🌾 먹이',
  fear:    '🎃 공포',
};

/**
 * 야외 장식 id → 환경 태그. 값과 반경은 소스마다 다르다.
 *  · 일반 3 — CELL=2 이므로 정확히 3×3 밭칸
 *  · 🎃 fear 6 — 환경 반경의 2배. 밤손님 방어(반경 9, game.js 의 computeNightDefense)와 분리했다.
 *    허수아비를 울타리 밖으로 물리면(중심에서 8) 방어는 유지되고 방문객은 안 쫓는다.
 *    이 비대칭이 "희생 없는 배치 문제" 를 만든다 — 9 로 맞추면 작물을 잃는 벌칙이 되고,
 *    3 으로 낮추면 바로 옆 칸만 피하면 돼 허수아비가 설계 요소로서 의미를 잃는다.
 *  · 💧 well 5 — 시설 자체의 효과 반경(farm-building.js 의 well.radius)과 같은 숫자를 쓴다
 */
export const ENV_TAG = {
  flowerbed:  { tag: 'nectar',  value: 2, radius: 3 },
  postlamp:   { tag: 'light',   value: 2, radius: 3 },
  brazier:    { tag: 'light',   value: 2, radius: 3 },
  spiritlamp: { tag: 'light',   value: 2, radius: 3 },
  stonewall:  { tag: 'shelter', value: 2, radius: 3 },
  fence:      { tag: 'shelter', value: 1, radius: 3 },
  well:       { tag: 'damp',    value: 3, radius: 5 },
  scarecrow:  { tag: 'fear',    value: 3, radius: 6 },
};

/** 장식이 아닌 소스 */
export const CROP_FOOD  = { value: 2, radius: 3 };   // 다 자란 밭칸(state === 'mature')
export const TREE_SHADE = { value: 2, radius: 8 };   // 울타리 둘레 나무
export const RAIN_DAMP  = 2;                          // 🌧️ 비 오는 날 — 밭 전체

// ⚠️ TREE_SHADE.radius 를 줄이면 그늘이 밭에 닿지 않는다.
//    perimeterTrees() 는 나무를 울타리에서 **정확히 5.0 바깥**에 세운다(farm-stage.js).
//    세 단계(half 6·9·11) 전부 같은 간격이다. 실측한 밭 내부 그늘 비율:
//      반경 6  →  4% /  2% /  1%   (🦔·🐸 를 사실상 못 찾는다)
//      반경 8  → 28% / 14% / 10%   ← 채택. 바깥 약 3 유닛 링
//      반경 10 → 58% / 35% / 24%   (1단계 절반이 그늘 — "가장자리" 라는 설계가 사라진다)
//    남쪽 출입구와 서쪽 측량소 마당은 나무를 건너뛰므로 그쪽엔 그늘이 없다(의도된 결).

/**
 * 방문객 4종. need 는 하한선, block 은 상한선(그 값 **이상**이면 안 온다).
 * when: 'day' | 'night' | 'rain'
 * 난이도는 🦋(꽃밭 2개) → 🐦(작물 하나) → 🦔(가장자리 돌담 2개·밤) → 🐸(우물+가장자리+비) 순으로 깊어진다.
 */
export const VISITORS = [
  { id: 'butterfly', ico: '🦋', name: '호랑나비', need: { nectar: 3 },            block: { fear: 1 }, when: 'day',   hint: '꽃이 많은 곳' },
  { id: 'sparrow',   ico: '🐦', name: '참새',     need: { food: 2 },              block: { fear: 1 }, when: 'day',   hint: '먹을 게 익은 곳' },
  { id: 'hedgehog',  ico: '🦔', name: '고슴도치', need: { shelter: 3, shade: 2 },                     when: 'night', hint: '숨을 데가 있는 어두운 곳' },
  { id: 'frog',      ico: '🐸', name: '청개구리', need: { damp: 4, shade: 1 },                        when: 'rain',  hint: '축축하고 그늘진 곳' },
];

export function visitorOf(id) { return VISITORS.find(v => v.id === id) || null; }

const dist = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);

/**
 * 한 지점의 환경 점수.
 * @param {{decor?:{id,x,z}[], mature?:{x,z}[], trees?:{x,z}[], rain?:boolean}} src 월드 좌표
 * @returns {Record<string, number>} 모든 TAGS 키가 채워진다 — 호출부가 undefined 를 안 만나게
 */
export function envAt(src, x, z) {
  const env = {};
  for (const t of TAGS) env[t] = 0;
  for (const d of src.decor || []) {
    const def = ENV_TAG[d.id];
    if (def && dist(d.x, d.z, x, z) <= def.radius) env[def.tag] += def.value;
  }
  for (const c of src.mature || []) {
    if (dist(c.x, c.z, x, z) <= CROP_FOOD.radius) env.food += CROP_FOOD.value;
  }
  for (const t of src.trees || []) {
    if (dist(t.x, t.z, x, z) <= TREE_SHADE.radius) env.shade += TREE_SHADE.value;
  }
  if (src.rain) env.damp += RAIN_DAMP;
  return env;
}

/** @param {{night:boolean, rain:boolean}} ctx */
export function whenOk(when, ctx) {
  if (when === 'day')   return !ctx.night;
  if (when === 'night') return !!ctx.night;
  if (when === 'rain')  return !!ctx.rain;   // 개구리는 밤에도 운다 — 시간대를 더 걸지 않는다
  return true;
}

export function meets(v, env) {
  for (const [k, n] of Object.entries(v.need)) if ((env[k] || 0) < n) return false;
  for (const [k, n] of Object.entries(v.block || {})) if ((env[k] || 0) >= n) return false;
  return true;
}

export function matchVisitors(env, ctx) {
  return VISITORS.filter(v => whenOk(v.when, ctx) && meets(v, env));
}

/** need 충족률 0~1. block 은 안 본다 — "얼마나 왔나" 와 "왜 막혔나" 는 다른 질문이다. */
export function progressOf(v, env) {
  const parts = Object.entries(v.need).map(([k, n]) => Math.min(1, (env[k] || 0) / n));
  return parts.reduce((a, b) => a + b, 0) / parts.length;
}

/**
 * 막는 요인 **하나**. 정답을 알려주지 않고 방향만 알려준다.
 * block 위반을 먼저 집는다 — 치우면 바로 오기 때문에 가장 행동 가능한 힌트다.
 */
export function blockerOf(v, env) {
  for (const [k, n] of Object.entries(v.block || {})) if ((env[k] || 0) >= n) return k;
  let worst = null, worstRatio = Infinity;
  for (const [k, n] of Object.entries(v.need)) {
    const r = (env[k] || 0) / n;
    if (r < 1 && r < worstRatio) { worstRatio = r; worst = k; }
  }
  return worst;
}

export const NEAR_MISS_RATIO = 0.7;

/**
 * "거의 다 왔다" 신호 — 침묵 실패를 막는 장치.
 * 목표치를 안 보여주는 대신, 70% 이상 채운 **미발견** 종의 막는 요인 하나를 집어 준다.
 * @param {Record<string, any>} known gameState.dex.visitor
 */
/**
 * 미터에 뿌릴 줄 목록 — 태그마다 현재치·목표치·충족 여부.
 * ⚠️ 점 개수만 보여주면 "4개가 많은 건가" 를 알 수 없다(2026-09-18 사용자 지적).
 * block 태그는 need 가 0 이고 block:true 로 온다 — UI 가 "없어야 해요" 로 쓴다.
 */
export function needRows(v, env) {
  const rows = Object.entries(v.need).map(([tag, need]) => ({
    tag, have: env[tag] || 0, need, block: false, ok: (env[tag] || 0) >= need,
  }));
  for (const [tag, n] of Object.entries(v.block || {})) {
    rows.push({ tag, have: env[tag] || 0, need: 0, block: true, ok: (env[tag] || 0) < n });
  }
  return rows;
}

/**
 * 이 자리에 대해 미터가 할 말.
 *   kind 'match' — 지금 조건이면 이 종이 온다
 *   kind 'near'  — 제일 가까운 종과 막는 요인 하나
 *   kind 'none'  — 실마리가 없다(빈 미터)
 * 아직 못 만난 종을 먼저 권한다 — 이미 만난 종을 또 권하면 수집이 안 나아간다.
 */
export function spotInfo(env, ctx, known = {}) {
  const ok = matchVisitors(env, ctx);
  if (ok.length) {
    const v = ok.find(x => !known[x.id]) || ok[0];
    return { kind: 'match', visitor: v, rows: needRows(v, env), blocker: null };
  }
  let best = null;
  for (const v of VISITORS) {
    if (!whenOk(v.when, ctx)) continue;      // 지금 못 할 일을 권하지 않는다
    const p = progressOf(v, env);
    if (p <= 0) continue;                    // 아무 실마리도 없는 종은 후보가 아니다
    const fresh = known[v.id] ? 0 : 1;       // 미발견 우선
    if (!best || fresh > best.fresh || (fresh === best.fresh && p > best.p)) best = { v, p, fresh };
  }
  if (!best) return { kind: 'none', visitor: null, rows: [], blocker: null };
  return { kind: 'near', visitor: best.v, rows: needRows(best.v, env), blocker: blockerOf(best.v, env) };
}

export function nearMiss(env, ctx, known = {}) {
  let best = null;
  for (const v of VISITORS) {
    if (known[v.id]) continue;            // 발견한 종은 도감에 조건이 다 공개돼 있다
    if (!whenOk(v.when, ctx)) continue;   // 지금 할 수 있는 것만 말해준다
    if (meets(v, env)) continue;          // 곧 온다 — 힌트가 필요 없다
    const progress = progressOf(v, env);
    if (progress < NEAR_MISS_RATIO) continue;
    if (!best || progress > best.progress) best = { visitor: v.id, blocker: blockerOf(v, env), progress };
  }
  return best;
}
