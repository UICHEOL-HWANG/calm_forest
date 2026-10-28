# app-link-guide · context
Last Updated: 2026-10-18 KST
- 워크트리 .claude/worktrees/app-link-guide · feat/app-link-guide (origin/main c98d05c9)
- 재사용: js/app-banner.js storeTarget·storeUrl·DEFAULT_APP_BANNER, js/tuning.js TUNING.appBanner, assets/badges/*
- 워커: worker/index.js fetch() — /rss.xml 처럼 /api 밖 라우트 추가
- 웹 빌드 화이트리스트 scripts/build-web.mjs INCLUDE
- 안내서: guide/guide.html·guide-en.html(fragment) · scripts/lib/guide-page.mjs(공개 페이지) · tests/guide.test.mjs·seo.test.mjs

## 2026-10-18 진행
- 사실 근거: 산장 바리스타 이름표는 "🦊 북극여우"(솜눈 아님) · 프롤로그 약 26초 · 코치 카드는 화면 위 가운데(폰은 미니맵 아래) · ☰ 메뉴 머리글에 계절·시간 이모지 있음 · 별 보는 아이는 6장 뒤
- 캡처: 오프라인 게스트(Supabase·GA 차단)로 한 세션 안에서 상태를 이어 만듦(오프라인은 새로고침하면 세이브가 사라짐). 손가락 안내는 실제 입력으로 통과
- 리뷰 MEDIUM 중 utm_medium 덮어쓰기는 그대로 둠 — utm 은 원래 누구나 붙일 수 있는 값이고 영숫자만 남겨 주입은 막힘
- 미리보기: preview.html (스크래치 mkpreview2.mjs 로 생성)
- 앨범 버그 수정은 fix/decor-album-menu 6c93b192 — 안내서 27장 문구가 "☰ → 📒 기록 → 🎁 꾸미기 세트"를 전제로 함. 같이 배포
