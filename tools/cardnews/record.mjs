// =============================================================
//  calm forest · 🎥 게임 플레이 녹화
//  ------------------------------------------------------------
//  node record.mjs --out clips/04_game.mp4 [--secs 5] [--port 8000]
//                  [--q "weather=clear&time=0.46"] [--scenario night-duel] [--char 곰] [--animal raccoon] [--require-win]
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
const CHAR = arg('--char');                    // 예: --char 곰 (없으면 기본 여우)
const SCENARIO = arg('--scenario');            // 'night-duel' — 없으면 걷기만
const ANIMAL = arg('--animal', 'boar');       // 'boar'(가위바위보) | 'raccoon'(그릇 섞기)
let recSecs = SECS;                            // 시나리오는 끝나는 시각이 매번 달라 실측으로 덮어쓴다
const marks = {};
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

/** 🐗 밤손님 한 판 — 털린 밭 → 흔적 조사 → 대결 → 결과.
 *  전부 localhost 전용 dev 훅이라 실서비스 경제·지표에 안 나간다. 가위바위보는 무작위라
 *  라운드 수가 매번 다르다 — 길게 한 번 뜨고 marks 로 컷을 자른다(stdout 에 찍는다).
 *  대결은 저장이 성공해야 열리므로 Supabase 를 막지 말 것(게스트 1명 생김). */
async function nightDuel(page, marks, t0, animal = 'boar') {
  const mark = (name) => { marks[name] = +((Date.now() - t0()) / 1000).toFixed(2); };
  const wait = (ms) => page.waitForTimeout(ms);
  mark('field');                                   // 털린 밭 — 훅 컷 뒤에 이어 붙는다
  await wait(1800);
  mark('investigate');
  await page.keyboard.press('Space');              // 흔적 조사 → 대결 오버레이
  await page.waitForSelector('#duel-layer.show', { state: 'attached', timeout: 8000 });
  await wait(1500);
  mark('duel_open');
  const raccoon = animal === 'raccoon';
  const deadline = Date.now() + (raccoon ? 120_000 : 40_000);
  const peekBy = Date.now() + 25_000;              // 너구리: 첫 판 정답 훅이 이 안에 보여야 한다
  let banner = '', picks = 0, sawPeek = false;
  while (Date.now() < deadline) {
    const st = await page.evaluate(() => ({
      open: !!document.querySelector('#duel-layer')?.classList.contains('show'),
      banner: document.querySelector('#duel-banner')?.textContent || '',
      peek: window.__duelPeek ?? null,
      shells: [...document.querySelectorAll('#duel-shells button')].map(b => ({ t: b.textContent, off: b.disabled })),
    }));
    if (st.banner) banner = st.banner;             // 닫히기 직전 마지막 배너가 결과(되찾았어요/놓쳤어요)
    if (!st.open) break;
    if (raccoon) {
      // 정답은 게임 모듈을 가로채 노출한 값이다(아래 route). 섞기가 끝나 버튼이 켜졌을 때만 누른다.
      if (st.peek) sawPeek = true;
      if (!sawPeek && Date.now() > peekBy) throw new Error('너구리 정답 훅이 안 붙었다 — js/duel/index.js 의 askShell 호출부가 바뀌었나');
      if (st.peek && st.shells.length === 3 && st.shells.every(b => !b.off)) {
        picks++; mark(`pick_${picks}`);
        const want = ['①', '②', '③'][st.peek.answer];   // 번호는 화면 자리에 고정 → 정답 자리 번호의 버튼
        await page.evaluate((w) => {
          window.__duelPeek = null;
          [...document.querySelectorAll('#duel-shells button')].find(b => b.textContent === w)?.click();
        }, want);
        await wait(1200);                          // 열어 보여 주는 연출·다음 판 시작을 기다린다
        continue;
      }
      await wait(250);
      continue;
    }
    // 오버레이는 PHOTOMODE 로 숨겨져 있어 Playwright 클릭이 막힌다 — DOM 클릭으로 누른다
    await page.evaluate(() => {
      const btns = [...document.querySelectorAll('#duel-hands button:not([disabled])')];
      if (btns.length >= 3) btns[Math.floor(Math.random() * 3)].click();
    });
    await wait(900);
  }
  mark('duel_end');
  await wait(2500);                                // 작물 회수·결과 화면
  mark('end');
  return banner.includes('되찾았어요');             // ui.COPY.matchWin — 문구가 바뀌면 여기서 항상 false 가 된다
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
  if (SCENARIO === 'night-duel' && ANIMAL === 'raccoon') {
    // 🦝 그릇 섞기는 3판 전승(무작위로 이길 확률 1/27). 정답(start·swaps)은 모듈 안에만 있어서,
    //   **게임 코드를 고치지 않고** 녹화 때만 모듈 소스를 가로채 window.__duelPeek 로 내보낸다.
    await ctx.route('**/js/duel/index.js*', async (route) => {
      const res = await route.fetch();
      const src = await res.text();
      const needle = 'const picked = await ui.askShell(swaps, start, r.ms, cropIco, {';
      const body = src.includes(needle)
        ? src.replace(needle, 'window.__duelPeek = { start, swaps, answer: finalPos(start, swaps) };\n    ' + needle)
        : src;                                       // 못 찾으면 원본 그대로 — 못 붙은 건 nightDuel 이 잡는다
      await route.fulfill({ response: res, body });
    });
  }
  await page.goto(`http://localhost:${PORT}/?lang=ko&${QUERY}`, { waitUntil: 'load' });
  // 기동이 느릴 때가 있다 — 스킵 버튼이 6초 안에 안 떠서 인트로 도시가 찍혔었다
  await enterGame(page, { skipMs: 20000, playMs: 45000, char: CHAR });
  if (SCENARIO === 'night-duel') {
    // 밤손님 재현은 dev 훅(localhost 전용). 텃밭 3×3 에 작물을 채우고 흔적을 심은 뒤 그 곁에 선다
    await page.evaluate(() => {
      window.__space.farm[0]();
    });
    await page.waitForTimeout(2500);
    const pos = await page.evaluate((animal) => {
      window.__farmMax(3);
      window.__nightForce(animal);
      const t = window.__gs().night.traces.slice(-1)[0];
      window.__tp(t.x, t.z + 1.6);
      return [t.x, t.z];
    }, ANIMAL);
    console.log('흔적 위치', pos);
    await page.waitForTimeout(1200);
    // 텃밭 첫 입장 안내창 — 닫지 않으면 스페이스가 안내창에 먹힌다
    await page.evaluate(() => [...document.querySelectorAll('button')]
      .find(b => b.offsetParent && b.textContent.includes('알겠어요'))?.click());
    await page.waitForTimeout(600);
  }
  // HUD 숨김 — 쇼츠에 UI 가 나오면 안 된다. (캔버스만 녹화하므로 DOM 오버레이는 어차피 안 담긴다 —
  //  대결의 손 이모지는 3D 라 영상에 나온다)
  await page.addStyleTag({ content: PHOTOMODE });
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

  const recT0 = Date.now();
  if (SCENARIO === 'night-duel') {
    const won = await nightDuel(page, marks, () => recT0, ANIMAL);
    recSecs = marks.end + 0.3;
    console.log('마커(초)', JSON.stringify(marks), won ? '· 결과: 승리' : '· 결과: 패배/미확인');
    // 가위바위보는 무작위다. 광고에 지는 장면을 쓰고 싶지 않으면 --require-win 으로 다시 뜨게 한다
    if (argv.includes('--require-win') && !won) throw new Error('RETRY: 이번 판은 이기지 못했다');
  } else if (SCENARIO) {
    throw new Error(`알 수 없는 --scenario: ${SCENARIO}`);
  } else {
    await play(page, SECS * 1000);
  }

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
  '-t', String(recSecs),         // 캔버스 녹화라 앞부분(로그인·인트로)은 애초에 안 들어간다
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
if (!(sec > recSecs * 0.6)) throw new Error(`길이가 ${sec}초밖에 안 된다 — 녹화가 일찍 끊겼다`);

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
