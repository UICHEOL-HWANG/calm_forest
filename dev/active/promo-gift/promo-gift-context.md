# Context — promo-gift
Last Updated: 2026-11-13 (구현 완료·미병합)

## 결정 (사용자)
- 선물 코드 링크(`?gift=` · `/g/CODE` · Play referrer `gift=` · 토스 initialURL · 메뉴 수동 입력)
- 2단계: 게스트 1단계(코인 200·고급 씨앗 3종×3·비료 5·미끼 5, 세이브) / 로그인 2단계(공통 꾸미기: 꼬마 열기구 + 여행 가방 더미, 원장 source 'promo')
- 창 = 초대장 봉투 B안(머리 줄에 코드 label) · 꾸미기 = C안
- A안: DB `promo_codes`·`promo_redemptions` + `/api/promo-gift`
- 인앱 게스트 로그인 버그 수정 같이 출시

## 시안
- `sims/promo-gift/modal.html`·`modal.png` (창 3안) · `decor.html`·`decor.png` (꾸미기 3안, 이식 원본)

## 재사용할 것
- 가입 선물: `js/signup-gift/flow.js`(대기·show) · `functions/api/signup-gift.js`(sendNotice·verifiedUid) · `sql/migrations/migrate_signup_gift.sql`(purchases 패턴)
- 보상 꾸미기: `js/data/reward-decor.js` · `_reward_decor_ids()` · `tests/referral-items.test.mjs`
- 앱 링크: `functions/invite-link.js`·`assets/well-known/`·`js/referral/index.js`(nativeBoot·appUrlOpen)·`js/app-banner.js`(captureTouch·playReferrer)
- 로그인 넘김: `js/auth/email-handoff.js` `requestEmailHandoff`

## 의존성·함정
- 선행 두 작업이 main 작업 트리에 미커밋 → 커밋 전 워크트리 따면 빠짐
- 게스트→로그인 시 uid 바뀜(세이브만 옮김) → 2단계 유예는 `ends_at + 7일`
- 새 꾸미기 id 는 5곳 동시 배포, DB 먼저
- GA4 새 이벤트 ≤5·파라미터 한도(ga4-param-limit)
- 테스트 방문은 `?dbg=1`
- 코드 주석 금지(프로젝트 규칙)

## 구현 상태 (2026-11-13)
- 워크트리 .claude/worktrees/promo-gift · 브랜치 feat/promo-gift · 커밋 11개(로컬, 미푸시·미병합)
- SDD 장부 .superpowers/sdd/2026-11-13-promo-gift/progress.md (판정·미룬 지적 전부)
- 계획 대비 변경: promo 모듈은 index.html 에서 동적 import(첫 화면 JS 650KB 상한 유지), js/promo-gift/code.js 분리, 메뉴 시트 CATS 에 gift-code-btn, 이벤트 분류표 3행
- 배포 런북 추가: purchases CHECK 교체 때 락 → lock_timeout·한산한 시간, 적용 뒤 anon/authenticated execute 권한 false 확인, 옛 signup/referral 마이그레이션 재실행 금지, app-invite-links 와 같은 릴리스로(AASA /g/*), 옛 iOS 빌드는 모르는 꾸미기 id 를 cashOwned 에 남김(기존 문제)
- 남은 미룬 점: 제자리 로그인(토스·PGS·GC) 뒤 2단계 꾸미기는 다음 동기화 때 보관함에 보임
