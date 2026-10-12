// =============================================================
//  calm forest · 🧪 E1 첫 5분 수확 실험 — 규칙 (순수 함수 — DOM/Three 의존 없음)
//  ------------------------------------------------------------
//  ▶ 사전등록(고정 2026-10-12): analytics/metrics-framework 브랜치
//    dev/active/metrics-framework/first5min-harvest-experiment-prereg.md — 기준은 여기서 고치지 않는다
//  ▶ 대조(control) = 지금 그대로 · 처치(harvest_start) = 신규가 다 자란 밭 앞에서 시작,
//    첫 안내는 "👆 눌러서 수확하기" 하나(시안 B 말풍선, 2026-10-12 사용자 승인)
//  ▶ 배정: 기기(client_id) 해시 50:50, 플랫폼(web·toss)마다 솔트를 달리해 따로 나눈다(층화).
//    신규(세이브 없음)만 등록하고, 등록 기록(기기·세이브)으로 재방문에도 같은 무리를 유지한다.
//  ▶ 게임 연결은 js/spaces/e1-start.js · 테스트: tests/exp-e1.test.mjs, tests/e1-wiring.test.mjs
// =============================================================

export const ARMS = ['control', 'harvest_start'];
export const E1_PLATFORMS = ['web', 'toss'];          // 안드로이드·iOS 는 플랫폼 태깅이 갖춰지면 따로 결정
export const NEW_KINDS = ['empty', 'offline', 'failed_fresh'];   // js/save-guard.js — 세이브 없이 입장하는 판정
export const E1_STORE_KEY = 'cf_e1';                  // localStorage — { arm, platform }

// 정의서 §2 획득 행동 16종 — exp_arm 을 덧붙여 주 지표(5분 안 첫 획득)를 무리별로 바로 센다
export const ACQ_EVENTS = [
  'harvest_crop', 'coop_collect', 'honey_collect',
  'fishing_catch', 'sea_catch', 'firefly_catch', 'forage_pick', 'mine_ore',
  'craft_item', 'craft_claim', 'cooking_result', 'cafe_serve', 'carve_result',
  'quest_complete', 'star_result', 'duel_result',
];

// 처치 밭 — FARM 기준 오프셋. 2×2 다 자란 당근(짝수 격자 = tryHoe 와 같은 규칙)
export const E1_PLOTS = [[0, -2], [2, -2], [0, 0], [2, 0]];
export const E1_CROP = 'carrot';
export const E1_SPAWN = [0, 1.4];                     // 앞줄 왼쪽 밭(0,0) 바로 아래, 북쪽을 보고 선다 — 자동 수확 반경(1.8) 안이라 첫 액션 = 수확
export const E1_TUTORIAL_DELAY_MS = 1400;             // 첫 수확 연출(열매 번쩍)을 본 뒤 환영 모달

const isArm = (a) => ARMS.includes(a);

// FNV-1a 32bit — 'e1:<platform>:<clientId>'. assignVariant(31 곱셈 h&1)·aiBucket('ai:')과 섞이지 않게 별도 솔트
export function armFor(clientId, platform) {
  const s = `e1:${platform || 'web'}:${clientId || ''}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  h ^= h >>> 16; h = Math.imul(h, 0x7feb352d); h ^= h >>> 15;   // 마무리 섞기 — 끝자리만 다른 id 도 고르게
  return ARMS[(h >>> 0) & 1];
}

/**
 * 이번 부팅의 실험 판정.
 *   ⚠️ 해시(hashed)는 어떤 분기보다 먼저 구한다 — 옛 variant 사고(배정 전에 return)를 구조로 막는다.
 * @returns {{ hashed: string, enrolled: boolean, arm: string|null, first: boolean, reason: string }}
 */
export function decideE1({ clientId, platform, loadKind, saved = null, stored = null, forced = null } = {}) {
  const hashed = armFor(clientId, platform);
  const out = (enrolled, arm, first, reason) => ({ hashed, enrolled, arm: enrolled ? arm : null, first, reason });
  if (isArm(forced)) return out(true, forced, !stored && !saved?.e1, 'forced');    // QA ?e1= (dev 세션 — 기록 없음)
  if (!E1_PLATFORMS.includes(platform)) return out(false, null, false, 'platform');
  if (isArm(saved?.e1?.arm)) return out(true, saved.e1.arm, false, 'save');        // 다른 기기에서 로그인해도 같은 무리
  if (isArm(stored?.arm)) return out(true, stored.arm, false, 'device');           // 같은 기기 재방문
  if (saved) return out(false, null, false, 'existing');                          // 기존 유저 — 등록 안 함
  if (NEW_KINDS.includes(loadKind)) return out(true, hashed, true, 'new');
  return out(false, null, false, 'unknown');
}

export function parseStored(raw) {
  try {
    const v = JSON.parse(raw);
    return v && typeof v === 'object' && !Array.isArray(v) && isArm(v.arm) ? { arm: v.arm, platform: String(v.platform || '') } : null;
  } catch { return null; }
}

// 세이브의 e1 필드 — 낯선 값은 버린다(세이브는 클라이언트 권위)
export function sanitizeE1(v) {
  if (!v || typeof v !== 'object' || !isArm(v.arm)) return null;
  return { arm: v.arm, seeded: !!v.seeded, harvested: !!v.harvested };
}

// 처치 밭은 처치 무리의 신규에게, 한 번만
export function shouldSeed(decision, e1State) {
  return !!(decision?.enrolled && decision.arm === 'harvest_start' && decision.first && !e1State?.seeded);
}

// 처치가 진행 중(밭은 깔렸고 아직 첫 수확 전)
export function isPending(e1State) {
  return !!(e1State && e1State.arm === 'harvest_start' && e1State.seeded && !e1State.harvested);
}

// 처치 밭의 판매가(코인) — 경제 가드레일. 기본 작물 1개 = SELL_PRICE.crop
export function seedCoinValue(sellPrice) {
  return E1_PLOTS.length * (sellPrice?.crop || 0);
}

// 안내 문구(한국어 원문 = i18n 키) — 터치는 "눌러서", PC 는 Space·클릭
export function e1Prompt(touch) {
  return touch ? '👆 눌러서 수확하기' : '👆 Space·클릭으로 수확하기';
}

// GA4 페이로드에 exp_arm 을 덧붙인 새 객체. 획득 이벤트만, 25개 한도를 넘기면 붙이지 않는다(다른 값을 밀어내지 않게)
export function withExpArm(name, payload, arm, limit = 25) {
  if (!isArm(arm) || !ACQ_EVENTS.includes(name)) return payload;
  const sent = Object.values(payload || {}).filter(v => v !== null && v !== undefined).length;
  return sent + 1 > limit ? payload : { ...payload, exp_arm: arm };
}
