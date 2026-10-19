# meta-ads — tasks (Last Updated: 2026-10-19)
## 광고 켜기 전 (필수)
- [x] 1 Meta Pixel 모듈 + 결제 이벤트 + customData.attr + 테스트 (feat/meta-pixel)
- [ ] 2 👤 Events Manager 에서 데이터 세트(Pixel) 생성 → ID 를 js/config.js META_PIXEL_ID 에 · 광고 계정에 연결
- [ ] 3 👤 Supabase Authentication → SMTP 커스텀(Resend 등) 연결 여부 확인
- [ ] 4 인앱 브라우저 로그인 처리(plan §2) — 감지 순수 함수 + 테스트 · 이메일 메인 · 안드로이드 크롬 intent 버튼 · iOS 안내 · URL 에 utm/fbclid 재부착 · GA4 이벤트
- [ ] 5 PR 생성 → 리뷰 → 웹 배포(웹만)
- [ ] 6 👤 배포 후 Events Manager 테스트 이벤트로 실결제 1건 — Purchase value·currency 확인(Paddle.js checkout.completed data.totals.total 형태 확인)
- [ ] 7 👤 광고 URL utm: ?utm_source=meta&utm_medium=paid&utm_campaign=<캠페인>&utm_content={{ad.name}}
- [ ] 8 👤 개인정보처리방침에 Meta Pixel 사용 문구
## 이후
- [ ] 9 CAPI — 웹훅에서 Purchase 서버 전송(event_id = txn id, attr.fbc/fbp 사용)
- [ ] 10 purchases → BQ export(컬럼 선별) · ads_funnel.sql 에 결제 단계 조인(user_id)
- [ ] 11 Paddle 대시보드 결제수단(Apple Pay·Google Pay·국내 간편결제 지원 여부) 확인
- [ ] 12 1~2주 데이터 보고 스타터 키트 검토(새 kind 'kit' — entitlements.js 소모성 지급·환불 회수 규칙 필요)
