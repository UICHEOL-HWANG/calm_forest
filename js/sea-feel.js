export const SEA_PAT = {
  aji:  { run: [.5, .9],   rest: [.8, 1.1],  hook: .6,  jump: .25, feint: 0,  side: 0,  tempo: .38, tele: .4 },
  buri: { run: [1.2, 1.8], rest: [.9, 1.2],  hook: .5,  jump: .2,  feint: 0,  side: 1,  tempo: .36, tele: .45 },
  mola: { run: [1.8, 2.6], rest: [1.4, 1.8], hook: .55, jump: 0,   feint: 0,  side: 0,  tempo: .55, tele: .55, steady: true },
  tuna: { run: [1.8, 2.6], rest: [.75, 1],   hook: .42, jump: .75, feint: .3, side: .5, tempo: .32, tele: .4 },
};

export const RING_LEAD = .62, RING_PERFECT = .075, RING_GOOD = .2, RING_START = .25;
export const RING_GAIN = { perfect: 3.2, good: 1.8 };

export function rollPhaseLen(pat, phase, rnd = Math.random) {
  if (phase === 'run') return pat.run[0] + rnd() * (pat.run[1] - pat.run[0]);
  if (rnd() < pat.feint) return .45;
  return pat.rest[0] + rnd() * (pat.rest[1] - pat.rest[0]);
}

export function scheduleRings(restStart, restLen, tempo) {
  const rings = [];
  for (let i = 0; RING_START + i * tempo < restLen - .05; i++) rings.push({ hit: restStart + RING_START + i * tempo, done: false });
  return rings;
}

export function judgeRing(rings, now) {
  let best = null;
  rings.forEach((r, index) => {
    const d = Math.abs(now - r.hit);
    if (r.done || d > RING_GOOD || (best && d >= best.d)) return;
    best = { index, d };
  });
  return best && { index: best.index, grade: best.d < RING_PERFECT ? 'perfect' : 'good' };
}

const CW = .38, CH = .07, CWH = .13, CF = .42;
export const CAST_WIND = CW, CAST_REL = CW + CH + CWH * .55, CAST_END = CW + CH + CWH + CF, CAST_FLIGHT = .85;
const smooth = u => u * u * (3 - 2 * u), easeOut3 = u => 1 - Math.pow(1 - u, 3), lerp = (a, b, u) => a + (b - a) * u;

export function castPose(t, idle) {
  if (t < CW) {
    const u = smooth(t / CW);
    return { elev: lerp(idle, 2.3, u), lean: -.12 * u, armUp: .95 * u, twist: .2 * u, tip: .15 * u, squash: -.02 * u };
  }
  if (t < CW + CH) {
    const u = (t - CW) / CH;
    return { elev: 2.3 + .08 * Math.sin(u * Math.PI), lean: -.12, armUp: .95, twist: .2, tip: .15 + .1 * u, squash: -.02 };
  }
  if (t < CW + CH + CWH) {
    const u = (t - CW - CH) / CWH, e = u * u;
    return { elev: lerp(2.38, -.1, e), lean: lerp(-.12, .1, e), armUp: lerp(.95, .15, e), twist: lerp(.2, -.08, e),
      tip: -.75 * Math.sin(u * Math.PI), squash: lerp(-.02, .02, e) };
  }
  const u = Math.min(1, (t - CW - CH - CWH) / CF), d = Math.exp(-5 * u);
  return { elev: lerp(-.1, idle, easeOut3(u)) + Math.sin(u * 14) * .12 * d, lean: .1 * d, armUp: .15 * d, twist: -.08 * d,
    tip: Math.sin(u * 22) * .35 * d, squash: .02 * d * Math.cos(u * 12) };
}

export const PUMP_IDLE = .6;

export function pumpPose(phase, lift, time, dir = 1) {
  if (phase === 'run') return { elev: 1.15 + Math.sin(time * 14) * .03, lean: -.14, armUp: .35, roll: -dir * .1 };
  const l = Math.sin(Math.min(1, Math.max(0, lift)) * Math.PI / 2);
  return { elev: .5 + .7 * l, lean: -.02 - .07 * l, armUp: .25 * l, roll: 0 };
}

export function rodBendAxis(dir, fwd) {
  const k = fwd.x * dir.x + fwd.y * dir.y + fwd.z * dir.z;
  let x = fwd.x - dir.x * k, y = fwd.y - dir.y * k, z = fwd.z - dir.z * k;
  let n = Math.hypot(x, y, z);
  if (n < 1e-6) { x = 0; y = -1; z = 0; n = 1; }
  return { x: x / n, y: y / n, z: z / n };
}

export function buoyFlight(from, to, T, tt, G = 14) {
  const k = Math.min(1, tt / T), e = 1 - Math.pow(1 - k, 1.7), s = Math.min(T, tt);
  const vy0 = (to.y - from.y + .5 * G * T * T) / T;
  return { x: lerp(from.x, to.x, e), y: from.y + vy0 * s - .5 * G * s * s, z: lerp(from.z, to.z, e), vy: vy0 - G * s };
}

function collideInPlace(q, pier) {
  if (!pier) return;
  for (const s of pier.posts) {
    if (q.y >= s.top) continue;
    let dx = q.x - s.x, dz = q.z - s.z, d = Math.hypot(dx, dz);
    if (d >= s.r) continue;
    if (d < 1e-6) { dx = 1; dz = 0; d = 1; }
    q.x = s.x + dx / d * s.r; q.z = s.z + dz / d * s.r;
  }
  const onDeck = Math.abs(q.x) <= pier.halfW && q.z <= pier.z0 && q.z >= pier.z1;
  const floor = onDeck ? pier.top : pier.water;
  if (q.y < floor) q.y = floor;
}

export function collidePier(p, pier) {
  const q = { x: p.x, y: p.y, z: p.z };
  collideInPlace(q, pier);
  return q;
}

export function createRope(n, at) {
  return Array.from({ length: n }, () => ({ p: { x: at.x, y: at.y, z: at.z }, o: { x: at.x, y: at.y, z: at.z } }));
}

export function resetRope(rope, at) {
  rope.forEach(({ p, o }) => { p.x = o.x = at.x; p.y = o.y = at.y; p.z = o.z = at.z; });
}

const setP = (v, w) => { v.x = w.x; v.y = w.y; v.z = w.z; };

export function stepRope(rope, a, b, slack, dt, pier) {
  const n = rope.length, last = n - 1;
  const seg = Math.max(.02, Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z) * slack) / last, g = 9 * dt * dt;
  for (let i = 1; i < last; i++) {
    const { p, o } = rope[i];
    const vx = (p.x - o.x) * .97, vy = (p.y - o.y) * .97, vz = (p.z - o.z) * .97;
    setP(o, p);
    p.x += vx; p.y += vy - g; p.z += vz;
    const freeY = p.y;
    collideInPlace(p, pier);
    if (p.y > freeY) { o.x += (p.x - o.x) * .5; o.z += (p.z - o.z) * .5; }
  }
  setP(rope[0].p, a); setP(rope[last].p, b);
  for (let k = 0; k < 16; k++) {
    for (let i = 0; i < last; i++) {
      const p1 = rope[i].p, p2 = rope[i + 1].p;
      const dx = p2.x - p1.x, dy = p2.y - p1.y, dz = p2.z - p1.z, d = Math.hypot(dx, dy, dz);
      if (d <= seg || d < 1e-6) continue;
      const f = (d - seg) / d, w1 = i === 0 ? 0 : i + 1 === last ? 1 : .5, w2 = 1 - w1;
      p1.x += dx * f * w1; p1.y += dy * f * w1; p1.z += dz * f * w1;
      p2.x -= dx * f * w2; p2.y -= dy * f * w2; p2.z -= dz * f * w2;
    }
    for (let i = 1; i < last; i++) collideInPlace(rope[i].p, pier);
  }
  return rope;
}
