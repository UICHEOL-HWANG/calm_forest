export function steerFrom({ left, right }) {
  return left === right ? 0 : left ? -1 : 1;
}

export function worldSteer(input) {
  return 0 - steerFrom(input);
}

export function pointerSide(clientX, width) {
  return clientX < width / 2 ? 'left' : 'right';
}

export function initialInput(touch) {
  return touch ? 'touch' : 'keys';
}

export function bindSledInput(target, onBoost, { win = window, doc = document, initial = 'keys' } = {}) {
  const keys = { left: false, right: false };
  const pointers = new Map();
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
    pointers.set(e.pointerId, pointerSide(e.clientX, win.innerWidth));
    used = 'touch';
  };
  const pu = e => pointers.delete(e.pointerId);
  const release = () => {
    keys.left = false;
    keys.right = false;
    pointers.clear();
  };
  const onVisibility = () => { if (doc.visibilityState === 'hidden') release(); };
  const winListeners = [['keydown', kd], ['keyup', ku], ['pointerup', pu], ['pointercancel', pu], ['blur', release]];
  winListeners.forEach(([type, fn]) => win.addEventListener(type, fn));
  target.addEventListener('pointerdown', pd);
  doc.addEventListener('visibilitychange', onVisibility);
  return {
    read() {
      const sides = [...pointers.values()];
      return { left: keys.left || sides.includes('left'), right: keys.right || sides.includes('right') };
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
