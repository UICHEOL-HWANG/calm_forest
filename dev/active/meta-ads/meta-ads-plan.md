# 📣 Meta 광고 → 가입 → 결제 여정 트래킹 — 계획 (2026-10-19 사용자: "내일 메타 광고 들어갈건데 결제 여정까지 파고들 수 있을까")
1. ✅ Meta Pixel(웹 전용) — js/meta-pixel.js · js/meta-pixel-rules.js · config.js META_PIXEL_ID(비면 no-op, fbclid 보관만)
   - PageView · CompleteRegistration(가입 30분 안 첫 진입, 게스트 제외, 계정당 1회) · ViewContent(premium_row_view·cosmetic_tryon)
     · InitiateCheckout(cash_checkout_open) · AddPaymentInfo(paddle_step=payment_selected) · Purchase(Paddle checkout.completed, value·currency, eventID=txn id)
   - Paddle customData.attr = { fbc, fbp, jid, cid, utm_* } → 웹훅 purchases.raw 에 남는다(광고 클릭 ↔ 결제 조인)
2. ⏳ 인앱 브라우저(인스타·페북) 로그인 — 구글 OAuth 가 disallowed_useragent 로 막힌다. 웹 로그인 = 구글 · 이메일 6자리 코드 · 게스트(결제 불가)
   - 인앱 감지(UA: FBAN|FBAV|FB_IAB|Instagram) → 이메일 로그인을 메인으로
   - 안드로이드: "크롬에서 열기" 버튼 = intent://<host><path>?<query>#Intent;scheme=https;package=com.android.chrome;end
   - iOS: x-safari-https:// 시도(실기기 확인 필요) + "··· → 외부 브라우저로 열기" 안내
   - 넘길 때 utm_* · fbclid 를 URL 에 다시 실을 것(인앱↔크롬 저장소가 따로라 cf_fbc·cf_first_touch 가 안 넘어감)
   - 자동 리디렉트 금지(광고 심사 리디렉션 리스크) — 버튼만
   - GA4 에 어느 길로 가입했는지 남기기(예: login_screen 에 inapp:true, inapp_handoff{target})
3. 이후(광고 돌려 보고) — CAPI(웹훅 transaction.completed → Purchase, event_id=txn id) · purchases BQ export(raw 통째 금지, 필요한 컬럼+attr만) · Paddle 간편결제(Apple/Google Pay 등) 켜기 · 스타터 키트
