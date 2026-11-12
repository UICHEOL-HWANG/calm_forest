export const YARD_IDLE_SEC = 5;
export const YARD_PIER = Object.freeze({ x: 12.8, z: 9 });
export const GO_REACH = 3;

export function yardIdle(prev, dt, free) {
  return free ? prev + dt : 0;
}

export function yardReady({ on, bridge, done, idleSec }) {
  return !!on && !!bridge && !done && idleSec >= YARD_IDLE_SEC;
}

export function yardSteps(copy) {
  return [
    { id: 'lake', text: copy.stepLake, target: c => c.pier, done: c => c.hasPond || c.nearLake },
    { id: 'cast', text: copy.stepCast, target: c => c.pier, done: c => c.hasPond || c.fishing },
    { id: 'catch', text: copy.stepCatch, target: c => c.pier, done: c => c.hasPond },
    { id: 'pond', text: copy.stepPond, target: c => c.pond, done: c => c.fedToday || c.nearPond },
    { id: 'feed', text: copy.stepFeed, target: c => c.pond, done: c => c.fedToday },
  ];
}

export function goStep(spot, text) {
  return { id: 'go', text, target: () => spot, done: c => Math.hypot(c.me.x - spot.x, c.me.z - spot.z) <= GO_REACH };
}

export function d1Ready({ on, yardDone, d1Done, pondDay, today, fedToday, idleSec }) {
  return !!on && !!yardDone && !d1Done && !!pondDay && pondDay !== today && !fedToday && idleSec >= YARD_IDLE_SEC;
}

export function d1Steps(copy) {
  return [
    { id: 'd1_pond', text: copy.stepD1, target: c => c.pond, done: c => c.fedToday || c.nearPond },
    { id: 'd1_feed', text: copy.stepFeed, target: c => c.pond, done: c => c.fedToday },
  ];
}
