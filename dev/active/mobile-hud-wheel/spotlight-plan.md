# 강제 손가락 시범형(B) 스포트라이트 튜토리얼 + 첫 안내 카드 간소화

## Context
- HUD를 포코피아식으로 바꾸면서(feat/mobile-hud-wheel, 커밋 5개) 버튼 위치·조작이 크게 바뀌었다. "어떻게 누르는지"를 글로만 알려 주면 못 따라온다 → 화면을 어둡게 가리고 한 곳만 밝혀 손가락 시범으로 **실제 동작을 해야 넘어가는** 튜토리얼(시안 B, `dev/active/mobile-hud-wheel/spotlight-compare.png`).
- 첫 안내 카드 15종(`firstHint`)이 문장 4줄씩이라 읽히지 않는다 → 아이콘 칸 1~3개·주의 1줄·보너스 칩 틀로 간소화(시안 ④).
- 결정(사용자): B 손가락 시범형 · 첫 안내 카드 간소화 · 기존 유저는 "바뀐 점" 3단계만 1회 · E1 두 그룹 모두 같은 자리(대조군=캐릭터·인트로 직후, 처치군=첫 수확 직후 = 지금 환영 창 자리), 배포일을 실험 문서에 기록.
- 작업 위치: 같은 워크트리·브랜치(feat/mobile-hud-wheel). 주석 없음, 새 로직은 `js/onboarding/`·`js/hud/` 모듈로.

## 1. 스포트라이트 엔진 — `js/hud/spotlight.js` (새 파일)
- `createSpotlight({ t, trackEvent })` → `{ run(steps, opts), stop(), active() }`.
- 레이어 `#spot-layer`(id가 `-modal`로 끝나지 **않게** — `anyModalOpen()`이 이동·행동을 막으면 "걸어 보세요"를 할 수 없다). z-index 48(☰ 카드 47 위, `#loading.save-stuck` 60 아래 — save-guard 테스트).
- 구멍: 대상 요소 rect + 여백으로 어둠 4장(위·아래·좌·우 막대)을 깔아 **구멍만 터치가 통과**하게 한다. 원형 테두리 + 손가락 애니(`tap`·`hold-slide`·`drag`·`key`·`click`) + 한 줄 말풍선 + 위쪽 진행 점.
- 위치는 rAF로 대상 rect를 따라감(회전·리사이즈 대응). 대상이 안 보이면 숨기고 기다림.
- 단계 완료 조건 `doneOn`: `act:<key>`(기존 `ui.act`), `click`(구멍 안 클릭), `open:<id>`(모달 열림), `menu`(☰ 카드 열림).
- **막힘 탈출**: 같은 단계 20초 → 작은 "다음 ›" 노출(버그·조작 불가로 갇히지 않게), `via:'timeout'` 기록.
- 모달·메뉴가 열린 동안 레이어를 숨기고 닫히면 재개.
- 순수 계산은 `js/hud/spot-geom.js`(구멍 사각형·말풍선 위치·화면 밖 보정) — 단위 테스트.

## 2. 단계 정의 — `js/onboarding/spot-steps.js` (순수 데이터)
- 터치 7단계: ① 🕹️ 조이스틱 끌기(`act:move`) → ② 🧰 도구 버튼 꾹·밀기(`act:toolpage`) → ③ ⭕ 큰 버튼 누르기(`act:use`) → ④ 🎒(`open:bag-menu`) → ⑤ 📖(`open:dex-modal`) → ⑥ ☰(`menu`) → ⑦ 🗺️ 미니맵(`open:worldmap`).
- PC 8단계: ① WASD → ② 1 → ③ 2~6(`act:toolpick`) → ④ Space(`act:use`) → ⑤ 🎒 → ⑥ 📖 → ⑦ ☰ → ⑧ 미니맵 클릭.
- 바뀐 점 3단계(기존 유저): 터치 = 🧰 도구 버튼 · 🎒📖☰ · 💬 근접 동그라미, PC = 🎒📖☰ · ☰ 카드 · 미니맵. (구멍 클릭 = 다음)
- 그때그때 1회: 💬 근접 알약이 처음 뜰 때, ☰ 카드를 처음 열 때 메뉴 3단계(📮 소식함 → 🐾 캐릭터·꾸미기 → 📖 안내서, 구멍 클릭 = 다음).
- 문구는 한 줄(이모지 + 동사), 영어 키는 `js/i18n-en.js`에.

## 3. 흐름 연결 — `index.html`·`js/game.js`
- 신규 유저: 지금 `ui.showTutorial()`(환영 창)을 부르는 3곳(캐릭터 확정 L3588, `introShow(false)` L3608, E1 `showTutorialWhenClear`)에서 환영 창 대신 스포트라이트 → 끝나면 **기존 코치 17단계 바로 시작**(환영 창 생략, 코치의 건너뛰기는 유지). 가이드의 "튜토리얼 다시 보기"(`showTutorial('help')`)는 스포트라이트부터 다시.
- E1: 처치군 = 첫 수확 → 스포트라이트 → 코치, 대조군 = 캐릭터·인트로 직후. `e1-wiring` 테스트가 고정한 분기(`else if (Input.e1FirstScreen())`)는 그대로, `ui.showTutorial` 안쪽에서 갈라 탄다.
- 기존 유저: `enterGame` 끝에서 `tutorialSeen && !hintsSeen.spotV2`이면 출석 모달 등이 닫힌 뒤 바뀐 점 3단계.
- 진행 저장: `gameState.hintsSeen.spotV2 = 'done' | 단계 번호` → 중간에 나가도 이어서. 진행 중엔 `firstHint`·`firstHintBanner`가 코치 때처럼 대기(`ui.coachActive`가 스포트라이트도 포함; sea-gate-hint 테스트가 자르는 구간은 그대로).
- 새 신호: `Input.doAction`에서 `ui.act?.('use')`, 숫자키 2~6에서 `ui.act?.('toolpick')`.
- 도구 버튼 펄스(`body.coach-toolpage`)는 스포트라이트 ② 단계에서도 켬.

## 4. 첫 안내 카드 간소화 — `ui.showHintModal` 틀 + 15곳
- `showHintModal({ ico, title, steps, note, chip, body })`: `steps=[{ ico, label }]` 1~3칸(화살표), `note` 회색 한 줄, `chip` 노란 칩. `body`만 오면 지금처럼(이전 호환). `.tut-card` 유지(E1 `otherModalOpen`이 찾는다). 전부 `textContent`.
- 조작 라벨은 플랫폼별(모바일 "⭕ 큰 버튼"/"꾹", PC "Space"/"클릭") — `touchHud()` 기준.
- 15곳(`js/game.js` colorUnlock·shovel, `js/spaces/{weather,cooking,visitors,mist×2,sea,mine,night-visit,observatory,river,mountain,cafe×2}.js`)을 새 형식으로. **문구 후보 15종은 구현 전에 표로 먼저 검수받는다**(UI 문구 선검수 규칙).

## 5. 트래킹
- `tutorial_spot {step, ms, via}` — step=단계 키, via=`act|click|timeout`(기존 키 재사용, `tutorial_` 접두 규칙 안).
- `tutorial_spot_end {kind: full|new|menu, ms}`.
- 배포 다음 날 BQ로 단계별 도달·이탈 확인, E1 문서에 배포 시각 기록.

## 6. 테스트 (먼저 쓰기)
- 새: `tests/spot-geom.test.mjs`, `tests/spot-steps.test.mjs`(단계 수·대상 id 존재·doneOn 형식·영어 키), `tests/spotlight-wiring.test.mjs`(레이어 id가 `-modal` 아님·z 48<60·`showTutorial` 경로·E1 분기 유지·`hintsSeen.spotV2`·`ui.act('use'|'toolpick')`), `tests/hint-card.test.mjs`(15곳 새 형식, `.tut-card` 유지, 모바일 문구에 숫자키 없음).
- 유지: e1-wiring, landscape-hud(코치 마크업), house-cost(TUT_STEPS), sea-gate-hint, save-guard, app-banner(새 `spot-on` 클래스 숨김 규칙 추가), i18n 테스트들.

## 검증
1. `npm test` 전부 통과.
2. 브라우저 `?weather=clear&touchsim` 세로·가로, PC 1440×900에서 신규 흐름 끝까지 단계별 캡처, 20초 탈출 버튼, 중간 새로고침 후 이어짐.
3. `?e1=harvest_start`·`?e1=control` 각각 진입 순서 확인.
4. 기존 유저(tutorialSeen=true) 바뀐 점 3단계가 1회만.
5. 첫 안내 카드 15종을 한 장에 모은 비교 캡처.
6. 폰 실기기 확인 → code-reviewer → 커밋. 배포는 별도 승인.
