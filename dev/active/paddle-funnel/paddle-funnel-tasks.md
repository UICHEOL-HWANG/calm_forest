# paddle-funnel — tasks (Last Updated: 2026-10-06)
- [x] 1 순수 규칙 + 테스트
- [x] 2 클라이언트 배선
- [x] 3 서버 웹훅 + 테스트 · 리뷰 반영
- [x] 4a migrate_checkout_events.sql 실행 ✅(2026-10-06 사용자 실행·DB 컬럼 14개·RLS 확인)
- [x] 4b 라이브 웹훅 대상 'game'(https://calmforest.cloud/api/paddle-webhook, 7 events) 생성 + PADDLE_WEBHOOK_SECRET 교체(키체인 calmforest-paddle-webhook-secret) ✅ 2026-10-06 Simulate transaction.completed → 응답 200·checkout_events 1행 적재 확인(purchases 0=정상). ⚠️ 시뮬 후 Usage type 을 Platform(Real events)으로 되돌릴 것
- [ ] 6 Paddle 도메인 승인 후 첫 실결제로 purchases·checkout_events 적재 검증 · 시뮬레이션 행(txn_01hv8wptq8987qeep44cyrewp9) 분석 시 제외
- [x] 5 검증·리뷰 · 웹 배포
