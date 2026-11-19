import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { open, PID, showcaseData } from './dish-harness.mjs';

const OUT = process.env.OUT || path.resolve(import.meta.dirname, '../shots');
mkdirSync(OUT, { recursive: true });
const dev = process.argv[2] || 'phone';
const h = await open(dev, 9700 + Math.floor(Math.random() * 80));
const { b, ev, until } = h;
const shot = (n) => b.shot(path.join(OUT, `host-${dev}-${n}.png`));
const G2 = '66666666-7777-4888-9999-aaaaaaaaaaaa';
const LIST = [
  { id: 11, recipe: 'veg_stew', stars: 3, nick: '도토리숲', character: 'bear', public_id: PID },
  { id: 12, recipe: 'baked_yam', stars: 1, nick: '달빛마을', character: 'rabbit', public_id: G2 },
  { id: 13, recipe: 'rice_ball', stars: 2, nick: '숨은이웃', character: 'cat', public_id: null },
];
const log = {};
await h.enterGame('rabbit');
await ev(`(async () => { const n = await import('/js/neighbors/net.js'); const A = n.neighborApi;
  window.__api = { ate: false, eat: 'ok', rate: 'ok', calls: [] };
  A.tableDishes = async () => ({ ok: true, ate_today: window.__api.ate, list: ${JSON.stringify(LIST)} });
  A.dishEat = async (id) => { window.__api.calls.push(['eat', id]); const m = window.__api.eat; if (m !== 'ok') return { ok: false, reason: m }; window.__api.ate = true; const d = ${JSON.stringify(LIST)}.find(x => x.id === id); return { ok: true, id, recipe: d.recipe, stars: d.stars }; };
  A.dishRate = async (id, emoji) => { window.__api.calls.push(['rate', id, emoji]); const m = window.__api.rate; return m === 'ok' ? { ok: true } : { ok: false, reason: m }; };
  A.showcase = async () => ({ ok: true, data: ${JSON.stringify(showcaseData('bear', 'round'))}, loadMs: 5 });
  A.viewStart = async () => ({ ok: false, reason: 'offline' }); A.viewEnd = async () => ({ ok: false, reason: 'offline' });
  return true; })()`);
const toast = () => ev(`document.getElementById('toast')?.textContent?.trim() || null`);
const openInbox = () => ev(`(async () => { const I = await import('/js/table/dish-inbox.js'); I.showInbox(await I.loadInbox()); return true; })()`);
const buffs = () => ev(`(async () => { const g = await import('/js/game.js'); const now = g.clock.elapsedTime; return Object.fromEntries(Object.entries(g.buffs).filter(([, v]) => v > now).map(([k, v]) => [k, Math.round(v - now)])); })()`);

await openInbox(); await b.sleep(800);
log.inbox = await ev(`({ sub: document.querySelector('#nb-inbox-modal .nb-sub')?.textContent, rows: [...document.querySelectorAll('#nb-inbox-modal .nb-dishrow')].map(r => r.textContent), disabled: [...document.querySelectorAll('#nb-inbox-modal .nb-go')].map(x => x.disabled) })`);
await shot('inbox');
log.buffsBefore = await buffs();
await ev(`document.querySelector('#nb-inbox-modal .nb-go').click()`);
await until(`document.getElementById('nb-rate-modal')?.classList.contains('show') === true`, 5000);
await b.sleep(600);
log.rate = await ev(`({ sub: document.querySelector('#nb-rate-modal .nb-sub')?.textContent, letter: document.querySelector('#nb-rate-modal .nb-letter')?.textContent, back: !![...document.querySelectorAll('#nb-rate-modal .nb-btn')].find(x => x.textContent.includes('답방')) })`);
log.buffsAfter = await buffs();
await shot('rate');
await ev(`document.querySelectorAll('#nb-rate-modal .nb-react button')[1].click()`);
await b.sleep(700);
log.rated = { toast: await toast(), disabled: await ev(`[...document.querySelectorAll('#nb-rate-modal .nb-react button')].every(x => x.disabled)`) };
await shot('rated');
await ev(`[...document.querySelectorAll('#nb-rate-modal .nb-btn')].find(x => x.textContent.includes('답방')).click()`);
log.returned = await until(`(async () => (await import('/js/game.js')).atNeighbor)()`, 10000);
await b.sleep(1500);
await shot('returned');
await ev(`(async () => { (await import('/js/spaces/neighbor.js')).exitNeighbor(); return true; })()`);
await b.sleep(1500);

await openInbox(); await b.sleep(800);
log.ateToday = await ev(`({ sub: document.querySelector('#nb-inbox-modal .nb-sub')?.textContent, disabled: [...document.querySelectorAll('#nb-inbox-modal .nb-go')].every(x => x.disabled) })`);
await shot('ate-today');
await ev(`document.querySelector('#nb-inbox-modal .nb-close').click()`);
log.fails = [];
for (const mode of ['limit', 'gone', 'upstream']) {
  await ev(`window.__api.ate = false; window.__api.eat = '${mode}'`);
  await openInbox(); await b.sleep(700);
  await ev(`document.querySelector('#nb-inbox-modal .nb-go').click()`);
  await b.sleep(900);
  log.fails.push({ mode, toast: await toast(), rateOpen: await ev(`document.getElementById('nb-rate-modal')?.classList.contains('show') || false`) });
}
await ev(`window.__api.eat = 'ok'; window.__api.rate = 'upstream'`);
await openInbox(); await b.sleep(700);
await ev(`[...document.querySelectorAll('#nb-inbox-modal .nb-go')][2].click()`);
await until(`document.getElementById('nb-rate-modal')?.classList.contains('show') === true`, 5000);
log.noReturnBtn = await ev(`![...document.querySelectorAll('#nb-rate-modal .nb-btn')].find(x => x.textContent.includes('답방'))`);
await ev(`document.querySelectorAll('#nb-rate-modal .nb-react button')[0].click()`);
await b.sleep(700);
log.rateFail = { toast: await toast(), enabledAgain: await ev(`[...document.querySelectorAll('#nb-rate-modal .nb-react button')].every(x => !x.disabled)`) };
await ev(`document.querySelector('#nb-rate-modal .nb-close').click()`);

await ev(`window.__api.ate = false`);
log.book = await ev(`(async () => { const g = await import('/js/game.js'); const T = await import('/js/table/index.js'); const B = await import('/js/table/book-ui.js');
  for (const id of ['veg_stew', 'rice_ball']) g.gameState.kitchen.best[id] = 90; T.refreshTable('load'); B.openCookbook();
  await new Promise(r => setTimeout(r, 900)); return [...document.querySelectorAll('.cb-head button')].map(x => x.textContent); })()`);
await shot('book');
log.calls = await ev(`window.__api.calls`);
console.log(JSON.stringify(log, null, 1));
await h.close();
process.exit(0);
