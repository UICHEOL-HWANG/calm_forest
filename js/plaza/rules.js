// js/plaza/rules.js
// =============================================================
//  🌾 수확제 광장 — 순수 계산(게임 상태·DOM·네트워크 없음). tests/plaza-rules.test.mjs
// =============================================================
import { PLAZA_TIERS, PLAZA_OPENS_KST, PLAZA_LEAF_COINS, PLAZA, PLAZA_R, PLAZA_PATH, PLAZA_ARCH } from '../data/plaza.js';

const MAX_VISUAL = 4;   // 0 = 없음, 1~3 = 공사 단계, 4 = 완공
const TIER_IDS = new Set(PLAZA_TIERS.map(t => t.id));

export function tierOf(total) {
  const t = PLAZA_TIERS.find(x => total >= x.min);
  return t ? t.id : null;
}

export function nextTier(total) {
  const up = [...PLAZA_TIERS].reverse().find(x => total < x.min);
  return up ? { id: up.id, left: up.min - total } : null;
}

export function seasonPhase(p, nowMs) {
  if (!p || !p.starts_at || !p.ends_at) return 'before';
  if (nowMs < Date.parse(p.starts_at)) return 'before';
  if (nowMs >= Date.parse(p.ends_at)) return 'after';
  return 'active';
}

export function donateMax(have, todayLeft, itemLeft) {
  return Math.max(0, Math.min(have | 0, todayLeft | 0, itemLeft | 0));
}

export function currentItems(p) {
  if (!p || p.completed) return [];
  return p.items.filter(i => i.stage === p.stage)
    .map(({ item, have, need }) => ({ item, have, need }))
    .sort((a, b) => a.item.localeCompare(b.item));
}

const clampStage = (n) => Math.max(0, Math.min(MAX_VISUAL, Number.isInteger(n) ? n : 0));

export function visualStage(p, cachedStage) {
  if (!p) return clampStage(cachedStage);
  if (p.started === false) return 0;
  if (p.completed) return MAX_VISUAL;
  return clampStage(p.stage);
}

export function leafToCoins(n) {
  return Number.isInteger(n) && n > 0 ? n * PLAZA_LEAF_COINS : 0;
}

export function plazaDefault() {
  return { lastStage: 0, claimed: {}, invited: '', converted: {}, seen: {} };
}

const plainObj = (o) => (o && typeof o === 'object' && !Array.isArray(o) ? o : {});
const onlyTrue = (o) => Object.fromEntries(Object.entries(plainObj(o)).filter(([, v]) => v === true));

export function restorePlaza(saved) {
  if (!saved || typeof saved !== 'object') return plazaDefault();
  return {
    lastStage: clampStage(saved.lastStage),
    claimed: Object.fromEntries(Object.entries(plainObj(saved.claimed)).filter(([, v]) => TIER_IDS.has(v))),
    invited: typeof saved.invited === 'string' ? saved.invited : '',
    converted: onlyTrue(saved.converted),
    seen: onlyTrue(saved.seen),
  };
}

export function siteOpen(nowMs) {
  return nowMs >= Date.parse(`${PLAZA_OPENS_KST}T00:00:00+09:00`);
}

export function plazaBlocks(x, z, pad = 2) {
  if (Math.hypot(x - PLAZA.x, z - PLAZA.z) < PLAZA_R + pad) return true;
  if (Math.hypot(x - PLAZA_ARCH.x, z - PLAZA_ARCH.z) < 2.0) return true;   // 🌾 입구 아치
  return PLAZA_PATH.some(([px, pz]) => Math.hypot(x - px, z - pz) < 1.4);
}

// 🌾 plaza_stage_seen 발사 여부 — 세이브 복원 전엔 절대 emit 하지 않는다(부팅 순서 함정: initPlaza() 가
//   applySave() 보다 먼저 돌아 gameState.plaza 가 기본값(seen {})일 때 판정하면, 복원된 세이브가 그 판정을
//   덮어써 매번 재발송된다). 순수 함수라 부팅 순서·트래킹 호출은 index.js 가 이 결과만 보고 판단한다.
export function stageSeenPlan(plazaState, stage, season, { saveRestored = false, debug = false } = {}) {
  const key = `stage${stage}:${season}`;
  const already = !!(plazaState && plazaState.seen && plazaState.seen[key]);
  const emit = saveRestored && !debug && stage > 0 && !already;
  return { emit, key };
}

// 🚪 세이브 복원 게이트 — 첫 play 프레임에 연다. applySave() 가 저장이 있을 때만 호출되므로
//   (오프라인·신규 게스트·failed_fresh 는 load.state 가 null 이라 applySave 자체가 안 돈다) 그 호출을
//   신호로 못 쓴다. 대신 mode('attract'→'play')로 게이트를 열면 저장이 있든 없든(없으면 최초 선언된
//   plazaDefault() 가 이미 정답이다) 모든 부팅 경로에서 정확히 한 번만 열린다.
export function gateOpens(saveRestored, mode) {
  return !saveRestored && mode === 'play';
}
