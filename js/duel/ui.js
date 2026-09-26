// =============================================================
//  calm forest · 🐗🦝 대결 오버레이 (DOM)
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-09-21-night-duel-design.md
//  ▶ 3D 클로즈업 위에 얹는 얇은 층이다. 무대는 js/duel/stage.js 가 만든다.
//  ▶ 문구는 t() 로 감싼다 — 영어 사전은 js/i18n-en.js. 통문장을 키로 쓴다.
// =============================================================
import { t } from '../i18n.js';
import { HANDS } from './rps.js';
import { SHELL_COUNT } from './shells.js';

export const HAND_ICO = { rock: '✊', scissors: '✌️', paper: '🖐️' };   // 무대(stage.js)도 같은 아이콘을 쓴다

// ⚠️ 표시 문구는 **전부 여기 모은다.** ui.js 와 index.js 에 흩어지면 한쪽만 고쳐
//    영어가 한국어로 새는 사고가 난다. Task 10 은 이 값들을 그대로 i18n 키로 등재한다.
//    값은 Task 7 에서 확정한 문구로 맞춘다.
export const COPY = {
  boarOpen:   '멧돼지가 길을 막아섰어요',
  raccoonOpen:'너구리가 작물을 훔쳐서 그릇에 숨겼어요!',
  askHand:    '무엇을 낼까요?',
  askShell:   '어느 그릇에 있을까요?',
  win:        '이겼어요!',
  lose:       '졌어요…',
  draw:       '비겼어요! 다시',
  matchWin:   '되찾았어요! 당분간 안 올 거예요',
  matchLose:  '놓쳤어요… 내일 다시 만나요',
  rock: '바위', scissors: '가위', paper: '보',
  // 🦝 그릇 자리 이름 — 화면 자리 기준(섞이면 따라 옮긴다). "{n}번 그릇" 같은 조합 대신
  //    완성된 문장 셋을 둔다(이 저장소는 통문장을 i18n 키로 쓴다).
  shell1: '첫 번째 그릇', shell2: '가운데 그릇', shell3: '마지막 그릇',
  quit: '그만두기',
};
const HAND_LABEL = { rock: COPY.rock, scissors: COPY.scissors, paper: COPY.paper };
const SHELL_LABEL = [COPY.shell1, COPY.shell2, COPY.shell3];   // 화면 자리(slot) → 이름
const $ = (id) => document.getElementById(id);
let onKey = null, onHide = null;   // 그만두기 경로(ESC·탭 전환) — closeDuel 에서 떼어낸다
const wait = (ms) => new Promise(r => setTimeout(r, ms));

// ⏳ askHand/askShell 이 클릭을 기다리는 동안 closeDuel() 이 불리면, 그 대기를
//    "조용히 끝내지 않고" reject 해야 한다 — Task 10 이 이걸 catch 로 받아
//    duel_quit 으로 집계한다(조용히 resolve 되면 승률 지표가 진 것으로 틀어진다).
//    AbortController 하나로 "리스너 정리"와 "reject" 를 같이 해결한다:
//    addEventListener(..., { signal }) 로 건 리스너는 abort() 한 번에 전부 떨어져
//    나가므로, 다음 판이 새 버튼을 만들 때 옛 리스너가 남을 일이 없다.
let pending = null;   // { controller } — 지금 클릭을 기다리는 판이 있으면 채워진다
// 🎬 대결 한 판 전체의 그만두기 신호 — 클릭 대기(pending) 밖의 연출(✊·반응·도망)도 ESC·탭 전환에 바로 끊긴다.
//    없으면 그만둬도 연출이 끝날 때까지 빈 화면이 1~2.5초 남는다(리뷰 2026-09-27).
let session = null;

/** 연출 대기를 감싼다 — 대결이 닫히면 즉시 'duel-closed' 로 reject */
export function guard(promise) {
  const signal = session?.signal;
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(new Error('duel-closed'));
  return new Promise((resolve, reject) => {
    const onAbort = () => reject(new Error('duel-closed'));
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(v => { signal.removeEventListener('abort', onAbort); resolve(v); },
                 e => { signal.removeEventListener('abort', onAbort); reject(e); });
  });
}

/** 지금 대기 중인 판이 있으면 'duel-closed' 로 reject 하고 리스너를 정리한다 */
function cancelPending() {
  if (!pending) return;
  const { controller } = pending;
  pending = null;
  controller.abort();
}

/** ms 만큼 기다리되, signal 이 중간에 abort 되면 즉시 reject 한다 */
/** 대기 — 중단되면 즉시 reject 한다. ⚠️ 정상 resolve 때도 리스너를 떼어야 판마다 쌓이지 않는다 */
function cancelableWait(ms, signal) {
  if (signal.aborted) return Promise.reject(new Error('duel-closed'));
  return new Promise((resolve, reject) => {
    const onAbort = () => { clearTimeout(timer); reject(new Error('duel-closed')); };
    const timer = setTimeout(() => { signal.removeEventListener('abort', onAbort); resolve(); }, ms);
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

export function openDuel() {
  session = new AbortController();
  document.body.classList.add('duel-open');
  $('duel-layer').classList.add('show');
  const q = $('duel-quit');
  q.textContent = t(COPY.quit);
  q.onclick = () => closeDuel();
  // ⌨️ ESC 와 탭 전환도 그만두기로 — 중간 이탈 경로가 하나뿐이면 대부분의 이탈이 안 잡힌다
  onKey = (e) => { if (e.key === 'Escape') closeDuel(); };
  onHide = () => { if (document.hidden) closeDuel(); };
  window.addEventListener('keydown', onKey);
  document.addEventListener('visibilitychange', onHide);
}


export function closeDuel() {
  if (onKey) { window.removeEventListener('keydown', onKey); onKey = null; }
  if (onHide) { document.removeEventListener('visibilitychange', onHide); onHide = null; }
  cancelPending();
  session?.abort(); session = null;
  document.body.classList.remove('duel-open');
  $('duel-layer').classList.remove('show');
  $('duel-hands').classList.add('hide');
  $('duel-shells').classList.add('hide');
}

export function setBanner(text) { $('duel-banner').textContent = t(text); }
export function setRound(n, total) { $('duel-round').textContent = `${n} / ${total}`; }

/** 세 손 중 하나를 누를 때까지 기다린다. closeDuel() 로 끊기면 reject 한다 */
export function askHand() {
  const box = $('duel-hands');
  box.innerHTML = '';
  box.classList.remove('hide');
  $('duel-shells').classList.add('hide');

  const controller = new AbortController();
  pending = { controller };
  const signal = controller.signal;

  return new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => reject(new Error('duel-closed')), { once: true });
    for (const h of HANDS) {
      const b = document.createElement('button');
      b.textContent = HAND_ICO[h];
      b.setAttribute('aria-label', t(HAND_LABEL[h]));
      b.addEventListener('click', () => {
        [...box.children].forEach(c => { c.disabled = true; });
        pending = null;
        resolve(h);
      }, { once: true, signal });
      box.appendChild(b);
    }
  });
}

/** 낸 손과 상대 손을 잠깐 보여준다 */
export async function showHands(mine, theirs, result) {
  setBanner(result === 'win' ? COPY.win : result === 'lose' ? COPY.lose : COPY.draw);
  const box = $('duel-hands');
  box.innerHTML = '';
  for (const h of [mine, theirs]) {
    const b = document.createElement('button');
    b.textContent = HAND_ICO[h];
    b.disabled = true;
    box.appendChild(b);
  }
  await wait(1200);
}

/**
 * 그릇 섞기 — swaps 를 ms 간격으로 적용하고, 고른 "화면 자리" 를 돌려준다.
 *
 * ⚠️ 화면 자리 ≠ DOM index. 버튼은 DOM 순서를 그대로 유지하고 translateX 로만
 *    자리를 옮긴다(마크업을 흔들면 클릭 리스너가 꼬인다). domPos[도메인 인덱스] 에
 *    "그 버튼이 지금 보이는 화면 자리(0..SHELL_COUNT-1)" 를 따로 추적해서,
 *    클릭 시 DOM index 가 아니라 domPos 값을 돌려준다 — shells.js 의 finalPos 는
 *    자리(position) 기준으로 판정하므로, index 를 돌려주면 눈으로는 멀쩡해 보여도
 *    판정이 전부 어긋난다.
 */
/**
 * @param {{onSwap?:(a:number,b:number)=>void, onReady?:()=>Promise<void>, onPick?:()=>Promise<void>}} [hooks]
 *   무대(3D 그릇)를 같이 움직이는 훅. 없으면 DOM 만으로 돈다(무대 없이도 동작해야 한다).
 */
export async function askShell(swaps, startPos, ms, cropIco = '🥕', hooks = {}) {
  const box = $('duel-shells');
  box.innerHTML = '';
  box.classList.remove('hide');
  $('duel-hands').classList.add('hide');

  const controller = new AbortController();
  pending = { controller };
  const signal = controller.signal;

  const numbered = !!hooks.onSwap;   // 무대가 있으면 버튼은 자리 번호만 가리킨다(3D 그릇이 진짜다)
  const buttons = [];
  for (let i = 0; i < SHELL_COUNT; i++) {
    const b = document.createElement('button');
    b.disabled = true;
    box.appendChild(b);
    buttons.push(b);
  }

  // domPos[도메인 index] = 그 버튼이 지금 보이는 화면 자리. 처음엔 DOM 순서 = 화면 순서(항등)
  const domPos = buttons.map((_, i) => i);
  const slotStep = () => buttons[0].getBoundingClientRect().height + 8;  // 버튼 높이 + gap(8px) — 세로 배치
  const render = () => {
    const step = slotStep();
    buttons.forEach((b, i) => {
      b.style.transform = `translateY(${(domPos[i] - i) * step}px)`;   // 세로로 쌓이므로 Y 로 옮긴다
      // ⚠️ 라벨은 "지금 있는 화면 자리" 기준 — 섞일 때마다 다시 붙여야
      //    스크린리더가 실제로 움직인 그릇을 따라갈 수 있다(DOM 순서 기준이면 안 맞는다)
      b.setAttribute('aria-label', t(SHELL_LABEL[domPos[i]]));
      // ⚠️ 번호는 **자리**에 고정이다. DOM 순서로 한 번만 박으면 버튼과 같이 움직여
      //    "작물이 든 그릇"을 번호가 따라다니며 정답을 알려준다(실측으로 잡은 버그).
      if (numbered) b.textContent = ['①', '②', '③'][domPos[i]];
    });
  };
  render();

  // 🥣 버튼은 **자리만** 가리킨다 — 진짜 그릇은 무대에 있다(stage.js). 무대가 없을 때만
  //   이모지로 대신한다(무대 없이도 게임이 돌아야 한다).
  if (hooks.onReady) await hooks.onReady();      // 카메라가 그릇으로 훅 들어간다
  await cancelableWait(400, signal);

  // 🥕 작물을 시작 그릇에 넣는다. 무대가 있으면 3D 로(그릇을 들었다 덮는다),
  //   없으면 DOM 이모지로 — 무대 없이도 무엇을 좇는지는 보여야 한다.
  // 🥕 작물을 시작 그릇에 넣는다 — 무대(3D 그릇)가 연출을 맡는다
  await hooks.onPut?.();

  for (const [a, b] of swaps) {
    const i1 = domPos.indexOf(a);
    const i2 = domPos.indexOf(b);
    [domPos[i1], domPos[i2]] = [domPos[i2], domPos[i1]];
    render();
    hooks.onSwap?.(a, b);                        // 무대의 그릇도 같은 자리로 옮긴다
    await cancelableWait(ms, signal);
  }
  if (hooks.onPick) await hooks.onPick();        // 고를 땐 1:1 구도로 뺀다

  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new Error('duel-closed')); return; }
    signal.addEventListener('abort', () => reject(new Error('duel-closed')), { once: true });
    buttons.forEach((btn, i) => {
      btn.disabled = false;
      btn.addEventListener('click', () => {
        buttons.forEach(c => { c.disabled = true; });
        pending = null;
        const slot = domPos[i];   // 클릭한 버튼이 "지금 있는" 화면 자리
        // ⚠️ 공개 연출이 실패해도 판정은 진행해야 한다 — 여기서 던지면 duelActive 가 걸린 채 화면이 멈춘다
        Promise.resolve(hooks.onReveal?.(slot)).catch(() => {}).then(() => resolve(slot));
      }, { once: true, signal });
    });
  });
}
