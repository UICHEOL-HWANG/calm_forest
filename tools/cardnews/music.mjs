// =============================================================
//  calm forest · 🎹 쇼츠 배경음악 (자체 제작, 저작권 free)
//  ------------------------------------------------------------
//  node music.mjs [--style piano|lofi|night] [--secs 32] [--out out/music/calm.wav]
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
/** --style piano(기본, 느린 피아노) | lofi(로파이 하우스 105BPM, 모던한 플레이 영상용) | night(밤손님 릴스 전용, --secs 31) */
const STYLE = arg('--style', 'piano');
const DEFAULT_OUT = { piano: 'out/music/calm.wav', lofi: 'out/music/lofi.wav', night: 'out/music/night.wav' };
if (!DEFAULT_OUT[STYLE]) throw new Error(`--style 은 ${Object.keys(DEFAULT_OUT).join('|')} 중 하나: ${STYLE}`);
const OUT = arg('--out', DEFAULT_OUT[STYLE]);

/** OfflineAudioContext 로 한 번에 렌더한다 — 실시간 녹음이 아니라 결정적이다 */
const HEAD = `
const SR = 48000, DUR = ${SECS};
const ctx = new OfflineAudioContext(2, SR * DUR, SR);
`;

const PIANO = `
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
`;

/** 로파이 하우스 — 4박 킥에 맞춰 건반이 눌렸다 올라오는(사이드체인) 출렁임이 핵심.
 *  0~2마디는 먹먹한 코드만(오프닝 자막 자리), 3마디부터 드럼, 7마디부터 벨 훅.
 *  노이즈(하이햇·지글거림)도 시드 고정 난수라 매번 같은 파일이 나온다. */
const LOFI = `
const BPM = 105, BEAT = 60 / BPM, BAR = BEAT * 4;
let seed = 7;
const rand = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

const master = ctx.createGain(); master.gain.value = 0.9;
const glue = ctx.createDynamicsCompressor();
glue.threshold.value = -14; glue.ratio.value = 3; glue.attack.value = 0.01; glue.release.value = 0.2;
master.connect(glue); glue.connect(ctx.destination);

// 음악 버스: 킥마다 눌리는 duck + 인트로에서 열리는 로우패스
const duck = ctx.createGain(); duck.gain.value = 1;
const warm = ctx.createBiquadFilter(); warm.type = 'lowpass'; warm.Q.value = 0.7;
duck.connect(warm); warm.connect(master);
const drums = ctx.createGain(); drums.connect(master);

const dl = ctx.createDelay(1); dl.delayTime.value = BEAT * 0.75;
const fb = ctx.createGain(); fb.gain.value = 0.25;
const wet = ctx.createGain(); wet.gain.value = 0.22;
const damp = ctx.createBiquadFilter(); damp.type = 'lowpass'; damp.frequency.value = 2500;
dl.connect(fb); fb.connect(damp); damp.connect(dl); dl.connect(wet); wet.connect(duck);

const noiseBuf = ctx.createBuffer(1, SR, SR);
{ const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = rand() * 2 - 1; }

const hz = m => 440 * Math.pow(2, (m - 69) / 12);

/** 일렉 피아노: 살짝 어긋난 사인 둘 + 종소리 배음 */
function keys(m, at, dur, vol) {
  for (const [mul, amp, det] of [[1, 1, -4], [1, 0.8, 4], [2, 0.18, 0], [4, 0.05, 0]]) {
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = hz(m) * mul; o.detune.value = det;
    const v = vol * amp;
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(v, at + 0.008);
    g.gain.exponentialRampToValueAtTime(v * 0.45, at + 0.25);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g); g.connect(duck); g.connect(dl);
    o.start(at); o.stop(at + dur + 0.05);
  }
}
function bass(m, at, dur, vol) {
  const o = ctx.createOscillator(); const g = ctx.createGain(); const f = ctx.createBiquadFilter();
  o.type = 'triangle'; o.frequency.value = hz(m);
  f.type = 'lowpass'; f.frequency.value = 420;
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(vol, at + 0.01);
  g.gain.setValueAtTime(vol, at + dur * 0.7);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(f); f.connect(g); g.connect(duck);
  o.start(at); o.stop(at + dur + 0.05);
}
function bell(m, at, vol) {
  for (const [mul, amp] of [[1, 1], [3, 0.12]]) {
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = hz(m) * mul;
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(vol * amp, at + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.9);
    o.connect(g); g.connect(duck); g.connect(dl);
    o.start(at); o.stop(at + 1);
  }
}
function kick(at) {
  const o = ctx.createOscillator(); const g = ctx.createGain();
  o.frequency.setValueAtTime(140, at); o.frequency.exponentialRampToValueAtTime(42, at + 0.12);
  g.gain.setValueAtTime(0.9, at); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.38);
  o.connect(g); g.connect(drums); o.start(at); o.stop(at + 0.4);
  duck.gain.setValueAtTime(0.45, at);                       // 사이드체인
  duck.gain.linearRampToValueAtTime(1, at + BEAT * 0.55);
}
function noise(at, dur, vol, type, freq, q) {
  const s = ctx.createBufferSource(); s.buffer = noiseBuf;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q || 0.7;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, at); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  s.connect(f); f.connect(g); g.connect(drums);
  s.start(at, rand() * 0.5); s.stop(at + dur + 0.02);
}
const hat = at => noise(at, 0.05, 0.16, 'highpass', 8000);
const shaker = at => noise(at, 0.03, 0.05, 'highpass', 11000);
const clap = at => { for (const d of [0, 0.012, 0.024]) noise(at + d, 0.14, 0.22, 'bandpass', 1400, 1.2); };

// ── 화성: Fmaj7 – Em7 – Dm7 – Cmaj9 (MIDI 보이싱) ──────────
const CH = [
  { root: 41, v: [57, 60, 64, 69] },
  { root: 40, v: [55, 59, 62, 67] },
  { root: 38, v: [53, 57, 60, 65] },
  { root: 36, v: [55, 59, 62, 64] },
];
// 벨 훅(원곡) — [박, MIDI]
const HOOK = [
  [[0, 81], [0.75, 79], [1.5, 76], [2.5, 72], [3, 74]],
  [[0.5, 76], [1.5, 74], [2, 71], [3, 72]],
  [[0, 77], [0.75, 76], [1.5, 72], [2.5, 69], [3, 72]],
  [[0.5, 74], [1, 76], [2, 79], [3.5, 76]],
];

const BARS = Math.ceil(DUR / BAR);
warm.frequency.setValueAtTime(700, 0);
warm.frequency.exponentialRampToValueAtTime(5200, BAR * 2);

for (let b = 0; b < BARS; b++) {
  const t0 = b * BAR, ch = CH[b % 4];
  const drumsOn = b >= 2, hookOn = b >= 6 && b < BARS - 1;
  for (const [beat, len] of [[0, 1.2], [1.5, 0.9], [3.5, 0.8]]) {   // 하우스 싱코페이션
    const at = t0 + beat * BEAT; if (at >= DUR) break;
    for (const m of ch.v) keys(m, at, len * BEAT + 0.4, 0.045);
  }
  if (drumsOn) {
    for (const [beat, oct] of [[0.5, 0], [1.5, 0], [2.5, 12], [3.5, 0]]) {   // 엇박 베이스
      const at = t0 + beat * BEAT; if (at < DUR) bass(ch.root + oct, at, BEAT * 0.45, 0.32);
    }
    for (let i = 0; i < 4; i++) {
      const at = t0 + i * BEAT; if (at >= DUR) break;
      kick(at);
      hat(at + BEAT / 2);
      shaker(at + BEAT / 4); shaker(at + BEAT * 0.75);
      if (i === 1 || i === 3) clap(at);
    }
  } else {
    bass(ch.root, t0, BAR * 0.95, 0.22);
  }
  if (hookOn) for (const [beat, m] of HOOK[b % 4]) {
    const at = t0 + beat * BEAT; if (at < DUR) bell(m, at, 0.07);
  }
}

// LP 지글거림
for (let t = 0; t < DUR; t += 0.03 + rand() * 0.12) noise(t, 0.004, 0.02 + rand() * 0.03, 'highpass', 3000);
`;


/** 🌙 밤손님 — 컷 박자에 맞춘 "미스터리 → 대결 → 승리 → 반전 → 내기 → 전승" 곡 (105BPM, 54박 ≈ 30.9초).
 *  tools/reel-motion/src/nightTimeline.ts 의 컷 길이(박)와 1:1 로 맞춰 있다 — 컷이 바뀌면 여기도 바꾼다.
 *   0~6 훅(드론·심장박동·라이저) · 6~10 범인은? · 10~22 그루브 드롭 · 22~26 승리(메이저)
 *   26~29 반전(음악 정지→글라이드) · 29~37 내기(마림바) · 37~43 빌드업 · 43~47 전승 · 47~54 엔드
 *  음악은 인트로 오프셋 없이 0초부터 쓴다(--secs 31). 노이즈는 시드 고정이라 매번 같은 파일이 나온다. */
const NIGHT = `
const BPM = 105, BEAT = 60 / BPM;
const T = b => b * BEAT;
let seed = 11;
const rand = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const hz = m => 440 * Math.pow(2, (m - 69) / 12);

const master = ctx.createGain(); master.gain.value = 0.8;   // 0.9 는 전승 드롭에서 클리핑(250샘플)
const glue = ctx.createDynamicsCompressor();
glue.threshold.value = -14; glue.ratio.value = 3; glue.attack.value = 0.01; glue.release.value = 0.2;
// 리미터 — 전승 드롭(크래시+쾅+킥+스탭)이 겹쳐도 0dBFS 를 넘지 않게
const lim = ctx.createDynamicsCompressor();
lim.threshold.value = -4; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.001; lim.release.value = 0.12;
master.connect(glue); glue.connect(lim); lim.connect(ctx.destination);

const mix = ctx.createGain(); mix.connect(master);      // 반전 구간에서 음악만 끊는 게이트
const fx = ctx.createGain(); fx.connect(master);        // 게이트 밖 — 반전 효과음
const duck = ctx.createGain(); duck.gain.value = 1;     // 킥마다 눌리는 음악 버스
const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.7;
duck.connect(lp); lp.connect(mix);
const drums = ctx.createGain(); drums.connect(mix);

const dl = ctx.createDelay(1); dl.delayTime.value = BEAT * 0.75;
const fb = ctx.createGain(); fb.gain.value = 0.28;
const wet = ctx.createGain(); wet.gain.value = 0.2;
const damp = ctx.createBiquadFilter(); damp.type = 'lowpass'; damp.frequency.value = 2600;
dl.connect(fb); fb.connect(damp); damp.connect(dl); dl.connect(wet); wet.connect(duck);

const noiseBuf = ctx.createBuffer(1, SR, SR);
{ const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = rand() * 2 - 1; }

// ── 악기 ─────────────────────────────────────────────
function pluck(m, at, dur, vol, cut) {                  // 톱니+사각 플럭 — 필터가 닫히며 "뿅"
  cut = cut || 2200;
  const f = ctx.createBiquadFilter(), g = ctx.createGain();
  f.type = 'lowpass'; f.Q.value = 4;
  f.frequency.setValueAtTime(cut, at); f.frequency.exponentialRampToValueAtTime(cut * 0.18, at + dur);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(vol, at + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  for (const [type, mul] of [['sawtooth', 1], ['square', 1.004]]) {
    const o = ctx.createOscillator(); o.type = type; o.frequency.value = hz(m) * mul;
    o.connect(f); o.start(at); o.stop(at + dur + 0.05);
  }
  f.connect(g); g.connect(duck); g.connect(dl);
}
function sub(m, at, dur, vol) {
  const o = ctx.createOscillator(), o2 = ctx.createOscillator();
  const f = ctx.createBiquadFilter(), g = ctx.createGain();
  o.type = 'triangle'; o2.type = 'sine'; o.frequency.value = hz(m); o2.frequency.value = hz(m);
  f.type = 'lowpass'; f.frequency.value = 520;
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(vol, at + 0.012);
  g.gain.setValueAtTime(vol, at + dur * 0.65);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(f); o2.connect(f); f.connect(g); g.connect(duck);
  o.start(at); o2.start(at); o.stop(at + dur + 0.05); o2.stop(at + dur + 0.05);
}
function stab(ms, at, dur, vol) {                       // 코드 스탭 — 짧게 치고 빠지는 톱니
  const f = ctx.createBiquadFilter(), g = ctx.createGain();
  f.type = 'lowpass'; f.Q.value = 1.5;
  f.frequency.setValueAtTime(3200, at); f.frequency.exponentialRampToValueAtTime(700, at + dur);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(vol, at + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  for (const m of ms) for (const det of [-6, 6]) {
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(m); o.detune.value = det;
    o.connect(f); o.start(at); o.stop(at + dur + 0.05);
  }
  f.connect(g); g.connect(duck); g.connect(dl);
}
function pad(ms, at, dur, vol) {                        // 어두운 드론 — 천천히 열리고 천천히 닫힌다
  const f = ctx.createBiquadFilter(), g = ctx.createGain();
  f.type = 'lowpass'; f.frequency.value = 900;
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(vol, at + Math.min(0.8, dur * 0.4));
  g.gain.setValueAtTime(vol, at + dur * 0.75);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  for (const m of ms) for (const det of [-8, 8]) {
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(m); o.detune.value = det;
    o.connect(f); o.start(at); o.stop(at + dur + 0.05);
  }
  f.connect(g); g.connect(duck);
}
function bell(m, at, vol) {
  for (const [mul, amp] of [[1, 1], [3, 0.12], [5.4, 0.05]]) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = hz(m) * mul;
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(vol * amp, at + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 1.0);
    o.connect(g); g.connect(duck); g.connect(dl);
    o.start(at); o.stop(at + 1.05);
  }
}

// ── 드럼·효과 ────────────────────────────────────────
function kick(at, vol) {
  vol = vol || 0.9;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.frequency.setValueAtTime(140, at); o.frequency.exponentialRampToValueAtTime(42, at + 0.12);
  g.gain.setValueAtTime(vol, at); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.38);
  o.connect(g); g.connect(drums); o.start(at); o.stop(at + 0.4);
  duck.gain.setValueAtTime(0.5, at);
  duck.gain.linearRampToValueAtTime(1, at + BEAT * 0.5);
}
function thump(at, vol, bus) {                          // 심장 박동 — 킥보다 느리고 낮다
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.frequency.setValueAtTime(78, at); o.frequency.exponentialRampToValueAtTime(38, at + 0.2);
  g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(vol, at + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.38);
  o.connect(g); g.connect(bus || drums); o.start(at); o.stop(at + 0.42);
}
function noise(at, dur, vol, type, freq, q, bus) {
  const s = ctx.createBufferSource(); s.buffer = noiseBuf;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q || 0.7;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, at); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  s.connect(f); f.connect(g); g.connect(bus || drums);
  s.start(at, rand() * 0.5); s.stop(at + dur + 0.02);
}
const hat = (at, vol) => noise(at, 0.05, vol || 0.14, 'highpass', 8000);
const shaker = (at, vol) => noise(at, 0.03, vol || 0.05, 'highpass', 11000);
const clap = at => { for (const d of [0, 0.012, 0.024]) noise(at + d, 0.14, 0.22, 'bandpass', 1400, 1.2); };
function snare(at, vol) {
  noise(at, 0.14, vol || 0.2, 'bandpass', 1900, 0.8);
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'triangle'; o.frequency.setValueAtTime(220, at); o.frequency.exponentialRampToValueAtTime(150, at + 0.09);
  g.gain.setValueAtTime((vol || 0.2) * 0.9, at); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.1);
  o.connect(g); g.connect(drums); o.start(at); o.stop(at + 0.12);
}
function tick(at, vol) {                                // 시계 소리
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'sine'; o.frequency.value = 2100;
  g.gain.setValueAtTime(vol || 0.1, at); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.035);
  o.connect(g); g.connect(drums); o.start(at); o.stop(at + 0.05);
}
const crash = (at, vol) => noise(at, 1.4, vol || 0.2, 'highpass', 5200);
function boom(at) {                                     // 드롭 직전 "쾅"
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.frequency.setValueAtTime(120, at); o.frequency.exponentialRampToValueAtTime(32, at + 0.7);
  g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(0.7, at + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.9);
  o.connect(g); g.connect(drums); o.start(at); o.stop(at + 0.95);
}
function riser(at, dur, vol) {                          // 노이즈가 차오르는 라이저
  const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.5;
  f.frequency.setValueAtTime(300, at); f.frequency.exponentialRampToValueAtTime(9000, at + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(vol, at + dur * 0.98);
  g.gain.linearRampToValueAtTime(0.0001, at + dur + 0.02);
  s.connect(f); f.connect(g); g.connect(drums);
  s.start(at); s.stop(at + dur + 0.05);
}
function glide(at, dur) {                               // 반전 — 아래로 꺼지는 "뾰오옹"
  const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(700, at); o.frequency.exponentialRampToValueAtTime(70, at + dur);
  f.type = 'lowpass'; f.frequency.value = 1800;
  g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(0.22, at + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(f); f.connect(g); g.connect(fx); o.start(at); o.stop(at + dur + 0.05);
}

// 필터: 훅에서 서서히 열리고, 빌드업(37~43박)에서 한 번 더 열린다
lp.frequency.setValueAtTime(500, 0);
lp.frequency.exponentialRampToValueAtTime(3000, T(6));
lp.frequency.setValueAtTime(6500, T(6));
lp.frequency.setValueAtTime(900, T(37));
lp.frequency.exponentialRampToValueAtTime(9000, T(43));
lp.frequency.setValueAtTime(8000, T(43));

// ① 훅 0~6 — 낮은 드론, 심장 박동, 째깍, 라이저 → 쾅
pad([45, 52, 57], T(0), T(6), 0.05);
for (const b of [0, 0.4, 2, 2.4, 4, 4.4, 5, 5.4]) thump(T(b), b % 1 ? 0.5 : 0.8);
for (let b = 2; b < 6; b += (b < 4 ? 1 : 0.5)) tick(T(b), 0.1);
riser(T(3), T(3), 0.2);
boom(T(6)); crash(T(6), 0.3);

// ② 범인은? 6~10 — 탐정 스타카토
pad([45, 52, 57], T(6), T(4), 0.04);
for (const [o, m] of [[0, 57], [0.75, 57], [1.5, 60], [2, 57], [3, 56]]) pluck(m, T(6 + o), BEAT * 0.4, 0.12, 1500);
for (let b = 6; b < 10; b += 0.5) hat(T(b), 0.07);
kick(T(6), 0.6); kick(T(8), 0.6);
snare(T(9.5), 0.12); snare(T(9.75), 0.16);
riser(T(8), T(2), 0.18);

// ③④ 찾았다!·승부! 10~22 — 드롭. 16박부터 리드가 들어오고 20박부터 스네어 롤
crash(T(10), 0.3); crash(T(16), 0.16);
const CD = [
  { r: 33, th: 3, st: [57, 60, 64] },   // Am
  { r: 29, th: 4, st: [53, 57, 60] },   // F
  { r: 28, th: 4, st: [52, 56, 59] },   // E — 22박 승리(C)로 풀리기 직전의 긴장
];
const LEAD = [
  [[0, 69], [0.5, 72], [1, 76], [1.75, 74], [2.5, 72], [3, 71]],
  [[0, 72], [0.75, 71], [1.5, 69], [2.5, 68], [3, 71]],
];
for (let s = 10, k = 0; s < 22; s += 4, k++) {
  const c = CD[k];
  for (const [o, m] of [[0, 0], [0.75, 0], [1.5, c.th], [2.5, 0], [3, 7]]) sub(c.r + m, T(s + o), BEAT * 0.4, 0.38);
  for (const o of [0, 1.5, 2.5]) if (s + o < 22) kick(T(s + o), 0.9);
  for (const o of [1, 3]) if (s + o < 22) { snare(T(s + o), 0.2); clap(T(s + o)); }
  for (const o of [0.5, 1.5, 2.5, 3.5]) if (s + o < 22) hat(T(s + o));
  if (s >= 14) for (const o of [0.25, 0.75, 1.25, 1.75, 2.25, 2.75, 3.25, 3.75]) if (s + o >= 16 && s + o < 22) shaker(T(s + o), 0.06);
  for (const o of [1.5, 3.25]) if (s + o < 22) stab(c.st, T(s + o), BEAT * 0.35, 0.05);
  if (k >= 1) for (const [o, m] of LEAD[k - 1]) { const t = s + o; if (t >= 16 && t < 22) pluck(m, T(t), BEAT * 0.38, 0.1, 3200); }
}
riser(T(19), T(3), 0.22);
for (let b = 20; b < 22; b += 0.25) snare(T(b), 0.05 + (b - 20) * 0.07);

// ⑤ 지켰다! 22~26 — 메이저로 밝아진다
crash(T(22), 0.4);
pad([48, 52, 55, 59], T(22), T(4), 0.045);
for (const [o, m] of [[0, 72], [0.5, 76], [1, 79], [1.5, 84], [2, 79], [2.5, 76], [3, 79], [3.5, 84]]) bell(m, T(22 + o), 0.09);
for (let b = 22; b < 26; b++) { kick(T(b), 0.85); if (b % 2 === 1) clap(T(b)); hat(T(b + 0.5), 0.12); }
for (const o of [0, 1.5, 2.5]) stab([60, 64, 67, 71], T(22 + o), BEAT * 0.4, 0.06);
sub(36, T(22), BEAT * 0.9, 0.4); sub(36, T(24), BEAT * 0.9, 0.4);

// ⑥ 그런데! 26~29 — 음악이 뚝 끊기고 아래로 꺼지는 소리, 다시 조여 온다
mix.gain.setValueAtTime(1, T(26) - 0.002);
mix.gain.linearRampToValueAtTime(0.0001, T(26) + 0.02);
mix.gain.setValueAtTime(1, T(27.5));
glide(T(26), 0.6);
thump(T(27.5), 0.8); thump(T(28), 0.6); thump(T(28.5), 0.5);
for (const b of [27.5, 28, 28.5]) tick(T(b + 0.25), 0.1);
pad([45, 52], T(27.5), T(1.5), 0.05);
riser(T(27.5), T(1.5), 0.2);

// ⑦ 내기! 29~37 — 통통 튀는 마림바 그루브
crash(T(29), 0.3);
const BET = [
  { r: 33, th: 3, arp: [64, 69, 72, 69, 64, 67, 71, 67] },    // Am
  { r: 29, th: 4, arp: [65, 69, 72, 69, 65, 69, 72, 69] },    // F
];
for (let s = 29, k = 0; s < 37; s += 4, k++) {
  const c = BET[k];
  for (const [o, m] of [[0, 0], [1, 12], [1.5, 0], [2.5, 7], [3, 0], [3.5, c.th]]) sub(c.r + m, T(s + o), BEAT * 0.3, 0.36);
  for (const o of [0, 2]) kick(T(s + o), 0.85);
  for (const o of [1, 3]) { snare(T(s + o), 0.16); clap(T(s + o)); }
  for (let o = 0.5; o < 4; o += 1) hat(T(s + o), 0.1);
  for (let o = 0.25; o < 4; o += 0.5) shaker(T(s + o), 0.05);
  c.arp.forEach((m, i) => pluck(m, T(s + i * 0.5), BEAT * 0.28, 0.08, 4200));
}

// ⑧ 집중! 37~43 — 빌드업: 필터가 열리고 16분 펄스가 조여 온다
pad([45, 52, 57], T(37), T(6), 0.03);
riser(T(37), T(6), 0.55);
for (let b = 37; b < 42.5; b++) kick(T(b), 0.8);
for (let b = 37; b < 43; b += 0.25) hat(T(b), 0.04 + (b - 37) * 0.025);
for (let b = 37; b < 43; b += 0.5) pluck(69, T(b), BEAT * 0.22, 0.06 + (b - 37) * 0.03, 2600);
for (let b = 39; b < 43; b += (b < 41 ? 0.5 : 0.25)) snare(T(b), 0.08 + (b - 39) * 0.07);   // 스네어 롤이 점점 촘촘·커진다

// ⑨ 전승! 43~47 — 승리 드롭
crash(T(43), 0.4); boom(T(43));
const VIC = [
  { st: [48, 55, 60, 64], r: 36, arp: [72, 76, 79, 84] },   // C
  { st: [43, 50, 55, 59], r: 31, arp: [71, 74, 79, 83] },   // G
  { st: [45, 52, 57, 60], r: 33, arp: [69, 72, 76, 81] },   // Am
  { st: [41, 48, 53, 57], r: 29, arp: [69, 72, 77, 81] },   // F
];
VIC.forEach((c, i) => {
  const t = T(43 + i);
  stab(c.st, t, BEAT * 0.9, 0.07);
  sub(c.r, t, BEAT * 0.9, 0.4);
  kick(t, 0.85); hat(t + BEAT / 2, 0.12);
  if (i % 2 === 1) clap(t);
  c.arp.forEach((m, j) => bell(m, t + j * BEAT / 4, 0.08));
});

// ⑩ 엔드카드 47~54 — 따뜻하게 마무리
crash(T(47), 0.25);
stab([48, 55, 60, 64, 67], T(47), BEAT * 2, 0.07);
pad([48, 55, 60, 64, 67], T(47), T(7), 0.05);
kick(T(47), 0.7);
for (const [o, m] of [[0, 84], [1, 79], [2, 76], [3, 79], [4, 81], [5, 79]]) bell(m, T(47 + o), 0.07);
`;

const TAIL = `
// 끝 3초 페이드아웃 — 영상 끝에서 뚝 끊기면 싸구려로 들린다
master.gain.setValueAtTime(master.gain.value, Math.max(0, DUR - 3));
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

const SCORE = HEAD + { piano: PIANO, lofi: LOFI, night: NIGHT }[STYLE] + TAIL;

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
