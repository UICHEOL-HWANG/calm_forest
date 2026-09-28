# 실내 꾸미기 v2 — 컨텍스트

Last Updated: 2026-09-09 16:10 — 구현·검증 완료, 커밋 직전. 남은 것: 웹 배포 → 토스 -24 → itch zip

## 구현 결과 요약
- game.js: `DECOR` 9종(foot 포함) · `decorMesh` 9 분기 · 헤엄 `swimW/swimY/swimP` · 벽난로 `flicker` · 고스트 reach · `nearestDecor` · `pickDecor` · `storeDecor` · `nearDecorMesh/decorNearRing` · `house.stored` + applySave · placeDecor `fromStore` · Input `storeDecor/isPickedDecor/getStored`
- index.html: 가이드 ④ 문구 · dm-hint · `#dm-store` 버튼(바닥에서 든 가구일 때만) · `보유 n` 배지·무료 판정 · setDoorPrompt '옮기기'→✋ · 들었을 때 토스트에 보관 안내
- i18n-en: 9종 이름 + 프롬프트 패턴 `{0} {1} · 옮기기` + 보관/가이드/힌트 조각
- 모바일 검증은 브라우저 페인 mobile 프리셋(playwright 는 touch 에뮬 불가)

## 핵심 파일
- `js/game.js`
  - `DECOR` 목록 + `DECOR_SCALE` (~545): 가구 정의(foot = 발자국, 배율 전)
  - `decorMesh(id)` (~5570): 로우폴리 가구 메시. 부품은 안쪽 `g`(×DECOR_SCALE), 바깥 `root` 는 팝 애니메이션용 scale 1. 끝에서 `setFogExempt`
  - `placeDecor` (~5640): 비용 차감 → 메시 → 클램프 → `userData.rec` → `solidBox` 콜라이더
  - `decorClampX/Z`, `DECOR_WALL_PAD`
  - `startDecorPlacing / stopDecorPlacing / buildDecorGhost / updateDecorGhost` (~5690): 고스트(45% + 초록 링), 발 앞 1.3 따라오기
  - `tryPickDecor(e)` (~5748): 탭 레이캐스트 → 들기(콜라이더 제거)
  - `updateDoorInteract` 실내 분기 (~7290): `nd='exit'` 만 있음 → 가구 근접 추가
  - 액션 처리 `if (nearDoor === 'exit') return exitHouse();` 블록 (~8460): `'decor'` 추가
  - 어항 물고기 헤엄 (~9100): `userData.swim` → x ±0.16 고정 → 큰 어항은 폭이 다르니 `userData.swimW` 로 폭 지정
  - `applySave` (~1659): house.decor 복원 → stored 복원 추가
- `js/i18n-en.js` (~538): 가구 이름 사전
- `index.html`
  - `#decor-menu` / `#dm-items` / `.dm-actions`(1107): 꾸미기 메뉴 — 보관 버튼·배지
  - `renderDecorItems()` (~2474), `onDecorPicked` (1972), `onDecorPlaced` (1966, 가이드 ④ 6초), `placingDecorItem`
  - `setDoorPrompt` (1950): 문구 키워드로 액션 버튼 아이콘 결정(`doorIcon`) → '옮기기' 키워드 추가
  - `renderDecorGuide` / 가이드 단계 문구 (~2220 부근)
  - `#door-prompt`(509, nowrap) / `#toast`(417)

## 의사결정
- 가구 ×1.5: 스크린샷 비교로 승인. 안쪽 그룹에만 배율(팝 애니메이션 보호).
- 안개: 전역 near 밀기 폐기 → `material.fog=false` 로 실내 재질만 제외(바깥은 안개 유지). 커밋 7493f2c.
- 충돌: `if (!indoor) resolveColliders` 게이트가 원인. 가구별 solidBox, 회전 시 가로·세로 교환. 커밋 48dd47c.
- 철거 대신 창고 보관(사용자).
- 옮기기 안내는 NPC/문과 같은 "근접 프롬프트 + 액션" 문법. 새 토스트 대신 기존 가이드 ④ 문구 수정.
- 모바일: 새 고정 좌표 만들지 않음 — 프롬프트 줄·컨텍스트 슬롯·기존 패널만 사용.

## 검증 요령
- 게스트 로그인 플로우는 playwright `evaluate` 안에서 버튼 텍스트로 클릭(게스트로 둘러보기 → 이 친구로 시작하기 → 건너뛰기 → 건너뛰고 바로 시작)
- `window.__tp(x,z)` 순간이동, `window.__pos()`, `import('/js/game.js')` 로 `Input`·`getGameState()`
- 집 입장: `__tp(-8,-5.2)` 후 `Input.doAction()`. 실내 좌표 x∈[-7,7], z∈[45,59], 문 z=45, 스폰 z=49
- 가구 놓기: `__tp(x, z-1.3)` → `selectDecor(id)` → `rotateDecor()` 로 rot 맞춤 → `doAction()`
- 오늘(9/9) 날씨 = 안개. 로컬 `?give=crop:99,fish:9` 로 재료.
- 상인 팝업(`다음에`)이 끼어들면 닫고 진행
- 모바일 검증: playwright `browser_resize` 375×812 + 페이지 rAF 를 setTimeout(16) 로 패치(memory: mobile-hud-layout)

## 의존/함정
- 콜라이더는 월드 전역 배열. 실내 상자(z 45~59)에 실외 콜라이더 없음(나무 링 8~30) — 빈 방 직진으로 확인함
- `saveGame(gameState)` 는 state 통째로 저장 → `house.stored` 자동 포함. 복원은 `applySave` 에 명시 필요
- 토스 번들 `-23` 은 승인됐으나 라이브 미전환(라이브 `-21`). `-24` 로 대체 예정
- 스크린샷/playwright 산출물은 저장소 루트에 떨어짐 → 스크래치패드로 옮길 것
