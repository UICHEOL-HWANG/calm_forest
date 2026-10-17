const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export function holeRect(r, pad, vw, vh) {
  return {
    l: clamp(r.left - pad, 0, vw), t: clamp(r.top - pad, 0, vh),
    r: clamp(r.right + pad, 0, vw), b: clamp(r.bottom + pad, 0, vh),
  };
}

export function bars(h, vw, vh) {
  return [
    { l: 0, t: 0, w: vw, h: h.t },
    { l: 0, t: h.b, w: vw, h: vh - h.b },
    { l: 0, t: h.t, w: h.l, h: h.b - h.t },
    { l: h.r, t: h.t, w: vw - h.r, h: h.b - h.t },
  ];
}

export function bubblePos(h, bw, bh, vw, vh, m) {
  const cx = (h.l + h.r) / 2;
  const x = clamp(cx - bw / 2, m, vw - m - bw);
  const above = h.t - m - bh >= m;
  return above ? { x, y: h.t - m - bh, side: 'above' } : { x, y: Math.min(h.b + m, vh - m - bh), side: 'below' };
}

export function inHole(h, x, y) {
  return x >= h.l && x <= h.r && y >= h.t && y <= h.b;
}
