const TAU = Math.PI * 2;
const INSET = 0.7, POST_OUT = 1.5, BAND_IN = 0.9, BAND_OUT = 3.2;

const spanTo = (a, b) => ((b - a) + TAU) % TAU || TAU;

export function layoutAnchors(trees, R, count = 11) {
  let ring = trees
    .map((p, i) => ({ x: p.x, z: p.z, d: Math.hypot(p.x, p.z), a: Math.atan2(p.z, p.x), i }))
    .filter(p => p.d > R + BAND_IN && p.d < R + BAND_OUT)
    .sort((p, q) => p.a - q.a);
  while (ring.length > count) {
    let drop = 0, tight = Infinity;
    ring.forEach((p, i) => { const s = spanTo(p.a, ring[(i + 1) % ring.length].a); if (s < tight) { tight = s; drop = i; } });
    ring = ring.filter((_, i) => i !== drop);
  }
  if (!ring.length) {
    return Array.from({ length: count }, (_, i) => {
      const a = -Math.PI + (i / count) * TAU;
      return { a, x: Math.cos(a) * (R + POST_OUT), z: Math.sin(a) * (R + POST_OUT), post: true };
    });
  }
  const gaps = ring.map((p, i) => ({ span: spanTo(p.a, ring[(i + 1) % ring.length].a), posts: 0 }));
  for (let need = count - ring.length; need > 0; need--) {
    const widest = gaps.reduce((m, g) => (g.span / (g.posts + 1) > m.span / (m.posts + 1) ? g : m));
    widest.posts += 1;
  }
  const out = [];
  ring.forEach((p, i) => {
    out.push({ a: p.a, x: p.x * (1 - INSET / p.d), z: p.z * (1 - INSET / p.d), post: false, i: p.i });
    for (let k = 1; k <= gaps[i].posts; k++) {
      const a = p.a + (gaps[i].span * k) / (gaps[i].posts + 1);
      out.push({ a, x: Math.cos(a) * (R + POST_OUT), z: Math.sin(a) * (R + POST_OUT), post: true });
    }
  });
  return out;
}
