import { JUDGE_MS } from '../data/concert.js';
import { CONCERT_COPY as C } from './copy.js';
import { LANE_COLORS, noteY } from './views.js';
import { ensureConcertStyle } from './style.js';

const LEAD_MS = 1600;
const FLASH_MS = 350;
const MISS_TAIL_MS = 320;
const MAX_DPR = 2;
const NAVY = '12,18,42';
const CREAM = '#fff1c9';
const FONT = 'system-ui, -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif';
const KEYS = { KeyF: 0, ArrowLeft: 0, KeyJ: 1, ArrowRight: 1 };

const clamp = (v) => Math.max(0, Math.min(1, v));
const hex = (h) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const rgba = (h, a) => `rgba(${hex(h).join(',')},${a})`;
const mix = (h, to, k) => { const a = hex(h), b = hex(to); return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * k)).join(',')})`; };
const rr = (c, x, y, w, h, r) => { c.beginPath(); c.roundRect(x, y, w, h, r); };
const now = () => globalThis.performance?.now() ?? Date.now();

function beatOf(chart) {
  const times = [...new Set(chart.map(n => n.t))].sort((a, b) => a - b);
  if (times.length < 2) return null;
  let gap = Infinity;
  for (let i = 1; i < times.length; i++) gap = Math.min(gap, times[i] - times[i - 1]);
  const span = times[times.length - 1] - times[0];
  let beat = span / Math.max(1, Math.round(span / gap));
  while (beat < 400) beat *= 2;
  return { t0: times[0], ms: beat, end: times[times.length - 1] };
}

function geom(W, H) {
  if (W > H && H < 500) {
    const w = 112;
    return { W, H, strips: true, lanes: [{ x: 8, w }, { x: W - 8 - w, w }], top: 8, bot: H - 8, hitY: H - 74, s: 1 };
  }
  const top = Math.round(H * 2 / 3);
  if (W >= 760) {
    const w = Math.min(320, Math.max(280, Math.round(W * 0.2))), g = 16, bot = H - 16;
    return { W, H, lanes: [{ x: W / 2 - g / 2 - w, w }, { x: W / 2 + g / 2, w }], top, bot, hitY: bot - 70, keys: ['F', 'J'], s: 1.18 };
  }
  const m = 10, g = 8, w = (W - 2 * m - g) / 2, bot = H - 10;
  return { W, H, lanes: [{ x: m, w }, { x: m + w + g, w }], top, bot, hitY: bot - 66, s: 1 };
}

function fade(c, g) {
  if (g.strips) {
    g.lanes.forEach((L, i) => {
      const x0 = i ? g.W : 0, x1 = i ? g.W - 150 : 150, gr = c.createLinearGradient(x0, 0, x1, 0);
      gr.addColorStop(0, `rgba(${NAVY},.42)`); gr.addColorStop(.55, `rgba(${NAVY},.2)`); gr.addColorStop(1, `rgba(${NAVY},0)`);
      c.fillStyle = gr; c.fillRect(Math.min(x0, x1), 0, 150, g.H);
    });
    return;
  }
  const y0 = g.hitY - 120, gr = c.createLinearGradient(0, y0, 0, g.H);
  gr.addColorStop(0, `rgba(${NAVY},0)`); gr.addColorStop(.6, `rgba(${NAVY},.22)`); gr.addColorStop(1, `rgba(${NAVY},.38)`);
  c.fillStyle = gr; c.fillRect(0, y0, g.W, g.H - y0);
}

function judgeText(c, text, x, y, a, glow, miss) {
  c.save(); c.font = `900 17px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.globalAlpha = a;
  if (glow) { c.shadowColor = glow; c.shadowBlur = 12; }
  c.lineJoin = 'round'; c.lineWidth = 5; c.strokeStyle = `rgba(${NAVY},.9)`; c.strokeText(text, x, y);
  c.shadowBlur = 0; c.fillStyle = miss ? '#c3cbe2' : CREAM; c.fillText(text, x, y); c.restore();
}

function lantern(c, cx, y, col, lit, late, s) {
  const r = 17 * s;
  const body = c.createRadialGradient(cx, y - 2 * s, 2, cx, y, 22 * s);
  body.addColorStop(0, late ? '#c9cddb' : '#fffbe8'); body.addColorStop(.36, late ? '#8a90a8' : mix(col, '#fff4d0', .45)); body.addColorStop(1, late ? '#5a6078' : col);
  c.save(); c.shadowColor = 'rgba(10,14,30,.45)'; c.shadowBlur = 8; c.shadowOffsetY = 3;
  rr(c, cx - r, y - r, r * 2, r * 2, 14 * s); c.fillStyle = body; c.fill(); c.restore();
  if (!late) { c.save(); c.shadowColor = lit; c.shadowBlur = 22; rr(c, cx - r, y - r, r * 2, r * 2, 14 * s); c.fillStyle = body; c.fill(); c.restore(); }
  rr(c, cx - r, y - r, r * 2, r * 2, 14 * s); c.lineWidth = 1.5; c.strokeStyle = 'rgba(58,40,22,.55)'; c.stroke();
  c.fillStyle = '#4a3826'; rr(c, cx - 9 * s, y - r - 5 * s, 18 * s, 6 * s, 2.5); c.fill(); rr(c, cx - 7 * s, y + r - 1, 14 * s, 5 * s, 2); c.fill();
  c.strokeStyle = 'rgba(74,56,38,.42)'; c.lineWidth = 1.2; c.beginPath();
  c.moveTo(cx - 6 * s, y - 15 * s); c.quadraticCurveTo(cx - 11 * s, y, cx - 6 * s, y + 15 * s);
  c.moveTo(cx + 6 * s, y - 15 * s); c.quadraticCurveTo(cx + 11 * s, y, cx + 6 * s, y + 15 * s); c.stroke();
}

function keyMark(c, cx, cy, key) {
  rr(c, cx - 15, cy - 13, 30, 26, 7); c.fillStyle = 'rgba(255,241,201,.94)'; c.fill();
  c.lineWidth = 1; c.strokeStyle = `rgba(${NAVY},.35)`; c.stroke();
  c.fillStyle = '#1a2545'; c.font = `900 15px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(key, cx, cy + 1);
}

function drawLane(c, g, L, i, col, st) {
  const cx = L.x + L.w / 2, fl = st.flash[i], hot = fl && fl.kind ? 1 - fl.p : 0, lit = mix(col, '#fff4d0', .25), hr = 22 * g.s;
  const py = g.bot - 14, pr = L.w * .5;
  c.save(); c.translate(cx, py); c.scale(1, .5);
  const pool = c.createRadialGradient(0, 0, 2, 0, 0, pr);
  pool.addColorStop(0, rgba(col, .55 + hot * .35)); pool.addColorStop(1, rgba(col, 0));
  c.fillStyle = pool; c.fillRect(-pr, -pr, pr * 2, pr * 2); c.restore();
  const sy = g.top - (g.strips ? 8 : 30);
  c.lineCap = 'round';
  c.strokeStyle = `rgba(${NAVY},.28)`; c.lineWidth = 3.5; c.beginPath(); c.moveTo(cx, sy); c.lineTo(cx, g.hitY - hr - 1); c.stroke();
  c.strokeStyle = 'rgba(255,236,190,.75)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(cx, sy); c.lineTo(cx, g.hitY - hr - 1); c.stroke();
  c.save(); c.beginPath(); c.rect(L.x, g.top, L.w, g.hitY - hr - 2 - g.top); c.clip();
  const hw = Math.min(L.w * .34, 84);
  st.beats.forEach(y => {
    const gr = c.createLinearGradient(cx - hw, 0, cx + hw, 0), sh = c.createLinearGradient(cx - hw, 0, cx + hw, 0);
    sh.addColorStop(0, `rgba(${NAVY},0)`); sh.addColorStop(.5, `rgba(${NAVY},.3)`); sh.addColorStop(1, `rgba(${NAVY},0)`);
    gr.addColorStop(0, 'rgba(255,236,190,0)'); gr.addColorStop(.5, 'rgba(255,236,190,.85)'); gr.addColorStop(1, 'rgba(255,236,190,0)');
    c.fillStyle = sh; c.fillRect(cx - hw, y - 1, hw * 2, 3.5);
    c.fillStyle = gr; c.fillRect(cx - hw, y - 1, hw * 2, 2);
  });
  c.restore();
  c.save(); c.beginPath(); c.arc(cx, g.hitY, hr + 2, 0, Math.PI * 2); c.lineWidth = 4; c.strokeStyle = `rgba(${NAVY},.42)`; c.stroke(); c.restore();
  c.save(); c.shadowColor = lit; c.shadowBlur = 10 + hot * 22; c.beginPath(); c.arc(cx, g.hitY, hr, 0, Math.PI * 2);
  c.fillStyle = hot ? rgba(col, .25 + hot * .65) : `rgba(${NAVY},.3)`; c.fill();
  if (!hot) { c.fillStyle = rgba(col, .28); c.fill(); }
  c.lineWidth = 2.6; c.strokeStyle = CREAM; c.stroke(); c.restore();
  if (hot > 0) {
    c.save(); c.fillStyle = `rgba(255,241,201,${hot})`;
    for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + .3, r0 = hr + 6 + (1 - hot) * 18; c.beginPath(); c.arc(cx + Math.cos(a) * r0, g.hitY + Math.sin(a) * r0, 2.2, 0, Math.PI * 2); c.fill(); }
    c.restore();
  }
  if (g.keys) keyMark(c, cx, g.hitY + hr + 22, g.keys[i]);
  st.notes.filter(n => n.lane === i).forEach(n => {
    c.save(); c.globalAlpha = n.a; lantern(c, cx, n.y, col, lit, n.late, g.s); c.restore();
  });
  if (fl && !fl.kind) {
    const dr = hr * 2.4, dim = c.createRadialGradient(cx, g.hitY, hr * .5, cx, g.hitY, dr);
    dim.addColorStop(0, `rgba(${NAVY},${(1 - fl.p) * .45})`); dim.addColorStop(1, `rgba(${NAVY},0)`);
    c.save(); c.fillStyle = dim; c.fillRect(cx - dr, g.hitY - dr, dr * 2, dr * 2); c.restore();
  }
  const say = st.miss[i] && (!fl || st.miss[i].p < fl.p) ? { kind: 'miss', p: st.miss[i].p } : fl && fl.kind ? fl : null;
  if (say) judgeText(c, C.judge[say.kind], cx, g.hitY - hr - 26 - say.p * 10, clamp(2.4 - say.p * 2.4), say.kind === 'miss' ? null : lit, say.kind === 'miss');
}

function buildDom(practice, cols, onQuit) {
  ensureConcertStyle();
  document.getElementById('concert-show-modal')?.remove();
  const root = document.createElement('div');
  root.id = 'concert-show-modal';
  const cv = document.createElement('canvas');
  cv.className = 'cc-cv';
  cv.setAttribute('aria-hidden', 'true');
  const hud = document.createElement('div');
  hud.className = 'cc-hud';
  const quit = document.createElement('button');
  quit.type = 'button';
  quit.className = 'cc-quit';
  quit.textContent = C.quit;
  quit.addEventListener('click', () => onQuit?.());
  let prog = null;
  let hint = null;
  if (practice) {
    hint = document.createElement('div');
    hint.className = 'cc-hint';
    const dot = (col) => { const d = document.createElement('i'); d.style.background = col; d.style.color = col; return d; };
    const tx = document.createElement('span');
    tx.textContent = C.practice;
    hint.append(dot(cols[0]), tx, dot(cols[1]));
  } else {
    const chip = document.createElement('div');
    chip.className = 'cc-chip';
    const bar = document.createElement('span');
    bar.className = 'cc-prog';
    prog = document.createElement('i');
    bar.append(prog);
    chip.append(bar);
    hud.append(chip);
  }
  hud.append(quit);
  const row = document.createElement('div');
  row.className = 'cc-hintrow';
  root.append(cv, hud, row);
  document.body.append(root);
  root.classList.add('show');
  return { root, cv, hud, row, hint, quit, prog };
}

export function showLanes({ chart, instrument, practice, onTap, onQuit }) {
  const cols = LANE_COLORS[instrument] || LANE_COLORS.drum;
  const dom = buildDom(practice, cols, onQuit);
  const c = dom.cv.getContext('2d');
  const beat = beatOf(chart);
  const hit = new Uint8Array(chart.length);
  const missed = new Uint8Array(chart.length);
  const flashes = [null, null];
  const misses = [null, null];
  let g = null;
  let dpr = 1;
  let lastNow = 0;
  let lastPct = -1;

  const placeHint = () => {
    if (!dom.hint) return;
    if (g.strips) dom.hud.prepend(dom.hint);
    else dom.row.append(dom.hint);
  };
  const resize = () => {
    const W = window.innerWidth, H = window.innerHeight;
    dpr = Math.min(MAX_DPR, window.devicePixelRatio || 1);
    dom.cv.width = Math.round(W * dpr);
    dom.cv.height = Math.round(H * dpr);
    g = geom(W, H);
    dom.root.classList.toggle('cc-strips', !!g.strips);
    placeHint();
    draw(lastNow);
  };
  const onPointer = (e) => {
    if (e.target.closest?.('.cc-quit')) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    onTap?.(e.clientX < window.innerWidth / 2 ? 0 : 1);
  };
  const onKey = (e) => {
    if (!(e.code in KEYS) || e.ctrlKey || e.metaKey || e.altKey) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.repeat) return;
    onTap?.(KEYS[e.code]);
  };

  const age = (rec, t) => (rec ? (t - rec.at) / FLASH_MS : 1);
  function frame(nowMs) {
    const span = g.hitY - g.top;
    const notes = [];
    chart.forEach((n, i) => {
      const dt = n.t - nowMs;
      if (hit[i] || dt > LEAD_MS) return;
      if (missed[i] ? dt < -MISS_TAIL_MS : dt < -JUDGE_MS.good) return;
      const y = g.top + noteY(n.t, nowMs, LEAD_MS, span);
      const tail = dt < 0 ? clamp(1 + dt / MISS_TAIL_MS) : 1;
      notes.push({ lane: n.lane, y, late: !!missed[i], a: clamp((y - g.top - 4) / 22) * (missed[i] ? tail * .55 : tail) });
    });
    const beats = [];
    if (beat) {
      const k0 = Math.ceil((nowMs - beat.t0) / beat.ms), end = Math.min(nowMs + LEAD_MS, beat.end + beat.ms);
      for (let k = k0; beat.t0 + k * beat.ms <= end; k++) beats.push(g.top + noteY(beat.t0 + k * beat.ms, nowMs, LEAD_MS, span));
    }
    const t = now();
    const live = (rec) => { const p = age(rec, t); return p < 1 ? { kind: rec.kind, p } : null; };
    return { notes, beats, flash: flashes.map(live), miss: misses.map(live) };
  }

  function draw(nowMs) {
    lastNow = nowMs;
    if (!g) return;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, g.W, g.H);
    fade(c, g);
    const st = frame(nowMs);
    g.lanes.forEach((L, i) => drawLane(c, g, L, i, cols[i], st));
    if (dom.prog && beat) {
      const pct = Math.round(clamp(nowMs / (beat.end + beat.ms)) * 200) / 2;
      if (pct !== lastPct) { lastPct = pct; dom.prog.style.width = `${pct}%`; }
    }
  }

  function flash(lane, kind, index) {
    flashes[lane] = { kind: kind || null, at: now() };
    if (!kind) return;
    if (typeof index === 'number') {
      if (index >= 0 && index < chart.length) hit[index] = 1;
      return;
    }
    let best = -1, bestD = Infinity;
    chart.forEach((n, i) => {
      if (n.lane !== lane || hit[i] || missed[i]) return;
      const d = Math.abs(n.t - lastNow);
      if (d <= JUDGE_MS.good + 60 && d < bestD) { best = i; bestD = d; }
    });
    if (best >= 0) hit[best] = 1;
  }

  function miss(index) {
    const n = chart[index];
    if (!n) return;
    missed[index] = 1;
    misses[n.lane] = { kind: 'miss', at: now() };
  }

  function close() {
    window.removeEventListener('resize', resize);
    window.removeEventListener('keydown', onKey, true);
    dom.root.removeEventListener('pointerdown', onPointer);
    dom.root.remove();
  }

  dom.root.addEventListener('pointerdown', onPointer);
  window.addEventListener('keydown', onKey, true);
  window.addEventListener('resize', resize);
  resize();
  return { draw, flash, miss, close };
}
