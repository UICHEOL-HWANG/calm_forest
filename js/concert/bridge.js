import { STAGE_POS } from '../data/concert.js';
import { DECK_H } from '../spaces/concert-stage-art.js';
import { makeRig, relax } from './instruments/pose.js';
import { buildInstrument } from './instruments/index.js';

const EXIT_GAP = 2.6;

export function makeConcertBridge(env) {
  let bgmWasOn = false;
  let active = false;
  const HIT_FADE = 5;
  const hit = [0, 0];
  let rigNow = null;
  let inst = null;

  const rig = (camera) => {
    const dist = camera.aspect < 1 ? 9.5 : 7;
    camera.position.set(STAGE_POS.x, 3.2, STAGE_POS.z + dist);
    camera.lookAt(STAGE_POS.x, 1.3, STAGE_POS.z);
  };

  const hold = () => {
    const player = env.getPlayer();
    player.position.set(STAGE_POS.x, DECK_H, STAGE_POS.z);
    player.rotation.y = 0;
  };

  return {
    stage: {
      enter(instrumentId) {
        active = true;
        env.setCameraRig(rig);
        env.hideTool(true);
        document.body.classList.add('mg-open', 'concert-open');
        hold();
        const p = env.getPlayerRig();
        if (p.arms) {
          rigNow = makeRig(env.THREE, p);
          inst = buildInstrument(env.THREE, instrumentId, rigNow);
        }
      },
      strike(lane) {
        hit[lane] = 1;
      },
      update(dt) {
        if (!active) return;
        env.hideTool(true);
        hold();
        hit[0] = Math.max(0, hit[0] - dt * HIT_FADE);
        hit[1] = Math.max(0, hit[1] - dt * HIT_FADE);
        if (inst) inst.pose(hit[0], hit[1]);
      },
      exit() {
        active = false;
        if (inst) inst.dispose();
        if (rigNow) relax(rigNow);
        inst = null;
        rigNow = null;
        hit[0] = 0;
        hit[1] = 0;
        env.setCameraRig(null);
        env.hideTool(false);
        document.body.classList.remove('mg-open', 'concert-open');
        env.getPlayer().position.set(STAGE_POS.x, 0, STAGE_POS.z + EXIT_GAP);
      },
    },
    bgm: {
      pause() { bgmWasOn = env.isBgmOn(); if (bgmWasOn) env.stopBgm(); },
      resume() { if (bgmWasOn) env.startBgm(); bgmWasOn = false; },
    },
  };
}
