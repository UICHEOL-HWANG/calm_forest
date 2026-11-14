import { $w, gameState, giveReward, makeNameTag, npcObjs, requestSave, todayStr, ui } from '../game.js';
import { AFF_FRAMES, AFF_OUTDOOR } from '../data/affinity-decor.js';
import { trackEvent } from '../analytics.js';
import { getLang, t } from '../i18n.js';
import { NPCS } from '../data/npcs.js';
import { BEST_ITEMS, letterOf } from '../data/npc-letters.js';
import { blueprintOfNpc } from '../tool-blueprints.js';
import {
  AFFINITY_NPCS, STAGES, GIFT_DAILY_CAP, isAffinityNpc, stageIndex, stageProgress,
  lettersToIssue, markIssued, letterKey, giftGain, owlDailyGain, pickTracker, allMaxed,
} from './stages.js';
import { refreshQuestPanel, updateNPCGlyph } from '../spaces/npc.js';
import { chipText, giftCapToast, introBody, introTitle, letterRowText, letterTitle, nextRewardText, retroToast, stageLabel, stageUpToast, trackerLines, trackerStart } from './copy.js';

const HOUSE_DONE = 3;
const lang = () => getLang();
const hints = () => gameState.hintsSeen || {};
const setHints = (patch) => { gameState.hintsSeen = { ...hints(), ...patch }; };
const npcDef = (id) => NPCS.find(n => n.id === id);
const nameOf = (id) => npcDef(id)?.name || id;
const houseDone = () => (gameState.houseStage || 0) >= HOUSE_DONE;
const hasBlueprint = (id) => { const b = blueprintOfNpc(id); return !!(b && gameState.blueprints?.[b.tool]); };
const hiddenIds = () => new Set((npcObjs || []).filter(o => o.hidden).map(o => o.def.id));

const FAMILY_IDX = STAGES.findIndex(s => s.id === 'family');

export function refreshFamilyTags() {
  for (const o of npcObjs || []) {
    if (!o?.tag || !isAffinityNpc(o.def.id)) continue;
    const family = stageIndex(gameState.affinity?.[o.def.id] || 0) >= FAMILY_IDX;
    if (!!o.familyTag === family) continue;
    const next = makeNameTag(o.def, family ? '🌳 ' : '');
    next.position.copy(o.tag.position);
    next.material.opacity = o.tag.material.opacity;
    next.visible = o.tag.visible;
    o.group.remove(o.tag);
    o.tag.material.map?.dispose(); o.tag.material.dispose();
    o.group.add(next);
    o.tag = next;
    o.familyTag = family;
  }
}

let unreadListener = null;
export function onLettersChanged(fn) { unreadListener = fn; }
const notify = () => {
  unreadListener?.();
  refreshQuestPanel();
  for (const o of npcObjs || []) if (isAffinityNpc(o.def.id)) { o.lastGlyph = null; updateNPCGlyph(o); }
};

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
  if (to <= from) { refreshQuestPanel(); return null; }
  for (let i = from + 1; i <= to; i++) trackEvent('affinity_stage', { npc: id, stage: i + 1, via });
  const letters = issueLetters();
  if (to >= FAMILY_IDX) refreshFamilyTags();
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
  if (!gain) refreshQuestPanel();
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
  refreshFamilyTags();
  const letters = issueLetters();
  if (!letters.length) return 0;
  for (const l of letters) trackEvent('affinity_stage', { npc: l.npc, stage: l.idx + 1, via: 'retro' });
  if (houseDone()) ui.toast?.(retroToast(letters.length, lang()), 3600, { afterDialog: true });
  requestSave();
  notify();
  return letters.length;
}

function decorGiftText(gift) {
  if (!gift?.decor) return null;
  const d = [...AFF_OUTDOOR, ...AFF_FRAMES].find(x => x.id === gift.decor);
  return d ? `${d.ico} ${t(d.name)}` : null;
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
    giftText: decorGiftText(letter.gift),
    read: !!hints().affRead?.[key],
    claimed: !!hints().affClaim?.[key],
  };
}

export function affinityLetters() {
  return [...(hints().affOrder || [])].reverse().map(letterView).filter(Boolean);
}

export function affinityHouseReady() {
  const n = unreadLetterCount();
  if (n) ui.toast?.(retroToast(n, lang()), 3600, { afterDialog: true });
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
  if (!v || v.claimed || !v.gift) return null;
  if (v.gift?.decor && !$w.grantDecor(v.gift.decor)) return null;
  setHints({ affClaim: { ...(hints().affClaim || {}), [key]: 1 } });
  if (v.gift && !v.gift.decor) giveReward({ ...v.gift }, 'affinity_letter', key);
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

const visibleIds = () => { const hidden = hiddenIds(); return AFFINITY_NPCS.filter(id => !hidden.has(id) && npcDef(id)); };

function rewardLabel(id, idx) {
  const s = STAGES[idx];
  if (!s) return '';
  if (s.id === 'nbr') return `✉️ ${t('편지')}`;
  if (s.id === 'friend') return blueprintOfNpc(id) ? `📜 ${t('도면')}` : `💎 ${t('보석')}`;
  if (s.id === 'best') return BEST_ITEMS[id] ? `${BEST_ITEMS[id].ico} ${t(BEST_ITEMS[id].name)}` : '';
  return `🖼️ ${t('액자')}`;
}

export function affinityTracker(compact = false) {
  if (!houseDone()) return null;
  const pick = pickTracker(gameState.affinity, visibleIds());
  if (!pick) return allMaxed(gameState.affinity, visibleIds()) ? null : { start: true, text: trackerStart(lang()) };
  const { npc, value, next } = pick;
  const nextIdx = stageIndex(value) + 1;
  return {
    npc, value, face: npcDef(npc).emoji, decor: BEST_ITEMS[npc]?.decor || null, pct: Math.min(1, value / next),
    ...trackerLines({ name: nameOf(npc), nameEn: t(nameOf(npc)), value, next, nextIdx, reward: rewardLabel(npc, nextIdx), giftLeft: GIFT_DAILY_CAP - giftHeartsToday(npc), compact, lang: lang() }),
  };
}

const startedAny = () => AFFINITY_NPCS.some(id => (gameState.affinity?.[id] || 0) > 0);

export function affinityIntroFor(npcId, force = false) {
  if (!houseDone() || !BEST_ITEMS[npcId] || !isAffinityNpc(npcId) || npcId === 'courier') return null;
  if (!force && (hints().affIntro || startedAny())) return null;
  const item = BEST_ITEMS[npcId];
  const L = lang();
  return {
    npc: npcId, face: npcDef(npcId)?.emoji || '🙂', decor: item.decor,
    title: introTitle({ name: nameOf(npcId), nameEn: t(nameOf(npcId)), lang: L }),
    body: introBody({ item: `${item.ico} ${item.name}`, itemEn: `${item.ico} ${t(item.name)}`, lang: L }),
  };
}

export function introNpcForStart() {
  return visibleIds().find(id => BEST_ITEMS[id] && id !== 'courier') || null;
}

export function markIntroSeen(npcId, from) {
  if (!hints().affIntro) { setHints({ affIntro: 1 }); requestSave(); }
  trackEvent('affinity_intro_open', { npc: npcId, from });
}

export function hasUnreadLetter(npcId) {
  return affinityLetters().some(l => l.npc === npcId && !l.read);
}
