import { pickSeason, datePhase, SEASON_OVERRIDE } from './seasons.js';
import { myStage, winterDefault, FOUNTAIN_DONE } from './winter-rules.js';
import { WINTER_COPY } from './winter-copy.js';

export function fountainCard(plaza, nowMs, open, override = SEASON_OVERRIDE) {
  if (!open) return null;
  const def = pickSeason(nowMs, override);
  if (def.kind !== 'winter' || (!override && datePhase(def, nowMs) !== 'active')) return null;
  const stage = myStage(plaza?.winter?.[def.id] || winterDefault());
  if (stage >= FOUNTAIN_DONE) return null;
  const c = WINTER_COPY.card;
  return { id: 'winter_fountain', name: c.name, title: c.title, desc: c.desc, how: c.how, progress: stage, target: FOUNTAIN_DONE, ready: false };
}
