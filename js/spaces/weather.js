// =============================================================
//  🌡️ 날씨 이벤트 — 서리·태풍 예고를 보고 하루 안에 대비하는 재방문 훅
//  ------------------------------------------------------------
//  js/game.js 에서 원문 그대로 옮겨 온 구역(분리 2단계, 2026-09-26).
//  ⚠️ game.js 와 서로 import 한다(순환). 로딩 시점엔 game.js 값을 읽지 않는다 — 함수 안에서만.
//     game.js 에 남은 let 에 쓸 때는 `$w.x = …` (읽기는 그냥 x). 도구·증명: tools/refactor/
// =============================================================
import {
  SEVERE_TODAY, SEVERE_TOMORROW, clayMat, firstHint, gameState, plots, refreshInventoryUI, requestSave, severeOf,
  todayStr, ui, wiltPlot,
} from '../game.js';   // 🔁 순환 import — 함수 안에서만 쓴다(로딩 시점엔 안 읽는다: verify-extract (d))
import { trackEvent } from '../analytics.js';
import { SEVERE_INFO } from '../data/world.js';
import { Sound } from '../sound.js';
import * as THREE from 'three';

export const COVER_COST = { wood: 3 };

// 밭 위 덮개(나무 틀 + 천) — 밭 단위 표시, 보호는 밭 전체(coveredFor 날짜) 단위
export function setPlotCover(plot, show) {
  if (show && !plot.cover) {
    const g = new THREE.Group();
    for (const [x, z] of [[-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.7, 5), clayMat(0x8a6a3a));
      leg.position.set(x, 0.35, z); g.add(leg);
    }
    const cloth = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.06, 1.8),
      new THREE.MeshStandardMaterial({ color: 0xf3ead4, roughness: 0.9, transparent: true, opacity: 0.92 }),
    );
    cloth.position.y = 0.74; g.add(cloth);
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    plot.cover = g; plot.group.add(g);
  }
  if (plot.cover) plot.cover.visible = show;
}

export function refreshCovers() {
  const active = gameState.frost.coveredFor
    && (gameState.frost.coveredFor === todayStr() || gameState.frost.coveredFor === todayStr(1));
  for (const p of plots) setPlotCover(p, !!active && (p.state === 'growing' || p.state === 'mature'));
}

// 작업대 덮개 뷰/제작 — 예고일(내일 궂음)에만 의미가 있다
export function weatherPrepView() {
  return {
    severe: SEVERE_TOMORROW,
    info: SEVERE_TOMORROW ? SEVERE_INFO[SEVERE_TOMORROW] : null,
    planted: plots.filter(p => p.state === 'growing' || p.state === 'mature').length,
    cost: { ...COVER_COST },
    covered: gameState.frost.coveredFor === todayStr(1),
  };
}

export function craftCover() {
  if (!SEVERE_TOMORROW) return { ok: false, msg: '내일은 날씨가 온화해요' };
  if (gameState.frost.coveredFor === todayStr(1)) return { ok: false, msg: '이미 덮개를 설치했어요' };
  for (const k in COVER_COST) {
    if ((gameState.inventory[k] || 0) < COVER_COST[k]) return { ok: false, msg: '목재가 부족해요' };
  }
  for (const k in COVER_COST) gameState.inventory[k] -= COVER_COST[k];
  gameState.frost.coveredFor = todayStr(1);
  refreshInventoryUI(); refreshCovers();
  Sound.blip();
  trackEvent('craft_item', { category: 'weather', item: 'cover' });   // [GA4] 대비 전환율
  requestSave();
  return { ok: true };
}

// 접속 시 1회 — 지난 궂은 날을 정산(밤손님과 같은 패턴, 동기라 서버 불필요)
export function resolveWeatherEvent() {
  const st = gameState.frost;
  const today = todayStr();
  if (!st.lastDate) { st.lastDate = today; refreshCovers(); return; }
  if (st.lastDate === today) { refreshCovers(); return; }
  // 마지막 정산 다음날~오늘 중 가장 최근의 궂은 날 하나만 정산(밤손님과 동일한 단순화)
  const gap = Math.round((new Date(today) - new Date(st.lastDate)) / 86400000);
  let hitDate = null, kind = null;
  for (let off = 0; off < gap; off++) {              // off=0 → 오늘, 1 → 어제 …
    const k = off === 0 ? SEVERE_TODAY : severeOf(-off);
    if (k) { hitDate = todayStr(-off); kind = k; break; }
  }
  st.lastDate = today;
  const exposed = plots.filter(p => p.state === 'growing' || p.state === 'mature');
  if (!kind || !exposed.length) { st.coveredFor = null; refreshCovers(); requestSave(); return; }

  const s = SEVERE_INFO[kind];
  if (st.coveredFor === hitDate) {
    // 대비가 통했다는 피드백 — "준비하길 잘했다"가 다음 대비를 만든다
    setTimeout(() => ui.toast?.(`${s.ico} ${s.name}가 지나갔지만 🛡️ 덮개 덕분에 밭이 무사해요!`, 3200), 900);
    trackEvent('weather_event', { kind, protected: true, plots: exposed.length });   // [GA4]
  } else {
    exposed.forEach(wiltPlot);
    setTimeout(() => {
      ui.toast?.(`${s.ico} ${s.hit} 작물 ${exposed.length}개가 시들었어요… ⛏️ 괭이로 갈면 다시 심을 수 있어요`, 3800);
      firstHint('severe', s.ico, `${s.name}가 지나갔어요`,
        '예보가 뜬 날엔 미리 수확하거나 🛡️덮개를\n시든 밭은 ⛏️괭이로 갈면 다시 심어요');
    }, 900);
    trackEvent('weather_event', { kind, protected: false, plots: exposed.length });  // [GA4]
  }
  st.coveredFor = null;
  refreshCovers();
  requestSave();
}
