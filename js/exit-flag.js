// 🚪 "방금 스스로 나갔다" 표시 — 나가기 → 새로고침 뒤 첫 부팅에서 한 번만 읽힌다.
//   ⚠️ 토스는 세션이 없으면 로그인 화면을 건너뛰고 자동 연결한다(2026-09-04 7671636).
//      그래서 나가기(signOut → reload)를 누르면 곧바로 다시 들어가 캐릭터 선택으로 돌아오는 루프가 됐다(2026-09-25 제보).
//      나가기 직후 한 번은 자동 연결을 건너뛰고 로그인 화면("바로 플레이하기")을 보여 준다.
//   sessionStorage — 같은 탭(웹뷰)의 새로고침에만 남고, 앱을 새로 열면 사라진다(첫 진입 자동 연결은 그대로).
const KEY = 'cf_exited';

/** 나가기 직전에 부른다. 저장소가 막혀 있어도 나가기는 계속된다. */
export function markExit(storage) {
  try { storage?.setItem(KEY, '1'); } catch { /* 사생활 보호 모드 등 — 표시 없이 나간다 */ }
}

/** 부팅 때 한 번 — 표시가 있었는지 돌려주고 지운다(다음 새로고침엔 다시 자동 연결). */
export function consumeExit(storage) {
  try {
    const was = storage?.getItem(KEY) === '1';
    if (was) storage.removeItem(KEY);
    return was;
  } catch { return false; }
}
