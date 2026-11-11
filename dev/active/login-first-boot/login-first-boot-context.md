# context — Last Updated: 2026-11-10

핵심 파일
- index.html 부팅 IIFE(약 8091~8238행): bootWorld → loading 숨김 → 설문 → initAuth → 분기
- index.html enterPlay(5756행), showLoginScreen(5733행)
- js/game.js bootWorld(2418행) — 동기로 마을 전체를 짓는다
- js/supabase-client.js initAuth(158행) — esm.sh 동적 import. 문자열은 build-cap 치환 앵커("await import('https://esm.sh/...')") — 그대로 둔다
- scripts/build-web.mjs INCLUDE — 새 이미지 추가
- 새 순수 모듈 js/boot-order.js + tests/boot-order.test.mjs

결정
- 시안 1(3D 첫 장면 사진) 사용자 선택(11/10). 시안 비교 sims/login-first/compare.jpg
- 웹만 적용. 설문은 앱 전용이라 웹 흐름 무관
- 측정 근거: ml/reports/webview_identity_20261110/ (q3_load_by_source, web_left_before_login.png)
