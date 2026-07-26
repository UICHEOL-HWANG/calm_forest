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

export function toggleSound(on) { enabled = on; }

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
