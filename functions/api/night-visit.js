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

import { blockedAnimals } from '../../js/duel/truce.js';

import { judgeNight } from './_night-judge.js';

// 판정 규칙(확률·방어·휴전·도난 개수)은 _night-judge.js 한 곳 — 🔔 푸시 cron 도 같은 함수로 "오늘 밤 오는 날"을 미리 안다
export { pickAnimal } from './_night-judge.js';

const MAX_PLOTS = 64;          // 비정상 입력 상한(연산 보호용)

// 동물별 수집품 — 조사 보상은 서버가 정해 내려보낸다.
//   손실만 있으면 접속이 벌처럼 느껴지므로, 습격당한 날엔 반드시 수집품이 남는다.
const ANIMALS = {
  raccoon: { name: '너구리', loot: 'fur_tuft' },   // 털뭉치
  boar:    { name: '멧돼지', loot: 'acorn_drop' }, // 주운 도토리(물고 가다 흘림)
};

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
  // 🤝 발길 끊기 — 대결에서 이긴 동물은 며칠 쉰다. 상한은 truce.js 가 강제한다.
  const blocked = blockedAnimals(body?.truce, date);

  if (!uid || nights < 1 || plots.length === 0) return none('no-night');
  if (!env.NIGHT_SEED_SECRET) return none('not-configured');   // 시크릿 없이 배포되면 밤손님만 쉰다(게임은 그대로)

  // 🔒 공개 저장소에 박힌 기본값을 쓰면 판정을 미리 계산할 수 있다 — 시크릿은 env 에서만
  const v = await judgeNight({ secret: env.NIGHT_SEED_SECRET, uid, date, plotCount: plots.length, scarecrow, fence, blocked });
  if (v.truce) {
    // 두 동물 다 휴전 — 방어 성공과 구분해 내려준다(클라이언트가 "약속을 지켰어요" 라고 말할 수 있게)
    return new Response(JSON.stringify({ visited: false, reason: 'truce', truce: true }), { headers });
  }
  if (!v.visited) {
    // 방어 성공은 "아무 일 없음"과 구분해 내려준다 — 클라이언트가
    // "허수아비가 밤새 밭을 지켰어요" 같은 피드백을 줄 수 있게.
    return new Response(JSON.stringify({ visited: false, defended: v.defended }), { headers });
  }
  const { animal, stolenIdx } = v;

  return new Response(JSON.stringify({
    visited: true,
    animal,
    animalName: ANIMALS[animal].name,
    stolenIdx,
    loot: ANIMALS[animal].loot,
    defended: false,
  }), { headers });
}
