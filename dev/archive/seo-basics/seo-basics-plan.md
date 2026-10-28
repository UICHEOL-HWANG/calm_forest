# SEO 기본기 6종 (calmforest.cloud)

## Context
검색 유입을 받을 준비가 안 돼 있다. robots.txt·sitemap.xml 은 404, RSS 없음, 네이버 소유확인 없음.
메타는 `/` 만 갖췄고 /shop·/privacy·/terms·/refund 는 title 뿐이다. 안내서는 index.html 이 fetch 하는 fragment 라
검색엔진이 읽을 독립 페이지가 없고, 이미지 53장(한·영 각각) 전부 `alt=""` 이다. 상품은 /shop 한 장에 20여 개가 모여 있다.
결정 사항(사용자 확정): 상품마다 개별 URL `/shop/<id>` 생성, RSS 는 소식함 전체 공지를 Worker 가 실시간 생성.

## 작업 위치
- `origin/main` 에서 워크트리 `feat/seo` 생성 (현재 브랜치 analytics/metrics-framework 는 미커밋 분석 작업이 있어 건드리지 않음)
- 워크트리엔 .env 없음 → 빌드 검증은 `node scripts/build-web.mjs` 만으로 충분
- dev docs: `dev/archive/seo-basics/` (plan·context·tasks)
- 새 코드에 주석 넣지 않기, 문구에 엠대시 금지

## 1. 검색엔진 등록
- index.html 에 네이버 `naver-site-verification` 메타 자리 추가 (코드값은 사용자가 서치어드바이저에서 발급해 전달)
- 구글은 기존 `google-site-verification` 유지
- 제출(서치콘솔 sitemap 제출, 서치어드바이저 사이트 등록·sitemap/RSS 제출·수집 요청)은 사용자 몫 → 절차 문서 `docs/ops/SEO_SUBMIT.md`

## 2·4. 페이지별 메타 (title·description·keywords·canonical·OG)
- 공통 head 조각을 만드는 순수 함수 `scripts/lib/seo-meta.mjs` (`seoHead({ path, title, description, image })`), 빌드가 각 페이지 `<head>` 에 주입
- 페이지 표(단일 출처 `scripts/lib/seo-pages.mjs`): `/`, `/guide/`, `/guide/en/`, `/shop`, `/privacy`, `/terms`, `/refund`, `/delete-account`
- index.html: `keywords`, `canonical`, JSON-LD `VideoGame` 추가 (기존 OG 유지)
- keywords 는 구글이 무시하지만 요청 항목이라 넣는다
- 제목 형식 `<페이지명> · 고요한 숲` (엠대시 → ·)

## 안내서 독립 페이지
- 빌드가 `guide/guide.html` fragment 를 감싸 `dist/guide/index.html`(→ `/guide/`), `guide-en.html` 을 `dist/guide/en/index.html` 로 생성
- head + `guide.css` 링크, `src="img/` → `src="/guide/img/` 치환
- fragment 원본은 그대로 (게임 fetch 경로 불변). `data-act="tutorial"` 버튼은 독립 페이지에서 "게임 하러 가기" 링크로 대체

## 3. sitemap·robots·RSS
- 빌드가 `dist/sitemap.xml` 생성 (seo-pages + 상품 페이지 전체, lastmod = 빌드일)
- `dist/robots.txt`: 전체 허용, `/dashboards/` `/beta/` `/api/` `/auth-popup` 차단, Sitemap 2줄(sitemap.xml, rss.xml)
- `/rss.xml`: `functions/rss.js` + `worker/index.js` 라우트 등록 (api-route-wiring 함정)
  - DB: `public_notices(n int)` security definer 함수 — `target_user_id is null` 만, id·title·body·created_at, anon execute 허용. 개인 답장은 절대 미포함
  - 마이그레이션 `sql/migrations/migrate_public_notices_rss.sql`, pg8000 풀러로 직접 실행
  - RSS 2.0, 최근 20건, 본문 HTML 이스케이프, `Cache-Control: public, max-age=600`
  - index.html 에 `<link rel="alternate" type="application/rss+xml">`

## 5. 상품별 페이지
- `scripts/lib/shop-pages.mjs`: `ITEMS.filter(premium)` → `dist/shop/<id>.html` (URL `/shop/<id>`)
- 내용: 이모지 큰 썸네일, 이름, 구분, 가격(`price.cash.label ?? won`), 설명, 기간 한정(sale) 표시, 게임/가격표 링크
- JSON-LD `Product` + `Offer`(KRW). 이미지가 없으니 `image` 는 생략, OG 는 preview.jpg
- 상품 설명 문구 20여 개는 `js/cosmetics/catalog.js` 가 아니라 `scripts/lib/shop-copy.mjs` 에 둠 (게임 번들 무영향)
- 🚨 문구는 먼저 한국어 후보 표로 검수받고 넣는다
- /shop 표의 아이템 칸을 각 상품 페이지 링크로 (`shopRows` 수정, 기존 테스트 갱신)

## 6. 이미지 alt
- 안내서 53장 한국어·영어 각각 alt 작성 (바로 아래 `.cap` 캡션을 기본으로 화면 내용 묘사)
- index.html 앨범 셀 `alt=""` → 날짜·날씨 기반 alt
- alt 문구도 표로 한 번에 검수

## 배포
- 웹(`build-web` → `wrangler deploy`). 🚨 루트 js/config.js test_ 토큰 함정 → 워크트리에서 배포
- 키 스캔(`git grep AIza|GOCSPX-…`) 후 main 병합·푸시(main + feat/capacitor-app)
- index.html 메타·alt 변경은 토스·Play·itch·iOS 에 영향 없음 → 다음 정기 배포에 묻어감 (따로 묻지 않고 마무리 때 고지)

## 검증
- `node --test tests/*.test.mjs` — 신규 테스트: seoHead 출력, sitemap 에 모든 페이지·상품 포함, robots 차단 경로, RSS 가 개인 답장 미포함·이스케이프, 상품 페이지 Product JSON-LD 파싱, 안내서 alt 빈 값 0개
- `node scripts/build-web.mjs` 후 dist 검사
- 배포 후 curl: `/robots.txt` `/sitemap.xml` `/rss.xml` 200·content-type, `/guide/` `/shop/firefly` 200
- 구글 리치 결과 테스트(Product), RSS 검증기, 브라우저로 /guide/·/shop/<id> 스크린샷 (PC·모바일)
- code-reviewer 에이전트 리뷰

## 사용자 몫 (마무리 때 첫 줄 고지)
- 네이버 서치어드바이저 로그인·사이트 등록 → 확인 코드 전달
- 서치콘솔/서치어드바이저에 sitemap.xml·rss.xml 제출
- 상품 설명·alt 문구 검수
