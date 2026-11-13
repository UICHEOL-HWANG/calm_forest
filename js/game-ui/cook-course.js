import { Input } from '../game-lazy.js';
import { LANG, t } from '../i18n.js';
import { Sound } from '../sound.js';

let $, ui, layoutBuffs;

// ═══════════════ 🍳 요리 미니게임 — 스테이지 4종 + 코스 러너 ═══════════════
//  한 레시피는 여러 판(스테이지)을 **순서대로** 치르는 코스다. ★1 = 1판, ★3 = 3판.
//  각 스테이지는 아래 공통 인터페이스만 지키면 되고, 러너가 순서·점수 합산·종료를 맡는다:
//    { hud, start(cfg), tap(now), release(now), frame(now), timeout } → 끝나면 cfg.done(pts[])
//  cfg.mult 는 판정창 배율 — 코스 뒤로 갈수록 작아진다(= 단계별로 난이도가 올라간다).
//  ⚠️ 모든 스테이지는 rAF 가 멈춰도(백그라운드 탭) 반드시 정산되게 종료 보증 타이머를 건다.
const POT_STEPS = [
  { label: '🧺 재료 넣기', half: 13 },     // half: 초록 구간 반폭(%) — 단계마다 좁아져 난이도↑
  { label: '🥄 골고루 젓기', half: 10 },
  { label: '🔥 불 조절', half: 7.5 },
];
const POT_SWEEP = 700;                                   // 바늘 편도 이동 시간(ms) — 1% ≈ 7ms
const CHOP_N = 8, CHOP_BEAT = 520, CHOP_TRAVEL = 1400;   // 노트 수 · 박자 간격 · 레인 이동 시간(ms)
const GRILL_N = 3, GRILL_RISE = 2600;                    // 뒤집기 횟수 · 게이지가 0→100 까지 차는 시간(ms)
const GRILL_ZONE = 16;                                   // "노릇" 구간 반폭(%) — mult 로 넓어진다
const SEASON_N = 2, SEASON_RISE = 2100;                  // 간 맞추기 횟수 · 게이지 상승 시간(ms)
const SEASON_ZONE = 13;                                  // 목표 구간 반폭(%)

const MG = { active: false, id: null, name: '', where: 'kitchen', raf: 0, timers: [],
  startAt: 0, course: [], si: 0, stageScores: [], stage: null,
  offsets: [], judges: { perfect: 0, good: 0, miss: 0 }, pts: [], combo: 0, maxCombo: 0, holding: false, holdPid: null };
const mgT = (ms, fn) => { const h = setTimeout(fn, ms); MG.timers.push(h); return h; };
function mgJudge(kind, text) {
  const el = $('mg-judge');
  el.innerHTML = `<span class="j-${kind}">${text}</span>`;
  el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
}
function mgCount(kind) {                                  // 판정 집계 — 콤보는 perfect/good 에서만 이어진다
  MG.judges[kind]++;
  if (kind === 'miss') { MG.combo = 0; $('mg-combo').textContent = ''; }
  else { MG.combo++; MG.maxCombo = Math.max(MG.maxCombo, MG.combo); $('mg-combo').textContent = MG.combo >= 2 ? `🔥 ${MG.combo} 콤보!` : ''; }
}
function mgStepLabel(text, i, n) {                        // 코스 진행 표시 — "지금 몇 번째 판인지"를 늘 보이게
  const course = MG.course.length > 1 ? ` <span class="mg-course">코스 ${MG.si + 1}/${MG.course.length}</span>` : '';
  $('mg-step').innerHTML = `${text} <span id="mg-step-n">${i}/${n}</span>${course}`;
}

// ── 🍲 끓이기 — 왕복하는 바늘이 초록 구간에 올 때 탭 ×3 ──
const StagePot = {
  hud: 'mg-pot',
  start(cfg) {
    this.cfg = cfg; this.pts = []; this.step = 0; this.waiting = false;
    this.next(0);
  },
  next(i) {
    this.step = i; this.waiting = false; this.stepAt = performance.now();
    this.zoneC = 25 + Math.random() * 50;                 // 초록 구간 중심(25~75%) — 매번 다른 위치
    const s = POT_STEPS[i];
    this.half = s.half * this.cfg.mult;                   // ★ 판정창 배율
    mgStepLabel(s.label, i + 1, POT_STEPS.length);
    const z = $('mg-zone');
    z.style.left = (this.zoneC - this.half) + '%';
    z.style.width = (this.half * 2) + '%';
    mgT(4200, () => { if (MG.stage === this && this.step === i && !this.waiting) this.tap(null); });  // ⏱️ 3왕복 방치 → 자동 미스
  },
  pct(now) {
    const t = (now - this.stepAt) % (POT_SWEEP * 2);      // 왕복 삼각파(0→100→0)
    return (t < POT_SWEEP ? t / POT_SWEEP : 2 - t / POT_SWEEP) * 100;
  },
  frame(now) { if (!this.waiting) $('mg-needle').style.left = `calc(${this.pct(now).toFixed(2)}% - 2px)`; },
  tap(now) {
    if (this.waiting) return;
    this.waiting = true;
    let pts;
    if (now === null) { pts = 0; mgCount('miss'); mgJudge('miss', '⏰ 놓쳤어요'); }
    else {
      const pct = this.pct(now);
      const dist = Math.abs(pct - this.zoneC);
      MG.offsets.push(Math.round((pct - this.zoneC) * POT_SWEEP / 100));   // 타이밍 오차(ms, 부호=구간 앞/뒤)
      let kind;
      if (dist <= this.half * 0.4) { pts = 100; kind = 'perfect'; mgJudge('perfect', '💫 완벽해요!'); Sound.harvest(); }
      else if (dist <= this.half)  { pts = Math.round(95 - (dist / this.half) * 40); kind = 'good'; mgJudge('good', '👍 좋아요'); Sound.blip(); }
      else { pts = Math.max(0, Math.round(45 - (dist - this.half) * 2)); kind = 'miss'; mgJudge('miss', '😅 아쉬워요'); }
      mgCount(kind);
      Input.mgPotHit(this.step, kind, (MG.costKeys || [])[0]);   // 🎥 3D 무대 연출(재료 퐁당/국자 젓기/불길)
    }
    this.pts.push(pts);
    if (this.step + 1 < POT_STEPS.length) mgT(650, () => { if (MG.stage === this) this.next(this.step + 1); });
    else mgT(650, () => { if (MG.stage === this) this.cfg.done(this.pts); });
  },
  release() {},
  timeout() { return POT_STEPS.length * 5200; },
  settle() { while (this.pts.length < POT_STEPS.length) this.pts.push(0); return this.pts; },
};

// ── 🔪 썰기 — 흘러오는 재료가 칼 아래 올 때 박자 탭 ×8 ──
const StageChop = {
  hud: 'mg-chop',
  start(cfg) {
    this.cfg = cfg; this.pts = []; this.notes = [];
    this.win = { perfect: 90 * cfg.mult, good: 170 * cfg.mult, late: 260 * cfg.mult };   // ★ 판정창 배율
    const t0 = performance.now() + 1100;                  // 첫 노트까지 살짝 여유
    for (let i = 0; i < CHOP_N; i++) this.notes.push({ hitAt: t0 + i * CHOP_BEAT, done: false, missed: false });
    mgStepLabel('🔪 박자에 맞춰 썰기', 0, CHOP_N);
  },
  frame(now) {
    let allDone = true;
    for (const n of this.notes) {
      if (n.done) continue;
      allDone = false;
      if (now > n.hitAt + this.win.late) {                // 칼 아래를 지나친 노트 → 미스
        n.done = true; n.missed = true;
        this.pts.push(0); mgCount('miss'); mgJudge('miss', '💨 놓쳤어요');
      }
    }
    mgStepLabel('🔪 박자에 맞춰 썰기', this.pts.length, CHOP_N);
    // 🎥 3D 무대에 노트 진행도 동기화 — p: 0(출발)→1(칼 아래), s: 0진행 1썰림 2미스
    Input.mgChopFrame(this.notes.map(n => ({
      p: Math.max(0, Math.min(1.3, (now - (n.hitAt - CHOP_TRAVEL)) / CHOP_TRAVEL)),
      s: n.done ? (n.missed ? 2 : 1) : 0,
    })));
    if (allDone && !this.ending) { this.ending = true; mgT(500, () => { if (MG.stage === this) this.cfg.done(this.pts); }); }
  },
  tap(now) {
    let best = null, bestI = -1, bestAbs = 1e9;
    this.notes.forEach((n, i) => {
      if (n.done) return;
      const abs = Math.abs(now - n.hitAt);
      if (abs < bestAbs) { bestAbs = abs; best = n; bestI = i; }
    });
    if (!best || bestAbs > this.win.late) return;         // 칼 밖 헛스윙은 무판정(연타 방지)
    best.done = true;
    MG.offsets.push(Math.round(now - best.hitAt));        // 타이밍 오차(ms, -빠름/+늦음)
    let pts, kind;
    if (bestAbs <= this.win.perfect)   { pts = 100; kind = 'perfect'; mgJudge('perfect', '💫 싹둑!'); }
    else if (bestAbs <= this.win.good) { pts = 65;  kind = 'good';    mgJudge('good', '👍 좋아요'); }
    else                               { pts = 30;  kind = 'good';    mgJudge('good', '😅 아슬아슬'); }
    mgCount(kind);
    Input.mgChopHit(bestI, kind);                         // 🎥 칼 내려찍기 + 재료 두 조각 연출
    Sound.chop();
    this.pts.push(pts);
  },
  release() {},
  timeout() { return 1100 + CHOP_N * CHOP_BEAT + 1500; },
  settle() { while (this.pts.length < CHOP_N) this.pts.push(0); return this.pts; },
};

// ── 🔥 굽기 — 한 방향으로 차오르는 게이지를 "노릇" 구간에서 눌러 뒤집기 ×3 ──
//    끓이기와 달리 바늘이 **되돌아오지 않는다**. 놓치면 그냥 탄다 — 실패가 색으로 남는다.
const StageGrill = {
  hud: 'mg-grill',
  start(cfg) {
    this.cfg = cfg; this.pts = []; this.step = 0; this.waiting = false;
    this.next(0);
  },
  next(i) {
    this.step = i; this.waiting = false; this.stepAt = performance.now(); this.burnt = false;
    this.half = GRILL_ZONE * this.cfg.mult;
    this.zoneC = 46 + Math.random() * 26;                 // 노릇 구간 중심(46~72%)
    mgStepLabel(i === 0 ? '🔥 앞면 굽기' : i === 1 ? '🔥 뒷면 굽기' : '🔥 마무리 굽기', i + 1, GRILL_N);
    const z = $('mg-gzone');
    z.style.left = (this.zoneC - this.half) + '%';
    z.style.width = (this.half * 2) + '%';
    $('mg-gfill').style.width = '0%';
    mgT(GRILL_RISE + 900, () => { if (MG.stage === this && this.step === i && !this.waiting) this.tap(null); });  // 다 타버림
  },
  pct(now) { return Math.min(100, (now - this.stepAt) / GRILL_RISE * 100); },
  frame(now) {
    if (this.waiting) return;
    const p = this.pct(now);
    const f = $('mg-gfill');
    f.style.width = p + '%';
    f.classList.toggle('hot', p > this.zoneC + this.half);   // 구간을 지나면 붉게 — 타고 있다는 신호
  },
  tap(now) {
    if (this.waiting) return;
    this.waiting = true;
    let pts, kind, over = false;
    if (now === null) {                                    // 끝까지 안 누름 → 새까맣게
      pts = 0; kind = 'miss'; over = true;
      mgJudge('miss', '🔥 타버렸어요');
      mgCount('miss'); Input.mgGrillFlip('miss', true);
    } else {
      const p = this.pct(now);
      const d = p - this.zoneC;
      MG.offsets.push(Math.round(d * GRILL_RISE / 100));
      if (Math.abs(d) <= this.half * 0.4) { pts = 100; kind = 'perfect'; mgJudge('perfect', '💫 노릇노릇!'); Sound.harvest(); }
      else if (Math.abs(d) <= this.half)  { pts = Math.round(92 - (Math.abs(d) / this.half) * 34); kind = 'good'; mgJudge('good', '👍 잘 익었어요'); Sound.blip(); }
      else if (d < 0)                     { pts = Math.max(0, Math.round(50 - (-d) * 1.6)); kind = 'miss'; mgJudge('miss', '😅 아직 덜 익었어요'); }
      else                                { pts = Math.max(0, Math.round(45 - d * 2.2)); kind = 'miss'; over = true; mgJudge('miss', '😖 좀 탔어요'); }
      mgCount(kind);
      Input.mgGrillFlip(kind, over);                       // 🎥 뒤집기 + 탄 정도 반영
    }
    this.pts.push(pts);
    if (this.step + 1 < GRILL_N) mgT(680, () => { if (MG.stage === this) this.next(this.step + 1); });
    else mgT(680, () => { if (MG.stage === this) this.cfg.done(this.pts); });
  },
  release() {},
  timeout() { return GRILL_N * (GRILL_RISE + 1700); },
  settle() { while (this.pts.length < GRILL_N) this.pts.push(0); return this.pts; },
};

// ── 🧂 간 맞추기 — **꾹 누르고 있다가** 목표선에서 손을 떼기 ×2 ──
//    유일한 홀드-릴리스 문법이라 같은 탭이어도 손맛이 확실히 다르다.
const StageSeason = {
  hud: 'mg-season',
  start(cfg) {
    this.cfg = cfg; this.pts = []; this.step = 0; this.waiting = false;
    this.next(0);
  },
  next(i) {
    this.step = i; this.waiting = false; this.holdAt = 0; this.level = 0;
    this.half = SEASON_ZONE * this.cfg.mult;
    this.target = 44 + Math.random() * 30;                // 목표 중심(44~74%)
    mgStepLabel(i === 0 ? '🧂 소금 간' : '🌿 허브 간', i + 1, SEASON_N);
    const z = $('mg-szone');
    z.style.left = (this.target - this.half) + '%';
    z.style.width = (this.half * 2) + '%';
    $('mg-sfill').style.width = '0%';
    $('mg-shold').textContent = '꾹 누르고 계세요';
    // ⏱️ 누르지도 않은 채 9초가 지나면 미스. 이미 누르고 있었다면 그 시점으로 정상 판정한다
    //    (팁을 읽다 늦게 누른 사람이 누르고 있는데도 "간을 안 했어요" 0점을 받던 문제)
    mgT(9000, () => {
      if (MG.stage !== this || this.step !== i || this.waiting) return;
      this.release(this.holdAt ? performance.now() : null);
    });
  },
  frame(now) {
    if (this.waiting || !this.holdAt) return;
    this.level = Math.min(118, (now - this.holdAt) / SEASON_RISE * 100);   // 100 을 넘겨도 계속 오른다(넘치면 짜다)
    const f = $('mg-sfill');
    f.style.width = Math.min(100, this.level) + '%';
    f.classList.toggle('over', this.level > this.target + this.half);
  },
  tap(now) {                                              // 누르기 시작 = 쏟기 시작
    if (this.waiting || this.holdAt) return;
    this.holdAt = now; MG.holding = true;
    $('mg-shold').textContent = '지금 손을 떼세요!';
    Input.mgSeasonPour(true);
    Sound.blip();
  },
  release(now) {
    if (this.waiting) return;
    if (!this.holdAt && now !== null) return;             // 누른 적 없는 손 뗌은 무시
    this.waiting = true; MG.holding = false;
    Input.mgSeasonPour(false);
    let pts, kind;
    if (now === null || !this.holdAt) { pts = 0; kind = 'miss'; mgJudge('miss', '⏰ 간을 안 했어요'); }
    else {
      const lv = Math.min(118, (now - this.holdAt) / SEASON_RISE * 100);
      const d = lv - this.target;
      MG.offsets.push(Math.round(d * SEASON_RISE / 100));
      if (Math.abs(d) <= this.half * 0.4) { pts = 100; kind = 'perfect'; mgJudge('perfect', '💫 딱 좋은 간!'); Sound.harvest(); }
      else if (Math.abs(d) <= this.half)  { pts = Math.round(92 - (Math.abs(d) / this.half) * 34); kind = 'good'; mgJudge('good', '👍 괜찮아요'); Sound.blip(); }
      else if (d < 0)                     { pts = Math.max(0, Math.round(50 - (-d) * 1.8)); kind = 'miss'; mgJudge('miss', '😅 좀 싱거워요'); }
      else                                { pts = Math.max(0, Math.round(48 - d * 2.0)); kind = 'miss'; mgJudge('miss', '😖 너무 짜요'); }
    }
    mgCount(kind);
    Input.mgSeasonDone(kind);
    this.pts.push(pts);
    if (this.step + 1 < SEASON_N) mgT(700, () => { if (MG.stage === this) this.next(this.step + 1); });
    else mgT(700, () => { if (MG.stage === this) this.cfg.done(this.pts); });
  },
  timeout() { return SEASON_N * 10000; },
  settle() { while (this.pts.length < SEASON_N) this.pts.push(0); return this.pts; },
};

const STAGES = { pot: StagePot, chop: StageChop, grill: StageGrill, season: StageSeason };
const STAGE_HUDS = ['mg-pot', 'mg-chop', 'mg-grill', 'mg-season'];

// ── 코스 러너 ─────────────────────────────────────────────
function startCookCourse(st) {
  MG.active = true; MG.id = st.id; MG.where = st.where || 'kitchen';
  MG.name = `${st.ico} ${st.name}`; MG.costIcos = st.icos || []; MG.dishIco = st.ico; MG.costKeys = st.keys || []; MG.grillKey = st.grillKey || '';   // 🍲 무대 재료 모형(키)
  MG.course = st.course; MG.si = -1; MG.stageScores = [];
  MG.offsets = []; MG.judges = { perfect: 0, good: 0, miss: 0 }; MG.pts = [];
  MG.combo = 0; MG.maxCombo = 0; MG.holding = false; MG.holdPid = null; MG.timers = [];
  MG.startAt = performance.now();
  $('mg-judge').textContent = ''; $('mg-combo').textContent = '';
  $('mg-result').classList.remove('show');
  $('mg-card').classList.remove('done');
  $('mg-tap').style.display = '';
  $('mg-layer').classList.add('show'); document.body.classList.add('menu-open'); document.body.classList.add('mg-open');
  Input.setAnalog(0, 0);
  nextStage();
}
function nextStage() {
  MG.si++;
  if (MG.si >= MG.course.length) { endCourse(false); return; }
  const c = MG.course[MG.si];
  const stage = Object.create(STAGES[c.mg]);              // 스테이지 인스턴스(모듈은 원형으로만 쓴다)
  MG.stage = stage;
  STAGE_HUDS.forEach(id => $(id).classList.toggle('show', id === stage.hud));
  $('mg-title').innerHTML = `${MG.name} <span class="mg-stage">${c.ico} ${c.name}</span>`;
  $('mg-tap').textContent = c.mg === 'season' ? '👇 꾹 눌러주세요!' : '👆 눌러주세요!';
  $('mg-tip').textContent = c.tip;
  Input.mgSceneStart(c.mg, MG.costKeys, CHOP_N, MG.grillKey);   // 🎥 3D 클로즈업 무대를 이 단계로 전환
  stage.start({ mult: c.mult, done: (pts) => finishStage(pts) });
  // ⏱️ rAF 가 멈춰도(백그라운드 탭) 판이 영원히 안 끝나지 않게 — 스테이지가 정한 상한
  mgT(stage.timeout(), () => { if (MG.stage === stage) finishStage(stage.settle()); });
  cancelAnimationFrame(MG.raf);
  MG.raf = requestAnimationFrame(mgFrame);
}
function finishStage(pts) {
  const stage = MG.stage; if (!stage) return;
  MG.stage = null;
  MG.holding = false; MG.holdPid = null; Input.mgSeasonPour(false);   // 타임아웃으로 끝났다면 소금이 계속 쏟아진 채 남는다
  const c = MG.course[MG.si];
  const avg = pts.length ? pts.reduce((a, b) => a + b, 0) / pts.length : 0;
  MG.stageScores.push(avg);
  MG.pts.push(...pts);
  mgT(240, () => { if (MG.active) nextStage(); });
}
function mgFrame(now) {
  if (!MG.active) return;
  MG.stage?.frame?.(now);
  MG.raf = requestAnimationFrame(mgFrame);
}

// ── 공통 입력(탭/홀드/키) ──
function mgTap(e) {
  if (!MG.active || $('mg-result').classList.contains('show')) return;
  if (e && e.pointerId !== undefined) MG.holdPid = e.pointerId;   // 이 포인터의 up 만 릴리스로 친다
  MG.stage?.tap?.(performance.now());
}
// 🧂 홀드-릴리스는 **누른 그 손가락**이 떨어질 때만 확정한다.
//    pointerId 를 안 보면 다른 손가락으로 아무 데나 탭했다 떼는 것만으로 간이 확정된다.
function mgRelease(e) {
  if (!MG.active || $('mg-result').classList.contains('show')) return;
  if (!MG.holding) return;                                // 홀드형 스테이지가 아니면 뗌은 무의미
  if (e && e.pointerId !== undefined && MG.holdPid !== null && e.pointerId !== MG.holdPid) return;
  MG.holdPid = null;
  MG.stage?.release?.(performance.now());
}

// ── 코스 종료 → 등급 판정 ─────────────────────────────────
function endCourse(abandoned) {
  cancelAnimationFrame(MG.raf);
  MG.timers.forEach(clearTimeout); MG.timers = [];
  // 마지막 판까지 다 치른 뒤 다음 판 대기(240ms) 중에 눌렀다면 그건 포기가 아니다 —
  // 점수는 만점일 수 있는데 지표에만 cooking_abandon 으로 찍히면 이탈률이 거짓말을 한다
  if (abandoned && !MG.stage && MG.stageScores.length >= MG.course.length) abandoned = false;
  if (MG.stage) { MG.stageScores.push(0); MG.stage = null; }   // 그만두기: 진행 중이던 판은 0점
  while (MG.stageScores.length < MG.course.length) MG.stageScores.push(0);   // 남은 판도 0점
  // 코스 점수 = 단계별 점수의 가중 평균(뒤 단계가 무겁다 — 마지막 한 판을 잘해야 최고 등급)
  let sum = 0, wsum = 0;
  MG.course.forEach((c, i) => { sum += MG.stageScores[i] * c.weight; wsum += c.weight; });
  let score = wsum ? sum / wsum : 0;
  // 풀콤보 보너스 — "한 번도 안 놓쳤다" 가 기준. 판 수로 재면 🧂 두 번짜리(소금 주먹밥)는
  // 영영 못 받고 8노트짜리 썰기만 받는 불공평이 생긴다.
  if (MG.pts.length && MG.maxCombo >= MG.pts.length) score = Math.min(100, score + 5);
  const payload = {
    score, offsets: MG.offsets, maxCombo: MG.maxCombo, judges: MG.judges,
    stageScores: MG.stageScores, durationMs: performance.now() - MG.startAt, abandoned,
    step: MG.si,                                          // 어느 판까지 갔는지(퍼널 이탈 지점)
  };
  MG.active = false; MG.holding = false;
  Input.mgSeasonPour(false);
  if (MG.where === 'cafe') { showCafeResult(Input.cafeCookDone(payload)); return; }
  showCookResult(Input.kitchenFinish(MG.id, payload));
}

function mgResultChrome(res) {
  STAGE_HUDS.forEach(id => $(id).classList.remove('show'));
  $('mg-tap').style.display = 'none'; $('mg-judge').textContent = ''; $('mg-tip').textContent = '';
  $('mgr-ico').textContent = res.tier.ico;
  $('mgr-title').textContent = `${t(res.tier.name)}!`;
  $('mgr-stats').innerHTML = `<span>점수 <b>${res.score}</b>점${res.isBest ? ' ⭐신기록!' : ''}</span><span>최대 콤보 <b>${MG.maxCombo}</b></span><span>누적 요리 <b>${res.cooked}</b>회</span>`;
  $('mg-result').classList.add('show');
  $('mg-card').classList.add('done');
}
// 🍳 자유주방 결과 — 먹을지 보관할지 고른다(그냥 닫으면 먹는 쪽으로 마무리된다)
function showCookResult(res) {
  if (!res.ok) { closeMg(); return; }
  mgResultChrome(res);
  // 🍲 보글보글 냄비 요리는 이름·평이 조합 표에서 온다 — 영어면 표의 _en 을 직접(사전에 없는 생성 문구라 번역기가 못 바꾼다)
  const dishName = res.free && LANG === 'en' ? res.free.name_en : res.name;
  $('mgr-sub').innerHTML = `${res.ico} ${dishName} 완성 — 먹으면 ${res.buff.ico} <b>${res.buff.name}</b> 버프 <b>${res.buff.dur}초</b>`;
  const tasteEl = $('mgr-taste');
  if (res.free) {
    // 짧게 — 별 + 한 줄 평(16자) + ✨NEW 배지, 발견 수는 작게(사용자 "짧고 컴팩트하게")
    const t = res.free.taste, stars = `<span class="star">${'★'.repeat(t)}${'☆'.repeat(5 - t)}</span>`;
    const judge = LANG === 'en' ? res.free.judge_en : res.free.judge;
    tasteEl.innerHTML = `${stars} ${judge}${res.free.isNew ? ' <span class="new">✨NEW</span>' : ''}`;
    tasteEl.style.display = '';
    // 발견 수는 따로 줄을 차지하지 않게 점수 줄 끝 칸으로(사용자 "1/672도 칸 차지한다", 2026-09-29)
    if (res.free.total) $('mgr-stats').insertAdjacentHTML('beforeend', `<span class="cnt">🍲 <b>${res.free.found}</b>/${res.free.total}</span>`);
  } else tasteEl.style.display = 'none';
  $('mgr-cafe').style.display = 'none';
  $('mgr-choice').style.display = '';
  $('mgr-store').disabled = !res.canStore;
  $('mgr-store').textContent = res.canStore ? '🧺 보관하기' : '🧺 찬장이 가득 찼어요';
  $('mgr-again').style.display = '';
}
// ☕ 카페 결과 — 손님에게 바로 나갔으니 고를 게 없다. 받은 팁만 보여준다
function showCafeResult(res) {
  if (!res?.ok) { closeMg(); return; }
  mgResultChrome(res);
  $('mgr-taste').style.display = 'none';
  const c = res.cafe || {};
  $('mgr-sub').innerHTML = `${res.ico} ${res.name} 완성 — ${c.emoji || '🙂'} <b>${c.name || '손님'}</b>에게 서빙!`;
  $('mgr-choice').style.display = 'none';
  $('mgr-again').style.display = 'none';
  $('mgr-cafe').style.display = '';
  $('mgr-cafe').innerHTML = `🪙 <b>+${c.pay || 0}</b>${c.complete ? ` · 🎉 오늘 영업 완주 보너스 🪙+${c.bonus}` : ''}`;
}
function closeMg() {
  $('mg-layer').classList.remove('show');
  document.body.classList.remove('menu-open'); document.body.classList.remove('mg-open');
  MG.active = false; MG.holding = false;
  Input.mgSceneEnd();                                     // 🎥 마을 카메라 복귀
  layoutBuffs();                                          // 탭들이 다시 보이니 버프 위치 재계산
}
function closeCookResult(how) {                           // 결과 카드 닫기 = 선택 확정
  const r = Input.cookResolve(how);
  if (r?.ok && r.how === 'store') ui.toast(`🧺 ${r.ico} ${r.name} 찬장에 넣었어요. 남은 칸 ${r.left}`, 2600);
  else if (r?.ok && r.fallback) ui.toast('🧺 찬장이 가득 차서 바로 먹었어요', 2600);
  closeMg();
}
// 결과 화면을 닫는 모든 길은 여기로 — 주방이면 먹기로 마무리, 카페면 이미 손님에게 나갔다
function closeResult() { MG.where === 'cafe' ? closeMg() : closeCookResult('eat'); }

export function installCookCourse(ctx) {
  ({ $, ui, layoutBuffs } = ctx);
  $('mg-tap').addEventListener('pointerdown', e => { e.preventDefault(); mgTap(e); });
  $('mg-layer').addEventListener('pointerdown', e => {      // 모바일: 화면 어디를 탭해도 입력(엄지 존 자유)
    if (e.target.closest('#mg-quit') || e.target.closest('#mg-result') || e.target.closest('#mg-tap')) return;
    mgTap(e);
  });
  // 🧂 홀드-릴리스: 손을 떼는 건 어디서 떼든(레이어 밖으로 끌고 나가도) 받아야 한다.
  //    pointerup 만 걸면 손가락이 레이어를 벗어난 채 떼었을 때 영영 안 멎는다 → pointercancel 도 함께.
  for (const ev of ['pointerup', 'pointercancel']) window.addEventListener(ev, mgRelease, true);
  window.addEventListener('keydown', e => {                 // 데스크톱: Space/Enter/J — 게임 조작으로 안 새게 capture
    if (!MG.active) return;
    if (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyJ') {
      e.preventDefault(); e.stopPropagation();
      if (!e.repeat) { MG.holdPid = null; mgTap(); }
    }
  }, true);
  window.addEventListener('keyup', e => {
    if (!MG.active) return;
    if (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyJ') { e.preventDefault(); e.stopPropagation(); mgRelease(null); }
  }, true);
  $('mg-quit').addEventListener('click', () => {
    if (!MG.active) { closeResult(); return; }              // 결과 화면 위에서 눌렀다 = 닫기와 같다(만든 요리를 잃지 않게)
    endCourse(true);                                        // 포기해도 재료는 이미 썼으니 낮은 등급으로 완성된다
  });
  $('mgr-close').addEventListener('click', closeResult);
  $('mgr-eat').addEventListener('click', () => closeCookResult('eat'));
  $('mgr-store').addEventListener('click', () => closeCookResult('store'));
  $('mgr-again').addEventListener('click', () => {          // 같은 요리 한 번 더(재료 있으면 바로 재시작)
    Input.cookResolve('eat');                               // 방금 만든 건 먹은 걸로 마무리
    const st = Input.kitchenStart(MG.id);
    if (!st.ok) { ui.toast(st.msg || '재료가 부족해요'); closeMg(); return; }
    startCookCourse(st);
  });
  ui.startCookCourse = startCookCourse;                     // ☕ 카페에서 손님 앞 조리를 열 때 game.js 가 부른다
  return { startCookCourse, mgTap, MG };
}

export const PANEL_IDS = ['mg-card', 'mg-combo', 'mg-gfill', 'mg-gzone', 'mg-judge', 'mg-layer', 'mg-needle', 'mg-quit', 'mg-result', 'mg-sfill', 'mg-shold', 'mg-step', 'mg-szone', 'mg-tap', 'mg-tip', 'mg-title', 'mg-zone', 'mgr-again', 'mgr-cafe', 'mgr-choice', 'mgr-close', 'mgr-eat', 'mgr-ico', 'mgr-stats', 'mgr-store', 'mgr-sub', 'mgr-taste', 'mgr-title'];
