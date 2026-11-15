# index.html 시작 스크립트 나누기

## 목표
index.html 의 인라인 시작 스크립트(4,613줄, 첫 화면 압축 152KB)에서 게임 중에만 여는 화면을 모듈로 떼어,
게임 코드와 함께 늦게 받게 한다. 첫 화면 JS 를 줄인다(영어 사전 지연 로드 뒤 411KB 기준).

## 방식
- 화면마다 `js/game-ui/<기능>.js` 모듈. `install<기능>(ctx)` 가 이벤트를 붙이고 바깥에서 부를 함수를 돌려준다.
- 모듈이 직접 import 할 수 있는 것(i18n, sound, game-lazy 의 Input, 판매 규칙 등)은 import, 인라인 스크립트에만 있는 것($, ui, layoutBuffs, lastInv getter)은 ctx.
- `js/game-lazy.js` 의 loadGameModules 가 `./game-ui/index.js` 를 함께 받는다. index.html ensureWorld 가 bootWorld 전에 설치.
- 인라인에는 얇은 위임 함수만 남긴다(startCookCourse, openCarveHud, cvProgress… renderShop, openHomi, showShopTab).
- 로컬 개발 훅(window.__mg*, __carve*)은 해당 모듈로 옮긴다.

## 단계
1. 요리 코스(미니게임 4종·러너·판정) + 조각 공방 HUD + 상점(팔기·사기·호미) — 약 42KB(주석 제외)
2. 작업대, 나룻배, 도감, 사진, 가방
3. 안내서, 집 외관

단계마다: 테스트 → 브라우저에서 해당 화면 열어 확인 → 리뷰 → 로컬 커밋.

## 위험
- index.html 을 직접 읽는 테스트 105개 — 옮긴 코드를 보는 테스트는 새 파일을 읽게 고친다.
- 빠뜨린 공용 변수는 그 화면을 열 때만 터진다 → @babel/traverse 로 구역 간 참조를 자동 추출(scratchpad deps.cjs)하고 브라우저에서 직접 연다.
