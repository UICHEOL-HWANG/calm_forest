#!/usr/bin/env node
// =============================================================
//  📸 스토어 스크린샷 촬영 — 헤드리스 Chrome(CDP) + 게임 개발용 쿼리 파라미터
//  ------------------------------------------------------------
//  사용: python3 scripts/serve.py 8791 &   (프로젝트 루트 서빙 · 다른 포트면 SHOTS_PORT=)
//        node tools/store-shots/shots.mjs <phone|tab7|tab10|toss> [CDP 포트=9333] [장면 접두어]
//  산출: .scratch/store-shots/<기기>-<장면>.png  (git 무시)
//
//  ⚠️ 함정(2026-09-23, 전부 겪음)
//   · deviceScaleFactor 를 실기기 값으로 — DPR 1 로 1080×1920 을 찍으면 UI 가 실제의 1/3 로 작게 나온다.
//   · Supabase·GA 를 막아 오프라인 게스트로 진입 → 운영 DB 에 익명 계정이 안 쌓인다.
//   · 큰 해상도는 첫 로딩이 느리다 → 게스트 버튼이 보일 때까지 폴링.
//   · 토스 가로 스크린샷은 정확히 1504×741 이어야 한다(1px 도 거부). CDP clip 은 짝수로 반올림돼
//     1505×741 로 나오므로 sips -c 741 1504 로 1열만 잘라 맞춘다(무손실).
//   · 나룻배는 안개에 묻혀 부적합, 캐릭터 고르기 모달은 폰에서 작다.
//  ⚠️ 2026-10-11 추가(새 맵 4장)
//   · 헤드리스 탭이 hidden 이면 rAF 0 → 포커스 에뮬레이션 + 0.7초마다 bringToFront(안 하면 마차가 안 간다)
//   · 꿈의 숲·거울 마을·과수원은 도착 안내 창이 화면을 덮는다 → 장면 동작 뒤 '알겠어요' 를 눌러 닫는다
//   · 밤 마을은 뿌옇게, 수확제 광장은 기간 한정(10/22 종료)이라 스토어샷에서 뺐다
// =============================================================
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch } from './cdp.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = path.join(ROOT, '.scratch', 'store-shots');
const BASE = `http://127.0.0.1:${process.env.SHOTS_PORT || 8791}/`;
const DEVICES = {
  phone: { w: 360, h: 640, dsf: 3, touch: true, mobile: true, ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36' },   // 1080×1920
  tab7:  { w: 960, h: 540, dsf: 2, touch: true, ua: 'Mozilla/5.0 (Linux; Android 14; SM-X110) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36' },                           // 1920×1080
  tab10: { w: 1280, h: 720, dsf: 2, touch: true, ua: 'Mozilla/5.0 (Linux; Android 14; SM-X810) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36' },                          // 2560×1440
  toss:  { w: 1003, h: 494, dsf: 1.5, touch: true, mobile: true, crop: [741, 1504], ua: 'Mozilla/5.0 (Linux; Android 14; SM-S921N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36' }, // → 1504×741
};

const [dev, port = '9333', only] = process.argv.slice(2);
const d = DEVICES[dev];
if (!d) { console.error(`기기: ${Object.keys(DEVICES).join(' | ')}`); process.exit(1); }
mkdirSync(OUT, { recursive: true });
const b = await launch(+port);
await b.send('Network.enable');
await b.send('Network.setBlockedURLs', { urls: ['*supabase.co*', '*googletagmanager*', '*google-analytics*'] });
await b.viewport(d.w, d.h, d);
await b.send('Emulation.setFocusEmulationEnabled', { enabled: true });
const front = setInterval(() => { b.send('Page.bringToFront').catch(() => {}); }, 700);

const ev = async (e, ms = 15000) => { try { return await Promise.race([b.evaluate(e), new Promise(r => setTimeout(() => r('TIMEOUT'), ms))]); } catch (x) { return 'ERR ' + x.message; } };
const until = async (e, ms = 60000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(e) === true) return true; await b.sleep(400); } console.log('  ⏱️ 시간 초과:', e); return false; };
const pressSpace = async () => { for (const type of ['keyDown', 'keyUp']) { await b.send('Input.dispatchKeyEvent', { type, code: 'Space', key: ' ', windowsVirtualKeyCode: 32, nativeVirtualKeyCode: 32 }); await b.sleep(80); } };
const nearDoor = (id) => `__mirror.state().nearDoor === "${id}"`;   // __mirror.state() 가 전역 nearDoor 를 같이 돌려준다

const toDream = async () => {
  await ev('__dream.house()'); await b.sleep(1500); await ev('__dream.night()'); await ev('__dream.start()'); await b.sleep(1500); await ev('__dream.skip()');
  await until('__dream.state().atDream === true && __dream.state().cut === false'); await b.sleep(3000); await ev('__dream.tp(0, 5)');
};
const toMirror = async () => {
  await ev('__mirror.day()'); await ev('__mirror.stop()'); await until(nearDoor('mirrorgo'), 20000); await pressSpace();
  await until('__mirror.state().ride === true', 8000); await until('__mirror.state().ride === false && __mirror.state().atMirror === true', 300000);   // 헤드리스 저fps — 연출이 수 분 걸릴 수 있다
  await ev('__mirror.tp(0, 2)');
};
const toOrchard = async () => { await ev('__orchardOpen()'); await ev('__tp(33, 9)'); await until(nearDoor('orchard'), 15000); await pressSpace(); await b.sleep(4000); await ev('__orchardFill(6)'); };
const toObservatory = async () => { await ev('__tp(25, 26.2)'); await until(nearDoor('observatory'), 15000); await pressSpace(); await b.sleep(5000); };

// [이름, 쿼리, 동작] — Play 등록 순서 그대로(2026-10-11 사용자 확정 8장)
const SCENES = [
  ['1-village', 'time=0.32', async () => { await ev('__tp(1.5, 3)'); }],
  ['2-house', 'time=0.36&house=6', async () => { await ev('__tp(-8, 0)'); }],
  ['3-farm', 'time=0.34&farm=1', async () => { await ev('__farmMax()'); }],
  ['4-sea', 'time=0.40&sea=1', async () => {}],
  ['5-dream', 'time=0.8', toDream],
  ['6-mirror', 'time=0.4', toMirror],
  ['7-observatory', 'time=0.78', toObservatory],
  ['8-orchard', 'time=0.36', toOrchard],
];
const DISMISS = ['intro-skip', 'coach-skip', 'tut-skip', 'seed-ok', 'hint-ok', 'notice-ok'];
// 캡처 직전 정리 — 오프라인 표기·토스트·초보자 안내서 배너(클래스 제거로는 안 사라져 fixed 컨테이너를 숨긴다)
const CLEAN = `(() => { document.body.classList.remove('hintbanner');
  for (const el of document.querySelectorAll('#topleft *')) if (el.childNodes.length===1 && el.firstChild.nodeType===3 && /오프라인/.test(el.textContent)) el.textContent = el.textContent.replace('(오프라인)','');
  document.querySelectorAll('#toast').forEach(e => e.style.display='none');
  for (const el of document.querySelectorAll('body *')) if (el.children.length===0 && /초보자 안내서가 있어요/.test(el.textContent)) { let c=el; while (c && c!==document.body && getComputedStyle(c).position!=='fixed') c=c.parentElement; if (c && c!==document.body) c.style.display='none'; }
  return true; })()`;
const CLOSE_NOTICE = `(() => { const t=[...document.querySelectorAll('button')].find(x=>x.offsetParent && /^(알겠어요|닫기|확인)/.test(x.textContent.trim())); t?.click(); return !!t; })()`;

async function enterGame(params) {
  await b.goto(BASE + '?dbg=1&weather=clear&' + params, 9000);
  for (let i = 0; i < 30; i++) {
    if (await ev(`(() => { const g=document.getElementById('guest-btn'); if (g && g.offsetParent) { g.click(); return true; } return false; })()`) === true) break;
    await b.sleep(1000);
  }
  await b.sleep(3500);
  // 🐻 캐릭터 고르기 — 헤드리스가 느리면 창이 늦게 뜬다: 창이 닫힐 때까지 다시 누른다
  for (let i = 0; i < 30; i++) {
    const r = await ev(`(() => { const m=document.getElementById('char-modal'); if (!m || !m.classList.contains('show')) return 'closed'; const c=[...document.querySelectorAll('#char-grid *')].find(e=>/곰/.test(e.textContent)); c?.click();
      [...document.querySelectorAll('#char-modal button')].find(x=>/시작|확인|결정|이 친구/.test(x.textContent))?.click(); return 'open'; })()`);
    if (r === 'closed' && i > 2) break;
    await b.sleep(1000);
  }
  await b.sleep(2500);
  for (let i = 0; i < 12; i++) {
    const hit = await ev(`(() => { for (const id of ${JSON.stringify(DISMISS)}) { const e=document.getElementById(id); if (e && e.offsetParent) { e.click(); return id; } }
      const t=[...document.querySelectorAll('button')].find(x=>x.offsetParent && /^(건너뛰기|알겠어요|닫기|확인)/.test(x.textContent.trim())); if (t) { t.click(); return 1; } return null; })()`);
    if (!hit && i > 3) break;
    await b.sleep(1500);
  }
}

for (const [name, params, act] of SCENES) {
  if (only && !name.startsWith(only)) continue;
  await enterGame(params);
  await b.sleep(2500);
  await act(); await b.sleep(3000);
  for (let i = 0; i < 4; i++) { await ev(CLOSE_NOTICE); await b.sleep(900); }   // 도착 안내 창
  await ev(CLEAN); await b.sleep(1200);
  const file = path.join(OUT, `${dev}-${name}.png`);
  await b.shot(file);
  if (d.crop) execFileSync('sips', ['-c', String(d.crop[0]), String(d.crop[1]), file], { stdio: 'ignore' });
  console.log('📸', path.relative(ROOT, file));
}
clearInterval(front);
await b.close();
process.exit(0);
