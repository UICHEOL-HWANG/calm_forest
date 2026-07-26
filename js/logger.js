// =============================================================
//  calm forest · 센서/행동 데이터 로거 (Debounce/Throttle + 배치)
//  ------------------------------------------------------------
//  ▶ [센서 데이터 수집 지점] 3D 행동 데이터를 주기적으로 수집:
//    - 마우스 이동 좌표 (mouse_x, mouse_y)
//    - 캐릭터 위치 (char_x, char_y, char_z)
//    - 카메라 각도 (cam_yaw, cam_pitch)
//  ▶ throttle 로 샘플을 모아 1~2초 간격 배치로 Supabase 전송
//    (game_logs). 오프라인이면 supabase-client 가 콘솔로 폴백.
// =============================================================

import { CONFIG } from './config.js';
import { sendLogBatch } from './supabase-client.js';

let buffer = [];              // 전송 대기 샘플 버퍼
let lastSampleAt = 0;         // throttle 기준 시각
let flushTimer = null;

// 최신 마우스 좌표(정규화 -1~1). game.js 의 pointer 와 별개로 원시 좌표 저장용.
const mouse = { x: 0, y: 0 };
window.addEventListener('pointermove', (e) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});

// [수집 API] game.js 렌더 루프에서 매 프레임 호출 → throttle 로 샘플링
//   getSnapshot(): { char:{x,y,z}, cam:{yaw,pitch} } 를 돌려주는 콜백
export function sampleFrame(getSnapshot) {
  const now = performance.now();
  if (now - lastSampleAt < CONFIG.LOG_SAMPLE_THROTTLE_MS) return; // throttle
  lastSampleAt = now;

  const snap = getSnapshot();
  buffer.push({
    mouse_x: mouse.x,
    mouse_y: mouse.y,
    char_x: round(snap.char.x),
    char_y: round(snap.char.y),
    char_z: round(snap.char.z),
    cam_yaw: round(snap.cam.yaw),
    cam_pitch: round(snap.cam.pitch),
  });
}

function round(n) { return Math.round(n * 1000) / 1000; }

// [배치 전송] 일정 주기마다 버퍼를 비우며 전송
export function startLogging() {
  if (flushTimer) return;
  flushTimer = setInterval(async () => {
    if (buffer.length === 0) return;
    const batch = buffer;
    buffer = [];                 // 즉시 스왑(전송 중 유실 방지)
    await sendLogBatch(batch);   // 오프라인이면 내부에서 콘솔 폴백
  }, CONFIG.LOG_FLUSH_INTERVAL_MS);

  // 페이지 이탈 시 남은 버퍼 마지막 전송 시도
  window.addEventListener('beforeunload', () => {
    if (buffer.length) sendLogBatch(buffer);
  });
}

export function stopLogging() {
  clearInterval(flushTimer);
  flushTimer = null;
}
