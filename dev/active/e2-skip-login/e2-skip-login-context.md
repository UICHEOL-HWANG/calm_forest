# E2 — 컨텍스트
Last Updated: 2026-10-12

## 핵심 파일
- `js/exp-e2.js` — 순수 규칙(배정·대상·행동) · 테스트 `tests/exp-e2.test.mjs`
- `js/exp-e2-boot.js` — localStorage·URL 바인딩, `e2Decision()` 메모(첫 호출 = analytics 평가)
- `js/auth/deferred-guest.js` — 첫 입력 감지·계정 업그레이드 · 테스트 `tests/deferred-guest.test.mjs`
- `js/analytics.js` — user_properties 에 `exp_entry`
- `js/i18n.js` — `clientIdIsNew()`
- `js/supabase-client.js` — `initAuth(cb, { keepGuest })`, `startLocalGuest()`
- `index.html` — 부팅 IIFE 분기, `startDeferredGuest`, `enterPlay(via)`
- 연결 잠금: `tests/e2-wiring.test.mjs`

## GA4
- 사용자 속성 `exp_entry`
- `login{method:'guest_deferred'}` — 처치 첫 입장(계정 전)
- `deferred_guest{result}` — 첫 입력 뒤 익명 계정 생성(ok/offline)

## E1 과의 관계
- E1(feat/e1-harvest-start, 미병합)은 'e1:<platform>:' 솔트. E2 는 'e2:' — 독립(테스트로 일치율 ~50% 확인).

## 검증 (2026-10-12 로컬)
- 신규 웹 → skip_login: 로그인 화면 없음, 입력 전 sb 세션 0, 입력 뒤 익명 계정, GA user_properties exp_entry
- 재방문 → 같은 uid, 세이브 로드
- dev 강제 control → 로그인 화면 · 기존 기기 → reason returning · 토스 → platform · 초대 → invite · 나가기 → 로그인 화면

## 다음
- 배포 다음날 BigQuery: 신규 웹 기기의 `exp_entry` 존재·약 50:50 확인

## 리뷰 반영(2026-10-12)
- 계정 만들기 실패(오프라인·예외) → 다음 입력에서 다시, 3회까지(`armDeferredGuest`)
- 입력 감지는 `enterPlay` 전에 건다(입장이 던져도 계정은 만들어진다)
- 처치 재방문이라도 초대 링크면 게스트 세션을 이어 가지 않는다(기존 하트핀 흐름)

## 분석 때 알아 둘 것
- 처치의 '첫 입력 전' 구간은 오프라인 게스트라 Supabase 로그(game_logs·econ 등)가 남지 않는다 → **판정은 GA4 기준**(사전등록 그대로). Supabase 퍼널은 처치에 약간 불리하게 기운다.
- login method: 처치 첫 입장 = `guest_deferred`, 처치 재방문 = `anonymous`. 무리 구분은 `exp_entry` 로 한다.
- localhost 접속도 배정된다(dev 파라미터 없으면) — 사전등록대로 분석에서 제외.
