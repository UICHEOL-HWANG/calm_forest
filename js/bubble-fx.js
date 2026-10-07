// =============================================================
//  calm forest · 💬 월드 말풍선 연출 — 🐾 밤손님 흔적·🔍 텃밭 방문객이 같이 쓴다
//  ------------------------------------------------------------
//  ▶ 말풍선은 글자 없이 이모지 하나라 "저게 뭐지?" 가 되기 쉽다 → 통통 튀고, 가까이 가면 커지며 부르르 떨고
//    노란 고리가 퍼져 "지금 평소와 다른 일이 있다" 로 읽히게 한다(사용자 요청 2026-10-07).
//  ▶ 밭 알림 배지(js/spaces/farm.js)가 renderOrder 20 + depthTest 끔으로 항상 맨 위에 그려진다 —
//    같은 조건에 순서만 더 높여야 튀어 오른 말풍선이 그 뒤로 숨지 않는다.
//  ▶ 재질은 말풍선마다 따로 둔다 — 흔들기(rotation)·페이드가 재질 값을 직접 쓴다.
// =============================================================
import * as THREE from 'three';

let _ringTex = null;
function ringTexture() {
  if (_ringTex) return _ringTex;
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const c = cv.getContext('2d');
  c.strokeStyle = '#ffd86b'; c.lineWidth = 10; c.beginPath(); c.arc(64, 64, 54, 0, Math.PI * 2); c.stroke();
  _ringTex = new THREE.CanvasTexture(cv);
  _ringTex.colorSpace = THREE.SRGBColorSpace;
  return _ringTex;
}

/** 말풍선을 밭 배지 위로 올린다(깊이 검사 끔 + 렌더 순서 22) */
export function onTop(bubble) { bubble.material.depthTest = false; bubble.renderOrder = 22; return bubble; }

/** 퍼지는 고리 스프라이트 — 말풍선과 같은 부모에 붙인다 */
export function makeRing(y) {
  const ring = new THREE.Sprite(new THREE.SpriteMaterial({ map: ringTexture(), transparent: true, depthWrite: false, fog: false, toneMapped: false, opacity: 0 }));
  ring.material.depthTest = false; ring.renderOrder = 21;
  ring.position.set(0, y - 0.05, 0);
  return ring;
}

/**
 * 한 프레임 — bubble.userData 에 상태(near·phase)를 둔다.
 * @param base   { w, h, y } 평소 크기·높이
 * @param dist   플레이어와의 거리(없으면 99)
 * @param alertR 이 안에 들면 커지고 튄다
 */
export function animateBubble({ bubble, ring, base, dist = 99, alertR, time, dt }) {
  const ud = bubble.userData;
  const want = dist < alertR ? 1 : 0;
  ud.near = (ud.near || 0) + (want - (ud.near || 0)) * Math.min(1, dt * 8);
  const n = ud.near, ph = ud.phase ?? (ud.phase = Math.random() * 6.28);
  const hop = Math.abs(Math.sin(time * (3 + n * 6) + ph));                        // 통통
  const sc = (1 + 0.06 * Math.sin(time * 5 + ph)) * (1 + 0.75 * n) * (1 + 0.12 * n * hop);
  bubble.scale.set(base.w * sc, base.h * sc, 1);
  bubble.position.y = base.y + hop * (0.08 + 0.16 * n) + n * 0.12;
  bubble.material.rotation = Math.sin(time * 14 + ph) * 0.22 * n;                  // 가까이 가면 부르르
  const k = (time * 1.6 + ph) % 1;                                                 // 고리 — 퍼지며 사라지길 반복
  ring.position.y = bubble.position.y - 0.05;
  ring.scale.setScalar((0.5 + k * 1.6) * (1 + 0.4 * n));
  ring.visible = bubble.visible;                                                   // 살펴본 뒤 말풍선을 거두면 고리도 같이
  ring.material.opacity = n * (1 - k) * 0.85 * bubble.material.opacity;            // 페이드 인·아웃을 따라간다
}
