# 오늘의 꾸미기 컨텍스트

Last Updated: 2026-11-20 23:15

## 위치
- 워크트리 `.claude/worktrees/daily-pick`, 브랜치 `feat/daily-pick` (main 2aadb098 기준), 미푸시
- 미리보기: 루트 :8000 서버는 메인 체크아웃을 띄운다. 이 워크트리는 따로 정적 서버를 띄워야 한다.

## 사용자 결정 (2026-11-20)
- 연결 방식: 오늘의 꾸미기 반값(도장 방식 아님)
- 범위: 캐릭터 + 가구 둘 다 / 풀: 새 아이템만 / 오늘의 칸에서만 판매
- 주제: 겨울 + 숲 동물, 두 번에 나눔(1차 겨울 8종)
- 화면: B안 금빛 카드 (`sims/daily-pick/compare.png`)
- 문구: 이미 산 아이템은 "이미 있어요" ("가졌어요" 기각)

## 핵심 파일
- 광고: `js/ads/rewarded.js` `rewarded.button(slot, parts, grant, after)`, 규칙 `js/guide/prepass-rules.js` (`adQuiet`, `PREPASS_DAILY_CAP`)
- 가게 화면: `js/spaces/cafe.js` `drawCosMenu()`, 탭 목록 `js/cosmetics/sprout.js` `shopRows`
- 꾸미기 카탈로그: `js/cosmetics/catalog.js`, 조형 예시 `js/cosmetics/art-sprout.js`
- 가구 카탈로그: `js/data/catalog.js` DECOR/OUTDOOR, 지급 `grantDecor()`·`grantCosmetic()` (js/game.js)
- 날짜: `todayStr()` (js/game.js, 로컬 날짜)

## 함정
- 새 꾸미기·가구 id → 구버전 앱이 세이브에서 지움 → 5곳 동시 배포
- 새 코드 주석 금지, UI 문구 엠대시 금지
- 실내 가구 높이: 벽 3, DECOR_SCALE 1.5, tests/decor-ceiling.test.mjs

## 진행 (2026-11-20 밤)
- 구현·이식 완료, 로컬 커밋 94b9d10b까지. 게임에서 구매·반값·부족·이미 있음·가구 지급·자정 넘김 보호 확인
- 카드 파일은 js/shop/daily-pick-card.js (game-ui 는 패널 전용 규칙 테스트)
- 남은 것: 화면 캡처(PC·가로 폰), 루트 launch.json 임시 항목 daily-pick 삭제, 5곳 동시 배포
- 리뷰 2번: 구버전 앱은 새 가구 id 를 세이브에서 지운다 → 5곳 동시 배포 필수
- 기존 basket 꾸미기가 시뮬에서 여우·토끼·병아리 꼬리와 겹침(게임 확인 전, 별도 작업)
