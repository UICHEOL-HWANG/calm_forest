// =============================================================
//  📜 밤손님 쪽지 순서 — 쪽지가 대결을 덮지 않게 "언제 보여 줄지"만 정한다(순수 규칙)
//  ------------------------------------------------------------
//  ▶ 순서는 늘 쪽지 → 대결. 흔적을 조사했는데 아직 안 본 쪽지가 있으면 쪽지를 먼저 띄우고
//    닫은 뒤 대결을 연다. 대결 중에 도착한 쪽지는 끝난 뒤로 미룬다(2026-09-26 실기기 제보:
//    가위바위보 한가운데 🧑‍🌾 쪽지가 떠서 판을 덮었다).
//  ▶ 쪽지가 아직 안 왔으면(Gemini 응답 대기) 대결을 기다리게 하지 않는다 — 대결 뒤에 도착하면 그때 보여 준다.
//  ▶ 한 번 보여 준 쪽지는 다시 띄우지 않는다. 상태는 변형하지 않고 새 값을 돌려준다.
//  사용처: js/spaces/night-visit.js · 테스트: tests/night-note-queue.test.mjs
// =============================================================

export const initNoteQueue = () => ({ note: null, shown: false });

// 쪽지 도착 — 일단 쥐고 있는다(띄우는 건 한 박자 뒤 showIfIdle, 또는 대결 직전 beforeDuel)
export function noteArrived(state, note) {
  return note?.text ? { note, shown: false } : state;
}

// 한가할 때(대결 밖) 쥐고 있던 쪽지를 보여 준다 — 도착 한 박자 뒤와 대결이 끝난 뒤에 부른다
export function showIfIdle(state, { duelActive }) {
  return duelActive ? { state, show: null } : pendingShow(state);
}

// 흔적 조사 직후·대결 직전 — 아직 안 본 쪽지가 있으면 그걸 먼저
export function beforeDuel(state) {
  return pendingShow(state);
}

function pendingShow(state) {
  if (!state.note || state.shown) return { state, show: null };
  return { state: { ...state, shown: true }, show: state.note };
}
