const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const isCircle = b => b.r !== undefined;

export function segHitsCircle(a, b, c, pad) {
  const dx = b.x - a.x, dz = b.z - a.z;
  const len2 = dx * dx + dz * dz;
  const k = len2 ? Math.max(0, Math.min(1, ((c.x - a.x) * dx + (c.z - a.z) * dz) / len2)) : 0;
  return Math.hypot(a.x + dx * k - c.x, a.z + dz * k - c.z) < c.r + pad;
}

export function segHitsBox(a, b, box, pad) {
  const lo = [box.x1 - pad, box.z1 - pad], hi = [box.x2 + pad, box.z2 + pad];
  const p0 = [a.x, a.z], d = [b.x - a.x, b.z - a.z];
  let t0 = 0, t1 = 1;
  for (let i = 0; i < 2; i++) {
    if (Math.abs(d[i]) < 1e-9) {
      if (p0[i] <= lo[i] || p0[i] >= hi[i]) return false;
      continue;
    }
    let ta = (lo[i] - p0[i]) / d[i], tb = (hi[i] - p0[i]) / d[i];
    if (ta > tb) [ta, tb] = [tb, ta];
    t0 = Math.max(t0, ta);
    t1 = Math.min(t1, tb);
    if (t0 > t1) return false;
  }
  return true;
}

export function inBlocker(p, b, pad) {
  if (isCircle(b)) return dist(p, b) < b.r + pad;
  return p.x > b.x1 - pad && p.x < b.x2 + pad && p.z > b.z1 - pad && p.z < b.z2 + pad;
}

const hits = (a, b, blk, pad) => (isCircle(blk) ? segHitsCircle(a, b, blk, pad) : segHitsBox(a, b, blk, pad));

function closest(a, b, c) {
  const dx = b.x - a.x, dz = b.z - a.z, len2 = dx * dx + dz * dz;
  const k = len2 ? Math.max(0, Math.min(1, ((c.x - a.x) * dx + (c.z - a.z) * dz) / len2)) : 0;
  return { x: a.x + dx * k, z: a.z + dz * k };
}

function digsIn(a, b, blk) {
  if (isCircle(blk)) return dist(closest(a, b, blk), blk) < dist(a, blk) - 1e-6;
  const cx = (blk.x1 + blk.x2) / 2, cz = (blk.z1 + blk.z2) / 2;
  const hx = (blk.x2 - blk.x1) / 2, hz = (blk.z2 - blk.z1) / 2;
  const gap = p => Math.max(Math.abs(p.x - cx) - hx, Math.abs(p.z - cz) - hz);
  const step = Math.min(0.25, dist(a, b));
  const ahead = { x: a.x + (b.x - a.x) / (dist(a, b) || 1) * step, z: a.z + (b.z - a.z) / (dist(a, b) || 1) * step };
  return gap(ahead) < gap(a) - 1e-6;
}

function legHits(a, b, blk, pad) {
  if (inBlocker(b, blk, pad)) return false;
  if (inBlocker(a, blk, pad)) return digsIn(a, b, blk);
  return hits(a, b, blk, pad);
}

export function blocked(a, b, blockers, pad) {
  return blockers.some(blk => legHits(a, b, blk, pad));
}

function around(b, gap) {
  if (isCircle(b)) {
    const R = b.r + gap;
    const n = Math.max(8, Math.ceil((Math.PI * 2 * R) / 3));
    return Array.from({ length: n }, (_, i) => ({ x: b.x + Math.cos((i / n) * Math.PI * 2) * R, z: b.z + Math.sin((i / n) * Math.PI * 2) * R }));
  }
  return [[b.x1 - gap, b.z1 - gap], [b.x2 + gap, b.z1 - gap], [b.x1 - gap, b.z2 + gap], [b.x2 + gap, b.z2 + gap]].map(([x, z]) => ({ x, z }));
}

export function ringNodes(blockers, { gap = 1.6, inside = () => true } = {}) {
  return blockers.flatMap(b => around(b, gap)).filter(n => inside(n) && !blockers.some(o => inBlocker(n, o, gap * 0.9)));
}

export function planRoute(from, to, blockers, { pad = 0.6, gap = 1.6, inside = () => true } = {}) {
  if (!blocked(from, to, blockers, pad)) return [to];
  const pts = [from, ...ringNodes(blockers, { gap, inside }), to];
  const n = pts.length, goal = n - 1;
  const best = new Array(n).fill(Infinity), prev = new Array(n).fill(-1), done = new Array(n).fill(false);
  best[0] = 0;
  for (;;) {
    let u = -1;
    for (let i = 0; i < n; i++) if (!done[i] && best[i] < Infinity && (u < 0 || best[i] < best[u])) u = i;
    if (u < 0 || u === goal) break;
    done[u] = true;
    for (let v = 1; v < n; v++) {
      if (done[v]) continue;
      const w = best[u] + dist(pts[u], pts[v]);
      if (w >= best[v] || blocked(pts[u], pts[v], blockers, pad)) continue;
      best[v] = w;
      prev[v] = u;
    }
  }
  if (best[goal] === Infinity) return [to];
  const route = [];
  for (let i = goal; i > 0; i = prev[i]) route.unshift(pts[i]);
  return route;
}

export function planAround(from, to, blockers, extra, opts = {}, rounds = 4) {
  const pad = opts.pad ?? 0.6;
  let use = blockers, route = planRoute(from, to, use, opts);
  for (let i = 0; i < rounds; i++) {
    const legs = route.map((p, k) => [k ? route[k - 1] : from, p]);
    const hit = extra.filter(c => !use.includes(c) && legs.some(([a, b]) => legHits(a, b, c, pad)));
    if (!hit.length) return route;
    use = [...use, ...hit];
    route = planRoute(from, to, use, opts);
  }
  return route;
}

export function nextPoint(route, pos, reach) {
  let i = 0;
  while (i < route.length - 1 && dist(pos, route[i]) < reach) i++;
  const rest = i ? route.slice(i) : route;
  return { point: rest[0], route: rest };
}

export function pathLength(from, route) {
  let sum = 0, at = from;
  for (const p of route) { sum += dist(at, p); at = p; }
  return sum;
}

export function guideStatus({ open, inVillage, pos, spot, reach }) {
  if (!inVillage) return 'left';
  if (!open) return 'closed';
  if (dist(pos, spot) < reach) return 'arrive';
  return 'go';
}
