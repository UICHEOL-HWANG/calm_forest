# 🌙 꿈의 숲 — 구현 계획

스펙: docs/superpowers/specs/2026-10-08-dream-forest-design.md (승인됨)
브랜치/워크트리: feat/dream-forest · .claude/worktrees/dream-forest

## 단계
1. **순수 로직** `js/dream/layout.js` + `tests/dream-layout.test.mjs` (TDD)
   - ISLANDS/BRIDGES/SHARD_SPOTS 표, clampWalkable, pickShards(day), normalizeDream(saved, today), shardsLeft, islandOf
2. **아트** `js/dream/art.js` — 섬(병합)·수정 나무·버섯 등·구름 침대·초승달 마차·조각+빛기둥·하늘 구
3. **공간** `js/spaces/dream.js` — buildDreamSpace(지연)·enterDream/wakeFromDream·updateDream(조각 줍기·프롬프트·HUD)·트래킹
4. **컷신** `js/dream/cutscene.js` — 잠들기→비행→도착, 건너뛰기
5. **game.js 연결** — atDream 플래그·$w·spaceFlags·setSpaceVisible·updateDayNight 블록·이동 한계·minimap/place 체인·getGameState 복귀·applySave·gameState 기본값·doSleep 분기·액션 라우팅·입력 잠금
6. **UI(index.html)** — 선택 모달·도착 카드·건너뛰기·HUD 칩·꾸미기 ✨
7. **꿈 장식 4종** — DECOR + decorMesh + sleep 판정 확장 + 노출 필터
8. **BGM 'dream'** (sound.js)
9. **i18n** — i18n-en.js 전 문구
10. **테스트 갱신** — shadow-scope·minimap·decor-ceiling·i18n + dream-wiring 소스 검사
11. **브라우저 실측** — PC·모바일 캡처, 드로우콜, 콘솔 에러 0
12. **코드 리뷰**(code-reviewer) → 수정 → 커밋
