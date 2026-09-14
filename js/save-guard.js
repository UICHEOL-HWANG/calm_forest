// =============================================================
//  calm forest · 🛡️ 세이브 덮어쓰기 방지 규칙 (순수 모듈)
//  ------------------------------------------------------------
//  배경(실제 사고 2건): 세이브를 못 읽은 채 게임이 시작되면 새 마을이 만들어지고,
//  30초 뒤 첫 자동저장이 upsert 로 서버의 멀쩡한 마을을 덮어썼다.
//    · 2026-09-14 — 2,576코인 → 5코인(집 4단계·배지 9개·스토리 4챕터 소실)
//    · 2026-09-11 — 208코인 → 5코인
//  원인은 loadGame() 이 "읽기 실패"와 "저장 없음(신규 유저)"을 똑같이 null 로 돌려준 것.
//  호출부는 그걸 신규 유저로 읽었다.
//
//  규칙: 실패는 신규가 아니다.
//   · 읽기에 성공했고 행이 있으면 → 그 저장으로 논다.
//   · 읽기에 성공했는데 행이 없으면 → 진짜 신규 유저다. 새 마을을 준다.
//   · 읽기에 실패하면 → 아무것도 단정하지 않는다. 입장을 미루고(읽을 때까지 기다린다)
//     저장도 잠근다. 두 겹으로 막는 이유는, 입장만 막아도 사고는 안 나지만
//     나중에 누가 입장 조건을 건드려도 덮어쓰기는 여전히 불가능해야 하기 때문이다.
//   · 오프라인(게스트·키 미설정)은 실패가 아니다. 서버에 쓰지 않으니 덮어쓸 것도 없다.
//
//  브라우저 전역에 의존하지 않아 node 테스트가 잠근다(tests/save-guard.test.mjs).
// =============================================================

/**
 * 세이브 읽기 결과를 판정한다.
 * @param {{ online: boolean, error: any, row: object|null, freshGuest?: boolean }} r
 *   online     — 서버에 저장하는 세션인가(오프라인이면 false)
 *   error      — 읽기 중 발생한 오류(없으면 null)
 *   row        — 읽어온 저장 상태(없으면 null)
 *   freshGuest — 이 세션에서 익명 계정을 **방금 만들었는가**. signInAsGuest() 는 남은 익명
 *                세션을 지우고 매번 새 계정을 만들므로, 그 id 에는 game_saves 행이 존재할 수
 *                없다 — 즉 잃을 것이 0이다.
 * @returns {{ kind: 'loaded'|'empty'|'failed'|'failed_fresh'|'offline', state: object|null, canPlay: boolean, canSave: boolean }}
 */
export function loadOutcome({ online, error, row, freshGuest = false }) {
  if (!online) return { kind: 'offline', state: null, canPlay: true, canSave: true };
  if (error) {
    // 🚪 지킬 세이브가 없는 사람까지 가두면, REST 장애 한 번에 신규·게스트 입구가 통째로 막힌다.
    //   입장은 시키되 저장은 잠근다 — freshGuest 판정이 틀렸을 경우에도 덮어쓰기는 못 하도록.
    if (freshGuest) return { kind: 'failed_fresh', state: null, canPlay: true, canSave: false };
    return { kind: 'failed', state: null, canPlay: false, canSave: false };
  }
  if (!row) return { kind: 'empty', state: null, canPlay: true, canSave: true };
  return { kind: 'loaded', state: row, canPlay: true, canSave: true };
}

const RETRY_FIRST = 600;    // 첫 재시도는 빠르게 — 대부분의 실패는 일시적인 네트워크 딸꾹질이다
const RETRY_MAX = 5000;     // 상한. 계속 실패해도 서버를 때리지 않고 조용히 기다린다

/** 재시도 간격(ms). 0회차부터 시작해 상한까지 배로 늘린다. */
export function retryDelay(attempt) {
  const n = Math.max(0, Math.floor(attempt) || 0);
  return Math.min(RETRY_MAX, RETRY_FIRST * Math.pow(2, n));
}

//  🚪 스스로 낫지 않는 실패 — refresh token 폐기·만료(모든 요청이 401), game_saves RLS 정책
//    사고, 결제 문제로 정지된 프로젝트. 이때는 5초마다 영원히 재시도만 하고 유저는 갇힌다.
//    로그아웃 버튼은 enterGame() 다음 줄에서야 화면에 붙어서 손댈 수도 없다.
//
//    다시 들어가기(새로고침)면 세션 갱신부터 다시 타므로 두 경우가 다 풀린다:
//      · 토큰이 살아 있다 → 읽기가 되살아나 그대로 이어서 플레이
//      · 토큰이 죽었다   → initAuth 가 로그인 화면을 띄워 재로그인으로 이어짐
//    처음부터 버튼을 보이면 일시적 딸꾹질에도 누르게 되니, 한동안은 조용히 기다린다.
const RELOAD_AFTER = 6;   // 6회 실패 ≈ 30초(600+1200+2400+4800+5000+5000ms)

/** 이 회차에 "다시 들어가기" 버튼을 보여줄까. 한 번 열리면 계속 열려 있다. */
export function offerReload(attempt) {
  return (Math.max(0, Math.floor(attempt) || 0)) >= RELOAD_AFTER;
}
