// =============================================================
//  🪞 거울 마을 트래킹 — 스펙 §8 의 11종을 이름·파라미터째 한곳에 고정한다
//  ------------------------------------------------------------
//  호출부(js/spaces/mirror.js · indoor.js)는 trackEvent 를 직접 부르지 않고 T.* 만 쓴다(quest_id 누락 사고 재발 방지).
//  싱크는 주입(bindTracker) — Node 테스트가 analytics.js(브라우저 전역) 없이 돈다.
// =============================================================
export const EVENTS = Object.freeze({
  mirror_stop_shown:   ['prior_visits', 'night'],
  mirror_board:        ['dir', 'first', 'done_today'],
  mirror_cutscene_end: ['dir', 'skipped', 'at_s', 'short'],
  mirror_enter:        ['visit_n', 'done_today'],
  mirror_clue:         ['quest_n', 'npc_id', 'spot_id', 'flipped'],
  mirror_hint:         ['quest_n', 'spot_id', 'wait_s'],
  mirror_found:        ['quest_n', 'item_id', 'spot_id', 'flipped', 'hinted', 'search_s'],
  mirror_return:       ['quest_n', 'reward'],
  mirror_leave:        ['done_today', 'elapsed_s'],
  mirror_onboard:      ['step'],
  decor_buy_mirror:    ['item', 'cost', 'left'],
});
const ENUMS = { dir: ['go', 'back'], step: ['stop', 'arrive', 'flip', 'return'] };

let sink = null, strict = false;
export function bindTracker(fn, opts = {}) { sink = fn; strict = !!opts.strict; }

function emit(name, p) {
  p = p ?? {};
  const keys = EVENTS[name], out = {}, bad = [];
  for (const k of keys) {
    if (p[k] === undefined) { bad.push(`missing ${k}`); continue; }
    const v = p[k];
    if (typeof v === 'number' && Number.isNaN(v)) { bad.push(`NaN ${k}`); continue; }
    if (ENUMS[k] && !ENUMS[k].includes(v)) bad.push(`bad ${k}=${v}`);
    out[k] = typeof v === 'boolean' ? +v : v;
  }
  for (const k of Object.keys(p)) if (!keys.includes(k)) bad.push(`unknown ${k}`);
  if (bad.length) { const msg = `[mirror track] ${name}: ${bad.join(', ')}`; if (strict) throw new Error(msg); console.warn(msg); }
  sink?.(name, out);
}
export const T = Object.freeze({
  stopShown: (p) => emit('mirror_stop_shown', p),
  board: (p) => emit('mirror_board', p),
  cutsceneEnd: (p) => emit('mirror_cutscene_end', p),
  enter: (p) => emit('mirror_enter', p),
  clue: (p) => emit('mirror_clue', p),
  hint: (p) => emit('mirror_hint', p),
  found: (p) => emit('mirror_found', p),
  ret: (p) => emit('mirror_return', p),
  leave: (p) => emit('mirror_leave', p),
  onboard: (p) => emit('mirror_onboard', p),
  decorBuy: (p) => emit('decor_buy_mirror', p),
});
