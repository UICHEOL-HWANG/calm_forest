# 상점 팔기 탭 개편 · 컨텍스트
Last Updated: 2026-11-11 03:30

## 핵심 파일
- index.html: #shop-menu 마크업(~3186), 스타일(~2136, 모바일 ~2715), renderShop/bindSell(~7170)
- js/spaces/shop.js: sellItem(k, all), marketData()(가격·등락·라벨, 시세 높은 순)
- js/data/sell-icons.js: SELL_ICO_G
- js/i18n-en.js: 한국어 원문 키 → 영어
- tests/shop-menu-fit.test.mjs: 창 높이·목록 스크롤 규칙, `<span class="ck-ico">${SELL_ICO_G[k] || '📦'}</span>` 문자열을 검사함(바꾸면 테스트도 갱신)

## 결정
- 사용자 선택: C안(2026-11-11)
- 닫기: 창 아래 가운데, 눈에 띄게(사용자 요청)
- 수량 기본값 1, "전부" 버튼으로 한 번에. 목재·돌은 건축 재료라 기본 전부는 위험
- 이름은 marketData().label 에서 앞 이모지 제거해 사용

## 의존성
- Input.sellItem / Input.getSellPrice / Input.getPriceRates / Input.marketData (js/game.js Input 객체)
