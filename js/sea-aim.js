export const AIM_DIST_WEIGHT = 0.15;

export function pickSeaTarget(fishes, player, yaw) {
  if (!fishes || !fishes.length) return null;

  const fx = Math.sin(yaw), fz = Math.cos(yaw);
  let best = null, bestScore = Infinity;
  let nearest = null, nearestD = Infinity;

  for (const f of fishes) {
    const dx = f.x - player.x, dz = f.z - player.z;
    const dist = Math.hypot(dx, dz);
    if (dist < nearestD) { nearestD = dist; nearest = f; }

    if (dx * fx + dz * fz <= 0) continue;
    const perp = Math.abs(dx * fz - dz * fx);
    const score = perp + dist * AIM_DIST_WEIGHT;
    if (score < bestScore) { bestScore = score; best = f; }
  }

  return best || nearest;
}
