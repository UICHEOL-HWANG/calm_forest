// 🧪 코치 시안 주입기 — 실제 게임 화면에서 #coach 를 시안별로 바꿔 캡처한다(배포 코드 아님)
// 사용: window.__coachVariant('A'|'B'|'C'|'now', { step: 2 })
(() => {
  const STEPS = 17;
  const SAMPLE = {
    goal: '1장 · 🏠 내 집 짓기',
    text: '③ 🪓도끼(2)로 나무를 베면 집 지을 🪵목재가 나와요',
    short: '🪓 나무를 베면 🪵목재',
  };
  const css = `
  #coach.vA, #coach.vB, #coach.vC { border: none; gap: 0; padding: 0; overflow: hidden; }
  /* 자리 — 세로 폰: 컨텍스트 슬롯(12,162) 폭 전체(오른쪽 버튼 열은 145px 위에서 끝난다) · 가로 폰: 상단 바 아래 가운데 */
  #coach.vA, #coach.vB { top: calc(162px + var(--top-inset)); left: 12px; right: 12px; transform: none; max-width: none; }
  #coach.vC { top: calc(162px + var(--top-inset)); left: 12px; transform: none; max-width: calc(100vw - 24px); }
  @media (orientation: landscape) and (max-height: 500px) {
    #coach.vA, #coach.vB, #coach.vC { top: calc(72px + var(--top-inset)); left: 50%; right: auto; transform: translateX(-50%); }
    #coach.vA { width: min(440px, 52vw); }
    #coach.vB { width: min(400px, 48vw); }
  }
  /* A — 한 줄 띠: 진행 숫자 + 문장 1~2줄 + 바닥에 얇은 진행선 */
  #coach.vA { flex-direction: column; align-items: stretch; text-align: left; border-radius: 16px;
    background: rgba(255,253,246,.94); box-shadow: 0 6px 18px rgba(30,50,40,.18); min-width: 0; }
  #coach.vA .row { display: flex; align-items: center; gap: 9px; padding: 8px 8px 8px 10px; }
  #coach.vA .num { flex: 0 0 auto; font: 800 11px/1 system-ui; color: #2f7d54; background: #e3f4e8; border-radius: 999px; padding: 5px 7px; }
  #coach.vA .tx { flex: 1 1 auto; min-width: 0; font-size: 13px; font-weight: 700; line-height: 1.3;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  #coach.vA .x { flex: 0 0 auto; width: 26px; height: 26px; border: none; border-radius: 50%; background: rgba(0,0,0,.06); color: #6b6b6b; font-size: 13px; }
  #coach.vA .bar { height: 4px; background: rgba(47,125,84,.12); }
  #coach.vA .bar i { display: block; height: 100%; background: linear-gradient(90deg,#6fd08c,#ffab3d); border-radius: 0 4px 4px 0; }
  /* B — 진행바 카드: 지금 구조 유지, 점 17개 → 막대 하나 + "3 / 17" */
  #coach.vB { flex-direction: column; align-items: stretch; text-align: left; border: 2px solid var(--mint); padding: 10px 12px 9px; gap: 7px; border-radius: 18px; }
  #coach.vB .goal { font-size: 11px; font-weight: 800; color: #2f7d54; }
  #coach.vB .tx { font-size: 13.5px; font-weight: 700; line-height: 1.35; }
  #coach.vB .foot { display: flex; align-items: center; gap: 8px; }
  #coach.vB .bar { flex: 1 1 auto; height: 6px; border-radius: 999px; background: rgba(0,0,0,.08); overflow: hidden; }
  #coach.vB .bar i { display: block; height: 100%; background: #6fd08c; border-radius: 999px; }
  #coach.vB .cnt { font: 800 11px/1 system-ui; color: #8a8a8a; }
  #coach.vB .skip { border: none; background: none; font-size: 11px; color: #8a8a8a; text-decoration: underline; padding: 0; }
  /* C — 접는 칩: 평소엔 작은 칩(링 진행 + 짧은 문구), 탭하면 펼침 */
  #coach.vC { flex-direction: row; align-items: center; gap: 8px; padding: 6px 12px 6px 6px; border-radius: 999px;
    background: rgba(255,253,246,.95); box-shadow: 0 6px 18px rgba(30,50,40,.18); text-align: left; }
  #coach.vC .ring { flex: 0 0 auto; width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center;
    background: conic-gradient(#6fd08c var(--p), rgba(0,0,0,.08) 0); }
  #coach.vC .ring b { width: 26px; height: 26px; border-radius: 50%; background: #fffdf6; display: grid; place-items: center; font: 800 9px/1 system-ui; color: #2f7d54; }
  #coach.vC .tx { font-size: 13px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  #coach.vC .chev { flex: 0 0 auto; color: #9a9a9a; font-size: 12px; }
  #coach.vC.open { flex-direction: column; align-items: stretch; border-radius: 18px; padding: 10px 12px; gap: 6px; }
  #coach.vC.open .head { display: flex; align-items: center; gap: 8px; }
  #coach.vC.open .full { font-size: 13.5px; font-weight: 700; line-height: 1.35; }
  #coach.vC.open .skip { align-self: flex-start; border: none; background: none; font-size: 11px; color: #8a8a8a; text-decoration: underline; padding: 0; }
  `;
  document.getElementById('coach-variant-css')?.remove();
  const st = document.createElement('style'); st.id = 'coach-variant-css'; st.textContent = css;
  document.head.appendChild(st);

  window.__coachVariant = (v, { step = 2, open = false } = {}) => {
    const el = document.getElementById('coach');
    const pct = Math.round(((step + 1) / STEPS) * 100);
    el.className = 'panel show';
    el.removeAttribute('style');
    document.body.classList.add('coaching');
    const body = SAMPLE.text.slice(2);
    if (v === 'now') {
      el.innerHTML = `<div id="coach-goal">${SAMPLE.goal}</div><div id="coach-text">${SAMPLE.text}</div>
        <div id="coach-dots">${Array.from({ length: STEPS }, (_, i) => `<span class="${i < step ? 'done' : i === step ? 'cur' : ''}">●</span>`).join('')}</div>
        <button id="coach-skip">건너뛰기</button>`;
      return;
    }
    el.classList.add('v' + v);
    if (v === 'A') el.innerHTML = `<div class="row"><span class="num">${step + 1}/${STEPS}</span><span class="tx">${body}</span><button class="x" aria-label="건너뛰기">✕</button></div><div class="bar"><i style="width:${pct}%"></i></div>`;
    if (v === 'B') el.innerHTML = `<div class="goal">${SAMPLE.goal}</div><div class="tx">${body}</div><div class="foot"><div class="bar"><i style="width:${pct}%"></i></div><span class="cnt">${step + 1} / ${STEPS}</span><button class="skip">건너뛰기</button></div>`;
    if (v === 'C') {
      el.style.setProperty('--p', pct + '%');
      if (open) el.classList.add('open');
      el.innerHTML = open
        ? `<div class="head"><span class="ring"><b>${step + 1}/${STEPS}</b></span><span style="font:800 11px system-ui;color:#2f7d54">${SAMPLE.goal}</span></div><div class="full">${body}</div><button class="skip">건너뛰기</button>`
        : `<span class="ring"><b>${step + 1}/${STEPS}</b></span><span class="tx">${SAMPLE.short}</span><span class="chev">▾</span>`;
    }
  };
})();
