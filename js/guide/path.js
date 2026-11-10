const RING = 8;

function segClear(a, b, circles, skip) {
  const dx = b.x - a.x, dz = b.z - a.z, l2 = dx * dx + dz * dz;
  for (let i = 0; i < circles.length; i++) {
    if (skip && skip.has(i)) continue;
    const c = circles[i];
    const t = l2 > 0 ? Math.max(0, Math.min(1, ((c.x - a.x) * dx + (c.z - a.z) * dz) / l2)) : 0;
    const px = a.x + dx * t - c.x, pz = a.z + dz * t - c.z;
    if (px * px + pz * pz < c.r * c.r) return false;
  }
  return true;
}

const inside = (p, circles) => {
  const s = new Set();
  circles.forEach((c, i) => { if (Math.hypot(p.x - c.x, p.z - c.z) < c.r) s.add(i); });
  return s;
};

export function createNav(solids, walkable = () => true, { pad = 0.6, clear = 0.3, merge = 0.9 } = {}) {
  const circles = solids.map(([c, r]) => ({ x: c.x, z: c.z, r: r + clear }));
  const nodes = [];
  for (const [c, r] of solids) {
    for (let k = 0; k < RING; k++) {
      const a = (k / RING) * Math.PI * 2, p = { x: c.x + Math.cos(a) * (r + pad), z: c.z + Math.sin(a) * (r + pad) };
      if (walkable(p) && !circles.some(o => Math.hypot(p.x - o.x, p.z - o.z) < o.r) && !nodes.some(q => Math.hypot(p.x - q.x, p.z - q.z) < merge)) nodes.push(p);
    }
  }
  const adj = nodes.map(() => []);
  for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
    if (!segClear(nodes[i], nodes[j], circles)) continue;
    const d = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].z - nodes[j].z);
    adj[i].push([j, d]); adj[j].push([i, d]);
  }

  function route(me, tgt) {
    const skip = new Set([...inside(me, circles), ...inside(tgt, circles)]);
    if (segClear(me, tgt, circles, skip)) return tgt;
    const n = nodes.length, dist = new Float64Array(n).fill(Infinity), prev = new Int32Array(n).fill(-1), done = new Uint8Array(n);
    const toTgt = new Float64Array(n).fill(Infinity);
    for (let i = 0; i < n; i++) {
      if (segClear(me, nodes[i], circles, skip)) dist[i] = Math.hypot(nodes[i].x - me.x, nodes[i].z - me.z);
      if (segClear(nodes[i], tgt, circles, skip)) toTgt[i] = Math.hypot(tgt.x - nodes[i].x, tgt.z - nodes[i].z);
    }
    let best = -1, bestCost = Infinity;
    for (;;) {
      let u = -1, ud = Infinity;
      for (let i = 0; i < n; i++) if (!done[i] && dist[i] < ud) { ud = dist[i]; u = i; }
      if (u < 0 || ud >= bestCost) break;
      done[u] = 1;
      if (ud + toTgt[u] < bestCost) { bestCost = ud + toTgt[u]; best = u; }
      for (const [v, w] of adj[u]) if (dist[u] + w < dist[v]) { dist[v] = dist[u] + w; prev[v] = u; }
    }
    if (best < 0) return tgt;
    let first = best;
    while (prev[first] >= 0) first = prev[first];
    return { ...tgt, x: nodes[first].x, z: nodes[first].z };
  }

  return { route, nodes: nodes.length };
}
