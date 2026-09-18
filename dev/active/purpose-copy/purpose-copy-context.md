# Context
**Last Updated:** 2026-09-15
**Branch:** fix/feedback-r5

## 핵심 파일
| 파일:줄 | 내용 |
|---|---|
| js/game.js:1232 | `STORY` 4장 정의(목표·시작문·완료문·보상) |
| js/game.js:1284 | `chapters` 뷰 — index.html이 렌더 |
| js/game.js:8301 | `INTRO_CAPTIONS` 자막 3줄 |
| js/game.js:8307 | `introStart()` |
| js/game.js:8338 | `introEnd()` — C의 훅 지점 |
| js/game.js:8368 | `updateIntro()` — 컷 타이밍(컷4 타이틀 15.6~18.2, 종료 18.9) |
| js/game.js:1389 | `firstHint()` 시설 안내 모달 |
| js/game.js:1404 | `firstHintBanner()` 근접 1줄 배너(이미 짧음 — 손대지 않음) |
| index.html:2854 | `TUT_STEPS` 17단계 |
| index.html:2918 | `renderCoach()` |
| index.html:2938 | `endCoach()` — 졸업 토스트 |
| index.html:1371 | `#story-chip` 마크업 |
| index.html:1376 | `#story-modal` |
| index.html:577/761 | `#coach` CSS (데스크톱/모바일) |
| index.html:735 | `body.coaching #story-chip { display: none }` ← 문제 지점 |
| js/i18n-en.js | 한국어 원문 = 키. 문구 바꾸면 여기도 |

## 측정한 수치
- 모바일 코치 폭: `calc(100vw - 12px - 150px)` = **375px에서 213px**, font 12.5px
- 현재 TUT_STEPS 길이: 18~71자 (최장 ⑩ 71자)
- 한글 22자 이상 UI 문자열: 271개

## 의사결정
- B는 **새 슬롯을 만들지 않는다** — 코치 카드 내부 줄로 해결(mobile-hud-layout 규칙)
- C는 튜토리얼 졸업 후가 아니라 **인트로 직후** — 17단계는 30분 넘게 걸려 너무 늦다
- `firstHintBanner` 1줄짜리들(15~25자)은 이미 짧아 압축 대상 아님

## 미결
- ~~인트로에 자막 1개 추가 시 +2.8초(18.9 → 21.7). intro_skip률이 높으면 A 효과 제한적 → GA4 확인 필요~~
  **확인함 (2026-09-15, 자막 배포 전 30일):** 건너뛴 116건 중 **115건(99.1%)이 15.9초 전에 끊었다.**
  새 자막(15.9~18.3초)을 본 사람은 1명. 중앙값 **1.5초**, 78%가 3초 안에 이탈.
  스킵률: 인트로 재생(세션) 145회 중 100회 = **69.0%**. → **A(인트로 자막)는 사실상 효과 없음.**
  ⚠️ 기기 단위로 세면 안 된다 — 30일 창에서 한 기기가 스킵·완주 세션을 둘 다 가져 분모에 두 번 들어간다
  (그렇게 센 59.7% 는 과소 추정이었다). 인트로 재생 1회 = `ga_session_id` 1개로 센다.
  B(코치 목표 줄)·C(이야기 지도)는 인트로를 안 타므로 무관하게 유효.
  쿼리 `ml/sql/g6_intro_skip_funnel.sql`·`g6_intro_skip_at.sql` · 차트 `ml/reports/figs/g6_intro_skip_cdf.png`

- [ ] **내일(9/16) 전후 비교** — `ml/sql/g6_intro_caption_before_after.sql`
      자막 배포는 2026-09-15 13:20 KST(커밋 0fd4fd0). 9/15 는 한 날에 전후가 섞이므로
      `event_timestamp` 로 가르고, 9/15 전체를 뺀 엄격 집계(`mixed_day`)도 함께 낸다.
      ⚠️ **skip_pct 단순 비교는 무효다.** 같은 커밋이 인트로를 18.9초 → 21.7초로 늘렸고
      자막3 until 도 16.0 → 15.2 로 줄였다. 더 참아야 하니 스킵률은 기계적으로 오르고,
      `intro_complete` 도 arm 마다 다른 사건(18.9초 완주 vs 21.7초 완주)이 된다.
      → 볼 것은 **`surv_15_to_18`**(15.2초까지 버틴 재생 중 18.9초까지 간 비율).
      두 버전 공통 구간이라 인트로 길이 차이에 안 휘둘린다. after 에서만 이 구간에 새 자막이 있다.

- ⚠️ **분석 시 localhost 를 빼야 한다.** 최근 30일 GA4 이벤트의 **14.8%(7,402건·38기기)** 가
  `http://localhost` — 내 개발·촬영 세션이다. 안 빼면 스킵률이 65.1%로(실제 71.6%) 어긋난다.
  `?weather=` 같은 dev 파라미터가 붙을 때만 막히고(js/first-loop.js:18), 맨 localhost 는 그대로 집계된다.
  (차단은 별건으로 미착수)
