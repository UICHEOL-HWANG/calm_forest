// =============================================================
//  🎣 바다터 조준 — "보고 던지면 그게 걸린다"
//  ------------------------------------------------------------
//  입장 프롬프트는 처음부터 '🎣 던지기 — 물고기를 보고!' 라고 말해 왔는데,
//  구현은 거리만 봤다(가장 가까운 물고기를 자동 조준). 부두는 폭 3.4 로 좁고
//  populateSeaFishes() 가 어종을 배열 순서대로 x = (i-1)*6.5 에 깔기 때문에
//  한가운데 서면 정면(x=0)의 어종이 영원히 이긴다.
//
//  그래서 맨 끝 어종인 ⚔️참치(x=+6.5, z=부두 끝보다 11 먼 바다)는
//  부두 한가운데 176 샘플에서 조준 확률 0% 였고, 13일 동안 단 한 마리도
//  잡히지 않았다(sea_records 52건 중 tuna 0건 — 2026-09-17 계측).
//
//  고치는 자리는 배치가 아니라 조준이다. 어종을 앞으로 당기면 이번엔
//  그 어종만 계속 걸려 다른 티어가 죽는다. 어디를 보고 있느냐로 고른다.
// =============================================================

// 조준선에서 벗어난 거리(perp)에 더해지는 거리 보정. 같은 조준선 위에 겹친
// 물고기 중 가까운 쪽을 고르게 해줄 만큼만 작게 — 키우면 다시 거리 조준이 된다.
export const AIM_DIST_WEIGHT = 0.15;

/**
 * 던질 대상을 고른다 — 조준선에서 얼마나 벗어났는지(perp)가 1순위, 거리는 보정.
 *
 * @param {{x:number,z:number}[]} fishes  배회 물고기(월드 좌표, 임의의 부가 필드 허용)
 * @param {{x:number,z:number}}   player  플레이어 월드 좌표
 * @param {number}                yaw     플레이어 y축 회전 — 정면은 (sin yaw, cos yaw)
 * @returns {object|null}                 fishes 의 원소, 없으면 null
 */
export function pickSeaTarget(fishes, player, yaw) {
  if (!fishes || !fishes.length) return null;

  const fx = Math.sin(yaw), fz = Math.cos(yaw);
  let best = null, bestScore = Infinity;
  let nearest = null, nearestD = Infinity;      // 앞에 아무것도 없을 때의 폴백

  for (const f of fishes) {
    const dx = f.x - player.x, dz = f.z - player.z;
    const dist = Math.hypot(dx, dz);
    if (dist < nearestD) { nearestD = dist; nearest = f; }

    if (dx * fx + dz * fz <= 0) continue;       // 등 뒤 — 줄이 몸을 넘어가진 않는다
    const perp = Math.abs(dx * fz - dz * fx);   // 조준선에서 벗어난 수직 거리
    const score = perp + dist * AIM_DIST_WEIGHT;
    if (score < bestScore) { bestScore = score; best = f; }
  }

  return best || nearest;
}
