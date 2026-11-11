import { QUESTS } from './data.js';

export const splitLines = text => text.split(/(?<=[.?!])\s+/).filter(Boolean);

export function portCard(port, inPort) {
  if (!inPort || !port) return null;
  const q = QUESTS.find(d => port.quests?.[d.id]?.state === 'active');
  if (!q) return null;
  const s = port.quests[q.id];
  return { id: 'port_quest', name: q.who, title: `📜 ${q.title}`, desc: `${q.itemName} ${q.need}개 가져다주기`, how: `${q.who}에게 가져가요`, progress: s.got, target: q.need, ready: s.got >= q.need };
}
