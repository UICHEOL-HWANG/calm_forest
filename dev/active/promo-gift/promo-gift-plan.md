# Plan — promo-gift (홍보 링크 선물)

설계 전문: `docs/superpowers/specs/2026-11-13-promo-gift-design.md` (승인 2026-11-13)

## 단계
0. 선행: guest-login-conversion·app-invite-links 커밋(사용자 승인) → main 에서 워크트리 `feat/promo-gift`
1. SQL: `migrate_promo_gift.sql` + `sql/tests/promo_gift_selftest.py --live` (테스트 먼저)
2. API: `functions/api/promo-gift.js` + worker 라우트 + `/g/CODE` 링크·AASA·intent-filter
3. 클라 규칙: `js/promo-gift/rules.js` + `tests/promo-gift.test.mjs` (테스트 먼저)
4. 클라 흐름·창: flow.js·ui.js·index.js, 가입 선물과 순서, 메뉴 코드 입력, i18n
5. 꾸미기: `js/spaces/promo-gift-art.js`(열기구·가방) + reward-decor 두 품목 + 가드 목록 테스트
6. 트래킹 3개 + 브라우저 E2E(PC·모바일 캡처) + 안드 에뮬레이터 `/g/` + 코드 리뷰
7. 배포: DB 먼저 → 5곳 동시, 첫 코드 등록
