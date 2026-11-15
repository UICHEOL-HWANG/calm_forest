# Context — guest-login-conversion
Last Updated: 2026-11-12

## 핵심 파일
- js/auth/email-handoff.js — 이메일 가입 요청 플래그(request/peek/take)
- js/supabase-client.js — initAuth holdGuest 옵션, heldAnon, resumeHeldGuest()
- index.html — 넛지 nudgeConnect, showLoginScreen, 부팅 initAuth 호출, #guest-btn
- tests/email-handoff.test.mjs — 순수 함수 + 연결 원문 검사
- ml/reports/signup_gift_funnel_20261112/ — funnel.sql, clicker_timeline.sql, make_chart.py

## 결정
- 버그 원인: 플래그는 showLoginScreen 에서만 읽히는데, 웹 게스트는 익명 세션이 남아 있어(E2 종료 뒤 keepGuest=true) 부팅이 로그인 화면을 건너뜀.
- 수정: 요청이 있으면 익명 세션을 적용도 정리도 하지 않고 붙잡아 둔 채 로그인 화면+이메일 창. 그만두면 같은 게스트로 복귀.
- 리뷰 LOW 미반영: E2 skip_login 이 다시 살아나면 skipLoginNow 가 플래그를 소비하지 않음. 지금은 E2_ENDED=true 라 도달 불가.

## 함정
- login_nudge_click·inapp_nudge_email 이 한 번 누를 때 2번 찍힘 → 횟수 말고 사람 수로 셀 것.
- 버튼 누른 직후 save_failed(attempt 1) — 새로고침이 저장을 끊는 것으로 추정, 미확인.
- 가입 선물은 전원 적용이라 선물 효과 자체는 판정 불가.

## 친구 추천 점검 (2026-11-12, 사용자 추가 요청)
- 실사용 0: 시트 13명 → 공유 2명(1명 내부) → 도착 5명(dev 2·즉시 이탈 3) → bind 0 → 보상 0.
- 서버 보상 로직 정상: referrals_selftest.py --live 27/27, 잔여 0. (기본 모드는 옛 마이그레이션 재실행이 signup CHECK 와 충돌 — --live 추가)
- 링크: 토스=intoss 공유 링크, 나머지 4곳=같은 웹 링크. 네이티브 앱 딥링크·설치 귀속 코드 전달 없음 → 앱 설치 친구 연결 불가.
- 활성 판정은 초대자 접속 시에만, 친구 가입 후 8일 창, session_logs 7일 보관.
