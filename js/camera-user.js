// =============================================================
//  calm forest · 🎥 플레이어 카메라(줌·기울기) — 순수 모델
//  ------------------------------------------------------------
//  ▶ 마을·야외 공간의 기본 추적 카메라(game.js camOffset)를 손가락/휠로 조절한다.
//    여기는 THREE·DOM 없이 숫자만 다룬다(node --test 로 검증). 제스처 해석은 camera-gestures.js.
//  ▶ 상태 { zoom, tilt }
//    · zoom : 거리 배수(1 = 지금 그대로). 0.7(가까이) ~ 1.5(멀리)
//    · tilt : 피치(도) 또는 null. null = 플레이어가 아직 기울기를 안 만졌다 → 줌에 따라 자동 피치
//             (멀리 볼수록 살짝 눕혀 수평선·세계수가 들어온다 — 동물의 숲식). 기울기를 한 번이라도
//             만지면 그 값이 이긴다(자동 결합 꺼짐). 28° ~ 60°.
//  ▶ 기본값(zoom 1, tilt null)은 예전 오프셋 (0,14,16) 을 **정확히** 돌려준다 — 안 만지면 아무것도 안 바뀐다.
//  ▶ 저장: 기기별 localStorage(클라우드 세이브 아님). 접근이 막힌 웹뷰에서도 조용히 기본값.
// =============================================================

export const BASE_OFFSET = Object.freeze({ x: 0, y: 14, z: 16 });
export const BASE_DIST = Math.hypot(BASE_OFFSET.y, BASE_OFFSET.z);                     // ≈21.26
export const BASE_PITCH = Math.atan2(BASE_OFFSET.y, BASE_OFFSET.z) * 180 / Math.PI;    // ≈41.19°
export const ZOOM_MIN = 0.7, ZOOM_MAX = 1.5;
export const PITCH_MIN = 28, PITCH_MAX = 60;
// 줌아웃 결합: zoom 1 → 기본 피치, zoom 1.5 → 기본보다 AUTO_DROP° 낮게(≈35°). 줌인은 피치를 안 바꾼다.
export const AUTO_DROP = 6;
export const STORE_KEY = 'cf.camUser.v1';
const EPS = 1e-6;

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const finite = (v) => typeof v === 'number' && Number.isFinite(v);

export function defaultCam() { return { zoom: 1, tilt: null, yaw: 0 }; }

export function wrapYaw(v) {
  if (v > -180 && v <= 180) return v;
  const w = ((v + 180) % 360 + 360) % 360 - 180;
  return w === -180 ? 180 : w;
}

/** 값 정리 — 저장소·제스처에서 들어온 어떤 값이든 범위 안으로 */
export function normalizeCam(s) {
  const zoom = finite(s?.zoom) ? clamp(s.zoom, ZOOM_MIN, ZOOM_MAX) : 1;
  const tilt = finite(s?.tilt) ? clamp(s.tilt, PITCH_MIN, PITCH_MAX) : null;
  const yaw = finite(s?.yaw) ? wrapYaw(s.yaw) : 0;
  return { zoom, tilt, yaw };
}

/** 줌에 딸린 자동 피치(기울기를 안 만졌을 때) */
export function autoPitch(zoom) {
  const z = clamp(zoom, ZOOM_MIN, ZOOM_MAX);
  if (z <= 1) return BASE_PITCH;
  const t = (z - 1) / (ZOOM_MAX - 1);
  return BASE_PITCH - AUTO_DROP * t * t * (3 - 2 * t);   // smoothstep — 시작은 거의 그대로, 끝에서 눕는다
}

/** 지금 실제로 쓰는 피치(도) */
export function effectivePitch(s) {
  return s.tilt == null ? autoPitch(s.zoom) : clamp(s.tilt, PITCH_MIN, PITCH_MAX);
}

export function isDefaultCam(s) {
  return Math.abs(s.zoom - 1) < 1e-3 && (s.tilt == null || Math.abs(s.tilt - BASE_PITCH) < 0.05) && Math.abs(s.yaw || 0) < 0.5;
}

/** 상태 → 카메라 오프셋(포커스 기준, +z = 남쪽). out 을 주면 거기에 채운다(THREE.Vector3 도 됨). */
export function camOffsetFor(s, out = { x: 0, y: 0, z: 0 }) {
  const zoom = clamp(s.zoom, ZOOM_MIN, ZOOM_MAX);
  const pitch = effectivePitch(s);
  const yaw = finite(s.yaw) ? s.yaw : 0;
  if (Math.abs(zoom - 1) < EPS && Math.abs(pitch - BASE_PITCH) < EPS && Math.abs(yaw) < EPS) {   // 기본값은 예전 숫자 그대로(부동소수 오차 없이)
    out.x = BASE_OFFSET.x; out.y = BASE_OFFSET.y; out.z = BASE_OFFSET.z; return out;
  }
  const r = pitch * Math.PI / 180, d = BASE_DIST * zoom;
  const h = d * Math.cos(r), y = yaw * Math.PI / 180;
  out.x = h * Math.sin(y); out.y = d * Math.sin(r); out.z = h * Math.cos(y);
  return out;
}

/** 줌을 바꾼다(기울기 상태는 유지) */
export function withZoom(s, zoom) { return normalizeCam({ zoom, tilt: s.tilt, yaw: s.yaw }); }
/** 기울기를 바꾼다 — 이 순간부터 자동 결합은 꺼진다 */
export function withTilt(s, pitch) { return normalizeCam({ zoom: s.zoom, tilt: pitch, yaw: s.yaw }); }
export function withYaw(s, yaw) { return normalizeCam({ zoom: s.zoom, tilt: s.tilt, yaw }); }

export function moveToWorld(mx, mz, yawDeg) {
  if (!yawDeg) return { x: mx, z: mz };
  const y = yawDeg * Math.PI / 180, c = Math.cos(y), sn = Math.sin(y);
  return { x: mx * c + mz * sn, z: -mx * sn + mz * c };
}

// ── 저장(기기별) ───────────────────────────────────────────────
export function loadCam(storage) {
  try {
    const raw = storage?.getItem(STORE_KEY);
    if (!raw) return defaultCam();
    return normalizeCam(JSON.parse(raw));
  } catch (_) { return defaultCam(); }
}
export function saveCam(storage, s) {
  try {
    if (isDefaultCam(s)) storage?.removeItem(STORE_KEY);
    else storage?.setItem(STORE_KEY, JSON.stringify({ zoom: +s.zoom.toFixed(3), tilt: s.tilt == null ? null : +s.tilt.toFixed(2), yaw: +(s.yaw || 0).toFixed(1) }));
  } catch (_) { /* 사파리 프라이빗·웹뷰 차단 — 이번 세션만 유지 */ }
}

// ── 제스처 해석(두 손가락) ─────────────────────────────────────
//  시작 시점 두 점(a0,b0)과 지금 두 점(a,b)으로 의도를 가른다. 한 번 정해진 모드는 손을 뗄 때까지 유지.
//  · pinch : 두 손가락 사이 거리가 변한다
//  · tilt  : 두 손가락이 **같은 방향**으로 위/아래로 움직이고 거리는 거의 그대로
export const GESTURE_SLOP = 14;   // px — 이보다 작게 움직이면 아직 판단 보류
export function classifyTwoFinger(a0, b0, a, b) {
  const d0 = Math.hypot(b0.x - a0.x, b0.y - a0.y), d = Math.hypot(b.x - a.x, b.y - a.y);
  const dd = Math.abs(d - d0);
  const ay = a.y - a0.y, by = b.y - b0.y;
  const sameDir = ay * by > 0;
  const my = (ay + by) / 2;
  if (sameDir && Math.abs(my) > GESTURE_SLOP && Math.abs(my) > dd * 1.2) return 'tilt';
  const arc = Math.abs(angleDiff(fingerAngle(a0, b0), fingerAngle(a, b))) * Math.PI / 180 * d / 2;
  if (arc > GESTURE_SLOP && arc > dd * 1.2) return 'rotate';
  if (dd > GESTURE_SLOP) return 'pinch';
  return null;
}
export function fingerAngle(a, b) { return Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI; }
export function angleDiff(from, to) { return wrapYaw(to - from); }
export function yawFromTwist(yaw0, ang0, ang) { return wrapYaw(yaw0 + angleDiff(ang0, ang)); }

/** 핀치 비율 → 줌. 벌리면(비율>1) 가까이(줌↓) */
export function zoomFromPinch(zoom0, d0, d) {
  if (!(d0 > 0) || !(d > 0)) return clamp(zoom0, ZOOM_MIN, ZOOM_MAX);
  return clamp(zoom0 * d0 / d, ZOOM_MIN, ZOOM_MAX);
}
/** 세로 드래그(px, +아래) → 피치. 위로 밀면 눕고(수평선 쪽), 아래로 당기면 내려다본다. 화면 높이의 45% = 전체 범위 */
export function pitchFromDrag(pitch0, dyPx, viewH) {
  const span = Math.max(200, (viewH || 800) * 0.45);
  return clamp(pitch0 + dyPx * (PITCH_MAX - PITCH_MIN) / span, PITCH_MIN, PITCH_MAX);
}
/** 휠 한 칸 → 줌 배수(deltaY +면 멀리). 트랙패드의 잘게 쪼갠 델타도 같은 감도. */
export function zoomFromWheel(zoom, deltaY) {
  return clamp(zoom * Math.exp(clamp(deltaY, -240, 240) * 0.0008), ZOOM_MIN, ZOOM_MAX);
}
