import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  JOBS, GRADES, HIRE_COST, WORK_SEC, MOVE_SEC, STEP_SEC, MAX_CATCHUP_H, HAUL_N,
  gradeOf, toNextGrade, skillsOf, hasPerk, workSecOf, dailyWage, settleWages,
  pickTask, storageLeft, catchUpSteps, worksPerStep, candidatesFor, releaseCandidate, NAME_POOL,
} from '../js/farm-worker.js';

test('표: 직군 3종 · 등급 3단 — 스펙 §3 수치 그대로', () => {
  assert.deepEqual(JOBS.map(j => j.id), ['mole', 'hamster', 'squirrel']);
  assert.deepEqual(GRADES.map(g => g.wage), [15, 30, 55]);
  assert.deepEqual(GRADES.map(g => g.need), [0, 120, 400]);
  assert.deepEqual(GRADES.map(g => g.mult), [1.0, 0.8, 0.65]);
  assert.equal(HIRE_COST, 120); assert.equal(WORK_SEC, 8); assert.equal(MOVE_SEC, 4); assert.equal(MAX_CATCHUP_H, 12);
});

test('gradeOf / toNextGrade: 120 · 400 경계', () => {
  assert.equal(gradeOf(0), 0); assert.equal(gradeOf(119), 0); assert.equal(gradeOf(120), 1);
  assert.equal(gradeOf(399), 1); assert.equal(gradeOf(400), 2); assert.equal(gradeOf(99999), 2);
  assert.equal(gradeOf(undefined), 0, '세이브에 없으면 견습');
  assert.equal(toNextGrade(0), 120); assert.equal(toNextGrade(120), 280); assert.equal(toNextGrade(400), null);
});

test('skillsOf: 💧물주기는 전원 공통 · 등급까지 누적 해금', () => {
  assert.deepEqual(skillsOf('mole', 0), ['water', 'till']);
  assert.deepEqual(skillsOf('mole', 1), ['water', 'till', 'fert']);
  assert.deepEqual(skillsOf('mole', 2), ['water', 'till', 'fert', 'weed']);
  assert.deepEqual(skillsOf('hamster', 2), ['water', 'harvest', 'plant'], '장인 칸이 특전이면 기술은 안 는다');
  assert.deepEqual(skillsOf('squirrel', 1), ['water', 'haul', 'pest']);
  assert.deepEqual(skillsOf('없는직군', 0), ['water', 'till'], '이상값은 첫 직군');
});

test('hasPerk: 장인만 · 직군별 하나', () => {
  assert.equal(hasPerk('hamster', 2, 'yield'), true);
  assert.equal(hasPerk('hamster', 1, 'yield'), false, '숙련은 특전 없음');
  assert.equal(hasPerk('squirrel', 2, 'speed'), true);
  assert.equal(hasPerk('squirrel', 2, 'yield'), false);
  assert.equal(hasPerk('mole', 2, 'yield'), false, '두더지는 특전 대신 기술 3개');
});

test('workSecOf / worksPerStep: 등급 배율 · 🏚️쉼터 15% · 이동 근사 포함', () => {
  assert.equal(workSecOf(0), 8); assert.equal(workSecOf(1), 8 * 0.8); assert.equal(workSecOf(2), 8 * 0.65);
  assert.ok(workSecOf(0, true) < workSecOf(0), '쉼터 반경이면 빨라진다');
  assert.equal(+workSecOf(0, true).toFixed(3), +(8 / 1.15).toFixed(3));
  // 견습: (8+4)=12초당 1회 → 60초에 5회
  assert.equal(worksPerStep(0), 5);
  assert.ok(worksPerStep(2) > worksPerStep(0), '장인이 더 많이 한다');
  assert.equal(+worksPerStep(2).toFixed(3), +(STEP_SEC / (8 * 0.65 + 4)).toFixed(3));
});

test('dailyWage / settleWages: 장인 6명 = 🪙330 · 모자라면 비싼 사람부터 휴식 · 빚 없음', () => {
  const masters = Array.from({ length: 6 }, (_, i) => ({ id: 'w' + i, job: 'mole', grade: 2 }));
  assert.equal(dailyWage(masters), 330, '스펙 §3-4 의 기준선');

  const ws = [{ id: 'a', grade: 2 }, { id: 'b', grade: 0 }];   // 55 + 15 = 70
  const ok = settleWages(ws, 100);
  assert.equal(ok.paid, 70); assert.equal(ok.coins, 30); assert.deepEqual(ok.resting, []);

  const tight = settleWages(ws, 60);   // 장인 55 먼저 → 견습 15 는 못 준다
  assert.equal(tight.paid, 55); assert.equal(tight.coins, 5);
  assert.deepEqual(tight.resting, ['b']);

  const none = settleWages(ws, 0);
  assert.equal(none.paid, 0); assert.deepEqual(none.resting.sort(), ['a', 'b']);

  const backAgain = settleWages([{ id: 'a', grade: 0, restingSince: 111 }], 20);
  assert.deepEqual(backAgain.back, ['a'], '코인이 생기면 다음 정산에 복귀');
  assert.deepEqual(backAgain.resting, []);
});

const P = (i, o = {}) => ({ i, state: 'growing', weed: false, pest: false, fert: false, wet: false, wiltAt: 999, claimedBy: null, ...o });
const W = (job, grade = 0, id = 'w1') => ({ id, job, grade });

test('pickTask 1순위: 💧 목마른 밭 — 시들기 임박한 순, 잡초 밭은 건너뛴다', () => {
  const world = { plots: [P(0, { wiltAt: 500 }), P(1, { wiltAt: 100 }), P(2, { wet: true })], emptyCells: 9, seeds: 9, fertStock: 9, storageLeft: 9, pending: 9 };
  assert.deepEqual(pickTask(W('hamster'), world), { type: 'water', i: 1 }, '가장 급한 밭부터');
  const weedy = { ...world, plots: [P(0, { weed: true, wiltAt: 1 }), P(1, { wiltAt: 300 })] };
  assert.deepEqual(pickTask(W('hamster'), weedy), { type: 'water', i: 1 }, '잡초 밭은 물을 줘도 안 자란다');
});

test('pickTask: 예약(claimedBy)된 밭은 남의 것이면 건너뛴다', () => {
  const world = { plots: [P(0, { wiltAt: 10, claimedBy: 'other' }), P(1, { wiltAt: 50 })], emptyCells: 0, seeds: 0, fertStock: 0, storageLeft: 0, pending: 0 };
  assert.deepEqual(pickTask(W('hamster'), world), { type: 'water', i: 1 });
  assert.deepEqual(pickTask(W('hamster', 0, 'other'), world), { type: 'water', i: 0 }, '내가 잡은 밭은 이어서 한다');
});

test('pickTask 2~7순위: 기술 있는 일만 · 재고/창고 조건', () => {
  const base = { plots: [], emptyCells: 0, seeds: 0, fertStock: 0, storageLeft: 0, pending: 0 };
  // 🌿 잡초는 장인 두더지만
  const weedW = { ...base, plots: [P(0, { weed: true, wet: true })] };
  assert.equal(pickTask(W('mole', 1), weedW), null, '숙련 두더지는 아직 김매기 못 한다');
  assert.deepEqual(pickTask(W('mole', 2), weedW), { type: 'weed', i: 0 });
  // 🐛 해충은 숙련 다람쥐부터
  const pestW = { ...base, plots: [P(0, { pest: true, wet: true })] };
  assert.equal(pickTask(W('squirrel', 0), pestW), null);
  assert.deepEqual(pickTask(W('squirrel', 1), pestW), { type: 'pest', i: 0 });
  // 🌾 수확은 창고 자리가 있어야
  const ripe = { ...base, plots: [P(0, { state: 'mature' })] };
  assert.equal(pickTask(W('hamster', 0), ripe), null, '창고가 가득하면 수확을 멈춘다');
  assert.deepEqual(pickTask(W('hamster', 0), { ...ripe, storageLeft: 5 }), { type: 'harvest', i: 0 });
  // 🌰 심기는 숙련 햄스터 + 씨앗
  const empty = { ...base, plots: [P(0, { state: 'tilled' })] };
  assert.equal(pickTask(W('hamster', 1), empty), null, '씨앗이 없으면 못 심는다');
  assert.deepEqual(pickTask(W('hamster', 1), { ...empty, seeds: 3 }), { type: 'plant', i: 0 });
  // 🌱 비료는 숙련 두더지 + 비료 재고
  const grow = { ...base, plots: [P(0, { wet: true })] };
  assert.equal(pickTask(W('mole', 1), grow), null);
  assert.deepEqual(pickTask(W('mole', 1), { ...grow, fertStock: 2 }), { type: 'fert', i: 0 });
  // ⛏️ 갈기 · 🧺 운반은 밭 인덱스가 없다
  assert.deepEqual(pickTask(W('mole', 0), { ...base, emptyCells: 4 }), { type: 'till', i: -1 });
  assert.deepEqual(pickTask(W('squirrel', 0), { ...base, pending: 7, storageLeft: 3 }), { type: 'haul', i: -1 });
  assert.equal(pickTask(W('squirrel', 0), { ...base, pending: 7, storageLeft: 0 }), null, '창고가 가득하면 나를 곳이 없다');
  // 할 일 없음
  assert.equal(pickTask(W('hamster', 2), base), null);
});

test('pickTask: 물주기가 특기보다 먼저다(전원 공통이 1순위)', () => {
  const world = { plots: [P(0, { state: 'mature' }), P(1, { wiltAt: 40 })], emptyCells: 5, seeds: 5, fertStock: 5, storageLeft: 5, pending: 5 };
  assert.deepEqual(pickTask(W('hamster', 2), world), { type: 'water', i: 1 });
});

test('storageLeft: 여러 채면 용량 합산 · 넘치면 0', () => {
  assert.equal(storageLeft({ wheat: 10, honey: 5 }, 60), 45);
  assert.equal(storageLeft({}, 0), 0, '창고가 없으면 자리도 없다');
  assert.equal(storageLeft({ wheat: 100 }, 60), 0, '음수가 되지 않는다');
  assert.equal(HAUL_N, 10);
});

test('catchUpSteps: 60초 스텝 · 12시간 상한 · 시계 되감기는 0', () => {
  const now = 1_700_000_000_000;
  assert.equal(catchUpSteps(now - 59_000, now), 0, '한 스텝이 안 차면 0');
  assert.equal(catchUpSteps(now - 60_000, now), 1);
  assert.equal(catchUpSteps(now - 3600_000, now), 60);
  assert.equal(catchUpSteps(now - 24 * 3600_000, now), MAX_CATCHUP_H * 60, '12시간 상한');
  assert.equal(catchUpSteps(now + 5_000_000, now), 0, '미래 저장(시계 조작)은 0');
  assert.equal(catchUpSteps(0, now), 0, '첫 정산(lastSettleAt 없음)은 소급하지 않는다');
  assert.equal(catchUpSteps(undefined, now), 0);
});

test('candidatesFor: 같은 시드 = 같은 명단(전원 동일) · 이름 풀 안', () => {
  const a = candidatesFor(12345), b = candidatesFor(12345);
  assert.deepEqual(a, b);
  assert.equal(a.length, 3);
  for (const c of a) {
    assert.ok(JOBS.some(j => j.id === c.job), '직군은 표 안');
    assert.ok(NAME_POOL.some(n => c.name.startsWith(n)), `이름 풀 안 (${c.name})`);
  }
  assert.notDeepEqual(candidatesFor(1), candidatesFor(2), '날짜가 바뀌면 명단도 바뀐다');
});

test('releaseCandidate: 내보낸 일꾼의 자리를 게시판에 되돌린다(재고용)', () => {
  const cands = [{ job: 'mole', name: '이삭3' }, { job: 'hamster', name: '보리1' }, { job: 'squirrel', name: '알밤7' }];
  assert.deepEqual(releaseCandidate([0, 2], { name: '이삭3', job: 'mole' }, cands), [2], '내보낸 사람 자리만 열린다');
  assert.deepEqual(releaseCandidate([0, 2], { name: '보리1', job: 'hamster' }, cands), [0, 2], '고용한 적 없는 후보는 그대로');
  assert.deepEqual(releaseCandidate([0], { name: '이삭3', job: 'hamster' }, cands), [0], '이름이 같아도 직군이 다르면 남의 자리');
  assert.deepEqual(releaseCandidate([0, 1], { name: '이삭3', job: 'mole' }, [cands[0], cands[0], cands[2]]), [1], '같은 사람이 둘이면 한 칸만');
  const taken = [0, 2];
  releaseCandidate(taken, { name: '이삭3', job: 'mole' }, cands);
  assert.deepEqual(taken, [0, 2], '원본 배열은 건드리지 않는다');
  assert.deepEqual(releaseCandidate(undefined, {}, cands), [], '세이브에 없으면 빈 명단');
  assert.deepEqual(releaseCandidate([0, 'x', null], { name: '이삭3', job: 'mole' }, cands), [], '조작 세이브의 이상값은 버린다');
});
