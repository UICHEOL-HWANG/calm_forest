import { YARD_IDLE_SEC, YARD_MAX_TRIES } from '../pond/yard-steps.js';

export function tableGuideReady({ on, has, done, tries, idleSec }) {
  return !!on && !!has && !done && (tries | 0) < YARD_MAX_TRIES && idleSec >= YARD_IDLE_SEC;
}

export function tableSteps(copy) {
  return [
    { id: 'table', text: copy.stepTable, target: c => c.table, done: c => c.nearTable || c.bitToday },
    { id: 'bite', text: copy.stepBite, target: c => c.table, done: c => c.bitToday },
    { id: 'book', text: copy.stepBook, target: c => c.table, done: c => c.bitToday && c.bookAfterBite },
  ];
}
