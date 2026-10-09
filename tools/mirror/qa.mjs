#!/usr/bin/env node
// =============================================================
//  🪞 거울 마을 오프라인 QA — Supabase·GA 차단 헤드리스, 실제 키 입력(CDP)으로 민다
//  ------------------------------------------------------------
//  사용: 워크트리 루트를 8033 으로 서빙(python3 scripts/serve.py 8033 · 다른 포트면 QA_PORT=) 후
//        node tools/mirror/qa.mjs [pc|mobile] [CDP 포트=9421] [en]   → .scratch/mirror/qa/*.png + PASS/FAIL
//  ⚠️ 함정(tools/dream/qa.mjs 와 같다)
//   · 헤드리스 탭이 hidden 이면 rAF 0 → 포커스 에뮬레이션 + 0.7초마다 bringToFront
//   · 헤드리스는 ≈5fps — 탑승 연출은 시간 대기 대신 __mirror.state() 폴링
//   · 맨 localhost 는 운영 Supabase 에 기록된다 — 차단 URL 없이 열지 말 것
//   · window.__mirror 훅은 localhost 전용(js/game.js)
// =============================================================
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch } from '../store-shots/cdp.mjs';
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = path.join(ROOT, '.scratch', 'mirror', 'qa');
import { mkdirSync } from 'node:fs';
mkdirSync(OUT, { recursive: true });
const dev = process.argv[2] || 'pc', port = +(process.argv[3] || 9421), lang = process.argv[4] || '';
const D = dev === 'pc' ? { w: 1280, h: 720, dsf: 1 } : { w: 390, h: 844, dsf: 2, touch: true, mobile: true, ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36' };
const b = await launch(port);
await b.send('Network.enable');
await b.send('Network.setBlockedURLs', { urls: ['*supabase.co*', '*googletagmanager*', '*google-analytics*'] });
await b.viewport(D.w, D.h, D);
await b.send('Emulation.setFocusEmulationEnabled', { enabled: true });
const front = () => b.send('Page.bringToFront');   // ⚠️ 헤드리스 탭이 hidden 으로 바뀌면 rAF 가 0 — 게임 루프가 멈춘다(실측)
setInterval(() => { front().catch(() => {}); }, 700);
const ev = async (e) => { try { return await Promise.race([b.evaluate(e), new Promise(r => setTimeout(() => r('TIMEOUT'), 8000))]); } catch (x) { return 'ERR ' + x.message; } };
const results = [];
const check = (name, ok, info = '') => { results.push([ok ? 'PASS' : 'FAIL', name, info]); console.log(ok ? '✅' : '❌', name, info); };
const KEYS = { Space: [' ', 32], Escape: ['Escape', 27], ArrowUp: ['ArrowUp', 38], ArrowDown: ['ArrowDown', 40], ArrowLeft: ['ArrowLeft', 37], ArrowRight: ['ArrowRight', 39], KeyC: ['c', 67], Digit3: ['3', 51], Enter: ['Enter', 13] };
const key = async (code, type) => { const [k, vk] = KEYS[code]; await b.send('Input.dispatchKeyEvent', { type, code, key: k, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk }); };
const press = async (code) => { await key(code, 'keyDown'); await b.sleep(80); await key(code, 'keyUp'); };
const hold = async (code, ms) => { await key(code, 'keyDown'); await b.sleep(ms); await key(code, 'keyUp'); };
const DISMISS = ['intro-skip', 'coach-skip', 'tut-skip', 'seed-ok', 'hint-ok', 'notice-ok'];
await b.goto(`http://127.0.0.1:${process.env.QA_PORT || 8033}/?dbg=1&weather=clear&time=0.42${lang ? '&lang=' + lang : ''}`, 9000);
for (let i = 0; i < 30; i++) { if (await ev(`(() => { const g=document.getElementById('guest-btn'); if (g && g.offsetParent) { g.click(); return true; } return false; })()`) === true) break; await b.sleep(1000); }

await b.sleep(3500);
// 🐻 캐릭터 고르기 — 헤드리스가 느리면 창이 늦게 뜬다: 창이 닫힐 때까지 다시 누른다
for (let i = 0; i < 30; i++) {
  const r = await ev(`(() => { const m=document.getElementById('char-modal'); if (!m || !m.classList.contains('show')) return 'closed'; const c=[...document.querySelectorAll('#char-grid *')].find(e=>/곰|Bear/.test(e.textContent)); c?.click(); [...document.querySelectorAll('#char-modal button')].find(x=>/시작|확인|결정|이 친구|Start|OK/.test(x.textContent))?.click(); return 'open'; })()`);
  if (r === 'closed' && i > 2) break;
  await b.sleep(1000);
}
await b.sleep(2500);
for (let i = 0; i < 12; i++) { const hit = await ev(`(() => { for (const id of ${JSON.stringify(DISMISS)}) { const e=document.getElementById(id); if (e && e.offsetParent) { e.click(); return id; } } const t=[...document.querySelectorAll('button')].find(x=>x.offsetParent && /^(건너뛰기|알겠어요|닫기|확인|Skip|Got it|Close|OK)/.test(x.textContent.trim())); if (t) { t.click(); return 1; } return null; })()`); if (!hit && i > 3) break; await b.sleep(1500); }

const shot = async (n) => b.shot(`${OUT}/${dev}${lang}-${n}.png`);
const prompt = () => ev(`document.getElementById('door-prompt')?.textContent || ''`);
const waitRide = async (ms = 240000) => { const t = Date.now(); while (Date.now() - t < ms) { const s = await ev('__mirror.state()'); if (s && s.ride === false && s.sleeping === false) return s; await b.sleep(400); } return ev('__mirror.state()'); };   // ⏱️ 연출은 dt 기반 — 헤드리스 1fps 면 벽시계로 수 분
const Q = `(await import('/js/mirror/quests.js'))`, LY = `(await import('/js/mirror/layout.js'))`;

// ⏱️ 헤드리스는 ≈1~5fps(부하에 따라) — 고정 sleep 대신 조건이 설 때까지 폴링한다
const until = async (fn, ms = 12000) => { const t = Date.now(); let v; while (Date.now() - t < ms) { v = await fn(); if (v) return v; await b.sleep(250); } return v; };
const waitPrompt = async (re, ms) => { await until(async () => re.test(await prompt()), ms); return prompt(); };
const ms = () => ev('__mirror.state()');

// M1 밤 정류장 = 안내만
await ev('__mirror.reset()'); await ev('__mirror.night()'); await ev('__mirror.stop()');
let p = await waitPrompt(/막차|last carriage/);
check('M1 밤 정류장 프롬프트 = 막차 안내', /막차|last carriage/.test(p), p);
await press('Space'); await b.sleep(1500);
check('M1b 밤엔 Space 로 안 탄다', (await ms()).ride === false);
// M2 낮 탑승(실제 Space) → 연출 → 도착
await ev('__mirror.day()');
p = await waitPrompt(/거울 마을행|Mirror Village/);
check('M2 낮 정류장 프롬프트', /거울 마을행|Mirror Village/.test(p), p);
await b.sleep(1200); await shot('m1-stop-day');   // 🚏 정류장(호수를 본다)·정박 마차
await until(async () => (await ms()).nearDoor === 'mirrorgo');
await press('Space');
check('M2b 탑승 연출 시작', !!(await until(async () => (await ms()).ride === true, 6000)));
const rs = await ev('__mirror.save()');   // 마차가 호수 위를 지나는 중 — 저장 좌표가 호수면 새로고침 때 물에 빠진다
check('M2s 탑승 중 저장 = 정류장 앞', JSON.stringify(rs.pos) === JSON.stringify({ x: 16, z: 15.6 }), JSON.stringify(rs.pos));
await b.sleep(1200); await shot('m2-board');
let st = await waitRide();
check('M2c 거울 마을 도착·조작 해제·방문 1', st.atMirror === true && st.mirror.visits === 1, JSON.stringify(st.pos));
await until(() => ev(`!!document.getElementById('mirror-arrive-ok')?.offsetParent`), 5000);
await shot('m2-arrive-modal');
await ev(`document.getElementById('mirror-arrive-ok')?.click()`); await b.sleep(1500); await shot('m2-arrive');
// M3 시간 정지
const t0 = (await ms()).tod; await b.sleep(2500);
check('M3 거울 마을 시간 정지', t0 === (await ms()).tod);
// M4 저장 = 마을 정류장 앞
const sv = await ev('__mirror.save()');
check('M4 거울 마을 저장 좌표 = 정류장 앞', JSON.stringify(sv.pos) === JSON.stringify({ x: 16, z: 15.6 }), JSON.stringify(sv.pos));
// M5 의뢰 3건 — 주민 앞 Space → 단서 → 물건 자리 → 줍기 · 3번째는 30초 기다려 💧 힌트
for (let n = 1; n <= 3; n++) {
  const q = await ev(`(async () => { const M = ${Q}; return M.questAt(__gs().mirror, __gs().mirror.day); })()`);
  const sp = await ev(`(async () => (${LY}).NPC_SPOTS[${['farmer', 'angler', 'chef'].indexOf(q.npc)}])()`);
  await ev(`__mirror.tp(${sp.x}, ${sp.z + 1.4})`);
  p = await waitPrompt(/말 걸기|Talk to/);
  check(`M5.${n}a 말 걸기 프롬프트`, /말 걸기|Talk to/.test(p), p);
  await until(async () => (await ms()).nearDoor === 'mirrortalk');
  await press('Space');
  await until(async () => (await ms()).nearDoor !== 'mirrortalk', 5000);
  if (n === 3) {
    await b.sleep(30500);
    p = await waitPrompt(/연못에 비춰|Peek/);
    check('M5h 30초 뒤 💧 힌트 프롬프트', /연못에 비춰|Peek/.test(p), p);
    await until(async () => (await ms()).nearDoor === 'mirrorhint');
    await press('Space'); await until(async () => (await ms()).nearDoor !== 'mirrorhint', 5000); await b.sleep(1500); await shot('m5-hint');
    // 힌트 본 뒤 마을에 다녀와 다시 말 걸어도 감점(+2)이 남아야 한다 — M5z 합계 8 로 잠근다
    await ev(`__mirror.tp(2.5, 13.2)`); await until(async () => (await ms()).nearDoor === 'mirrorback');
    await press('Space'); await until(async () => (await ms()).ride === true, 6000); await b.sleep(300); await press('Escape'); await waitRide();
    await ev('__mirror.stop()'); await until(async () => (await ms()).nearDoor === 'mirrorgo');
    await press('Space'); await until(async () => (await ms()).ride === true, 6000); await b.sleep(300); await press('Escape'); await waitRide();
    await ev(`__mirror.tp(${sp.x}, ${sp.z + 1.4})`); await until(async () => (await ms()).nearDoor === 'mirrortalk');
    await press('Space'); await until(async () => (await ms()).nearDoor !== 'mirrortalk', 5000); await b.sleep(800);
    p = await prompt();
    check('M5r 재탑승 뒤 다시 말 걸면 힌트가 바로 이어진다', !/연못에 비춰|Peek/.test(p) && (await ms()).nearDoor !== 'mirrorhint', p);
  }
  const spot = await ev(`(async () => (${LY}).spotOf('${q.spot}'))()`);
  if (n === 3) { await ev(`__mirror.tp(${spot.x}, ${spot.z + 4.5})`); await b.sleep(2500); await shot('m5-beam'); }   // 💧 빛기둥이 화면 안에 들게 조금 떨어져서
  await ev(`__mirror.tp(${spot.x}, ${spot.z + 0.35})`);
  // 🎁 주우면 끝이 아니다 — 주인에게 가져가 돌려줘야 완료(2026-10-09)
  p = await waitPrompt(/가져다주기|Bring the/);
  check(`M5.${n}p 주운 뒤 가져다주기 안내 · 아직 미완료`, /가져다주기|Bring the/.test(p) && (await ms()).mirror.done === n - 1, p);
  if (n === 1) { await b.sleep(800); await shot('m5-carry'); }
  await ev(`__mirror.tp(${sp.x}, ${sp.z + 1.4})`);
  p = await waitPrompt(/돌려주기|Give back/);
  check(`M5.${n}g 주인 앞 돌려주기 프롬프트`, /돌려주기|Give back/.test(p) && (await ms()).nearDoor === 'mirrorgive', p);
  await press('Space');
  st = await until(async () => { const s = await ms(); return s.mirror.done === n ? s : null; }, 10000) || await ms();
  check(`M5.${n} 의뢰 ${n} 완료`, st.mirror.done === n, JSON.stringify(st.mirror));
  if (n === 1) { await b.sleep(600); await shot('m5-thanks'); }
}
st = await ms();
check('M5z 보상 합계 = 3+3+2 · 힌트 기록 [3]', st.coins === 8 && JSON.stringify(st.mirror.hinted) === '[3]', JSON.stringify({ coins: st.coins, hinted: st.mirror.hinted }));
await b.sleep(1000); await shot('m5-done');
// M6 귀환(실제 Space) → 마을 정류장 앞
await ev(`__mirror.tp(2.5, 13.2)`);
p = await waitPrompt(/마을로 돌아가기|Ride back/);
check('M6a 돌아가기 프롬프트', /마을로 돌아가기|Ride back/.test(p), p);
await until(async () => (await ms()).nearDoor === 'mirrorback');
await press('Space'); await until(async () => (await ms()).ride === true, 6000); st = await waitRide();
check('M6 마을로 귀환', st.atMirror === false && Math.hypot(st.pos[0] - 16, st.pos[1] - 15.6) < 0.3, JSON.stringify(st.pos));
// M6w 걸어서 다가가기 — 순간이동(__mirror.stop)만 쓰던 QA 가 놓친 것: 마을(남)·마차(동)에서 걸어오면 지붕 뒤 벽·마차에 막혀
//      승차 지점 반경 밖에서 멈췄고 안내가 끝내 안 떴다(2026-10-09 페르소나 p32 4/10). 막힐 때까지 걸어 본 뒤 안내를 본다
const walkUntil = async (code, n = 70) =>   // ⏱️ 헤드리스는 dt 상한 때문에 걸음이 느리다(≈0.4m/s) — 지붕 뒤 5m 를 걸으려면 넉넉히
   { for (let i = 0; i < n; i++) { if ((await ms()).nearDoor === 'mirrorgo') return true; await hold(code, 350); } return (await ms()).nearDoor === 'mirrorgo'; };
await ev('__tp(23.5, 16.6)'); await until(async () => (await ms()).nearDoor !== 'mirrorgo', 8000);   // ⏱️ 헤드리스는 느려 0.8초로는 정류장 안내가 안 풀린다 — 걷기 전에 이미 '도착'으로 끝났다
check('M6w1 마차 동쪽에서 걸어오면 탑승 안내', await walkUntil('ArrowLeft'), JSON.stringify((await ms()).pos));
await ev('__tp(16, 22)'); await until(async () => (await ms()).nearDoor !== 'mirrorgo', 8000);   // ⏱️ 헤드리스는 느려 0.8초로는 정류장 안내가 안 풀린다 — 걷기 전에 이미 '도착'으로 끝났다
check('M6w2 정류장 지붕 뒤(남)에서 걸어오면 탑승 안내', await walkUntil('ArrowUp'), JSON.stringify((await ms()).pos));
await b.sleep(800); await shot('m6w-stop-back');
// 지붕 뒤에서 탄다 — 걷기 단계가 정류장·마차 상자를 뚫지 않아야 한다(돌아서 승차 지점으로)
const WALL = await ev(`(async () => (${LY}).VILLAGE_WALL)()`);
await press('Space');
await until(async () => (await ms()).ride === true, 6000);
const walkPts = [];
for (let i = 0; i < 40; i++) { const s = await ms(); if (!s.ride || s.atMirror) break; walkPts.push(s.pos); if (Math.hypot(s.pos[0] - 16, s.pos[1] - 15.6) < 0.2) break; await b.sleep(120); }
const inside = walkPts.filter(([x, z]) => WALL.some(w => x > w.x1 && x < w.x2 && z > w.z1 && z < w.z2));   // 정류장·마차 상자
check('M6w3 지붕 뒤에서 타도 벽·마차를 뚫지 않고 돌아간다', walkPts.length > 0 && inside.length === 0, `${walkPts.length}점 · 안쪽 ${JSON.stringify(inside.slice(0, 3))}`);
await press('Escape'); st = await waitRide();
check('M6w4 지붕 뒤 탑승도 거울 마을 도착', st.atMirror === true, JSON.stringify(st.pos));
await ev(`__mirror.tp(2.5, 13.2)`); await until(async () => (await ms()).nearDoor === 'mirrorback');
await press('Space'); await until(async () => (await ms()).ride === true, 6000); await b.sleep(300); await press('Escape'); await waitRide();
// M7 두 번째 탑승은 Esc 건너뛰기
await ev('__mirror.stop()'); await until(async () => (await ms()).nearDoor === 'mirrorgo');
await press('Space'); await until(async () => (await ms()).ride === true, 6000); await b.sleep(300); await press('Escape');
st = await waitRide();
check('M7 Esc 건너뛰기 → 바로 도착', st.atMirror === true);
// M8 드로우콜(거울 마을 안 · 몇 프레임 안정 뒤)
await b.sleep(2500);
// ⚠️ 예산 60 은 '공간' 몫 — 어느 공간에나 따라오는 플레이어 캐릭터(≈31콜)는 뺀다(천문대 예산과 같은 기준). 후처리 패스(≈15)는 포함
const dc = await ev(`(() => { const [px, pz] = __pos(); const pl = __scene.children.find(c => c.type === 'Group' && Math.hypot(c.position.x - px, c.position.z - pz) < 0.6);
  const all = __perf().calls; if (!pl) return { all, space: all }; pl.visible = false; const space = __perf().calls; pl.visible = true; return { all, space }; })()`);
check('M8 거울 마을 드로우콜 ≤ 60(캐릭터 제외)', dc.space <= 60, JSON.stringify(dc));
// M9 꾸미기 — 🪞 8 로 거꾸로 화분(6) 사기 · 남은 2
await ev(`__mirror.tp(2.5, 13.2)`); await until(async () => (await ms()).nearDoor === 'mirrorback');
await press('Space'); await until(async () => (await ms()).ride === true, 6000); await waitRide();
await ev('__dream.house()'); await b.sleep(1500);
await ev(`document.getElementById('decor-btn')?.click()`);
await until(() => ev(`document.querySelectorAll('#dm-items .dm-item').length > 0`), 6000);
const row = await ev(`(() => { const r=[...document.querySelectorAll('#dm-items .dm-item')].find(e=>/거꾸로 화분|Upside-down Pot/.test(e.textContent)); if (!r) return null; r.click(); return 'clicked'; })()`);
check('M9a 거울 장식 행 노출(다녀온 뒤)', row === 'clicked', String(row));
await b.sleep(1500); await press('Space');
st = await until(async () => { const s = await ms(); return s.coins === 2 ? s : null; }, 8000) || await ms();
check('M9b 놓기 = 🪞6 차감', st.coins === 2, String(st.coins));
await b.sleep(1000); await shot('m9-decor');

const trackErr = b.logs.filter(l => /mirror track/.test(String(l)));
check('MZ 추적 엄격 모드 오류 없음([mirror track])', trackErr.length === 0, trackErr.slice(0, 3).join(' | '));
if (b.logs.length) console.log('console errors:', b.logs.slice(0, 20));
const fails = results.filter(r => r[0] === 'FAIL').length;
console.log(`\n${results.length - fails} / ${results.length} PASS`);
await b.close(); process.exit(fails ? 1 : 0);
