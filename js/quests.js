// =============================================================
//  calm forest · 🦉 의뢰 공급 규칙 (순수 함수 — DOM/Three 의존 없음)
//  ------------------------------------------------------------
//  ▶ 전제조건 게이트 · 시드 추첨 · 주민 반복 의뢰
//  ▶ 테스트: npm test   (dev/active/quest-expansion/)
//
//  ⚠️ 이 모듈이 존재하는 이유는 "영원히 못 깨는 의뢰" 를 막기 위해서다.
//     닭장을 안 지은 사람에게 🥚달걀 의뢰가 가면 진행도가 영원히 0 이고,
//     그러면 st.idx 가 못 올라가 그날 의뢰 전체가 잠긴다.
//     game.js 의 questEvent 가 쏘는 이벤트(QUEST_TYPES)와 짝이 맞아야 한다.
// =============================================================

/**
 * 세이브 상태 요약 — 게이트가 보는 전부.
 * @typedef {{coopBuilt:boolean, houseStage:number, locked:{river:boolean,sea:boolean,mist:boolean}}} QuestCtx
 */

// 목표 종류별 전제조건. 여기 없는 종류는 조건 없이 가능하다.
//   ⚠️ 베타 A/B 가 끝나 맵 잠금이 항상 false 가 되어도 이 표는 버릴 코드가 아니다 —
//   닭장 미건설·집 단계 미달은 잠금과 무관하게 계속 "못 깨는 의뢰" 를 만든다.
//   그때 잠금 줄들은 자동으로 아무것도 안 거르는 상태가 될 뿐이다.
export const QUEST_GATES = {
  egg:     ctx => !!ctx.coopBuilt,            // 🐔 닭장을 지어야 달걀을 걷는다
  decor:   ctx => (ctx.houseStage || 0) >= 1, // 🪵 집이 있어야 마당에 장식을 놓는다
  boat:    ctx => !ctx.locked?.river,
  seafish: ctx => !ctx.locked?.sea,
  mist:    ctx => !ctx.locked?.mist,
};

// 하루 안에 물리적으로 가능한 최대 횟수. 넘기면 그날 못 깨는 의뢰가 된다.
//   달걀=하루 1회 수집 · 안개 정화=하루 1회 · 나룻배=런 횟수 제한
//   ⚠️ 조각은 일일 주문이 3건인데 포기·실패도 주문을 소진한다(완성만 진행으로 센다).
//      상한을 2 로 두면 한 번만 미끄러져도 그날 못 깨므로 1 로 잡는다.
export const QUEST_LIMITS = {
  egg: 1, mist: 1, boat: 1, carve: 1, gift: 3, decor: 3, seafish: 3,
};

/** 지금 이 세이브에서 깰 수 있는 목표인가. 모르는 종류는 막지 않는다(폴백). */
export function questAvailable(type, ctx = {}) {
  const gate = QUEST_GATES[type];
  return gate ? !!gate(ctx) : true;
}

// 선형 합동 생성기 — 기존 refreshDailyQuests 가 쓰던 것과 같은 상수.
//   날짜 시드를 넣으면 하루 종일 같은 결과가 나온다(의뢰가 바뀌면 진행도가 증발한다).
function nextSeed(h) { return (h * 1103515245 + 12345) & 0x7fffffff; }

/**
 * 게이트를 통과한 것 중에서 count 개를 시드로 뽑는다. 같은 목표는 두 번 담지 않는다.
 * 통과한 게 모자라면 있는 만큼만 준다(빈 배열도 정상 — 호출부가 폴백한다).
 * 원본 풀은 건드리지 않는다.
 */
export function pickGated(pool, count, seed, ctx = {}) {
  const rest = pool.filter(q => questAvailable(q.type, ctx));
  const out = [];
  let h = seed & 0x7fffffff;
  while (out.length < count && rest.length) {
    h = nextSeed(h);
    out.push(rest.splice(h % rest.length, 1)[0]);
  }
  return out;
}

// ── 주민 반복 의뢰 ────────────────────────────────────────────
//   체인을 다 깬 주민이 영원히 "고마워요" 만 하던 것을 없앤다.
//   ⚠️ 주민 전원이 매일 의뢰를 내면 코인 발행이 3배가 된다 → 하루 REPEAT_OPEN 명만 열린다.
//   🦉 의뢰 올빼미는 일일 의뢰 담당이라 이 풀에 없다.
export const REPEAT_OPEN = 3;

// 주민별 전문 분야. 보상은 코인을 억제하고 재료·친밀도로 분산한다
//   (일일 의뢰가 코인을 맡고, 반복 의뢰는 재료 수급과 친밀도를 맡는 역할 분담).
export const REPEAT_POOL = {
  farmer: [
    { type: 'harvest', target: 5, title: '밭일 거들기', desc: '작물 5개 수확하기', reward: { seed: 4, coins: 6 } },
    { type: 'water',   target: 6, title: '물 당번',     desc: '물 6번 주기',       reward: { seed: 5, coins: 5 } },
    { type: 'plant',   target: 4, title: '이랑 채우기', desc: '씨앗 4번 심기',     reward: { crop: 2, coins: 6 } },
  ],
  builder: [
    { type: 'chop',         target: 6,  title: '땔감 보충', desc: '나무 6번 베기',        reward: { stone: 3, coins: 6 } },
    { type: 'collect_wood', target: 12, title: '자재 창고', desc: '목재 12개 모으기',     reward: { coins: 8 } },
    { type: 'decor',        target: 2,  title: '마당 손질', desc: '🪵 야외 장식 2개 놓기', reward: { wood: 5, coins: 5 } },
  ],
  merchant: [
    { type: 'sell',         target: 8, title: '오늘의 장사', desc: '상점에서 8개 팔기', reward: { seed: 5, coins: 8 } },
    { type: 'collect_crop', target: 6, title: '물량 확보',   desc: '작물 6개 보유',     reward: { coins: 8 } },
    { type: 'mine',         target: 5, title: '광물 수배',   desc: '광석 5개 캐기',     reward: { coins: 8 } },
  ],
  angler: [
    { type: 'fish',    target: 4, title: '오늘의 조황', desc: '물고기 4마리 낚기',    reward: { crop: 3, coins: 6 } },
    { type: 'seafish', target: 2, title: '먼바다 소식', desc: '🌊 바다 물고기 2마리 낚기', reward: { coins: 8 } },
    { type: 'fish',    target: 7, title: '한나절 낚시', desc: '물고기 7마리 낚기',    reward: { seed: 6, coins: 8 } },
  ],
  chef: [
    { type: 'cook',         target: 2, title: '오늘의 메뉴', desc: '요리 2번 하기',            reward: { crop: 3, coins: 6 } },
    { type: 'serve',        target: 3, title: '홀 거들기',   desc: '☕ 카페 손님 3명 서빙하기', reward: { coins: 8 } },
    { type: 'collect_crop', target: 4, title: '재료 손질',   desc: '작물 4개 보유',            reward: { seed: 4, coins: 5 } },
  ],
  forager: [
    { type: 'forage', target: 6, title: '숲 한 바퀴',  desc: '🍄 채집물 6개 줍기',   reward: { seed: 4, coins: 6 } },
    { type: 'carve',  target: 1, title: '나뭇결 읽기', desc: '🗿 조각 1개 완성하기', reward: { wood: 6, coins: 6 } },
    { type: 'mist',   target: 1, title: '안개 걷기',   desc: '🌫️ 안개 숲 정화하기',  reward: { coins: 8 } },
  ],
  stargazer: [
    { type: 'catch', target: 4, title: '밤 마중',     desc: '🌟 반딧불이 4마리 잡기(밤)', reward: { crop: 2, coins: 6 } },
    { type: 'decor', target: 1, title: '등 하나 더',  desc: '🪵 야외 장식 1개 놓기',      reward: { wood: 4, coins: 5 } },
    { type: 'gift',  target: 1, title: '마음 전하기', desc: '🎁 주민에게 선물 1번 주기',  reward: { crop: 2, coins: 6 } },
  ],
  ferryman: [
    { type: 'boat',   target: 1, title: '뱃길 점검',  desc: '🛶 강 한 번 완주하기', reward: { coins: 8 } },
    { type: 'fish',   target: 5, title: '나루 조황',  desc: '물고기 5마리 낚기',    reward: { wood: 5, coins: 6 } },
    { type: 'forage', target: 5, title: '강가 줍기',  desc: '🍄 채집물 5개 줍기',   reward: { crop: 3, coins: 5 } },
  ],
  rancher: [
    { type: 'egg',   target: 1, title: '아침 달걀',     desc: '🥚 달걀 걷기',  reward: { crop: 3, coins: 6 } },
    { type: 'cook',  target: 2, title: '아침상 차리기', desc: '요리 2번 하기', reward: { seed: 4, coins: 6 } },
    { type: 'plant', target: 5, title: '모이밭 가꾸기', desc: '씨앗 5번 심기', reward: { crop: 2, coins: 5 } },
  ],
};

/**
 * 오늘 반복 의뢰가 열리는 주민 — 날짜 시드로 REPEAT_OPEN 명.
 * 반복 풀이 없는 주민(🦉 올빼미)은 애초에 후보에서 빠진다.
 */
export function repeatNPCsFor(npcIds, seed) {
  const rest = npcIds.filter(id => REPEAT_POOL[id]);
  const out = [];
  let h = seed & 0x7fffffff;
  while (out.length < REPEAT_OPEN && rest.length) {
    h = nextSeed(h);
    out.push(rest.splice(h % rest.length, 1)[0]);
  }
  return out;
}

/**
 * 그 주민의 오늘 반복 의뢰 하나. 게이트를 통과한 것 중에서만 고른다.
 * 전문 분야가 전부 막혀 있으면 null(호출부는 반복 의뢰를 열지 않는다).
 */
export function repeatQuestFor(npcId, seed, ctx = {}) {
  const pool = REPEAT_POOL[npcId];
  if (!pool) return null;
  // 주민마다 다른 의뢰가 나오도록 id 를 시드에 섞는다(같은 날 세 명이 같은 걸 시키지 않게)
  let h = seed & 0x7fffffff;
  for (let i = 0; i < npcId.length; i++) h = (h * 31 + npcId.charCodeAt(i)) & 0x7fffffff;
  return pickGated(pool, 1, h, ctx)[0] || null;
}
