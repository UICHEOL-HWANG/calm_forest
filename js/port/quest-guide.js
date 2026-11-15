import { QUESTS } from './data.js';

const open = (q, night) => !q.night || night;

export function pickQuestGuide(states, night, from, npcPos, prev = null) {
  const live = QUESTS.filter(q => open(q, night));
  const active = live.find(q => states[q.id]?.state === 'active');
  if (active) return { id: active.id, mode: 'run' };
  if (prev?.mode === 'ask' && states[prev.id]?.state === 'avail' && live.some(q => q.id === prev.id)) return prev;
  let best = null, bd = Infinity;
  for (const q of live) {
    if (states[q.id]?.state !== 'avail') continue;
    const p = npcPos[q.id], d = Math.hypot(p.x - from.x, p.z - from.z);
    if (d < bd) { bd = d; best = q; }
  }
  return best ? { id: best.id, mode: 'ask' } : null;
}

const FISHER_STEPS = Object.freeze({ collect: Object.freeze({ quest: 'port_quest', npc: 'port:fisher' }), turnin: Object.freeze({ quest: 'port_quest', npc: 'port:fisher' }) });

export function portFocus(mainStep, pick) {
  if (mainStep) return FISHER_STEPS[mainStep] ?? null;
  if (!pick) return null;
  return pick.mode === 'run' ? { quest: 'port_quest', npc: `port:${pick.id}` } : { npc: `port:${pick.id}` };
}

export function questSteps(q) {
  return [
    { id: 'collect', text: c => `${q.hint} (${c.got}/${q.need})`, target: c => c.item, done: c => c.state !== 'active' || c.got >= q.need, expect: ['port_pick'] },
    { id: 'turnin', text: `${q.who}에게 돌려주세요`, target: c => c.npc, done: c => c.state !== 'active', expect: ['port_talk', 'port_next'] },
  ];
}

export function askSteps(q) {
  return [{ id: 'ask', text: `❗ ${q.who}에게 말을 걸어 보세요`, target: c => c.npc, done: c => c.state !== 'avail', expect: ['port_talk', 'port_next'] }];
}
