// =============================================================
//  ⌨️ 키보드 눌림 상태 — game.js 의 keys 맵을 순수 모듈로 분리(노드 테스트 가능)
//  버그 재발 방지 규칙(2026-09-09 베타 직전 보고 2건):
//   1) 입력칸(닉네임 등)에서 친 W/A/S/D·방향키는 게임 이동으로 안 잡는다 → 캐릭터 선택창에서 걷던 현상
//   2) 창 포커스가 빠지면(Cmd+Tab·다른 탭·새 창) keyup 이 안 오므로 reset() 으로 전부 뗀다 → 키 하나가 영원히 눌려 계속 걷던 현상
// =============================================================

// 포커스가 글자 입력 요소에 있으면 true — 그 안에서 친 키는 게임 조작이 아니다
export function isEditableTarget(t) {
  if (!t) return false;
  if (t.isContentEditable) return true;
  const tag = String(t.tagName || '').toUpperCase();
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

export function createKeyState() {
  const keys = {};
  return {
    // keydown — 입력칸에서 온 키는 무시하고 false 반환(호출자는 그때 preventDefault 도 하지 말 것: 칸 안 커서 이동 유지)
    down(e) {
      if (isEditableTarget(e.target)) return false;
      keys[e.code] = true;
      return true;
    },
    // keyup — 어디서 왔든 무조건 뗀다(포커스가 칸으로 옮겨진 채 떼도 안 걸림)
    up(e) { keys[e.code] = false; },
    isDown(code) { return !!keys[code]; },
    anyDown() { return Object.keys(keys).some(k => keys[k]); },
    // 전부 뗌 — blur/visibilitychange/pagehide 와 모달이 뜰 때
    reset() { for (const k of Object.keys(keys)) keys[k] = false; },
    // WASD/방향키 → 이동 축. blocked(모달 등) 면 0 — 키가 눌려 있어도 걷지 않는다
    moveAxes(blocked = false) {
      if (blocked) return { mx: 0, mz: 0 };
      let mx = 0, mz = 0;
      if (keys['KeyW'] || keys['ArrowUp']) mz -= 1;
      if (keys['KeyS'] || keys['ArrowDown']) mz += 1;
      if (keys['KeyA'] || keys['ArrowLeft']) mx -= 1;
      if (keys['KeyD'] || keys['ArrowRight']) mx += 1;
      return { mx, mz };
    },
    // ?dbg=1 스냅샷용
    list() { return Object.keys(keys).filter(k => keys[k]); },
  };
}
