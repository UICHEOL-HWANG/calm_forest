# 📖 게임 내 초보자 안내서 설계 — 오버레이 패널 · 메뉴 입구 · 첫 방문 알림

작성 2026-09-08 · 브랜치 main · 상태: 사용자 승인 설계(구현 전)

## 0. 배경

- 2026-09-07 에 만든 20쪽짜리 「고요한 숲 초보자 안내서」(PDF 7.6MB, 원본 `docs/beginner-guide/guide-source.html`)를 게임 안에서 볼 수 있게 한다.
- 게임에는 이미 첫 방문 온보딩(프롤로그 → 환영 모달 → 17단계 코치)이 있다. 안내서는 이를 **대체하지 않고 보강**한다.
- 현재 ☰ 메뉴의 ❓도움말은 환영 모달을 다시 여는 것뿐이라 내용이 얇다. 문의하기는 피드백 폼만 있다.

브레인스토밍에서 확정된 결정(2026-09-08):

| 항목 | 결정 |
|---|---|
| 패널 형태 | **A. 전체 화면 시트** (사이드 시트·카드 모달 기각) |
| 상시 입구 | **③ ☰ 메뉴의 ❓도움말 → 📖 초보자 안내서** (문의하기 링크·상시 탭·환영 모달 링크 기각) |
| 첫 방문 유도 | 튜토리얼 졸업/건너뛰기 직후 **알림 배너 1회** |
| 제1 원칙 | 모바일·웹 모두 **게임 HUD 를 침해하지 않는다** |

## 1. 범위

포함:
- A. `/guide/` 정적 안내서 — 반응형 문서(fragment) + 압축 이미지
- B. `#guide-panel` 오버레이 — 전체 화면 시트, 입력 격리, 인셋 존중, fetch 주입
- C. 입구 — ☰ 메뉴 도움말 버튼 교체, 안내서 첫 장의 "튜토리얼 다시 보기"
- D. 첫 방문 알림 — 졸업/건너뛰기 직후 상단 배너 1회, 탭하면 열림, 저장 플래그
- E. 계측 — `guide_open` / `guide_section` / `guide_close`
- F. 토스 번들 대응 — 원격 fetch + `_headers` CORS

제외(다음 단계):
- 안내서 본문 영어 번역(패널 크롬만 i18n)
- 문의하기 모달 안 링크, 상시 HUD 탭
- PDF 재출력 파이프라인(원본이 `/guide/` 로 옮겨간 뒤 별도 작업)

## 2. 함정(조사에서 확인, 설계를 정한 사실)

1. **원본 HTML 은 1280×720 슬라이드 고정**(`.slide{width:1280px;height:720px}`, `@page`). 그대로 넣으면 폰에서 글자가 깨알이 된다 → 반응형 문서로 재구성한다.
2. **iframe 불가.** (a) iOS 웹뷰(토스 포함)에서 iframe 내부 스크롤이 자주 먹통. (b) `_headers` 의 `X-Frame-Options: SAMEORIGIN` 때문에 토스 번들(다른 오리진)에서는 아예 열리지 않는다 → fetch 로 fragment 를 받아 패널 DOM 에 직접 주입한다.
3. **토스 번들은 `js/`+`index.html` 만 복사**(`scripts/build-ait.mjs`). 안내서 이미지(압축 후 ~3MB)를 번들에 넣으면 번들이 커진다 → 토스에서는 `https://calmforest.cloud/guide/` 에서 받아온다. `API_BASE` 치환과 같은 방식.
4. **모바일 HUD 규칙**(메모리 mobile-hud-layout): 안내는 컨텍스트 슬롯(상단 중앙 `#hint-banner`) 또는 프롬프트 줄에만 → 첫 방문 알림은 새 HUD 요소가 아니라 `#hint-banner` 를 쓴다.
5. **키 새기**: 기존 모달들은 `window.addEventListener('keydown', …, true)` capture 로 Space 를 막는다(`index.html:2910`). 패널도 같은 방식.
6. **HUD 숨김 패턴**: 미니게임이 `body.mg-open` 로 조이스틱·도구바·탭을 `display:none !important` 처리한다(`index.html:650`). 패널은 `body.guide-open` 로 같은 목록을 숨긴다.

## 3. A. 정적 안내서 `/guide/`

```
guide/
  guide.html     ← fragment(문서 조각). <!doctype>·<html>·<head> 없음. <section id="…"> × 20
  guide.css      ← 반응형 스타일(패널 안에서만 적용되도록 .gd 접두)
  img/*.jpg      ← 1200px 폭·JPEG q72 로 재압축(현재 1400px·9.4MB → 목표 3MB 이하, 장당 150KB 이하)
```

- 20쪽 → 20개 `<section class="gd-sec" id="sec-01">` … 각 섹션은 `<h2>`(제목) + 본문. 스크린샷 `<img loading="lazy" decoding="async" width height>`(레이아웃 점프 방지).
- 레이아웃: 폰(<720px) 한 열, PC 두 열(글 | 사진). 표(도구 세트)는 `overflow-x:auto` 래퍼.
- `<img src>` 는 **상대경로**(`img/05_chop.jpg`). 패널이 주입할 때 `GUIDE_BASE` 를 앞에 붙여 절대화한다(웹은 `/guide/`, 토스는 `https://calmforest.cloud/guide/`).
- 첫 섹션(표지 대체) 맨 위에 `<button class="gd-tut" data-act="tutorial">🌱 튜토리얼 다시 보기</button>`. 패널이 `data-act` 를 위임 처리한다.
- 문구는 PDF 원문 그대로. 이 문서가 앞으로의 원본(single source)이다.
- 배포: `scripts/build-web.mjs` 복사 목록에 `'guide'` 추가(`beta` 와 같은 줄).

## 4. B. 오버레이 패널 `#guide-panel`

DOM(`index.html`, `#feedback-modal` 옆):

```html
<div id="guide-panel" aria-hidden="true">
  <div class="gp-head">
    <span class="gp-title">📖 초보자 안내서</span>
    <button id="guide-close" aria-label="닫기">✕</button>
  </div>
  <nav class="gp-chips" id="guide-chips"></nav>   <!-- 섹션 제목에서 자동 생성 -->
  <div class="gp-body" id="guide-body"></div>      <!-- fragment 주입 -->
</div>
```

CSS 규칙:
- `position:fixed; inset:0; z-index: 35`(문의 모달 30 위, 미니게임 40 아래). `display:none` → `.show{display:flex; flex-direction:column}`.
- 상단 패딩 `var(--top-inset)`(토스 상단 예약 포함), 하단 `env(safe-area-inset-bottom)`. ✕ 는 항상 `--top-inset` 아래에 있어야 한다.
- `.gp-chips` sticky, 가로 스크롤, 현재 섹션 칩 `.on`(IntersectionObserver).
- `.gp-body{overflow-y:auto; overscroll-behavior:contain; -webkit-overflow-scrolling:touch}` — 게임 캔버스로 스크롤이 새지 않는다.
- `body.guide-open` → `#mobile-controls, #talk-btn, #hotbar, #minimap, #dex-tab, #feedback-tab, #quest-panel, #hint, #hint-banner, #coach, #door-prompt, #npc-prompt, #zone-prompt, #buffs, #topleft, #topright` 를 `display:none !important`. (mg-open 목록 + 상단 패널 2개)

동작:
- `openGuide(src)`: 첫 호출에 `fetch(GUIDE_BASE + 'guide.html')` → 텍스트를 `#guide-body` 에 주입, `img[src]` 절대화, 칩 생성. 두 번째부터는 캐시. `body.guide-open` 추가, `.show`, `trackEvent('guide_open', {src})`. 로딩 중엔 스켈레톤 3줄, 실패 시 "안내서를 불러오지 못했어요 · 다시 시도" 카드(버튼 → 재fetch).
- `closeGuide()`: 클래스 제거, `trackEvent('guide_close', {sec: 현재 섹션 id, dur: ms})`. 스크롤 위치는 세션 동안 기억(다시 열면 그 자리).
- 키보드: `window.addEventListener('keydown', e => { if (!open) return; if (e.key==='Escape') closeGuide(); e.stopPropagation(); }, true)`. 패널이 떠 있는 동안 게임은 어떤 키도 받지 않는다. 브라우저 기본(스크롤 화살표·PageDown)은 허용(`preventDefault` 안 함).
- 터치: 패널이 전체 화면이라 뒤 캔버스에 닿을 수 없고, `guide-open` 으로 조이스틱·행동 버튼이 DOM 에서 사라져 남은 터치 상태도 없다. 열 때 `Input.releaseAll?.()` 가 있으면 호출(있는지 구현 시 확인, 없으면 생략).
- 게임 루프·자동 저장은 계속 돈다(일시정지 없음). 바다·미니게임·인트로 중에는 메뉴 자체가 숨겨져 있으므로 열릴 일이 없다.
- `data-act="tutorial"` 클릭 → `closeGuide()` 후 `ui.showTutorial('help')`.
- `GUIDE_BASE`: `js/config.js` 에 `GUIDE_BASE: \`${API_BASE}/guide/\`` 추가 → 토스 빌드에서 `API_BASE` 치환으로 자동 절대화.

## 5. C. 입구

- `#help-btn`: 아이콘 ❓→📖, 라벨 "도움말"→"초보자 안내서". `js/i18n-en.js` 의 `'도움말': 'Help'` 를 `'초보자 안내서': "Beginner's Guide"` 로 교체(구 키 삭제). 클릭 → `openGuide('menu')`. `$('topleft').classList.remove('open')` 은 기존 위임이 처리.
- `ui.showTutorial('help')` 호출부는 안내서 안 버튼으로 이동(4절). 환영 모달·`tutorial_skip {at:'help'}` 이벤트는 그대로.

## 6. D. 첫 방문 알림

- 시점: `endCoach(done)` 끝에서, `done` 여부와 무관하게 **한 번**. 졸업 토스트와 안 겹치게 `setTimeout(3000)`.
- 조건: `!gameState.guideNudgeSeen`. 표시 직후 `guideNudgeSeen = true` 로 저장(`tutorialSeen` 과 같은 저장/복원 경로, `saved.guideNudgeSeen` 복원).
- 표시: `ui.showHintBanner({ ico:'📖', title:'초보자 안내서가 있어요', line:'눌러서 열기 · ☰ 메뉴 → 📖 에서 언제든', attention:true, onTap })`.
  - `showHintBanner` 에 `onTap` 옵션 추가: 있으면 `#hint-banner` 에 `.tap` 클래스(`pointer-events:auto; cursor:pointer`)를 주고 클릭 1회 → `onTap()` + 즉시 `done()`. 없으면 기존처럼 입력을 받지 않는다(다른 배너 동작 불변).
  - `attention:true` 라 8초 유지. 탭 → `openGuide('nudge')`.
- 기존 유저(이미 졸업/건너뜀, `tutorialSeen` 저장됨)에게는 뜨지 않는다. 메뉴 아이콘이 📖 로 바뀐 것만 보인다.

## 7. E. 계측

| 이벤트 | 파라미터 | 시점 |
|---|---|---|
| `guide_open` | `src: 'menu' \| 'nudge'` | 패널 열림 |
| `guide_section` | `id` | 칩 탭 또는 스크롤로 섹션이 바뀔 때(디바운스 800ms) |
| `guide_close` | `sec`, `dur`(ms) | 닫힘 |

## 8. F. 토스·헤더

- `_headers` 에 추가:
  ```
  /guide/*
    Access-Control-Allow-Origin: *
    Cache-Control: public, max-age=3600
  ```
  (fragment·이미지는 fetch/`<img>` 로만 쓰므로 프레임 헤더는 건드리지 않는다. 1시간 캐시는 안내서 특성상 무방.)
- 토스 번들에는 `guide/` 를 넣지 않는다. `build-ait.mjs` 변경 없음.

## 9. 파일 변경 요약

| 파일 | 변경 |
|---|---|
| `guide/guide.html`, `guide/guide.css`, `guide/img/*` | 신규 |
| `index.html` | `#guide-panel` DOM·CSS, `openGuide/closeGuide`, `guide-open` 숨김 규칙, 키 capture, help-btn 교체, `endCoach` 알림, `showHintBanner(onTap)` |
| `js/game.js` | `gameState.guideNudgeSeen` 저장/복원 |
| `js/config.js` | `GUIDE_BASE` |
| `js/i18n-en.js` | 키 교체 |
| `scripts/build-web.mjs` | `'guide'` 복사 |
| `_headers` | `/guide/*` 규칙 |
| `docs/beginner-guide/` | 원본 HTML·이미지는 그대로 두되 README 에 "원본은 `guide/`" 한 줄 |

## 10. 검증(구현 완료 기준)

실제 브라우저 화면으로 확인해 스크린샷을 남긴다.
1. PC(1280 폭): ☰ → 📖 열림, 칩 탭으로 이동, 스크롤 중 Space/WASD 를 눌러도 캐릭터가 움직이거나 나무가 베이지 않음, Esc 닫힘.
2. 폰 세로(375×812): 조이스틱·행동 버튼·도구바가 사라짐, 본문 한 열, ✕ 가 상단 인셋 아래, 본문 끝까지 스크롤해도 뒤 캔버스가 움직이지 않음.
3. 토스 상단 예약(`--toss-reserve`)을 켠 상태에서 ✕ 위치.
4. 새 계정: 튜토리얼 건너뛰기 → 3초 뒤 배너 → 탭 → 패널. 새로고침 후 배너 재출현 없음.
5. 기존 세이브: 배너 없음, 메뉴 📖 만.
6. `node --test tests/` 통과. 이미지 총량 3MB 이하.
7. 토스: `dist-toss` 빌드 후 fragment 가 `https://calmforest.cloud/guide/` 에서 오는지(네트워크 탭).

## 11. 열린 가정

- 안내서 본문은 한국어만(영어 UI 유저는 크롬만 영어). 사용자 확인 완료.
- 패널이 열려 있는 동안 게임을 멈추지 않는다(밤 방문·날씨 등 이벤트 진행). 열람이 길어도 자동 저장이 도니 손실 없음.
