# meta-ads — context
Last Updated: 2026-10-19
- 브랜치 feat/meta-pixel (main 437398c) — 커밋 "feat(ads): Meta Pixel funnel and ad attribution on Paddle checkout" 푸시됨, PR 아직 없음
- 핵심 파일: js/meta-pixel.js(부팅·fbq·attr) · js/meta-pixel-rules.js(순수 규칙) · js/shop/paddle.js(customData.attr · completed→metaPurchase)
  · index.html(bootMetaPixel+onTrack(metaFromTrack) — bootAppBanner 옆, 인증 리디렉트 전 / enterPlay 에서 metaSignup) · tests/meta-pixel.test.mjs
- 결정
  - Meta 로 개인정보(이메일·국가·고객 id) 안 보냄 · autoConfig false(자동 클릭 수집 끔)
  - 앱·토스·itch·dev 세션은 Pixel 끔(현금 결제가 웹 전용이라 보낼 여정이 없음)
  - 서버는 계속 customData.user_id 만 믿는다 — attr 는 분석용
  - 첫 1~2주 목표 = 매출 ROAS 아님. 플레이당 비용·가입당 비용·D1/D7·소재별 품질. 최적화 이벤트는 CompleteRegistration 으로 시작
- 검증(2026-10-19): npm test 3551/3552 통과(실패 1 = aura-cron, @anthropic-ai/sdk 미설치 — 기존 실패)
  · Playwright: ID 없을 때 cf_fbc 만 저장·Pixel 요청 없음 / ID 넣으면 fbq 큐 set autoConfig → init → PageView, fbevents.js 요청
  · 실제 Events Manager 수신은 미확인(샌드박스에서 Meta 접속 불가)
- 알려진 빈틈: E2(게스트로 시작 → 나중에 계정 전환) 유저는 CompleteRegistration 이 빠질 수 있다
- 주의: Supabase 기본 SMTP 는 시간당 몇 통 — 광고 유입이 이메일 코드로 몰리면 가입이 막힌다 → 커스텀 SMTP 확인
