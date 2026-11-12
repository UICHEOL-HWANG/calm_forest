import { installCookCourse } from './cook-course.js';
import { installCarveHud } from './carve-hud.js';
import { installShopMenu } from './shop-menu.js';
import { installWorkbenchMenu } from './workbench-menu.js';
import { installKitchenMenu } from './kitchen-menu.js';
import { installBoatMenu } from './boat-menu.js';
import { installLeaderboard } from './leaderboard.js';
import { installDex } from './dex.js';
import { installPhotos } from './photos.js';
import { installBag } from './bag.js';
import { installGuidePanel } from './guide-panel.js';
import { installHouseExterior } from './house-exterior.js';

export function installGameUi(ctx) {
  const cook = installCookCourse(ctx);
  const carve = installCarveHud(ctx);
  const withPanels = { ...ctx, startCookCourse: cook.startCookCourse, openCarveHud: carve.openCarveHud };
  return {
    cook,
    carve,
    shop: installShopMenu(ctx),
    bench: installWorkbenchMenu(withPanels),
    kitchen: installKitchenMenu(withPanels),
    boat: installBoatMenu(ctx),
    lb: installLeaderboard(ctx),
    dex: installDex(ctx),
    photos: installPhotos(ctx),
    bag: installBag(ctx),
    guide: installGuidePanel(ctx),
    ext: installHouseExterior(ctx),
  };
}
