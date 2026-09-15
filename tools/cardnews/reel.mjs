// =============================================================
//  calm forest · 🎞️ 쇼츠 조립 (클립 이어붙이기 + 자막)
//  ------------------------------------------------------------
//  node reel.mjs [--out out/reel-01/reel.mp4]
//
//  ⚠️ ffmpeg 에 drawtext 가 없다(brew 9.0.1 이 libfreetype 없이 빌드됨).
//     그래서 자막을 브라우저로 렌더해 투명 PNG 로 뽑고 overlay 로 얹는다.
//     카드뉴스(deck.mjs)가 이미 쓰는 방식이고, Pretendard·색 토큰을 그대로
//     맞출 수 있어서 오히려 낫다.
//
//  ⚠️ concat 전에 반드시 규격을 통일한다. Flow 출력은 24fps yuv420p,
//     게임 녹화는 30fps yuvj420p 다. 그대로 이으면 조용히 뭉개진다.
// =============================================================
import { chromium } from 'playwright';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, mkdir, rm, writeFile, readFile, stat } from 'node:fs/promises';
import { resolve, dirname, join, basename } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const run = promisify(execFile);
const HERE = dirname(fileURLToPath(import.meta.url));
const W = 720, H = 1280, FPS = 30;

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const OUT = arg('--out', 'out/reel-01/reel.mp4');
const MUSIC = arg('--music', 'out/music/calm.wav');   // node music.mjs 로 만든다

/** 컷 구성 — 주제·프롬프트·자막은 **사람이 decks/<이름>.json 에 쓴다**.
 *  도구는 그걸 읽어 조립만 한다(카드뉴스 deck-NN.json 과 같은 원칙).
 *  ⚠️ 문구는 사람 검수를 거친 것만 넣는다(CLAUDE.md: UI 문구 선검수).
 *
 *  --deck 없이 부르면 reel-01 을 그대로 재조립한다(기존 동작 보존). */
const DECK = arg('--deck');
const FALLBACK_CUTS = [
  { file: 'clips/01_city.mp4',   text: '퇴근하고도 계속 일 생각이 났다' },
  { file: 'clips/02_arrive.mp4', text: '그래서 숲으로 갔다' },
  { file: 'clips/03_forest.mp4', text: '여기선 아무것도 안 해도 된다' },
  { file: 'clips/04_game.mp4',   text: 'calm forest · 지금 바로 무료로' },
];

async function loadCuts() {
  if (!DECK) return FALLBACK_CUTS;
  const spec = JSON.parse(await readFile(resolve(HERE, 'decks', `${DECK}.json`), 'utf-8'));
  if (!Array.isArray(spec.cuts) || !spec.cuts.length) {
    throw new Error(`decks/${DECK}.json 에 cuts 배열이 없다`);
  }
  return spec.cuts.map((c, i) => {
    const file = c.file || `clips/${DECK}/${String(i + 1).padStart(2, '0')}.mp4`;
    if (!c.text) throw new Error(`cuts[${i}] 에 자막(text)이 없다`);
    return { file, text: c.text };
  });
}

const CUTS = await loadCuts();

/** 자막 한 줄을 투명 PNG 로. 폰트·색은 카드뉴스 토큰과 같다(templates/_base.css) */
async function renderCaption(page, text, path) {
  const esc = text.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  await page.setContent(`<!doctype html><meta charset="utf-8">
<style>
  @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css');
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:${W}px;height:${H}px;background:transparent}
  body{font-family:'Pretendard Variable',Pretendard,-apple-system,sans-serif;
       -webkit-font-smoothing:antialiased}
  /* ⚠️ 인스타 릴스는 하단 20%(약 256px)를 캡션·버튼 UI 로 덮는다.
        186px 에 뒀더니 실제 앱에서 가려졌다 — 안전 영역 위로 올린다. */
  .scrim{position:absolute;left:0;right:0;bottom:300px;height:210px;
         background:linear-gradient(to bottom,
           rgba(10,14,12,0) 0%, rgba(10,14,12,.42) 42%, rgba(10,14,12,.42) 58%, rgba(10,14,12,0) 100%)}
  .wrap{position:absolute;left:0;right:0;bottom:360px;padding:0 56px;text-align:center}
  .t{color:#fdf6ea;font-size:48px;font-weight:800;line-height:1.3;
     letter-spacing:-.035em;
     /* 밝은 숲 컷에서도 읽히도록 그림자를 두 겹 준다 */
     text-shadow:0 2px 18px rgba(10,14,12,.85), 0 0 42px rgba(10,14,12,.6)}
</style>
<div class="scrim"></div><div class="wrap"><div class="t">${esc}</div></div>`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(250);                    // 웹폰트가 실제로 그려질 때까지
  await page.screenshot({ path, omitBackground: true });
}

/** 원본에 실제로 들리는 오디오가 있는가.
 *  트랙이 있어도 내용이 무음(anullsrc)인 경우가 있어 레벨까지 본다. */
async function srcAudioLevel(file) {
  const { stderr } = await run('ffmpeg',
    ['-hide_banner', '-i', file, '-af', 'volumedetect', '-f', 'null', '-'])
    .catch(e => ({ stderr: e.stderr || '' }));
  const m = stderr.match(/mean_volume:\s*(-?[\d.]+) dB/);
  if (!m) return false;                 // 오디오 트랙 자체가 없다
  return Number(m[1]) > -80;            // -91dB 는 완전 무음이다
}

/** PNG 의 불투명 픽셀 수. 자막이 실제로 그려졌는지 판정하는 데 쓴다 */
async function opaquePixels(page, file) {
  const url = `data:image/png;base64,${(await readFile(file)).toString('base64')}`;
  return page.evaluate(async (u) => {
    const img = new Image(); img.src = u; await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let k = 3; k < d.length; k += 4) if (d[k] > 40) n++;
    return n;
  }, url);
}

const tmp = await mkdtemp(join(tmpdir(), 'cf-reel-'));
try {
  // ── 자막 PNG ─────────────────────────────────────────────
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H },
                                       deviceScaleFactor: 1 });
  const caps = [];
  for (let i = 0; i < CUTS.length; i++) {
    const p = join(tmp, `cap${i}.png`);
    await renderCaption(page, CUTS[i].text, p);
    // 웹폰트가 안 뜨거나 렌더가 어긋나면 완전 투명 PNG 가 나온다.
    // 그대로 얹으면 자막 없는 영상이 조용히 완성된다 — 여기서 잡는다.
    const ink = await opaquePixels(page, p);
    if (ink < 500) throw new Error(`자막 "${CUTS[i].text}" 이 안 그려졌다 (불투명 픽셀 ${ink}개)`);
    caps.push(p);
  }
  await browser.close();

  // ── 컷마다 규격 통일 + 자막 얹기 ──────────────────────────
  const parts = [];
  for (let i = 0; i < CUTS.length; i++) {
    const src = resolve(HERE, CUTS[i].file);
    const dst = join(tmp, `part${i}.mp4`);
    const { stdout: d } = await run('ffprobe',
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', src]);
    const dur = Number(d.trim());

    // Veo 는 환경음을 같이 생성한다(도시 소음·바람·새소리). 그걸 무음으로 덮어쓰면
    // 30초 내내 아무 소리도 안 나는 영상이 된다 — 실제로 한 번 그렇게 내보냈다.
    // 소리가 실제로 담긴 트랙만 쓰고, 무음이면 무음 소스로 대체한다.
    const hasAudio = await srcAudioLevel(src);
    // 자막은 0.4초에 떠서 끝 0.9초 전에 사라진다 — 컷 전환에 걸치면 지저분하다
    const fadeOut = Math.max(0.6, dur - 0.9);
    await run('ffmpeg', [
      '-y', '-v', 'error',
      '-i', src,
      // ⚠️ PNG 는 -loop 1 없이 넣으면 프레임이 한 장뿐이다. 그 한 장이 t=0 에
      //    도착하는데 페이드인은 0.4초부터라 알파 0(투명)으로 고정되고, 그
      //    투명한 프레임이 끝까지 반복된다 — 자막이 통째로 사라진다(실제로 당했다).
      '-loop', '1', '-framerate', String(FPS), '-t', dur.toFixed(2), '-i', caps[i],
      '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000',
      '-filter_complex',
      `[0:v]scale=${W}:${H}:force_original_aspect_ratio=decrease,` +
      `pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2,fps=${FPS},format=yuv420p[v];` +
      `[1:v]format=rgba,fade=t=in:st=0.4:d=0.5:alpha=1,` +
      `fade=t=out:st=${fadeOut.toFixed(2)}:d=0.5:alpha=1[c];` +
      `[v][c]overlay=0:0:format=auto[vo]`,
      // 원본에 소리가 있으면 그걸 쓰고 SNS 기준으로 라우드니스를 맞춘다.
      // Veo 환경음은 평균 −35dB 로 아주 작아서 그대로 두면 안 들린다.
      '-map', '[vo]', '-map', hasAudio ? '0:a' : '2:a', '-shortest',
      '-af', hasAudio ? 'loudnorm=I=-16:TP=-1.5:LRA=11' : 'anull',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '20',
      '-c:a', 'aac', '-b:a', '128k', '-ar', '48000', '-ac', '2',
      dst,
    ]);
    parts.push(dst);
    console.log(`  컷 ${i + 1}/${CUTS.length} · ${dur.toFixed(1)}초 · ${CUTS[i].text}`);
  }

  // ── 이어붙이기 ───────────────────────────────────────────
  const list = join(tmp, 'list.txt');
  await writeFile(list, parts.map(p => `file '${p}'`).join('\n'));
  const joined = join(tmp, 'joined.mp4');
  await run('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0',
                       '-i', list, '-c', 'copy', joined]);

  // ── 배경음악 믹스 ─────────────────────────────────────────
  //  music.mjs 가 만든 자체 제작곡. 환경음을 덮지 않게 낮춰 깔고,
  //  영상보다 짧으면 반복(-stream_loop)하고 길면 잘라 맞춘다.
  const out = resolve(HERE, OUT);
  await mkdir(dirname(out), { recursive: true });
  const music = resolve(HERE, MUSIC);
  const hasMusic = await stat(music).then(() => true).catch(() => false);
  if (!hasMusic) {
    console.warn(`⚠️ 배경음악이 없다: ${MUSIC} → node music.mjs 로 먼저 만들 것`);
    await run('ffmpeg', ['-y', '-v', 'error', '-i', joined, '-c', 'copy', out]);
  } else {
    const { stdout: jd } = await run('ffprobe',
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', joined]);
    const total = Number(jd.trim());
    await run('ffmpeg', [
      '-y', '-v', 'error',
      '-i', joined,
      '-stream_loop', '-1', '-i', music,
      '-filter_complex',
      // ⚠️ volume 계수로 깔면 안 된다. 원곡이 −37dB 라 0.4 를 곱하면 −47dB —
      //    섞였는데 안 들린다(실제로 그렇게 내보냈다). 절대 라우드니스로 맞춘다.
      //    환경음이 −16~−20dB 이므로 음악은 그 아래인 −26 LUFS 로 깐다.
      `[1:a]loudnorm=I=-26:TP=-6:LRA=11,afade=t=in:st=0:d=1.5,` +
      `afade=t=out:st=${Math.max(0, total - 2.5).toFixed(2)}:d=2.5[m];` +
      `[0:a][m]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[a]`,
      '-map', '0:v', '-map', '[a]', '-shortest',
      '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-ac', '2',
      out,
    ]);
  }

  const { stdout: total } = await run('ffprobe',
    ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', out]);
  const sec = Number(total.trim());
  // 컷이 하나라도 빠지면 길이로 드러난다 — 조용히 짧은 영상을 내보내지 않는다
  if (sec < 20) throw new Error(`합친 길이가 ${sec.toFixed(1)}초다 — 컷이 빠졌다`);

  // 마지막 컷은 게임 녹화라 환경음이 없다 — 거기서 소리가 나면 음악이 깔렸다는 뜻이다.
  // "섞였는데 −47dB 라 안 들림" 을 한 번 내보낸 적이 있어 레벨까지 본다.
  if (hasMusic) {
    const { stderr: te } = await run('ffmpeg',
      ['-hide_banner', '-ss', String(Math.max(0, sec - 4)), '-t', '3',
       '-i', out, '-af', 'volumedetect', '-f', 'null', '-'])
      .catch(e => ({ stderr: e.stderr || '' }));
    const tail = Number((te.match(/mean_volume:\s*(-?[\d.]+) dB/) || [])[1]);
    if (!(tail > -40)) {
      throw new Error(`끝부분이 ${tail}dB 다 — 음악이 안 들린다(섞였어도 레벨이 너무 낮다)`);
    }
    console.log(`  음악 확인 · 끝부분 ${tail.toFixed(1)} dB`);
  }

  // 완성본이 통째로 무음인 채 나간 적이 있다(원본 환경음을 anullsrc 로 덮어씀)
  const loud = await srcAudioLevel(out);
  console.log(`✅ ${basename(out)} — ${(await stat(out)).size.toLocaleString()} bytes · ` +
              `${sec.toFixed(1)}초 · 소리 ${loud ? '있음' : '없음(무음)'}`);
  if (!loud) console.warn('⚠️ 완성본이 무음이다 — 원본 클립의 오디오를 확인할 것');
} finally {
  await rm(tmp, { recursive: true, force: true });
}
