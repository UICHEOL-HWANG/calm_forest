# 🤝 친구 추천 보상 — 컨텍스트

Last Updated: 2026-10-08

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
- 보상 = 추천 전용 꾸미기(판매 X, 외형만). 단계 1/3/5 = 별빛 도구 세트/아치/날개. 피초대자 웰컴 핀.
- 별 테마는 도구 세트 전체(물뿌리개만 하면 다른 도구가 기본으로 돌아가는 손해) · session_logs 조작 가능성 수용 — 둘 다 사용자 결정 2026-10-08.
- 활성화 = 비익명 + 7일 내 NSM 2일. 상한 5. 신규 계정 72h 내 바인딩만.
- 원장 재사용(purchases + source 컬럼) — 보안 트리거가 출처 무관하게 원장 존재만 보므로 자동 보호.
- 링크 파라미터 `invite`.

## 의존성 / 주의
- 4곳 동시 배포 후 플래그 ON (옛 클라가 새 id 삭제)
- SQL 은 내가 풀러로 직접 실행
- 새 won/비매 품목은 SQL 목록에도 추가
