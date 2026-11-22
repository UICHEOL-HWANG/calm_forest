import { launch } from '../../../../tools/store-shots/cdp.mjs';

export const BASE = `http://127.0.0.1:${process.env.PORT || 8931}/`;
export const DEV = {
  phone: { w: 360, h: 640, mobile: true, touch: true, dsf: 2 },
  pc: { w: 1280, h: 720 },
};
const DISMISS = ['intro-skip', 'coach-skip', 'tut-skip', 'seed-ok', 'hint-ok', 'daily-ok', 'weekly-close', 'notice-ok'];

export async function open(devName, cdpPort) {
  const d = DEV[devName];
  const b = await launch(cdpPort);
  await b.send('Network.enable');
  await b.send('Network.setBlockedURLs', { urls: ['*supabase.co*', '*googletagmanager*', '*google-analytics*'] });
  await b.viewport(d.w, d.h, d);
  await b.send('Emulation.setFocusEmulationEnabled', { enabled: true });
  const front = setInterval(() => { b.send('Page.bringToFront').catch(() => {}); }, 700);
  const ev = async (e, ms = 20000) => { try { return await Promise.race([b.evaluate(e), new Promise(r => setTimeout(() => r('TIMEOUT'), ms))]); } catch (x) { return 'ERR ' + x.message; } };
  async function dismiss(n) {
    for (let i = 0; i < n; i++) {
      const hit = await ev(`(() => { for (const id of ${JSON.stringify(DISMISS)}) { const e=document.getElementById(id); if (e && e.offsetParent) { e.click(); return id; } }
        const c=[...document.querySelectorAll('#spot-layer .sp-next, #spot-layer .sp-skip, #coach button')].find(x=>x.offsetParent); if (c) { c.click(); return 'coach'; }
        const t=[...document.querySelectorAll('button')].find(x=>x.offsetParent && /^(건너뛰기|알겠어요|닫기|확인)/.test(x.textContent.trim())); if (t) { t.click(); return 'btn'; } return null; })()`);
      if (!hit && i > 2) break;
      await b.sleep(1300);
    }
  }
  async function enterGame(query) {
    await b.goto(BASE + query, 9000);
    for (let i = 0; i < 30; i++) {
      if (await ev(`(() => { const g=document.getElementById('guest-btn'); if (g && g.offsetParent) { g.click(); return true; } return false; })()`) === true) break;
      await b.sleep(1000);
    }
    await b.sleep(3500);
    for (let i = 0; i < 30; i++) {
      const r = await ev(`(() => { const m=document.getElementById('char-modal'); if (!m || !m.classList.contains('show')) return 'closed'; const c=[...document.querySelectorAll('#char-grid *')].find(e=>/곰|Bear/.test(e.textContent) && e.children.length<4); c?.click();
        const n=document.querySelector('#char-modal input'); if (n && !n.value) { n.value='도토리숲'; n.dispatchEvent(new Event('input',{bubbles:true})); n.dispatchEvent(new Event('change',{bubbles:true})); }
        [...document.querySelectorAll('#char-modal button')].find(x=>/시작|확인|결정|이 친구|Start|OK|friend/i.test(x.textContent))?.click(); return 'open'; })()`);
      if (r === 'closed' && i > 2) break;
      await b.sleep(1000);
    }
    await b.sleep(2500);
    await dismiss(16);
    await ev(`(() => { const s = document.createElement('style'); s.textContent = '#spot-layer{display:none!important}'; document.head.appendChild(s); document.body.classList.remove('spot-on', 'pre-world', 'world-ready'); return 1; })()`);
  }
  return { b, ev, dismiss, enterGame, async close() { clearInterval(front); await b.close?.(); } };
}
