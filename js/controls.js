// =============================================================
//  calm forest · 모바일/터치 컨트롤 (가상 조이스틱 + 액션 버튼)
//  ------------------------------------------------------------
//  ▶ 데스크톱: 키보드(WASD/방향키)·마우스 클릭 그대로 사용
//  ▶ 모바일/터치: 좌측 가상 조이스틱으로 이동, 우측 버튼으로 액션.
//    game.js 의 Input API 로 아날로그 벡터/액션을 전달합니다.
// =============================================================

import { Input } from './game.js?v=28';

// 터치 지원 여부 감지 → 모바일 컨트롤 노출
export function initControls() {
  const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  const mobileUI = document.getElementById('mobile-controls');
  if (!isTouch) { mobileUI.style.display = 'none'; return; }
  mobileUI.style.display = 'block';
  document.body.classList.add('is-touch');

  setupJoystick();
  setupActionButton();
  // 터치 중 화면 스크롤/줌 방지 — 단, 스크롤 가능한 UI(가방·도감 등 메뉴) 안에서 시작한
  // 제스처는 살려서 손가락으로 내릴 수 있게 한다(전역 preventDefault가 메뉴 스크롤까지 죽이는 문제 방지)
  const inScrollable = (el) => {
    for (let n = el instanceof Element ? el : null; n && n !== document.body; n = n.parentElement) {
      const s = getComputedStyle(n);
      if ((s.overflowY === 'auto' || s.overflowY === 'scroll') && n.scrollHeight > n.clientHeight + 1) return true;
    }
    return false;
  };
  let scrollGesture = false;   // 이번 터치 제스처가 스크롤 영역에서 시작했는지(touchstart에서 1회 판정)
  document.addEventListener('touchstart', (e) => { scrollGesture = inScrollable(e.target); }, { passive: true });
  document.addEventListener('touchmove', (e) => {
    if (scrollGesture) return;                          // 메뉴 스크롤 허용
    if (e.touches.length > 0) e.preventDefault();       // 게임 월드: 페이지 팬/바운스 차단
  }, { passive: false });
}

// ── 가상 조이스틱 ────────────────────────────────────────────
function setupJoystick() {
  const base = document.getElementById('joy-base');
  const knob = document.getElementById('joy-knob');
  const R = 46;          // 조이스틱 반경(px)
  let active = false, cx = 0, cy = 0, id = null;

  const start = (t) => {
    active = true; id = t.identifier;
    const r = base.getBoundingClientRect();
    cx = r.left + r.width / 2; cy = r.top + r.height / 2;
    move(t);
  };
  const move = (t) => {
    if (!active) return;
    let dx = t.clientX - cx, dy = t.clientY - cy;
    const len = Math.hypot(dx, dy);
    if (len > R) { dx *= R / len; dy *= R / len; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    // 화면 좌표 dy(+아래) → 월드 z(+아래로 이동)와 일치
    Input.setAnalog(dx / R, dy / R);
  };
  const end = () => {
    active = false; id = null;
    knob.style.transform = 'translate(0,0)';
    Input.setAnalog(0, 0);   // 손 떼면 정지
  };

  base.addEventListener('touchstart', (e) => { start(e.changedTouches[0]); e.preventDefault(); }, { passive: false });
  base.addEventListener('touchmove', (e) => {
    for (const t of e.changedTouches) if (t.identifier === id) move(t);
    e.preventDefault();
  }, { passive: false });
  base.addEventListener('touchend', (e) => {
    for (const t of e.changedTouches) if (t.identifier === id) end();
  });
  base.addEventListener('touchcancel', end);
}

// ── 액션 버튼(선택 도구로 상호작용) ─────────────────────────────
function setupActionButton() {
  const btn = document.getElementById('action-btn');
  btn.addEventListener('touchstart', (e) => { Input.doAction(); btn.classList.add('press'); e.preventDefault(); }, { passive: false });
  btn.addEventListener('touchend', () => btn.classList.remove('press'));
}
