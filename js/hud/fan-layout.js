export const FAN = Object.freeze({ rIn: 92, rOut: 152, a0: 185, a1: 35, slot: 50, hit: 34, swipe: 28, hold: 260 });

const ring = (cx, cy, r, n) => Array.from({ length: n }, (_, i) => {
  const a = (FAN.a0 + (n > 1 ? (FAN.a1 - FAN.a0) * i / (n - 1) : 0)) * Math.PI / 180;
  return { x: cx + r * Math.cos(a), y: cy - r * Math.sin(a) };
});

export function fanLayout({ cx, cy, inner, outer }) {
  return [...ring(cx, cy, FAN.rIn, inner), ...ring(cx, cy, FAN.rOut, outer)];
}

const shiftInto = (lo, hi, min, max) => (lo < min ? min - lo : hi > max ? max - hi : 0);

export function clampFan(pts, { w, h, pad, top = 0 }) {
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
  const dx = shiftInto(Math.min(...xs), Math.max(...xs), pad, w - pad);
  const dy = shiftInto(Math.min(...ys), Math.max(...ys), top + pad, h - pad);
  return pts.map(p => ({ x: p.x + dx, y: p.y + dy }));
}

export function pickSlot(pts, x, y) {
  let best = -1, bd = FAN.hit;
  pts.forEach((p, i) => { const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = i; } });
  return best;
}

export function stepTool(order, cur, dir) {
  const i = order.indexOf(cur);
  if (i < 0) return order[0];
  return order[(i + dir + order.length) % order.length];
}

export function swipeDir(dx, dy) {
  if (Math.abs(dx) < FAN.swipe || Math.abs(dy) > Math.abs(dx) * 0.6) return 0;
  return Math.sign(dx);
}
