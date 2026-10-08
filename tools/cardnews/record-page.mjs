// =============================================================
//  calm forest · 🎥 정적 페이지 캔버스 녹화 (시안·목업용)
//  ------------------------------------------------------------
//  node record-page.mjs --url "http://localhost:8041/dev/.../x.html?c=b" --out clips/x.mp4 [--secs 5]
//
//  record.mjs 는 게임 진입(로그인·캐릭터·인트로)까지 하는 녹화기라 시안 HTML 엔 맞지 않는다.
//  규격·캡처 방식(captureStream + MediaRecorder, 창 띄움)은 record.mjs 와 같다 — 이유도 거기 적혀 있다.
// =============================================================
import { chromium } from 'playwright';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const run = promisify(execFile);
const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const URL_ = arg('--url'), OUT = arg('--out'), SECS = Number(arg('--secs', '5'));
const W = 720, H = 1280;
if (!URL_ || !OUT) { console.error('사용: node record-page.mjs --url <url> --out <mp4> [--secs 5]'); process.exit(1); }

const browser = await chromium.launch({ headless: false, args: ['--use-angle=metal', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })).newPage();
let b64;
try {
  await page.goto(URL_, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 30000 });
  await page.evaluate(() => {
    const rec = new MediaRecorder(document.querySelector('canvas').captureStream(30),
      { mimeType: 'video/webm;codecs=vp9', videoBitsPerSecond: 6_000_000 });
    window.__chunks = []; rec.ondataavailable = e => e.data.size && window.__chunks.push(e.data);
    rec.start(200); window.__rec = rec;
    window.__recStart = performance.now();   // 페이지 쪽 연출(카메라 무빙 등)이 녹화와 같이 출발하도록
  });
  await page.waitForTimeout(SECS * 1000);
  b64 = await page.evaluate(async () => {
    await new Promise(r => { window.__rec.onstop = r; window.__rec.stop(); });
    const buf = new Uint8Array(await new Blob(window.__chunks).arrayBuffer());
    let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
    return btoa(s);
  });
} finally { await browser.close(); }

const tmp = await mkdtemp(join(tmpdir(), 'cf-page-'));
const webm = join(tmp, 'raw.webm');
await writeFile(webm, Buffer.from(b64, 'base64'));
await run('ffmpeg', ['-y', '-v', 'error', '-t', String(SECS), '-i', webm,
  '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000', '-shortest',
  '-vf', `scale=${W}:${H},fps=30,format=yuv420p`, '-c:v', 'libx264', '-crf', '20', '-c:a', 'aac', resolve(HERE, OUT)]);
await rm(tmp, { recursive: true, force: true });
console.log('✅', OUT);
