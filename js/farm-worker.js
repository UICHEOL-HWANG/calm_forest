// =============================================================
//  calm forest · 🧑‍🌾 노동자 규칙 (순수 함수 — DOM/Three 의존 없음)
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-09-12-farm-expansion-design.md §3
//  ▶ 직군 3종 × 등급 3단(견습·숙련·장인). 💧물주기는 전원 공통, 그 위에 특기.
//  ▶ 틱: 쿨다운이 끝나면 "가장 급한 일 하나"를 고른다(pickTask). 예약(claimedBy)으로 겹침 방지.
//  ▶ 오프라인은 같은 규칙을 60초 스텝으로 돌린다 — 접속 중과 규칙이 한 글자도 다르지 않다.
//  ▶ 테스트: npm test (tests/farm-worker.test.mjs) — 밸런스 수치를 여기에 못 박는다.
//
//  📦 수확물의 행선지(스펙 §3-7 확장): 수확한 작물은 밭 앞 **더미**(farm.pending)에 쌓이고
//     🧺창고 운반(haul, 🐿️다람쥐 기본 기술)이 창고로 옮긴다. 창고가 없거나 가득 차면 수확을 멈춘다.
//     더미를 둔 이유 — 우선순위 표(§3-5)의 7번 "창고 운반"이 실제로 할 일이 되려면 옮길 물건이 있어야 한다.
//     플레이어도 창고 옆에서 더미를 직접 걷을 수 있어(game.js) 다람쥐가 없어도 막히지 않는다.
// =============================================================

/** 직군 — 등급별로 **누적** 해금되는 기술. 💧water 는 전원 공통이라 표에 없다(skillsOf 가 항상 넣는다) */
export const JOBS = [
  { id: 'mole',     ico: '🦫', name: '두더지', body: 0x7b6b63, unlock: ['till', 'fert', 'weed'], perk: null },
  { id: 'hamster',  ico: '🐹', name: '햄스터', body: 0xd9a066, unlock: ['harvest', 'plant', null], perk: 'yield' },  // 장인: 수확 +1
  { id: 'squirrel', ico: '🐿️', name: '다람쥐', body: 0xb5603a, unlock: ['haul', 'pest', null],   perk: 'speed' },   // 장인: 이동 ×1.5
];

/** 등급표 — 일급(🪙) · 작업 배율 · 승급에 필요한 누적 작업 횟수 */
export const GRADES = [
  { g: 0, name: '견습', wage: 15, mult: 1.0,  need: 0 },
  { g: 1, name: '숙련', wage: 30, mult: 0.8,  need: 120 },
  { g: 2, name: '장인', wage: 55, mult: 0.65, need: 400 },
];

export const HIRE_COST = 120;      // 초빙료(🪙)
export const CANDIDATE_N = 3;      // 게시판에 하루 뜨는 후보 수
export const WORK_SEC = 8;         // 작업 1회 기본 소요(초) — 등급 배율이 곱해진다
export const MOVE_SEC = 4;         // 오프라인 이동 근사(초) — A안의 유일한 근사치(§3-6)
export const STEP_SEC = 60;        // 오프라인 catch-up 스텝
export const MAX_CATCHUP_H = 12;   // 오프라인 정산 상한(시간)
export const HAUL_N = 10;          // 🧺 한 번 나르는 개수
export const MASTER_YIELD = 1;     // 🐹 장인 볼주머니 — 수확 시 +1
export const MASTER_SPEED = 1.5;   // 🐿️ 장인 — 이동 속도 배율
export const SHELTER_SPEEDUP = 1.15; // 🏚️ 쉼터 반경 작업 속도

export function jobOf(id) { return JOBS.find(j => j.id === id) || JOBS[0]; }
export function gradeInfo(g) { return GRADES[Math.max(0, Math.min(GRADES.length - 1, g | 0))]; }

/** 누적 작업 횟수 → 등급(0 견습 · 1 숙련 · 2 장인) */
export function gradeOf(works) {
  let g = 0;
  for (const gr of GRADES) if ((works || 0) >= gr.need) g = gr.g;
  return g;
}

/** 다음 승급까지 남은 작업 횟수(장인이면 null) */
export function toNextGrade(works) {
  const next = GRADES[gradeOf(works) + 1];
  return next ? Math.max(0, next.need - (works || 0)) : null;
}

/** 이 노동자가 할 수 있는 일 — 💧물주기는 전원, 나머지는 등급까지 누적 해금 */
export function skillsOf(job, grade) {
  const out = ['water'];
  const j = jobOf(job);
  for (let g = 0; g <= Math.min(grade, 2); g++) { const s = j.unlock[g]; if (s) out.push(s); }
  return out;
}

/** 장인 특전 보유 여부 */
export function hasPerk(job, grade, perk) { return grade >= 2 && jobOf(job).perk === perk; }

/** 작업 1회 소요(초) — 🏚️쉼터 반경이면 15% 빨라진다(§4-1) */
export function workSecOf(grade, shelter = false) {
  return WORK_SEC * gradeInfo(grade).mult / (shelter ? SHELTER_SPEEDUP : 1);
}

/** 하루 월급 합계(🪙) — 휴식 중이어도 명단에 있으면 센다(정산 때 못 주면 그때 쉬는 것) */
export function dailyWage(workers = []) {
  return workers.reduce((s, w) => s + gradeInfo(w.grade).wage, 0);
}

/**
 * 월급 정산 — 하루 1회(KST 날짜). 코인이 모자라면 **비싼 사람부터** 휴식으로 돌린다.
 *   { paid, coins, resting:[id...], back:[id...] } — resting 은 이번에 쉬게 된 사람, back 은 복귀한 사람.
 *   빚은 쌓이지 않는다(§3-4). 호출부(game.js)가 workers[].restingSince 와 코인을 갱신한다.
 */
export function settleWages(workers = [], coins = 0, now = Date.now()) {
  const order = [...workers].sort((a, b) => gradeInfo(b.grade).wage - gradeInfo(a.grade).wage);
  let left = coins, paid = 0;
  const resting = [], back = [];
  for (const w of order) {
    const wage = gradeInfo(w.grade).wage;
    if (left >= wage) {
      left -= wage; paid += wage;
      if (w.restingSince) back.push(w.id);
    } else if (!w.restingSince) resting.push(w.id);
  }
  return { paid, coins: left, resting, back, at: now };
}

/**
 * 가장 급한 일 하나 — 스펙 §3-5 우선순위 그대로.
 *   world = { plots:[{i,state,weed,pest,fert,wet,wiltAt,claimedBy}], emptyCells, seeds, fertStock, storageLeft, pending }
 *   plots[].state: 'tilled'(간 빈 밭) | 'growing' | 'mature'
 *   반환 { type, i } — i 는 밭 인덱스(밭이 필요 없는 일은 -1). 할 일이 없으면 null(→ 쉼).
 */
export function pickTask(worker, world = {}) {
  const sk = new Set(skillsOf(worker.job, worker.grade));
  const free = (world.plots || []).filter(p => !p.claimedBy || p.claimedBy === worker.id);

  // 1. 💧 목마른 밭 — 시들기 임박한 순(wiltAt 작은 순). 잡초가 덮인 밭은 물을 줘도 안 자란다
  const thirsty = free.filter(p => p.state === 'growing' && !p.wet && !p.weed)
    .sort((a, b) => (a.wiltAt ?? Infinity) - (b.wiltAt ?? Infinity));
  if (thirsty.length) return { type: 'water', i: thirsty[0].i };

  // 2. 🌿 잡초 · 🐛 해충 — 기술 보유자만
  if (sk.has('weed')) { const p = free.find(p => p.weed); if (p) return { type: 'weed', i: p.i }; }
  if (sk.has('pest')) { const p = free.find(p => p.pest); if (p) return { type: 'pest', i: p.i }; }

  // 3. 🌾 수확 — 창고에 자리가 있어야 한다(없으면 더미만 쌓이고 아무도 못 나른다 §3-7)
  if (sk.has('harvest') && world.storageLeft > 0) { const p = free.find(p => p.state === 'mature'); if (p) return { type: 'harvest', i: p.i }; }

  // 4. 🌰 빈 밭에 심기
  if (sk.has('plant') && world.seeds > 0) { const p = free.find(p => p.state === 'tilled'); if (p) return { type: 'plant', i: p.i }; }

  // 5. 🌱 비료 — 아직 안 준 자라는 밭
  if (sk.has('fert') && world.fertStock > 0) { const p = free.find(p => p.state === 'growing' && !p.fert); if (p) return { type: 'fert', i: p.i }; }

  // 6. ⛏️ 빈 땅 갈기
  if (sk.has('till') && world.emptyCells > 0) return { type: 'till', i: -1 };

  // 7. 🧺 창고 운반
  if (sk.has('haul') && world.pending > 0 && world.storageLeft > 0) return { type: 'haul', i: -1 };

  return null;   // 8. 할 일 없음 → 쉼
}

/** 창고 남은 자리 — 여러 채면 용량만 합산(스펙 §7) */
export function storageLeft(storage = {}, cap = 0) {
  const used = Object.values(storage).reduce((s, n) => s + (n || 0), 0);
  return Math.max(0, cap - used);
}

/**
 * 오프라인 경과 → 돌릴 스텝 수(60초 단위).
 *   시계를 과거로 돌리면 0, 미래로 점프해도 12시간 상한에 걸린다(§3-6 — 그래서 서버 검증이 필요 없다).
 */
export function catchUpSteps(lastAt, now) {
  const ms = now - (lastAt || now);
  if (!(ms > 0)) return 0;
  const capped = Math.min(ms, MAX_CATCHUP_H * 3600 * 1000);
  return Math.floor(capped / (STEP_SEC * 1000));
}

/**
 * 한 노동자가 한 스텝(60초) 동안 해내는 작업 횟수 — 작업 시간 + 이동 근사(MOVE_SEC).
 *   소수점은 호출부가 carry 로 이어 붙인다(0.5회씩 두 스텝 = 1회).
 */
export function worksPerStep(grade, shelter = false, stepSec = STEP_SEC) {
  return stepSec / (workSecOf(grade, shelter) + MOVE_SEC);
}

/** 이름 풀 — [[ui-copy-review-first]] 검수 대상(스펙 §10). 직군과 무관하게 섞어 쓴다 */
export const NAME_POOL = ['들풀', '이삭', '도토리', '밀짚', '햇살', '두둑', '고랑', '나래', '텃골', '알밤', '수수', '보리'];

/** 오늘 후보 — 날짜 시드(hash)로 전원 동일. 같은 날 새로고침해도 같은 명단 */
export function candidatesFor(hash, n = CANDIDATE_N) {
  const out = [];
  for (let k = 0; k < n; k++) {
    const h = Math.abs((hash | 0) + k * 7919);
    out.push({ job: JOBS[h % JOBS.length].id, name: NAME_POOL[(h >> 3) % NAME_POOL.length] + (1 + ((h >> 7) % 9)) });
  }
  return out;
}
