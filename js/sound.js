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
//  · main: 경쾌한 마을 — 8마디 멜로디 훅 + 킥·스네어 백비트 + 통통 튀는 8분 베이스
//  · cave: 음산한 동굴 — 저음 드론 + 드문드문 으스스한 음 + 물방울 에코
//  ------------------------------------------------------------
//  ⏱️ 타이밍은 setTimeout 이 아니라 AudioContext 시계에 '절대 시각(at)'으로 예약한다.
//     게임 루프가 프레임을 잡아먹으면 setTimeout 이 수십 ms 씩 밀리는데,
//     리듬 음악에선 그 지터가 그대로 "박자가 흐트러진 느낌"이 된다.
// =============================================================
let musicOn = false, musicTimer = null, musicGain = null, barCount = 0;
let bgmTheme = 'main';   // 'main' | 'cave'

// 밝은 진행: C → G → Am → F (두 바퀴 = 8마디 한 덩어리)
const MAIN_CHORDS = [
  [261.63, 329.63, 392.00], // C  E  G
  [196.00, 246.94, 293.66], // G  B  D
  [220.00, 261.63, 329.63], // A  C  E
  [174.61, 220.00, 261.63], // F  A  C
];

const MAIN_BPM = 138;
const EIGHTH   = 30 / MAIN_BPM;        // 8분음표 길이(초)
const MAIN_BAR = EIGHTH * 8 * 1000;    // 한 마디(ms) — 4/4 한 마디 = 8분음표 8칸

// 멜로디 음(C 장음계) — 아래 표는 인덱스로 참조한다
const MEL = [523.25, 587.33, 659.25, 698.46, 783.99, 880.00, 987.77, 1046.50, 1174.66, 1318.51];
//            0 도    1 레    2 미    3 파    4 솔    5 라    6 시    7 도↑    8 레↑    9 미↑

// 🎵 8마디 멜로디 훅 — [시작 칸(8분음표), MEL 인덱스, 길이(8분음표)]
//   1~4마디에서 부르고 5~8마디가 같은 골격으로 한 옥타브 위에서 답하는 대칭 구조.
//   예전엔 펜타토닉에서 음을 무작위로 뽑아 뿌렸는데, 무작위는 가락이 되지 않는다 —
//   흥얼거릴 게 없으니 아무리 빨라도 경쾌하게 들리지 않았다.
const MAIN_MELODY = [
  [[0, 4, 1], [1, 2, 1], [2, 4, 1], [3, 7, 3]],                 // 1 C  · 솔 미 솔 도↑
  [[0, 6, 1], [1, 4, 1], [2, 6, 1], [3, 4, 2], [6, 2, 2]],      // 2 G  · 시 솔 시 솔 미
  [[0, 5, 1], [1, 4, 1], [2, 2, 1], [3, 4, 3]],                 // 3 Am · 라 솔 미 솔
  [[0, 3, 1], [1, 2, 1], [2, 3, 1], [3, 4, 4]],                 // 4 F  · 파 미 파 솔~
  [[0, 7, 1], [1, 6, 1], [2, 7, 1], [3, 9, 3]],                 // 5 C  · 도↑ 시 도↑ 미↑
  [[0, 8, 1], [1, 6, 1], [2, 4, 1], [3, 6, 2], [6, 4, 2]],      // 6 G  · 레↑ 시 솔 시 솔
  [[0, 7, 1], [1, 5, 1], [2, 4, 1], [3, 2, 3]],                 // 7 Am · 도↑ 라 솔 미
  [[0, 3, 1], [1, 4, 1], [2, 5, 1], [3, 4, 4]],                 // 8 F  · 파 솔 라 솔~
];

// 베이스 — 루트(1) · 5도(1.5) · 옥타브(2)를 8분음표로 통통 튀게. null = 쉼
const MAIN_BASS  = [1, null, 1, 2, 1.5, null, 1.5, 2];
const KICK_SLOTS  = [0, 4, 7];   // 1·3박 + 마디 끝에서 다음 마디로 밀어주기
const SNARE_SLOTS = [2, 6];      // 2·4박 백비트
const STAB_SLOTS  = [3, 7];      // 코드 스탭은 뒷박에 — 엇박이라야 몸이 흔들린다

// 어두운 재료: A 단조 계열 + 반음(A#) 섞어 불안한 색
const CAVE_NOTES = [440.00, 466.16, 523.25, 587.33, 349.23]; // A A# C D F
const CAVE_BAR = 5000;

// 빠른 어택·짧은 감쇠(뜯는 소리) — 활기찬 테마의 기본 음색
function pluck(freq, dur, vol, type = 'triangle', at = null) {
  const c = ensureCtx(); const t = at === null ? c.currentTime : at;
  const osc = c.createOscillator(); const g = c.createGain();
  osc.type = type; osc.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(musicGain); osc.start(t); osc.stop(t + dur + 0.05);
}

// 아주 작은 하이햇(리듬 질감) — 하이패스 노이즈 틱
function tick(vol = 0.03, at = null) {
  const c = ensureCtx(); const t = at === null ? c.currentTime : at;
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
function padNote(freq, dur, vol, type = 'triangle', at = null) {
  const c = ensureCtx(); const t = at === null ? c.currentTime : at;
  const osc = c.createOscillator(); const g = c.createGain();
  osc.type = type; osc.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.9);        // 느린 어택
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);     // 느린 릴리즈
  osc.connect(g).connect(musicGain); osc.start(t); osc.stop(t + dur + 0.1);
}

// 음정이 스르륵 떨어지는 으스스한 음(동굴)
function eerie(freq, dur = 2.4, vol = 0.05, at = null) {
  const c = ensureCtx(); const t = at === null ? c.currentTime : at;
  const osc = c.createOscillator(); const g = c.createGain();
  osc.type = 'sine'; osc.frequency.setValueAtTime(freq, t);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.93, t + dur);   // 반음 못 미치게 흘러내림
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.5);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(musicGain); osc.start(t); osc.stop(t + dur + 0.1);
}

// 킥 — 짧게 떨어지는 사인 스윕(둥). 경쾌함의 절반은 발이 구르는 데서 온다
function kick(vol, at) {
  const c = ensureCtx(); const t = at === null || at === undefined ? c.currentTime : at;
  const osc = c.createOscillator(); const g = c.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(142, t);
  osc.frequency.exponentialRampToValueAtTime(46, t + 0.11);   // 피치가 뚝 떨어져야 '둥'
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.17);
  osc.connect(g).connect(musicGain); osc.start(t); osc.stop(t + 0.2);
}

// 스네어 — 밴드패스 노이즈 한 방(탁). 2·4박을 때려 백비트를 만든다
function snare(vol, at) {
  const c = ensureCtx(); const t = at === null || at === undefined ? c.currentTime : at;
  const buf = c.createBuffer(1, (c.sampleRate * 0.13) | 0, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource(); src.buffer = buf;
  const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1900; bp.Q.value = 0.7;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
  src.connect(bp).connect(g).connect(musicGain); src.start(t); src.stop(t + 0.15);
}

// 동굴 물방울 — 높은 블립 + 잦아드는 에코
function drip(at) {
  const c = ensureCtx(); const t = at === null || at === undefined ? c.currentTime : at;
  pluck(1900, 0.09, 0.05, 'sine', t);
  pluck(1520, 0.12, 0.03, 'sine', t + 0.17);
  pluck(1216, 0.16, 0.018, 'sine', t + 0.38);
}

// ── 🎵 경쾌한 마을 마디: 멜로디 훅 + 킥·스네어 백비트 + 8분 베이스 + 엇박 코드 스탭 ──
//    at = 이 마디가 시작할 AudioContext 시각(초). 마디 전체를 한 번에 예약한다.
function playMainBar(at) {
  const bar = barCount % MAIN_MELODY.length; barCount++;
  const chord = MAIN_CHORDS[bar % MAIN_CHORDS.length];
  const root = chord[0] / 2;

  for (let s = 0; s < 8; s++) {
    const t = at + s * EIGHTH;
    tick(s % 2 === 0 ? 0.03 : 0.016, t);                                  // 하이햇 8분 — 정박에 악센트
    if (MAIN_BASS[s]) pluck(root * MAIN_BASS[s], 0.19, 0.2, 'sine', t);   // 통통 튀는 베이스
    if (KICK_SLOTS.includes(s)) kick(s === 7 ? 0.15 : 0.26, t);
    if (SNARE_SLOTS.includes(s)) snare(0.095, t);
    if (STAB_SLOTS.includes(s)) chord.forEach(f => pluck(f, 0.13, 0.042, 'triangle', t));
  }
  // 멜로디 — 길이의 90%만 울리게 해서 음 사이가 붙지 않고 또렷이 끊긴다
  for (const [slot, idx, len] of MAIN_MELODY[bar]) {
    pluck(MEL[idx], len * EIGHTH * 0.9, 0.095, 'triangle', at + slot * EIGHTH);
  }
}

// ── ⛏️ 음산한 동굴 바: 저음 드론(디튠 맥놀이) + 흘러내리는 음 + 물방울 에코 ──
function playCaveBar(at) {
  padNote(55, 5.4, 0.15, 'sine', at);          // A1 드론
  padNote(55.6, 5.4, 0.11, 'sine', at);        // 살짝 어긋난 디튠(웅웅 맥놀이)
  padNote(110, 5.4, 0.045, 'triangle', at);    // 한 옥타브 위 배음
  const sec = CAVE_BAR / 1000;
  if (Math.random() < 0.55) {                  // 드문드문 으스스한 음
    eerie(CAVE_NOTES[(Math.random() * CAVE_NOTES.length) | 0], 2.4, 0.05,
      at + (0.2 + Math.random() * 0.5) * sec);
  }
  if (Math.random() < 0.7) drip(at + Math.random() * sec * 0.7);   // 물방울 에코
}

function barFn() { return bgmTheme === 'cave' ? playCaveBar : playMainBar; }
function barLen() { return bgmTheme === 'cave' ? CAVE_BAR : MAIN_BAR; }

// ── 룩어헤드 스케줄러 ────────────────────────────────────────
//   setInterval 로 '소리를 내는' 게 아니라, 자주 깨어나 앞으로 0.45초 구간을
//   AudioContext 시계에 미리 예약해 둔다. 타이머가 밀려도 소리는 안 밀린다.
let nextBarAt = 0;
function pump() {
  if (!musicOn) return;
  const c = ensureCtx();
  if (!nextBarAt || nextBarAt < c.currentTime) nextBarAt = c.currentTime + 0.06;  // 첫 마디·복구
  while (nextBarAt < c.currentTime + 0.45) {
    barFn()(nextBarAt);
    nextBarAt += barLen() / 1000;
  }
}
function scheduleBars() {
  if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
  nextBarAt = 0; barCount = 0;   // 테마를 바꾸면 멜로디도 1마디부터 다시
  pump();
  musicTimer = setInterval(pump, 90);
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
