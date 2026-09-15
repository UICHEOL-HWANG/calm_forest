// =============================================================
//  calm forest · 🎥 게임 플레이 녹화
//  ------------------------------------------------------------
//  node record.mjs --out clips/04_game.mp4 [--secs 5] [--port 8000]
//                  [--q "weather=clear&time=0.46"]
//
//  왜 필요한가: 쇼츠 앞부분은 Veo 생성 영상이라 아무리 참조를 물려도
//  "진짜 게임 화면"은 아니다. 마지막에 실제 렌더를 붙여야 광고가 거짓이 안 된다.
//  카드뉴스가 5~7장에서 게임 실물을 꺼내는 것과 같은 구조다.
//
//  ⚠️ 규격을 Flow 출력(720x1280 h264 + aac)에 맞춘다. ffmpeg concat 은 스트림
//     파라미터가 다르면 조용히 깨지거나 첫 클립 규격으로 뭉갠다.
//     게임엔 오디오 트랙이 없으므로 무음 aac 를 만들어 붙인다.
// =============================================================
import { chromium } from 'playwright';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import { resolve, dirname, join, basename } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { PHOTOMODE, enterGame } from './game-session.mjs';

const run = promisify(execFile);
const HERE = dirname(fileURLToPath(import.meta.url));

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };

const OUT = arg('--out');
const SECS = Number(arg('--secs', '5'));
const PORT = arg('--port', '8000');
const QUERY = arg('--q', 'weather=clear&time=0.46');
const W = 720, H = 1280;                       // Flow 720p 세로와 동일

if (!OUT) { console.error('사용: node record.mjs --out <mp4> [--secs 5]'); process.exit(1); }

/** 걷기·둘러보기. 가만히 선 화면은 정지 이미지와 다를 게 없다 —
 *  "움직이는 진짜 게임"이 보이는 게 이 클립의 존재 이유다. */
async function play(page, ms) {
  const tap = async (key, hold) => {
    await page.keyboard.down(key); await page.waitForTimeout(hold); await page.keyboard.up(key);
  };
  const until = Date.now() + ms;
  const moves = ['KeyW', 'KeyD', 'KeyW', 'KeyA'];
  for (let i = 0; Date.now() < until; i++) {
    await tap(moves[i % moves.length], 700);
    await page.waitForTimeout(180);
  }
}

const tmp = await mkdtemp(join(tmpdir(), 'cf-record-'));
// ⚠️ 헤드리스는 실제 화면 합성을 억제한다. rAF 는 60 으로 돌아도(측정함) 캔버스에
//    새 프레임이 안 올라와 captureStream 이 2.8fps 밖에 못 뜬다. 창을 띄워야
//    GPU 합성이 돌고 프레임이 제대로 나온다. --headless 로 강제할 수도 있다.
const HEADLESS = argv.includes('--headless');
const browser = await chromium.launch({
  headless: HEADLESS,
  args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'],
});
// deviceScaleFactor 1 — 2배로 그리면 프레임이 떨어진다(shoot.mjs 실측).
// ⚠️ Playwright 의 recordVideo 는 쓰지 않는다. CDP screencast 방식이라 무거운
//    WebGL 페이지에서 초당 5장밖에 못 뜬다(6초에 고유 프레임 28장 = 4.7fps 실측).
//    게임 자체는 60fps 로 잘 돈다(rAF 측정 60.3) — 병목은 캡처 쪽이었다.
//    그래서 페이지 안에서 canvas.captureStream() + MediaRecorder 로 직접 뜬다.
const ctx = await browser.newContext({
  viewport: { width: W, height: H },
  deviceScaleFactor: 1,
});
const page = await ctx.newPage();

let b64 = null;
try {
  await page.goto(`http://localhost:${PORT}/?lang=ko&${QUERY}`, { waitUntil: 'load' });
  // 기동이 느릴 때가 있다 — 스킵 버튼이 6초 안에 안 떠서 인트로 도시가 찍혔었다
  await enterGame(page, { skipMs: 20000, playMs: 45000 });
  await page.addStyleTag({ content: PHOTOMODE });   // HUD 숨김 — 쇼츠에 UI 가 나오면 안 된다
  await page.waitForTimeout(800);                   // 다음 렌더 프레임까지

  // 캔버스 녹화 시작 (게임 조작과 병렬로 돈다)
  await page.evaluate((fps) => {
    const cv = document.querySelector('#app canvas');
    if (!cv) throw new Error('#app canvas 를 못 찾았다');
    const stream = cv.captureStream(fps);
    const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
      .find(m => MediaRecorder.isTypeSupported(m));
    if (!mime) throw new Error('MediaRecorder 가 webm 을 못 쓴다');
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 6_000_000 });
    window.__chunks = [];
    rec.ondataavailable = e => { if (e.data.size) window.__chunks.push(e.data); };
    rec.start(200);
    window.__rec = rec;
  }, 30);

  await play(page, SECS * 1000);

  b64 = await page.evaluate(async () => {
    const rec = window.__rec;
    await new Promise(res => { rec.onstop = res; rec.stop(); });
    const blob = new Blob(window.__chunks, { type: 'video/webm' });
    const buf = new Uint8Array(await blob.arrayBuffer());
    let s = '';
    for (let i = 0; i < buf.length; i += 0x8000) {
      s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
    }
    return btoa(s);
  });
} finally {
  await ctx.close();
  await browser.close();
}
if (!b64) throw new Error('녹화 데이터를 못 받았다');

const webm = join(tmp, 'raw.webm');
await writeFile(webm, Buffer.from(b64, 'base64'));

// webm → mp4. Flow 클립과 규격을 맞춘다(h264 yuv420p 30fps + 무음 aac 48k).
const dst = resolve(HERE, OUT);
await run('ffmpeg', [
  '-y', '-v', 'error',
  '-t', String(SECS),            // 캔버스 녹화라 앞부분(로그인·인트로)은 애초에 안 들어간다
  '-i', webm,
  '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000',
  '-shortest',
  '-vf', `scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2,fps=30,format=yuv420p`,
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '20',
  '-c:a', 'aac', '-b:a', '128k',
  dst,
]);
await rm(tmp, { recursive: true, force: true });

const { stdout: dur } = await run('ffprobe',
  ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', dst]);
const sec = Number(dur.trim());
if (!(sec > SECS * 0.6)) throw new Error(`길이가 ${sec}초밖에 안 된다 — 녹화가 일찍 끊겼다`);

// ⚠️ fps 30 으로 인코딩해도 원본이 5fps 면 같은 그림을 복제할 뿐이다.
//    "표기 30fps, 실제 4.7fps" 로 버벅이는 영상을 한 번 내보냈다 — 고유 프레임을 센다.
const { stderr: dec } = await run('ffmpeg',
  ['-v', 'info', '-i', dst, '-vf', 'mpdecimate,showinfo', '-f', 'null', '-'])
  .catch(e => ({ stderr: e.stderr || '' }));
const uniq = (dec.match(/showinfo.*? n: *\d+/g) || []).length;
const realFps = uniq / sec;
console.log(`✅ ${basename(dst)} — ${(await stat(dst)).size.toLocaleString()} bytes · ` +
            `${sec.toFixed(1)}초 · 실제 ${realFps.toFixed(1)}fps (고유 ${uniq}프레임)`);
if (realFps < 15) console.warn(`⚠️ ${realFps.toFixed(1)}fps 는 버벅여 보인다`);
