// =============================================================
//  calm forest · 🚶 이웃 귀환 걷기 — 물을 건너지 않는 출발점 고르기 (순수 함수)
//  ------------------------------------------------------------
//  귀환 연출은 집에서 바깥으로 RETURN_EDGE 만큼 떨어진 곳에서 직선으로 걸어 들어온다(장애물 무시).
//  그 직선이 연못·호수·개울을 지나면 물 위를 걷는다 — 사공 오리가 나루터 연못 한가운데를
//  가로질러 오던 사고(2026-10-17 사용자 제보). 바깥 방향에서 시작해 각도를 조금씩 돌려 가며
//  물을 안 지나는 첫 방향을 쓴다.
//  ▶ 테스트: npm test (tests/world-return-path.test.mjs)
// =============================================================

/** 점 (px,pz) 에서 선분 (ax,az)-(bx,bz) 까지 거리 */
export function segDist(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, L = dx * dx + dz * dz;
  const t = L ? Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / L)) : 0;
  return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
}

/** 선분이 물 원(들)을 지나는가 — waters: [{x, z, r}] */
export function crossesWater(ax, az, bx, bz, waters, margin = 0.8) {
  return waters.some(w => segDist(w.x, w.z, ax, az, bx, bz) < w.r + margin);
}

// 바깥 방향(0°)부터 좌우로 번갈아 돌려 본다: 0, +25, -25, +50, -50 … ±175
const TRY_DEG = [0];
for (let d = 25; d <= 175; d += 25) TRY_DEG.push(d, -d);

/**
 * 귀환 출발점. 물을 안 지나는 방향이 없으면 바깥 방향 그대로(예전 동작).
 * @returns {{x:number, z:number}}
 */
export function returnStart(hx, hz, edge, waters, margin = 0.8) {
  const len = Math.hypot(hx, hz);
  const base = len > 3 ? Math.atan2(hz, hx) : Math.PI / 2;   // 중심 가까이 사는 이웃은 남쪽(+z, 카메라 쪽)에서
  for (const deg of TRY_DEG) {
    const a = base + deg * Math.PI / 180;
    const sx = hx + Math.cos(a) * edge, sz = hz + Math.sin(a) * edge;
    if (!crossesWater(sx, sz, hx, hz, waters, margin)) return { x: sx, z: sz };
  }
  return { x: hx + Math.cos(base) * edge, z: hz + Math.sin(base) * edge };
}
