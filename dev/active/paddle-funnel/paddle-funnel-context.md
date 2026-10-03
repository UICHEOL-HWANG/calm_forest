# paddle-funnel — context
Last Updated: 2026-10-02
- 워크트리 .claude/worktrees/paddle-funnel · 브랜치 feat/paddle-funnel (main 587d23a)
- 핵심: js/shop/paddle.js(onPaddleEvent) · js/spaces/cafe.js(setCheckoutHandlers·tryOnCos) · functions/api/_paddle.js · functions/api/paddle-webhook.js
- 결정: GA4 에 이메일·국가·고객 id 금지(단계·상품·결제수단 종류·오류 코드만) · checkout_events 적재 실패는 로그만(원장 지급을 막지 않음)
- 전제: Paddle 도메인 승인 Pending — 승인 전엔 실데이터 없음
