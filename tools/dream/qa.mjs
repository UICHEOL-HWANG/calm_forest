#!/usr/bin/env node
// =============================================================
//  🌙 꿈의 숲 엣지 케이스 QA — 오프라인(Supabase·GA 차단) 헤드리스, 실제 키 입력(CDP)으로 민다
//  ------------------------------------------------------------
//  사용: 프로젝트 루트를 8032 로 서빙(launch.json "dream-forest" 또는 python3 scripts/serve.py 8032) 후
//        node tools/dream/qa.mjs [pc|mobile] [CDP 포트=9371] [en]   → .scratch/dream/qa/*.png + 27개 PASS/FAIL
//  ⚠️ 함정(2026-10-08 실측)
//   · 헤드리스 탭이 hidden 으로 바뀌면 rAF 가 0 → 게임 루프·CSS 전환이 통째로 멈춘다 → 포커스 에뮬레이션 + 0.7초마다 bringToFront
//   · 헤드리스는 프레임이 느려(≈5fps) 컷신·줍기 판정이 늦다 → 시간 대기 대신 상태 폴링
//   · 맨 localhost 로 열면 운영 Supabase 에 기록된다 — 이 스크립트는 차단 + dev 파라미터(?weather=)로만 연다
//   · window.__dream 훅은 localhost 전용(js/game.js)
// =============================================================
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch } from '../store-shots/cdp.mjs';
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = path.join(ROOT, '.scratch', 'dream', 'qa');
import { mkdirSync } from 'node:fs';
mkdirSync(OUT, { recursive: true });
const dev = process.argv[2] || 'pc', port = +(process.argv[3] || 9371), lang = process.argv[4] || '';
const D = dev === 'pc' ? { w: 1280, h: 720, dsf: 1 } : { w: 390, h: 844, dsf: 2, touch: true, mobile: true, ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36' };
const b = await launch(port);
await b.send('Network.enable');
await b.send('Network.setBlockedURLs', { urls: ['*supabase.co*', '*googletagmanager*', '*google-analytics*'] });
await b.viewport(D.w, D.h, D);
await b.send('Emulation.setFocusEmulationEnabled', { enabled: true });
const front = () => b.send('Page.bringToFront');   // ⚠️ 헤드리스 탭이 hidden 으로 바뀌면 rAF 가 0 — 게임 루프가 멈춘다(실측)
setInterval(() => { front().catch(() => {}); }, 700);
const ev = async (e) => { try { return await Promise.race([b.evaluate(e), new Promise(r => setTimeout(() => r('TIMEOUT'), 8000))]); } catch (x) { return 'ERR ' + x.message; } };
const shot = async (n) => b.shot(`${OUT}/${dev}${lang}-${n}.png`);
const results = [];
const check = (name, ok, info = '') => { results.push([ok ? 'PASS' : 'FAIL', name, info]); console.log(ok ? '✅' : '❌', name, info); };
const KEYS = { Space: [' ', 32], Escape: ['Escape', 27], ArrowUp: ['ArrowUp', 38], ArrowDown: ['ArrowDown', 40], ArrowLeft: ['ArrowLeft', 37], ArrowRight: ['ArrowRight', 39], KeyC: ['c', 67], Digit3: ['3', 51] };
const key = async (code, type) => { const [k, vk] = KEYS[code]; await b.send('Input.dispatchKeyEvent', { type, code, key: k, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk }); };
const press = async (code) => { await key(code, 'keyDown'); await b.sleep(80); await key(code, 'keyUp'); };
const hold = async (code, ms) => { await key(code, 'keyDown'); await b.sleep(ms); await key(code, 'keyUp'); };
const waitCut = async () => { for (let i = 0; i < 60; i++) { const s = await ev('__dream.state()'); if (s && s.cut === false && s.sleeping === false) return s; await b.sleep(300); } return await ev('__dream.state()'); };
const DISMISS = ['intro-skip', 'coach-skip', 'tut-skip', 'seed-ok', 'hint-ok', 'notice-ok'];
await b.goto(`http://127.0.0.1:8032/?dbg=1&weather=clear&time=0.80&house=6&give=shard:30${lang ? '&lang=' + lang : ''}`, 9000);
for (let i = 0; i < 30; i++) { if (await ev(`(() => { const g=document.getElementById('guest-btn'); if (g && g.offsetParent) { g.click(); return true; } return false; })()`) === true) break; await b.sleep(1000); }
await b.sleep(3500);
await ev(`(() => { const c=[...document.querySelectorAll('#char-grid *')].find(e=>/곰|Bear/.test(e.textContent)); c?.click(); [...document.querySelectorAll('#char-modal button')].find(x=>/시작|확인|결정|이 친구|Start|OK/.test(x.textContent))?.click(); return true; })()`);
await b.sleep(2500);
for (let i = 0; i < 12; i++) { const hit = await ev(`(() => { for (const id of ${JSON.stringify(DISMISS)}) { const e=document.getElementById(id); if (e && e.offsetParent) { e.click(); return id; } } const t=[...document.querySelectorAll('button')].find(x=>x.offsetParent && /^(건너뛰기|알겠어요|닫기|확인|Skip|Got it|Close|OK)/.test(x.textContent.trim())); if (t) { t.click(); return 1; } return null; })()`); if (!hit && i > 3) break; await b.sleep(1500); }
const L = `(await import('/js/dream/layout.js'))`;
await ev('__dream.reset()'); await ev('__dream.house()'); await b.sleep(800);

// Q1 낮엔 선택 창 대신 안내 토스트(꿈 못 감)
await ev('__dream.day()'); await ev('__dream.open()'); await b.sleep(400);
check('Q1 낮 침대 = 선택 창 안 뜸', (await ev(`document.getElementById('dream-modal').classList.contains('show')`)) === false);
// Q2 선택 창 띄운 채 날이 밝으면 꿈꾸기 거절
await ev('__dream.night()'); await ev('__dream.open()'); await b.sleep(300);
await ev('__dream.day()'); await ev(`document.getElementById('dream-opt-dream').click()`); await b.sleep(600);
let st = await ev('__dream.state()');
check('Q2 창 연 채 낮이 되면 꿈 시작 안 함', st.atDream === false && st.cut === false && st.sleeping === false, JSON.stringify({ a: st.atDream, c: st.cut, s: st.sleeping }));
// Q3 취소(바깥 탭)
await ev('__dream.night()'); await ev('__dream.open()'); await b.sleep(300);
await ev(`(() => { const m=document.getElementById('dream-modal'); m.dispatchEvent(new MouseEvent('click', { bubbles: true })); return true; })()`); await b.sleep(300);
check('Q3 바깥 탭 = 닫힘', (await ev(`document.getElementById('dream-modal').classList.contains('show')`)) === false);
// Q4 연타 — 꿈꾸기 두 번 눌러도 한 번만
await ev('__dream.open()'); await b.sleep(300);
await ev(`(() => { const x=document.getElementById('dream-opt-dream'); x.click(); x.click(); return true; })()`);
await b.sleep(150); await ev('__dream.start()');
await press('Space'); await press('Space');   // 실제 경로: 컷신 중 액션 연타 — 선택 창이 다시 뜨면 안 된다
st = await ev('__dream.state()');
check('Q4 연타·중복 호출에도 컷신 하나·선택 창 재등장 없음', st.cut === true && (await ev(`document.getElementById('dream-modal').classList.contains('show')`)) === false, JSON.stringify(st.dream));
// Q5 암전 덮이기 전 Esc → 덮인 뒤 넘어가야(즉시 순간이동 X)
await press('Escape'); await b.sleep(80);
const early = await ev('__dream.state()');
check('Q5a 암전 전 Esc 직후엔 아직 꿈 밖', early.atDream === false, JSON.stringify({ a: early.atDream, cut: early.cut }));
st = await waitCut();
check('Q5b Esc 건너뛰기 뒤 섬 도착·조작 해제', st.atDream === true && st.cut === false && st.sleeping === false, JSON.stringify(st));
check('Q5c 방문 1회만', st.dream.visits === 1, String(st.dream.visits));
await ev(`document.getElementById('dream-arrive-ok')?.click()`); await b.sleep(300);
// Q6 저장 스냅샷 — 꿈속 저장은 집 앞·아침
const sv = await ev('__dream.save()');
check('Q6 꿈속 저장 = 집 앞 좌표·WAKE_TIME', sv.pos && sv.pos.z > -100 && Math.abs(sv.tod - 0.30) < 1e-6, JSON.stringify(sv.pos) + ' tod ' + sv.tod);
// Q7 시간 정지
const tod0 = (await ev('__dream.state()')).tod; await b.sleep(2500); const tod1 = (await ev('__dream.state()')).tod;
check('Q7 꿈속 시간 정지', tod0 === tod1, `${tod0}→${tod1}`);
// Q8 실제 키로 섬 밖 허공으로 걸어가기 — 걸을 수 있는 곳에 남아야
await ev('__dream.tp(0, 5)');
for (const k of ['ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowUp']) {
  await hold(k, 2200);
  const p = (await ev('__dream.state()')).pos;
  const ok = await ev(`(async () => { const M = ${L}; const c = M.clampWalkable(${p[0]}, ${p[1]} + 550); return Math.hypot(c.x - ${p[0]}, c.z - (${p[1]} + 550)) < 0.02; })()`);   // 좌표가 0.01 반올림이라 경계 오차 허용
  check(`Q8 ${k} 로 계속 걸어도 섬 위`, ok === true, JSON.stringify(p));
}
await shot('q8-edge');
// Q9 다리 건너기 — main → pink 를 실제로 걸어서
await ev('__dream.tp(-3.5, -3.2)');
await ev(`(() => { return true; })()`);
// 플레이어를 북서로 — 대각선 키 조합
await key('ArrowUp', 'keyDown'); await key('ArrowLeft', 'keyDown'); await b.sleep(5200); await key('ArrowUp', 'keyUp'); await key('ArrowLeft', 'keyUp');
let p9 = (await ev('__dream.state()')).pos;
check('Q9 다리 따라 걸어서 다른 섬 쪽으로 이동(허공으로 안 떨어짐)', await ev(`(async () => ${L}.isWalkable(${p9[0]}, ${p9[1]} + 550))()`) === true, JSON.stringify(p9));
await shot('q9-bridge');
// Q10 구름 침대 통과 불가 — 침대 한가운데로 순간이동 후 밀려나야
await ev('__dream.tp(-3.6, 2.4)'); await hold('ArrowUp', 300);
const p10 = (await ev('__dream.state()')).pos;
const inBed = Math.abs(p10[0] + 3.6) < 0.8 && Math.abs(p10[1] + 550 - 2.4) < 1.15;
check('Q10 구름 침대 상자 밖으로 밀려남', !inBed, JSON.stringify(p10));
// Q10b 오늘 조각 7개 줍기
const spots0 = await ev(`(async () => { const L2 = ${L}; return L2.shardsLeft(__dream.state().dream, __dream.state().dream.day).map(id => { const s = L2.spotOf(id); return [s.x, s.z]; }); })()`);
for (const [x, z] of spots0) { await ev(`__dream.tp(${x}, ${z})`); for (let k = 0; k < 10; k++) { await b.sleep(250); const pp = (await ev('__dream.state()')).pos; if (Math.abs(pp[0] - x) > 0.05 || Math.abs(pp[1] + 550 - z) > 0.05) console.log('   moved?', x, z, JSON.stringify(pp)); const g = (await ev('__dream.state()')).dream.got.length; if (g >= spots0.indexOf(spots0.find(q => q[0] === x && q[1] === z)) + 1) break; } }
const s10 = await ev('__dream.state()');
console.log('   left after', JSON.stringify(await ev(`(async () => ${L}.shardsLeft(__dream.state().dream, __dream.state().dream.day))()`)));
check('Q10b 하루 7개 다 줍기', s10.dream.got.length === 7 && s10.shard === 37, JSON.stringify({ got: s10.dream.got.length, shard: s10.shard }));
// Q11 실제 Space 로 깨어나기
await ev('__dream.tp(-3.6, 4.4)'); await b.sleep(500);
const pr = await ev(`document.getElementById('door-prompt')?.textContent`);
await press('Space'); await b.sleep(2600);
st = await ev('__dream.state()');
check('Q11 Space 로 깨어나기 → 집·아침', st.atDream === false && Math.abs(st.tod - 0.30) < 0.02, `${pr} → ${JSON.stringify(st.pos)} tod ${st.tod}`);
check('Q11b 깨어난 뒤 실내 복귀', (await ev('__dream.save()')).indoor === true);
// Q12 깨어난 뒤 C(앉기)·도구 전환 정상
await press('KeyC'); await b.sleep(300);
check('Q12 깨어난 뒤 조작 살아 있음(sleeping=false)', (await ev('__dream.state()')).sleeping === false);
await press('KeyC');
// Q13 꾸미기 메뉴 — ✨ 30(give) 로 구름 침대 사기·놓기(기존 침대에서 떨어진 방 가운데에서)
await ev('__tp(1.5, 52)'); await b.sleep(400);
await ev(`document.getElementById('decor-btn')?.click()`); await b.sleep(600);
const row = await ev(`(() => { const r=[...document.querySelectorAll('#dm-items .dm-item')].find(e=>/구름 침대|Cloud Bed/.test(e.textContent)); if (!r) return null; const off=r.classList.contains('off'); r.click(); return off ? 'off' : 'clicked'; })()`);
check('Q13a 구름 침대 행 노출·선택 가능', row === 'clicked', String(row));
await b.sleep(500); await press('Space'); await b.sleep(900);
const after = await ev(`(() => { const g = __gs(); return { shard: g.inventory.shard, beds: g.house.decor.filter(d=>d.id==='cloudBed').length }; })()`);
check('Q13b 구름 침대 놓기 = ✨20 차감', after.beds === 1 && after.shard === (30 + 7 - 20), JSON.stringify(after));
await shot('q13-cloudbed');
// Q14 구름 침대 옆 밤 프롬프트 = 자기
await ev('__dream.night()');
const cb = await ev(`(() => { const r = __gs().house.decor.find(d=>d.id==='cloudBed'); return r ? [r.x, r.z] : null; })()`);
await ev(`__tp(${cb[0]} + 0 + 0, ${cb[1]} + 52 + 1.9)`); await b.sleep(700);
const pr14 = await ev(`document.getElementById('door-prompt')?.textContent`);
check('Q14 구름 침대 옆 밤 프롬프트 = 자기', /구름 침대 · 자기|Cloud Bed · Sleep/.test(pr14 || ''), pr14);
await shot('q14-cloudbed-night');
// Q15 부족 — 남은 ✨17 로 다시 구름 침대(20) 시도
await ev(`document.getElementById('decor-btn')?.click()`); await b.sleep(600);
const off = await ev(`(() => { const r=[...document.querySelectorAll('#dm-items .dm-item')].find(e=>/구름 침대|Cloud Bed/.test(e.textContent)); return r ? r.classList.contains('off') : null; })()`);
check('Q15 ✨ 부족하면 행이 꺼짐', off === true, String(off));
await ev(`document.getElementById('dm-close')?.click()`);
// Q16 두 번째 꿈(같은 날) — 조각 0개 남음, 바로 침대 안내
await ev('__dream.open()'); await b.sleep(300);
const leftTxt = await ev(`document.getElementById('dream-opt-left').hidden`);
check('Q16a 다 모은 날엔 남은 조각 줄 숨김', leftTxt === true);
await ev(`document.getElementById('dream-opt-dream').click()`); st = await waitCut();
const pr16 = await ev(`document.getElementById('door-prompt')?.textContent`);
check('Q16b 같은 날 재방문: 조각 없음·침대 안내', st.dream.got.length === 0 || /깨어나요|Wake up/.test(pr16 || ''), `${pr16} got=${st.dream.got.length}`);
const shardBefore = (await ev('__dream.save()')).shard;
const spots = await ev(`(async () => { const L2 = ${L}; return L2.pickShards(__dream.state().dream.day).map(id => { const s = L2.spotOf(id); return [s.x, s.z]; }); })()`);
for (const [x, z] of spots) { await ev(`__dream.tp(${x}, ${z})`); await b.sleep(250); }
check('Q16c 같은 날 이미 주운 자리 다시 밟아도 ✨ 안 늘어남', (await ev('__dream.save()')).shard === shardBefore, String(shardBefore));
// Q17 꿈속 미니맵·HUD
check('Q17 HUD 슬롯', /7\/7/.test(await ev(`document.getElementById('zone-prompt')?.textContent`) || ''));
await shot('q17-second');
console.log('logs', JSON.stringify(b.logs.filter(l => !/익명 로그인 실패/.test(l)).slice(0, 10)));
const passed = results.filter(r => r[0] === 'PASS').length;
console.log('SUMMARY', passed, '/', results.length);
await b.close();
process.exit(passed === results.length ? 0 : 1);
