// =============================================================
//  calm forest · 🐗🦝 대결 연출 곡선 — 순수 함수(시간·진행도 → 오프셋)
//  ------------------------------------------------------------
//  사용자 요청(2026-09-27): "대결 때 화면이 아예 멈춰 있어 어색하다 — 좀 더 다이나믹하게" → C안
//  (숨쉬기 + 가위바위보 박자 + 카메라 줌·흔들림 + 도망 퇴장).
//  ▶ 동물 모델은 부위가 한 메시로 합쳐져 있다(art.js buildModel) — 꼬리·귀를 따로 못 움직이므로
//    몸 전체의 위치·기울기·찌그러짐으로 표현한다.
//  ▶ 크기 상한은 폰 375×812 기준이다. 카메라 거리는 8% 이상 당기지 않는다 — stage.js CAM_DIST 주석:
//    6.2 로 당겼다가 멧돼지 뒷다리가 잘린 적이 있다.
//  사용처: js/duel/stage.js · 테스트: tests/duel-motion.test.mjs
// =============================================================

export const IDLE_PERIOD = 2.2;   // 숨 한 번(초)
export const HOP_H = 0.35;        // 폴짝 높이
export const RECOIL_MAX = 0.28;   // 움찔 — 뒤로 밀리는 거리
export const SHAKE_MAX = 0.12;    // 화면 흔들림 최대 폭(월드 단위)
export const ZOOM_IN = 0.94;      // 판 시작 줌인 — 카메라 거리 배율

const PUMP_H = 0.12;              // 주먹 흔들기 높이
const PUNCH = 0.07;               // 결정타 줌 펀치 — 거리 배율 감소량
const FLEE_DIST = 5;              // 도망 — 화면 밖으로 나가는 거리
const TRAUMA_DECAY = 1.8;         // 흔들림이 가라앉는 속도(초당)

const easeOut = (x) => 1 - (1 - x) * (1 - x);
const easeInOut = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
const clamp01 = (x) => Math.min(1, Math.max(0, x));

/** 숨쉬기 — t 초, phase(0~1)로 둘의 박자를 어긋나게 한다 */
export function idle(t, phase = 0) {
  const s = Math.sin((2 * Math.PI * t) / IDLE_PERIOD + 2 * Math.PI * phase);
  return { dy: 0.02 * (1 + s), sy: 1 + 0.025 * s, sx: 1 - 0.0125 * s };
}

/** 폴짝(u: 0~1) — 뜨기 직전·착지 때 눌리고, 공중에선 늘어난다 */
export function hop(u) {
  u = clamp01(u);
  const edge = Math.max(0, 1 - Math.min(u, 1 - u) / 0.08);
  return { dy: 4 * u * (1 - u) * HOP_H, sy: 1 + 0.10 * Math.sin(Math.PI * u) - 0.16 * edge };
}

/** 움찔(u: 0~1) — 앞 20% 에 확 밀리고 나머지 동안 제자리로 */
export function recoil(u) {
  u = clamp01(u);
  return u < 0.2 ? RECOIL_MAX * easeOut(u / 0.2) : RECOIL_MAX * (1 - easeInOut((u - 0.2) / 0.8));
}

/** 가위·바위·보! — 세 번 튀는 주먹 높이 */
export function pump(u) {
  u = clamp01(u);
  return Math.abs(Math.sin(3 * Math.PI * u)) * PUMP_H;
}

/** 손 아이콘 팝 — 0 에서 넘쳤다가 1 (easeOutBack) */
export function pop(u) {
  u = clamp01(u);
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2);
}

/** 결정타 줌 펀치 — 카메라 거리 배율. 빨리 들어가고 천천히 돌아온다 */
export function zoomPunch(u) {
  u = clamp01(u);
  const k = u < 0.25 ? easeOut(u / 0.25) : 1 - easeInOut((u - 0.25) / 0.75);
  return 1 - PUNCH * k;
}

/** 도망(u: 0~1) — 앞 25% 에 뒤돌고, 그다음 점점 빨리 멀어지며 종종걸음 */
export function flee(u) {
  u = clamp01(u);
  if (u < 0.25) return { turn: Math.PI * easeInOut(u / 0.25), dist: 0, dy: 0 };
  const r = (u - 0.25) / 0.75;
  return { turn: Math.PI, dist: FLEE_DIST * r * r, dy: Math.abs(Math.sin(r * Math.PI * 7)) * 0.08 };
}

/** 화면 흔들림 — trauma(0~1)의 제곱에 비례(약한 충격은 거의 안 흔들린다) */
export function shake(trauma, t) {
  if (!(trauma > 0)) return { x: 0, y: 0 };
  const a = Math.min(1, trauma) ** 2 * SHAKE_MAX;
  return {
    x: a * (0.6 * Math.sin(37 * t) + 0.4 * Math.sin(61 * t + 1.3)),
    y: a * (0.6 * Math.sin(43 * t + 0.7) + 0.4 * Math.sin(71 * t + 2.1)),
  };
}

export function decayTrauma(trauma, dt) {
  return Math.max(0, trauma - dt * TRAUMA_DECAY);
}
