export const RING_PX = 512;
export const ARROW_PX = 256;

function glow(ctx, c, r0, r1, peak, color) {
  const g = ctx.createRadialGradient(c, c, r0, c, c, r1);
  g.addColorStop(0, `rgba(${color},0)`);
  g.addColorStop(peak, `rgba(${color},.42)`);
  g.addColorStop(1, `rgba(${color},0)`);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(c, c, r1, 0, Math.PI * 2); ctx.fill();
}

export function paintFootRing(ctx, s = RING_PX) {
  const c = s / 2, r = s * 0.4;
  ctx.clearRect(0, 0, s, s);
  glow(ctx, c, r - s * 0.07, r + s * 0.09, 0.45, '255,186,52');
  const fill = ctx.createRadialGradient(c, c, 0, c, c, r);
  fill.addColorStop(0, 'rgba(255,244,214,0)');
  fill.addColorStop(0.75, 'rgba(255,244,214,.05)');
  fill.addColorStop(1, 'rgba(255,214,120,.26)');
  ctx.fillStyle = fill;
  ctx.beginPath(); ctx.arc(c, c, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(140,78,4,.7)';
  ctx.lineWidth = s * 0.075;
  ctx.beginPath(); ctx.arc(c, c, r, 0, Math.PI * 2); ctx.stroke();
  const band = ctx.createLinearGradient(0, c - r, 0, c + r);
  band.addColorStop(0, '#ffd965');
  band.addColorStop(0.5, '#ffbb2e');
  band.addColorStop(1, '#f29a18');
  ctx.strokeStyle = band;
  ctx.lineWidth = s * 0.055;
  ctx.beginPath(); ctx.arc(c, c, r, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,251,236,.95)';
  ctx.lineWidth = s * 0.008;
  ctx.beginPath(); ctx.arc(c, c, r - s * 0.016, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,233,170,.55)';
  ctx.lineWidth = s * 0.006;
  ctx.setLineDash([s * 0.012, s * 0.03]);
  ctx.beginPath(); ctx.arc(c, c, r - s * 0.068, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#fffbea';
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + i * Math.PI / 2, x = c + Math.cos(a) * r, y = c + Math.sin(a) * r, d = s * 0.02;
    ctx.beginPath(); ctx.moveTo(x, y - d); ctx.lineTo(x + d, y); ctx.lineTo(x, y + d); ctx.lineTo(x - d, y); ctx.closePath(); ctx.fill();
  }
}

export function paintFootArrow(ctx, s = ARROW_PX) {
  const P = (x, y) => [x * s, y * s];
  const pts = [P(0.5, 0.9), P(0.86, 0.22), P(0.5, 0.4), P(0.14, 0.22)];
  ctx.clearRect(0, 0, s, s);
  const path = () => { ctx.beginPath(); ctx.moveTo(...pts[0]); for (const p of pts.slice(1)) ctx.lineTo(...p); ctx.closePath(); };
  ctx.lineJoin = 'round';
  ctx.save();
  ctx.strokeStyle = 'rgba(130,70,4,.75)';
  ctx.lineWidth = s * 0.15;
  path(); ctx.stroke();
  ctx.shadowColor = 'rgba(255,196,80,.85)';
  ctx.shadowBlur = s * 0.09;
  ctx.strokeStyle = '#fff8e3';
  ctx.lineWidth = s * 0.11;
  path(); ctx.stroke();
  ctx.restore();
  const g = ctx.createLinearGradient(0, s * 0.2, 0, s * 0.9);
  g.addColorStop(0, '#ffe07a');
  g.addColorStop(0.55, '#ffb82a');
  g.addColorStop(1, '#e8850f');
  ctx.fillStyle = g;
  ctx.strokeStyle = g;
  ctx.lineWidth = s * 0.035;
  path(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,253,240,.85)';
  ctx.lineWidth = s * 0.018;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(...P(0.24, 0.27)); ctx.lineTo(...P(0.47, 0.69)); ctx.stroke();
}
