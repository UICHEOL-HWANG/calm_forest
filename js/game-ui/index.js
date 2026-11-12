import { installCookCourse } from './cook-course.js';
import { installCarveHud } from './carve-hud.js';
import { installShopMenu } from './shop-menu.js';

export function installGameUi(ctx) {
  return { cook: installCookCourse(ctx), carve: installCarveHud(ctx), shop: installShopMenu(ctx) };
}
