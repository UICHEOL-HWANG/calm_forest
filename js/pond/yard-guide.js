import { createGuide } from '../guide/runner.js';
import { createGuideView } from '../guide/view.js';
import { SEA_GATE } from '../data/places.js';
import { feedStatus } from './actions.js';
import { yardIdle, yardReady, yardSteps, goStep, d1Ready, d1Steps, YARD_PIER } from './yard-steps.js';
import { POND_COPY } from './copy.js';

let inst = null;

export function createYardGuide(deps) {
  let guide = null, view = null, idle = 0, flow = null;

  const ctx = () => {
    const pond = deps.pondPos();
    return {
      me: deps.player.position, pier: YARD_PIER, pond, hasPond: !!pond,
      nearLake: deps.nearLake(), fishing: deps.fishing(), nearPond: deps.pondNear(),
      fedToday: feedStatus(deps.state().hintsSeen, deps.today()).fed,
    };
  };

  const stop = () => {
    guide = null;
    flow = null;
    view?.hide();
    deps.setAssist(false);
  };

  const run = (name, steps, onDone) => {
    view ??= createGuideView({ scene: deps.scene, camera: deps.camera, root: document.body });
    flow = name;
    guide = createGuide({
      flow: name, steps, now: () => performance.now(),
      onStep: e => deps.track('guide_step', e),
      onDone: () => { stop(); onDone?.(); },
    });
  };

  const startYard = () => {
    deps.banner(POND_COPY.owlStart);
    deps.setAssist(true);
    run('yard_fill', yardSteps(POND_COPY), () => {
      deps.state().hintsSeen.yardFill = true;
      deps.save();
      deps.banner(POND_COPY.owlDone);
    });
  };

  const startD1 = () => {
    run('pond_d1', d1Steps(POND_COPY), () => {
      deps.state().hintsSeen.pondD1 = true;
      deps.save();
    });
  };

  return {
    active: () => !!guide?.active(),
    pointTo(kind) {
      if (flow === 'yard_fill' || flow === 'pond_d1') return;
      const sea = kind === 'sea';
      run('pond_go', [goStep(sea ? { x: SEA_GATE.x, z: SEA_GATE.z } : YARD_PIER, sea ? POND_COPY.goStepSea : POND_COPY.goStepLake)]);
    },
    update(dt) {
      if (!guide) {
        const s = deps.state(), h = s.hintsSeen || {}, on = deps.on(), today = deps.today();
        idle = yardIdle(idle, dt, deps.free() && deps.inVillage());
        if (yardReady({ on, bridge: !!s.unlocks?.flags?.bridge, done: !!h.yardFill, idleSec: idle })) {
          idle = 0;
          startYard();
        } else if (d1Ready({ on, yardDone: !!h.yardFill, d1Done: !!h.pondD1, pondDay: h.pondDay, today, fedToday: feedStatus(h, today).fed, idleSec: idle })) {
          idle = 0;
          startD1();
        }
        return;
      }
      const c = ctx();
      guide.tick(c);
      if (!guide) return;
      const step = guide.current();
      if (!deps.inVillage() || !step) { view.hide(); return; }
      view.show(step, guide.index(), guide.total, c, deps.player.position, deps.route, 0);
    },
  };
}

export function installYardGuide(deps) {
  inst = createYardGuide(deps);
  return inst;
}

export function yardGuidePointTo(kind) {
  inst?.pointTo(kind);
}
