// js/pet/rules.js
// =============================================================
//  calm forest · 🐾 지시형 펫 규칙 (순수 함수 — THREE/DOM 의존 없음)
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-09-21-cosmetics-pet-design.md §6·§7·§8
//
//  ⚠️ 이 모듈이 지켜야 할 **하나**: 펫은 🧑‍🌾일꾼을 죽이면 안 된다.
//     일꾼의 값어치는 "접속을 끊어도 12시간 알아서 일한다"(MAX_CATCHUP_H)이다.
//     그래서 펫은 — 지시받아야 움직이고 · 플레이어 반경 안만 · 오프라인엔 아무것도 안 한다.
//     **여기에 오프라인 정산을 넣지 마라.** 넣는 순간 일꾼 경제가 무너진다.
//
//  ▶ 수확·파종을 하지 않는다. 수확은 보상이라 대신하면 제일 기분 좋은 순간을 파는 게 된다.
//  ▶ 성장은 **외형만** 바꾼다. 능력이 같이 자라면 위 경계가 다시 흐려진다.
//  ▶ 테스트: npm test (tests/pet-rules.test.mjs) — 밸런스 수치를 여기 못박는다.
// =============================================================

export const PET_PRICE = 3000;      // 🪙 — 꾸미기 최고가(2,600)보다 비싸다
export const PET_RADIUS = 4.5;      // 플레이어 기준 반경. 밭 전체는 일꾼의 몫
export const PET_TASKS = Object.freeze(['water', 'weed', 'pest']);
export const GROW_NEED = Object.freeze([0, 40, 140]);   // 일꾼(0/120/400)보다 낮다
export const WORK_SEC = 2.5;        // 한 칸 처리 시간
export const REST_SEC = 20;         // 쿨다운 — 일급이 없는 대신 이게 브레이크다
export const CHAIN_MAX = 5;         // 한 번 시키면 최대 몇 칸

export function emptyPet(kind) {
  return { kind, name: '', works: 0, restUntil: 0 };
}

export function stageOf(works) {
  let s = 0;
  for (let i = 0; i < GROW_NEED.length; i++) if ((works || 0) >= GROW_NEED[i]) s = i;
  return s;
}

export function toNextStage(works) {
  const next = GROW_NEED[stageOf(works) + 1];
  return next === undefined ? null : Math.max(0, next - (works || 0));
}

export function canCommand(pet, now) {
  return !!pet && now >= (pet.restUntil || 0);
}

/** 반경 안에서 가장 급한 잡일 하나. 없으면 null */
export function pickPetTask(plots, center, radius) {
  const r2 = radius * radius;
  const near = (plots || []).filter(p => {
    const dx = p.x - center.x, dz = p.z - center.z;
    return dx * dx + dz * dz <= r2;
  });
  // 1. 💧 목마른 밭 — 잡초가 덮인 밭은 물을 줘도 안 자란다
  const thirsty = near.filter(p => p.state === 'growing' && !p.wet && !p.weed)
    .sort((a, b) => (a.wiltAt ?? Infinity) - (b.wiltAt ?? Infinity));
  if (thirsty.length) return { type: 'water', i: thirsty[0].i };
  // 2. 🌿 잡초
  const weed = near.find(p => p.weed);
  if (weed) return { type: 'weed', i: weed.i };
  // 3. 🐛 해충
  const pest = near.find(p => p.pest);
  if (pest) return { type: 'pest', i: pest.i };
  return null;   // 🌾수확·🌰파종은 여기 없다 — 일부러다
}

export function afterWork(pet, done, now) {
  const n = Math.max(0, Math.min(CHAIN_MAX, done | 0));
  return { ...pet, works: (pet.works || 0) + n, restUntil: now + REST_SEC * 1000 };
}
