import { once } from './boot-order.js';

let mods = null;

export const loadGameModules = once(async () => {
  const [game, duel, chest, controls, push, cafe, night, decor] = await Promise.all([
    import('./game.js'),
    import('./duel/index.js'),
    import('./boat-chest-reveal.js'),
    import('./controls.js'),
    import('./push-ui.js'),
    import('./cafe-guests.js'),
    import('./night-visit.js'),
    import('./decor-drops/index.js'),
  ]);
  mods = { game, duel, chest, controls, push, cafe, night, decor };
  return mods;
});

export const gameLoaded = () => mods !== null;

function need() {
  if (!mods) throw new Error('game modules are not loaded yet');
  return mods;
}

const noop = () => undefined;

export const Input = new Proxy({}, {
  get: (_, key) => (mods ? mods.game.Input[key] : noop),
  has: (_, key) => (mods ? key in mods.game.Input : false),
});

export const bootWorld = (...a) => need().game.bootWorld(...a);
export const enterGame = (...a) => need().game.enterGame(...a);
export const requestSave = (...a) => need().game.requestSave(...a);
export const getGameState = (...a) => need().game.getGameState(...a);
export const isAtOrchard = () => (mods ? mods.game.atOrchard : false);
export const mapLocked = (...a) => need().game.mapLocked(...a);
export const npcAccept = (...a) => need().game.npcAccept(...a);
export const npcClaim = (...a) => need().game.npcClaim(...a);
export const markNoticesSeen = (...a) => need().game.markNoticesSeen(...a);
export const resyncPurchases = (...a) => need().game.resyncPurchases(...a);

export const initDuel = (...a) => need().duel.initDuel(...a);
export const playChestReveal = (...a) => need().chest.playChestReveal(...a);
export const stopChestReveal = (...a) => need().chest.stopChestReveal(...a);
export const initControls = (...a) => need().controls.initControls(...a);
export const initPush = (...a) => need().push.initPush(...a);
export const offerPush = (...a) => need().push.offerPush(...a);
export const initCafeGuests = (...a) => need().cafe.initCafeGuests(...a);
export const initNightVisit = (...a) => need().night.initNightVisit(...a);
export const openDecorAlbum = (...a) => need().decor.openDecorAlbum(...a);
