// =============================================================
//  calm forest · 🏠 집 건축(0→3) 비용표와 판정
//  ------------------------------------------------------------
//  2026-09-21 리밸런스 — 베타 피드백 "만들고 집 업데이트 하는 게 너무 쉽다".
//  예전엔 단계마다 목재 10 하나뿐(총 30 = 나무 10그루 = 마을 안에서 끝)이었다.
//  같은 나무를 더 오래 베게 하는 대신 **재료를 넓혀** 채광·판매를 거치게 만든다.
//
//  ⚠️ 1단계(데크)는 **목재만** 이어야 한다.
//     튜토리얼 build 스텝이 1단계만 요구하는데, 베타 A군 순서(TUT_ORDER_A)에서는
//     build 가 mine 보다 앞이라 돌을 요구하면 튜토리얼이 막힌다.
//
//  🪙 코인은 3단계(지붕)에만, 80 으로 둔다 — econ_logs 측정(2026-09-21)에서
//     진성 유저(2일+)는 통과하지만 증축 총액(1270)은 일반 유저 도달 0명이었다.
//     그래서 증축 코인은 올리지 않았고, 여기도 80 을 넘기지 않는다.
//
//  THREE 비의존 — 노드에서 잠근다(tests/house-cost.test.mjs).
// =============================================================
import { HAMMER_EXPAND_RATE } from './tool-tiers.js';

/** 단계별 재료. 키 순서가 곧 표시 순서다(🪵 → 🪨 → 🪙). */
export const BUILD_STAGES = [
  { stage: 1, name: '나무 바닥(데크)', cost: { wood: 15 } },
  { stage: 2, name: '통나무 벽',       cost: { wood: 20, stone: 10 } },
  { stage: 3, name: '지붕',            cost: { wood: 25, stone: 15, coins: 80 } },
];

export const MAX_BUILD_STAGE = BUILD_STAGES.length;   // 건축 마지막 단계(=증축 시작 지점)

/** 단계 이름만 뽑은 배열 — `STAGE_NAMES[n]` 처럼 1-기반으로 읽는다(0 은 빈 문자열). */
export const STAGE_NAMES = ['', ...BUILD_STAGES.map(s => s.name)];

/**
 * 🏗️ 증축(3단계 완성 후). 건축과 같은 파일에 두어 집 수치가 한 곳에서 읽힌다.
 * ⚠️ 코인은 **올리지 않는다** — econ_logs 측정(2026-09-21)에서 증축 9건이 전부 베타 테스터였고,
 *    일반 유저 중 증축 총액(1270)을 벌어본 사람이 0명(최대 497)이었다. 이미 벽이라 더 올리면 닫힌다.
 *    목재는 시간만 쓰면 반드시 모이므로 "벽"이 아니라 "길이"다 — 그래서 목재로만 대응한다.
 *    2026-09-10 리디자인(코인 80/200/450 → 120/350/800)은 그대로 둔다.
 */
export const EXPANSIONS = [
  { stage: 4, name: '브릭 로프트', ico: '🧱', cost: { wood: 45, stone: 15, coins: 120 } },
  { stage: 5, name: '펜트하우스', ico: '🏢', cost: { wood: 75, stone: 30, coal: 10, coins: 350 } },
  { stage: 6, name: '루프탑 빌라', ico: '🏝️', cost: { wood: 120, stone: 50, gem: 3, coins: 800 } },
];

export const MAX_HOUSE_STAGE = EXPANSIONS[EXPANSIONS.length - 1].stage;

/**
 * 🔨 묵직한 망치 — 목재만 30% 깎는다(증축의 expandWoodOf 와 같은 비율).
 * ⚠️ 돌·코인은 건드리지 않는다. 망치는 목공 도구이고, 코인을 깎으면
 *    후반 싱크(2026-09-10 리밸런스)를 스스로 되돌린다.
 */
export function buildNeed(state = {}, k, v) {
  return (k === 'wood' && state.upgrades?.hammer) ? Math.ceil(v * HAMMER_EXPAND_RATE) : v;
}

/**
 * 다음 건축 단계의 재료 현황. **증축(expandInfo)과 같은 items 형태**를 돌려주어
 * 간판·토스트·버튼이 건축/증축을 한 벌의 코드로 그릴 수 있게 한다.
 * @returns {{maxed:boolean, next:{stage:number,name:string}|null,
 *            items:{k:string,need:number,have:number,label:string}[], affordable:boolean}}
 */
export function buildInfo(state = {}, labels = {}) {
  const stage = state.houseStage || 0;
  const next = BUILD_STAGES.find(s => s.stage === stage + 1) || null;
  if (!next) return { maxed: true, next: null, items: [], affordable: false };

  const inv = state.inventory || {};
  const items = Object.entries(next.cost).map(([k, v]) => ({
    k, need: buildNeed(state, k, v), have: inv[k] || 0, label: labels[k] || k,
  }));
  return {
    maxed: false,
    next: { stage: next.stage, name: next.name },
    items,
    affordable: items.every(i => i.have >= i.need),
  };
}
