// 🔥 화덕 미니게임 판정 — 순수 함수만. 품목마다 조작이 다르다.
//    걸 때 한 번 치르고, 그 결과가 완성 여부가 아니라 **수율**을 정한다.
//    요리·조각과 달리 3D 무대를 쓰지 않는다 — 화덕은 '걸어두는 것' 이 목적이라
//    매일 무대 전환을 치르면 거추장스럽다. 가공 창 위 오버레이로 몇 초에 끝낸다.
//
// 🌾 맷돌 — 원을 따라 일정한 속도로 돌린다. 점수는 '고르기'다(빠르기가 아니라).
//    난이도는 판정 경계로만 조절한다(COURSE_MULT 와 같은 규칙) — 속도·길이를 같이
//    흔들면 어느 쪽이 어려웠는지 지표로 가를 수 없다.

/** samples: [{ t: ms, a: 라디안 누적각 }] — 각속도의 변동계수가 작을수록 높은 점수 */
export function millScore(samples = []) {
  if (!Array.isArray(samples) || samples.length < 3) return 0;
  const v = [];
  for (let i = 1; i < samples.length; i++) {
    const dt = samples[i].t - samples[i - 1].t;
    if (dt > 0) v.push(Math.abs(samples[i].a - samples[i - 1].a) / dt);
  }
  if (v.length < 2) return 0;
  const mean = v.reduce((a, b) => a + b, 0) / v.length;
  if (mean <= 0) return 0;                      // 멈춰 있으면 0 — 손을 안 대고 통과할 수 없다
  const sd = Math.sqrt(v.reduce((a, b) => a + (b - mean) ** 2, 0) / v.length);
  return Math.max(0, Math.min(1, 1 - sd / mean));   // 변동계수 0 → 1점
}

/** 요리와 같은 4단(😅🙂😋💫) */
export function gradeOfScore(score) {
  if (score >= 0.9) return 3;
  if (score >= 0.75) return 2;
  if (score >= 0.5) return 1;
  return 0;
}

/** ⚫ 숯: 불 조절 — 오가는 게이지(pos)를 목표(target) 부근에서 멈춘다.
 *  half 는 초록 구간의 반폭. **난이도는 이 값으로만 조절한다**(COURSE_MULT 와 같은 규칙). */
export function fireScore(pos, target = 0.5, half = 0.12) {
  const d = Math.abs(pos - target);
  if (d >= half) return 0;                       // 구간 밖
  return 1 - d / half;                           // 한가운데 1, 경계 0
}

/** 🧱 벽돌: 반죽 다지기 — 꾹 눌렀다 목표 시간(ms)에 뗀다. tol 은 허용 오차(ms). */
export function knead2Score(heldMs, targetMs = 1200, tol = 400) {
  if (!(heldMs > 0)) return 0;                   // 누르지 않았다
  const d = Math.abs(heldMs - targetMs);
  if (d >= tol) return 0;
  return 1 - d / tol;
}
