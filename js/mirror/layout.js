// =============================================================
//  🪞 거울 마을 — 좌표 표와 순수 규칙(THREE/DOM 없음 → Node 테스트: tests/mirror-layout.test.mjs)
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-10-08-mirror-village-design.md §3·§4
//  ▶ 좌표는 MIRROR(js/data/places.js) 기준 **로컬**(월드 = MIRROR + 로컬). 마을 쪽 상수(VILLAGE_*·LAKE_GATE)만 월드.
//  ▶ 카메라는 북쪽(-z)을 본다 → 화면 왼쪽 = 서쪽(-x), 앞 = 남쪽(+z). 단서의 왼/오는 이 기준.
//  ▶ 배치는 확정 시안 dev/active/mirror-village/mockups/village.html 의 L 표와 같다.
// =============================================================
export const WALK_R = 20.4;            // 가장자리 숲 링(20.5~) 안쪽까지만
export const PICK_R = 1.1;             // 물건 자동 줍기
export const TALK_R = 2.0;             // 주민에게 말 걸기
export const STOP_REACH = 2.4;         // 정류장 프롬프트

export const LANDMARKS = Object.freeze([
  { id: 'pond',  ko: '🪞 거울 연못',     en: '🪞 Mirror Pond',             x: 0,   z: 0 },
  { id: 'well',  ko: '🪣 우물',          en: '🪣 well',                    x: -8,  z: -2 },
  { id: 'clock', ko: '🕰️ 거꾸로 시계탑', en: '🕰️ upside-down clock tower', x: 7.5, z: -6.5 },
  { id: 'lamp',  ko: '🏮 등불 기둥',     en: '🏮 lantern post',            x: -6,  z: 7 },
  { id: 'stop',  ko: '🚏 거울 정류장',   en: '🚏 Mirror Stop',             x: 2.5, z: 15 },
].map(Object.freeze));

export const HOUSES = Object.freeze([{ x: -11, z: -10, ry: 0.3 }, { x: 11, z: 1.5, ry: -0.5 }, { x: 1, z: -14, ry: 0.05 }].map(Object.freeze));
// 주민 자리 — 순서 = farmer · angler · chef (js/spaces/mirror.js 가 이 순서로 세운다)
export const NPC_SPOTS = Object.freeze([{ x: -9, z: -6.6, ry: 0.5 }, { x: 8.4, z: 4.6, ry: -0.6 }, { x: 3.6, z: -10.6, ry: 0.1 }].map(Object.freeze));

// 숨는 자리 15곳 — 표지물에서 2.2~4 떨어진 덮개(덤불·바위·나무) 밑. 왼/오 10 · 앞/뒤 5
export const SPOTS = Object.freeze([
  { id: 'pond-l',  landmark: 'pond',  side: 'left',  cover: 'bush', x: -4.0,  z: 0.3 },
  { id: 'pond-r',  landmark: 'pond',  side: 'right', cover: 'rock', x: 4.0,   z: -0.3 },
  { id: 'pond-f',  landmark: 'pond',  side: 'front', cover: 'bush', x: 0.4,   z: 4.0 },
  { id: 'pond-b',  landmark: 'pond',  side: 'back',  cover: 'rock', x: -0.4,  z: -4.0 },
  { id: 'well-l',  landmark: 'well',  side: 'left',  cover: 'bush', x: -10.4, z: -1.6 },
  { id: 'well-r',  landmark: 'well',  side: 'right', cover: 'rock', x: -5.6,  z: -2.2 },
  { id: 'well-f',  landmark: 'well',  side: 'front', cover: 'tree', x: -8.2,  z: 0.6 },
  { id: 'clock-l', landmark: 'clock', side: 'left',  cover: 'bush', x: 5.1,   z: -6.2 },
  { id: 'clock-r', landmark: 'clock', side: 'right', cover: 'bush', x: 9.9,   z: -6.8 },
  { id: 'clock-b', landmark: 'clock', side: 'back',  cover: 'tree', x: 7.6,   z: -9.0 },
  { id: 'lamp-l',  landmark: 'lamp',  side: 'left',  cover: 'rock', x: -8.4,  z: 7.3 },
  { id: 'lamp-r',  landmark: 'lamp',  side: 'right', cover: 'bush', x: -3.6,  z: 6.8 },
  { id: 'lamp-f',  landmark: 'lamp',  side: 'front', cover: 'bush', x: -5.8,  z: 9.4 },
  { id: 'stop-l',  landmark: 'stop',  side: 'left',  cover: 'bush', x: -0.4,  z: 14.6 },
  { id: 'stop-r',  landmark: 'stop',  side: 'right', cover: 'rock', x: 5.4,   z: 14.4 },
].map(Object.freeze));
const SPOT_BY_ID = new Map(SPOTS.map(s => [s.id, s]));
export function spotOf(id) { return SPOT_BY_ID.get(id) ?? null; }

export const MIRROR_STOP_LOCAL = Object.freeze({ x: 2.5, z: 13.4 });   // 정류장 지붕 북쪽 앞 — 서면 「마을로 돌아가기」
export const MIRROR_LANDING = Object.freeze({ x: 2.5, z: 10.8 });      // 하차 뒤 서는 자리(연못을 본다)
export const MIRROR_PARK = Object.freeze({ x: 2.5, z: 18.4, heading: Math.PI / 2 });   // 정류장 남쪽 — 카메라 시선(높이≈4.5)보다 낮아 플레이어를 안 가린다
export const MIRROR_GATE_LOCAL = Object.freeze({ x: 0, y: 5.5, z: -2 });   // 거울 마을 쪽 🪞 거울 문(연못 위)

// 충돌 상자(로컬) — 연못(원 r3 를 상자로 근사)·집 3·우물·시계탑. 숨는 자리는 밖에 있어야 한다(테스트)
export const SOLIDS = Object.freeze([
  { x1: -2.7, z1: -2.7, x2: 2.7, z2: 2.7 },
  ...HOUSES.map(h => ({ x1: h.x - 1.6, z1: h.z - 1.4, x2: h.x + 1.6, z2: h.z + 1.4 })),
  { x1: -8.95, z1: -2.95, x2: -7.05, z2: -1.05 },
  { x1: 6.75, z1: -7.25, x2: 8.25, z2: -5.75 },
].map(Object.freeze));

export function isWalkable(x, z) { return Math.hypot(x, z) <= WALK_R + 1e-9; }
export function clampWalkable(x, z) {
  const d = Math.hypot(x, z);
  if (d <= WALK_R) return { x, z };
  const k = (WALK_R - 1e-4) / d;
  return { x: x * k, z: z * k };
}

// ── 마을 쪽(월드) — 정류장 MIRROR_STOP(16,0,17) · 호수 LAKE(16,9 r6) ──
export const VILLAGE_BOARD = Object.freeze({ x: 16, z: 15.6 });                          // 정류장 북쪽 앞(호수 남쪽 기슭) — 「거울 마을행 타기」·귀환 하차 자리
export const VILLAGE_PARK = Object.freeze({ x: 19.2, z: 16.6, heading: -Math.PI / 2 });  // 정류장 동쪽 — 낮엔 늘 서 있다(발견성)
export const LAKE_GATE = Object.freeze({ x: 16, y: 3.6, z: 9 });                         // 🪞 거울 문이 서는 자리(호수 위)
