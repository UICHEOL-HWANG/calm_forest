# 💳 Paddle 결제 퍼널·이탈 트래킹 — 계획 (2026-10-02 사용자: "그냥 다 붙여 붙일 수 있는거")
1. 순수 규칙 js/shop/checkout-funnel.js — Paddle.js 이벤트 → 단계(loaded·customer·payment_selected·payment_initiated·payment_failed·completed) · 개인정보 제거
2. 클라이언트 — paddle.js onStep 핸들러 · GA4 paddle_step · cash_checkout_close 에 last_step/max_step/payment_failed/dwell_ms · cash_checkout_done 에 dwell_ms · cosmetic_tryon(입어보기)
3. 서버 — _paddle.js checkoutEventRow(transaction.*) · 웹훅이 checkout_events 에 적재(실패해도 원장·200 유지)
4. SQL sql/migrations/migrate_checkout_events.sql (사용자가 SQL Editor 실행) · Paddle 알림 구독에 transaction.created/updated/payment_failed/canceled 추가(사용자/대시보드)
5. 검증 npm test · 코드리뷰 · 배포(웹만 — 결제는 웹 전용)
