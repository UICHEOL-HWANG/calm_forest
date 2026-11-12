import { createGuide } from '../guide/runner.js';
import { createGuideView } from '../guide/view.js';
import { SEA_GATE } from '../data/places.js';
import { feedStatus } from './actions.js';
import { yardIdle, yardReady, yardSteps, goStep, hudHidden, d1Ready, d1Steps, guideStalled, bridgeDone, YARD_PIER } from './yard-steps.js';
import { POND_COPY } from './copy.js';

export const YARD_HUD_CLASS = 'yard-guiding';
export const YARD_HUD_CSS = 'body.yard-guiding #story-chip, body.yard-guiding #quest-panel, body.yard-guiding #habitat-meter, body.yard-guiding #app-banner { display: none !important; }';

let inst = null;
let hudStyled = false;

function injectHudStyle() {
  if (hudStyled) return;
  hudStyled = true;
  const el = document.createElement('style');
  el.textContent = YARD_HUD_CSS;
  document.head.appendChild(el);
}

export function createYardGuide(deps) {
  let guide = null, view = null, idle = 0, flow = null, lastIndex = 0, lastProgressAt = 0, hudOn = false;

  const ctx = () => {
    const pond = deps.pondPos();
    return {
      me: deps.player.position, pier: YARD_PIER, pond, hasPond: !!pond,
      nearLake: deps.nearLake(), fishing: deps.fishing(), nearPond: deps.pondNear(),
      fedToday: feedStatus(deps.state().hintsSeen, deps.today()).fed,
    };
  };

  const setHud = hidden => {
    if (hidden === hudOn) return;
    hudOn = hidden;
    document.body.classList.toggle(YARD_HUD_CLASS, hidden);
    deps.setHudHidden(hidden);
  };

  const stop = () => {
    guide = null;
    setHud(false);
    flow = null;
    view?.hide();
    deps.setAssist(false);
  };

  const run = (name, steps, onDone) => {
    injectHudStyle();
    view ??= createGuideView({ scene: deps.scene, camera: deps.camera, root: document.body });
    flow = name;
    lastIndex = 0;
    lastProgressAt = performance.now() / 1000;
    guide = createGuide({
      flow: name, steps, now: () => performance.now(),
      onStep: e => deps.track('guide_step', e),
      onDone: () => { stop(); onDone?.(); },
    });
  };

  const startYard = () => {
    const h = deps.state().hintsSeen;
    if (deps.pondPos() && feedStatus(h, deps.today()).fed) {
      h.yardFill = true;
      deps.save();
      return;
    }
    h.yardTries = (h.yardTries | 0) + 1;
    deps.save();
    deps.banner(POND_COPY.owlStart);
    if (!deps.pondPos()) deps.setAssist(true);
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
        if (yardReady({ on, bridge: bridgeDone(s), done: !!h.yardFill, idleSec: idle, tries: h.yardTries })) {
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
      const nowSec = performance.now() / 1000;
      if (guide.index() !== lastIndex) { lastIndex = guide.index(); lastProgressAt = nowSec; }
      if (guideStalled(lastProgressAt, nowSec)) { stop(); return; }
      const step = guide.current();
      const village = deps.inVillage();
      setHud(hudHidden({ active: true, inVillage: village, hasStep: !!step }));
      if (!village || !step) { view.hide(); return; }
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
