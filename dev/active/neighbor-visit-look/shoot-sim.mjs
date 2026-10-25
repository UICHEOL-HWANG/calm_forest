import path from 'node:path';
import { launch } from '../../../tools/store-shots/cdp.mjs';

const OUT = path.resolve(import.meta.dirname, 'shots');
const URL = `http://127.0.0.1:${process.env.PORT || 8062}/sims/neighbor-balloon-compare.html`;
const b = await launch(9373);
await b.send('Emulation.setFocusEmulationEnabled', { enabled: true });
for (const [name, w, h, mobile] of [['pc', 1280, 1180, false], ['mobile', 390, 1900, true]]) {
  await b.viewport(w, h, mobile ? { mobile: true, touch: true, dsf: 2 } : { dsf: 2 });
  await b.goto(URL, 5000);
  await b.send('Page.bringToFront');
  await b.sleep(2500);
  await b.shot(path.join(OUT, `balloon-${name}.png`));
}
console.log('errors', b.logs);
await b.close();
process.exit(0);
