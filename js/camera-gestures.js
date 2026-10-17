// =============================================================
//  calm forest · 🎥 카메라 조작 입력(터치 두 손가락 · 휠 · 우클릭 드래그 · 키)
//  ------------------------------------------------------------
//  ▶ 상태·수식은 camera-user.js(순수). 여기는 DOM 이벤트를 그 함수들로 잇기만 한다.
//  ▶ 조이스틱과 안 싸우는 규칙(중요):
//    두 손가락 모두 **게임 캔버스에서 시작**했을 때만 카메라 제스처로 본다 — canvas 의 targetTouches 만 센다.
//    조이스틱(#joy-base)·액션 버튼·메뉴에서 시작한 손가락은 그 요소가 target 이라 여기 안 잡힌다.
//    → 조이스틱으로 걸으면서 다른 손가락으로 화면을 탭/드래그해도 줌이 안 된다.
//  ▶ 데스크톱: 캔버스 위 휠 = 줌, Shift+휠 · 우클릭 드래그 · [ ] = 기울기, - = 키 = 줌.
//    메뉴 위 휠은 target 이 메뉴라 캔버스 리스너에 안 온다(메뉴 스크롤 그대로).
// =============================================================

import {
  classifyTwoFinger, effectivePitch, pitchFromDrag, withTilt, withZoom, zoomFromPinch, zoomFromWheel,
} from './camera-user.js';

/**
 * @param {object} o
 * @param {HTMLElement} o.canvas  게임 캔버스(renderer.domElement)
 * @param {() => boolean} o.enabled  지금 플레이어 카메라를 만질 수 있나(마을·야외 기본 추적 중)
 * @param {() => {zoom:number, tilt:number|null}} o.get
 * @param {(s:object) => void} o.set   제스처 도중 매번(즉시 반영)
 * @param {(s:object, how:string) => void} o.commit  제스처가 끝났을 때 1회(저장·GA4)
 * @param {(e:KeyboardEvent) => boolean} [o.keyOk]  키 입력을 받아도 되나(입력칸 등 제외)
 */
export function initCameraGestures(o) {
  const { canvas } = o;
  const g = { lastMultiAt: -1e9, active: null };
  let wheelTimer = null, wheelHow = 'wheel';

  const pt = (t) => ({ x: t.clientX, y: t.clientY });
  const two = (list) => (list.length === 2 ? [list[0], list[1]] : null);
  // 같은 손가락 쌍을 identifier 로 다시 찾는다(순서가 바뀌어 들어와도)
  const pair = (list, ida, idb) => {
    let a = null, b = null;
    for (const t of list) { if (t.identifier === ida) a = t; else if (t.identifier === idb) b = t; }
    return a && b ? [a, b] : null;
  };

  const endGesture = () => {
    const a = g.active; g.active = null;
    if (a && a.mode) o.commit(o.get(), a.mode);
  };

  canvas.addEventListener('touchstart', (e) => {
    const tt = e.targetTouches;   // 캔버스에서 시작한 손가락만(조이스틱·버튼 손가락은 빠진다)
    if (tt.length >= 2 && o.enabled()) g.lastMultiAt = performance.now();
    if (g.active) { if (tt.length > 2) endGesture(); return; }   // 세 번째 손가락 = 그만(오작동 방지)
    const p = two(tt);
    if (!p || !o.enabled()) return;
    const s = o.get();
    g.active = {
      ida: p[0].identifier, idb: p[1].identifier, a0: pt(p[0]), b0: pt(p[1]),
      d0: Math.hypot(p[1].clientX - p[0].clientX, p[1].clientY - p[0].clientY),
      zoom0: s.zoom, pitch0: effectivePitch(s), mode: null,
    };
  }, { passive: true });

  canvas.addEventListener('touchmove', (e) => {
    const A = g.active; if (!A) return;
    if (!o.enabled()) { endGesture(); return; }
    const p = pair(e.targetTouches, A.ida, A.idb); if (!p) return;
    const a = pt(p[0]), b = pt(p[1]);
    if (!A.mode) {
      A.mode = classifyTwoFinger(A.a0, A.b0, a, b);
      if (!A.mode) return;
      // 판단이 선 지점부터 상대량을 잰다 — 보류 구간(슬롭)만큼 튀지 않게
      A.a0 = a; A.b0 = b; A.d0 = Math.hypot(b.x - a.x, b.y - a.y);
      const s = o.get(); A.zoom0 = s.zoom; A.pitch0 = effectivePitch(s);
      return;
    }
    const s = o.get();
    if (A.mode === 'pinch') o.set(withZoom(s, zoomFromPinch(A.zoom0, A.d0, Math.hypot(b.x - a.x, b.y - a.y))));
    else {
      const dy = ((a.y - A.a0.y) + (b.y - A.b0.y)) / 2;
      o.set(withTilt(s, pitchFromDrag(A.pitch0, dy, window.innerHeight)));
    }
  }, { passive: true });

  const touchEnd = (e) => {
    const A = g.active; if (!A) return;
    if (!pair(e.targetTouches, A.ida, A.idb)) endGesture();
  };
  canvas.addEventListener('touchend', touchEnd, { passive: true });
  canvas.addEventListener('touchcancel', touchEnd, { passive: true });

  // ── 데스크톱: 휠 ──
  const wheelCommit = () => { wheelTimer = null; o.commit(o.get(), wheelHow); };
  canvas.addEventListener('wheel', (e) => {
    if (!o.enabled() || e.ctrlKey) return;     // ctrl+휠(트랙패드 핀치=브라우저 확대)은 건드리지 않는다
    e.preventDefault();
    const s = o.get();
    const dy = e.deltaY || e.deltaX;            // Shift+휠은 브라우저가 가로(deltaX)로 바꿔 보낸다
    const scale = e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? 400 : 1;
    if (e.shiftKey) { o.set(withTilt(s, effectivePitch(s) + dy * scale * 0.04)); wheelHow = 'wheel_tilt'; }
    else { o.set(withZoom(s, zoomFromWheel(s.zoom, dy * scale))); wheelHow = 'wheel'; }
    clearTimeout(wheelTimer); wheelTimer = setTimeout(wheelCommit, 450);
  }, { passive: false });

  // ── 데스크톱: 우클릭 드래그 = 기울기 ──
  let drag = null;
  canvas.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 2 || !o.enabled()) return;
    drag = { id: e.pointerId, y0: e.clientY, pitch0: effectivePitch(o.get()), moved: false };
    try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dy = e.clientY - drag.y0;
    if (Math.abs(dy) > 2) drag.moved = true;
    o.set(withTilt(o.get(), pitchFromDrag(drag.pitch0, dy, window.innerHeight)));
  });
  const dragEnd = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const moved = drag.moved; drag = null;
    if (moved) o.commit(o.get(), 'drag_tilt');
  };
  canvas.addEventListener('pointerup', dragEnd);
  canvas.addEventListener('pointercancel', dragEnd);

  // ── 데스크톱: 키 — [ ] 기울기 · - = 줌(게임이 안 쓰는 키) ──
  const KEYS = { BracketLeft: ['t', -3], BracketRight: ['t', 3], Minus: ['z', 1.08], Equal: ['z', 1 / 1.08] };
  let keyTimer = null;
  window.addEventListener('keydown', (e) => {
    const k = KEYS[e.code]; if (!k || e.ctrlKey || e.metaKey || e.altKey) return;
    if (!o.enabled() || (o.keyOk && !o.keyOk(e))) return;
    const s = o.get();
    o.set(k[0] === 't' ? withTilt(s, effectivePitch(s) + k[1]) : withZoom(s, s.zoom * k[1]));
    e.preventDefault();
    clearTimeout(keyTimer); keyTimer = setTimeout(() => o.commit(o.get(), 'key'), 600);
  });

  return {
    /** since 이후 캔버스에서 두 손가락이 닿았나 — 첫 손가락의 탭 액션을 무를지 판단 */
    multiSince: (since) => g.lastMultiAt >= since,
    gestureActive: () => !!(g.active || drag),
    cancel: () => { g.active = null; drag = null; },
  };
}
