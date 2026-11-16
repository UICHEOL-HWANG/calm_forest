# 앱 첫 진입 화면 B안 구현 계획

## Context
iOS·안드로이드 앱 첫 진입이 어수선하다. 지금 자동 로그인 사용자가 보는 순서(코드 기준):
1. OS 실행 화면: iOS는 **흰 바탕에 Capacitor 기본 로고**(브랜드 아님), 안드로이드는 곰 아이콘
2. 앱 바탕 **진한 초록 #1b2a1f** 깜빡
3. 로딩 화면: 회색빛 #cfd8c4 + 유리 알약 "고요한 숲 불러오는 중" (앱 번들에는 숲 그림 파일이 없어 단색으로만 보임)
4. **낮 하늘 자동 회전 장면**(캐릭터·HUD 없음)이 로그인·저장 불러오기 동안 노출
5. **남색 #0b1020 화면이 툭 끊기며** 최대 3초 (셰이더 준비)
6. 마을

사용자가 시안 중 **B(곰 마크 + 진행 막대 + 한 줄 문구, 끝나면 곰 자리에서 원이 열림)**, 문구는 **1안(숲길을 여는 중 → 주민을 깨우는 중 → 내 마을을 불러오는 중)** 을 골랐다. 목표: 실행부터 마을까지 **같은 연한 숲색 화면 하나 → 원이 열리며 마을** 한 번의 전환.

범위: iOS·안드로이드 앱만. 웹·토스·itch 는 지금 그대로(웹은 로그인 먼저 흐름이 따로 있음).

## 접근
- 기존 `#loading` 요소를 그대로 쓰고, 앱일 때만(`html.boot-b`) B 모양을 입힌다. 웹 마크업·문구·테스트는 유지.
- 앱에서는 월드가 다 지어져도 로딩 화면을 내리지 않고, **마을 공개 직전 남색 가림막 자리에 B 화면을 가림막으로 대신 넘긴다**(`warmBeforeReveal` 의 `veil` 주입점 재사용 → hide 가 원 열기).
- 로그인이 필요한 경우(게임센터·플레이게임즈 실패)는 지금처럼 로그인 화면으로 넘어가되 로딩 화면은 페이드로 내린다.
- 진행 막대는 `transform: scaleX` 로 그린다(셰이더 컴파일로 메인 스레드가 멈춰도 막대가 멈추지 않게 컴포지터 애니메이션). 단계마다 목표치까지 천천히 차오른다.

## 바꿀 곳
1. **`js/boot-screen.js` (새)**: `BOOT_STEPS`(문구 3개·막대 목표치), `createBootScreen(el)` → `step(i)`, `veil()`(show 무동작 / hide = 원 열기 후 숨김, 이미 숨었으면 null), `dismiss()`(페이드). 앱 판정은 `js/platform.js` 의 `IS_NATIVE` 재사용.
2. **`index.html`**
   - `#loading` 안에 B 요소(마크·막대·문구) 추가, 기존 알약은 그대로 첫 자식(웹용).
   - CSS: `html.boot-b #loading` 바탕 `radial-gradient(#f4f7ef → #dfe8d8 → #cfdcc6)`, 마크 92px·42% 위치, 막대·문구, 원 열기 `clip-path` 전환, `prefers-reduced-motion` 대체.
   - `<head>` 초기 스크립트: 앱 플래그(`__IOS__`/`__ANDROID__`, build-cap 이 주입)면 `html.boot-b` — 첫 페인트 전에.
   - `ensureWorld`: 앱이면 로딩을 내리지 않고 단계만 올림. `enterPlay`·`showLoginScreen`·`ui.setLoadWait`(B 마크업을 덮어쓰지 않고 문구만 "내 마을을 불러오는 중") 연결.
3. **`js/game.js` `enterGame`**: `veil: activeBootVeil() || revealVeil()` 한 줄. 남색 가림막은 웹·토스용으로 남김.
4. **`js/i18n-en.js`**: 문구 3개 영어.
5. **곰 마크 이미지**: `scripts/make-boot-mark.mjs` (기존 `scripts/lib/icon-art.mjs` 의 `iconPNG` 재사용, 둥근 모서리) → `assets/boot/mark.png`(276px) + iOS `Splash.imageset` @1x/2x/3x. `scripts/build-cap.mjs` 복사 목록에 `assets/boot` 추가.
6. **iOS 실행 화면** `ios/App/App/Base.lproj/LaunchScreen.storyboard`: 바탕색 #dfe8d8, 곰 92pt 를 B 와 같은 자리(세로 42%)에 → OS 화면에서 B 화면으로 이음새 없이.
7. **안드로이드 실행 화면** `android/app/src/main/res/values/styles.xml`·`colors.xml`: `windowSplashScreenBackground` #dfe8d8 (아이콘은 기존 곰). 안드로이드 12+ 시스템 화면은 아이콘을 가운데 고정이라 B로 넘어갈 때 곰이 조금 위로 이동함(허용).
8. **`capacitor.config.json`**: iOS·안드로이드 `backgroundColor` #1b2a1f → #dfe8d8 (진한 초록 깜빡임 제거).

## 테스트 (먼저)
- `tests/boot-screen.test.mjs`: 단계 문구·목표치 순서, `step` 이 뒤로 가지 않음, `veil().hide()` 가 원 열기 클래스 후 숨김, 숨은 뒤 `veil()` 은 null, `dismiss` 동작.
- 연결: 앱 플래그 → `html.boot-b`, `ensureWorld` 가 앱에서 로딩을 안 내림, `enterGame` veil 주입, build-cap 이 `assets/boot` 복사, capacitor 배경색.
- 기존 고정 테스트 갱신: `reveal-warm.test.mjs`(veil 줄), 필요 시 `boot-order`·`install-survey-*`(순서는 안 바꿈).
- `npm test` 전체.

## 검증
1. 브라우저: `html.boot-b` 강제(개발용 한 줄 주입)로 375×812 모바일 화면 단계별 캡처, 문구 폭·설문 카드 겹침 확인. 웹(데스크톱·모바일)은 기존 화면 그대로인지.
2. iOS 시뮬레이터 새 설치 녹화: 실행 화면 → B → 원 열림 → 마을, 진한 초록·낮 장면·남색이 안 보이는지. 게임센터 실패 경로(로그인 화면)도.
3. 안드로이드 에뮬레이터(cf_ads): 실행 화면 색 이음새.
4. 빌드 5종 성공, code-reviewer.

## 진행
- `main` 에서 새 워크트리·브랜치 `feat/boot-screen-b`, dev docs `dev/active/boot-screen-b/`.
- 측정 마크(`feat/boot-timing`)와 독립. 나중 병합 때 index.html 인접 줄 충돌만 예상.
- 커밋은 검증 후 승인 받고. 푸시·배포 없음. 설문 탭 지연은 다음 안건으로 분리.
