# seo-basics context

Last Updated: 2026-10-18

## 위치
- 워크트리 ../calm_forest-seo, 브랜치 feat/seo (origin/main 2b319a7d 기준)

## 핵심 파일
- scripts/build-web.mjs: dist 화이트리스트 빌드, /shop 생성 (storeOpen 일 때만)
- scripts/lib/shop-rows.mjs: /shop 표 줄
- js/cosmetics/catalog.js: ITEMS (premium=won 있는 품목)
- guide/guide.html, guide/guide-en.html: fragment, 이미지 alt 53장 빈 값
- worker/index.js: /api 라우트, 그 외 ASSETS
- sql/migrations/migrate_notices.sql: notices RLS 는 authenticated 만 → anon RSS 는 security definer 함수 필요

## 결정
- 상품별 개별 URL /shop/<id>
- RSS = 전체 공지(target_user_id is null) 실시간, Worker /rss.xml
- 상품 설명은 scripts/lib/shop-copy.mjs (게임 번들 무영향)
- 상품 이미지 없음 → 이모지 썸네일, 이미지는 후속

## 사용자 몫
- 네이버 서치어드바이저 확인 코드
- 서치콘솔·서치어드바이저 sitemap/RSS 제출
- 문구 검수

## 리뷰 반영 (2026-10-18)
- 한정 판매 상품: 빌드 시점 saleOpen 으로 판정 → 닫히면 JSON-LD Discontinued + "판매 기간이 끝났어요" + sitemap 제외
- ⚠️ 정적 빌드라 할로윈 종료(2026-11-02) 뒤 웹 재배포가 한 번 필요
- 가격 라벨 == won 테스트로 고정, RSS 제어문자 제거, robots 에 안내서 fragment 차단, sitemap lastmod 생략
- RPC public_notices 운영 DB 적용 완료 (anon: 함수 17건 / 테이블 직접 0건)
