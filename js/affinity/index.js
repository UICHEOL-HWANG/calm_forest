import { gameState, giveReward, npcObjs, requestSave, todayStr, ui } from '../game.js';
import { trackEvent } from '../analytics.js';
import { getLang, t } from '../i18n.js';
import { NPCS } from '../data/npcs.js';
import { BEST_ITEMS, letterOf } from '../data/npc-letters.js';
import { blueprintOfNpc } from '../tool-blueprints.js';
import {
  AFFINITY_NPCS, STAGES, GIFT_DAILY_CAP, isAffinityNpc, stageIndex, stageProgress,
  lettersToIssue, markIssued, letterKey, giftGain, owlDailyGain,
} from './stages.js';
import { chipText, giftCapToast, letterRowText, letterTitle, nextRewardText, retroToast, stageLabel, stageUpToast } from './copy.js';

const HOUSE_DONE = 3;
const lang = () => getLang();
const hints = () => gameState.hintsSeen || {};
const setHints = (patch) => { gameState.hintsSeen = { ...hints(), ...patch }; };
const npcDef = (id) => NPCS.find(n => n.id === id);
const nameOf = (id) => npcDef(id)?.name || id;
const houseDone = () => (gameState.houseStage || 0) >= HOUSE_DONE;
const hasBlueprint = (id) => { const b = blueprintOfNpc(id); return !!(b && gameState.blueprints?.[b.tool]); };
const hiddenIds = () => new Set((npcObjs || []).filter(o => o.hidden).map(o => o.def.id));

let unreadListener = null;
export function onLettersChanged(fn) { unreadListener = fn; }
const notify = () => unreadListener?.();

function issueLetters() {
  const issued = hints().affStage || {};
  const letters = lettersToIssue(gameState.affinity, issued);
  if (!letters.length) return [];
  setHints({
    affStage: markIssued(issued, letters),
    affOrder: [...(hints().affOrder || []), ...letters.map(l => letterKey(l.npc, l.idx))],
  });
  return letters;
}

export function gainAffinity(id, amount, via) {
  if (!(amount > 0)) return null;
  const before = gameState.affinity[id] || 0;
  gameState.affinity = { ...gameState.affinity, [id]: before + amount };
  if (!isAffinityNpc(id)) return null;
  const from = stageIndex(before), to = stageIndex(before + amount);
  if (to <= from) return null;
  for (let i = from + 1; i <= to; i++) trackEvent('affinity_stage', { npc: id, stage: i + 1, via });
  const letters = issueLetters();
  const toasted = houseDone();
  if (toasted) {
    ui.toast?.(stageUpToast({ name: nameOf(id), nameEn: t(nameOf(id)), idx: to, letter: letters.length > 0, lang: lang() }), 3200, { afterDialog: true });
  }
  requestSave();
  notify();
  return { idx: to, letters: letters.length, toasted };
}

export function giftAffinity(id, love) {
  if (!isAffinityNpc(id)) { gainAffinity(id, love, 'gift'); return { gain: love, capped: false, toasted: false }; }
  const { gain, state } = giftGain(hints().affGift, todayStr(), id, love);
  setHints({ affGift: state });
  const up = gain > 0 ? gainAffinity(id, gain, 'gift') : null;
  const capped = gain < love;
  if (capped) {
    trackEvent('affinity_gift_capped', { npc: id });
    ui.toast?.(giftCapToast({ name: nameOf(id), nameEn: t(nameOf(id)), lang: lang() }), 2600, { afterDialog: true });
  }
  return { gain, capped, toasted: !!up?.toasted || capped };
}

export function giftHeartsToday(id) {
  const s = hints().affGift;
  return s && s.d === todayStr() && s.by ? (s.by[id] || 0) : 0;
}

export function owlDailyAffinity() {
  const { gain, day } = owlDailyGain(hints().affOwlDay, todayStr());
  if (!gain) return false;
  setHints({ affOwlDay: day });
  const up = gainAffinity('courier', gain, 'daily');
  if (!up?.toasted) ui.toast?.('🦉 오늘 의뢰 다 끝! 올빼미 ❤️+1', 2400, { afterDialog: true });
  return true;
}

export function syncAffinityLetters() {
  const letters = issueLetters();
  if (!letters.length) return 0;
  for (const l of letters) trackEvent('affinity_stage', { npc: l.npc, stage: l.idx + 1, via: 'retro' });
  if (houseDone()) ui.toast?.(retroToast(letters.length, lang()), 3600, { afterDialog: true });
  requestSave();
  notify();
  return letters.length;
}

function letterView(key) {
  const [npc, min] = key.split(':');
  const idx = STAGES.findIndex(s => String(s.min) === min);
  const L = lang();
  const letter = letterOf(npc, idx, { hasBlueprint: hasBlueprint(npc), lang: L });
  if (!letter) return null;
  const def = npcDef(npc);
  return {
    key, npc, idx,
    face: def?.emoji || '✉️',
    title: letterTitle({ name: nameOf(npc), nameEn: t(nameOf(npc)), lang: L }),
    row: letterRowText({ name: nameOf(npc), nameEn: t(nameOf(npc)), idx, lang: L }),
    stage: stageLabel(idx, L),
    body: letter.body,
    gift: letter.gift,
    read: !!hints().affRead?.[key],
    claimed: !!hints().affClaim?.[key],
  };
}

export function affinityLetters() {
  return [...(hints().affOrder || [])].reverse().map(letterView).filter(Boolean);
}

export function unreadLetterCount() {
  return affinityLetters().filter(l => !l.read).length;
}

export function readLetter(key) {
  if (hints().affRead?.[key]) return;
  setHints({ affRead: { ...(hints().affRead || {}), [key]: 1 } });
  const v = letterView(key);
  if (v) trackEvent('affinity_letter_open', { npc: v.npc, stage: v.idx + 1 });
  requestSave();
  notify();
}

export function claimLetter(key) {
  const v = letterView(key);
  if (!v || v.claimed) return null;
  setHints({ affClaim: { ...(hints().affClaim || {}), [key]: 1 } });
  if (v.gift) giveReward({ ...v.gift }, 'affinity_letter', key);
  trackEvent('affinity_reward_claim', { npc: v.npc, stage: v.idx + 1 });
  requestSave();
  return v.gift;
}

const nextIco = (id, nextIdx) => {
  const s = STAGES[nextIdx];
  if (!s) return '';
  if (s.id === 'nbr') return '✉️';
  if (s.id === 'friend') return blueprintOfNpc(id) ? '📜' : '💎';
  if (s.id === 'best') return BEST_ITEMS[id]?.ico || '🎁';
  return '🖼️';
};

function stageRows(id) {
  const L = lang();
  return STAGES.map((s, i) => {
    let reward = '';
    if (s.id === 'nbr') reward = '편지';
    else if (s.id === 'friend') reward = blueprintOfNpc(id) ? '도면' : '💎';
    else if (s.id === 'best') reward = BEST_ITEMS[id] ? `${BEST_ITEMS[id].ico} ${BEST_ITEMS[id].name}` : '아이템';
    else if (s.id === 'family') reward = '🖼️ 액자';
    return { label: stageLabel(i, L), min: s.min, reward: reward ? t(reward) : '' };
  });
}

export function affinityVisible(id) {
  return isAffinityNpc(id) && !hiddenIds().has(id);
}

export function affinityChip(id) {
  return chipText(gameState.affinity?.[id] || 0, lang());
}

export function npcBook() {
  const hidden = hiddenIds();
  const L = lang();
  return AFFINITY_NPCS.filter(id => !hidden.has(id) && npcDef(id)).map(id => {
    const n = gameState.affinity?.[id] || 0;
    const p = stageProgress(n);
    return {
      id, name: t(nameOf(id)), face: npcDef(id).emoji, value: n, idx: p.idx,
      stage: p.idx >= 0 ? stageLabel(p.idx, L) : '',
      chip: chipText(n, L),
      next: nextRewardText(n, p.next ? nextIco(id, p.idx + 1) : '', L),
      giftToday: giftHeartsToday(id), giftCap: GIFT_DAILY_CAP,
      rows: stageRows(id),
      letters: affinityLetters().filter(l => l.npc === id),
    };
  });
}

export function trackBookOpen(from, npc) {
  trackEvent('npc_book_open', { from, npc: npc || '' });
}
