# lazy-game-boot tasks

## 1단계
- [x] login-first-boot 변경 커밋(선행)
- [x] 회귀 테스트 먼저 작성: index.html이 game.js와 무거운 7개를 static import하지 않는다(RED)
- [x] js/game-lazy.js: loadGame, Input Proxy, 위임 함수
- [x] SELL_ICO_G를 three 없는 모듈로 분리
- [x] index.html import 교체, init* 등록을 ensureWorld로 이동
- [x] bundle-boot 감지 조건과 테스트 수정
- [x] 빌드 결과의 entry closure 크기 상한 테스트
- [x] npm test 전부, build-web, 로컬 dist 측정
- [x] 수동 점검: 로그인 → 플레이 → 저장 → 승부, 보물상자 → 푸시, 앱 배너
- [x] iOS 시뮬레이터 부팅 확인(설문 → 로그인 → 게스트 입장 → 캐릭터 3D 미리보기)
- [x] 코드 리뷰
- [ ] 배포(사용자 승인 후) → 1주 뒤 아이폰 웹 이탈 재측정

## 2단계(1단계 측정 뒤)
- [ ] 영어 사전 동적 로드
- [ ] 아이콘 전체 묶음 나누기

## 결과 (2026-11-10)
- 첫 화면 JS: 3,394KB(33개) → 585KB(12개), three 없음
- 느린 폰 조건(CPU 4배·9Mbps·지연 150ms·빈 캐시, 로컬 무압축 서버, 4회 중앙값):
  로그인 화면 5,457ms → 2,886ms(-47%), 마을 준비 23,387ms → 21,894ms(큰 차이 없음)
- 리뷰 지적 수정: atOrchard 라이브 값 → isAtOrchard(), 계절 아이콘을 게임 로드 뒤로
- 남은 것: iOS 시뮬레이터 부팅 확인, 커밋, 배포(승인 후), 1주 뒤 아이폰 웹 이탈 재측정
