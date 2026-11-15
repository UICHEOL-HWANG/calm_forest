# 공간 연결 2차 · 컨텍스트

Last Updated: 2026-11-12 16:50 KST

## P1 구현 결과 (11/12)
- 브랜치 `feat/space-link-p1`, 커밋 12개(6d10b36c..08ccc270), worktree `.claude/worktrees/space-link-p1`, 미리보기 설정 `space-link-p1`(포트 8891)
- 새 파일: js/pond/actions.js · yard-steps.js · feed.js · yard-guide.js, js/hud/collection-book.js, sql/migrations/migrate_push_pond.sql
- 안내 종료 규칙: `hintsSeen.yardTries` < 2, 진행 없이 600초면 멈춤(완료 표시 안 함). 포구·식당 안내는 마당 안내 중엔 시작 안 함
- 옛 세이브(`unlocks.legacy`)는 집 3단계면 다리 고친 것으로 봄(`bridgeDone`)
- 바다가 잠겨 있으면 수첩 바다 칸은 "바다터가 열리면 낚을 수 있어요"만, 이동 버튼 없음
- 검증 함정: 앱 브라우저 패널이 숨겨지면 rAF 가 0프레임이라 게임 루프가 안 돈다 → 헤드리스 크롬 CDP 봇으로 검증(scratchpad yard-bot.mjs 방식)
- 새 세이브 테스트는 튜토리얼 스포트라이트가 `coachActive` 를 붙잡아 안내가 안 뜬다 → 테스트에선 `window.__ui.coachActive = () => false`

## 11/12 오후 바뀐 결정
- 마당 채우기 안내 시점: 지붕 직후 → **다리 수리 뒤**(사용자). 지붕 순간엔 코치 `dress`·🦉 다리 창이 이미 줄 서 있어 부딪힘
- P1 저장은 `hintsSeen` 키만(pondDay·pondFeedDay·pondFeedAd·yardFill·pondD1·pondBook). 새 최상위 필드는 옛 클라이언트가 다음 저장 때 지운다(`applySave` 화이트리스트)
- 푸시는 Android·iOS 앱만, `push_logs.kind` CHECK 에 pond 추가 마이그레이션 필요
- 안내 엔진은 식당·포구 섬의 `createGuide`+`createGuideView`(E6 무관). 첫 캐스팅 보장은 `setFishAssist`(DDA 미반영, `assist:1`)
- `sims/space-link-onboarding.html` 은 "지붕 직후" 시절 그림이라 시점 칸이 옛 결정

## 근거 데이터
- 10/16~11/04 새 기기 1,338대(GA4 `first_open`/`first_visit`): 물고기 낚음 85(6.4%, 처음까지 중앙값 12분) · 연못 봄 46 · 요리 24(1.8%, 중앙값 146분) · 이틀 이상 접속 126(9.4%). 낚은 기기 재방문 45% vs 안 낚은 7%(스스로 고른 집단이라 인과 아님)
- 첫날 집 단계(`ml/reports/house_stages_20261107/report.md`, 454대): 건설 기록 없음 76% · 바닥 24% · 지붕 13%. 바닥 → 같은 날 지붕 56%
- 이야기 장 도달(`dev/active/main-quest-guide/main-quest-guide-context.md`): 1장 326 → 2장 68 → 3장 46. 새 세이브는 2장(물의 가지)에서 낚시꾼, 3장(부엌의 가지)에서 요리

## 핵심 파일 (기존)
- 연못 1차: `js/pond/{index,build,rules,copy}.js`, `js/data/pond.js`, 이웃 `js/neighbors/scene.js`
- 실험 스위치: `js/exp-e3.js` `spaceLinkOn()`, 사전등록 `dev/active/metrics-framework/space-link-experiment-prereg.md`
- 요리: `js/spaces/cooking.js`(kitchenView·eatDish·cookTier), `js/data/catalog.js`(RECIPES·FISH_KINDS·BUFF_META), `gameState.kitchen.best`
- 바다 종: `SEA_SPECIES` (catalog.js 264행 근처)
- 넓히기 패턴: `js/farm-stage.js` FARM_STAGES·farmStageInfo
- 광고: `js/ads/rewarded.js`, `js/guide/prepass-rules.js`(PREPASS_CAPS·CAFE_CAPS·REPEAT_SLOTS·repeatOpen·dayCount·bumpDay), 설계 `docs/superpowers/specs/2026-11-09-progress-prepass-rewarded-design.md`
- 안내 엔진: `js/guide/`(goal-guide·route·step-card·runner)
- 날짜: `js/kst-date.js` kstDate
- 금칙어: `js/nickname-filter.js`
- 1회성 플래그: `gameState.hintsSeen`

## 시안 (sims/)
- `cook-link-sim.html` 요리 연결 형태 4종 → A
- `cook-table-count-sim.html` 접시 수 3종 → ①
- `cook-table-action-sim.html` 식탁 행동 4종 → ①+②
- `pond-action-sim.html` 연못 행동 4종 → 전부 (광고 버튼 반영)
- `pond-grow-sim.html` 넓히기 3단계 + 넓히기 창(광고 버튼 반영)
- `space-link-onboarding.html` 온보딩 흐름
- 캡처: 이 폴더의 PNG 4장

## 결정과 이유
- 지붕 직후 온보딩: E6 주 지표(첫날 지붕 완성)가 거기서 끝나고, 반복 광고가 열리는 `repeatOpen()`(집 3단계)과 같은 순간. 지붕 전 곁길은 집 완성을 깎을 위험
- 연못 1단계 = 지금 연못: 기존 유저 손실 없음
- 계절 물고기·꾸미기 코인엔 광고 없음: 계절 재방문 이유·코인 소비처 보호
- 수첩 창 공용: 연못·식탁이 같은 모양

## 주의 (메모리)
- 시안은 파일을 직접 열어도 보이게 자급(옆 모듈 import 금지, file:// 에서 막힘)
- 코드 주석 금지 · game.js 에 로직 금지 · 월드 말풍선은 이모지만 · 화살표 이모지 금지 · 문구 엠대시·"놀다" 금지 · 문구 후보 먼저 검수
- 새 최상위 저장 필드 → 옛 클라이언트 처리 확인, 필요하면 5곳 동시 배포
- 새 GA4 이벤트 파라미터 ≤ 5, 기존 키 재사용
- dev 파라미터 사용 시 GA4 오염 주의

## 미확인
- 넓히기·꾸미기 비용 밸런스
- 첫 캐스팅 "무조건 성공"을 낚시 미니게임에서 어떻게 보장할지(기존 낚시 튜토리얼 코드 확인 필요)
- 집에서 부두까지 경로·경유점
- 옛 클라이언트의 `spaceLink` 필드 처리
