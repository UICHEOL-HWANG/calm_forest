# 컨텍스트 — house-redesign
Last Updated: 2026-09-10
- 조형 원본: 서브에이전트 5개가 sims/house-concepts 뷰어(index.html, shot.mjs headless 캡처)로 만든 것. 게임과 뷰어가 js/house/*.js 를 공유.
- game.js: buildHouseStage(4794) 3단계·4단계+ 분기, buildExpandedHouse(4882~4994, 삭제 대상), applyHouseStyle(1228), PART_COLORS(1207), houseWindows(1197, 8369 점등), houseGroup 회전 π(4717), houseSolidR(4730).
- 검증: scratchpad/cap.mjs HOUSE=3..6 (headless :9223, 서버 :8000).
