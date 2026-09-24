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

// ── 📜 일일 의뢰 개수를 늘린 날 — 오늘 받은 목록은 버리지 않고 뒤에 덧붙인다 ──────────
//   진행도는 "몇 번째(st.idx)를 몇 개(st.progress)" 라는 포인터라, 목록을 통째로 다시 뽑으면
//   ① 이미 다 깬 사람이 새 목록으로 보상을 또 받고 ② 진행 중이던 사람은 하던 진행도를 잃는다.
//   앞의 N건과 포인터를 그대로 두고 모자란 만큼만 붙이면 둘 다 생기지 않는다(2026-09-24, 3→5).

/**
 * 오늘 목록을 어떻게 다룰지.
 *  'extend' — 멀쩡한데 개수만 모자람 → 뒤에 덧붙인다
 *  'keep'   — 모자라지만 오늘 ✨특별 의뢰를 이미 받았다 → 오늘은 그대로(특별 의뢰가 목록 바로 뒤라
 *             덧붙이면 그 포인터가 새 일일 의뢰를 가리킨다). 내일부터 새 개수
 *  null     — 해당 없음(개수가 맞거나, 없거나, 깨졌다) → 호출부의 기존 경로
 */
export function dailyExtendPlan(quests, count, { valid, hasSpecial = false } = {}) {
  if (!Array.isArray(quests) || !quests.length || quests.length >= count) return null;
  if (!quests.every(q => valid(q))) return null;
  return hasSpecial ? 'keep' : 'extend';
}

/** 덧붙일 의뢰 — 이미 있는 목표 종류는 빼고 게이트를 통과한 것 중 n 개(시드 고정). */
export function pickDailyExtra(pool, existing, n, seed, ctx = {}) {
  const have = new Set(existing.map(q => q.type));
  return pickGated(pool.filter(q => !have.has(q.type)), n, seed, ctx);
}

/** "[오늘의 의뢰 2/3]" · "[Request 2/3]" 의 분모만 바꾼다. 접두사가 없으면 그대로. */
export function renumberDailyLine(line, count) {
  if (typeof line !== 'string') return line;
  return line.replace(/^\[(오늘의 의뢰|Request) (\d+)\/\d+\]/, `[$1 $2/${count}]`);
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
    { type: 'gift',  target: 1, title: '이웃에게 선물', desc: '🎁 주민에게 선물 1번 주기',  reward: { crop: 2, coins: 6 } },
  ],
  ferryman: [
    { type: 'boat',   target: 1, title: '뱃길 점검',  desc: '🛶 강 한 번 완주하기', reward: { coins: 8 } },
    { type: 'fish',   target: 5, title: '나루 조황',  desc: '물고기 5마리 낚기',    reward: { wood: 5, coins: 6 } },
    { type: 'forage', target: 5, title: '강가 줍기',  desc: '🍄 채집물 5개 줍기',   reward: { crop: 3, coins: 5 } },
  ],
  curator: [
    // 🏛️ 큐레이터는 "전시할 것" 을 찾아 달라 한다 — 도감이 남아 있는 한 의뢰가 마르지 않는다
    { type: 'collect_dex', target: 1, title: '새 전시품',   desc: '📖 도감 1종 새로 등록하기', reward: { coins: 10 } },
    { type: 'forage',      target: 5, title: '숲의 표본',   desc: '🍄 채집물 5개 줍기',       reward: { seed: 4, coins: 6 } },
    { type: 'mine',        target: 4, title: '광물 표본',   desc: '광석 4개 캐기',            reward: { coins: 9 } },
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

/**
 * 퍼널 분석용 표준 quest_id — GA4 이벤트와 econ_logs.item 이 같은 문자열을 쓴다.
 *   체인:      `farmer:2`             (순번 — 같은 자리는 늘 같은 의뢰)
 *   반복 의뢰:  `farmer:repeat:plant`  (순번이 없으니 목표 종류. 날짜를 넣으면 GA4 집계가 갈린다)
 *   ✨특별 의뢰: `courier:special:chop`     (예전엔 순번 `courier:3` 이라 종류를 알 수 없었다)
 */
export function questIdFor({ npcId, idx, repeat = false, repeatType, specialType }) {
  if (specialType) return `${npcId}:special:${specialType}`;
  if (repeat) return `${npcId}:repeat:${repeatType || '?'}`;
  return `${npcId}:${idx}`;
}

// ── 🏗️ 체인 자동 스킵 — 이미 해버린 1회성 목표는 조용히 지나간다 ───────
//   목수 체인 뒤에 증축(expand)을 이어붙이면, 이미 🏝️루프탑 빌라까지 지은 기존 유저에게
//   "🧱브릭 로프트를 지어라" 가 간다. 증축은 되돌릴 수 없어 진행도가 영원히 0 이고,
//   st.idx 가 못 올라가 목수가 통째로 잠긴다 — 이 모듈이 막으려는 바로 그 사고다.
//
//   ⚠️ 스킵 대상은 "되돌릴 수 없고, 이미 해버린 사람에게 줄 보상도 없는" 목표뿐이다.
//      house(집 완성)를 여기 넣으면 안 된다 — 집을 지어둔 사람이 '보금자리' 의뢰를
//      수락 즉시 완료하며 받던 보상을 통째로 잃는다(지금 동작의 회귀).
export const CHAIN_SKIP = {
  expand: (q, ctx) => Number.isFinite(q.stage) && (ctx.houseStage || 0) >= q.stage,
};

/**
 * 아직 받지 않은 선두 의뢰가 이미 만족돼 있으면 건너뛴 새 idx 를 돌려준다.
 * 이미 수락한 의뢰(st.given)는 정상 완료 경로(보상)를 뺏지 않도록 손대지 않는다.
 * @param {Array} quests 그 주민의 체인
 * @param {{idx:number, given:boolean}} st 주민별 진행 상태
 * @param {{houseStage?:number}} ctx 세이브 상태 요약
 * @returns {number} 새 idx (변화가 없으면 원래 값)
 */
export function skipSatisfied(quests, st = {}, ctx = {}) {
  let idx = st.idx || 0;
  if (st.given) return idx;
  while (idx < quests.length) {
    const q = quests[idx], satisfied = CHAIN_SKIP[q.type];
    if (!satisfied || !satisfied(q, ctx)) break;
    idx++;
  }
  return idx;
}

// ── 지금 이 주민이 내주는 의뢰 ────────────────────────────────
//   ⚠️ 체인 길이는 배포로 바뀐다. 예전엔 "반복 의뢰 중인가" 를 idx >= quests.length 로만 봐서,
//      목수 체인이 3 → 6 이 되는 순간 판정이 뒤집혔다:
//      🔁반복 의뢰를 수락해 둔 유저는 그게 증축 의뢰로 바꿔치기되고(진행도·보상 증발),
//      이미 증축을 끝낸 사람은 가만히 있어도 보상 3건이 연속으로 굴러들어왔다.
//      그래서 "수락해서 수행 중인 반복 의뢰" 가 언제나 최우선이다.
//
//   스킵도 저장 시점이 아니라 이 읽는 자리에서 한다 — 진입 경로가 늘 때마다 호출을
//   심는 구조는 언젠가 하나를 빠뜨린다(세이브를 안 만든 유저·?house=N 디버그 파라미터 등).

/** 오늘 수행할 수 있는 반복 의뢰가 걸려 있는가(어제 부탁은 아니다). */
export function repeatActive(st, today) {
  const r = st.repeat;
  return !!(r && r.date === today && !r.done);
}

/**
 * 지금 내줄 의뢰와 그 성격을 함께 돌려준다.
 * @param {Array} quests 그 주민의 체인
 * @param {{idx:number, given:boolean, repeat?:object}} st 주민별 진행 상태
 * @param {{houseStage?:number}} ctx 세이브 상태 요약
 * @param {string} today 오늘 날짜 문자열(todayStr())
 * @param {{skip?:boolean}} opt skip=false 면 건너뛰지 않는다(🦉 일일 의뢰는 idx 가 체인 포인터가 아니다)
 * @returns {{q:object|null, repeat:boolean, idx:number}} idx 는 스킵이 반영된 값 — 호출부가 st.idx 에 되쓴다
 */
export function pickCurrent(quests, st, ctx = {}, today = '', { skip = true } = {}) {
  if (st.given && repeatActive(st, today)) return { q: st.repeat.q, repeat: true, idx: st.idx };
  const idx = skip ? skipSatisfied(quests, st, ctx) : (st.idx || 0);
  if (idx < quests.length) return { q: quests[idx], repeat: false, idx };
  return { q: repeatActive(st, today) ? st.repeat.q : null, repeat: true, idx };
}

// ── 퀘스트 패널 목록 ──────────────────────────────────────────
//   ⚠️ 이 함수가 존재하는 이유는 "살아 있는 의뢰가 화면에서 사라지던" 버그다(베타 r5).
//      패널이 주민 한 명(trackedNPC)만 그렸기 때문에, A 를 수락한 뒤 B 를 수락하면
//      A 가 밀려나고, 그 B 를 완료하면 추적 대상이 비어 패널이 통째로 꺼졌다.
//      A 는 멀쩡히 진행 중인데도 A 근처로 다시 걸어가야만 다시 보였다.
//      그래서 패널의 입력을 "한 명" 이 아니라 "지금 수락된 의뢰 전부" 로 바꾼다.

/** 패널에 한 번에 그리는 최대 건수(모바일은 호출부가 2 로 줄인다) */
export const QUEST_PANEL_TOP = 3;

/**
 * 진행 중 의뢰를 패널이 그릴 순서로 정렬하고 상위 top 건만 남긴다.
 *   views: [{ id, name, title, desc, how, progress, target }] — 수락된 의뢰 전부
 *   pinId: 지금 근처에 있는 주민 id(있으면 맨 위 고정 — 눈앞의 사람이 먼저다)
 *   반환: { items: [...view, ready, pct], more }   more = 잘라낸 나머지 건수
 *
 * 순서: 근처 주민 → ✅완료(주민에게 가야 함) → 진행률 높은 순 → 원래 순서(동률은 흔들리지 않게)
 */
export function activeQuestList(views, { top = QUEST_PANEL_TOP, pinId = null } = {}) {
  const items = (views || []).filter(Boolean).map((v, i) => {
    const target = Number(v.target) > 0 ? Number(v.target) : 0;   // target 0/누락은 깨진 데이터 — 0 으로 나누지 않는다
    const progress = Math.max(0, Math.min(Number(v.progress) || 0, target || Number.MAX_SAFE_INTEGER));
    return { ...v, progress, target, ready: target > 0 && progress >= target, pct: target > 0 ? progress / target : 0, _i: i };
  });
  items.sort((a, b) => {
    const pin = (b.id === pinId) - (a.id === pinId);
    if (pin) return pin;
    if (a.ready !== b.ready) return a.ready ? -1 : 1;
    if (b.pct !== a.pct) return b.pct - a.pct;
    return a._i - b._i;
  });
  const n = Math.max(1, top | 0);
  return { items: items.slice(0, n).map(({ _i, ...rest }) => rest), more: Math.max(0, items.length - n) };
}
