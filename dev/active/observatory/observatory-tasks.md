# 🔭 천문대 — 작업 체크리스트

순서대로. 각 단계는 **테스트 먼저(RED) → 구현(GREEN) → `npm test` 전부 통과** 후 커밋. 커밋 메시지는 영어 conventional(`feat: 🔭 …`).
브랜치: `feat/observatory` (main 에서 분기). main 병합·푸시·배포는 사람이 결정.

## 1. 순수 리듬 로직
- [ ] `tests/observatory-rhythm.test.mjs` 작성 (RED)
  - ORDER 길이 8, 노트 7개(`buildChart().length === 7`), 첫 `startMs === 800`
  - hitMs 단조 증가, 각 travel ∈ [700, 1300] (ease=1), ease=1.4 이면 travel 이 1.4배
  - `judgeTap(0)==='perfect'`, `judgeTap(90)==='perfect'`, `judgeTap(91)==='good'`, `judgeTap(-180)==='good'`, `judgeTap(181)==='miss'`, `judgeTap(-181)==='early'`; ease 배수로 창이 넓어짐
  - `summarize`: 점수·maxCombo(miss 에서 끊김)·success(miss≤3)
  - `rewardFor`: 성공 = 10 + perfect×2, alreadyToday 또는 실패 = 0
- [ ] `js/observatory/rhythm.js` 구현 (GREEN)

## 2. 장소 좌표 + 겹침 테스트
- [ ] `js/data/places.js` 에 `OBSERVATORY_GATE (22,0,22)`, `OBSERVATORY (0,0,540)`, `OBSERVATORY_R = 5.4`
- [ ] `tests/observatory-place.test.mjs`: 게이트가 context.md 점유 목록의 각 시설과 ≥ 8m, 원점에서 ≤ 36(maxR 42 − 기단), 실내 z 540 이 다른 실내 원점(context.md)과 ≥ 30 떨어짐. 실패하면 (-5,0,32) 로 바꿔 재검.

## 3. 공간 배선
- [ ] `tests/observatory-wiring.test.mjs` (gameSource 텍스트 assert): `atObservatory` 가 $w getter/setter·export·setSpaceVisible·spaceFlags·toolZoneKey·place 체인·handleAction 가드에 존재, doors.js 에 `'🌌 별 보러 가기'`, VILLAGE_PLACES 에 `'천문대'`, shadow-scope 플래그
- [ ] `js/spaces/observatory.js`: 외관(gate) + 실내 hall + enter/exit (박물관 복제 → 이름 변경 → C안 형태로 교체)
- [ ] context.md 배선 체크리스트 전부 + `grep -rn atMuseum js tests` 대조
- [ ] `tests/shadow-scope.test.mjs` 맵 갱신
- [ ] 브라우저 확인: 문 프롬프트·입장·나가기·실내에서 액션 버튼 무반응

## 4. 망원경 상호작용 + 자세
- [ ] doors.js 실내 분기에 망원경 근접 프롬프트(`nd='telescope'`)
- [ ] handleAction → 플레이어 위치·방향 고정 → 700ms 허리 숙임(sea.js 덮어쓰기 패턴) → `openStarView()`
- [ ] 닫으면 자세 복귀, 플레이어 다시 이동 가능

## 5. 렌즈 뷰 오버레이
- [ ] `js/observatory/ui.js`: sim v=d 그리기 이식, rAF 구동, 입력(pointerdown/Space/Enter), 판정 표시, 결과 카드, ✕/ESC/visibility 포기
- [ ] `COPY` 객체 + 모든 canvas 문자열 `t()`
- [ ] body `menu-open mg-open` 토글, `Input.setAnalog(0,0)`
- [ ] PC 1280×800 / 모바일 390×844 캡처로 sim 과 나란히 비교

## 6. 보상·하루 1회·세이브
- [ ] `gameState.starDay` 기본값·저장·복원 (ferry quiz 패턴)
- [ ] 완성 시 `giveReward({coins}, 'star_rhythm', 'big_dipper')` + `requestSave()`, 같은 날 재도전 0
- [ ] 새로고침 왕복 확인

## 7. 트래킹·난이도
- [ ] `DIFFICULTY.star` (js/tuning.js), rollDifficulty/settleDifficulty 연결 — arm→ease 방향 cooking 과 대조
- [ ] `observatory_enter/exit`, `star_start`, `star_result`, `minigame_abandon(game='star')` — plan §7 필드
- [ ] dev 세션(`?weather=clear`)에서 GA4 로 안 나가는지 확인

## 8. i18n·마무리
- [ ] `js/i18n-en.js` 영어 키 전부 → `node scripts/i18n_check.mjs` 0
- [ ] 드로우콜 측정(마을 증가 ≤ 12, 실내 ≤ 40) — plan §6.5 측정 절차, 전/후 수치 기록:
  - 마을 main: calls __ / tris __ · 추가 후: calls __ / tris __ · 실내: calls __ / tris __ · 모바일: __
- [ ] 성능 규칙 점검(plan §6.5): ui.js 동적 import · hall 1회 빌드 · castShadow 본체만 · 오버레이 닫을 때 rAF/리스너 해제 · game.js 추가 줄 수
- [ ] `npm test` 전부 통과 로그 첨부
- [ ] 이 파일 체크 + context.md `Last Updated` 갱신 + 남은 일(⏳문구 검수 등) 메모

## ⏳ 사용자 확인 대기 (구현 중 막히면 임시값으로 진행하고 여기 적기)
- 2026-10-04 외관 재검토: C 시안 기준 아치문/원형 창 4개/4단 계단/돔 슬릿/금 레일/망원경/별 46개를 `js/observatory/exterior.js`로 이식. 지형 언덕의 0.9m 높이는 마을 평지에 맞춰 제외. 지오메트리 검증: 8개 메시, 그림자 본체 1개, renderer clipping 없음. `npm test` 1675/1675 통과. 브라우저 연결은 자동 승인 심사 내부 오류로 차단되어 시각 비교 및 실제 calls 측정은 미검증.
- 2026-10-04 재검토: 렌즈 박자/콤보/판정 위치/점선/7노트 표시 및 게이트 접근 좌표 수정. `render.js`로 분리하여 파일당 400줄 제한 준수. 커밋은 자동 승인 심사 내부 오류로 스테이징부터 차단되어 보류. 보상·세이브·난이도·영문 및 브라우저/드로우콜 검증은 아직 완료하지 않음.
- 망원경 프롬프트·탭 안내·판정·완성·재도전·결과 카드 문구
- 위치(22,22) / 시간 제한 없음 / 보상 10+perfect×2 기본값 승인

## 🔍 리뷰 1차 수정 (Claude, 2026-10-04) — 6단계 들어가기 전에 먼저
브라우저 실측 + 코드 리뷰 결과. 위에서부터 순서대로, 각 항목 테스트 먼저.
- [x] R1 (649aeee 로 커밋됨) 미커밋 작업(5단계 ui.js·render.js·copy.js, 입구 +6.3 / 나가기 +6.8 수정, 테스트 3개) 먼저 커밋 — HEAD(48e8ba9)는 입구 프롬프트가 충돌체 안쪽이라 못 들어간다
- [x] R2 (2026-10-04 2차 확인: 남쪽 벽 열림·뒤쪽 반 돔+슬릿·별 하늘 OK) 🔴 실내가 안 보임: `observatory.js:133` 벽이 360° DoubleSide 3.2m → 카메라(camOffsetIndoor 0,17,10) 쪽 벽이 캐릭터·방을 가린다(실측: 누런 원판만 보이고 캐릭터 없음). 박물관처럼 남쪽 호는 낮은 난간 + 문 틈(cafe.js:445-448). 조명 색도 확인(바닥 0x3a3550 이 올리브로 보임 — OBSERVATORY_LIGHT tint/sun 재조정, 기준은 sims v=c int)
- [x] R3 (3차: 성공/실패 제목 분리, 보상은 onResult 가 실제 지급액을 돌려줄 때만, miss 점 회색 — overlay 동작 테스트) 🔴 결과 카드: 실패(miss>3)에도 "북두칠성을 그렸어요!"(ui.js:27) + 실제로 안 주는 보상을 표시(ui.js:21). 성공/실패 제목 분리(실패 문구는 임시 `조금만 더 해 볼까요?`, ⏳검수 대상), 보상은 6단계에서 실제 지급될 때만 표시. 상단 진행 점은 miss 노트를 다른 색(회색)으로
- [x] R4 (2차 확인 OK) 망원경 축: `observatory.js:138-139` cyl 의 ry 가 rotateY 라 관이 세로 막대 + 접안부가 떠 있음. rotateX/Z + 기울기, 받침(z -0.6)과 관 연결
- [x] R5 (2차 확인 OK) 돔 금빛 별 46개가 돔(반경 4.25) 안쪽 √(4.0²−dy²) 에 묻혀 안 보임(`observatory.js:96`) → 반경 4.25+0.03 바깥으로
- [x] R6 (3차: `HALL_SOLIDS` 받침·책장2·책상, 첫 입장 때 1회 등록 — 동작 테스트 + 브라우저 확인) 실내 충돌체 없음(망원경·책장·책상 통과) → solidBox/solidCircle, 재빌드 없으니 1회 등록
- [x] R7 (3차: 숙이는 동안 menu-open 잠금+매 프레임 위치 고정 브라우저 확인(방향키 1.5초 → 이동 0), star_start 는 렌즈가 실제로 열린 뒤 — diffParams 는 7단계에서) 허리 숙임 700ms 동안 WASD 로 걸어나감 → 시작 시 body `mg-open` 먼저(또는 lookState 동안 updatePlayer 입력 0). `star_start` 는 오버레이 열 때 diffParams 와 함께
- [x] R8 (3차: DIFF_FALLBACK 삭제, opts.diff 없으면 abandon 미기록 — 동작 테스트) 가짜 난이도로 abandon 트래킹(ui.js:14,81 DIFF_FALLBACK) → 7단계에서 rollDifficulty 연결 전까지는 트래킹 생략
- [x] R9 (3차: 첫 별은 800ms 에 점등, 결과 뒤 rAF 정지, spawnObservatoryGate 1회 보장·refresh/observatoryBuilt/hallBuilt/roundRect 삭제, LOOK_SECONDS 상수, places.js 주석 위치 — 동작 테스트) 정리: 첫 별 점등 800ms(render.js:214), 결과 카드 뒤 rAF 정지, 죽은 코드(refreshObservatoryGate 반환값 미사용→중복 생성 위험, observatoryBuilt/hallBuilt, render.js:53 roundRect), 0.7 중복 상수, places.js 박물관 주석이 OBSERVATORY_GATE 아래로 밀린 것
- [x] R10 (3차: tests/observatory-overlay.test.mjs — 가짜 DOM 위에서 이른 탭·판정·결과 카드 성공/실패·도중 닫기 정리·결과 후 abandon 없음) 동작 테스트 추가(정규식 말고): tap() 이른 탭 무시→결과, closeStarView 정리·결과 후 abandon 없음, 실패 시 실패 제목
- [ ] R11 계획 대비 빠진 것(6~8단계 때 같이): 실내 별 Points·별자리 액자, 그림자 본체(벽+기단+돔), 슬릿 금 레일, 창 emissive 블룸 0.85 확인, 렌즈 shadowBlur ~30회/프레임 모바일 프로파일, 오버레이 중 3D 정지(mgView)
- 실측 기록: 마을 외관 +8콜(7메시, 그림자 1) ✅ · 실내 56콜(예산 40 초과 — R2 후 재측정, 실내 메시는 6개라 원인 확인)

## 🔍 리뷰 2차 (Claude, 2026-10-04) — 디자인 확인 후 남은 것
같은 카메라로 게임 안 렌더: look/game-compare.png (시안 C vs 게임). 외관·실내 모두 시안과 거의 일치 ✅
- 실측: 외관 +7콜(8메시, 그림자 1) ✅ · 실내 60콜 — 박물관 실내 72콜과 비교하면 정상(홀 자체는 10메시, 나머지는 캐릭터·UI). **실내 예산 40 → '박물관 이하'로 정정**
- [x] D1 (2026-10-04 3차: 돔 밑면 어두운 원판 → 슬릿 아래까지 남색, 레이캐스트 테스트) 외관 슬릿 안쪽 아래쪽이 베이지(벽 안쪽 색)로 보임 → 시안처럼 어두운 남색(MeshBasic 0x141a30 안쪽 반구 또는 슬릿 뒤 막)
- [x] D2 (3차: 카메라 초점을 홀 중심 쪽으로 0.4배 당김 `observatoryCamFocus`, 바닥 0x5a5482 — PC·모바일 캡처 확인) 실제 플레이 카메라(game2-int-play.png)에서 방이 화면 위쪽 절반에만 있고 아래 절반이 빈 남색 — 입장 위치(현재 z+3.4)를 방 중앙 쪽으로 옮기거나 카메라 타깃을 방 중심 쪽으로 보정. 바닥(0x3a3550)이 거의 검정으로 보여 금 링 말고는 바닥이 안 읽힘 → 바닥 밝기 올리기(시안 int 의 남보라 톤)
- [x] D3 (3차: 관을 yaw 0.9 로 틀고 `TELESCOPE` 하나에서 접안부·대물·자세 위치 계산 — 플레이 카메라 화면각 테스트) 실내 카메라 위치에서 망원경 접안부가 캐릭터 쪽을 향하는지 플레이 카메라로 확인(지금 위에서 보면 관이 세로 막대처럼 보임 — 기울기를 좀 더 옆으로 틀어 실루엣이 망원경으로 읽히게)
- 미해결 그대로: R1(커밋 안 됨 — 지금 작업이 전부 미커밋), R3(실패에도 '그렸어요!'·가짜 보상 표시, ui.js:21-27), R6(실내 충돌체 없음), R7(숙이는 중 이동·star_start 위치), R8(DIFF_FALLBACK 로 abandon 트래킹, ui.js:14/81), R9, R10
