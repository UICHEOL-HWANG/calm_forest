export const DWELL_MARKS = [3, 10, 30];

export function createLoginDwell({ track, isOpen, isHidden, setTimer = setTimeout, clearTimer = clearTimeout, marks = DWELL_MARKS }) {
  let started = false;
  let timers = [];

  function stop() {
    timers.forEach(clearTimer);
    timers = [];
  }

  function fire(sec) {
    if (!isOpen()) { stop(); return; }
    if (isHidden()) return;
    track('login_dwell', { sec });
  }

  function start() {
    if (started) return;
    started = true;
    timers = marks.map(sec => setTimer(() => fire(sec), sec * 1000));
  }

  return { start, stop };
}
