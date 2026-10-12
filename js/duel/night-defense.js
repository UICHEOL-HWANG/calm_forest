// 🦝 밤손님 방어 판정 입력(순수) — 게임(js/spaces/night-visit.js)과 🔔 푸시 cron(functions/push-cron.js)이 함께 쓴다
//   심어둔 밭 9칸 안의 허수아비 1개·울타리 4개 이상만 인정. 🎃 묘비 울타리는 장식이라 세지 않는다.
//   cands: [{ x, z }] — 자라는 중·다 자란 밭 / outdoor: 세이브의 state.outdoor([{ id, x, z }])
const RADIUS = 9;
const FENCE_MIN = 4;

export function computeNightDefense(cands, outdoor) {
  const items = (Array.isArray(outdoor) ? outdoor : []).filter(o => o && typeof o === 'object');   // 세이브의 null 항목 방어
  const near = o => cands.some(c => Math.hypot(o.x - c.x, o.z - c.z) < RADIUS);
  return {
    scarecrow: items.some(o => o.id === 'scarecrow' && near(o)),
    fence: items.filter(o => o.id === 'fence' && near(o)).length >= FENCE_MIN,
  };
}
