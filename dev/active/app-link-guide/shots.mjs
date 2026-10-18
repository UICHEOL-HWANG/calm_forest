#!/usr/bin/env node
// 📸 안내서 사진 촬영(2026-10-18 앱 링크 안내서 개편) — guide-refresh/shots.mjs 를 확장
//   사용: python3 -m http.server 8817 --bind 127.0.0.1 &   (워크트리 루트)
//         node dev/active/app-link-guide/shots.mjs pc [CDP 포트=9411]     → PC 21장(한 세션에서 순서대로)
//         node dev/active/app-link-guide/shots.mjs phone [CDP 포트=9412]  → 30_mobile_coach
//   산출: OUT(기본 .scratch/guide-shots)/<장면>.png → sips 로 guide/img/<장면>.jpg(q62, 1200×674 / 554×1200)
//   ⚠️ weather=clear·dbg=1 필수(IS_DEV_SESSION) · Supabase·GA 차단(오프라인 게스트, 익명 계정 안 생김)
//   ⚠️ 오프라인 게스트 세이브는 저장되지 않는다 → 리로드하면 처음부터. 장면을 한 세션에서 이어 찍는다
//   ⚠️ 헤드리스는 ~10fps. 상인이 좌판 뒤에 걸려 못 오면 상인 옆으로 순간이동해 '말 걸기 거리(1.6)' 안에 선다
//   ⚠️ 폰: 로딩이 덜 끝난 채 게스트를 누르면 로그인 화면이 게임 위에 남는다 → 게스트 버튼이 보인 뒤 5초 더 기다린다
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { launch } from '../../../tools/store-shots/cdp.mjs';

const [dev = 'pc', port = dev === 'pc' ? '9411' : '9412'] = process.argv.slice(2);
const BASE = `http://127.0.0.1:${process.env.SHOTS_PORT || 8817}/?dbg=1&weather=clear&time=0.36`;
const OUT = process.env.OUT || '.scratch/guide-shots';
mkdirSync(OUT, { recursive: true });

const b = await launch(+port);
await b.send('Network.enable');
await b.send('Network.setCacheDisabled', { cacheDisabled: true });
await b.send('Network.setBlockedURLs', { urls: ['*supabase.co*', '*googletagmanager*', '*google-analytics*'] });
if (dev === 'phone') await b.viewport(360, 780, { dsf: 3, touch: true, mobile: true, ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36' });
else await b.viewport(1200, 674);
await b.send('Emulation.setFocusEmulationEnabled', { enabled: true });
const front = setInterval(() => { b.send('Page.bringToFront').catch(() => {}); }, 700);

const S = (ms) => b.sleep(ms);
const ev = async (e) => { try { return await b.evaluate(`(async()=>{ const v = await (${e}); return typeof v==='object' ? JSON.stringify(v) : v })()`); } catch (x) { return 'ERR ' + x.message; } };
const until = async (e, ms = 60000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(e) === true) return true; await S(500); } console.log('  ⏱️', e); return false; };
const shot = async (name) => { const f = path.join(OUT, `${name}.png`); await b.shot(f); console.log('📸', f); };
const key = async (k, code, vk, hold = 80) => { for (const type of ['keyDown', 'keyUp']) { await b.send('Input.dispatchKeyEvent', { type, key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, text: type === 'keyDown' && k.length === 1 ? k : undefined }); await S(hold); } };
const space = () => key(' ', 'Space', 32);
const walk = (dir, ms) => key(`Arrow${dir}`, `Arrow${dir}`, { Up: 38, Down: 40, Left: 37, Right: 39 }[dir], ms);
const click = async (x, y) => { for (const type of ['mousePressed', 'mouseReleased']) await b.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 }); };
const touch = async (pts) => { for (const p of pts) { await b.send('Input.dispatchTouchEvent', { type: p.t, touchPoints: p.t === 'touchEnd' ? [] : [{ x: p.x, y: p.y }] }); await S(p.w || 50); } };
const btn = (scope, re) => ev(`(()=>{ const t=[...document.querySelectorAll('${scope} button')].find(x=>x.getClientRects().length && ${re}.test(x.textContent.trim())); t?.click(); return !!t })()`);
const ok = () => btn('', '/^(알겠어요|닫기|확인)/');
const mod = (p) => `await import('${p}')`;
const spot = () => ev(`document.getElementById('spot-layer').textContent.slice(0, 40)`);

async function enter() {
  await b.goto(BASE, 2000);
  await until(`(()=>{ const g=document.getElementById('guest-btn'); return !!(g && g.getClientRects().length) })()`);
  await shot('00_title');                       // 로그인 카드 — 아무것도 누르지 않은 상태
  await S(5000);
  await ev(`document.getElementById('guest-btn').click()`);
  await until(`document.getElementById('char-modal').classList.contains('show')`);
  await ev(`(()=>{ [...document.querySelectorAll('#char-grid *')].find(e=>e.children.length<=2 && /토끼/.test(e.textContent))?.click();
    const i=document.getElementById('nick-input'); i.value='숲속토끼'; i.dispatchEvent(new Event('input',{bubbles:true})); return 1 })()`);
  await S(2500);
  if (dev === 'pc') await shot('01_charselect');
  await btn('#char-modal', '/이 친구로/');
  await until(`__introT() > 0`);
  if (dev === 'pc') { await ev('__introJump(3.2)'); await S(2500); await shot('02_intro_b'); }   // 첫 자막(0.6~5.0초)
  await ev(`document.getElementById('intro-skip').click()`);
  await until(`document.body.classList.contains('spot-on')`);
}

async function pc() {
  await enter();
  // 🔦 손가락 안내(PC 8단계) — 핵심 4단계는 진짜 키 입력으로 통과
  await walk('Up', 900); await S(1500);
  await key('1', 'Digit1', 49); await S(1500);
  await key('2', 'Digit2', 50); await S(1500);
  await space(); await S(2500);
  await shot('14_help');                        // "🎒 가방엔 재화와 재료가 있어요"
  await click(1033, 42); await S(2000); await click(788, 169); await S(1200);    // 가방 열고 닫기
  await click(1096, 42); await S(2000); await click(600, 613); await S(1200);    // 도감 열고 닫기
  await click(1157, 42); await S(2500);                                          // ☰ → 메뉴 안의 안내 3단계(목표를 실제로 누름)
  for (let i = 0; i < 3; i++) { await ev(`document.querySelector('#spot-layer .sp-catch').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}))`); await S(1500); }
  await shot('14_menu');
  await click(795, 121); await S(2000); await click(70, 70); await S(2500);      // 메뉴 닫기 → 미니맵(마지막 단계)
  await click(600, 601); await S(2500);                                          // 지도 닫기 → '나의 이야기' 1회
  await shot('15_story');
  await btn('#story-modal', '/닫기/'); await S(2500);
  await shot('04_coach');                                                        // 코치 카드 1 / 17
  await ev(`(()=>{ document.getElementById('coach').classList.remove('show'); document.body.classList.remove('coaching'); return 1 })()`);
  await S(2000); await shot('03_village_start');
  await ev(`(Object.assign(__gs().inventory,{coins:128,wood:14,seed:6,crop:5,fish:3,stone:4}), 1)`);
  await click(1033, 42); await S(2500); await shot('12_bag'); await click(788, 169); await S(1200);
  await ev(`(()=>{ const d=__gs().dex,t=Date.now(); for (const id of ['carrot','tomato','blueberry','pumpkin','wheat']) d.crop[id]=t;
    for (const id of ['common','uncommon','rare']) d.fish[id]=t; for (const id of ['stone','coal']) d.ore[id]=t; return 1 })()`);
  await click(1096, 42); await S(2500); await shot('13_dex'); await click(600, 613); await S(1500);
  // 🧙 상인 환영 거래 — 목재 5 이상이면 발동. 좌판 뒤에 걸리면 옆으로 가서 맞이한다
  await ev(`(async()=>{ const m=${mod('/js/spaces/npc.js')}; const p=m.merchantObj().group.position; return __tp(p.x-0.7, p.z+0.9) })()`);
  await until(`document.getElementById('merchant-modal').classList.contains('show')`, 40000);
  await S(1000); await shot('05b_merchant');
  await ev(`document.getElementById('merchant-primary').click()`); await S(1500); await ev(`document.getElementById('merchant-secondary').click()`);
  // 👷 집 1단계 → 목수 귀환 → 첫 의뢰 창
  await ev('__buildTest(1)'); await S(20000);
  await ev(`(async()=>{ const g=${mod('/js/game.js')}; const o=g.npcObjs.find(n=>n.def.id==='builder').group.position; return __tp(o.x+0.2, o.z+1.4) })()`);
  await S(2000); await space(); await S(3000);
  await btn('#nudge-modal', '/나중에/'); await S(2000); await shot('11_npc'); await btn('#npc-modal', '/나중에/');
  // 🌉 집 3단계 → 무너진 다리 앞
  await ev('__buildTest(2)'); await S(3000);
  await ev(`(Object.assign(__gs().inventory,{wood:12,stone:6,coins:186}), __tp(-17.6, 8.9))`); await S(4000);
  await shot('32_bridge');
  await space(); await S(5000); await ok(); await S(1500);                       // 다리 수리 → 1장 완료 → 박물관·할아버지·판 열림
  // 🌳 세계수 판 — 물 가지 빈터에 큰 나무 1·작은 연못 2(물기 6/6·그늘 2/2 → 낚시꾼 귀환) 후 다시 연다
  await ev(`(Object.assign(__gs().inventory,{wood:24,stone:12,crop:8,fish:4,seed:6,coins:226}), __tp(4, -30.5))`); await S(3000);
  await space(); await S(3000);
  for (const n of ['큰 나무', '작은 연못', '작은 연못']) { await ev(`[...document.querySelectorAll('#tree-modal button.tb-deco')].find(x=>x.innerText.includes('${n}'))?.click()`); await S(2000); }
  await S(4000); await space(); await S(3000); await shot('31_tree_board');
  await btn('#tree-modal', '/닫기/');
  // 🏔️ 설산 — 첫날 다음 날부터 열린다 → firstDay 를 어제로. 등산 시작점 → 산장 마당 → 출발대
  await ev(`(__gs().firstDay = new Date(Date.now() - 864e5 + 9 * 36e5).toISOString().slice(0, 10), __tp(-15, -27.6))`); await S(3000);
  await space(); await S(5000); await ok();
  await ev('__tp(8.69, -927.23)'); await S(2000); await ev('__tp(1.5, -1006.9)'); await S(4000);
  await ev('__tp(0, -1004.9)'); await S(2500); await space();
  await S(20000); await shot('33_mountain_sled');                              // 출발 후 ~8초(게임 시간) — 깃발 사이
  await until(`!document.body.classList.contains('sled-run')`, 240000); await ok(); await S(4000);
  // ☕ 산장 카페 — 결과 뒤엔 순간이동이 되돌려진다 → 마당에서 걸어서 문 앞까지
  await walk('Up', 2500); await S(500); await space(); await S(5000); await ok();
  await walk('Up', 1500); await walk('Right', 700); await S(1000); await space(); await S(3000);
  await shot('34_hut_cafe');
  await btn('#hut-cafe-modal', '/닫기/');
  await ev(`(async()=>{ const m=${mod('/js/spaces/mountain.js')}; m.mountainAction('hutcafeexit'); await new Promise(r=>setTimeout(r,1500)); m.mountainAction('mountainexit'); return 1 })()`); await S(2500);
  // 🏛️ 박물관 1층 — 다리 수리로 열림
  await ev(`(()=>{ const d=__gs().dex,t=Date.now(); for (const id of ['corn','grape']) d.crop[id]=t; __space.museum[0](); return 1 })()`); await S(5000); await ok(); await S(2000);
  await shot('25_museum');
  // 🐟 마당 연못 — 물고기 도감이 있으면 생긴다(dev 세션은 E3 미배정 → 연못 켜짐). refreshPond 를 직접 불러 만든다
  await ev(`(async()=>{ __space.museum[1](); await new Promise(r=>setTimeout(r,1500)); (${mod('/js/pond/index.js')}).refreshPond('fish'); return 1 })()`);
  await ev('__tp(-10.6, -13.2)'); await S(5000); await shot('38_pond');
  // 🌙 꿈의 숲
  await ev('__dream.house()'); await S(2000); await ev('__dream.night()'); await ev('__dream.start()'); await S(2000); await ev('__dream.skip()');
  await until('__dream.state().atDream === true && __dream.state().cut === false'); await S(3000);
  await ev('__dream.tp(0, 5)'); await S(2000); await ok(); await S(2500); await shot('35_dream');
  await ev('__dream.wake()'); await until('!__dream.state().atDream && !__dream.state().sleeping', 60000);
  // 🪞 거울 마을·🔭 천문대 — 새 세이브는 7장/6장 완료 뒤 열림 → story.ch=7 로 연다
  await ev(`(__space.house[1](), __gs().story.ch = 7, 1)`); await S(3000);
  await ev('__mirror.day()'); await ev('__mirror.stop()'); await until(`__mirror.state().nearDoor === 'mirrorgo'`, 20000); await space();
  await until('__mirror.state().atMirror === true && __mirror.state().ride === false', 300000); await S(2000);
  await ev('__mirror.tp(0, 2)'); await S(2000); await ok(); await S(2500); await shot('37_mirror');
  await ev(`(${mod('/js/spaces/mirror.js')}).mirrorAction('mirrorback')`);
  await until('__mirror.state().atMirror === false && __mirror.state().ride === false', 300000);
  await ev('__dream.night()'); await ev('__tp(25, 26.2)'); await S(3000); await space(); await S(6000); await ok();
  await walk('Up', 600); await walk('Right', 400); await S(1000);                // 망원경 자리(r 1.1) 안으로
  await space(); await S(8000); await click(410, 280); await S(1200);           // 수첩 → 북두칠성
  await shot('36_observatory');                                                  // 판정 글자가 뜨기 전 첫 별 직전
}

async function phone() {
  await enter();
  await touch([{ t: 'touchStart', x: 88, y: 630, w: 100 }, { t: 'touchMove', x: 88, y: 610, w: 100 }, { t: 'touchMove', x: 88, y: 585, w: 2000 }, { t: 'touchEnd', x: 88, y: 585, w: 200 }]);
  await S(2000); console.log(' ', await spot());
  await touch([{ t: 'touchStart', x: 205, y: 602, w: 900 }, { t: 'touchMove', x: 195, y: 560, w: 300 }, { t: 'touchMove', x: 180, y: 530, w: 500 }, { t: 'touchEnd', x: 180, y: 530, w: 200 }]);
  await S(2000); console.log(' ', await spot());
  await touch([{ t: 'touchStart', x: 288, y: 640, w: 150 }, { t: 'touchEnd', x: 288, y: 640, w: 200 }]);
  await S(2500);
  await ev(`document.querySelector('#spot-layer .sp-skip').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}))`);   // 선택 단계(가방~지도) 건너뛰기
  await S(3000); await btn('#story-modal', '/닫기/'); await S(2000);
  await touch([{ t: 'touchStart', x: 205, y: 602, w: 1200 }]);                   // 🧰 도구 버튼 꾹 → 부채꼴 펼친 채 촬영
  await shot('30_mobile_coach');
  await touch([{ t: 'touchEnd', x: 205, y: 602, w: 100 }]);
}

if (dev === 'phone') await phone(); else await pc();
if (b.logs.length) console.log('console errors:', b.logs.slice(0, 8));
clearInterval(front);
await b.close();
process.exit(0);
