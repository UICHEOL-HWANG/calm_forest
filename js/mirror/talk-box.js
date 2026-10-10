// =============================================================
//  🪞 거울 주민 대화 박스(B안, 2026-10-10 사용자 선택) — 화면 아래 얼굴·이름·대사
//  ------------------------------------------------------------
//  말 걸기(단서)·돌려주기(고마워요)가 토스트 5초로 사라져 "대화가 안 열린다"로 읽혔다(페르소나 3/20).
//  게임 화면은 어둡게 하지 않는다 — 걸으면서 읽고, 액션(Space·버튼)·탭으로 닫거나 멀어지면 닫힌다(호출부 mirror.js).
//  DOM 만 만진다(게임 상태·트래킹은 호출부). 마크업·CSS 는 index.html #mirror-talk.
// =============================================================
let el = null, openedAt = 0;
const $ = (id) => document.getElementById(id);

/** 박스를 띄운다 — face: 이모지, color: 얼굴 배경(CSS 색), next: 닫는 법 안내 */
export function showTalk({ face, color, name, line, next }) {
  el ??= $('mirror-talk');
  if (!el) return;
  $('mt-face').textContent = face; $('mt-face').style.background = color;
  $('mt-name').textContent = name; $('mt-line').textContent = line; $('mt-next').textContent = next;
  el.classList.add('show');
  openedAt = performance.now();
}
/** 닫는다 — 떠 있던 초(닫혀 있었으면 null) */
export function hideTalk() {
  if (!el?.classList.contains('show')) return null;
  el.classList.remove('show');
  return Math.round((performance.now() - openedAt) / 100) / 10;
}
export const talkShown = () => !!el?.classList.contains('show');
/** 박스를 눌러 닫기 — 한 번만 건다 */
export function onTalkTap(fn) {
  const box = $('mirror-talk');
  if (box && !box.dataset.bound) { box.dataset.bound = '1'; box.addEventListener('click', fn); }
}
