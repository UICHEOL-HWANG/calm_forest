# boot-bundle 컨텍스트

Last Updated: 2026-10-24 16:55 KST (웹·토스·Play 배포, iOS 업로드 대기)

## 핵심 파일
- `index.html` 2569~: 로딩 화면 번역 부트 스크립트, PWA, importmap(unpkg three 0.160.0), 큰 인라인 모듈(약 3,667줄)
- `scripts/build-web.mjs` → dist/ (wrangler), `scripts/build-ait.mjs` → dist-toss/, `scripts/build-itch.mjs` → dist-itch/, `scripts/build-cap.mjs` → dist-cap/(Android·iOS, importmap 을 vendor/ 로 치환)
- `scripts/fetch-vendor.mjs`: vendor/three, vendor/supabase.js(esbuild 이미 사용 중)
- `_headers`: 전 경로 no-cache
- 동적 import: `js/free-pot/dish.js`(./table.js), `js/spaces/observatory.js`(ui·book), `js/platform.js`(esm.sh 토스 SDK), `js/supabase-client.js`(esm.sh supabase, cap 은 vendor 로 치환)

## 측정값 (2026-10-24)
- 운영: 스크립트 250개, decoded 2.97MB, encoded 1.25MB, h3, DOMContentLoaded 3.1s(PC 회선)
- 시험 묶기(스크래치패드): 7파일 1.4MB min, gzip 504KB. 큰 덩어리 spaces 308KB · i18n-en 208KB · game.js 172KB · free-pot 171KB · 인라인 133KB
- three: module.js 1.27MB 원본, module.min.js gzip 166KB

## 결정
- 묶기는 배포 산출물에서만(원본 구조 유지, 파일 분리 규칙과 충돌 없음)
- 배포는 10/31 광고 판정 이후 5곳 동시
- 4단계(영어 사전 지연)는 별도 승인

## 의존
- esbuild ^0.28.2 devDependency 설치됨
