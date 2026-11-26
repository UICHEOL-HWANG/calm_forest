import { CONFIG, IS_DEV_SESSION } from '../config.js';
import { getAccessToken } from '../supabase-client.js';
import { takeNudge } from './rules.js';
import { runSignupGift } from './flow.js';
import { BOX, GIFT_ICONS } from './copy.js';
import { modalQueue } from '../guide/modal-queue.js';
import { queueLoginNudge } from '../guide/nudge-cap.js';

export function requestSignupNudge(state, trigger, ui) {
  if (!takeNudge(state.hintsSeen?.signupNudge, trigger).fire) return false;
  return queueLoginNudge(trigger, ui, modalQueue, () => {
    const seen = state.hintsSeen || {};
    state.hintsSeen = { ...seen, signupNudge: takeNudge(seen.signupNudge, trigger).flags };
  });
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
  modalQueue.request({ kind: 'giftBox', show: () => modal.classList.add('show') });
}

export async function signupGiftOnPlay({ auth, track, resync, ui }) {
  if (IS_DEV_SESSION || !CONFIG.SIGNUP_GIFT_API) return null;
  try {
    return await runSignupGift({ auth, call, resync, track, show: (item) => showGiftBox(item, track, ui) });
  } catch (e) {
    return null;
  }
}
