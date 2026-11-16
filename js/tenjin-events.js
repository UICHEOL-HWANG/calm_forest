const ONCE = {
  tutorial_complete: 'tutorial_complete',
  first_chop: 'first_chop',
  harvest_crop: 'first_harvest',
  house_complete: 'house_complete',
  photo_share: 'first_share',
  bridge_repaired: 'bridge_fixed',
};

export const onceSeed = (established) => (established ? [...Object.values(ONCE), 'push_granted'] : []);

const withValue =(name, v) => (Number.isFinite(v) ? { name, value: Math.round(v) } : { name });

export const RV_GROUPS = ['house', 'cafe', 'rush', 'sell', 'daily', 'pond', 'limit', 'reroll', 'double', 'other'];
export const RV_TALLY = 'rv_complete';
const RV_STEPS = [[3, 'rv_complete_3'], [10, 'rv_complete_10']];
const TALLY_KEY = 'cf_tj_rv';

const GROUP_RULES = [
  ['house', /^(house\d+|bridge|farm\d+|pond\d+|branch_.+|fountain_short)$/],
  ['cafe', /^cafe_order$/],
  ['rush', /^(farm_rush|craft_rush|orchard_.+|forge_.+)$/],
  ['sell', /^sell_bonus$/],
  ['daily', /^daily_double$/],
  ['pond', /^pond_feed_more$/],
  ['limit', /^(affinity_heart|concert_play|weekly_ticket)$/],
  ['reroll', /^(quest_reroll|drop_reroll_.+)$/],
  ['double', /^(restaurant_double|bait_box|fountain_double)$/],
];

export const rvGroup = (slot) => GROUP_RULES.find(([, re]) => re.test(String(slot)))?.[0] || 'other';

export const tallyEvents = (count) => RV_STEPS.filter(([n]) => count >= n).map(([, name]) => ({ name, once: true }));

export function bumpTally(storage) {
  let n = 0;
  try { n = Number(storage.getItem(TALLY_KEY)) || 0; } catch { n = 0; }
  n += 1;
  try { storage.setItem(TALLY_KEY, String(n)); } catch { return n; }
  return n;
}

function eligibleEvents(p) {
  const ad = p.arm === 'ad';
  return [{ name: ad ? 'rv_arm_ad' : 'rv_arm_control', once: true }, ...(ad ? [{ name: 'rv_first_offer', once: true }] : [])];
}

function completeEvents(p) {
  return [withValue('rewarded_ad_complete', p.sec), { name: `rv_${rvGroup(p.slot)}` },
    { name: 'rv_first_complete', once: true }, { tally: RV_TALLY }];
}

export function tenjinEventFor(name, p = {}) {
  if (ONCE[name]) return { name: ONCE[name], once: true };
  if (name === 'push_permission') return p.result === 'granted' ? { name: 'push_granted', once: true } : null;
  if (name === 'story_chapter_complete') return p.retro ? null : withValue('story_chapter', p.n);
  if (name === 'quest_complete') return { name: 'quest_complete' };
  if (name === 'prepass_eligible') return eligibleEvents(p);
  if (name === 'prepass_ad_result') return p.result === 'complete' ? completeEvents(p) : null;
  return null;
}
