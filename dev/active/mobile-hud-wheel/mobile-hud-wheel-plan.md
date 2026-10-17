# 모바일 HUD 개편 — A안(반원 휠 + 카드 메뉴) + P4(근접 이모지 알약) + 자동 도끼 + 좌측 열 정리

## Context
- 피드백: 모바일 메뉴·버튼이 너무 많다. 가까이 갔을 때 액션 버튼 이모지만 바뀌어서 무슨 뜻인지 모르겠다. 미니맵 아이콘 원이 커서 뭐가 뭔지 모르겠다.
- iOS 가로 버그 2건: ☰ 목록이 잘리고 스크롤이 안 됨(`#util-btns`에 max-height·overflow가 없음). 💬대화하기가 재화 바를 덮음(`#talk-btn bottom:310px`에 가로 규칙이 없음).
- 결정 사항: A안(반원 휠 + 가운데 카드 메뉴), P4 포코피아식 알약 — **글자 없이 이모지만**. 나무 근처에서 자동으로 도끼. 좌상단은 의뢰 패널이 위, 미니맵이 그 아래. 미니맵은 섬 실루엣과 내 위치 원만.
- 범위: HUD 배치(휠·메뉴·알약·좌측 열)는 **터치(`body.is-touch`)만** 바꾼다. 미니맵 단순화와 자동 도끼는 **PC에도 적용**한다(사용자 확정).
- 기준 브랜치: **origin/main(70e17b8e)**. 로컬 main은 1,199커밋 뒤처져 있다.

## 작업 환경
- `git worktree add .claude/worktrees/mobile-hud-wheel -b feat/mobile-hud-wheel origin/main`, 들어가서 `npm ci`.
- dev docs: `dev/active/mobile-hud-wheel/`(plan·context·tasks). 시안 3장(`dev/active/mobile-hud-simplify/*.png`)도 복사해 둔다.
- 주석은 넣지 않는다(no-code-comments 규칙). 새 로직은 `js/hud/` 모듈로 분리하고 `index.html`·`game.js`에는 연결부만 둔다(split-files 규칙).

## 단계 (테스트 먼저 → 구현)

### 1. 오른쪽 위 3버튼 (🎒 📖 ☰)
- 터치에서 숨김: `#inv-chips`, `#time-indicator`, `#feedback-tab`, `#topleft`의 📷·🙂·☰ 줄.
  - `ui.setInventory`·`setTime`·`season-emoji`는 요소를 숨기기만 하니 JS는 깨지지 않는다(`setTime`은 null-safe가 아니므로 요소를 지우지 않는다).
- `#topright`: 🎒(기존 `#bag-btn`, 글자 숨김) · 📖(새 `#hud-dex`, `openDex` 재사용) · ☰(새 `#hud-menu`) 46px 정사각 3개를 한 줄로.
- 기존 `#dex-tab`은 터치에서 숨긴다. `layoutRightColumn`·`layoutBuffs`는 숨겨진 요소의 rect가 0이 되는 경우를 막는 가드를 넣는다(`index.html` ~L5237–5271).
- 코인: 가방 시트(`renderBag`, ~L6479) 맨 위에 🪙 잔액 줄을 넣는다. 코인을 얻을 때 `🪙 +N` 토스트가 이미 있는 경로(판매·카페·출석)는 그대로 쓰고, 빠진 곳은 `setInventory`에서 코인 증가를 감지해 `🪙 +N` 토스트로 메운다(터치만).
- 계절·시간 이모지는 ☰ 카드 제목 줄 오른쪽으로 옮긴다.

### 2. ☰ 가운데 카드 메뉴 (`js/hud/menu-sheet.js`)
- 새 `#menu-sheet`: 카테고리 4개(🏡마을 / 💌소식·친구 / 📒기록 / ⚙️설정), 4열 그리드.
  - 각 칸은 기존 버튼에 `.click()`을 위임해 핸들러를 재사용한다(photo, emote, char, map, album, inbox, invite, lb, stats, diary, help, settings, feedback-tab).
  - 숨김 상태인 invite·diary는 원본 `display`를 따라간다.
- 카드에 `max-height: calc(100dvh - 32px - safe-area)`와 `overflow-y:auto`. `controls.js`의 `inScrollable`이 스크롤을 허용한다 → **가로 잘림 버그 해결**.
- 같은 수정(max-height + overflow)을 PC·태블릿용 `#topleft.open #util-btns`에도 넣는다.
- 열 때 `body.menu-open`(기존 규칙 재사용: 조이스틱·프롬프트 숨김), 배경을 누르거나 ✕로 닫는다.
- 📮 안 읽음 점: `prefetchNotices()`(`js/game.js:1244`)가 받은 rows가 있고 그중 id가 `noticeSeenId`보다 크면 ☰와 📮 칸에 `.dot`. `markNoticesSeen` 때 지운다.

### 3. 반원 도구 휠 (`js/hud/tool-wheel.js`)
- `buildHotbar`/`ui.setTool`(index.html ~L2908, L3249)은 그대로 두고, 터치에서는 `#hotbar.wheel` 클래스로 바꾼다. 슬롯 위치는 JS가 계산한다.
  - 지금 페이지의 보이는 슬롯 n개를 `#action-btn` 중심에서 반지름 R, 각도 180°→270°(왼쪽→위)에 균등하게 배치한다.
  - 세트 칩(`#tool-page`)은 호 끝(위쪽)에 작게. 세로·가로 R과 버튼 크기는 시안 값에서 시작해 실측으로 맞춘다(탭 영역 44px 이상).
- 슬롯의 `.s-key` 글자와 `.s-n` 숫자는 숨기고, 선택된 도구 이름 하나만 액션 버튼 아래에 작은 이름표로 둔다(포코피아 "Cut" 자리).
  - 이건 HUD 글자라 월드 말풍선 규칙과 무관하다. 빼라고 하시면 뺀다.
- 맨손(`bare`) 페이지에선 칩만 남긴다. `.pg-tip`은 칩 옆으로 옮긴다.
- 기존 숨김 규칙(`mg-open`, `sled-run`, `neighbor-visit` 등)은 `#hotbar` 선택자 그대로라 계속 적용된다.

### 4. P4 근접 이모지 알약 (`js/hud/near-pill.js`)
- 새 `#near-pill`(흰 원형 버튼, 이모지 하나만). 매 프레임 플레이어 머리 위치를 화면에 투영해 캐릭터 오른쪽 위에 붙인다.
  - `js/game.js`에 `projectToScreen(v)` 헬퍼를 추가한다(`v.clone().project(camera)`, `sims/halloween-verify.html:244`와 같은 방식).
- 내용과 동작:
  - NPC 근처(`setInteractPrompt`): 💬. 누르면 `Input.doTalk()`. 밭일이 우선인 상황에서도 대화가 되므로 `#talk-btn`의 역할을 넘겨받는다.
  - 문·작업대 근처(`setDoorPrompt`, `!opts.info`): `doorIcon`(🔧🚪🛒🍳…). 누르면 `Input.doAction()`.
  - 안내뿐인 줄(`opts.info`)이나 바다·안개·꿈의 상태 문구에는 알약을 띄우지 않는다. 그런 문구는 기존 `#door-prompt` 줄을 그대로 쓴다.
- 터치에서는 `#talk-btn`을 숨긴다(**겹침 버그 해결**). 알약이 떠 있는 동안에는 같은 뜻의 `#door-prompt` 글자도 숨긴다(`body.near-pill-on`).
- 액션 버튼 아이콘·주황 테두리는 기존 `refreshActionIcon()` 우선순위를 그대로 따른다.

### 5. 나무 근처 자동 도끼 (`js/game.js`, 기존 auto 패턴 재사용)
- `updateToolPageAuto()` 옆에 `updateTreeAxeAuto()`를 추가한다. `updateDoorInteract` 끝에서 매 프레임 호출한다.
- 조건: `toolZoneKey()`가 null(마을)이거나 `'glade'`이고, 맨손 페이지가 아니며, `trees` 중 쓰러지지 않은 가장 가까운 나무가 2.6 안.
- 들어올 때:
  - `toolBeforeAuto = currentTool`, `pageBeforeAuto = toolPage`를 저장한다.
  - `setToolPage('out', true)` 다음 `selectToolAuto('axe')`.
- 나갈 때(2.6 + 여유 0.6, 들락날락 깜빡임 방지): 저장해 둔 페이지와 도구로 되돌린다.
- 손으로 바꾸면(`Input.selectTool` 등이 이미 `toolBeforeAuto`·`pageBeforeAuto`를 지운다) 그 범위를 떠날 때까지 다시 바꾸지 않는다.
- 과수원 나무는 별도 경로라 대상이 아니다. 숲은 맨손 구역이라 제외한다.
- 터치·PC 공통으로 적용한다(사용자 확정).

### 6. 좌측 열: 의뢰 패널 위 → 미니맵 아래, 미니맵은 실루엣
- 터치에서 `#quest-panel`을 좌상단 맨 위(`--qp-top: calc(12px + var(--top-inset))`)로 올린다. 📷🙂☰ 줄이 빠지면서 자리가 생긴다.
- 미니맵은 새 `layoutLeftColumn()`이 패널 bottom + 8px에 둔다. `ResizeObserver(#quest-panel)`로 따라가며, `layoutRightColumn` 패턴을 재사용한다.
  - 펼쳤을 때 미니맵을 숨기는 기존 가로 규칙은 유지한다.
  - 의뢰가 없으면 미니맵이 맨 위로 올라간다.
- 미니맵(`setMinimap`, index.html ~L4038–4071, 마을 분기):
  - 섬 실루엣을 그린다. 전체 지도의 `WM_LAND`·`WM_WATER`·`WM_GROVE`와 `blob()`(L2997–3021)을 공용 함수로 빼서 재사용한다.
  - 장소 이모지(`pri===1`)와 주민 점 루프는 빼고, **내 위치 원(`drawPlayer`)만** 남긴다.
  - 하위 공간 분기와 전체 지도(`drawWorldMap`)는 그대로 둔다.
  - 이 변경은 PC 미니맵에도 같이 적용한다(사용자 확정).

### 7. 트래킹 (파라미터 5개 이하, 기존 키 재사용)
- `hud_menu_open {}`, `hud_menu_item {item}`
- `near_pill_tap {kind: npc|door, icon}`
- `tool_auto {to:'axe', reason:'tree'}`
- `tool_wheel_pick {tool}`(수동 선택만)

## 테스트 (`node --test tests/*.test.mjs`, 소스 정규식 방식)
- 새 `tests/mobile-hud-wheel.test.mjs`:
  - 터치 규칙이 전부 `body.is-touch`로 묶였는지
  - `#menu-sheet`에 overflow-y:auto와 max-height가 있는지
  - 터치에서 `#talk-btn`이 숨겨지는지
  - 알약 탭이 doTalk/doAction에 연결됐는지
  - `updateTreeAxeAuto`가 호출되고 히스테리시스가 있는지
  - 미니맵 마을 분기에 장소 이모지나 주민 점 루프가 없는지
  - `projectToScreen`이 export되는지
- 기존 테스트(`landscape-hud`, `quest-panel-view`, `hud-right-column`, `neighbor-ui`, `e1-wiring`, `mountain-runtime-wiring`, `app-banner`)는 깨지지 않게 둔다. 바뀌는 값(가로 `--qp-top` 168px 등)은 해당 테스트를 의도에 맞게 고치고, 커밋 메시지에 남긴다.
- 자동 도끼 로직은 순수 함수(`pickTreeAxe(state, nearestDist)`)로 빼서 단위 테스트한다.

## 검증
1. 워크트리에서 `npm test`가 전부 통과하는지.
2. 프리뷰 서버(`?touchsim`)에서 아래 크기마다 플레이·☰ 열림·NPC 근처·작업대 근처·나무 근처를 캡처하고, 시안과 나란히 비교 이미지로 보낸다.
   - 세로 390×844, 320×568
   - 가로 844×390, iOS 사파리 가로 844×293
3. 가로 293에서 ☰ 카드가 스크롤로 ⚙️설정까지 닿는지, 💬가 위쪽 바와 겹치지 않는지 확인한다.
4. 데스크톱 1440×900 캡처로 PC HUD는 그대로이고, 미니맵만 실루엣으로 바뀌었는지 확인한다.
5. code-reviewer 에이전트 리뷰 → HIGH 이상 수정.
6. 배포(웹·토스·itch·Play·iOS)는 별도 승인 후 진행하고, 이번 계획 범위에는 넣지 않는다.

## 수정할 주요 파일
- `index.html`: 터치 CSS, `#topright`·`#menu-sheet`·`#near-pill` 마크업, `setMinimap`, `layoutLeftColumn`
- `js/game.js`: `updateTreeAxeAuto`, `projectToScreen` export
- `js/spaces/doors.js`: 호출 연결
- 새 파일: `js/hud/menu-sheet.js`, `js/hud/tool-wheel.js`, `js/hud/near-pill.js`
- `tests/mobile-hud-wheel.test.mjs`, 일부 기존 테스트
