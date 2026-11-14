const ONCE = {
  tutorial_complete: 'tutorial_complete',
  first_chop: 'first_chop',
  harvest_crop: 'first_harvest',
  house_complete: 'house_complete',
  photo_share: 'first_share',
};

export const onceSeed = (established) => (established ? [...Object.values(ONCE), 'push_granted'] : []);

const withValue =(name, v) => (Number.isFinite(v) ? { name, value: Math.round(v) } : { name });

export function tenjinEventFor(name, p = {}) {
  if (ONCE[name]) return { name: ONCE[name], once: true };
  if (name === 'push_permission') return p.result === 'granted' ? { name: 'push_granted', once: true } : null;
  if (name === 'story_chapter_complete') return p.retro ? null : withValue('story_chapter', p.n);
  if (name === 'quest_complete') return { name: 'quest_complete' };
  if (name === 'prepass_ad_result') return p.result === 'complete' ? withValue('rewarded_ad_complete', p.sec) : null;
  return null;
}
