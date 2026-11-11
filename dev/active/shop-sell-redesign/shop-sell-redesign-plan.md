# 상점 팔기 탭 개편 (C안) 계획

## 목표
- 팔기 탭을 "가진 것만 칸으로 보여 주고, 골라서 수량 정해 팔기"(C안)로 바꾼다.
- 상점 창 닫기 버튼을 창 아래 가운데에 크게 둔다.

## 근거
- 시안: sims/shop-sell-compare.html, 캡처 sims/shop-sell/compare.jpg
- 지금 문제: 38개 품목 전부 노출(대부분 0개), 이름 없음(🐚 5종 구분 불가), "탭 1개 · 꾹 전부" 반복·숨은 조작
- 레퍼런스: 스타듀(가방 아이템만), 동물의 숲(오늘 비싼 품목 강조), 헤이데이(골라서 수량 정하기)

## 단계
1. js/shop/sell-rules.js 순수 함수 + tests/shop-sell-rules.test.mjs (TDD)
   - sellQty(have, req): true=전부, 숫자=1..have 로 자르기, 그 밖=1
   - sellList(market, inv): 가진 품목만, 시세 높은 순, 이름에서 앞 이모지 제거
   - clampQty(q, have)
2. js/spaces/shop.js sellItem(k, req) 가 수량 숫자를 받게
3. index.html renderShop 팔기 분기: 칸 그리드 + 하단 판매대(− 수량 + · 전부 · 팔기 🪙합계)
4. 닫기 버튼: #shop-menu .dm-actions 가운데, 넓고 진하게
5. i18n-en 새 문구
6. 게임에서 PC·모바일 확인, 테스트, 코드 리뷰
