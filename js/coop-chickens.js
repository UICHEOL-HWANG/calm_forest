// =============================================================
//  calm forest · 🐔 닭장 닭 행동 규칙 (순수 함수 — DOM/Three 의존 없음)
//  ------------------------------------------------------------
//  버그: 닭이 목적지를 펜 안 아무 데나 뽑아 **오두막 벽을 뚫고** 지나다녔다.
//  ▶ 오두막·모이통 자국은 못 지나간다(마을 충돌과 같은 "가장 얕은 쪽으로 밀어내기").
//  ▶ 대신 이따금 앞문으로 **들어갔다 나온다** — 문턱에서 작아졌다 커져 벽을 스치지 않는다.
//  ▶ 좌표는 전부 **닭장 그룹 로컬**(월드 COOP 기준 상대). 오두막 1.7×1.4 @(-0.85,-0.55).
//  ▶ 테스트: npm test (tests/coop-chickens.test.mjs)
// =============================================================

// 펜 안쪽(말뚝 ±1.6/±1.3 에서 닭 몸통만큼 뺀 범위) — 목적지를 뽑는 구역
export const COOP_PEN = { x1: -1.35, z1: -1.05, x2: 1.35, z2: 1.05 };
// 지나갈 수 없는 자국 — 오두막(1.7×1.4 @-0.85,-0.55) · 모이통(0.7×0.3 @0.7,-0.9)
export const COOP_HUT = { x1: -1.7, z1: -1.25, x2: 0, z2: 0.15 };
export const COOP_TROUGH = { x1: 0.35, z1: -1.05, x2: 1.05, z2: -0.75 };
export const CHICK_R = 0.24;              // 닭 몸통 반경(밀어내기 여유)

export const COOP_DOOR = { x: -0.85, z: 0.15 };             // 오두막 앞면 문(=벽면 z)
const DOOR_OUT = { x: COOP_DOOR.x, z: COOP_DOOR.z + 0.70 }; // 문 앞 마당(여기서 몸을 돌린다)
const DOOR_IN = { x: COOP_DOOR.x, z: COOP_DOOR.z + 0.03 };  // 문턱 안쪽(여기서 사라진다)
const DOOR_FADE = 0.45;                   // 문턱 앞 이 거리 안에서 작아진다

const YARD_SPEED = 0.55, DOOR_SPEED = 0.5;
const REST = [6, 18];                     // 오두막 안에 머무는 시간(초)
const IN_EVERY = [14, 36];                // 마당에서 이만큼 놀면 한 번 들어간다(초)
const ARRIVE = 0.06;                      // 도착 판정
const BOB = 0.045;                        // 종종걸음 통통 높이

// 첫 배치 — 오두막·모이통을 피한 마당 자리(예전 기본값은 오두막 자국 안이었다)
export const CHICK_SPAWN = [{ x: -0.9, z: 0.85 }, { x: 0.55, z: 0.75 }, { x: 1.05, z: -0.2 }];

const rangeAt = ([lo, hi], rnd) => lo + rnd() * (hi - lo);
const inRect = (r, x, z, pad = 0) => x > r.x1 - pad && x < r.x2 + pad && z > r.z1 - pad && z < r.z2 + pad;

/** 문턱 앞에서의 크기 — 벽에 닿기 전에 0 에 가까워져 몸이 벽을 스치지 않는다. */
export function doorScale(z) {
  return Math.max(0.06, Math.min(1, (z - COOP_DOOR.z) / DOOR_FADE));
}

/** 마당에서 갈 만한 자리 하나 — 오두막·모이통 자국은 피한다. */
export function yardTarget(rnd = Math.random) {
  for (let i = 0; i < 16; i++) {
    const x = COOP_PEN.x1 + rnd() * (COOP_PEN.x2 - COOP_PEN.x1);
    const z = COOP_PEN.z1 + rnd() * (COOP_PEN.z2 - COOP_PEN.z1);
    if (!inRect(COOP_HUT, x, z, CHICK_R) && !inRect(COOP_TROUGH, x, z, CHICK_R)) return { x, z };
  }
  return { x: 0.9, z: 0.8 };   // 추첨이 계속 막힐 때의 안전판(늘 비어 있는 마당 앞쪽)
}

/**
 * 오두막·모이통 안으로 파고든 닭을 가장 얕은 쪽으로 밀어낸다(마을 충돌과 같은 문법).
 *   ⚠️ 마을 충돌과 다른 점 두 가지 —
 *   ① 나갈 면은 **펜 안에 있는 면만** 고른다. 오두막은 왼쪽 벽(x -1.7)이 울타리(-1.6)보다
 *      더 나와 있어, 그냥 가장 얕은 면을 고르면 닭이 울타리 밖으로 밀려난다.
 *   ② 두 자국은 x 0.11~0.24 에서 겹친다. 한 번만 밀면 오두막에서 나온 자리가 모이통 안이라
 *      모서리에 낀 채 떨 수 있어, 더 움직일 게 없을 때까지 돌린다.
 */
export function pushOutOfCoop(p) {
  for (let pass = 0; pass < 4; pass++) {
    let moved = false;
    for (const r of [COOP_HUT, COOP_TROUGH]) {
      const x1 = r.x1 - CHICK_R, x2 = r.x2 + CHICK_R, z1 = r.z1 - CHICK_R, z2 = r.z2 + CHICK_R;
      if (p.x <= x1 || p.x >= x2 || p.z <= z1 || p.z >= z2) continue;
      const faces = [
        { d: p.x - x1, ax: 'x', v: x1 }, { d: x2 - p.x, ax: 'x', v: x2 },
        { d: p.z - z1, ax: 'z', v: z1 }, { d: z2 - p.z, ax: 'z', v: z2 },
      ].filter(f => f.ax === 'x' ? (f.v >= COOP_PEN.x1 && f.v <= COOP_PEN.x2)
                                 : (f.v >= COOP_PEN.z1 && f.v <= COOP_PEN.z2));
      const pick = (faces.length ? faces : [{ d: 0, ax: 'x', v: x2 }])
        .reduce((a, b) => (b.d < a.d ? b : a));
      p[pick.ax] = pick.v;
      moved = true;
    }
    if (!moved) break;
  }
  return p;
}

/** 닭 한 마리의 런타임 상태(메시와 1:1). st: yard→door→in→rest→out→yard */
export function makeChickenState(i, rnd = Math.random) {
  const p = CHICK_SPAWN[i % CHICK_SPAWN.length];
  const t = yardTarget(rnd);
  return {
    st: 'yard', x: p.x, z: p.z, ry: 0, bob: 0, scale: 1, visible: true,
    tx: t.x, tz: t.z, wait: rnd() * 2, inAt: rangeAt(IN_EVERY, rnd), phase: rnd() * 6,
  };
}

// 목적지로 한 걸음 — 도착했으면 true
function walk(c, tx, tz, sp, dt) {
  const dx = tx - c.x, dz = tz - c.z, d = Math.hypot(dx, dz);
  if (d < ARRIVE) return true;
  c.x += (dx / d) * dt * sp;
  c.z += (dz / d) * dt * sp;
  c.ry = Math.atan2(dx, dz);
  return false;
}

/**
 * 한 프레임 — 상태를 제자리에서 갱신한다(게임 루프라 새 객체를 만들지 않는다).
 *   list: makeChickenState() 들
 */
export function stepChickens(list, dt, rnd = Math.random) {
  // 마당이 텅 비지 않게 드나드는 건 한 번에 한 마리 — 문 앞으로 걸어가는 중(door)도 자리를 차지한다
  let busy = list.reduce((n, c) => n + (c.st === 'yard' ? 0 : 1), 0);
  for (const c of list) {
    c.phase += dt * 8;

    if (c.st === 'rest') {                       // 🏠 오두막 안 — 안 보이는 채로 쉰다
      c.bob = 0;
      c.wait -= dt;
      if (c.wait <= 0) {                         // 문턱에 다시 나타나 마당으로
        c.st = 'out'; c.visible = true;
        c.x = DOOR_IN.x; c.z = DOOR_IN.z; c.scale = doorScale(c.z);
      }
      continue;
    }

    if (c.st === 'in' || c.st === 'out') {       // 🚪 문턱 — 들어가며 작아지고 나오며 커진다
      const to = c.st === 'in' ? DOOR_IN : DOOR_OUT;
      const done = walk(c, to.x, to.z, DOOR_SPEED, dt);
      c.bob = Math.abs(Math.sin(c.phase)) * BOB;
      c.scale = doorScale(c.z);
      if (!done) continue;
      if (c.st === 'in') {
        c.visible = false; c.scale = 1; c.bob = 0;
        c.st = 'rest'; c.wait = rangeAt(REST, rnd);
      } else {
        c.scale = 1; c.st = 'yard'; c.wait = 0; c.inAt = rangeAt(IN_EVERY, rnd);
        const t = yardTarget(rnd); c.tx = t.x; c.tz = t.z;
      }
      continue;
    }

    if (c.st === 'door') {                       // 🚪 문 앞으로 — 모서리는 스치지 않게 밀어내며
      if (walk(c, DOOR_OUT.x, DOOR_OUT.z, YARD_SPEED, dt)) {
        c.x = DOOR_OUT.x; c.z = DOOR_OUT.z;      // 문 한가운데로 맞춘 뒤 곧게 들어간다
        c.st = 'in'; continue;
      }
      pushOutOfCoop(c);
      c.bob = Math.abs(Math.sin(c.phase)) * BOB;
      continue;
    }

    // 🐔 마당 — 도착하면 잠깐 모이 쪼기(대기) 후 새 목적지
    c.inAt -= dt;
    if (c.wait > 0) { c.wait -= dt; c.bob = 0; continue; }
    if (c.inAt <= 0) {
      if (busy === 0) { c.st = 'door'; busy++; continue; }
      c.inAt = 1 + rnd() * 3;                    // 다른 닭이 드나드는 중 — 곧 다시 본다(순서가 한쪽으로 쏠리지 않게)
    }
    if (walk(c, c.tx, c.tz, YARD_SPEED, dt)) {
      c.wait = 0.8 + rnd() * 2.2;
      const t = yardTarget(rnd); c.tx = t.x; c.tz = t.z;
      c.bob = 0;
      continue;
    }
    pushOutOfCoop(c);                            // 🚧 오두막·모이통 모서리를 스치면 밖으로
    c.bob = Math.abs(Math.sin(c.phase)) * BOB;
  }
  return list;
}
