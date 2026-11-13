import { installEach } from './install-each.js';
import { installCookCourse, PANEL_IDS as COOK_IDS } from './cook-course.js';
import { installCarveHud, PANEL_IDS as CARVE_IDS } from './carve-hud.js';
import { installShopMenu, PANEL_IDS as SHOP_IDS } from './shop-menu.js';
import { installWorkbenchMenu, PANEL_IDS as BENCH_IDS } from './workbench-menu.js';
import { installKitchenMenu, PANEL_IDS as KITCHEN_IDS } from './kitchen-menu.js';
import { installBoatMenu, PANEL_IDS as BOAT_IDS } from './boat-menu.js';
import { installLeaderboard, PANEL_IDS as LB_IDS } from './leaderboard.js';
import { installDex, PANEL_IDS as DEX_IDS } from './dex.js';
import { installPhotos, PANEL_IDS as PHOTO_IDS } from './photos.js';
import { installBag, PANEL_IDS as BAG_IDS } from './bag.js';
import { installGuidePanel, PANEL_IDS as GUIDE_IDS } from './guide-panel.js';
import { installHouseExterior, PANEL_IDS as EXT_IDS } from './house-exterior.js';

export function installGameUi(ctx) {
  return installEach([
    ['cook', () => installCookCourse(ctx), COOK_IDS],
    ['carve', () => installCarveHud(ctx), CARVE_IDS],
    ['shop', () => installShopMenu(ctx), SHOP_IDS],
    ['bench', (got) => installWorkbenchMenu({ ...ctx, openCarveHud: got.carve.openCarveHud }), BENCH_IDS, ['carve']],
    ['kitchen', (got) => installKitchenMenu({ ...ctx, startCookCourse: got.cook.startCookCourse }), KITCHEN_IDS, ['cook']],
    ['boat', () => installBoatMenu(ctx), BOAT_IDS],
    ['lb', () => installLeaderboard(ctx), LB_IDS],
    ['dex', () => installDex(ctx), DEX_IDS],
    ['photos', () => installPhotos(ctx), PHOTO_IDS],
    ['bag', () => installBag(ctx), BAG_IDS],
    ['guide', () => installGuidePanel(ctx), GUIDE_IDS],
    ['ext', () => installHouseExterior(ctx), EXT_IDS],
  ], (name, e) => console.error(`[game-ui] ${name} install failed`, e));
}
