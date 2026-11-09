const wrap = d => { while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };

export function steer(state, input, dt, { speed, turn }) {
  const len = Math.hypot(input.x, input.y);
  if (len * len <= 0.02) return { heading: state.heading, speed: Math.max(0, state.speed - dt * 6) };
  const want = Math.atan2(-input.x, -input.y);
  const d = wrap(want - state.heading), step = turn * dt;
  const heading = state.heading + Math.max(-step, Math.min(step, d));
  return { heading, speed: Math.min(speed * Math.min(1, len * 1.2), state.speed + dt * 10) };
}

export function pushOutOfIsland(p, island, r) {
  const dx = p.x - island.x, dz = p.z - island.z, d = Math.hypot(dx, dz);
  if (d >= r || d < 1e-6) return p;
  return { x: island.x + (dx / d) * r, z: island.z + (dz / d) * r };
}

export function fastStep(p, route, wp, dist) {
  let x = p.x, z = p.z, i = wp, left = dist;
  while (left > 0 && i < route.length) {
    const [tx, tz] = route[i], d = Math.hypot(tx - x, tz - z);
    if (d < 1e-6) { i++; continue; }
    const k = Math.min(left, d);
    x += ((tx - x) / d) * k; z += ((tz - z) / d) * k; left -= k;
    if (k >= d) { x = tx; z = tz; i++; }
  }
  return { p: { x, z }, wp: i, done: i >= route.length };
}
