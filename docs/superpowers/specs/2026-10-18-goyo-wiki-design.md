# 고요위키 설계 (2026-10-18)

## 목적
게임 검색 유입. 상품 페이지 대신 "고요한 숲 방어", "고요한 숲 세계수" 같은 공략·도감 검색어를 받는다. 읽기 전용, 한국어 먼저.

## 결정 사항 (사용자 확정)
- 범위: 도감 76 + 바다터 물고기 4 = 80 문서, 분류 13 (꾸미기·상품 흡수는 2단계)
- 본문: Claude 초안 → 사용자 검수, 분류 묶음별
- 방식: 빌드 시 정적 HTML (build-web.mjs), 서버·DB 없음
- 주소: `/wiki/`, `/wiki/<분류>/`, `/wiki/<분류>/<id>` (영문 id, 제목은 한글)
- 디자인: A(나무위키 클래식) 뼈대 + B(숲 도감 카드) 하단 연결 카드·게임 버튼, 게임 초록 팔레트. 시안 `sims/wiki-design-compare.html`
- 게임 SEO 와 위키를 한 번에 배포

## 구조
- `scripts/lib/wiki/load-data.mjs`: Node 로더(`three` → `vendor/three/three.module.js`)로 `js/data/dex.js`·`catalog.js`·`places.js` 등 게임 데이터를 그대로 import 해 위키 엔트리 배열로 정규화 `{ cat, id, name, nameEn, ico, facts[], relations[] }`
- `scripts/lib/wiki/content.mjs`: `wiki/content/<cat>.md` 파싱. `## <id>` 아래 `### 개요/얻는 법/쓰임새/여담`. `[[cat/id]]` 링크 해석, 없는 대상이면 빌드 실패
- `scripts/lib/wiki/render.mjs`: 문서·분류·대문 HTML. 정보 상자는 데이터에서만(본문에 수치 금지), 목차·번호 문단·분류 경로·함께 보면 좋아요·게임 버튼
- `scripts/lib/wiki/search-index.mjs`: `/wiki/search.json` (id, 제목, 영문명, 분류, 아이콘). 대문·상단 검색창이 클라이언트에서 필터
- 영문명: `js/i18n-en.js` EN 사전에서 조회, 없으면 생략

## 분류별 정보 상자
- 물고기: 장소, 시간, 날씨·계절 조건(dex-gates), 무게·보상(바다), 박물관 층
- 작물·과일: 재배 일수, 물 횟수, 씨앗가, 판매가
- 요리: 재료, 효과, 별점(stages 수), 카페가
- 주민: 위치, 의뢰 목록 제목
- 방문객: 필요 환경 태그, 시간·날씨
- 그 외: 얻는 곳, 조건, 박물관 층

## SEO (게임 + 위키 한 번에)
- 위키 문서마다 seoHead(title "<이름> · 고요위키", description=개요 첫 문장, canonical) + JSON-LD `Article` + `BreadcrumbList`
- sitemap: 위키 전체 추가, `/shop/<id>` 제외(페이지는 유지)
- 게임 → 위키 링크: index.html 에 `<link rel="alternate">`가 아닌 실제 `<a href="https://calmforest.cloud/wiki/">` (로그인 화면 하단 텍스트 링크 + ☰ 메뉴 항목). 문구 "📖 고요위키" (검수 대상)
- 안내서·가격표 하단에 위키 링크, 위키 상단에 게임·안내서 링크
- robots 변경 없음

## 검증
- 테스트: 모든 엔트리에 본문 4절, 깨진 `[[링크]]` 0, 정보 상자 수치가 데이터와 일치, sitemap 에 위키 80+13+1, `/shop/<id>` 미포함, 엠대시 금지, alt 비어 있지 않음
- 로컬 wrangler dev 로 라우팅·PC/모바일 캡처, code-reviewer 리뷰
- 배포: main 푸시 → main 기준 빌드·배포 → 30초 뒤 curl 재확인 → feat/capacitor-app 병합 → 서치콘솔·서치어드바이저 사이트맵 재제출
- 앱 번들(토스·Play·iOS·itch)은 index.html 링크 변경만 다음 정기 배포에 동반

## 범위 밖
- 영어판, 사용자 편집, 꾸미기·장소·시스템 문서, 이미지 렌더(이모지 아이콘 사용)
