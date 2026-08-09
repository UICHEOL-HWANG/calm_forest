// =============================================================
//  calm forest · 절차적 사운드 (WebAudio, 외부 오디오 파일 없음)
//  ------------------------------------------------------------
//  모든 효과음을 오실레이터/노이즈로 실시간 합성합니다.
//  브라우저 정책상 오디오는 "사용자 상호작용" 후에만 시작되므로
//  init() 에서 첫 입력 시 AudioContext 를 resume 합니다.
// =============================================================

let ctx = null;
let master = null;
let enabled = true;

function ensureCtx() {
  if (ctx) return ctx;
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain();
  master.gain.value = 0.35;          // 전체 볼륨(포근하게 낮게)
  master.connect(ctx.destination);
  return ctx;
}

// 첫 사용자 제스처에 오디오 활성화
export function initSound() {
  const resume = () => { ensureCtx(); if (ctx.state === 'suspended') ctx.resume(); };
  window.addEventListener('pointerdown', resume, { once: false });
  window.addEventListener('keydown', resume, { once: false });
  window.addEventListener('touchstart', resume, { once: false });
}

export function toggleSound(on) {
  enabled = on;
  if (!on) stopRainSound();   // 사운드 끄면 빗소리 루프도 정지
}

// ── 🌧️ 빗소리 앰비언트(루프) — 로우패스 필터드 노이즈, 은은하게 ──
let rainSrc = null;
export function startRainSound() {
  if (!enabled || rainSrc) return;
  const c = ensureCtx();
  const len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;   // 화이트 노이즈 2초 루프
  rainSrc = c.createBufferSource(); rainSrc.buffer = buf; rainSrc.loop = true;
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 850;  // 빗소리 톤
  const g = c.createGain(); g.gain.value = 0.14;
  rainSrc.connect(lp); lp.connect(g); g.connect(master);
  rainSrc.start();
}
export function stopRainSound() {
  try { rainSrc?.stop(); } catch (e) {}
  rainSrc = null;
}

// ── 합성 헬퍼 ────────────────────────────────────────────────
// 엔벨로프가 있는 단일 톤
function tone(freq, dur, type = 'sine', vol = 1, glideTo = null) {
  if (!enabled) return;
  const c = ensureCtx(); const t = c.currentTime;
  const osc = c.createOscillator(); const g = c.createGain();
  osc.type = type; osc.frequency.setValueAtTime(freq, t);
  if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(master); osc.start(t); osc.stop(t + dur + 0.02);
}

// 짧은 필터 노이즈(물/흙 질감)
function noise(dur, freq = 1200, vol = 0.5, q = 1) {
  if (!enabled) return;
  const c = ensureCtx(); const t = c.currentTime;
  const buf = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1);
  const src = c.createBufferSource(); src.buffer = buf;
  const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(bp).connect(g).connect(master); src.start(t); src.stop(t + dur);
}

// ── 게임 효과음 (game.js 액션 지점에서 호출) ────────────────────
export const Sound = {
  chop()   { tone(180, 0.12, 'triangle', 0.6, 90); noise(0.08, 800, 0.25); }, // 벌목 "톡"
  till()   { noise(0.18, 500, 0.4, 0.7); tone(120, 0.1, 'sine', 0.3, 80); },   // 밭갈기 "부슥"
  water()  { noise(0.35, 1600, 0.3, 0.5); tone(900, 0.25, 'sine', 0.15, 1400); }, // 물 "쏴아"
  harvest(){ [660, 880, 1320].forEach((f, i) => setTimeout(() => tone(f, 0.18, 'sine', 0.4), i * 60)); }, // 수확 반짝
  build()  { tone(90, 0.18, 'sine', 0.6, 55); noise(0.1, 300, 0.3); },          // 건축 "쿵"
  complete(){ [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.35, 'triangle', 0.5), i * 120)); }, // 완성 팡파레
  blip()   { tone(720, 0.06, 'square', 0.18); },                                // 도구 전환
  plant()  { tone(440, 0.1, 'sine', 0.3, 560); },                               // 씨앗 심기
};

// =============================================================
//  절차적 배경음악(BGM) — 장소별 2개 테마(외부 파일 없음 = 저작권 free)
//  · main: 활기찬 마을 — 통통 튀는 베이스 + 오프비트 코드 스탭 + 플럭 멜로디
//  · cave: 음산한 동굴 — 저음 드론 + 드문드문 으스스한 음 + 물방울 에코
// =============================================================
let musicOn = false, musicTimer = null, musicGain = null, chordIdx = 0;
let bgmTheme = 'main';   // 'main' | 'cave'

// 밝은 진행: C → G → Am → F (팝 진행, 경쾌)
const MAIN_CHORDS = [
  [261.63, 329.63, 392.00], // C  E  G
  [196.00, 246.94, 293.66], // G  B  D
  [220.00, 261.63, 329.63], // A  C  E
  [174.61, 220.00, 261.63], // F  A  C
];
const MAIN_PENT = [523.25, 587.33, 659.25, 783.99, 880.00]; // C D E G A(한 옥타브 위, 멜로디용)
const MAIN_BAR = 1840;    // 바 길이(ms) — 4비트 × 460ms(≈130BPM 체감)

// 어두운 재료: A 단조 계열 + 반음(A#) 섞어 불안한 색
const CAVE_NOTES = [440.00, 466.16, 523.25, 587.33, 349.23]; // A A# C D F
const CAVE_BAR = 5000;

// 빠른 어택·짧은 감쇠(뜯는 소리) — 활기찬 테마의 기본 음색
function pluck(freq, dur, vol, type = 'triangle') {
  const c = ensureCtx(); const t = c.currentTime;
  const osc = c.createOscillator(); const g = c.createGain();
  osc.type = type; osc.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(musicGain); osc.start(t); osc.stop(t + dur + 0.05);
}

// 아주 작은 하이햇(리듬 질감) — 하이패스 노이즈 틱
function tick(vol = 0.03) {
  const c = ensureCtx(); const t = c.currentTime;
  const buf = c.createBuffer(1, c.sampleRate * 0.04, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource(); src.buffer = buf;
  const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 6000;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
  src.connect(hp).connect(g).connect(musicGain); src.start(t); src.stop(t + 0.05);
}

// 느린 어택 패드(드론·서스테인) — 동굴 테마의 기본 음색
function padNote(freq, dur, vol, type = 'triangle') {
  const c = ensureCtx(); const t = c.currentTime;
  const osc = c.createOscillator(); const g = c.createGain();
  osc.type = type; osc.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.9);        // 느린 어택
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);     // 느린 릴리즈
  osc.connect(g).connect(musicGain); osc.start(t); osc.stop(t + dur + 0.1);
}

// 음정이 스르륵 떨어지는 으스스한 음(동굴)
function eerie(freq, dur = 2.4, vol = 0.05) {
  const c = ensureCtx(); const t = c.currentTime;
  const osc = c.createOscillator(); const g = c.createGain();
  osc.type = 'sine'; osc.frequency.setValueAtTime(freq, t);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.93, t + dur);   // 반음 못 미치게 흘러내림
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.5);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(musicGain); osc.start(t); osc.stop(t + dur + 0.1);
}

// 동굴 물방울 — 높은 블립 + 잦아드는 에코
function drip() {
  pluck(1900, 0.09, 0.05, 'sine');
  setTimeout(() => { if (musicOn) pluck(1520, 0.12, 0.03, 'sine'); }, 170);
  setTimeout(() => { if (musicOn) pluck(1216, 0.16, 0.018, 'sine'); }, 380);
}

// ── 🎵 활기찬 마을 바: 베이스(루트↔5도) + 오프비트 코드 스탭 + 펜타 멜로디 + 햇 ──
function playMainBar() {
  if (!musicOn) return;
  const chord = MAIN_CHORDS[chordIdx % MAIN_CHORDS.length]; chordIdx++;
  const root = chord[0] / 2, beat = MAIN_BAR / 4;
  for (let b = 0; b < 4; b++) {
    setTimeout(() => {
      if (!musicOn) return;
      pluck(b % 2 === 0 ? root : root * 1.5, 0.22, 0.2, 'sine');        // 통통 베이스(루트↔5도)
      if (b === 1 || b === 3) chord.forEach(f => pluck(f, 0.16, 0.05)); // 오프비트 코드 스탭
      tick(b % 2 === 0 ? 0.028 : 0.018);                                // 리듬 질감
    }, b * beat);
  }
  const n = 2 + ((Math.random() * 2) | 0);   // 바당 멜로디 2~3음
  for (let i = 0; i < n; i++) {
    setTimeout(() => { if (musicOn) pluck(MAIN_PENT[(Math.random() * MAIN_PENT.length) | 0], 0.3, 0.08); },
      (0.25 + Math.random() * 0.65) * MAIN_BAR);
  }
}

// ── ⛏️ 음산한 동굴 바: 저음 드론(디튠 맥놀이) + 흘러내리는 음 + 물방울 에코 ──
function playCaveBar() {
  if (!musicOn) return;
  padNote(55, 5.4, 0.15, 'sine');          // A1 드론
  padNote(55.6, 5.4, 0.11, 'sine');        // 살짝 어긋난 디튠(웅웅 맥놀이)
  padNote(110, 5.4, 0.045, 'triangle');    // 한 옥타브 위 배음
  if (Math.random() < 0.55) {              // 드문드문 으스스한 음
    setTimeout(() => { if (musicOn) eerie(CAVE_NOTES[(Math.random() * CAVE_NOTES.length) | 0]); },
      (0.2 + Math.random() * 0.5) * CAVE_BAR);
  }
  if (Math.random() < 0.7) {               // 물방울 에코
    setTimeout(() => { if (musicOn) drip(); }, Math.random() * CAVE_BAR * 0.7);
  }
}

function barFn() { return bgmTheme === 'cave' ? playCaveBar : playMainBar; }
function barLen() { return bgmTheme === 'cave' ? CAVE_BAR : MAIN_BAR; }
function scheduleBars() {
  if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
  barFn()();
  musicTimer = setInterval(() => barFn()(), barLen());
}

// 장소 이동 시 테마 전환(game.js: 동굴 입장 'cave' / 퇴장 'main') — 음악 꺼져 있으면 기억만
export function setBGMTheme(theme) {
  if (theme === bgmTheme) return;
  bgmTheme = theme;
  if (musicOn) scheduleBars();
}

export function startBGM() {
  const c = ensureCtx();
  if (!musicGain) { musicGain = c.createGain(); musicGain.gain.value = 0.5; musicGain.connect(master); }
  if (musicOn) return;
  musicOn = true; scheduleBars();
}
export function stopBGM() { musicOn = false; if (musicTimer) { clearInterval(musicTimer); musicTimer = null; } }
export function toggleBGM() { if (musicOn) { stopBGM(); return false; } startBGM(); return true; }
export function isBGMOn() { return musicOn; }
