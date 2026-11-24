import { createPlaceCine } from '../guide/place-cine.js';
import { hallFrame } from '../guide/cine-path.js';
import { regionFrame } from '../world/region-cine.js';
import { REST_CINE, SHOT_FROM, SHOT_LOOK_Y, restCineKey, tourDue, featureCineDue, cineSpots } from './cine-plan.js';

export const HALL_SHOT = { h: 4.2, d: 4.2 };
const HOLD = 1.8;
const SPOTS = cineSpots();

export function createRestaurantCine(deps) {
  let cine = null;
  const ensure = () => (cine ??= createPlaceCine({
    camera: deps.camera, setCameraRig: deps.setCameraRig, translate: deps.t,
    stopAnalog: deps.stopAnalog, whoosh: deps.whoosh, lookOf: deps.lookOf,
  }));
  const seen = () => deps.state().hintsSeen || {};
  const mark = id => { const gs = deps.state(); gs.hintsSeen = { ...(gs.hintsSeen || {}), [restCineKey(id)]: true }; deps.save(); };
  const hallShot = spot => {
    const at = SPOTS[spot], f = hallFrame(at, SHOT_FROM[spot] || { x: 0, z: 0 }, { ...HALL_SHOT, lookY: SHOT_LOOK_Y[spot] ?? 0.9 });
    return { pos: deps.world(f.pos), look: deps.world(f.look) };
  };

  function run(id, frames, onEnd, indoor = false) {
    const def = REST_CINE[id];
    if (indoor) deps.showPlayer?.(false);
    const ok = ensure().play({
      sub: def.sub, hold: HOLD,
      shots: def.shots.map((s, i) => ({ main: s.main, frame: frames[i] })),
      onEnd: r => { if (indoor) deps.showPlayer?.(true); if (r.skipped) deps.track('guide_step', { flow: 'restaurant', goal: id, act: 'cine_skip' }); onEnd?.(r); },
    });
    if (!ok) { if (indoor) deps.showPlayer?.(true); return false; }
    mark(id);
    deps.track('guide_step', { flow: 'restaurant', goal: id, act: 'cine' });
    return true;
  }

  function door() {
    if (seen()[restCineKey('door')] || !deps.free()) return false;
    return run('door', [regionFrame(deps.door, deps.camera.aspect)]);
  }

  function enter({ rest, special, running }) {
    if (running || !deps.free()) return false;
    if (tourDue(rest, seen())) return run('tour', REST_CINE.tour.shots.map(s => hallShot(s.spot)), null, true);
    if (deps.coaching?.()) return false;
    const id = featureCineDue(rest, special, seen());
    if (!id) return false;
    const def = REST_CINE[id];
    return run(id, def.shots.map(s => hallShot(s.spot)), () => deps.banner(`restHint_${id}`, def.hint, () => deps.track('feature_hint', { id })), true);
  }

  return { door, enter, cancel: () => { if (cine?.active) deps.showPlayer?.(true); cine?.cancel(); }, get active() { return !!cine?.active; } };
}
