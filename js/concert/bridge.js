import { STAGE_POS } from '../data/concert.js';
import { DECK_H } from '../spaces/concert-stage-art.js';

const EXIT_GAP = 2.6;

export function makeConcertBridge(env) {
  let bgmWasOn = false;
  let active = false;

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
      enter() {
        active = true;
        env.setCameraRig(rig);
        env.hideTool(true);
        document.body.classList.add('mg-open', 'concert-open');
        hold();
      },
      strike() {},
      update() {
        if (!active) return;
        env.hideTool(true);
        hold();
      },
      exit() {
        active = false;
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
