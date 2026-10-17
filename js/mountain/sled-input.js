export const STICK_R = 46;
const DEAD = 0.12;

const clamp1 = v => Math.max(-1, Math.min(1, v));

export function steerFrom({ left, right, axis = 0 }) {
  const keys = left === right ? 0 : left ? -1 : 1;
  return clamp1(keys + axis);
}

export function worldSteer(input) {
  return 0 - steerFrom(input);
}

export function stickAxis(dx) {
  const a = clamp1(dx / STICK_R);
  return Math.abs(a) < DEAD ? 0 : a;
}

export function initialInput(touch) {
  return touch ? 'touch' : 'keys';
}

export function bindSledInput(target, onBoost, { win = window, doc = document, initial = 'keys' } = {}) {
  const keys = { left: false, right: false };
  let stick = null;
  let others = new Map();
  let used = initial;
  const onKey = down => e => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = down;
    else if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = down;
    else if (e.code === 'Space' && down && !e.repeat) onBoost();
    else return;
    used = 'keys';
    e.preventDefault();
  };
  const kd = onKey(true), ku = onKey(false);
  const pd = e => {
    if (e.target?.closest?.('[data-sled-boost], [data-sled-ui]')) return;
    used = 'touch';
    if (stick) {
      others = new Map(others).set(e.pointerId, { x: e.clientX, y: e.clientY });
      return;
    }
    stick = { id: e.pointerId, x: e.clientX, y: e.clientY, dx: 0 };
  };
  const pm = e => {
    if (others.has(e.pointerId)) others = new Map(others).set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (!stick || e.pointerId !== stick.id) return;
    stick = { ...stick, dx: Math.max(-STICK_R, Math.min(STICK_R, e.clientX - stick.x)) };
  };
  const pu = e => {
    if (others.has(e.pointerId)) {
      others = new Map([...others].filter(([id]) => id !== e.pointerId));
      return;
    }
    if (!stick || e.pointerId !== stick.id) return;
    const [next] = others;
    stick = next ? { id: next[0], x: next[1].x, y: next[1].y, dx: 0 } : null;
    if (next) others = new Map([...others].slice(1));
  };
  const release = () => {
    keys.left = false;
    keys.right = false;
    stick = null;
    others = new Map();
  };
  const onVisibility = () => { if (doc.visibilityState === 'hidden') release(); };
  const winListeners = [['keydown', kd], ['keyup', ku], ['pointermove', pm], ['pointerup', pu], ['pointercancel', pu], ['blur', release]];
  winListeners.forEach(([type, fn]) => win.addEventListener(type, fn));
  target.addEventListener('pointerdown', pd);
  doc.addEventListener('visibilitychange', onVisibility);
  return {
    read() {
      return { left: keys.left, right: keys.right, axis: stick ? stickAxis(stick.dx) : 0 };
    },
    stick() {
      return stick && { x: stick.x, y: stick.y, dx: stick.dx };
    },
    input() { return used; },
    dispose() {
      winListeners.forEach(([type, fn]) => win.removeEventListener(type, fn));
      target.removeEventListener('pointerdown', pd);
      doc.removeEventListener('visibilitychange', onVisibility);
      release();
    },
  };
}
