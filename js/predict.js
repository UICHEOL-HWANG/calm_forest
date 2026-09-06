// =============================================================
//  calm forest · 세션 이탈 예측 — 트리거 판정 · 추론 호출 · 개입
//  ------------------------------------------------------------
//  설계서: docs/superpowers/specs/2026-09-04-churn-intervention-design.md §6~§8
//
//  ▶ 피처 계산은 features.js(순수 함수), 점수는 서버(lab.calmforest.cloud/predict).
//  ▶ 무엇을 띄울지는 모델이 아니라 규칙이다 — 미완 여부는 gameState 에 사실로 있다.
//  ▶ 전원 점수화, 세션 단위로 무작위 배정된 treat 군만 개입(arm) — 베타 번들 A/B(variant)와 독립.
//  ▶ 실패는 전부 조용히 넘어간다(fail-open). 배너 하나 못 띄우는 게 손해의 전부다.
//
//  ⚠️ platform.js 를 import 하지 않는다 — experiment 브랜치에 그 파일이 없다.
// =============================================================
import { computeFeatures, WINDOW_SIZE } from './features.js';

/**
 * 무엇을 띄울지 정하는 규칙. 모델을 쓰지 않는다.
 * 1순위 미완 짚기 → 2순위 아직 안 해본 것.
 * @returns {{ico:string,title:string,line:string}|null} 권할 게 없으면 null
 */
export function pickIntervention(gs) {
  if (!gs) return null;

  // 1순위 — 이미 벌여놓고 안 끝낸 것
  if (gs.plantedUnwatered > 0) return { ico: '💧', title: '물 줄 때가 됐어요', line: '심어둔 작물이 목말라요.' };
  if (gs.openQuests > 0)       return { ico: '📜', title: '받아둔 부탁이 있어요', line: '마을 사람이 기다리는 중이에요.' };
  if (gs.buildableHouse)       return { ico: '🏠', title: '집을 지을 수 있어요', line: '재료가 다 모였어요.' };

  // 2순위 — 아직 안 해본 것 중 흔한 것(전역 인기순 고정 목록)
  const done = new Set(gs.doneKinds || []);
  const candidates = [
    ['chop_tree',    { ico: '🪓', title: '나무를 베어볼까요', line: '집 재료가 돼요.' }],
    ['fish_success', { ico: '🎣', title: '낚시 어때요',       line: '물가에서 던져보세요.' }],
    ['harvest',      { ico: '🌾', title: '수확할 게 있어요',   line: '밭을 살펴보세요.' }],
    ['cook',         { ico: '🍳', title: '요리해볼까요',       line: '주방에서 만들 수 있어요.' }],
    ['carve',        { ico: '🗿', title: '조각을 해볼까요',    line: '작업대에서 깎을 수 있어요.' }],
    ['mine',         { ico: '⛏️', title: '광석을 캐볼까요',    line: '동굴에 광맥이 있어요.' }],
  ];
  for (const [kind, banner] of candidates) if (!done.has(kind)) return banner;
  return null;   // 다 해봤다 — 띄울 게 없다
}

/** 예측기. 의존성을 전부 주입받는다(테스트에서 네트워크·게임 없이 돌리기 위해). */
export function createPredictor(deps) {
  const {
    getWindow, fetchImpl, session, showBanner, track, endpoint,
    maxPerSession = 2, timeoutMs = 800,
  } = deps;
  // ⚠️ gameState 는 여기서 destructure 하지 않는다 — Task 9 는 deps.gameState 를
  // getter(`get gameState() {...}`)로 넘긴다. 지금 구조분해하면 getter 가 생성 시점에
  // 딱 한 번 평가되어 그 이후 트리거마다 페이지 로드 시점 상태로 굳어버린다.
  // 반드시 매 onTrigger 호출마다 deps.gameState 를 다시 읽는다.

  let shownCount = 0;

  async function onTrigger(kind) {
    const rows = getWindow();

    // 윈도가 덜 찼으면 학습 때와 다른 입력이 된다 — 점수를 내지 않는다.
    if (!rows || rows.length < WINDOW_SIZE) {
      track('churn_score', { trigger: kind, skipped: 'window', variant: session.variant, arm: session.arm });
      return;
    }

    let feats;
    try {
      feats = computeFeatures(rows, { isFirstSession: !!session.isFirstSession, triggerKind: kind });
    } catch (e) {
      track('churn_score', { trigger: kind, skipped: 'features', variant: session.variant, arm: session.arm });
      return;
    }

    // 규칙 베이스라인 — "트리거 도달 = 무조건 개입". 모델과 비교하려고 같이 남긴다.
    const rule = true;

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    let res = null;
    try {
      const r = await fetchImpl(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          features: feats,
          trigger: kind,
          session_id: session.id,
          client_id: session.clientId,
          variant: session.variant,
          arm: session.arm,
        }),
        signal: ctrl.signal,
        keepalive: true,        // 세션이 곧 끝날 수 있다 — 언로드 중에도 나가게
      });
      if (r && r.ok) res = await r.json();
    } catch (e) {
      // 네트워크·타임아웃·중단 — 전부 조용히 넘어간다(fail-open)
    } finally {
      clearTimeout(timer);
    }

    if (!res) {
      track('churn_score', { trigger: kind, failed: true, rule, variant: session.variant, arm: session.arm });
      return;
    }

    // 전원 점수화, 세션 단위로 배정된 treat 군만 개입
    let shown = false;
    if (res.intervene && session.arm === 'treat' && shownCount < maxPerSession) {
      const banner = pickIntervention(deps.gameState);
      if (banner) { showBanner(banner); shownCount++; shown = true; }
    }

    track('churn_score', {
      p: res.p, trigger: kind, rule, variant: session.variant, arm: session.arm,
      shown, threshold: res.threshold, model_version: res.model_version,
    });
  }

  return { onTrigger, reset() { shownCount = 0; } };
}

/**
 * 게임 런타임 값 → pickIntervention 이 읽는 모양.
 * game.js 의 내부 구조를 predict.js 가 알지 않도록 여기서 한 번 번역한다.
 * @param {{plots?:Array, questStates?:Array, houseStage?:number, maxHouseStage?:number,
 *          houseReady?:boolean, dex?:Object}} src
 */
export function buildGameStateSnapshot(src = {}) {
  const plots = src.plots || [];
  const questStates = src.questStates || [];
  const dex = src.dex || {};

  // 도감 카테고리 → 개입 후보의 kind. 비어있지 않으면 '해봤다'로 친다.
  const DEX_TO_KIND = { fish: 'fish_success', crop: 'harvest', ore: 'mine', cook: 'cook' };
  const doneKinds = [];
  for (const [cat, kind] of Object.entries(DEX_TO_KIND)) {
    if (dex[cat] && Object.keys(dex[cat]).length > 0) doneKinds.push(kind);
  }
  if ((src.houseStage || 0) > 0) doneKinds.push('chop_tree');   // 집을 지었으면 벌목은 했다

  return {
    plantedUnwatered: plots.filter(p => p && p.state === 'growing' && !p.watered).length,
    openQuests: questStates.filter(st => st && st.acceptedAt != null).length,
    buildableHouse: !!src.houseReady && (src.houseStage || 0) < (src.maxHouseStage || 0),
    doneKinds,
  };
}
