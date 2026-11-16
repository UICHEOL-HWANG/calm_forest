import { createAuctionGuide } from '../auction/guide.js';
import { ARROW_LABEL } from '../guide/feature-rules.js';
import { walkLimit } from '../world/walk-bounds.js';
import { WEEKLY_COPY } from './copy.js';
import { whereOf } from './rules.js';
import { MARKET_ITEM_IDS } from '../data/weekly.js';

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
  const where = (item) => {
    const g = env.gameState();
    const stored = item.kind === 'indoor' ? g.house?.stored?.[item.id] : g.outdoorStored?.[item.id];
    return whereOf(item, { stored: stored || 0, hasHouse: (g.houseStage || 0) >= 3 });
  };
  const storedIndoor = () => {
    const stored = env.gameState().house?.stored || {};
    return MARKET_ITEM_IDS.filter(id => (stored[id] || 0) > 0).length;
  };
  return { canDo, owns, grant, where, storedIndoor, guideEnv: env.guide ? makeGuideEnv(env.guide) : null };
}

const body = () => document.body.classList;
const BIG_SOLID = 0.6;

export function makeGuideEnv(g) {
  const uiBusy = () => !!g.ui.anyModalOpen?.() || !!g.ui.coachActive?.() || body().contains('spot-on');
  const solids = () => {
    const live = g.colliders.filter(c => !c.off && !c.lock);
    return { big: [...live.filter(c => c.r === undefined || c.r >= BIG_SOLID), g.lake], small: live.filter(c => c.r !== undefined && c.r < BIG_SOLID) };
  };
  return {
    pastOnboarding: () => g.featureOpen(),
    cameraFree: () => g.cameraFree(),
    uiBusy,
    cine: () => body().contains('cine-open'),
    otherGuide: (name) => g.otherGuide(name) || body().contains('coaching'),
    makeGuide: (name, spot, reach) => createAuctionGuide({
      name, THREE: g.THREE, scene: g.scene, camera: g.camera, player: g.player, t: g.t, track: g.track,
      follow: ARROW_LABEL[name], spot, reach,
      project: (p, lift) => g.project(p, lift),
      solids,
      inside: p => Math.hypot(p.x, p.z) < walkLimit(Math.atan2(p.z, p.x)) - 1,
      open: () => true,
      inVillage: () => g.inVillage(),
      visible: () => g.cameraFree() && !uiBusy(),
    }),
    showBanner: (burn) => g.ui.showHintBanner?.({ ico: '🛒', title: WEEKLY_COPY.market.title, line: WEEKLY_COPY.banner, near: () => true, attention: true, slotQuest: true, kind: 'feature', key: 'weekly-market', burn }),
  };
}
