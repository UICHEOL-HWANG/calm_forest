# Context — landscape-mode
Last Updated: 2026-10-14 13:20 KST

- 워크트리 `.claude/worktrees/landscape-mode` (branch feat/landscape-mode, base origin/main d06cc039)
- 프리뷰: root .claude/launch.json `landscape-mode` (port 8805) — `?dbg&touchsim=1&e2=skip_login` 로 계정 없이 진입
- CSS 전부 index.html 안. 폭 기준 블록: max-width 640/760, min-width 760.02. 높이 블록 640/560/460 일부(#habitat-meter 가로 대응 선례)
- 코치: index.html #coach(930~943, 1173 폰 슬롯 162px), renderCoach 4262, TUT_STEPS 4194 (17단계), renderCoachGoal = 장 목표 줄
- 모바일 HUD 규약: 메모리 mobile-hud-layout (컨텍스트 슬롯 12,162)
- 플랫폼: Android manifest 방향 고정 없음, iOS plist 가로 허용, 토스 세로 고정(SDK Screen.setOrientation 5.215+)
- 피드백 원문: docs/feedback/2026-10-13-chat-feedback.md #1 #2
