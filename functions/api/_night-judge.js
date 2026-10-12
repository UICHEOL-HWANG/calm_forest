// =============================================================
//  calm forest · 🦝 밤손님 판정(순수) — /api/night-visit 와 🔔 푸시 cron 이 함께 쓴다
//  ------------------------------------------------------------
//  HMAC(시크릿, uid:date) 결정적 난수라 같은 입력이면 언제 불러도 같은 운명.
//  cron 은 이걸로 "오늘 밤 실제로 오는 날"에만 예고를 보낸다.
//  (테스트: node --test tests/push-night.test.mjs)
// =============================================================

const BASE_CHANCE = 0.6;       // 방어 없을 때 습격 확률
const SCARECROW_CUT = 0.25;    // 허수아비: 확률 -25%p, 도난 개수 -1
const FENCE_CUT = 0.20;        // 울타리:   확률 -20%p, 도난 개수 -1

/**
 * 오늘 밤 올 동물을 고른다.
 * 🤝 휴전 중인 동물이 뽑히면 남은 쪽으로 넘기고, 둘 다 쉬면 아무도 안 온다.
 * (테스트: node --test tests/duel.test.mjs)
 */
export function pickAnimal(roll, blocked = []) {
  const first = roll < 0.5 ? 'raccoon' : 'boar';
  const other = first === 'raccoon' ? 'boar' : 'raccoon';
  if (!blocked.includes(first)) return first;
  if (!blocked.includes(other)) return other;
  return null;
}

// ── HMAC-SHA256(시크릿, uid:date) → 결정적 난수열(0~1) ──────────
export async function seededRolls(secret, uid, date, n) {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${uid}:${date}`));
  const bytes = new Uint8Array(sig);   // 32바이트면 판정에 충분
  return Array.from(bytes.slice(0, n), b => b / 256);
}

/**
 * → { visited:false, defended } | { visited:false, truce:true } | { visited:true, animal, stolenIdx }
 * 호출부가 입력 정규화(plotCount ≥ 1, secret 존재)를 마친 뒤 부른다.
 */
export async function judgeNight({ secret, uid, date, plotCount, scarecrow, fence, blocked = [] }) {
  const [rollVisit, rollAnimal, rollCount, ...rollPicks] = await seededRolls(secret, uid, date, 8);

  // 방어가 확률을 깎는다 — 둘 다 있으면 15%까지. "내일 뭘 해둘 이유"의 몸통.
  let chance = BASE_CHANCE;
  if (scarecrow) chance -= SCARECROW_CUT;
  if (fence) chance -= FENCE_CUT;
  if (rollVisit >= chance) return { visited: false, defended: scarecrow || fence };

  const animal = pickAnimal(rollAnimal, blocked);
  if (!animal) return { visited: false, truce: true };

  // 도난 개수: 1~3 기본, 방어 하나당 -1 (최소 1) — 소중한 밭을 쓸어가지 않는 상한
  let count = 1 + Math.floor(rollCount * 3);               // 1~3
  count -= (scarecrow ? 1 : 0) + (fence ? 1 : 0);
  count = Math.max(1, Math.min(count, plotCount));

  // 어떤 밭이 털렸는지 — 결정적 난수로 인덱스 선택(중복 없이)
  const idx = Array.from({ length: plotCount }, (_, i) => i);
  const stolenIdx = [];
  for (let k = 0; k < count; k++) {
    const r = rollPicks[k % rollPicks.length];
    const pick = Math.floor(r * idx.length) % idx.length;
    stolenIdx.push(idx.splice(pick, 1)[0]);
  }
  return { visited: true, animal, stolenIdx };
}
