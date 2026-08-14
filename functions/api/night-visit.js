// =============================================================
//  calm forest · 🦝 밤손님 판정 API
//  ------------------------------------------------------------
//  POST /api/night-visit
//    body: { uid, date, nights, plots: [{ crop }], defense: { scarecrow, fence } }
//    → { visited, animal, stolenIdx: [..], loot, defended }
//
//  ▶ 왜 서버에서 판정하나: 클라이언트 RNG면 새로고침으로 결과를 다시 굴릴 수
//    있습니다. 여기서는 HMAC(시크릿, uid:date) 시드의 결정적 난수라
//    같은 유저·같은 날짜엔 몇 번을 불러도 같은 결과가 나옵니다(리롤 불가).
//  ▶ 서버가 저장하는 상태는 없습니다 — 입력(작물·방어)은 클라이언트 세이브에서
//    오고, 서버는 "그 입력에 대한 오늘의 운명"만 계산합니다.
//  ▶ 실패하면 { visited: false } — 밤손님이 안 온 것뿐, 게임은 그대로 진행.
// =============================================================

const MAX_PLOTS = 64;          // 비정상 입력 상한(연산 보호용)
const BASE_CHANCE = 0.6;       // 방어 없을 때 습격 확률
const SCARECROW_CUT = 0.25;    // 허수아비: 확률 -25%p, 도난 개수 -1
const FENCE_CUT = 0.20;        // 울타리:   확률 -20%p, 도난 개수 -1

// 동물별 수집품 — 조사 보상은 서버가 정해 내려보낸다.
//   손실만 있으면 접속이 벌처럼 느껴지므로, 습격당한 날엔 반드시 수집품이 남는다.
const ANIMALS = {
  raccoon: { name: '너구리', loot: 'fur_tuft' },   // 털뭉치
  boar:    { name: '멧돼지', loot: 'acorn_drop' }, // 주운 도토리(물고 가다 흘림)
};

// ── HMAC-SHA256(시크릿, uid:date) → 결정적 난수열(0~1) ──────────
async function seededRolls(env, uid, date, n) {
  const secret = env.NIGHT_SEED_SECRET || 'calm-forest-night';   // 미설정이어도 동작(결정성만 유지)
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${uid}:${date}`));
  const bytes = new Uint8Array(sig);   // 32바이트면 판정에 충분
  return Array.from(bytes.slice(0, n), b => b / 256);
}

export async function onRequestPost({ request, env }) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',      // 비밀 없는 응답(카페 손님과 동일 정책)
    'Cache-Control': 'no-store',             // 유저별 응답 — 공유 캐시 금지
  };
  const none = (reason) => new Response(JSON.stringify({ visited: false, reason }), { headers });

  let body;
  try { body = await request.json(); } catch { return none('bad-json'); }

  // 입력 정규화 — 신뢰하지 않고 형태만 통과시킨다
  const uid = String(body?.uid || '').slice(0, 80);
  const rawDate = String(body?.date || '');
  const date = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : new Date().toISOString().slice(0, 10);
  const nights = Math.min(30, Math.max(0, parseInt(body?.nights, 10) || 0));
  const plots = Array.isArray(body?.plots) ? body.plots.slice(0, MAX_PLOTS) : [];
  const scarecrow = body?.defense?.scarecrow === true;
  const fence = body?.defense?.fence === true;

  if (!uid || nights < 1 || plots.length === 0) return none('no-night');

  const [rollVisit, rollAnimal, rollCount, ...rollPicks] = await seededRolls(env, uid, date, 8);

  // 방어가 확률을 깎는다 — 둘 다 있으면 15%까지. "내일 뭘 해둘 이유"의 몸통.
  let chance = BASE_CHANCE;
  if (scarecrow) chance -= SCARECROW_CUT;
  if (fence) chance -= FENCE_CUT;
  if (rollVisit >= chance) {
    // 방어 성공은 "아무 일 없음"과 구분해 내려준다 — 클라이언트가
    // "허수아비가 밤새 밭을 지켰어요" 같은 피드백을 줄 수 있게.
    return new Response(JSON.stringify({ visited: false, defended: scarecrow || fence }), { headers });
  }

  const animal = rollAnimal < 0.5 ? 'raccoon' : 'boar';

  // 도난 개수: 1~3 기본, 방어 하나당 -1 (최소 1) — 소중한 밭을 쓸어가지 않는 상한
  let count = 1 + Math.floor(rollCount * 3);               // 1~3
  count -= (scarecrow ? 1 : 0) + (fence ? 1 : 0);
  count = Math.max(1, Math.min(count, plots.length));

  // 어떤 밭이 털렸는지 — 결정적 난수로 인덱스 선택(중복 없이)
  const idx = Array.from(plots.keys());
  const stolenIdx = [];
  for (let k = 0; k < count; k++) {
    const r = rollPicks[k % rollPicks.length];
    const pick = Math.floor(r * idx.length) % idx.length;
    stolenIdx.push(idx.splice(pick, 1)[0]);
  }

  return new Response(JSON.stringify({
    visited: true,
    animal,
    animalName: ANIMALS[animal].name,
    stolenIdx,
    loot: ANIMALS[animal].loot,
    defended: false,
  }), { headers });
}
