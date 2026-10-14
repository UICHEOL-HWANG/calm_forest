// 🧪 패널 배치 시안 주입기 — 가로 폰에서 도감·문의 같은 큰 창 배치를 비교 캡처(배포 코드 아님)
// 사용: window.__panelVariant('P1'|'P2'|'P3'|'now', '#dex-modal')
(() => {
  const css = `
  /* 공통 — 카드는 세로 꽉, 제목 위 고정, 버튼줄 아래 고정, 가운데만 스크롤 */
  .pv .tut-card { display: flex !important; flex-direction: column; overflow: hidden !important; padding: 0 !important; animation: none !important; text-align: left; }
  .pv .tut-card > h2 { flex: 0 0 auto; margin: 0; padding: 12px 52px 10px 16px; font-size: 16px; border-bottom: 1px solid rgba(0,0,0,.06); position: relative; }
  .pv .tut-card > .market-hint { display: none; }
  .pv #dex-sections { flex: 1 1 auto; min-height: 0; overflow-y: auto; padding: 8px 14px; }
  .pv #dex-guest { flex: 0 0 auto; margin: 0 12px 10px; padding: 8px 10px !important; display: flex !important; align-items: center; gap: 8px; font-size: 12px; text-align: left; }
  .pv #dex-guest br { display: none; }
  .pv #dex-guest button { margin: 0 0 0 auto !important; white-space: nowrap; padding: 6px 10px; font-size: 12px; }
  .pv .dm-actions { display: none !important; }
  .pv .pv-x { position: absolute; top: 8px; right: 10px; width: 32px; height: 32px; border-radius: 50%; border: none; background: rgba(0,0,0,.06); font-size: 15px; color: #555; z-index: 2; }
  .pv .dex-grid { gap: 6px !important; }
  .pv .dex-item { padding: 6px 4px !important; }
  /* P1 — 오른쪽 사이드 시트: 왼쪽 게임 화면은 그대로 보인다 */
  .pv-P1 { display: block !important; background: rgba(20,30,25,.25) !important; }
  .pv-P1 .tut-card { position: absolute; top: 8px; right: max(8px, env(safe-area-inset-right)); bottom: 8px; width: min(440px, 54vw) !important; max-height: none !important; border-radius: 20px !important; }
  .pv-P1 .dex-item { width: calc((100% - 18px) / 4) !important; }
  /* P2 — 가운데 넓은 카드: 화면 높이 꽉, 칸을 가로로 많이 */
  .pv-P2 .tut-card { width: min(760px, 92vw) !important; height: calc(100dvh - 16px); max-height: none !important; border-radius: 20px !important; }
  .pv-P2 .dex-item { width: calc((100% - 30px) / 6) !important; }
  /* P3 — 전체 화면: 게임 화면을 완전히 덮는 앱 화면 */
  .pv-P3 { padding: 0 !important; }
  .pv-P3 .tut-card { width: 100vw !important; height: 100dvh; max-height: none !important; border-radius: 0 !important; padding-left: env(safe-area-inset-left) !important; padding-right: env(safe-area-inset-right) !important; }
  .pv-P3 .dex-item { width: calc((100% - 36px) / 7) !important; }
  `;
  document.getElementById('panel-variant-css')?.remove();
  const st = document.createElement('style'); st.id = 'panel-variant-css'; st.textContent = css;
  document.head.appendChild(st);

  window.__panelVariant = (v, sel = '#dex-modal') => {
    const m = document.querySelector(sel);
    m.classList.remove('pv', 'pv-P1', 'pv-P2', 'pv-P3');
    m.querySelector('.pv-x')?.remove();
    if (v === 'now') return;
    m.classList.add('pv', 'pv-' + v);
    const h = m.querySelector('.tut-card > h2');
    if (h) { const x = document.createElement('button'); x.className = 'pv-x'; x.textContent = '✕'; x.setAttribute('aria-label', '닫기'); h.appendChild(x); }
  };
})();
