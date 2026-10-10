// 🪞 거울 마을 탑승 연출 시간표(순수) — js/mirror/ride.js 가 쓴다 · tests/mirror-ride-schedule.test.mjs
//   걷기 → 올라앉기 → 이륙(🪞 거울 문이 일어섬) → 거울 문 통과(가운데서 번쩍 = 공간 전환) → 내려앉기 → 하차
// 2026-10-09 실기기 피드백 "출발이 너무 빠르다" — 이륙·내려앉기를 늘렸다(첫 회 5.6→7.5s, 이후 2.4→3.3s)
// 2026-10-10 토스 피드백 "양 타고 가는 게 엄청 빠르다" — 방문 횟수는 평생이라 두 번째부터는 늘 이후 판이다 → 이후 3.3→5.0s(단계마다 ≈1.5배)
const FIRST = { walk: 1.0, board: 0.5, rise: 2.2, pass: 0.5, descend: 2.6, alight: 0.7 };
const SHORT = { walk: 0.45, board: 0.4, rise: 1.4, pass: 0.35, descend: 1.85, alight: 0.55 };
const ORDER = ['walk', 'board', 'rise', 'pass', 'descend', 'alight'];
const round = (v) => Math.round(v * 1000) / 1000;

const WALK_SPEED = 4.5;   // 승차 지점까지 종종걸음(m/s) — 정류장 뒤에서 돌아오면 걷기 단계만 늘어난다

export function rideSchedule(first, walkLen = 0) {
  const base = first ? FIRST : SHORT, d = { ...base, walk: Math.max(base.walk, walkLen / WALK_SPEED) }, s = {};
  let t = 0;
  for (const k of ORDER) { s[k] = [round(t), round(t + d[k])]; t += d[k]; }
  s.total = round(t);
  s.flash = round((s.pass[0] + s.pass[1]) / 2);
  s.gate = [round(s.rise[0] + d.rise * 0.15), round(s.rise[1] - d.rise * 0.1)];
  return Object.freeze(s);
}

export function phaseAt(s, t) {
  if (t >= s.total) return { name: 'done', p: 1 };
  for (const k of ORDER) { const [a, b] = s[k]; if (t < b) return { name: k, p: Math.max(0, (t - a) / (b - a)) }; }
  return { name: 'done', p: 1 };
}
