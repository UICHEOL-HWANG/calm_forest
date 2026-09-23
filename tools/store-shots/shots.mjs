#!/usr/bin/env node
// =============================================================
//  📸 스토어 스크린샷 촬영 — 헤드리스 Chrome(CDP) + 게임 개발용 쿼리 파라미터
//  ------------------------------------------------------------
//  사용: python3 scripts/serve.py 8791 &   (프로젝트 루트 서빙)
//        node tools/store-shots/shots.mjs <phone|tab7|tab10|toss> [포트=9333] [장면 접두어]
//  산출: .scratch/store-shots/<기기>-<장면>.png  (git 무시)
//
//  ⚠️ 함정(2026-09-23, 전부 겪음)
//   · deviceScaleFactor 를 실기기 값으로 — DPR 1 로 1080×1920 을 찍으면 UI 가 실제의 1/3 로 작게 나온다.
//   · Supabase·GA 를 막아 오프라인 게스트로 진입 → 운영 DB 에 익명 계정이 안 쌓인다.
//   · 큰 해상도는 첫 로딩이 느리다 → 게스트 버튼이 보일 때까지 폴링.
//   · 토스 가로 스크린샷은 정확히 1504×741 이어야 한다(1px 도 거부). CDP clip 은 짝수로 반올림돼
//     1505×741 로 나오므로 sips -c 741 1504 로 1열만 잘라 맞춘다(무손실).
//   · 나룻배는 안개에 묻혀 부적합, 캐릭터 고르기 모달은 폰에서 작다 — 아래 5장면이 검수 통과본.
// =============================================================
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch } from './cdp.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = path.join(ROOT, '.scratch', 'store-shots');
const BASE = 'http://127.0.0.1:8791/';
const DEVICES = {
  phone: { w: 360, h: 640, dsf: 3, touch: true, mobile: true, ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36' },   // 1080×1920
  tab7:  { w: 960, h: 540, dsf: 2, touch: true, ua: 'Mozilla/5.0 (Linux; Android 14; SM-X110) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36' },                           // 1920×1080
  tab10: { w: 1280, h: 720, dsf: 2, touch: true, ua: 'Mozilla/5.0 (Linux; Android 14; SM-X810) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36' },                          // 2560×1440
  toss:  { w: 1003, h: 494, dsf: 1.5, touch: true, mobile: true, crop: [741, 1504], ua: 'Mozilla/5.0 (Linux; Android 14; SM-S921N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36' }, // → 1504×741
};
const SCENES = [
  ['1-village', 'time=0.32', ['__tp(1.5, 3)']],
  ['2-house', 'time=0.36&house=6', ['__tp(-8, 0)']],
  ['3-farm', 'time=0.34&farm=1', ['__farmMax()']],
  ['4-sea', 'time=0.40&sea=1', []],
  ['5-night', 'time=0.80&house=6', ['__tp(-3, 2)']],
];
const DISMISS = ['intro-skip', 'coach-skip', 'tut-skip', 'seed-ok', 'hint-ok', 'notice-ok'];
// 캡처 직전 정리 — 오프라인 표기·토스트·초보자 안내서 배너(클래스 제거로는 안 사라져 fixed 컨테이너를 숨긴다)
const CLEAN = `(() => { document.body.classList.remove('hintbanner');
  for (const el of document.querySelectorAll('#topleft *')) if (el.childNodes.length===1 && el.firstChild.nodeType===3 && /오프라인/.test(el.textContent)) el.textContent = el.textContent.replace('(오프라인)','');
  document.querySelectorAll('#toast').forEach(e => e.style.display='none');
  for (const el of document.querySelectorAll('body *')) if (el.children.length===0 && /초보자 안내서가 있어요/.test(el.textContent)) { let c=el; while (c && c!==document.body && getComputedStyle(c).position!=='fixed') c=c.parentElement; if (c && c!==document.body) c.style.display='none'; }
  return true; })()`;

async function enterGame(b, params) {
  await b.goto(BASE + '?dbg=1&weather=clear&' + params, 9000);
  for (let i = 0; i < 30; i++) {
    const ok = await b.evaluate(`(() => { const g=document.getElementById('guest-btn'); if (g && g.offsetParent) { g.click(); return true; } return false; })()`);
    if (ok) break; await b.sleep(1000);
  }
  await b.sleep(3500);
  await b.evaluate(`(() => { const c=[...document.querySelectorAll('#char-grid *')].find(e=>/곰/.test(e.textContent)); c?.click();
    [...document.querySelectorAll('#char-modal button')].find(x=>/시작|확인|결정|이 친구/.test(x.textContent))?.click(); return true; })()`);
  await b.sleep(2500);
  for (let i = 0; i < 12; i++) {
    const hit = await b.evaluate(`(() => { for (const id of ${JSON.stringify(DISMISS)}) { const e=document.getElementById(id); if (e && e.offsetParent) { e.click(); return id; } }
      const t=[...document.querySelectorAll('button')].find(x=>x.offsetParent && /^(건너뛰기|알겠어요|닫기|확인)/.test(x.textContent.trim())); if (t) { t.click(); return 1; } return null; })()`);
    if (!hit && i > 3) break;
    await b.sleep(1500);
  }
}

const [dev, port = '9333', only] = process.argv.slice(2);
const d = DEVICES[dev];
if (!d) { console.error(`기기: ${Object.keys(DEVICES).join(' | ')}`); process.exit(1); }
mkdirSync(OUT, { recursive: true });
const b = await launch(+port);
await b.send('Network.enable');
await b.send('Network.setBlockedURLs', { urls: ['*supabase.co*', '*googletagmanager*', '*google-analytics*'] });
await b.viewport(d.w, d.h, d);
for (const [name, params, acts] of SCENES) {
  if (only && !name.startsWith(only)) continue;
  await enterGame(b, params);
  await b.sleep(2500);
  for (const a of acts) { await b.evaluate(`(()=>{ try { return ${a}; } catch (e) { return 'ERR ' + e.message } })()`); await b.sleep(2500); }
  await b.evaluate(CLEAN); await b.sleep(1200);
  const file = path.join(OUT, `${dev}-${name}.png`);
  await b.shot(file);
  if (d.crop) execFileSync('sips', ['-c', String(d.crop[0]), String(d.crop[1]), file], { stdio: 'ignore' });
  console.log('📸', path.relative(ROOT, file));
}
await b.close();
