import { CONFIG, IS_DEV_SESSION } from '../config.js';
import { getAccessToken } from '../supabase-client.js';
import { takeNudge } from './rules.js';
import { runSignupGift } from './flow.js';
import { BOX, GIFT_ICONS } from './copy.js';

const BUSY = ['body.intro-open', '#char-modal.show', '#tutorial-modal.show', '#hint-modal.show', '#nudge-modal.show', '#gift-box-modal.show'];
const busyWith = (ui) => () => BUSY.some(sel => document.querySelector(sel)) || !!ui?.coachActive?.() || !!ui?.anyModalOpen?.();

function whenIdle(fn, busy, { first = 3000, every = 700, maxMs = 120000 } = {}) {
  const t0 = Date.now();
  let clear = 0;
  const tick = () => {
    clear = busy() ? 0 : clear + 1;
    if (clear >= 2 || Date.now() - t0 >= maxMs) fn();
    else setTimeout(tick, every);
  };
  setTimeout(tick, first);
}

export function requestSignupNudge(state, trigger, ui) {
  const seen = state.hintsSeen || {};
  const { fire, flags } = takeNudge(seen.signupNudge, trigger);
  if (!fire) return false;
  state.hintsSeen = { ...seen, signupNudge: flags };
  whenIdle(() => ui.loginNudge?.(trigger), busyWith(ui));
  return true;
}

async function call(action) {
  const token = await getAccessToken();
  if (!token) return null;
  try {
    const r = await fetch(CONFIG.SIGNUP_GIFT_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action }),
    });
    if (!r.ok) return { error: r.status };
    return await r.json();
  } catch (e) {
    return null;
  }
}

const $ = (id) => document.getElementById(id);

export function showGiftBox(item, track, ui) {
  const modal = $('gift-box-modal');
  if (!modal || !BOX.open[item]) return;
  modal.dataset.state = 'closed';
  $('gift-box-title').textContent = BOX.closedTitle;
  $('gift-box-sub').textContent = BOX.closedSub;
  $('gift-box-ok').hidden = true;
  const box = $('gift-box-pkg');
  box.textContent = '🎁';
  box.onclick = () => {
    if (modal.dataset.state !== 'closed') return;
    modal.dataset.state = 'open';
    box.textContent = GIFT_ICONS[item];
    $('gift-box-title').textContent = BOX.open[item];
    $('gift-box-sub').textContent = BOX.openBody;
    $('gift-box-ok').hidden = false;
    track('signup_gift_open', { item });
  };
  $('gift-box-ok').onclick = () => modal.classList.remove('show');
  whenIdle(() => modal.classList.add('show'), busyWith(ui), { first: 1200 });
}

export async function signupGiftOnPlay({ auth, track, resync, ui }) {
  if (IS_DEV_SESSION || !CONFIG.SIGNUP_GIFT_API) return null;
  try {
    return await runSignupGift({ auth, call, resync, track, show: (item) => showGiftBox(item, track, ui) });
  } catch (e) {
    return null;
  }
}
