# 검색엔진 등록·제출 절차 (calmforest.cloud)

배포 후 사람이 콘솔에서 해야 하는 일. 코드 쪽 준비물(sitemap·robots·RSS·메타)은 `scripts/build-web.mjs` 가 만든다.

## 공개 URL
- 사이트맵: https://calmforest.cloud/sitemap.xml (고정 페이지 + /shop/<id> 상품 페이지, 빌드 때마다 다시 생성)
- RSS: https://calmforest.cloud/rss.xml (소식함 전체 공지 최근 20건, 10분 캐시, Supabase `public_notices()`)
- robots: https://calmforest.cloud/robots.txt

## 1. 네이버 서치어드바이저 (searchadvisor.naver.com)
1. 네이버 로그인 → 웹마스터 도구 → 사이트 등록에 `https://calmforest.cloud` 입력
2. 소유확인 방식: **HTML 태그** 선택 → `<meta name="naver-site-verification" content="...">` 의 content 값을 Claude 에게 전달
3. Claude 가 index.html 에 넣고 웹 배포 → 서치어드바이저에서 **소유확인** 클릭
4. 요청 → 사이트맵 제출: `https://calmforest.cloud/sitemap.xml`
5. 요청 → RSS 제출: `https://calmforest.cloud/rss.xml`
6. 요청 → 웹 페이지 수집: `/`, `/guide/`, `/shop` 을 수동 수집 요청 (하루 50건 한도)
7. 검증 → robots.txt 에서 수집 허용 확인

## 2. 구글 서치콘솔 (search.google.com/search-console)
- 소유확인은 이미 index.html 의 `google-site-verification` 으로 되어 있다
1. Sitemaps → `sitemap.xml` 제출
2. URL 검사 → `/guide/`, `/shop/firefly` 색인 생성 요청
3. 리치 결과 테스트(search.google.com/test/rich-results)로 `/shop/firefly` 의 Product 확인

## 3. 다음 (선택)
- webmaster.daum.net 에서 사이트 등록 (PIN 코드 방식, robots.txt 에 추가 필요)

## 유지보수 규칙
- 새 공개 페이지 → `scripts/lib/seo-pages.mjs` 의 `SEO_PAGES` 에 한 줄 추가하면 메타·sitemap 이 따라온다
- 새 현금 상품 → `scripts/lib/shop-copy.mjs` 에 설명 추가 (없으면 테스트가 실패한다)
- 안내서 이미지 추가 → alt 를 비워 두면 테스트가 실패한다
