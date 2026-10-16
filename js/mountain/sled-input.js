export function steerFrom({ left, right }) {
  return left === right ? 0 : left ? -1 : 1;
}

export function worldSteer(input) {
  return 0 - steerFrom(input);
}

export function pointerSide(clientX, width) {
  return clientX < width / 2 ? 'left' : 'right';
}

export function bindSledInput(target, onBoost) {
  const keys = { left: false, right: false };
  const pointers = new Map();
  let used = 'keys';
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
    pointers.set(e.pointerId, pointerSide(e.clientX, window.innerWidth));
    used = 'touch';
  };
  const pu = e => pointers.delete(e.pointerId);
  window.addEventListener('keydown', kd);
  window.addEventListener('keyup', ku);
  target.addEventListener('pointerdown', pd);
  window.addEventListener('pointerup', pu);
  window.addEventListener('pointercancel', pu);
  return {
    read() {
      const sides = [...pointers.values()];
      return { left: keys.left || sides.includes('left'), right: keys.right || sides.includes('right') };
    },
    input() { return used; },
    dispose() {
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
      target.removeEventListener('pointerdown', pd);
      window.removeEventListener('pointerup', pu);
      window.removeEventListener('pointercancel', pu);
    },
  };
}
