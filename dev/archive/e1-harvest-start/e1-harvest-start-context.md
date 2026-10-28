# E1 — 컨텍스트

Last Updated: 2026-10-12

## 브랜치·환경
- `feat/e1-harvest-start` (main d055bc1 에서), 워크트리 `.claude/worktrees/cranky-mclaren-5cf961`
- 미리보기: 워크트리 `.claude/launch.json` 에 임시 항목 `e1-harvest`(8811) — 병합 전 제거
- 시안 캡처 도우미 `mock.mjs`(이 폴더) — `?dbg=1&farm=1&weather=clear` 에서 import. 병합 전 제거

## 핵심 파일
- `js/game.js` enterGame — 로드 루프 → applySave → … → 끝에서 캐릭터 선택/튜토리얼
- `js/save-guard.js` load.kind: loaded|empty|failed|failed_fresh|offline
- `js/spaces/visitors.js` enterFarm — firstHint('farmInside') · startVisitors()
- `js/spaces/farm-auto.js` tryHarvest — 농사 도구를 들고 다 자란 밭 앞 액션 = 자동 낫 수확
- `js/spaces/farm.js` createPlot · syncFarmSoil/Crops · `game.js` refreshCropStage(성장→mature 시 토스트)
- `index.html` char-confirm·introShow(false) → showTutorial · 도구바 칩(pg-tip)
- `js/analytics.js` trackEvent(ts·platform 덧붙임) · `js/metrics.js` counts onTrack
- `js/i18n.js` clientId · `js/platform.js` PLATFORM

## 결정
- 시작 장소는 텃밭 안 — 수확은 텃밭에서만 됨
- 등록 판단에 'empty' 포함(RLS 거부·재매핑도 empty 로 들어오는 위험 — save_load_empty 이벤트로 감시됨)
- exp_arm 을 모든 이벤트에 붙이지 않음(코드 키 한도) — 획득 16종 + exposure 만

## 함정 메모
- 맑은 날엔 updatePlots 가 refreshCropStage 를 안 부른다(비 오는 날만) → 직접 호출
- refreshCropStage 는 growing→mature 전환 때 "다 자랐어요" 토스트 → 처치에선 조용한 경로 필요
- 게스트 버튼은 로그인 화면이 뜬 직후 눌러도 핸들러가 없다(재시도)
