export const ROOT_CINE_DUR = [1.0, 1.3, 1.3, 1.1];
export const ROOT_CINE_SKIP = 0.4;

const ease = (t) => { const x = Math.min(1, Math.max(0, t)); return x * x * x * (x * (x * 6 - 15) + 10); };
const mix = (a, b, k) => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, z: a.z + (b.z - a.z) * k });

const CINE_MIN_D = 3.2, CINE_HALF_W = 0.78;

export function cineShots(panels, aspect, fov = 42) {
  const d = Math.max(CINE_MIN_D, CINE_HALF_W / (Math.tan((fov * Math.PI) / 360) * aspect));
  return panels.map(p => ({ pos: { x: p.x, y: p.y + 0.35, z: p.z + d }, look: { x: p.x, y: p.y, z: p.z } }));
}

export function createRootCine({ from, shots, home, onLight }) {
  const total = ROOT_CINE_DUR.reduce((a, b) => a + b, 0);
  const lightAt = ROOT_CINE_DUR[0] + ROOT_CINE_DUR[1];
  const hp = { x: 0, y: 0, z: 0 }, hl = { x: 0, y: 0, z: 0 };
  const cur = { pos: { ...from.pos }, look: { ...from.look } };
  let t = 0, phase = 'run', lit = false, skipFrom = null;
  const light = () => { if (!lit) { lit = true; onLight?.(); } };
  const homePose = () => { home(hp, hl); return { pos: { ...hp }, look: { ...hl } }; };
  const key = (i) => (i === 0 ? from : i === ROOT_CINE_DUR.length ? homePose() : shots[i - 1]);
  const set = (a, b, k) => { cur.pos = mix(a.pos, b.pos, k); cur.look = mix(a.look, b.look, k); };
  return {
    cur,
    get phase() { return phase; },
    get lit() { return lit; },
    skip() {
      if (phase !== 'run') return;
      light();
      phase = 'skip'; t = 0;
      skipFrom = { pos: { ...cur.pos }, look: { ...cur.look } };
    },
    update(dt) {
      if (phase === 'done') return phase;
      t += dt;
      if (phase === 'skip') {
        set(skipFrom, homePose(), ease(t / ROOT_CINE_SKIP));
        if (t >= ROOT_CINE_SKIP) { Object.assign(cur, homePose()); phase = 'done'; }
        return phase;
      }
      let i = 0, acc = 0;
      while (i < ROOT_CINE_DUR.length - 1 && t > acc + ROOT_CINE_DUR[i]) { acc += ROOT_CINE_DUR[i]; i++; }
      set(key(i), key(i + 1), ease((t - acc) / ROOT_CINE_DUR[i]));
      if (t >= lightAt) light();
      if (t >= total) { Object.assign(cur, homePose()); phase = 'done'; }
      return phase;
    },
  };
}
