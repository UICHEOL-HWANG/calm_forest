import { Input } from '../game-lazy.js';

let $, ui, startCookCourse;

// ═══════════════ 🍳 자유주방 — 메뉴판 ═══════════════
//  한 요리는 미니게임 여러 판을 이어 치르는 **코스**다. ★ 개수 = 판 수 = 난이도.
//  메뉴판이 "이 요리는 무엇을 몇 판 하는가"를 미리 보여주므로, 플레이어가 난이도를 직접 고른다.
// 🔥 화덕 미니게임 — 걸 때 한 번. 판정은 js/craft/minigame.js(순수)가 하고 여기선 조작만 받는다.
//    3D 무대를 쓰지 않는다: 매일 치르는 조작이라 무대 전환이 거추장스럽다.
const CMG = {
  charcoal: { title: '⚫ 불 조절', tip: '바늘이 초록 구간에 왔을 때 눌러 멈추세요' },
  flour:    { title: '🌾 맷돌 돌리기', tip: '원을 따라 <b>일정하게</b> 돌려요<br>빠르기보다 고르기' },
  brick:    { title: '🧱 반죽 다지기', tip: '꾹 누르고 있다가 초록 구간에서 떼세요' },
  juice:    { title: '🍷 포도 밟기', tip: '링에 맞춰 <b>같은 박자로</b> 6번<br>연타하면 뭉개져요' },
  // 🍎 과수원 과일 가공 — 조작은 원조 품목 것을 빌린다(js/craft/recipes.js mgBaseOf)
  apple_jam:      { title: '🥫 사과잼 졸이기', tip: '꾹 누르고 있다가 초록 구간에서 떼세요' },
  roast_chestnut: { title: '🌰 밤 굽기', tip: '바늘이 초록 구간에 왔을 때 눌러 멈추세요' },
  gotgam:         { title: '🍡 곶감 주무르기', tip: '링에 맞춰 <b>같은 박자로</b> 6번<br>연타하면 뭉개져요' },
};
const GRADE_FACE = ['😅', '🙂', '😋', '💫'];
let cmgRaf = 0, cmgCleanup = null;

function craftMinigame(itemId, onDone) {
  const meta = CMG[itemId]; if (!meta) { onDone(1); return; }
  const kind = Input.craftMgBase(itemId);   // 조작 종류 = 원조 품목 id(charcoal·flour·brick·juice) — 과일 가공은 빌려 쓴다
  $('cmg-title').innerHTML = meta.title;
  $('cmg-tip').innerHTML = meta.tip;
  $('cmg-after').style.display = 'none';
  const stage = $('cmg-stage'); stage.innerHTML = '';
  // 가공 창을 접고 화면을 화덕으로 옮긴다 — 걸 때만 잠깐 클로즈업(요리·조각과 같은 문법)
  $('craft-menu').classList.remove('show');
  Input.craftFocus(true);
  document.body.classList.add('menu-open', 'mg-open');   // 마을 UI 를 걷고 무대에 몰입(요리·조각과 같은 문법)
  $('craft-mg').classList.add('show');

  const finish = (score) => {
    if (cmgRaf) { cancelAnimationFrame(cmgRaf); cmgRaf = 0; }
    cmgCleanup?.(); cmgCleanup = null;
    const grade = Input.craftGrade(score);
    $('cmg-grade').textContent = GRADE_FACE[grade];
    $('cmg-yield').textContent = `${Input.craftYield(itemId, grade)}개가 나와요`;
    $('cmg-after').style.display = '';
    $('cmg-ok').onclick = () => {
      $('craft-mg').classList.remove('show');
      document.body.classList.remove('mg-open');
      Input.craftFocus(false);                       // 마을 카메라로 복귀
      $('craft-menu').classList.add('show');         // 가공 창을 다시 편다
      onDone(grade);
    };
  };

  if (kind === 'flour') {
    // 🌾 맷돌 — 원을 따라 끈 각을 쌓는다. 한 바퀴 반이면 끝.
    stage.innerHTML = '<div class="cmg-wheel"><div class="hub"></div><div class="grip"></div></div>';
    const wheel = stage.querySelector('.cmg-wheel'), grip = stage.querySelector('.grip');
    const R = 72, samples = [];
    let ang = -Math.PI / 2, total = 0, dragging = false, last = ang;
    const put = () => {
      grip.style.left = `${95 + Math.cos(ang) * R}px`;
      grip.style.top = `${95 + Math.sin(ang) * R}px`;
    };
    put();
    const at = e => {
      const r = wheel.getBoundingClientRect();
      const p = e.touches ? e.touches[0] : e;
      return Math.atan2(p.clientY - (r.top + r.height / 2), p.clientX - (r.left + r.width / 2));
    };
    const down = e => { dragging = true; last = at(e); e.preventDefault(); };
    const move = e => {
      if (!dragging) return;
      const a = at(e);
      let d = a - last; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
      last = a; ang = a; total += Math.abs(d); put();
      samples.push({ t: performance.now(), a: total });
      if (total >= Math.PI * 3) { up(); finish(Input.craftScore('flour', samples)); }
    };
    const up = () => { dragging = false; };
    wheel.addEventListener('pointerdown', down); window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
    cmgCleanup = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
  } else if (kind === 'charcoal') {
    // ⚫ 불 조절 — 바늘이 오간다. 초록 구간에서 멈춘다.
    const { half } = Input.craftDiff('charcoal'), target = 0.5;   // 🎚️ 초록 구간 반폭만 흔든다
    stage.innerHTML = `<div class="cmg-bar"><div class="zone"></div><div class="needle"></div></div>
                       <button class="cf-btn go cmg-press">멈추기</button>`;
    const zone = stage.querySelector('.zone'), needle = stage.querySelector('.needle');
    zone.style.left = `${(target - half) * 100}%`; zone.style.width = `${half * 200}%`;
    const t0 = performance.now();
    let pos = 0;
    const tick = () => {
      const t = (performance.now() - t0) / 1000;
      pos = 0.5 + Math.sin(t * 2.4) * 0.48;                 // 좌우로 오감
      needle.style.left = `calc(${pos * 100}% - 2px)`;
      Input.craftFlame(pos);                                // 🔥 실제 화덕의 불이 바늘을 따라 반응한다
      cmgRaf = requestAnimationFrame(tick);
    };
    tick();
    stage.querySelector('button').onclick = () => {
      const score = Input.craftScore('charcoal', { pos, target, half });
      Input.craftFlameBurst(score > 0);                     // 맞으면 확 타오르고 불티, 빗나가면 사그라듦
      finish(score);
    };
  } else if (kind === 'juice') {
    // 🍷 포도 밟기 — 링이 퍼지는 박자에 맞춰 여섯 번. 판정은 간격이라 첫 탭은 기준점이다.
    const TARGET = 520, NEED = 6;
    stage.innerHTML = '<div class="cmg-stomp"><div class="pulse"></div><div class="cnt"></div></div>';
    const pad = stage.querySelector('.cmg-stomp'), cnt = stage.querySelector('.cnt');
    pad.querySelector('.pulse').style.animationDuration = TARGET + 'ms';
    Input.craftDiff('juice');   // 🎚️ 팔만 돌린다 — 허용 오차는 채점할 때 game.js 가 먹인다
    const taps = [];
    cnt.textContent = NEED;
    const down = (e) => {
      e.preventDefault();
      taps.push(performance.now());
      pad.classList.remove('hit'); void pad.offsetWidth; pad.classList.add('hit');   // 재생 중이어도 다시 튄다
      cnt.textContent = Math.max(0, NEED - taps.length);
      Input.craftStomp();                                  // 🫙 실제 통에서 즙이 튄다
      if (taps.length >= NEED) finish(Input.craftScore('juice', taps));
    };
    pad.addEventListener('pointerdown', down);
    cmgCleanup = () => pad.removeEventListener('pointerdown', down);
  } else {
    // 🧱 반죽 — 꾹 눌렀다 목표 구간에서 뗀다
    const { targetMs, tol } = Input.craftDiff('brick'), MAX = 2200;   // 🎚️ 허용 오차만 흔든다
    stage.innerHTML = `<div class="cmg-hold"><div class="fill"></div><div class="goal"></div></div>
                       <button class="cf-btn go cmg-press">꾹 누르기</button>`;
    const fill = stage.querySelector('.fill'), goal = stage.querySelector('.goal');
    goal.style.left = `${((targetMs - tol) / MAX) * 100}%`;
    goal.style.width = `${((tol * 2) / MAX) * 100}%`;
    let t0 = 0;
    const btn = stage.querySelector('button');
    const tick = () => {
      if (t0) { const held = performance.now() - t0; fill.style.width = `${Math.min(100, (held / MAX) * 100)}%`; }
      cmgRaf = requestAnimationFrame(tick);
    };
    tick();
    const down = () => { t0 = performance.now(); };
    const up = () => { if (!t0) return; const held = performance.now() - t0; t0 = 0; finish(Input.craftScore('brick', { heldMs: held, targetMs, tol })); };
    btn.addEventListener('pointerdown', down); btn.addEventListener('pointerup', up);
    cmgCleanup = () => { btn.removeEventListener('pointerdown', down); btn.removeEventListener('pointerup', up); };
  }
}

// 🔥 가공 창 — game.js 의 craftPanelData() 가 준 데이터를 그리기만 한다.
//    상태는 글자가 아니라 기호로(✓ 🔥) — 칸이 3개만 되어도 문구가 두 줄로 깨졌다(시안 실측).
let craftStationNow = null;
function renderCraft(d) {
  craftStationNow = d.station;
  $('craft-title').textContent = d.title;
  $('craft-ask').textContent = d.ask;
  $('craft-hint').innerHTML = d.hint;
  const strip = $('craft-slots');
  strip.innerHTML = '';
  for (let i = 0; i < d.cap; i++) {
    const s = d.slots[i], el = document.createElement('div');
    if (!s) { el.className = 'cf-chip empty'; el.textContent = '비어 있음'; }
    else {
      el.className = 'cf-chip';
      el.innerHTML = `<span class="mini">${s.ico}</span> ${s.name}${s.ready ? ' ×' + s.qty : ''} ` +
        (s.ready ? '<span class="cf-ready mark">✓</span>' : `<span class="mark" style="opacity:.55">${d.ico}</span>`);
    }
    strip.appendChild(el);
  }
  const ready = d.slots.filter(s => s.ready);
  const claim = $('craft-claim');
  claim.style.display = ready.length ? '' : 'none';
  claim.textContent = ready.length === 1
    ? `${ready[0].ico} ${ready[0].name} 받기`
    : `${d.claimAll} (${ready.length})`;
  claim.onclick = () => { const nd = Input.craftClaim(d.station); if (nd) renderCraft(nd); };
  $('craft-ad')?.remove();
  const adBtn = ready.length ? null : Input.craftAdButton(d.station, (nd) => { if ($('craft-menu').classList.contains('show') && craftStationNow === nd.station) renderCraft(nd); });
  if (adBtn) { const w = document.createElement('div'); w.id = 'craft-ad'; w.className = 'rw-row'; w.appendChild(adBtn); claim.after(w); }

  const list = $('craft-recipes');
  list.innerHTML = '';
  const full = d.slots.length >= d.cap;
  for (const r of d.recipes) {
    const row = document.createElement('div');
    row.className = 'cf-recipe' + (r.lack.length || full ? ' lack' : '');
    const cost = r.cost.map(c =>
      `<span class="${r.lack.includes(c.k) ? 'short' : ''}">${c.ico}${c.label} ${c.have}/${c.need}</span>`).join(' · ');
    row.innerHTML = `<span class="ico">${r.ico}</span>` +
      `<span class="txt"><span class="nm">${r.name}</span><span class="cost">${cost} → 2~5개</span></span>`;
    const b = document.createElement('button');
    b.className = 'cf-btn'; b.textContent = '넣기';
    b.disabled = r.lack.length > 0 || full;
    b.onclick = () => craftMinigame(r.id, (grade) => { const nd = Input.craftSet(r.id, grade); if (nd) renderCraft(nd); });
    row.appendChild(b); list.appendChild(row);
  }
}

function renderKitchen(d) {
  // ⚠️ " · " 로 이어 붙인 한 줄은 i18n 이 '{0} · {1}' 글루 패턴으로 쪼개 번역한다 —
  //    한쪽이 비면 앞에 구분자만 덩그러니 남으므로 조각을 모아서 잇는다.
  const bits = [];
  if (d.cooked) bits.push(`누적 요리 ${d.cooked}회`);
  if (d.pantry) bits.push(`🧺 찬장 ${d.pantry.items.length}/${d.pantry.max}`);
  $('kt-sub').textContent = bits.join(' · ');
  const box = $('kt-items'); box.innerHTML = '';
  d.recipes.forEach(r => {
    const costStr = r.cost.map(c => `<span class="${c.have < c.need ? 'lack' : ''}">${c.ico} ${c.have}/${c.need}</span>`).join(' · ');
    const courseStr = r.course.map(c => `${c.ico} ${c.name}`).join(' → ');
    const el = document.createElement('div');
    el.className = 'kt-row' + (r.ready ? '' : ' off');
    el.innerHTML = `<span class="kt-ico">${r.ico}</span>
      <div class="kt-body">
        <div class="kt-name">${r.name} <span class="kt-diff d${r.diff}">${'★'.repeat(r.diff)}</span></div>
        <div class="kt-desc">${r.desc}</div>
        <div class="kt-course">${courseStr}</div>
        <div class="kt-cost">${costStr}</div>
      </div>
      <div class="kt-side"><div class="kt-best">${r.best ? `⭐ 최고 ${r.best}점` : '기록 없음'}</div></div>`;
    el.addEventListener('click', () => {
      if (!r.ready) { ui.toast('재료가 부족해요'); return; }
      const st = Input.kitchenStart(r.id);
      if (!st.ok) { ui.toast(st.msg || '재료가 부족해요'); renderKitchen(Input.getKitchen()); return; }
      closeKitchen();
      startCookCourse(st);
    });
    box.appendChild(el);
  });
}
function closeKitchen() { $('kitchen-menu').classList.remove('show'); document.body.classList.remove('menu-open'); }

export function installKitchenMenu(ctx) {
  ({ $, ui, startCookCourse } = ctx);
  $('kt-close').addEventListener('click', closeKitchen);
  return { renderCraft, renderKitchen, closeKitchen };
}
