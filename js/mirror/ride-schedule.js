// 🪞 거울 마을 탑승 연출 시간표(순수) — js/mirror/ride.js 가 쓴다 · tests/mirror-ride-schedule.test.mjs
//   걷기 → 올라앉기 → 이륙(🪞 거울 문이 일어섬) → 거울 문 통과(가운데서 번쩍 = 공간 전환) → 내려앉기 → 하차
const FIRST = { walk: 1.0, board: 0.4, rise: 1.2, pass: 0.4, descend: 1.9, alight: 0.7 };
const SHORT = { walk: 0.3, board: 0.2, rise: 0.5, pass: 0.2, descend: 0.8, alight: 0.4 };
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
