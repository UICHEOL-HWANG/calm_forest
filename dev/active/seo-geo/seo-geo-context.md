# SEO·GEO context

Last Updated: 2026-10-18 18:51 KST

- 워크트리: ~/calm_forest-seo-geo (feat/seo-geo, origin/main c98d05c9 에서 분기)
- 홈 head: index.html 손편집(SEO_PAGES '/' 는 file 없음). LD 27행·56행 중복
- 메타 헬퍼: scripts/lib/seo-pages.mjs · seo-meta.mjs(seoHead/injectHead)
- 사이트맵·robots: scripts/lib/sitemap.mjs, build-web.mjs 143행
- 위키: scripts/lib/wiki/{build,render,load-data,content}.mjs, 본문 wiki/content/*.md, facts 는 게임 데이터에서
- RSS: functions/rss.js (public_notices RPC, anon), worker/index.js 61행 라우트
- 결정 대기: 제목 문구·og:title 유지 여부·llms.txt 문안·FAQ 문형·소식 페이지 디자인·AI 학습봇 허용 여부
- 규칙: 새 코드 주석 금지 · 문구 엠대시 금지 · 배포는 4곳(웹만 해당하지만 index.html 은 토스·itch·앱 번들에도 들어감)

## 기준선 (Aside, 2026-10-18)
- GSC(URL 속성 https://calmforest.cloud/, 도메인 속성은 이 계정 권한 없음) 9/19~10/16: 노출 15 · 클릭 1 · CTR 6.7% · 순위 1.7 · 색인 1(10/12 기준) · sitemap 10/18 제출 101 URL · rss 18
- 네이버: 10/18 소유확인·sitemap·rss 제출, 리포트 생성 대기(데이터 없음)
- Bing·Cloudflare: Aside 브라우저 미로그인 → 확인 못 함
- 재측정: 배포 후 14일
