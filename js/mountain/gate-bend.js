export const GATE_BEND = Object.freeze({ reach: 0.6, airY: 1.2, kick: 7, k: 55, damp: 6, max: 1.2, turn: 12 });

const REST = Object.freeze({ a: 0, w: 0, dx: 0, dz: 1 });

export function stepPole(b, dt, push) {
  const w0 = push ? Math.max(b.w, GATE_BEND.kick) : b.w;
  const w = w0 + (-GATE_BEND.k * b.a - GATE_BEND.damp * w0) * dt;
  const a = Math.min(GATE_BEND.max, Math.max(-GATE_BEND.max * 0.4, b.a + w * dt));
  if (!push) return { a, w, dx: b.dx, dz: b.dz };
  const len = Math.hypot(push.dx, push.dz) || 1;
  const k = Math.min(1, dt * GATE_BEND.turn);
  const dx = b.dx + (push.dx / len - b.dx) * k, dz = b.dz + (push.dz / len - b.dz) * k;
  const n = Math.hypot(dx, dz) || 1;
  return { a, w, dx: dx / n, dz: dz / n };
}

export function touchesPole(span, at, lift) {
  return lift < GATE_BEND.airY && Math.hypot(at.x - span.x, at.z - span.z) < GATE_BEND.reach;
}

export function bendVerts(out, base, span, b) {
  const ax = b.dz, az = -b.dx;
  const c = Math.cos(b.a), s = Math.sin(b.a), k = 1 - c;
  for (let i = span.start * 3, end = (span.start + span.count) * 3; i < end; i += 3) {
    const x = base[i] - span.x, y = base[i + 1] - span.y, z = base[i + 2] - span.z;
    const dot = ax * x + az * z;
    out[i] = span.x + x * c + (-az * y) * s + ax * dot * k;
    out[i + 1] = span.y + y * c + (az * x - ax * z) * s;
    out[i + 2] = span.z + z * c + (ax * y) * s + az * dot * k;
  }
}

export function createGateBend(mesh) {
  const spans = mesh?.userData.spans;
  if (!spans) return null;
  const attr = mesh.geometry.getAttribute('position');
  const base = attr.array.slice();
  let poles = spans.map(() => REST);
  const settled = b => Math.abs(b.a) < 1e-3 && Math.abs(b.w) < 1e-2;
  return {
    update(at, lift, dt) {
      let dirty = false;
      poles = poles.map((b, i) => {
        const span = spans[i];
        const push = touchesPole(span, at, lift) ? { dx: (span.x - at.x) * 2, dz: 1 } : null;
        if (!push && b === REST) return b;
        const next = stepPole(b, dt, push);
        const done = !push && settled(next);
        bendVerts(attr.array, base, span, done ? REST : next);
        dirty = true;
        return done ? REST : next;
      });
      if (dirty) attr.needsUpdate = true;
    },
    reset() {
      poles = spans.map(() => REST);
      attr.array.set(base);
      attr.needsUpdate = true;
    },
  };
}
