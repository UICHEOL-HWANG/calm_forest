import { writeFileSync, mkdirSync, rmSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { ROOT, iconPNG } from './lib/icon-art.mjs';

const MARK_PT = 92;
const art = (size) => iconPNG(size, { round: true, pad: 0.88 });

const web = path.join(ROOT, 'assets', 'boot');
mkdirSync(web, { recursive: true });
writeFileSync(path.join(web, 'mark.png'), art(MARK_PT * 3));

const splash = path.join(ROOT, 'ios', 'App', 'App', 'Assets.xcassets', 'Splash.imageset');
for (const f of readdirSync(splash)) if (f.endsWith('.png')) rmSync(path.join(splash, f));
const images = [1, 2, 3].map((s) => {
  const filename = `boot-mark@${s}x.png`;
  writeFileSync(path.join(splash, filename), art(MARK_PT * s));
  return { idiom: 'universal', filename, scale: `${s}x` };
});
writeFileSync(path.join(splash, 'Contents.json'), JSON.stringify({ images, info: { version: 1, author: 'xcode' } }, null, 2) + '\n');

console.log(`[make-boot-mark] assets/boot/mark.png (${MARK_PT * 3}px) · iOS Splash.imageset ${MARK_PT}pt @1x/2x/3x`);
