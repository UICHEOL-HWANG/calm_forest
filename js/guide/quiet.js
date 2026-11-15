const GOAL_LINKS = Object.freeze({ cosShop: Object.freeze({ quest: 'cos_onboard' }), museum: Object.freeze({ npc: 'curator' }) });
const MIN_GOAL = 3;

export const quiets = (focus, kind, id) => !!focus && id != null && focus[kind] === id;

export function markGuided(list, focus) {
  if (!focus?.quest) return list;
  return list.map(q => (q.id === focus.quest ? { ...q, guided: true } : q));
}

const bare = (s) => String(s || '').replace(/[^\p{L}\p{N}]/gu, '');

export function sameGoal(a, b) {
  const x = bare(a), y = bare(b);
  if (x.length < MIN_GOAL || y.length < MIN_GOAL) return false;
  return x.includes(y) || y.includes(x);
}

export function goalFocus(goal, title) {
  if (!goal) return null;
  return Object.freeze({ ...GOAL_LINKS[goal.key], ...(goal.flow === 'story' ? { story: true } : {}), text: title || null });
}

export const focusKey = (focus) => (focus ? JSON.stringify(focus) : '');
