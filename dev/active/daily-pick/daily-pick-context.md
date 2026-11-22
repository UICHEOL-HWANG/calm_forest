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

## 2차 (2026-11-21 새벽)
- 워크트리 `.claude/worktrees/daily-pick-2`, 브랜치 `feat/daily-pick-2` (main 6509f6fa 기준), 미푸시·미병합
- 숲 동물 8종 + 코인 도구 세트 2종(tools_snowman·tools_squirrel 3,600) → 순환 18일
- 도구 세트는 현금이 아니라 코인(사용자: 현금 상품 안 팔림). group 'daily' 라 가게 탭에 안 나오고 산 뒤 옷장에만
- 게임에서 10종 구매·지급 확인. 리뷰 반영: 카드 입어보기 시 도구·자국 탭 전환, 풀 가격=카탈로그 가격 테스트
- 남은 것: 휘두르는 동안 다람쥐 꼬리 팔 스침 여부, 도구 화면 실제 캡처, 다람쥐 도구 정점 6~9k(모바일 부담 시 puff detail 0)

## 3차 (2026-11-21)
- 워크트리 `.claude/worktrees/daily-pick-3`, 브랜치 `feat/daily-pick-3` (main 915bd678 기준), 미푸시·미병합
- 크리스마스 8종 + 바닷가 8종 + 코인 도구 세트 사탕·문어 → 36일 순환. 게임에서 18종 구매·지급, 36일 36종 1회씩 확인
- 리뷰 메모: 풀 크기가 바뀌면 `days % n` 이라 그날 아이템이 바뀐다(배포 전이라 지금은 무관, 4차 추가 땐 하루 경계에 배포하거나 기준일 이후만 새 n 적용)
- 남은 것: 깜빡임 실제 모습(행마다 같은 위상), 아치 통과·휘두르기·우산 실기 확인, 사탕·문어 도구 정점 3~8k·우산 12~17k
