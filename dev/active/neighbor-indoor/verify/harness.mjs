// 🏠 이웃 실내 검증 하네스 — 헤드리스 Chrome(tools/store-shots/cdp.mjs) · Supabase·GA 차단 · dev 파라미터 게스트
//   운영 오염 방지(메모리 leaderboard-reachability): 맨 localhost 로 게임을 열지 않는다.
//   PORT=8061 node dev/active/neighbor-indoor/verify/<script>.mjs
import { launch } from '../../../../tools/store-shots/cdp.mjs';

export const BASE = `http://127.0.0.1:${process.env.PORT || 8061}/`;
const DISMISS = ['intro-skip', 'coach-skip', 'tut-skip', 'seed-ok', 'hint-ok', 'notice-ok'];

export async function open({ w = 1280, h = 800, mobile = false, cdpPort = 9361 } = {}) {
  const b = await launch(cdpPort);
  await b.send('Network.enable');
  await b.send('Network.setBlockedURLs', { urls: ['*supabase.co*', '*googletagmanager*', '*google-analytics*'] });
  await b.viewport(w, h, mobile ? { mobile: true, touch: true, dsf: 2 } : {});
  await b.send('Emulation.setFocusEmulationEnabled', { enabled: true });
  const front = setInterval(() => { b.send('Page.bringToFront').catch(() => {}); }, 700);   // 탭 hidden → rAF 정지 함정
  const ev = async (e, ms = 20000) => { try { return await Promise.race([b.evaluate(e), new Promise(r => setTimeout(() => r('TIMEOUT'), ms))]); } catch (x) { return 'ERR ' + x.message; } };
  const until = async (e, ms = 60000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(e) === true) return true; await b.sleep(400); } return false; };
  const key = async (code = 'Space', k = ' ', vk = 32) => { for (const type of ['keyDown', 'keyUp']) { await b.send('Input.dispatchKeyEvent', { type, code, key: k, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk }); await b.sleep(80); } };
  async function enterGame(params) {
    await b.goto(BASE + '?dbg=1&weather=clear&' + params, 9000);
    for (let i = 0; i < 30; i++) {
      if (await ev(`(() => { const g=document.getElementById('guest-btn'); if (g && g.offsetParent) { g.click(); return true; } return false; })()`) === true) break;
      await b.sleep(1000);
    }
    await b.sleep(3500);
    for (let i = 0; i < 30; i++) {
      const r = await ev(`(() => { const m=document.getElementById('char-modal'); if (!m || !m.classList.contains('show')) return 'closed'; const c=[...document.querySelectorAll('#char-grid *')].find(e=>/곰|Bear/.test(e.textContent)); c?.click();
        [...document.querySelectorAll('#char-modal button')].find(x=>/시작|확인|결정|이 친구|Start/.test(x.textContent))?.click(); return 'open'; })()`);
      if (r === 'closed' && i > 2) break;
      await b.sleep(1000);
    }
    await b.sleep(2500);
    for (let i = 0; i < 12; i++) {
      const hit = await ev(`(() => { for (const id of ${JSON.stringify(DISMISS)}) { const e=document.getElementById(id); if (e && e.offsetParent) { e.click(); return id; } }
        const t=[...document.querySelectorAll('button')].find(x=>x.offsetParent && /^(건너뛰기|알겠어요|닫기|확인|Skip|Got it|Close|OK)/.test(x.textContent.trim())); if (t) { t.click(); return 1; } return null; })()`);
      if (!hit && i > 3) break;
      await b.sleep(1500);
    }
  }
  return { b, ev, until, key, enterGame, async close() { clearInterval(front); await b.close(); } };
}

// 내 집 실내 스냅숏 — buildRoom 리팩터링 전후 동치 확인용
export const SNAP_ROOMS = `(async () => { const g = await import('/js/game.js'); const S = [];
  for (const id in g.interiorFloors) { const r = g.interiorFloors[id]; let meshes = 0, verts = 0;
    r.traverse(o => { if (o.isMesh) { meshes++; verts += o.geometry.attributes.position.count; } });
    const c = r.userData.st?.userData.collider;
    S.push({ id, meshes, verts, pos: r.position.toArray(), col: c ? [c.x, c.z, c.r] : null }); }
  return JSON.stringify({ stage: g.gameState.houseStage, style: g.gameState.house.style, S, windows: g.houseWindows.length }); })()`;
