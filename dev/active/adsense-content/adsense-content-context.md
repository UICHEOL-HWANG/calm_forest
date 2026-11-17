# Context
Last Updated: 2026-11-18

- 브랜치 feat/adsense-content (워크트리 .claude/worktrees/adsense-content, main 82f503f4 기준)
- 빌드: scripts/build-web.mjs, 페이지 메타 scripts/lib/seo-pages.mjs, seoHead(noindex 지원) scripts/lib/seo-meta.mjs
- 위키: scripts/lib/wiki/build.mjs(writeWiki 가 sitemap 경로 반환) · render.mjs(shell/renderDoc/renderHome)
- 로그인 화면 링크 줄: index.html #login-links
- 테스트: tests/wiki*.test.mjs, tests/seo*.test.mjs
- 결정: 개별 문서는 noindex,follow (링크는 따라가게)
