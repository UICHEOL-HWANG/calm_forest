// =============================================================
//  calm forest · 🌉 무너진 다리 — 박물관 섬 개울·다리 판정 (순수 함수 — DOM/Three/import 없음)
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-10-16-world-unlocks-design.md §2 ④ (해금 4단계)
//  ▶ 🏛️ 박물관은 마을 서쪽 끝, 개울이 한 바퀴 두른 작은 섬 위에 있다. 들어가는 길은 동남쪽 다리 하나뿐.
//    다리가 무너져 있으면 섬에 못 건너간다 → 🪵10 🪨5 로 고치면 박물관·🧑‍🦳 큐레이터 할아버지가 돌아온다.
//  ▶ 해금이 꺼져 있거나(CONFIG.UNLOCKS 'off') 옛 세이브(legacy)면 **처음부터 고쳐진 다리** —
//    기존 유저는 박물관에 그대로 드나든다.
//  ▶ 개울은 고쳐진 뒤에도 물이다 — 다리 위로만 건넌다(그래야 다리가 의미가 있다).
//  ▶ 3D·상호작용은 js/spaces/bridge.js · 테스트: tests/world-bridge.test.mjs
// =============================================================

export const BRIDGE_COST = { wood: 10, stone: 5 };

// 섬 중심 — 박물관(MUSEUM_GATE -26,5) 기단 7.2×5.4 + 계단·화분·큐레이터 자리(-23.9,9.9)가 다 안에 들도록 약간 북쪽
export const ISLE = { x: -26.3, z: 4.8 };
export const ISLE_R = 7.0;            // 개울 중심선 반지름(물결 ±0.25)
export const STREAM_HALF = 0.75;      // 물 폭의 절반
export const BANK_W = 0.4;            // 물가 모래 띠
export const BRIDGE_ANG = 0.42;       // 다리 방향(라디안, +x 기준 · +z 쪽으로) — 동남쪽: ⛏️광산 입구에서 걸어오면 정면
export const BRIDGE_HALF_W = 0.55;    // 다리 위 걸을 수 있는 폭의 절반
const PAD = 0.28;                      // 캐릭터 몸 반경 — 물가 끝에 발이 빠지지 않게

/** 개울 중심선 반지름 — 각도마다 살짝 굽이친다(완전한 원이면 해자처럼 보여서) */
export function streamR(a) {
  return ISLE_R + 0.17 * Math.sin(3 * a + 0.8) + 0.08 * Math.sin(5 * a + 2.1);
}

/** 다리 축 위의 점(섬 중심에서 r 만큼) */
export function bridgePoint(r) {
  return { x: ISLE.x + Math.cos(BRIDGE_ANG) * r, z: ISLE.z + Math.sin(BRIDGE_ANG) * r };
}

/** 마을 쪽 다리 머리 — 표지판·수리 상호작용 자리 */
export function bridgeFoot() {
  return bridgePoint(streamR(BRIDGE_ANG) + STREAM_HALF + 1.1);
}

/**
 * 다리가 무너져 있는가 — 해금 켜짐 + 새 세이브(legacy 아님) + 아직 안 고침.
 *   꺼짐·옛 세이브·이미 고침이면 false(= 고쳐진 다리, 길이 열려 있다).
 */
export function bridgeBroken(state, unlocksOn) {
  const u = state?.unlocks;
  return !!unlocksOn && !!u && !u.legacy && !u.flags?.bridge;
}

/** 수리 재료 부족 목록 — [[키, 필요, 가진 것]] (빈 배열 = 고칠 수 있다) */
export function bridgeLack(inv) {
  return Object.entries(BRIDGE_COST).filter(([k, v]) => (inv?.[k] || 0) < v).map(([k, v]) => [k, v, inv?.[k] || 0]);
}

/**
 * 개울 충돌 — 플레이어 위치(x,z)를 받아 밀려난 위치를 돌려준다(그대로면 같은 값).
 *   · 물 띠(±STREAM_HALF + 몸) 안이면 가까운 물가로 민다.
 *   · 다리가 고쳐져 있으면 다리 위(축에서 BRIDGE_HALF_W 안)는 통과 — 다리 위에선 옆으로도 못 떨어진다(난간).
 *   · 다리가 무너졌는데 섬 안에 있으면(순간이동 등) 바깥 물가로 내보낸다 — 갇히지 않게.
 */
export function streamStop(x, z, broken) {
  const dx = x - ISLE.x, dz = z - ISLE.z, d = Math.hypot(dx, dz);
  if (d < 0.001) return broken ? bridgeFoot() : { x, z };
  const a = Math.atan2(dz, dx), R = streamR(a);
  const ux = dx / d, uz = dz / d;
  const inner = R - STREAM_HALF - PAD, outer = R + STREAM_HALF + PAD;
  if (broken && d < outer) return { x: ISLE.x + ux * outer, z: ISLE.z + uz * outer };
  if (d <= inner || d >= outer) return { x, z };
  // 다리 축 좌표계 — along(섬 중심에서 바깥으로), side(옆)
  const bx = Math.cos(BRIDGE_ANG), bz = Math.sin(BRIDGE_ANG);
  const along = dx * bx + dz * bz, side = -dx * bz + dz * bx;
  if (along > 0 && Math.abs(side) < BRIDGE_HALF_W + 0.6) {   // 다리 근처 — 다리 폭 안으로 붙잡는다(난간)
    const s = Math.max(-BRIDGE_HALF_W, Math.min(BRIDGE_HALF_W, side));
    return { x: ISLE.x + bx * along - bz * s, z: ISLE.z + bz * along + bx * s };
  }
  const r = d - R < 0 ? inner : outer;
  return { x: ISLE.x + ux * r, z: ISLE.z + uz * r };
}

/** 이 자리가 개울(+물가) 위인가 — 나무·꽃·밭이 물에 박히지 않게(마을 배치 제외용) */
export function onStream(x, z, margin = 0) {
  const dx = x - ISLE.x, dz = z - ISLE.z, d = Math.hypot(dx, dz);
  return Math.abs(d - streamR(Math.atan2(dz, dx))) < STREAM_HALF + BANK_W + margin;
}
