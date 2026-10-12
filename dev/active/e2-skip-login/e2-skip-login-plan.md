# E2 웹 로그인 화면 건너뛰기 — 구현 계획

사전등록(고정): `analytics/metrics-framework` f339846f `dev/active/metrics-framework/web-entry-experiment-prereg.md`

## 범위
- 웹(`PLATFORM === 'web'`)만. 토스·안드로이드·iOS·itch 는 배정하지 않는다.
- 첫 방문 기기(이번 로드에서 `cf_client_id` 생성) · 저장된 Supabase 세션 없음 · 초대 링크 아님 → 기기 해시('e2:' 솔트) 50:50.
- 무리는 `localStorage.cf_e2` 로 재방문에도 고정.
- 기록: GA4 사용자 속성 `exp_entry` = control | skip_login (이벤트 파라미터 없음).

## 처치(skip_login)
1. 로그인 화면을 띄울 자리에서 `startLocalGuest()`(기존 오프라인 게스트 상태) → `enterPlay('guest_deferred')`.
2. 첫 실제 입력(pointerdown·touchstart·keydown, isTrusted) → `signInAsGuest()` → `loadGame()` 재확인(저장 빗장).
3. 재방문: 같은 기기의 익명 세션을 지우지 않고 이어 간다(`initAuth(cb, { keepGuest })`) — 2026-10-12 사용자 결정.
4. 로그인 길: 기존 login_nudge · ☰ 나가기(→ 나가기 직후엔 로그인 화면).
5. 오프라인(키 미설정·초기화 실패)·나가기 직후·초대 링크 → 기존 로그인 화면.

## 결정
- 초대 링크(하트핀): 첫 방문이 초대 링크면 **배정하지 않는다**(reason 'invite') — 두 무리 모두 로그인 화면 배너 그대로. 등록 기기가 나중에 초대 링크로 오면 무리는 유지하되 로그인 화면을 보여 준다.
- 새 화면 문구 없음 → 문구 검수 대상 없음.
