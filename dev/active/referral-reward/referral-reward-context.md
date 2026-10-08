# 🤝 친구 추천 보상 — 컨텍스트

Last Updated: 2026-10-08 (1단계 DB 운영 적용 · 2단계 API · 3단계 카탈로그 완료)

## 작업 위치
- 워크트리 `.claude/worktrees/referral-reward` · 브랜치 `feat/referral-reward` (main cd5f804 기준)
- 워크트리엔 `.env` 없음 — 비밀값 필요 시 루트 참조(복사 금지, 키체인 우선)

## 핵심 파일 (조사 결과)
- 꾸미기: `js/cosmetics/catalog.js:19` SLOTS · RAW(21-68) · `won` → premium · `equip.js:60 sanitize` 가 카탈로그 밖 id 삭제
- 날개 선례: `bat_wing` (`art-bats.js:122`, 빌더 맵 `art.js:568`), back 앵커 `anchors.js`
- 도구 스킨: `tool-skin-rules.js:12 TOOL_THEMES`, `SKIN_TOOLS` 에 water 있음, `tool-skins.js themeBuilders` (빌더 없는 도구는 기본 모양 폴백 `game.js:3792`)
- 야외 장식: `js/data/catalog.js:194 OUTDOOR` (hidden:true = 비매품), 지급 선례 `js/plaza/index.js:166 addStored`, 아치 선례 `webarch` (`halloween-art.js:96`)
- 원장: `public.purchases` (`sql/migrations/migrate_purchases.sql:12`), kind CHECK cosmetic|pet, source 컬럼 없음
- 보안 트리거: `migrate_security_hardening.sql:185 _premium_cosmetic_ids()` 17종, `tests/security-hardening.test.mjs:12` 가 카탈로그 premium 과 일치 검사
- 소유 반영: `supabase-client.js:669 fetchPurchases` → `shop/purchases.js syncPurchases` → `shop/entitlements.js applyPurchases`(kindOf: cosmetic|pet)
- 판매 노출: `js/shop/premium-row.js:12` — 비매품 플래그 필요
- 인증: `supabase-client.js:50 isAnon`, `:74 createdAt`, 서버 JWT 검증 선례 `functions/api/photo.js:92 verifyUser`
- URL: `?ref=`/`?from=` 은 `analytics.js:27` GA 캠페인용 → `?invite=` 사용. 구글 OAuth redirect 가 쿼리 제거(`supabase-client.js:194`)
- 활동 원천: `session_logs`(counts jsonb, started_at) — 클라이언트 작성
- 개인 알림: `notices.target_user_id`
- 라우팅: `worker/index.js` import + routeApi 분기 (⚠️ 신설 시 등록 필수)
- 테스트: `npm test` (node --test), `tests/helpers/game-source.mjs`

## 의사결정
- 보상 = 추천 전용 꾸미기(판매 X, 외형만). 단계 1/3/5 = 무지개 크리스탈 세트/꽃 덩굴 아치/스테인드글라스 나비 날개. 피초대자 웰컴 핀.
- 별 테마는 도구 세트 전체(물뿌리개만 하면 다른 도구가 기본으로 돌아가는 손해) · session_logs 조작 가능성 수용 — 둘 다 사용자 결정 2026-10-08.
- 활성화 = 비익명 + 7일 내 NSM 2일. 상한 5. 신규 계정 72h 내 바인딩만.
- 원장 재사용(purchases + source 컬럼) — 보안 트리거가 출처 무관하게 원장 존재만 보므로 자동 보호.
- 링크 파라미터 `invite`.

## 의존성 / 주의
- 4곳 동시 배포 후 플래그 ON (옛 클라가 새 id 삭제)
- SQL 은 내가 풀러로 직접 실행
- 새 won/비매 품목은 SQL 목록에도 추가

## 진행 기록
- DB: `migrate_referrals.sql` 운영 적용(셀프테스트 28/28, `sql/tests/referrals_selftest.py --apply`). 활성화 기준 = METRICS_FRAMEWORK 획득 행동 16종.
- API: 단일 엔드포인트 `POST /api/referral {action: code|bind|claim}` — `functions/api/referral.js`. 규칙은 SQL 이 단일 출처.
- 리뷰 반영: 코드 발급 함수·상한 advisory lock·순환 차단·DML revoke·claim 쿨다운·틀린 코드 10회 차단·fetch 타임아웃.
- 수용한 한계: 소식 insert 실패 시 재전송 없음(원장이 진실) · 가짜 계정 파밍(외형뿐·상한) — 모니터링 대상.
- ⚠️ purchases 매출 집계는 `source='paddle'` 필터 필수.
- 3단계: 보상 아이템은 `reward:'referral'` — **premium 이 아니다**(premium = 현금 판매: Paddle·가격 페이지·PRICE_IDS). 서버 가드 목록 = premium ∪ reward.
  보상 장식 정의는 순수 모듈 `js/data/reward-decor.js`(data/catalog.js 가 THREE 를 끌어와 entitlements 에서 import 불가). tools_star·friendarch 는 조형 전이라 기본 모양/빈 그룹 — **조형 전엔 API 배포 금지**.
- 🎨 시안 선택(2026-10-08): 도구 B 무지개 크리스탈(이름 '💎 무지개 크리스탈 세트'로 변경, id tools_star 유지) · 날개 A 스테인드글라스 나비 · 하트핀 B 수정 하트+별 방울(크게) · 아치 B 꽃 덩굴 아치. 시안: sims/referral-reward-sim.html · 캡처 dev/active/referral-reward/shots/
