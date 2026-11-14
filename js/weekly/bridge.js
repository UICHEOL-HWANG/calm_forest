import { createAuctionGuide } from '../auction/guide.js';
import { ONBOARD_COPY } from '../auction/onboard.js';
import { walkLimit } from '../world/walk-bounds.js';
import { WEEKLY_COPY } from './copy.js';

const SPACE = Object.freeze({ delve: 'mine', sled: 'mountain', star: 'observatory', neighbor: 'neighbor', serve: 'cafe', carve: 'bench' });

export function makeWeeklyBridge(env) {
  const canDo = (type) => env.questAvailable(type, env.questCtx()) && (!SPACE[type] || env.isOpen(SPACE[type]));
  const owns = (id) => {
    const g = env.gameState();
    return (g.house?.stored?.[id] || 0) > 0
      || (g.outdoorStored?.[id] || 0) > 0
      || (g.house?.decor || []).some(p => p.id === id)
      || (g.outdoor || []).some(p => p.id === id);
  };
  const grant = (item) => {
    const g = env.gameState();
    if (item.kind === 'indoor') {
      env.patch({ house: { ...g.house, stored: { ...(g.house?.stored || {}), [item.id]: (g.house?.stored?.[item.id] || 0) + 1 } } });
    } else {
      env.patch({ outdoorStored: { ...(g.outdoorStored || {}), [item.id]: (g.outdoorStored?.[item.id] || 0) + 1 } });
    }
    return true;
  };
  return { canDo, owns, grant, guideEnv: env.guide ? makeGuideEnv(env.guide) : null };
}

const body = () => document.body.classList;
const BIG_SOLID = 0.6;

function makeGuideEnv(g) {
  const uiBusy = () => !!g.ui.anyModalOpen?.() || !!g.ui.coachActive?.() || body().contains('spot-on');
  const solids = () => {
    const live = g.colliders.filter(c => !c.off && !c.lock);
    return { big: [...live.filter(c => c.r === undefined || c.r >= BIG_SOLID), g.lake], small: live.filter(c => c.r !== undefined && c.r < BIG_SOLID) };
  };
  return {
    pastOnboarding: () => g.isOpen('merchant'),
    cameraFree: () => g.cameraFree(),
    uiBusy,
    cine: () => body().contains('cine-open'),
    otherGuide: (name) => g.otherGuide(name) || body().contains('coaching'),
    makeGuide: (name, spot, reach) => createAuctionGuide({
      name, THREE: g.THREE, scene: g.scene, camera: g.camera, player: g.player, t: g.t, track: () => {},
      follow: ONBOARD_COPY.follow, spot, reach,
      project: (p, lift) => g.project(p, lift),
      solids,
      inside: p => Math.hypot(p.x, p.z) < walkLimit(Math.atan2(p.z, p.x)) - 1,
      open: () => true,
      inVillage: () => g.inVillage(),
      visible: () => g.cameraFree() && !uiBusy(),
    }),
    showBanner: () => g.ui.showHintBanner?.({ ico: '🛒', title: WEEKLY_COPY.market.title, line: WEEKLY_COPY.banner, near: () => true, attention: true, slotQuest: true }),
  };
}
