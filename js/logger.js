// =============================================================
//  calm forest · 센서/행동 데이터 로거 (Debounce/Throttle + 배치)
//  ------------------------------------------------------------
//  ▶ [센서 데이터 수집 지점] 3D 행동 데이터를 주기적으로 수집:
//    - 마우스 이동 좌표 (mouse_x, mouse_y)
//    - 캐릭터 위치 (char_x, char_y, char_z)
//    - 카메라 각도 (cam_yaw, cam_pitch)
//  ▶ throttle 로 샘플을 모아 outbox(메모리+localStorage)에 넣고 5초→15초→30초 간격으로 game_logs 에 보낸다.
//    탭 숨김·페이지 이탈 때는 저장 후 keepalive 로 즉시. 서버가 받은 행만 지운다(js/log-shipper.js).
//    스펙: dev/active/sensor-log-durability/sensor-log-durability-plan.md
// =============================================================

import { CONFIG, IS_DEV_SESSION } from './config.js';
import { postGameLogs, logRowContext, currentLogAuth } from './supabase-client.js';
import { createOutbox, createShipper, flushDelay, OUTBOX_KEY } from './log-shipper.js';
import { pushSample } from './window-buffer.js';   // [🎯 이탈 예측] 트리거용 롤링 윈도

const IMMEDIATE_ROWS = 200;    // 이만큼 쌓이면 주기를 기다리지 않고 보낸다(keepalive 64KB 안)
const IMMEDIATE_GAP_MS = 10_000;   // 단, 10초에 한 번까지 — 전송이 계속 실패할 때 샘플마다 요청이 나가지 않게
let lastImmediateAt = 0;
let lastTokenSeen = null;
let lastSampleAt = 0;         // throttle 기준 시각
let flushTimer = null;
let flushCount = 0;
let outbox = null;
let shipper = null;
let lastLogged = null;        // 직전 기록 샘플(변화 감지용)
let lastHeartbeat = 0;        // 정지 상태에서도 가끔 남기는 하트비트 시각
const MOVE_EPS = 0.2;         // 캐릭터가 이만큼 이상 움직여야 기록(월드 단위)
const MOUSE_EPS = 10;         // 마우스가 이만큼(px) 이상 움직여야 기록
const HEARTBEAT_MS = 8000;    // 가만히 있어도 8초에 한 번은 기록(체류 파악용)

// 최신 마우스 좌표(정규화 -1~1). game.js 의 pointer 와 별개로 원시 좌표 저장용.
const mouse = { x: 0, y: 0 };
window.addEventListener('pointermove', (e) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});

// [수집 API] game.js 렌더 루프에서 매 프레임 호출 → throttle 로 샘플링
//   getSnapshot(): { char:{x,y,z}, cam:{yaw,pitch} } 를 돌려주는 콜백
export function sampleFrame(getSnapshot) {
  if (IS_DEV_SESSION) return;                                 // 🧪 dev 세션 — 센서 로그 없음
  const now = performance.now();
  if (now - lastSampleAt < CONFIG.LOG_SAMPLE_THROTTLE_MS) return; // throttle
  lastSampleAt = now;

  const snap = getSnapshot();
  const s = {
    mouse_x: mouse.x,
    mouse_y: mouse.y,
    char_x: round(snap.char.x),
    char_y: round(snap.char.y),
    char_z: round(snap.char.z),
    cam_yaw: round(snap.cam.yaw),
    cam_pitch: round(snap.cam.pitch),
  };

  // 변화 감지: 캐릭터·마우스가 실제로 움직였을 때만 기록(정지 스팸 방지)
  const moved = !lastLogged
    || Math.hypot(s.char_x - lastLogged.char_x, s.char_z - lastLogged.char_z) > MOVE_EPS
    || Math.hypot(s.mouse_x - lastLogged.mouse_x, s.mouse_y - lastLogged.mouse_y) > MOUSE_EPS;
  const heartbeat = now - lastHeartbeat > HEARTBEAT_MS; // 가만히 있어도 8초마다 1행(체류 파악)

  if (!moved && !heartbeat) return;
  if (heartbeat) lastHeartbeat = now;
  lastLogged = s;
  const auth = currentLogAuth();
  if (outbox && auth.uid) {                      // 오프라인·로컬 게스트는 보낼 곳이 없다 — 쌓지 않는다
    if (auth.token !== lastTokenSeen) {          // 토큰은 바뀔 때만 적는다 — 계정이 바뀌기 전에 이전 계정 토큰이 남아 있게
      lastTokenSeen = auth.token;
      outbox.setToken(auth.uid, auth.token, auth.exp);
    }
    outbox.add({ client_row_id: newRowId(), ...logRowContext(), ...s });
    outbox.persistIfDue();
    if (outbox.size() >= IMMEDIATE_ROWS && now - lastImmediateAt >= IMMEDIATE_GAP_MS) {
      lastImmediateAt = now;
      shipper.flush();
    }
  }
  pushSample(s);        // [🎯 이탈 예측] 전송 버퍼와 달리 비워지지 않는 최근 10행
}

function round(n) { return Math.round(n * 1000) / 1000; }

function newRowId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map(x => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

// 현재 계정 토큰 — 보낼 때마다 outbox 에도 적어 둔다(크래시 뒤 다음 실행에서 이전 게스트 행을 보낼 수 있게)
function authForShip() {
  const a = currentLogAuth();
  if (a.uid && a.token) outbox.setToken(a.uid, a.token, a.exp);
  return a;
}

function scheduleNext() {
  flushTimer = setTimeout(async () => {
    await shipper.drain(5);                 // 밀린 게 있으면 몇 묶음 이어서
    flushCount += 1;
    scheduleNext();
  }, flushDelay(flushCount));
}

function flushOnExit() {
  outbox.persistNow();                      // 먼저 기기에 — 전송이 못 나가도 다음 실행에서 보낸다
  shipper.flush({ keepalive: true });
}

// [배치 전송] 5초 → 15초 → 30초 주기 + 화면이 숨겨지거나 페이지를 떠날 때
export function startLogging() {
  if (flushTimer || IS_DEV_SESSION) return;
  let storage = null;
  try { storage = window.localStorage; } catch (e) { /* 막힌 환경 */ }
  outbox = createOutbox({
    storage: storage || { getItem: () => null, setItem() {}, removeItem() {} },
    key: `${OUTBOX_KEY}:${logRowContext().session_id}`,   // 탭(세션)마다 따로
  });
  outbox.adoptOrphans();                    // 끝난 탭·지난 실행이 남긴 행을 데려온다
  shipper = createShipper({ outbox, post: postGameLogs, getAuth: authForShip });
  // 로그아웃 직전(supabase-client 가 토큰을 지우기 전에 보냄) — 마지막으로 보내고 그 계정 흔적을 기기에서 지운다
  window.addEventListener('cf:signout', async (e) => {
    const uid = e.detail?.uid;
    try { await shipper.flush({ keepalive: true }); } catch (err) { /* 남은 건 아래에서 지운다 */ }
    outbox.forget(uid);
  });
  scheduleNext();
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushOnExit(); });
  window.addEventListener('pagehide', flushOnExit);
}

export function stopLogging() {
  clearTimeout(flushTimer);
  flushTimer = null;
}
