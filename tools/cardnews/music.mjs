// =============================================================
//  calm forest · 🎹 쇼츠 배경음악 (자체 제작, 저작권 free)
//  ------------------------------------------------------------
//  node music.mjs [--secs 32] [--out out/music/calm.wav]
//
//  왜 직접 만드나:
//    클래식은 **곡**의 저작권이 풀렸어도 **연주 녹음**은 따로 보호된다.
//    남의 음원을 가져오면 결국 같은 문제가 생긴다. 곡도 연주도 우리가
//    만들면 그 문제가 통째로 사라진다.
//
//  왜 이 방식인가:
//    js/sound.js 가 이미 오실레이터로 게임 BGM 을 합성한다(외부 파일 0).
//    같은 수법을 쓰되, 게임 테마(138BPM 경쾌한 마을)와 달리 느린 피아노로
//    간다 — 30초 영상의 톤이 차분해서 마을 테마를 얹으면 따로 논다.
//
//  곡: 원곡이다. Am–F–C–G 순환은 누구나 쓰는 화성 진행이고,
//      멜로디는 여기서 새로 썼다.
// =============================================================
import { chromium } from 'playwright';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, writeFile, stat } from 'node:fs/promises';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const run = promisify(execFile);
const HERE = dirname(fileURLToPath(import.meta.url));

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const SECS = Number(arg('--secs', '32'));
const OUT = arg('--out', 'out/music/calm.wav');

/** OfflineAudioContext 로 한 번에 렌더한다 — 실시간 녹음이 아니라 결정적이다 */
const SCORE = `
const SR = 48000, DUR = ${SECS};
const ctx = new OfflineAudioContext(2, SR * DUR, SR);

// 마스터 — 살짝 눌러서 영상 환경음 위에 깔리게
const master = ctx.createGain();
master.gain.value = 0.34;
// 공간감: 짧은 딜레이를 섞어 피아노가 방 안에 있는 느낌
const dry = ctx.createGain(); dry.gain.value = 0.82;
const wet = ctx.createGain(); wet.gain.value = 0.26;
const dl = ctx.createDelay(1.0); dl.delayTime.value = 0.26;
const fb = ctx.createGain(); fb.gain.value = 0.28;
const damp = ctx.createBiquadFilter(); damp.type = 'lowpass'; damp.frequency.value = 2200;
dl.connect(fb); fb.connect(damp); damp.connect(dl);
dl.connect(wet);
dry.connect(master); wet.connect(master); master.connect(ctx.destination);

/** 피아노 비슷한 한 음: 빠른 어택 + 긴 감쇠 + 배음 둘 */
function note(freq, at, dur, vol) {
  for (const [mul, amp, type] of [[1, 1, 'triangle'], [2, 0.26, 'sine'], [3, 0.09, 'sine']]) {
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = type; o.frequency.value = freq * mul;
    const v = vol * amp;
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(v, at + 0.012);        // 어택
    g.gain.exponentialRampToValueAtTime(v * 0.30, at + 0.35);  // 초기 감쇠
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);     // 꼬리
    o.connect(g); g.connect(dry); g.connect(dl);
    o.start(at); o.stop(at + dur + 0.05);
  }
}

// ── 화성: Am – F – C – G ──────────────────────────────────
const A2=110.00, C3=130.81, F2=87.31, G2=98.00,
      A3=220.00, C4=261.63, E4=329.63, F3=174.61, G3=196.00, B3=246.94, D4=293.66;
const CHORDS = [
  { bass: A2, arp: [A3, C4, E4] },      // Am
  { bass: F2, arp: [F3, A3, C4] },      // F
  { bass: C3, arp: [C4, E4, G3 * 2] },  // C
  { bass: G2, arp: [G3, B3, D4] },      // G
];

// 멜로디(원곡) — [주파수, 시작 박, 길이(박)]
const A4=440.00, C5=523.25, D5=587.33, E5=659.25, G4=392.00, F4=349.23;
const MELODY = [
  [[E5,0,1.5],[C5,1.5,0.5],[D5,2,2]],          // 1 Am
  [[C5,0,1],[A4,1,1],[C5,2,2]],                // 2 F
  [[E5,0,1.5],[G4,1.5,0.5],[A4,2,2]],          // 3 C
  [[D5,0,1],[C5,1,1],[A4,2,2]],                // 4 G
  [[E5,0,1.5],[F4,1.5,0.5],[G4,2,2]],          // 5 Am
  [[A4,0,1],[C5,1,1],[E5,2,2]],                // 6 F
  [[G4,0,1.5],[E5,1.5,0.5],[D5,2,2]],          // 7 C
  [[C5,0,2],[A4,2,2]],                         // 8 G
];

const BPM = 64;                 // 느리게 — 차분한 톤
const BEAT = 60 / BPM;
const BAR = BEAT * 4;

for (let bar = 0; bar * BAR < DUR; bar++) {
  const t0 = bar * BAR;
  const ch = CHORDS[bar % 4];
  const mel = MELODY[bar % 8];

  note(ch.bass, t0, BAR * 1.6, 0.20);                       // 베이스는 길게 눕힌다
  const seq = [...ch.arp, ch.arp[1]];                        // 아르페지오(8분음표)
  for (let i = 0; i < 8; i++) {
    const at = t0 + i * (BEAT / 2);
    if (at >= DUR) break;
    note(seq[i % seq.length], at, 1.5, 0.085);
  }
  for (const [f, b, len] of mel) {
    const at = t0 + b * BEAT;
    if (at >= DUR) break;
    note(f, at, len * BEAT + 0.8, 0.135);
  }
}

// 끝 3초 페이드아웃 — 영상 끝에서 뚝 끊기면 싸구려로 들린다
master.gain.setValueAtTime(0.34, Math.max(0, DUR - 3));
master.gain.linearRampToValueAtTime(0.0001, DUR);

const buf = await ctx.startRendering();

// WAV(16bit PCM)로 직렬화 — ffmpeg 이 바로 읽는다
const n = buf.length, chs = buf.numberOfChannels;
const bytes = 44 + n * chs * 2;
const ab = new ArrayBuffer(bytes); const dv = new DataView(ab);
const wr = (o, s) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); };
wr(0, 'RIFF'); dv.setUint32(4, bytes - 8, true); wr(8, 'WAVE');
wr(12, 'fmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true);
dv.setUint16(22, chs, true); dv.setUint32(24, SR, true);
dv.setUint32(28, SR * chs * 2, true); dv.setUint16(32, chs * 2, true); dv.setUint16(34, 16, true);
wr(36, 'data'); dv.setUint32(40, n * chs * 2, true);
let off = 44;
const data = [buf.getChannelData(0), buf.getChannelData(1)];
for (let i = 0; i < n; i++) {
  for (let c = 0; c < chs; c++) {
    const s = Math.max(-1, Math.min(1, data[c][i]));
    dv.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true); off += 2;
  }
}
let bin = ''; const u8 = new Uint8Array(ab);
for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
return btoa(bin);
`;

const browser = await chromium.launch();
const page = await browser.newPage();
const b64 = await page.evaluate(`(async () => { ${SCORE} })()`);
await browser.close();

const dst = resolve(HERE, OUT);
await mkdir(dirname(dst), { recursive: true });
await writeFile(dst, Buffer.from(b64, 'base64'));

// 진짜 소리가 담겼는지 본다 — 무음 WAV 를 내보내고 모르면 곤란하다
const { stderr } = await run('ffmpeg',
  ['-hide_banner', '-i', dst, '-af', 'volumedetect', '-f', 'null', '-'])
  .catch(e => ({ stderr: e.stderr || '' }));
const mean = Number((stderr.match(/mean_volume:\s*(-?[\d.]+) dB/) || [])[1]);
if (!(mean > -50)) throw new Error(`렌더 결과가 무음이다 (mean ${mean} dB)`);
console.log(`✅ ${basename(dst)} — ${(await stat(dst)).size.toLocaleString()} bytes · ` +
            `${SECS}초 · mean ${mean.toFixed(1)} dB`);
