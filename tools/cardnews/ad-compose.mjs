// =============================================================
//  calm forest · 🎬 광고 영상 마무리 — 원본(ad-record.mjs) + 자막 + 엔드카드 + 음악(music.mjs)
//  ------------------------------------------------------------
//  node ad-compose.mjs --scenario halloween --raw out/ad/halloween_raw.mp4 --music out/music/halloween.wav --out out/ad/halloween_v1.mp4
//
//  ▶ 자막은 HTML 로 조판해 투명 PNG 로 뜬 뒤 ffmpeg 로 시각에 맞춰 얹는다(페이드 0.25초).
//    카드뉴스·쇼츠와 같은 Pretendard. 폰트를 못 받는 환경이면 AD_FONT_FILE=<ttf> 로 대신 준다.
//  ▶ 🛟 Meta 릴스 안전 영역(1080×1920): 위 14%(≈270px)·아래 35%(≈672px)·좌우 6%(≈65px)는 UI 가 덮는다.
//    자막은 300~600px 띠, 엔드카드는 화면 가운데 — 둘 다 그 안에서만 쓴다.
//  ▶ 문구 시각은 ad-scenes.mjs 의 컷 구간과 1:1 — 컷을 바꾸면 여기도 바꾼다.
// =============================================================
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdir, readFile, rm } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const SCENARIO = arg('--scenario', 'halloween');
const RAW = resolve(arg('--raw', `out/ad/${SCENARIO}_raw.mp4`));
const MUSIC = arg('--music') ? resolve(arg('--music')) : null;
const OUT = resolve(arg('--out', `out/ad/${SCENARIO}_v1.mp4`));
const DUR = 13;

// [시작, 끝, 문구(줄바꿈은 \n), 강조할 낱말]
const CAPTIONS = {
  halloween: {
    accent: '#ffa24a',
    lines: [
      [0.15, 2.4, '숲에 할로윈이\n찾아왔어요', '할로윈'],
      [2.55, 5.1, '딸깍, 딸깍\n마당에 유령 등이 하나씩', '유령 등'],
      [5.25, 8.5, '마녀 모자 쓰고\n밤 산책', '마녀 모자'],
      [8.65, 10.9, '11월 2일까지만 열리는\n할로윈 숲', '11월 2일까지만'],
    ],
    end: { title: '고요한 숲', sub: '설치 없이 웹에서 바로', chip: '할로윈 이벤트 · 11/2까지' },
  },
  cozy: {
    accent: '#9be08a',
    lines: [
      [0.15, 2.8, '오늘은\n천천히 해도 돼요', '천천히'],
      [2.95, 6.1, '마당을\n하나씩 채우고', '하나씩'],
      [6.25, 9.7, '눈 오는 숲에서\n잠깐 쉬어 가요', '쉬어 가요'],
    ],
    end: { title: '고요한 숲', sub: '설치 없이 웹에서 바로 플레이', chip: '무료 · 웹 · iOS · Android' },
  },
};
const C = CAPTIONS[SCENARIO];
if (!C) throw new Error(`알 수 없는 --scenario: ${SCENARIO}`);
const END_AT = SCENARIO === 'halloween' ? 11.0 : 9.85;

const FONT = process.env.AD_FONT_FILE
  ? `@font-face{font-family:'AdFont';src:url(data:font/ttf;base64,${(await readFile(process.env.AD_FONT_FILE)).toString('base64')});font-weight:100 900}`
  : `@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.css');`;
const icon = (await readFile(join(HERE, '../reel-motion/public/icon.png'))).toString('base64');

const esc = (s) => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const mark = (text, word) => esc(text).split('\n').map(l => word && l.includes(word) ? l.replace(esc(word), `<b>${esc(word)}</b>`) : l).join('<br>');

const BASE = `<style>${FONT}
*{margin:0;box-sizing:border-box}
html,body{width:1080px;height:1920px;background:transparent}
body{font-family:'Pretendard Variable',Pretendard,'AdFont',sans-serif;color:#fff;-webkit-font-smoothing:antialiased}
b{color:${C.accent};font-weight:800}
.cap{position:absolute;left:65px;right:65px;top:300px;display:flex;justify-content:center}
.cap p{font-size:76px;font-weight:800;line-height:1.22;letter-spacing:-0.02em;text-align:center;
  padding:30px 44px;border-radius:40px;background:rgba(18,14,30,.46);
  text-shadow:0 4px 18px rgba(0,0,0,.45)}
.end{position:absolute;left:65px;right:65px;top:620px;display:flex;flex-direction:column;align-items:center;gap:26px;text-align:center}
.end img{width:200px;height:200px;border-radius:46px;box-shadow:0 14px 40px rgba(0,0,0,.35)}
.end h1{font-size:118px;font-weight:800;letter-spacing:-0.03em;text-shadow:0 6px 26px rgba(0,0,0,.5)}
.end p{font-size:56px;font-weight:700;text-shadow:0 4px 18px rgba(0,0,0,.5)}
.end span{font-size:42px;font-weight:700;color:#1a1424;background:${C.accent};padding:14px 34px;border-radius:999px}
</style>`;

const tmp = join(tmpdir(), `adc-${Date.now()}`);
await mkdir(tmp, { recursive: true });
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
const shots = [];
async function shot(html, name) {
  await page.setContent(BASE + html, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const p = join(tmp, name + '.png');
  await page.screenshot({ path: p, omitBackground: true });
  return p;
}
for (const [i, [a, b, text, word]] of C.lines.entries()) shots.push([a, b, await shot(`<div class="cap"><p>${mark(text, word)}</p></div>`, 'cap' + i)]);
shots.push([END_AT + 0.15, DUR, await shot(`<div class="end"><img src="data:image/png;base64,${icon}"><h1>${esc(C.end.title)}</h1><p>${esc(C.end.sub)}</p><span>${esc(C.end.chip)}</span></div>`, 'end')]);
await browser.close();

// ── ffmpeg: 원본 위에 자막을 시각대로 얹고(알파 페이드), 엔드카드 구간은 화면을 살짝 어둡게 ──
const inputs = ['-i', RAW];
for (const [, , p] of shots) inputs.push('-loop', '1', '-t', String(DUR), '-i', p);
if (MUSIC) inputs.push('-i', MUSIC);
const F = 0.25;
let fc = `[0:v]drawbox=x=0:y=0:w=iw:h=ih:color=black@0.38:t=fill:enable='gte(t,${END_AT})'[v0];`;
shots.forEach(([a, b], i) => {
  fc += `[${i + 1}:v]format=rgba,fade=t=in:st=${a}:d=${F}:alpha=1,fade=t=out:st=${Math.max(a + F, b - F)}:d=${F}:alpha=1[c${i}];`;
  fc += `[v${i}][c${i}]overlay=0:0:enable='between(t,${a},${b})'[v${i + 1}];`;
});
fc = fc.replace(/;$/, '');
const out = ['-filter_complex', fc, '-map', `[v${shots.length}]`];
if (MUSIC) out.push('-map', `${shots.length + 1}:a`, '-af', `afade=t=out:st=${DUR - 1.2}:d=1.2`, '-c:a', 'aac', '-b:a', '192k');
out.push('-t', String(DUR), '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', '30', '-movflags', '+faststart', OUT);
await mkdir(dirname(OUT), { recursive: true });
await new Promise((res, rej) => {
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, ...out], { stdio: 'inherit' });
  ff.on('close', c => c === 0 ? res() : rej(new Error('ffmpeg ' + c)));
});
await rm(tmp, { recursive: true, force: true });
console.log(`✅ ${OUT}`);
