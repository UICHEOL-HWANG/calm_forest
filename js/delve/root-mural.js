const PAL = { cream: '#efe3c6', ochre: '#d68b45', lamp: '#ffd36a', root: '#8a5434', rootDark: '#4f2f1f', rootHi: '#b9804f', trunk: '#7a4a2e', leaf: '#86bd62', leafDark: '#5f9a4a', shadow: '#2c2838', sky: '#74849f', red: '#b5553a', charcoal: '#29242f', gold: '#ffd36a' };

const rng = (seed) => { let s = (seed * 7919) % 233280; return () => ((s = (s * 9301 + 49297) % 233280) / 233280); };

function smooth(pts, n = 8) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map(d => 0.5 * (2 * p1[d] + (-p0[d] + p2[d]) * t + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2 + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * t3)));
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

function taper(x, pts, w0, w1, color, dx = 0, dy = 0) {
  const d = smooth(pts);
  x.strokeStyle = color; x.lineCap = 'round'; x.lineJoin = 'round';
  for (let i = 0; i < d.length - 1; i++) {
    x.lineWidth = Math.max(0.5, w0 + (w1 - w0) * (i / (d.length - 1)));
    x.beginPath(); x.moveTo(d[i][0] + dx, d[i][1] + dy); x.lineTo(d[i + 1][0] + dx, d[i + 1][1] + dy); x.stroke();
  }
}

function line(x, ...pts) { x.beginPath(); x.moveTo(...pts[0]); pts.slice(1).forEach(p => x.lineTo(...p)); x.stroke(); }

function rockFace(x, w, h, seed, base = '#625d74') {
  if (x.glow) return;
  const r = rng(seed);
  x.fillStyle = base; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 140; i++) {
    x.globalAlpha = 0.07 + r() * 0.12; x.fillStyle = r() > 0.5 ? '#7a748e' : '#4b465e';
    x.beginPath(); x.ellipse(r() * w, r() * h, 6 + r() * 50, 4 + r() * 24, r() * 3, 0, 7); x.fill();
  }
  x.globalAlpha = 0.3; x.strokeStyle = '#363146'; x.lineWidth = 1.2;
  for (let i = 0; i < 6; i++) { let px = r() * w, py = r() * h; const seg = [[px, py]]; for (let k = 0; k < 4; k++) { px += (r() - 0.5) * 50; py += 6 + r() * 20; seg.push([px, py]); } line(x, ...seg); }
  x.globalAlpha = 1;
}

function wear(x, w, h, seed, base = '#625d74') {
  if (x.glow) return;
  const r = rng(seed + 50);
  for (let i = 0; i < 26; i++) { x.globalAlpha = 0.12 + r() * 0.22; x.fillStyle = base; x.beginPath(); x.ellipse(r() * w, r() * h, 3 + r() * 16, 2 + r() * 8, r() * 3, 0, 7); x.fill(); }
  x.globalAlpha = 1;
  const v = x.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.72);
  v.addColorStop(0, 'rgba(20,16,30,0)'); v.addColorStop(1, 'rgba(20,16,30,.5)');
  x.fillStyle = v; x.fillRect(0, 0, w, h);
}

function root(x, pts, w0, w1) {
  if (x.glow) {
    x.save(); x.shadowColor = PAL.gold; x.shadowBlur = 10; taper(x, pts, w0 * 0.55, w1 * 0.55, PAL.gold); x.restore();
    taper(x, pts, w0 * 0.2, w1 * 0.2, '#fff2c8');
    return;
  }
  taper(x, pts, w0 + 3, w1 + 2, PAL.rootDark);
  taper(x, pts, w0, w1, PAL.root);
  taper(x, pts, w0 * 0.28, w1 * 0.2, PAL.rootHi, -w0 * 0.18, -w0 * 0.12);
}

function glint(x, cx, cy, s = 1) {
  x.save();
  x.strokeStyle = x.glow ? PAL.gold : 'rgba(255,214,110,.55)'; x.lineWidth = 1.6 * s; x.lineCap = 'round';
  if (x.glow) { x.shadowColor = PAL.gold; x.shadowBlur = 6; }
  line(x, [cx - 5 * s, cy], [cx + 5 * s, cy]); line(x, [cx, cy - 5 * s], [cx, cy + 5 * s]);
  x.restore();
}

function dot(x, cx, cy, r) {
  x.save(); x.fillStyle = PAL.lamp;
  if (x.glow) { x.shadowColor = PAL.gold; x.shadowBlur = r * 4; }
  x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); x.restore();
}

function lantern(x, cx, cy, s = 1) {
  if (!x.glow) {
    const g = x.createRadialGradient(cx, cy + 7 * s, 1, cx, cy + 7 * s, 22 * s);
    g.addColorStop(0, 'rgba(255,214,110,.55)'); g.addColorStop(1, 'rgba(255,214,110,0)');
    x.fillStyle = g; x.beginPath(); x.arc(cx, cy + 7 * s, 22 * s, 0, 7); x.fill();
    x.fillStyle = PAL.shadow; x.fillRect(cx - 5 * s, cy, 10 * s, 3 * s); x.fillRect(cx - 5 * s, cy + 11 * s, 10 * s, 3 * s);
  }
  x.save(); x.fillStyle = PAL.lamp;
  if (x.glow) { x.shadowColor = PAL.gold; x.shadowBlur = 14 * s; }
  x.fillRect(cx - 4 * s, cy + 3 * s, 8 * s, 8 * s); x.restore();
}

function figure(x, cx, by, s, { face = 1, pose = 'stand', lamp = true, ink = PAL.cream, hat = PAL.ochre } = {}) {
  const kneel = pose === 'kneel';
  const hip = by - (kneel ? 13 : 21) * s, sh = hip - 22 * s, hy = sh - 10 * s;
  const hand = pose === 'reach' || kneel ? [cx + face * 22 * s, hip + 3 * s] : [cx + face * 16 * s, sh - 13 * s];
  if (!x.glow) {
    x.strokeStyle = ink; x.fillStyle = ink; x.lineCap = 'round'; x.lineJoin = 'round'; x.lineWidth = 6.5 * s;
    if (kneel) { line(x, [cx - face * 2 * s, hip], [cx - face * 13 * s, hip + 1 * s], [cx - face * 14 * s, by]); line(x, [cx + face * 2 * s, hip], [cx + face * 9 * s, by - 6 * s], [cx + face * 9 * s, by]); }
    else { line(x, [cx - 3 * s, hip], [cx - 6 * s, by]); line(x, [cx + 3 * s, hip], [cx + 6 * s, by]); }
    x.beginPath(); x.roundRect(cx - 8.5 * s, sh, 17 * s, hip - sh + 3 * s, 6 * s); x.fill();
    x.lineWidth = 5 * s; line(x, [cx + face * 5 * s, sh + 5 * s], hand); line(x, [cx - face * 5 * s, sh + 5 * s], [cx - face * 9 * s, hip - 2 * s]);
    x.beginPath(); x.arc(cx, hy, 8.5 * s, 0, 7); x.fill();
    x.fillStyle = hat; x.beginPath(); x.arc(cx, hy - 2 * s, 9.5 * s, Math.PI, 0); x.fill(); x.fillRect(cx - 12 * s, hy - 3 * s, 24 * s, 3.2 * s);
  }
  dot(x, cx + face * 5 * s, hy - 7 * s, 2.3 * s);
  if (lamp && !kneel) lantern(x, hand[0], hand[1], s);
}

function tree(x, cx, by, s = 1) {
  if (x.glow) return;
  x.fillStyle = PAL.trunk;
  x.beginPath(); x.moveTo(cx - 9 * s, by); x.quadraticCurveTo(cx - 3 * s, by - 14 * s, cx - 3 * s, by - 26 * s); x.lineTo(cx + 3 * s, by - 26 * s); x.quadraticCurveTo(cx + 3 * s, by - 14 * s, cx + 9 * s, by); x.fill();
  const blobs = [[0, -40, 17], [-15, -32, 12], [15, -32, 12], [-9, -50, 11], [10, -50, 11], [0, -58, 9]];
  blobs.forEach(([dx, dy, r], i) => { x.fillStyle = i % 2 ? PAL.leafDark : PAL.leaf; x.beginPath(); x.arc(cx + dx * s, by + dy * s, r * s, 0, 7); x.fill(); });
  x.fillStyle = 'rgba(255,255,255,.18)'; x.beginPath(); x.arc(cx - 5 * s, by - 46 * s, 6 * s, 0, 7); x.fill();
}

function sprig(x, cx, cy, s = 1, a = 0) {
  if (x.glow) return;
  x.save(); x.translate(cx, cy); x.rotate(a);
  [[-0.7, 1], [0.7, 1], [0, 1.25]].forEach(([r, k], i) => { x.save(); x.rotate(r); x.fillStyle = i === 2 ? PAL.leaf : PAL.leafDark; x.beginPath(); x.ellipse(0, -8 * s * k, 4 * s, 8 * s * k, 0, 0, 7); x.fill(); x.restore(); });
  x.restore();
}

function house(x, cx, by, s = 1) {
  if (x.glow) return;
  x.fillStyle = PAL.cream; x.fillRect(cx - 9 * s, by - 12 * s, 18 * s, 12 * s);
  x.fillStyle = PAL.ochre; x.beginPath(); x.moveTo(cx - 12 * s, by - 11 * s); x.lineTo(cx, by - 22 * s); x.lineTo(cx + 12 * s, by - 11 * s); x.fill();
  x.fillStyle = PAL.shadow; x.fillRect(cx - 2.5 * s, by - 7 * s, 5 * s, 7 * s);
}

function surface(x, w, gy) {
  if (x.glow) return;
  x.fillStyle = PAL.sky; x.globalAlpha = 0.85; x.fillRect(0, 0, w, gy);
  x.globalAlpha = 0.35; x.fillStyle = '#e8e4dc'; x.beginPath(); x.ellipse(w * 0.22, gy * 0.35, 22, 6, 0, 0, 7); x.ellipse(w * 0.78, gy * 0.25, 18, 5, 0, 0, 7); x.fill(); x.globalAlpha = 1;
  x.fillStyle = PAL.leafDark; x.fillRect(0, gy - 2, w, 5);
}

function shaft(x, x0, y0, y1, wid) {
  if (x.glow) return;
  x.fillStyle = PAL.shadow; x.globalAlpha = 0.85; x.fillRect(x0, y0, wid, y1 - y0); x.globalAlpha = 1;
  x.strokeStyle = '#a88760'; x.lineWidth = 2.2;
  line(x, [x0 + wid * 0.25, y0], [x0 + wid * 0.25, y1]); line(x, [x0 + wid * 0.75, y0], [x0 + wid * 0.75, y1]);
  for (let y = y0 + 8; y < y1; y += 11) line(x, [x0 + wid * 0.25, y], [x0 + wid * 0.75, y]);
}

function panelEdge(x, w, h) {
  if (x.glow) return;
  x.strokeStyle = 'rgba(30,26,40,.5)'; x.lineWidth = 4; x.strokeRect(2, 2, w - 4, h - 4);
}

const RY = 168;

const PANELS = [
  (x) => {
    rockFace(x, 256, 200, 11); surface(x, 256, 46); tree(x, 196, 46, 0.6); house(x, 120, 46, 0.9); house(x, 150, 46, 0.7);
    shaft(x, 44, 46, 200, 40);
    root(x, [[196, 46], [200, 86], [188, 126], [214, 160], [256, RY]], 9, 7);
    figure(x, 64, 128, 0.62, { face: 1, lamp: false });
    figure(x, 116, 196, 0.8, { face: 1 });
    wear(x, 256, 200, 11); panelEdge(x, 256, 200);
  },
  (x) => {
    rockFace(x, 256, 200, 12);
    root(x, [[0, RY], [64, 172], [128, 162], [192, 170], [256, RY]], 7, 7);
    root(x, [[128, 166], [120, 116], [136, 72], [124, 26]], 18, 9);
    root(x, [[124, 120], [100, 104], [86, 82]], 5, 2);
    root(x, [[132, 92], [156, 78], [166, 58]], 5, 2);
    [[100, 60], [160, 108], [96, 140], [154, 34], [112, 34]].forEach(([gx, gy], i) => glint(x, gx, gy, 0.9 + (i % 2) * 0.4));
    figure(x, 50, 192, 0.85, { face: 1 });
    figure(x, 208, 192, 0.85, { face: -1 });
    wear(x, 256, 200, 12); panelEdge(x, 256, 200);
  },
  (x) => {
    rockFace(x, 256, 200, 13); surface(x, 256, 42); tree(x, 194, 42, 0.56); house(x, 70, 42, 0.8);
    root(x, [[0, RY], [60, 172], [124, 166], [170, 142], [188, 98], [182, 68], [194, 42]], 7, 9);
    sprig(x, 176, 120, 0.9, -0.5); sprig(x, 200, 78, 0.8, 0.5); sprig(x, 150, 156, 0.7, -0.9);
    figure(x, 106, 194, 0.82, { face: 1, pose: 'kneel' });
    figure(x, 228, 194, 0.82, { face: -1 });
    wear(x, 256, 200, 13); panelEdge(x, 256, 200);
  },
];

function paint(w, h, draw) {
  const mk = (glow) => {
    const c = document.createElement('canvas'); c.width = w * 2; c.height = h * 2;
    const x = c.getContext('2d'); x.glow = glow;
    if (glow) { x.fillStyle = '#000'; x.fillRect(0, 0, c.width, c.height); }
    x.scale(2, 2); draw(x); return c;
  };
  return { color: mk(false), glow: mk(true) };
}

export function drawRootMural() {
  return PANELS.map(d => paint(256, 200, d));
}
