export function waypoint(me, tgt, solids, pad = 0.6) {
  const dx = tgt.x - me.x, dz = tgt.z - me.z, len = Math.hypot(dx, dz);
  if (len < 1e-3) return tgt;
  const ux = dx / len, uz = dz / len;
  for (const [c, r] of solids) {
    const cx = c.x - me.x, cz = c.z - me.z;
    const along = cx * ux + cz * uz;
    if (along <= 0 || along >= len) continue;
    const side = cx * uz - cz * ux;
    if (Math.abs(side) >= r) continue;
    if (Math.hypot(c.x - tgt.x, c.z - tgt.z) < r) continue;
    const s = side >= 0 ? -1 : 1;
    return { ...tgt, x: c.x + uz * s * (r + pad), z: c.z - ux * s * (r + pad) };
  }
  return tgt;
}

export function edgeArrow(p, w, h, margin = 26, topPad = 24) {
  const inside = p.inFront && p.x > margin && p.x < w - margin && p.y > margin + topPad && p.y < h - margin;
  if (inside) return { inside: true, x: p.x, y: p.y, deg: 0 };
  const cx = w / 2, cy = h / 2;
  let vx = p.x - cx, vy = p.y - cy;
  if (!p.inFront) { vx = -vx; vy = -vy; }
  const sx = (cx - margin) / Math.max(1e-3, Math.abs(vx));
  const sy = (cy - margin - 12) / Math.max(1e-3, Math.abs(vy));
  const s = Math.min(sx, sy);
  return { inside: false, x: cx + vx * s, y: cy + vy * s + 6, deg: (Math.atan2(vy, vx) * 180) / Math.PI };
}
