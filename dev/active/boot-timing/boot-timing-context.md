# Context — boot-timing
Last Updated: 2026-11-16 20:40 KST

브랜치 feat/boot-timing (worktree .claude/worktrees/boot-timing, origin/main 94c6a865), 미커밋.

파일: js/boot-timing.js(새) · index.html(부팅 인라인 모듈 import·마크·visibilitychange) · js/game.js(bootWorld·enterGame 마크) · docs/analysis/event-taxonomy.csv(boot_timing 행) · tests/boot-timing.test.mjs · tests/shader-warm.test.mjs(정규식 갱신)

로컬 측정(맥, 모바일 화면, ?dbg=1): b 0.25 · m 0.80 · w 1.02 · W 1.26 · s 1.44초. 아이폰 첫 실행 55초와 비교 대상.

결정: 숨김 시 부분 전송 1회 + 플레이 전송 1회(로그인 시트가 웹뷰를 가려도 플레이 값 유지). dev 파라미터 세션은 trackEvent 가 막는다.
