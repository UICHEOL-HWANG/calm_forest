import { launch } from '../../../../tools/store-shots/cdp.mjs';

export const BASE = `http://127.0.0.1:${process.env.PORT || 8793}/`;
export const PID = '11111111-2222-4333-8444-555555555555';
export const DEV = {
  phone: { w: 360, h: 640, mobile: true, touch: true, dsf: 2 },
  land: { w: 740, h: 360, mobile: true, touch: true, dsf: 2 },
  pc: { w: 1280, h: 720 },
};
const DISMISS = ['intro-skip', 'coach-skip', 'tut-skip', 'seed-ok', 'hint-ok', 'daily-ok', 'weekly-close', 'notice-ok'];
const LONG = ['veg_stew', 'mushroom_soup', 'rice_ball', 'baked_yam', 'herb_salad', 'grilled_fish', 'omelette', 'bread'];

export function showcaseData(hostAnimal, shape) {
  const ids = shape === 'long' ? LONG : LONG.slice(0, 4);
  return { nickname: '달빛마을', character: hostAnimal, equipped: {}, pet: null, houseStage: 6, houseStyle: { roof: 1, wall: 2, door: 0 },
    style: null, addons: [], outdoor: [], coop: { built: false }, room: [], pond: null, table: { dishes: ids.map(id => ({ id, tier: 'great' })) } };
}

export async function open(devName, cdpPort) {
  const d = DEV[devName];
  const b = await launch(cdpPort);
  await b.send('Network.enable');
  await b.send('Network.setBlockedURLs', { urls: ['*supabase.co*', '*googletagmanager*', '*google-analytics*'] });
  await b.viewport(d.w, d.h, d);
  await b.send('Emulation.setFocusEmulationEnabled', { enabled: true });
  const front = setInterval(() => { b.send('Page.bringToFront').catch(() => {}); }, 700);
  const ev = async (e, ms = 20000) => { try { return await Promise.race([b.evaluate(e), new Promise(r => setTimeout(() => r('TIMEOUT'), ms))]); } catch (x) { return 'ERR ' + x.message; } };
  const until = async (e, ms = 30000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(e) === true) return true; await b.sleep(400); } return false; };
  async function dismiss(n) {
    for (let i = 0; i < n; i++) {
      const hit = await ev(`(() => { for (const id of ${JSON.stringify(DISMISS)}) { const e=document.getElementById(id); if (e && e.offsetParent) { e.click(); return id; } }
        const c=[...document.querySelectorAll('#spot-layer .sp-next, #spot-layer .sp-skip, #coach button')].find(x=>x.offsetParent); if (c) { c.click(); return 'coach'; }
        const t=[...document.querySelectorAll('button')].find(x=>x.offsetParent && /^(건너뛰기|알겠어요|닫기|확인)/.test(x.textContent.trim()) && !x.closest('#nb-pick-modal,#nb-dish-modal,#nb-inbox-modal,#mg-layer')); if (t) { t.click(); return 1; } return null; })()`);
      if (!hit && i > 2) break;
      await b.sleep(1300);
    }
  }
  async function enterGame(animal) {
    const re = animal === 'rabbit' ? '토끼|Rabbit' : '곰|Bear';
    await b.goto(BASE + '?dbg=1&weather=clear&time=0.36&house=6&e3=on', 9000);
    for (let i = 0; i < 30; i++) {
      if (await ev(`(() => { const g=document.getElementById('guest-btn'); if (g && g.offsetParent) { g.click(); return true; } return false; })()`) === true) break;
      await b.sleep(1000);
    }
    await b.sleep(3500);
    for (let i = 0; i < 30; i++) {
      const r = await ev(`(() => { const m=document.getElementById('char-modal'); if (!m || !m.classList.contains('show')) return 'closed'; const c=[...document.querySelectorAll('#char-grid *')].find(e=>/${re}/.test(e.textContent)); c?.click();
        const n=document.querySelector('#char-modal input'); if (n && !n.value) { n.value='도토리숲'; n.dispatchEvent(new Event('input',{bubbles:true})); n.dispatchEvent(new Event('change',{bubbles:true})); }
        [...document.querySelectorAll('#char-modal button')].find(x=>/시작|확인|결정|이 친구|Start|OK|friend/i.test(x.textContent))?.click(); return 'open'; })()`);
      if (r === 'closed' && i > 2) break;
      await b.sleep(1000);
    }
    await b.sleep(2500);
    await dismiss(16);
    await ev(`(() => { const s = document.createElement('style'); s.textContent = '#spot-layer{display:none!important}'; document.head.appendChild(s); document.body.classList.remove('spot-on'); return 1; })()`);
  }
  async function visit(hostAnimal, shape, extra = '') {
    const data = showcaseData(hostAnimal, shape);
    const ok = await ev(`(async () => { const n = await import('/js/neighbors/net.js'); const A = n.neighborApi;
      A.today = async () => ({ ok: true, list: [{ public_id: '${PID}', nick: '달빛마을', character: '${hostAnimal}', house_stage: 6, decor_n: 3, visited_today: false }], rewardedToday: 0 });
      A.showcase = async () => ({ ok: true, data: ${JSON.stringify(data)}, loadMs: 5 });
      A.viewStart = async () => ({ ok: false, reason: 'offline' }); A.viewEnd = async () => ({ ok: false, reason: 'offline' });
      ${extra}
      const s = await import('/js/spaces/neighbor.js'); await s.openNeighborPicker('verify'); return true; })()`);
    await b.sleep(1200);
    await ev(`document.querySelector('#nb-pick-modal .nb-go')?.click()`);
    const arrived = await until(`(async () => (await import('/js/game.js')).atNeighbor)()`, 15000);
    await b.sleep(1500);
    return { ok, arrived };
  }
  return { b, ev, until, dismiss, enterGame, visit, async close() { clearInterval(front); console.log('CONSOLE_ERRORS ' + JSON.stringify(b.logs.filter(l => l && !/supabase|ERR_BLOCKED|googletag|analytics|Failed to fetch|net::/i.test(l)))); await b.close(); } };
}
