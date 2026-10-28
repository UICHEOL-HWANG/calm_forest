# 🌙 꿈의 숲 — 컨텍스트

Last Updated: 2026-10-08 (구현·리뷰 완료, 미병합)

## 핵심 파일 (조사 결과)
- 공간 진입 패턴: js/spaces/mist.js:228-254 (플래그→player.position→nearDoor null→snapCamera→setSpaceVisible→BGM→trackEvent)
- setSpaceVisible game.js:512-552 · snapCamera :6121 · $w :260-313 · spaceFlags :2703-2709
- updateDayNight 공간별 블록 game.js:6309-6390 · OUT_OF_REACH_FLAGS js/shadow-scope.js:52
- minimap game.js:5454 · place 체인 2358/5555 · toolZoneKey 1468 · 중심/반경 5574-5576 · 이동 한계 ~5748-5780
- outdoorZone js/spaces/outdoor-decor.js:23 · 비/드리프트 숨김 550/3432/3490/4325/4331 · updateCameraFade 6104
- getGameState 2597(이웃 마을 neighborReturnPos 치환) · applySave 2392+ · gameState 기본값 ~957-1004
- doSleep game.js:6241 · 액션 라우팅 6519 · 침대 프롬프트 js/spaces/doors.js:205-208
- 입력 잠금: intro/sleeping game.js:5537-5545, pointerdown 5388, #sleep-fade index.html:1134 / ui.sleepFade 3240
- 컷신 템플릿 js/spaces/prologue.js:122-254 (introCam 화면비 스케일)
- 온보딩 firstHint 1225 · firstHintBanner 1242 · hintsSeen 985
- BGM js/sound.js:170 테마 · barFn/barLen 348
- 가구 DECOR js/data/catalog.js:22, placeDecor js/spaces/indoor.js:653 (pay 일반화 inventory[pay]), 꾸미기 메뉴 index.html:4316

## 결정
- 걷는 면 y=0 단일 평면, 영역 = 섬 원 ∪ 다리 캡슐 (점프 없음)
- 조각 하루 7개(todayStr 시드), econ_logs 안 씀(코인 전용), 별도 테이블 없음
- 꿈 장식 pay:'shard' → 기존 꾸미기 메뉴 재사용, visits>0 일 때만 노출
- 입력 잠금은 sleeping 재사용
- 4곳 동시 배포 필요(dream 필드·새 가구 id)

## 상태 (2026-10-08)
- feat/dream-forest: 88c78de 스펙 · aa458df 구현 · 리뷰 반영 커밋. 테스트 2134 통과.
- 실측: 오프라인 CDP(Supabase·GA 차단) PC·모바일 — .scratch/dream/ · 스크립트는 세션 스크래치(tools/store-shots/cdp.mjs 사용)
- 로컬 훅: ?dbg 없이도 localhost 면 window.__dream.{night,house,open,start,skip,state,tp,wake,reset}
- 미리보기: 루트 .claude/launch.json "dream-forest"(8032) — ⚠️ 맨 localhost 로 열지 말 것(운영 기록), dev 파라미터 필수
- 배포 남은 일: 4곳 동시(웹·토스·Play·itch) — 옛 클라가 dream 필드·꿈 장식 id 를 지운다. 토스 검수 지연 고려 필요
