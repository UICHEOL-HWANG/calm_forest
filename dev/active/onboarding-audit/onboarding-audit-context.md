# 맥락

Last Updated: 2026-10-23 02:00

- 작업 위치: `.claude/worktrees/ad-main` 브랜치 `feat/coach-compact`(main 13eada7b 기반). 로컬 서버 8012 가 이 체크아웃을 띄움.
- 시안: `sims/coach-compact-sim.html`, 캡처 `sims/coach-compact/`.
- 코치: index.html `#coach`(head=#coach-short·#coach-count·▾ / body=#coach-text·진행바·건너뛰기), `TUT_STEPS[].short`, `peekCoach()`·`placeCoach()`.
- 원인 조사 결과(2026-10-22):
  - firstHint(game.js ~1473) 대기 조건이 coachActive 뿐 — anyModalOpen·treeShotBusy·intro-open 없음.
  - dexDiscover('weather')(game.js ~2702)가 캐릭터 선택 전에 실행, ui.toast 는 npc-modal 만 기다림.
  - 도구 휠 js/hud/tool-fan.js: 탭 열기·탭 고르기는 이미 있으나 스포트라이트(#spot-layer z48)가 휠(z45) 위를 막음. 문구 7곳.
  - 사파리 열기 js/auth/in-app-login.js·in-app-browser.js: iOS x-safari-https 는 인앱이 막을 수 있음 → '··· → 외부 브라우저' 즉시 안내 + 링크 복사.
- 사용자 규칙: 답은 한국어만, 새 코드에 주석 금지, 디자인은 시안 비교 후 결정, 배포는 4곳.

- 2026-10-23: 1~5 구현, npm test 3,821 통과. 남은 것: 6(상인·상점 갑툭튀)·7(꾸미기 위치)은 흐름 지도 조사 결과 대기. 커밋 전.
