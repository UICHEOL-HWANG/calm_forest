// =============================================================
//  calm forest · 계측 모듈 (경제 원장 + 세션 요약)
//  ------------------------------------------------------------
//  ▶ [경제 원장] 코인 증감을 전부 {source,item,amount,balance}로 기록
//    - 5초 배치로 Supabase econ_logs 전송 + GA4 econ_tx 이벤트
//    - 잔액(balance)까지 남겨 시점별 경제 상태 복원 가능(ML 피처)
//  ▶ [세션 요약] 모든 GA4 이벤트 발생 횟수를 onTrack 훅으로 집계,
//    60초 주기 + 탭 숨김/종료 시 session_logs 1행 upsert
//    (좌표 로그 풀스캔 없이 세션 단위 피처를 바로 쓰기 위함)
//  ▶ 오프라인이면 supabase-client 가 콘솔 폴백 — 게임 진행 영향 없음
// =============================================================

import { sendEconBatch, upsertSessionRow } from './supabase-client.js?v=6';
import { trackEvent, onTrack } from './analytics.js?v=6';

// ── 경제 원장 ────────────────────────────────────────────────
let econBuffer = [];               // 전송 대기 원장 행
let econTimer = null;

// [기록 API] 코인 증감 시 호출 — amount: +획득/-소비, balance: 거래 후 잔액
export function logEcon(source, item, amount, balance) {
  econBuffer.push({ source, item, currency: 'coins', amount, balance });
  trackEvent('econ_tx', { source, item, amount, balance }); // [GA4] 경제 흐름(퍼널·A/B 비교용)
  if (!econTimer) econTimer = setInterval(flushEcon, 5000);  // 첫 거래 때 배치 시작
}

function flushEcon() {
  if (!econBuffer.length) return;
  const batch = econBuffer; econBuffer = [];   // 즉시 스왑(전송 중 유실 방지)
  sendEconBatch(batch);
}

// ── 세션 카운터 — GA4 이벤트 이름별 발생 횟수(자동 집계) ─────────
//    새 이벤트를 추가해도 카운터에 자동 포함됨. econ_tx 는 원장이 원본이므로 제외.
const counts = {};
const startedAt = Date.now();
onTrack((name) => { if (name !== 'econ_tx' && name !== 'session_summary') counts[name] = (counts[name] || 0) + 1; });

// ── 세션 요약 upsert ─────────────────────────────────────────
let snapshotFn = null;     // game.js 가 넘겨주는 현재 상태 콜백 { coins, place, x, z }
let sumTimer = null;
let summarySent = false;   // GA4 session_summary 중복 방지(탭 숨김 후 종료 등)

function summaryRow() {
  const snap = snapshotFn?.() || {};
  return {
    play_sec: Math.round((Date.now() - startedAt) / 1000),
    counts,                                   // jsonb — 이벤트별 횟수
    coins: snap.coins ?? 0,
    last_place: snap.place || 'village',
    last_x: snap.x ?? 0, last_z: snap.z ?? 0,
    started_at: new Date(startedAt).toISOString(),
  };
}

// final=true(탭 숨김/종료): 원장 잔여분까지 밀어내고 GA4 요약 이벤트 1회 발사
function flushSummary(final = false) {
  if (!snapshotFn) return;                    // startMetrics 전이면 무시
  flushEcon();                                // 원장 먼저(요약의 coins 와 정합)
  const row = summaryRow();
  upsertSessionRow(row);
  if (final && !summarySent) {
    summarySent = true;
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    trackEvent('session_summary', { play_sec: row.play_sec, total_actions: total, coins: row.coins, last_place: row.last_place });
  }
}

// [시작 API] 게임 시작 시 1회 호출 — getSnapshot: () => ({ coins, place, x, z })
export function startMetrics(getSnapshot) {
  if (snapshotFn) return;                     // 중복 시작 방지
  snapshotFn = getSnapshot;
  sumTimer = setInterval(() => flushSummary(false), 60000);  // 60초 주기 upsert
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushSummary(true);
    else summarySent = false;                 // 복귀하면 다음 이탈 때 다시 요약 발사
  });
  window.addEventListener('beforeunload', () => flushSummary(true));
}
