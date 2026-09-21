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
};
const HAND_LABEL = { rock: COPY.rock, scissors: COPY.scissors, paper: COPY.paper };
const SHELL_LABEL = [COPY.shell1, COPY.shell2, COPY.shell3];   // 화면 자리(slot) → 이름
const $ = (id) => document.getElementById(id);
const wait = (ms) => new Promise(r => setTimeout(r, ms));

// ⏳ askHand/askShell 이 클릭을 기다리는 동안 closeDuel() 이 불리면, 그 대기를
//    "조용히 끝내지 않고" reject 해야 한다 — Task 10 이 이걸 catch 로 받아
//    duel_quit 으로 집계한다(조용히 resolve 되면 승률 지표가 진 것으로 틀어진다).
//    AbortController 하나로 "리스너 정리"와 "reject" 를 같이 해결한다:
//    addEventListener(..., { signal }) 로 건 리스너는 abort() 한 번에 전부 떨어져
//    나가므로, 다음 판이 새 버튼을 만들 때 옛 리스너가 남을 일이 없다.
let pending = null;   // { controller } — 지금 클릭을 기다리는 판이 있으면 채워진다

/** 지금 대기 중인 판이 있으면 'duel-closed' 로 reject 하고 리스너를 정리한다 */
function cancelPending() {
  if (!pending) return;
  const { controller } = pending;
  pending = null;
  controller.abort();
}

/** ms 만큼 기다리되, signal 이 중간에 abort 되면 즉시 reject 한다 */
function cancelableWait(ms, signal) {
  if (signal.aborted) return Promise.reject(new Error('duel-closed'));
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new Error('duel-closed'));
    }, { once: true });
  });
}

export function openDuel() {
  document.body.classList.add('duel-open');
  $('duel-layer').classList.add('show');
}

export function closeDuel() {
  cancelPending();
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
export async function askShell(swaps, startPos, ms, cropIco = '🥕') {
  const box = $('duel-shells');
  box.innerHTML = '';
  box.classList.remove('hide');
  $('duel-hands').classList.add('hide');

  const controller = new AbortController();
  pending = { controller };
  const signal = controller.signal;

  const buttons = [];
  for (let i = 0; i < SHELL_COUNT; i++) {
    const b = document.createElement('button');
    b.disabled = true;
    box.appendChild(b);
    buttons.push(b);
  }

  // domPos[도메인 index] = 그 버튼이 지금 보이는 화면 자리. 처음엔 DOM 순서 = 화면 순서(항등)
  const domPos = buttons.map((_, i) => i);
  const slotStep = () => buttons[0].getBoundingClientRect().width + 10; // 버튼 폭 + gap(10px)
  const render = () => {
    const step = slotStep();
    buttons.forEach((b, i) => {
      b.style.transform = `translateX(${(domPos[i] - i) * step}px)`;
      // ⚠️ 라벨은 "지금 있는 화면 자리" 기준 — 섞일 때마다 다시 붙여야
      //    스크린리더가 실제로 움직인 그릇을 따라갈 수 있다(DOM 순서 기준이면 안 맞는다)
      b.setAttribute('aria-label', t(SHELL_LABEL[domPos[i]]));
    });
  };
  render();

  // 🥣 그릇은 **늘 보인다**. 빈 버튼이면 "그릇"이라는 말이 화면 어디에도 없다(실측 지적).
  buttons.forEach(b => { b.textContent = '🥣'; });
  await cancelableWait(400, signal);

  // 🥕 훔친 작물이 그릇으로 **들어가는 걸 보여준다**. 이게 없으면 무엇을 좇는지 모른 채
  //    그릇만 섞인다 — "어느 그릇에 있을까요?" 가 뜬금없어진다.
  const target = buttons[domPos.indexOf(startPos)];
  const r = target.getBoundingClientRect();
  const drop = document.createElement('div');
  drop.className = 'duel-drop';
  drop.textContent = cropIco;
  drop.style.left = `${r.left + r.width / 2}px`;
  drop.style.top = `${r.top - 34}px`;
  document.body.appendChild(drop);
  await cancelableWait(620, signal);        // 눈에 담을 틈 — 짧으면 무엇을 좇는지 모른 채 섞인다
  drop.classList.add('in');                 // 그릇 안으로 쏙
  await cancelableWait(380, signal);
  drop.remove();
  target.classList.add('shut');             // 그릇이 덮이는 반동
  await cancelableWait(260, signal);
  target.classList.remove('shut');

  for (const [a, b] of swaps) {
    const i1 = domPos.indexOf(a);
    const i2 = domPos.indexOf(b);
    [domPos[i1], domPos[i2]] = [domPos[i2], domPos[i1]];
    render();
    await cancelableWait(ms, signal);
  }

  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new Error('duel-closed')); return; }
    signal.addEventListener('abort', () => reject(new Error('duel-closed')), { once: true });
    buttons.forEach((btn, i) => {
      btn.disabled = false;
      btn.addEventListener('click', () => {
        buttons.forEach(c => { c.disabled = true; });
        pending = null;
        resolve(domPos[i]);   // 클릭한 버튼이 "지금 있는" 화면 자리
      }, { once: true, signal });
    });
  });
}
