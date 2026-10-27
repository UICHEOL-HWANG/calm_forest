# context
Last Updated: 2026-10-27
- 워크트리 /Users/uicheol_hwang/calm_forest-homi-skins (feat/homi-skins, origin/main 6d9409e3 기준)
- 임시 캡처 훅 window.__TMPSTALL (js/game.js __tp 아래) — 커밋 전 반드시 제거
- 조사 결과: 호미 스킨은 mudflat.js:137 holdShovel 에서 skin pal/over 를 안 넘김. 참고 sims/hoe-skin-compare.html:20
- _premium_cosmetic_ids 는 3개 마이그레이션에 같은 목록, tests/security-hardening.test.mjs 가 카탈로그와 대조
- 가격 표시·현금 버튼은 web 전용(premiumRowMode). 토스·앱은 노점 미리보기만
- mudflat_set: 바구니·장화 조형 없음 → 결정 필요
