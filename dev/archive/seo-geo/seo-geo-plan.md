# SEO·GEO 보강 계획 (fire-your-seo-agency 진단 후속)

진단: 2026-10-18 다섯 레인 점수표 (GEO ❌, 나머지 ⚠️). 사용자 승인: 1~6 전부, 문구·디자인은 먼저 검수.

1. `/llms.txt` 신설 — 빌드가 생성(위키 분류·문서 수 자동 반영)
2. AI 학습봇 403 — Cloudflare 대시보드 설정. 사용자 결정 + Aside 로 처리
3. 홈 메타 — VideoGame LD 2개 → 1개, Organization + sameAs, 제목 키워드, 설명 엠대시 제거
4. 사이트맵 lastmod — 빌드 시점이 아니라 소스 git 수정일 기준
5. 위키 원출처화 — 문서마다 facts 에서 자동 생성한 FAQ + FAQPage LD(가시 텍스트와 동일), Article dateModified
6. 소식 개별 페이지 `/news/<id>` — Worker 가 public_notices 로 SSR, RSS 링크 교체, `/sitemap-news.xml`

측정: 변경 전 GSC·서치어드바이저 기준선(Aside), 배포 14일 뒤 재측정.
