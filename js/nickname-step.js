import { checkNickname } from './nickname-filter.js';

export function createNickStep({ track, now = () => Date.now() }) {
  let t0 = null, typed = false, closed = false;
  const send = (params) => track('nickname_step', params);
  const ms = () => now() - t0;
  return {
    view() {
      t0 = now(); typed = false; closed = false;
      send({ step: 'view' });
    },
    input(value) {
      if (t0 === null || closed || typed || !String(value ?? '').trim()) return;
      typed = true;
      send({ step: 'type', ms: ms() });
    },
    done() {
      if (t0 === null || closed) return;
      closed = true;
      send({ step: 'done', ms: ms() });
    },
    leave(value) {
      if (t0 === null || closed) return;
      closed = true;
      const r = checkNickname(value);
      send({ step: 'leave', ms: ms(), reason: r.fail || 'none', len: r.nick.length });
    },
  };
}
