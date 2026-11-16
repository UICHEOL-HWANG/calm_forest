# Context — market-buy-hint
Last Updated: 2026-11-16 19:58 KST

브랜치 feat/market-buy-hint (worktree .claude/worktrees/market-buy-hint, origin/main 94c6a865 기준), 미커밋.

핵심 파일
- js/weekly/rules.js `whereOf(item, {stored, hasHouse})`
- js/weekly/bridge.js `where`, `storedIndoor`
- js/weekly/ui.js `marketView` row.where, `whereLine`
- js/weekly/index.js `placeGuide`, `PLACE_R`, `spotOf/reachOf`, `weeklyPriority`, `weeklyHouseReady`
- js/game.js initWeekly deps(whereOf·storedIndoor·placeSpots·toast), arbiter weekly priority
- js/spaces/house.js 집 완성 시 weeklyHouseReady()
- js/weekly/copy.js `where`, js/weekly/style.js `.wk-where`, js/guide/feature-rules.js ARROW_LABEL, js/i18n-en.js

결정
- 새 화살표는 weekly 가이드 안에서 처리(중재기 이름 weekly 그대로). countTry 는 market/board 만 — onGuide 에서 tried.add 로 건너뜀
- 집 문 앞 = HOUSE_POS + (0, 3), 도착 반경 3

시안: sims/market-buy-hint/compare.jpg (메인 체크아웃)
