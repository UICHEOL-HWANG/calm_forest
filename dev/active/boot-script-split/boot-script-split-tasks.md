# Tasks — boot-script-split

## 1단계
- [x] 실패 테스트: 첫 화면에 js/game-ui/ 없음, game-lazy 가 game-ui 로드
- [x] js/game-ui/cook-course.js
- [x] js/game-ui/carve-hud.js
- [x] js/game-ui/shop-menu.js
- [x] js/game-ui/index.js + game-lazy 연결 + ensureWorld 설치
- [x] index.html 에서 옮긴 구역 제거·위임 함수
- [x] 영향 테스트 갱신, 전체 테스트, 번들 크기
- [x] 브라우저: 요리 코스·조각·상점·호미 가판대 열기
- [x] 리뷰 → 로컬 커밋(0b1182e5)

## 2단계
- [x] 작업대·주방 메뉴판·나룻배 창고·리더보드·도감·사진·가방(73253eed)

## 3단계
- [x] 안내서 패널·집 외관 꾸미기

## 품질
- [x] 영어 라벨 2개(Continue with Apple · Today's Log)
- [x] 패널별 설치 격리: PANEL_IDS 사전 점검 + 의존 패널(작업대→조각, 주방→요리) 건너뛰기
- [x] index.html 연결 함수 전부 gameUi?.패널?. 로 · isBGMOn 미사용 import 제거
- [x] 브라우저: ext-close·cv-quit 끊은 빌드에서 해당 패널만 빠지고 가방·주방 정상, 전체 테스트 5275 통과
