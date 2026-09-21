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

const HAND_ICO = { rock: '✊', scissors: '✌️', paper: '🖐️' };

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
};
const HAND_LABEL = { rock: COPY.rock, scissors: COPY.scissors, paper: COPY.paper };
const $ = (id) => document.getElementById(id);
const wait = (ms) => new Promise(r => setTimeout(r, ms));

export function openDuel() {
  document.body.classList.add('duel-open');
  $('duel-layer').classList.add('show');
}

export function closeDuel() {
  document.body.classList.remove('duel-open');
  $('duel-layer').classList.remove('show');
  $('duel-hands').classList.add('hide');
  $('duel-shells').classList.add('hide');
}

export function setBanner(text) { $('duel-banner').textContent = t(text); }
export function setRound(n, total) { $('duel-round').textContent = `${n} / ${total}`; }

/** 세 손 중 하나를 누를 때까지 기다린다 */
export function askHand() {
  const box = $('duel-hands');
  box.innerHTML = '';
  box.classList.remove('hide');
  $('duel-shells').classList.add('hide');
  return new Promise(resolve => {
    for (const h of HANDS) {
      const b = document.createElement('button');
      b.textContent = HAND_ICO[h];
      b.setAttribute('aria-label', t(HAND_LABEL[h]));
      b.addEventListener('click', () => {
        [...box.children].forEach(c => { c.disabled = true; });
        resolve(h);
      }, { once: true });
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
export async function askShell(swaps, startPos, ms) {
  const box = $('duel-shells');
  box.innerHTML = '';
  box.classList.remove('hide');
  $('duel-hands').classList.add('hide');

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
    buttons.forEach((b, i) => { b.style.transform = `translateX(${(domPos[i] - i) * step}px)`; });
  };
  render();

  // 섞기 전, 시작 자리에 있는 걸 잠깐 보여준다 — 플레이어가 무엇을 좇을지 알게
  buttons[domPos.indexOf(startPos)].textContent = '🌱';
  await wait(700);
  buttons.forEach(b => { b.textContent = ''; });

  for (const [a, b] of swaps) {
    const i1 = domPos.indexOf(a);
    const i2 = domPos.indexOf(b);
    [domPos[i1], domPos[i2]] = [domPos[i2], domPos[i1]];
    render();
    await wait(ms);
  }

  return new Promise(resolve => {
    buttons.forEach((btn, i) => {
      btn.disabled = false;
      btn.addEventListener('click', () => {
        buttons.forEach(c => { c.disabled = true; });
        resolve(domPos[i]);   // 클릭한 버튼이 "지금 있는" 화면 자리
      }, { once: true });
    });
  });
}
